#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

APP_NAME="actone"
PRODUCT_NAME="ActOne"
TARBALL_NAME="$PRODUCT_NAME-Linux-x64.tar.gz"

# Detect if running from inside an extracted tarball (portable mode)
# or from the project development directory.
if [ -f "$SCRIPT_DIR/$APP_NAME" ] && [ -f "$SCRIPT_DIR/$APP_NAME.desktop" ]; then
    PORTABLE_MODE=true
    BINARY_SRC="$SCRIPT_DIR/$APP_NAME"
    DESKTOP_FILE="$SCRIPT_DIR/$APP_NAME.desktop"
    ICON_SRC="$SCRIPT_DIR/$APP_NAME-icon.png"
    INSTALL_SCRIPT_SRC="$SCRIPT_DIR/install.sh"
else
    PORTABLE_MODE=false
    BINARY_SRC="$PROJECT_DIR/src-tauri/target/release/$APP_NAME"
    DESKTOP_FILE="$PROJECT_DIR/assets/linux/$APP_NAME.desktop"
    ICON_SRC="$PROJECT_DIR/src-tauri/icons/icon.png"
    INSTALL_SCRIPT_SRC="$SCRIPT_DIR/install_linux.sh"
fi

print_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo
    echo "Build ActOne and create a portable Linux tarball."
    echo
    echo "Options:"
    echo "  --install       Build, tarball, and install to system (/usr/local)"
    echo "  --build-only    Only build the app (no tarball, no install)"
    echo "  --tarball-only  Create tarball from existing build (skip build)"
    echo "  --help          Show this help"
    echo
    echo "Default: build + create tarball (no system install)"
}

do_build() {
    echo "==> Building frontend and Tauri app..."
    cd "$PROJECT_DIR"
    npm run tauri build
    echo "    Build complete."
}

do_tarball() {
    echo "==> Creating portable tarball..."
    if [ ! -f "$BINARY_SRC" ]; then
        echo "ERROR: Binary not found at $BINARY_SRC"
        echo "Run 'npm run tauri build' first or use --build-only/--tarball-only"
        exit 1
    fi
    if [ ! -f "$DESKTOP_FILE" ]; then
        echo "ERROR: Desktop file not found at $DESKTOP_FILE"
        exit 1
    fi
    if [ ! -f "$ICON_SRC" ]; then
        echo "ERROR: Icon not found at $ICON_SRC"
        exit 1
    fi

    local tmpdir
    tmpdir="$(mktemp -d)"
    cp "$BINARY_SRC" "$tmpdir/$APP_NAME"
    cp "$DESKTOP_FILE" "$tmpdir/$APP_NAME.desktop"
    cp "$ICON_SRC" "$tmpdir/$APP_NAME-icon.png"
    cp "$INSTALL_SCRIPT_SRC" "$tmpdir/install.sh"
    chmod +x "$tmpdir/install.sh"

    cd "$tmpdir"
    tar -czf "$PROJECT_DIR/$TARBALL_NAME" .
    cd "$PROJECT_DIR"

    rm -rf "$tmpdir"
    echo "    Created: $TARBALL_NAME"
}

do_install() {
    echo "==> Installing to system..."

    local prefix="${INSTALL_PREFIX:-/usr/local}"
    local bin_dir="$prefix/bin"
    local apps_dir="/usr/share/applications"
    local icon_dir="/usr/share/icons/hicolor/256x256/apps"

    if [ "$(id -u)" -ne 0 ]; then
        echo "WARNING: Not running as root. Use sudo if write permissions fail."
    fi

    if [ ! -f "$BINARY_SRC" ]; then
        echo "ERROR: Binary not found at $BINARY_SRC. Build first."
        exit 1
    fi

    mkdir -p "$bin_dir" "$apps_dir" "$icon_dir"

    install -Dm755 "$BINARY_SRC" "$bin_dir/$APP_NAME"
    echo "    Installed binary: $bin_dir/$APP_NAME"

    install -Dm644 "$DESKTOP_FILE" "$apps_dir/$APP_NAME.desktop"
    echo "    Installed desktop entry: $apps_dir/$APP_NAME.desktop"

    install -Dm644 "$ICON_SRC" "$icon_dir/$APP_NAME.png"
    echo "    Installed icon: $icon_dir/$APP_NAME.png"

    if command -v update-desktop-database &>/dev/null; then
        update-desktop-database "$apps_dir" 2>/dev/null || true
        echo "    Updated desktop database."
    fi

    if command -v gtk-update-icon-cache &>/dev/null; then
        gtk-update-icon-cache -f -t /usr/share/icons/hicolor 2>/dev/null || true
        echo "    Updated icon cache."
    fi

    if command -v xdg-mime &>/dev/null; then
        xdg-mime default "$APP_NAME.desktop" text/vnd.fountain 2>/dev/null || true
        echo "    Registered MIME association."
    fi

    echo "    Installation complete."
}

MODE="default"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --install)   MODE="install" ;;
        --build-only) MODE="build-only" ;;
        --tarball-only) MODE="tarball-only" ;;
        --help)      print_usage; exit 0 ;;
        *)           echo "Unknown option: $1"; print_usage; exit 1 ;;
    esac
    shift
done

case "$MODE" in
    default)
        do_build
        do_tarball
        echo
        echo "Done! Tarball: $TARBALL_NAME"
        echo "To install system-wide: sudo $0 --install"
        ;;
    install)
        if [ "$PORTABLE_MODE" = false ]; then
            do_build
            do_tarball
        fi
        do_install
        echo
        echo "Done! ActOne installed to your application menu."
        ;;
    build-only)
        do_build
        echo
        echo "Done! Build complete."
        ;;
    tarball-only)
        do_tarball
        echo
        echo "Done! Tarball: $TARBALL_NAME"
        ;;
esac
