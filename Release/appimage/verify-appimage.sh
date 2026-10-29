#!/usr/bin/env bash
# Inspect the final artifact, including helper dependency resolution.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APPIMAGE="$(realpath "${1:?Usage: verify-appimage.sh APPIMAGE}")"
CHECK_DIR="$(mktemp -d)"
trap 'rm -rf "$CHECK_DIR"' EXIT
cd "$CHECK_DIR"
chmod +x "$APPIMAGE"
"$APPIMAGE" --appimage-extract > /dev/null
APPDIR="$CHECK_DIR/squashfs-root"

for helper in WebKitNetworkProcess WebKitWebProcess libwebkit2gtkinjectedbundle.so; do
    path="$(find "$APPDIR/usr" -name "$helper" -type f -print -quit)"
    if [ -z "$path" ]; then
        echo "AppImage is missing required WebKit component: $helper" >&2
        exit 1
    fi
    if [ "$helper" != libwebkit2gtkinjectedbundle.so ] && [ ! -x "$path" ]; then
        echo "WebKit helper is not executable: $path" >&2
        exit 1
    fi
    dependencies="$(LD_LIBRARY_PATH="$APPDIR/usr/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}" ldd "$path")"
    if [[ "$dependencies" == *"not found"* ]]; then
        echo "Unresolved dependencies for $helper:" >&2
        echo "$dependencies" >&2
        exit 1
    fi
done

echo "AppImage contains WebKit helpers and their dependencies resolve on this build host."

if [ "${APPIMAGE_SMOKE_TEST:-0}" = 1 ]; then
    xvfb-run -a bash "$SCRIPT_DIR/smoke-appimage.sh" "$APPDIR"
fi
