"""Offline integration checks: create, sign and verify a miniature Flatpak repo."""
import base64
import configparser
import importlib.util
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

SCRIPTS = Path(__file__).resolve().parent
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('references', SCRIPTS / 'write-flatpak-reference.py')
references = importlib.util.module_from_spec(spec)
spec.loader.exec_module(references)


class ReferencesTest(unittest.TestCase):
    def test_references_embed_only_public_key_and_runtime_source(self):
        with tempfile.TemporaryDirectory() as directory:
            site = Path(directory)
            (site / 'actone.gpg').write_bytes(b'test-public-key')
            references.write_references(site, 'https://flatpak.example/repo/')
            ref = configparser.ConfigParser()
            ref.read(site / 'actone.flatpakref')
            entry = ref['Flatpak Ref']
            self.assertEqual(base64.b64decode(entry['GPGKey']), b'test-public-key')
            self.assertEqual(entry['Url'], 'https://flatpak.example/repo')
            self.assertEqual(entry['Name'], 'ink.iyal.actone')
            self.assertEqual(entry['Branch'], 'master')
            self.assertEqual(entry['RuntimeRepo'], 'https://dl.flathub.org/repo/flathub.flatpakrepo')

    def test_rejects_non_https_repository(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaises(ValueError):
                references.write_references(Path(directory), 'http://flatpak.example/repo')


@unittest.skipUnless(all(shutil.which(tool) for tool in ('gpg', 'flatpak', 'ostree')), 'Flatpak signing tools required')
class SigningTest(unittest.TestCase):
    def test_signs_repo_and_client_verifies_signatures(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            key_home = root / 'key-source'
            key_home.mkdir(mode=0o700)
            env = dict(os.environ, GNUPGHOME=str(key_home))

            def run(*args, **kwargs):
                return subprocess.run(args, env=env, check=True, capture_output=True, **kwargs)

            try:
                run('gpg', '--batch', '--pinentry-mode', 'loopback', '--passphrase', 'test-only',
                    '--quick-generate-key', 'ActOne Test', 'rsa2048', 'sign', '0')
                secret = run('gpg', '--batch', '--pinentry-mode', 'loopback', '--passphrase', 'test-only',
                             '--armor', '--export-secret-keys', 'ActOne Test').stdout.decode()
                build = root / 'build'
                (build / 'files/bin').mkdir(parents=True)
                (build / 'metadata').write_text('[Application]\nname=ink.iyal.actone\nruntime=org.gnome.Platform/x86_64/48\ncommand=actone\n')
                (build / 'files/bin/actone').write_text('#!/bin/sh\nexit 0\n')
                (build / 'files/bin/actone').chmod(0o755)
                run('flatpak', 'build-finish', str(build))
                run('flatpak', 'build-export', str(root / 'source-repo'), str(build), 'master')
                run('flatpak', 'build-bundle', str(root / 'source-repo'), str(root / 'app.flatpak'), 'ink.iyal.actone', 'master')
                env.update(GNUPGHOME=str(root / 'signing'), FLATPAK_GPG_PRIVATE_KEY=secret,
                           FLATPAK_GPG_PASSPHRASE='test-only', FLATPAK_REPOSITORY_URL='https://flatpak.example/repo')
                result = run('bash', str(SCRIPTS / 'sign-flatpak-repository.sh'), str(root / 'app.flatpak'), str(root / 'site'))
                self.assertIn(b'App commit and repository summary signatures verified.', result.stdout)
                self.assertTrue((root / 'site/actone.flatpakref').is_file())
                # A wrong key must not verify the signed summary.
                run('ostree', f'--repo={root}/untrusted', 'init', '--mode=bare-user-only')
                run('ostree', f'--repo={root}/untrusted', 'remote', 'add', '--set=gpg-verify-summary=true',
                    'actone', f'file://{root}/site/repo')
                rejected = subprocess.run(['ostree', f'--repo={root}/untrusted', 'pull', 'actone',
                                           'app/ink.iyal.actone/x86_64/master'], env=env, capture_output=True)
                self.assertNotEqual(rejected.returncode, 0)
            except subprocess.CalledProcessError as error:
                # Only tool diagnostics are reported; the private key is passed via env.
                self.fail(error.stderr.decode(errors='replace'))
            finally:
                for home in (key_home, root / 'signing'):
                    subprocess.run(['gpgconf', '--homedir', str(home), '--kill', 'all'], capture_output=True)


if __name__ == '__main__':
    unittest.main()
