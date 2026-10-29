#!/usr/bin/env bash
# Import an existing release bundle and sign its commit and repository summary.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BUNDLE="$(realpath "${1:?Usage: sign-flatpak-repository.sh BUNDLE SITE_DIRECTORY}")"
SITE="$(realpath -m "${2:?Usage: sign-flatpak-repository.sh BUNDLE SITE_DIRECTORY}")"
: "${GNUPGHOME:?Set a dedicated temporary signing key directory}"
: "${FLATPAK_GPG_PRIVATE_KEY:?Missing signing key}"
: "${FLATPAK_GPG_PASSPHRASE:?Missing signing passphrase}"
: "${FLATPAK_REPOSITORY_URL:?Missing public repository URL}"
mkdir -p "$SITE/repo" "$GNUPGHOME"
chmod 700 "$GNUPGHOME"
printf '%s\n' "$FLATPAK_GPG_PRIVATE_KEY" | gpg --batch --quiet --import
KEY_COUNT="$(gpg --batch --with-colons --list-secret-keys | awk -F: '$1 == "sec" {n++} END {print n+0}')"
if [ "$KEY_COUNT" -ne 1 ]; then
    echo 'The signing secret must contain exactly one primary key' >&2
    exit 1
fi
FINGERPRINT="$(gpg --batch --with-colons --list-secret-keys | awk -F: '$1 == "fpr" {print $10; exit}')"
KEYGRIP="$(gpg --batch --with-colons --with-keygrip --list-secret-keys | awk -F: '$1 == "grp" {print $10; exit}')"
printf 'allow-preset-passphrase\ndefault-cache-ttl 3600\nmax-cache-ttl 3600\n' > "$GNUPGHOME/gpg-agent.conf"
gpg-connect-agent reloadagent /bye > /dev/null
PRESET="$(gpgconf --list-dirs libexecdir)/gpg-preset-passphrase"
printf '%s\n' "$FLATPAK_GPG_PASSPHRASE" | "$PRESET" --preset "$KEYGRIP"

# Preserve the existing bundle branch so its signed ref binding stays valid.
if [ ! -f "$SITE/repo/config" ]; then
    ostree --repo="$SITE/repo" init --mode=archive-z2
fi
# Object storage preserves files, but not OSTree's empty working directories.
# Recreate these after restoring an existing repository from R2.
mkdir -p "$SITE/repo/refs/heads" "$SITE/repo/refs/remotes" \
    "$SITE/repo/refs/mirrors" "$SITE/repo/tmp" "$SITE/repo/state" \
    "$SITE/repo/extensions" "$SITE/repo/objects"
flatpak build-import-bundle --no-update-summary --gpg-sign="$FINGERPRINT" \
    --gpg-homedir="$GNUPGHOME" "$SITE/repo" "$BUNDLE"
REF="$(ostree --repo="$SITE/repo" refs | sed -n '\|^app/ink\.iyal\.actone/x86_64/|p')"
if [ "$REF" != app/ink.iyal.actone/x86_64/master ]; then
    echo "Expected only app/ink.iyal.actone/x86_64/master; found: $REF" >&2
    exit 1
fi
gpg --batch --yes --output "$SITE/actone.gpg" --export "$FINGERPRINT"
flatpak build-update-repo --title='ActOne Screenplay' --default-branch=master \
    --homepage=https://iyal.ink/actone/ --gpg-sign="$FINGERPRINT" \
    --gpg-homedir="$GNUPGHOME" --gpg-import="$SITE/actone.gpg" "$SITE/repo"
flatpak repo --metadata="$REF" "$SITE/repo" > "$GNUPGHOME/app-metadata"
python3 - "$GNUPGHOME/app-metadata" <<'PY'
import configparser
import sys
metadata = configparser.ConfigParser(interpolation=None)
metadata.read(sys.argv[1])
if metadata.get('Application', 'name') != 'ink.iyal.actone':
    sys.exit('Bundle metadata does not identify ActOne')
PY
cp "$PROJECT_ROOT/src-tauri/icons/128x128@2x.png" "$SITE/actone.png"
mkdir -p "$SITE/screenshots"
cp -a "$PROJECT_ROOT/flatpak/screenshots/." "$SITE/screenshots/"
python3 "$SCRIPT_DIR/write-flatpak-reference.py" "$SITE" "$FLATPAK_REPOSITORY_URL"

# Read the repo as a client with signature verification enabled. No installation.
CLIENT="$(mktemp -d)"
trap 'rm -rf "$CLIENT"' EXIT
ostree --repo="$CLIENT/repo" init --mode=bare-user-only
ostree --repo="$CLIENT/repo" remote add --gpg-import="$SITE/actone.gpg" \
    --set=gpg-verify-summary=true actone "file://$SITE/repo"
ostree --repo="$CLIENT/repo" pull actone "$REF"
echo 'App commit and repository summary signatures verified.'
