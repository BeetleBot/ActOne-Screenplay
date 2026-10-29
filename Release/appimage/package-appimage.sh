#!/usr/bin/env bash
# Package the binary produced by `tauri build --no-bundle`.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

VERSION="${VERSION:-$(node -p "require('./package.json').version")}"
chmod +x src-tauri/target/release/actone

# Tauri's AppRun relocates WebKit's hardcoded paths. A generic linuxdeploy
# launcher plus the shared libraries alone cannot launch WebKit's processes.
NO_STRIP=true npm run tauri -- bundle --bundles appimage --config src-tauri/tauri.appimage.conf.json --verbose

shopt -s nullglob
bundles=(src-tauri/target/release/bundle/appimage/*.AppImage)
if [ "${#bundles[@]}" -ne 1 ]; then
    echo "Expected exactly one AppImage from Tauri, found ${#bundles[@]}" >&2
    exit 1
fi

mkdir -p Release/artifacts
OUTPUT="Release/artifacts/ActOne-Screenplay-x86_64-$VERSION.AppImage"
bash "$SCRIPT_DIR/repack-appimage.sh" "${bundles[0]}" "$OUTPUT"
# Validate the exact repacked artifact that the release workflows upload.
bash "$SCRIPT_DIR/verify-appimage.sh" "$OUTPUT"
