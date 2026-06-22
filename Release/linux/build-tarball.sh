#!/bin/bash
set -euo pipefail

# --- Find project root ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ARTIFACTS_DIR="$PROJECT_ROOT/Release/artifacts"

# --- Detect version ---
if [ -z "${VERSION:-}" ]; then
    VERSION=$(grep -oP '"version":\s*"\K[^"]+' "$PROJECT_ROOT/package.json" | head -1)
fi
echo "==> Building ActOne v$VERSION (Linux Tarball)"

# --- Install system dependencies ---
echo "==> Installing Linux system dependencies"
sudo apt-get update -qq
sudo apt-get install -y -qq \
    libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev \
    librsvg2-dev libsoup-3.0-dev libjavascriptcoregtk-4.1-dev \
    pkg-config

# --- Check for Rust ---
if ! command -v rustc &>/dev/null; then
    echo "==> Installing Rust"
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
fi

# --- Install Node.js if missing ---
if ! command -v node &>/dev/null; then
    echo "==> Installing Node.js"
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    sudo apt-get install -y -qq nodejs
fi

# --- Build frontend + Rust backend ---
echo "==> Building Tauri app"
cd "$PROJECT_ROOT"
npm ci
npm run tauri build

# --- Package tarball ---
echo "==> Packaging tarball"
TARBALL_DIR="$PROJECT_ROOT/target/tarball"
mkdir -p "$TARBALL_DIR/usr/share/actone/icon_app"
mkdir -p "$TARBALL_DIR/usr/share/applications"
mkdir -p "$TARBALL_DIR/usr/share/mime/packages"

cp "$PROJECT_ROOT/src-tauri/target/release/actone" "$TARBALL_DIR/usr/share/actone/"
cp "$PROJECT_ROOT/assets/linux/actone.desktop" "$TARBALL_DIR/usr/share/applications/"
cp "$PROJECT_ROOT/assets/linux/actone.xml" "$TARBALL_DIR/usr/share/mime/packages/"

for size in 16 32 64 128 256 512; do
    icon="$PROJECT_ROOT/src-tauri/icons/${size}x${size}.png"
    if [ -f "$icon" ]; then
        cp "$icon" "$TARBALL_DIR/usr/share/actone/icon_app/actone_icon_${size}x${size}.png"
    fi
done

cp "$PROJECT_ROOT/assets/linux/install.sh" "$TARBALL_DIR/"
cp "$PROJECT_ROOT/assets/linux/uninstall.sh" "$TARBALL_DIR/"
chmod +x "$TARBALL_DIR/install.sh" "$TARBALL_DIR/uninstall.sh"

TARBALL_FILE="ActOne-Linux-x64-$VERSION.tar.gz"
mkdir -p "$ARTIFACTS_DIR"
cd "$TARBALL_DIR"
tar -czf "$ARTIFACTS_DIR/$TARBALL_FILE" .

rm -rf "$TARBALL_DIR"

echo "==> Done! Artifact:"
echo "  $ARTIFACTS_DIR/$TARBALL_FILE"
