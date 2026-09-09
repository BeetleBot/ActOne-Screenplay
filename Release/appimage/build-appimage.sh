#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ARTIFACTS_DIR="$PROJECT_ROOT/Release/artifacts"
BUILD_DIR="$PROJECT_ROOT/target/appimage-build"
APPDIR="$BUILD_DIR/AppDir"

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

echo "==> Preparing AppDir layout"
rm -rf "$BUILD_DIR"
mkdir -p "$APPDIR/usr/bin"
mkdir -p "$APPDIR/usr/share/applications"
mkdir -p "$APPDIR/usr/share/mime/packages"

# Application and MIME icons structure
mkdir -p "$APPDIR/usr/share/icons/hicolor/128x128/apps"
mkdir -p "$APPDIR/usr/share/icons/hicolor/256x256/apps"
mkdir -p "$APPDIR/usr/share/icons/hicolor/64x64/mimetypes"
mkdir -p "$APPDIR/usr/share/icons/hicolor/256x256/mimetypes"

cp "$PROJECT_ROOT/src-tauri/target/release/actone" "$APPDIR/usr/bin/actone"
chmod +x "$APPDIR/usr/bin/actone"

cp "$PROJECT_ROOT/assets/linux/actone.desktop" "$APPDIR/usr/share/applications/actone.desktop"
cp "$PROJECT_ROOT/assets/linux/actone.desktop" "$APPDIR/actone.desktop"

cp "$PROJECT_ROOT/assets/linux/actone.xml" "$APPDIR/usr/share/mime/packages/actone.xml"

# Copy App icons
if [ -f "$PROJECT_ROOT/src-tauri/icons/128x128.png" ]; then
    cp "$PROJECT_ROOT/src-tauri/icons/128x128.png" "$APPDIR/usr/share/icons/hicolor/128x128/apps/actone.png"
fi
if [ -f "$PROJECT_ROOT/src-tauri/icons/128x128@2x.png" ]; then
    cp "$PROJECT_ROOT/src-tauri/icons/128x128@2x.png" "$APPDIR/usr/share/icons/hicolor/256x256/apps/actone.png"
fi

# Copy MIME type icons for .fountain, .actone, .actheme
for mime in text-vnd.fountain application-vnd.actone.bundle application-vnd.actone.theme; do
    if [ -f "$PROJECT_ROOT/src-tauri/icons/${mime}_64x64.png" ]; then
        cp "$PROJECT_ROOT/src-tauri/icons/${mime}_64x64.png" "$APPDIR/usr/share/icons/hicolor/64x64/mimetypes/${mime}.png"
    fi
    if [ -f "$PROJECT_ROOT/src-tauri/icons/${mime}_256x256.png" ]; then
        cp "$PROJECT_ROOT/src-tauri/icons/${mime}_256x256.png" "$APPDIR/usr/share/icons/hicolor/256x256/mimetypes/${mime}.png"
    fi
done

cp "$PROJECT_ROOT/src-tauri/icons/128x128.png" "$APPDIR/actone.png"
cp "$PROJECT_ROOT/src-tauri/icons/128x128.png" "$APPDIR/.DirIcon"

cat << 'APP_RUN' > "$APPDIR/AppRun"
#!/bin/sh
SELF=$(readlink -f "$0")
HERE=${SELF%/*}

DATA_HOME="${XDG_DATA_HOME:-$HOME/.local/share}"
BIN_DIR="${HOME}/.local/bin"
DESKTOP_FILE="$DATA_HOME/applications/actone.desktop"
CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config}"
PROMPT_RECORD="$CONFIG_HOME/actone/dont_ask_integration.flag"
INSTALLED_APPIMAGE="$BIN_DIR/ActOne-Screenplay.AppImage"
COMMAND_SYMLINK="$BIN_DIR/actone"

integrate_desktop() {
    mkdir -p "$DATA_HOME/applications" "$DATA_HOME/mime/packages" "$CONFIG_HOME/actone" "$BIN_DIR"
    mkdir -p "$DATA_HOME/icons/hicolor/128x128/apps"
    mkdir -p "$DATA_HOME/icons/hicolor/256x256/apps"
    mkdir -p "$DATA_HOME/icons/hicolor/64x64/mimetypes"
    mkdir -p "$DATA_HOME/icons/hicolor/256x256/mimetypes"

    # Install AppImage to ~/.local/bin/ActOne-Screenplay.AppImage
    SOURCE_APPIMAGE="${APPIMAGE:-$SELF}"
    if [ "$SOURCE_APPIMAGE" != "$INSTALLED_APPIMAGE" ]; then
        cp -f "$SOURCE_APPIMAGE" "$INSTALLED_APPIMAGE"
        chmod +x "$INSTALLED_APPIMAGE"
    fi

    # Create 'actone' CLI symlink in ~/.local/bin/
    ln -sf "$INSTALLED_APPIMAGE" "$COMMAND_SYMLINK"

    # App icons
    cp "${HERE}/usr/share/icons/hicolor/128x128/apps/actone.png" "$DATA_HOME/icons/hicolor/128x128/apps/actone.png" 2>/dev/null || cp "${HERE}/actone.png" "$DATA_HOME/icons/hicolor/128x128/apps/actone.png"
    if [ -f "${HERE}/usr/share/icons/hicolor/256x256/apps/actone.png" ]; then
        cp "${HERE}/usr/share/icons/hicolor/256x256/apps/actone.png" "$DATA_HOME/icons/hicolor/256x256/apps/actone.png"
    fi

    # MIME icons
    for mime in text-vnd.fountain application-vnd.actone.bundle application-vnd.actone.theme; do
        if [ -f "${HERE}/usr/share/icons/hicolor/64x64/mimetypes/${mime}.png" ]; then
            cp "${HERE}/usr/share/icons/hicolor/64x64/mimetypes/${mime}.png" "$DATA_HOME/icons/hicolor/64x64/mimetypes/${mime}.png"
        fi
        if [ -f "${HERE}/usr/share/icons/hicolor/256x256/mimetypes/${mime}.png" ]; then
            cp "${HERE}/usr/share/icons/hicolor/256x256/mimetypes/${mime}.png" "$DATA_HOME/icons/hicolor/256x256/mimetypes/${mime}.png"
        fi
    done

    # MIME definition XML
    cp "${HERE}/usr/share/mime/packages/actone.xml" "$DATA_HOME/mime/packages/actone.xml"

    sed -e "s|^Exec=.*|Exec=\"${INSTALLED_APPIMAGE}\" %f|" \
        -e "s|^Icon=.*|Icon=actone|" \
        "${HERE}/actone.desktop" > "$DESKTOP_FILE"
    chmod +x "$DESKTOP_FILE"

    if command -v update-mime-database >/dev/null 2>&1; then
        update-mime-database "$DATA_HOME/mime" >/dev/null 2>&1 || true
    fi
    if command -v update-desktop-database >/dev/null 2>&1; then
        update-desktop-database "$DATA_HOME/applications" >/dev/null 2>&1 || true
    fi
    if command -v gtk-update-icon-cache >/dev/null 2>&1; then
        gtk-update-icon-cache -f -t "$DATA_HOME/icons/hicolor" >/dev/null 2>&1 || true
    fi
    if command -v xdg-mime >/dev/null 2>&1; then
        xdg-mime default actone.desktop text/vnd.fountain >/dev/null 2>&1 || true
        xdg-mime default actone.desktop application/vnd.actone.bundle >/dev/null 2>&1 || true
        xdg-mime default actone.desktop application/vnd.actone.theme >/dev/null 2>&1 || true
    fi
}

uninstall_desktop() {
    echo "Uninstalling ActOne Screenplay..."

    # Remove desktop shortcut & MIME definitions
    rm -f "$DESKTOP_FILE"
    rm -f "$DATA_HOME/mime/packages/actone.xml"

    # Remove icons
    rm -f "$DATA_HOME/icons/hicolor/128x128/apps/actone.png"
    rm -f "$DATA_HOME/icons/hicolor/256x256/apps/actone.png"
    for mime in text-vnd.fountain application-vnd.actone.bundle application-vnd.actone.theme; do
        rm -f "$DATA_HOME/icons/hicolor/64x64/mimetypes/${mime}.png"
        rm -f "$DATA_HOME/icons/hicolor/256x256/mimetypes/${mime}.png"
    done

    # Remove CLI symlink and installed binary
    rm -f "$COMMAND_SYMLINK"
    rm -f "$INSTALLED_APPIMAGE"
    rm -f "$PROMPT_RECORD"

    if command -v update-mime-database >/dev/null 2>&1; then
        update-mime-database "$DATA_HOME/mime" >/dev/null 2>&1 || true
    fi
    if command -v update-desktop-database >/dev/null 2>&1; then
        update-desktop-database "$DATA_HOME/applications" >/dev/null 2>&1 || true
    fi
    if command -v gtk-update-icon-cache >/dev/null 2>&1; then
        gtk-update-icon-cache -f -t "$DATA_HOME/icons/hicolor" >/dev/null 2>&1 || true
    fi

    echo "ActOne Screenplay has been completely uninstalled from your system."
}

if [ "${1:-}" = "uninstall" ] || [ "${1:-}" = "--uninstall" ]; then
    uninstall_desktop
    exit 0
fi

if [ "${1:-}" = "--install-integration" ] || [ "${1:-}" = "install" ]; then
    integrate_desktop
    echo "ActOne Screenplay has been installed to $INSTALLED_APPIMAGE and command 'actone' is linked in $BIN_DIR."
    exit 0
fi

# First run detection with 3-button question dialog
if [ -n "$DISPLAY" ] || [ -n "$WAYLAND_DISPLAY" ]; then
    if [ ! -f "$PROMPT_RECORD" ] && [ ! -f "$DESKTOP_FILE" ]; then
        if command -v zenity >/dev/null 2>&1; then
            OUTPUT=$(zenity --question \
                --title="ActOne Screenplay" \
                --window-icon="${HERE}/actone.png" \
                --text="Would you like to install ActOne Screenplay on your system?\n\nThis adds it to your application menu, enables terminal command 'actone', installs file icons, and sets it as the default app for .fountain and .actone screenplay files." \
                --ok-label="Install" \
                --cancel-label="Run Once (Ask Later)" \
                --extra-button="Don't Ask Again" \
                --width=450 2>&1) || true
            RET=$?

            if [ "$RET" -eq 0 ]; then
                integrate_desktop
            elif [ "$OUTPUT" = "Don't Ask Again" ]; then
                mkdir -p "$CONFIG_HOME/actone"
                touch "$PROMPT_RECORD"
            fi
        fi
    fi
fi

export PATH="${HERE}/usr/bin:${PATH}"
export XDG_DATA_DIRS="${HERE}/usr/share:${XDG_DATA_DIRS:-/usr/local/share:/usr/share}"
exec "${HERE}/usr/bin/actone" "$@"
APP_RUN
chmod +x "$APPDIR/AppRun"

APPIMAGETOOL="$BUILD_DIR/appimagetool"
if ! command -v appimagetool &>/dev/null; then
    echo "==> Downloading appimagetool"
    curl -fsSL -o "$APPIMAGETOOL" "https://github.com/AppImage/appimagetool/releases/download/continuous/appimagetool-x86_64.AppImage"
    chmod +x "$APPIMAGETOOL"
else
    APPIMAGETOOL=$(command -v appimagetool)
fi

mkdir -p "$ARTIFACTS_DIR"
APPIMAGE_NAME="ActOne-Screenplay-x86_64-$VERSION.AppImage"
OUTPUT_FILE="$ARTIFACTS_DIR/$APPIMAGE_NAME"

echo "==> Generating AppImage: $APPIMAGE_NAME"
ARCH=x86_64 "$APPIMAGETOOL" "$APPDIR" "$OUTPUT_FILE"

rm -rf "$BUILD_DIR"

echo "==> AppImage created successfully!"
echo "  Artifact: $OUTPUT_FILE"
