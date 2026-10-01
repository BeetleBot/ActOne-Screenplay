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

echo "==> Bundling dependencies with linuxdeploy & GTK plugin"
LINUXDEPLOY="$BUILD_DIR/linuxdeploy"
if ! command -v linuxdeploy &>/dev/null; then
    curl -fsSL -o "$LINUXDEPLOY" "https://github.com/linuxdeploy/linuxdeploy/releases/download/continuous/linuxdeploy-x86_64.AppImage"
    chmod +x "$LINUXDEPLOY"
else
    LINUXDEPLOY=$(command -v linuxdeploy)
fi

GTK_PLUGIN="$BUILD_DIR/linuxdeploy-plugin-gtk.sh"
curl -fsSL -o "$GTK_PLUGIN" "https://raw.githubusercontent.com/linuxdeploy/linuxdeploy-plugin-gtk/master/linuxdeploy-plugin-gtk.sh"
chmod +x "$GTK_PLUGIN"

# Extract linuxdeploy if needed for container / sandbox environments
if [ -f "$LINUXDEPLOY" ] && [ "$LINUXDEPLOY" = "$BUILD_DIR/linuxdeploy" ]; then
    (cd "$BUILD_DIR" && ./linuxdeploy --appimage-extract >/dev/null 2>&1 && mv squashfs-root linuxdeploy-extracted)
    LINUXDEPLOY_BIN="$BUILD_DIR/linuxdeploy-extracted/AppRun"
else
    LINUXDEPLOY_BIN="$LINUXDEPLOY"
fi

export NO_STRIP=true
PATH="$BUILD_DIR:$PATH" "$LINUXDEPLOY_BIN" \
    --appdir "$APPDIR" \
    --executable "$APPDIR/usr/bin/actone" \
    --desktop-file "$APPDIR/actone.desktop" \
    --icon-file "$APPDIR/actone.png" \
    --plugin gtk

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
