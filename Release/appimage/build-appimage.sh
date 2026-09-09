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
mkdir -p "$APPDIR/usr/share/icons/hicolor/128x128/apps"
mkdir -p "$APPDIR/usr/share/icons/hicolor/256x256/apps"
mkdir -p "$APPDIR/usr/share/mime/packages"

cp "$PROJECT_ROOT/src-tauri/target/release/actone" "$APPDIR/usr/bin/actone"
chmod +x "$APPDIR/usr/bin/actone"

cp "$PROJECT_ROOT/assets/linux/actone.desktop" "$APPDIR/usr/share/applications/actone.desktop"
cp "$PROJECT_ROOT/assets/linux/actone.desktop" "$APPDIR/actone.desktop"

cp "$PROJECT_ROOT/assets/linux/actone.xml" "$APPDIR/usr/share/mime/packages/actone.xml"

if [ -f "$PROJECT_ROOT/src-tauri/icons/128x128.png" ]; then
    cp "$PROJECT_ROOT/src-tauri/icons/128x128.png" "$APPDIR/usr/share/icons/hicolor/128x128/apps/actone.png"
fi
if [ -f "$PROJECT_ROOT/src-tauri/icons/128x128@2x.png" ]; then
    cp "$PROJECT_ROOT/src-tauri/icons/128x128@2x.png" "$APPDIR/usr/share/icons/hicolor/256x256/apps/actone.png"
fi

cp "$PROJECT_ROOT/src-tauri/icons/128x128.png" "$APPDIR/actone.png"
cp "$PROJECT_ROOT/src-tauri/icons/128x128.png" "$APPDIR/.DirIcon"

cat << 'APP_RUN' > "$APPDIR/AppRun"
#!/bin/sh
SELF=$(readlink -f "$0")
HERE=${SELF%/*}

DATA_HOME="${XDG_DATA_HOME:-$HOME/.local/share}"
DESKTOP_FILE="$DATA_HOME/applications/actone.desktop"
CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config}"
PROMPT_RECORD="$CONFIG_HOME/actone/dont_ask_integration.flag"

integrate_desktop() {
    mkdir -p "$DATA_HOME/applications" "$DATA_HOME/icons/hicolor/128x128/apps" "$DATA_HOME/mime/packages" "$CONFIG_HOME/actone"

    cp "${HERE}/actone.png" "$DATA_HOME/icons/hicolor/128x128/apps/actone.png"
    cp "${HERE}/usr/share/mime/packages/actone.xml" "$DATA_HOME/mime/packages/actone.xml"

    TARGET_EXEC="${APPIMAGE:-$SELF}"
    sed -e "s|^Exec=.*|Exec=\"${TARGET_EXEC}\" %f|" \
        -e "s|^Icon=.*|Icon=actone|" \
        "${HERE}/actone.desktop" > "$DESKTOP_FILE"
    chmod +x "$DESKTOP_FILE"

    if command -v update-mime-database >/dev/null 2>&1; then
        update-mime-database "$DATA_HOME/mime" >/dev/null 2>&1 || true
    fi
    if command -v update-desktop-database >/dev/null 2>&1; then
        update-desktop-database "$DATA_HOME/applications" >/dev/null 2>&1 || true
    fi
    if command -v xdg-mime >/dev/null 2>&1; then
        xdg-mime default actone.desktop text/vnd.fountain >/dev/null 2>&1 || true
        xdg-mime default actone.desktop application/vnd.actone.bundle >/dev/null 2>&1 || true
        xdg-mime default actone.desktop application/vnd.actone.theme >/dev/null 2>&1 || true
    fi
}

if [ "${1:-}" = "--install-integration" ]; then
    integrate_desktop
    echo "ActOne Screenplay has been integrated into your desktop and set as default for .fountain, .actone, and .actheme files."
    exit 0
fi

# First run detection with 3 options: Integrate, Run Once (Ask Later), Don't Ask Again
if [ -n "$DISPLAY" ] || [ -n "$WAYLAND_DISPLAY" ]; then
    if [ ! -f "$PROMPT_RECORD" ] && [ ! -f "$DESKTOP_FILE" ]; then
        CHOICE=""
        if command -v zenity >/dev/null 2>&1; then
            CHOICE=$(zenity --list \
                --title="ActOne Screenplay - Desktop Integration" \
                --window-icon="${HERE}/actone.png" \
                --text="Would you like to integrate ActOne Screenplay into your system?\n\nThis adds it to your application menu and sets it as the default app for .fountain and .actone screenplay files." \
                --radiolist \
                --column="Pick" --column="Option" \
                TRUE "Integrate & Set Default" \
                FALSE "Run Once (Ask Later)" \
                FALSE "Don't Ask Again" \
                --hide-header \
                --width=460 --height=270 2>/dev/null || echo "Run Once (Ask Later)")
        fi

        case "$CHOICE" in
            "Integrate & Set Default")
                integrate_desktop
                ;;
            "Don't Ask Again")
                mkdir -p "$CONFIG_HOME/actone"
                touch "$PROMPT_RECORD"
                ;;
            *)
                # Run Once (Ask Later) - do nothing, so it asks again next run
                ;;
        esac
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
