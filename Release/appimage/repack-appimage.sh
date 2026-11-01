#!/usr/bin/env bash
# Repair Tauri's build-machine .DirIcon link before publishing the AppImage.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
INPUT="$(realpath "${1:?Usage: repack-appimage.sh INPUT OUTPUT}")"
OUTPUT="$(realpath -m "${2:?Usage: repack-appimage.sh INPUT OUTPUT}")"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT
cd "$WORK_DIR"
chmod +x "$INPUT"
"$INPUT" --appimage-extract > /dev/null

# A regular PNG remains valid after moving the image to another machine.
# --remove-destination replaces the symlink itself, never its absolute target.
cp --remove-destination "$PROJECT_ROOT/src-tauri/icons/128x128@2x.png" squashfs-root/.DirIcon
# The mounted image must be readable and its directories/executables usable by
# users other than the build runner. Preserve which regular files are executable.
chmod -R a+rX squashfs-root

if [ -n "${APPIMAGETOOL:-}" ]; then
    TOOL="$(realpath "$APPIMAGETOOL")"
else
    TOOL="$WORK_DIR/appimagetool.AppImage"
    curl --fail --location --retry 3 --output "$TOOL" \
        https://github.com/AppImage/appimagetool/releases/download/1.9.1/appimagetool-x86_64.AppImage
    # Upgrade the versioned URL and checksum together; never use the rolling tag.
    printf '%s  %s\n' ed4ce84f0d9caff66f50bcca6ff6f35aae54ce8135408b3fa33abfc3cb384eb0 "$TOOL" | sha256sum --check
fi
chmod +x "$TOOL"
mkdir -p "$(dirname "$OUTPUT")"
ARCH=x86_64 APPIMAGE_EXTRACT_AND_RUN=1 "$TOOL" squashfs-root "$OUTPUT"
