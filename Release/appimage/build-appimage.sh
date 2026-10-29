#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

if [ -z "${VERSION:-}" ]; then
    VERSION=$(grep -oP '"version":\s*"\K[^"]+' "$PROJECT_ROOT/package.json" | head -1)
fi

echo "==> Building ActOne Screenplay AppImage v$VERSION"

echo -n "Enter version number (current is $VERSION, press Enter to keep): "
read -r NEW_VERSION
if [ -n "$NEW_VERSION" ]; then
    VERSION="$NEW_VERSION"
    echo "==> Updating version to $VERSION"
    sed -i "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" "$PROJECT_ROOT/package.json"
    cd "$PROJECT_ROOT"
    node sync-version.js
    cd "$OLDPWD"
    echo "==> Version updated"
fi

echo "==> Building Tauri release binary"
cd "$PROJECT_ROOT"
npm run tauri build -- --no-bundle

echo "==> Packaging and verifying AppImage with Tauri"
bash "$SCRIPT_DIR/package-appimage.sh"
