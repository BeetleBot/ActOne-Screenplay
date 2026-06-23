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

# --- Detect or prompt for distro ---
detect_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        case "${ID,,}" in
            ubuntu|debian|pop|linuxmint|elementary|zorin) echo "ubuntu" ;;
            fedora|rhel|centos|rocky|almalinux)          echo "fedora" ;;
            arch|manjaro|endeavouros|garuda)              echo "arch" ;;
            *)                                            echo "" ;;
        esac
    fi
}

DEFAULT_DISTRO=$(detect_distro)

echo ""
echo "==> Linux Distribution Selection"
echo "  1) Ubuntu/Debian-based (apt)"
echo "  2) Fedora/RHEL-based   (dnf)"
echo "  3) Arch Linux-based    (pacman)"
echo ""

if [ -n "$DEFAULT_DISTRO" ]; then
    case "$DEFAULT_DISTRO" in
        ubuntu) DEFAULT_NUM=1 ;;
        fedora) DEFAULT_NUM=2 ;;
        arch)   DEFAULT_NUM=3 ;;
    esac
    echo -n "Detected: $DEFAULT_DISTRO. Press Enter to use default, or enter 1-3: "
else
    DEFAULT_NUM=""
    echo -n "Enter your choice (1-3): "
fi

read -r CHOICE
CHOICE="${CHOICE:-$DEFAULT_NUM}"

case "$CHOICE" in
    1) DISTRO="ubuntu" ;;
    2) DISTRO="fedora" ;;
    3) DISTRO="arch" ;;
    *)
        echo "Invalid choice. Defaulting to Ubuntu/Debian."
        DISTRO="ubuntu"
        ;;
esac

echo "==> Selected: $DISTRO"

install_deps_ubuntu() {
    sudo apt-get update -qq
    sudo apt-get install -y -qq \
        libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev \
        librsvg2-dev libsoup-3.0-dev libjavascriptcoregtk-4.1-dev \
        pkg-config
}

install_deps_fedora() {
    sudo dnf install -y \
        webkit2gtk4.1-devel gtk3-devel libappindicator-gtk3-devel \
        librsvg2-devel libsoup3-devel \
        pkg-config
}

install_deps_arch() {
    sudo pacman -S --noconfirm \
        webkit2gtk-4.1 gtk3 libayatana-appindicator \
        librsvg libsoup3 pkg-config
}

# --- Install system dependencies ---
echo "==> Installing Linux system dependencies"
case "$DISTRO" in
    ubuntu) install_deps_ubuntu ;;
    fedora) install_deps_fedora ;;
    arch)   install_deps_arch ;;
esac

# --- Check for Rust ---
if ! command -v rustc &>/dev/null; then
    echo "==> Installing Rust"
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
fi

# --- Install Node.js if missing ---
if ! command -v node &>/dev/null; then
    echo "==> Installing Node.js"
    case "$DISTRO" in
        ubuntu)
            curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
            sudo apt-get install -y -qq nodejs
            ;;
        fedora)
            curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo -E bash -
            sudo dnf install -y nodejs
            ;;
        arch)
            sudo pacman -S --noconfirm nodejs npm
            ;;
    esac
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
