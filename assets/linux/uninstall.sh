#!/bin/sh
set -e

if [ "$(id -u)" -ne 0 ]; then
    echo "Error: This uninstaller requires root privileges."
    echo "Please run this script from the terminal using:"
    echo "    sudo $0"
    exit 1
fi

echo "=========================================="
echo "     ActOne Uninstaller                  "
echo "=========================================="

echo "Removing program files from /usr/share/actone..."
rm -rf /usr/share/actone

if [ -L "/usr/bin/actone" ] || [ -f "/usr/bin/actone" ]; then
    echo "Removing symlink /usr/bin/actone..."
    rm -f /usr/bin/actone
fi

if [ -f "/usr/local/bin/actone" ]; then
    echo "Removing old binary /usr/local/bin/actone..."
    rm -f /usr/local/bin/actone
fi

if command -v xdg-icon-resource >/dev/null 2>&1; then
    echo "Uninstalling application icons..."
    for size in 16 32 64 128 256 512; do
        xdg-icon-resource uninstall --size $size actone 2>/dev/null || true
    done
    echo "Uninstalling document type icons..."
    for size in 64 256; do
        xdg-icon-resource uninstall --context mimetypes --size $size text-vnd.fountain 2>/dev/null || true
        xdg-icon-resource uninstall --context mimetypes --size $size application-vnd.actone.bundle 2>/dev/null || true
        xdg-icon-resource uninstall --context mimetypes --size $size application-vnd.actone.theme 2>/dev/null || true
    done
fi

if command -v xdg-mime >/dev/null 2>&1; then
    echo "Removing MIME type..."
    xdg-mime uninstall --novendor usr/share/mime/packages/actone.xml 2>/dev/null || true
fi

if command -v xdg-desktop-menu >/dev/null 2>&1; then
    echo "Removing desktop menu shortcut..."
    xdg-desktop-menu uninstall --novendor usr/share/applications/actone.desktop 2>/dev/null || true
fi

if [ -e "/usr/share/applications/actone.desktop" ]; then
    rm -f /usr/share/applications/actone.desktop
fi

echo ""
echo "=========================================="
echo " ActOne uninstallation complete!"
echo " (Note: Shared system libraries were kept intact)."
echo "=========================================="

