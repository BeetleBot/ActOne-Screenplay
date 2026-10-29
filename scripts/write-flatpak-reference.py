"""Create install references embedding only the repository's public key."""
import base64
from pathlib import Path
import sys
from urllib.parse import urlparse


def write_references(site: Path, repo_url: str) -> None:
    url = urlparse(repo_url)
    if url.scheme != 'https' or not url.netloc or url.query or url.fragment:
        raise ValueError('The public repository URL must use HTTPS without query or fragment')
    repo_url = repo_url.rstrip('/')
    root_url = repo_url.rsplit('/', 1)[0]
    public_key = base64.b64encode((site / 'actone.gpg').read_bytes()).decode('ascii')
    common = (f'Title=ActOne Screenplay\nUrl={repo_url}\n'
              'Homepage=https://iyal.ink/actone/\n'
              f'Icon={root_url}/actone.png\nGPGKey={public_key}\n')
    (site / 'actone.flatpakrepo').write_text(
        '[Flatpak Repo]\n' + common + 'DefaultBranch=master\n', encoding='utf8')
    (site / 'actone.flatpakref').write_text(
        '[Flatpak Ref]\n' + common + 'Name=ink.iyal.actone\nBranch=master\n'
        'IsRuntime=false\nSuggestRemoteName=actone\n'
        'RuntimeRepo=https://dl.flathub.org/repo/flathub.flatpakrepo\n', encoding='utf8')


if __name__ == '__main__':
    write_references(Path(sys.argv[1]), sys.argv[2])
