#!/bin/sh

if ! [ $# = 0 ]; then
	echo "ActOne .tar.gz uninstaller"
	echo "Usage: sudo ./uninstall.sh"
	exit
fi

echo "Uninstalling ActOne..."

# Check if root
if ! [ $(id -u) = 0 ]; then
	echo "Please re-run using sudo: sudo ${0}" 
	exit 1
fi

echo "Removing program files..."
rm -rf /usr/share/actone

if [ -L "/usr/bin/actone" ]; then
	echo "Removing symlink..."
	rm /usr/bin/actone
fi

if [ -f "/usr/local/bin/actone" ]; then
	echo "Removing old binary from /usr/local/bin/actone..."
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
	echo "Removing from menu..."
	xdg-desktop-menu uninstall --novendor usr/share/applications/actone.desktop 2>/dev/null || true
fi

if [ -e "/usr/share/applications/actone.desktop" ]; then
	echo "Removing .desktop file..."
	rm -rf /usr/share/applications/actone.desktop
fi

echo "ActOne uninstallation complete!"
