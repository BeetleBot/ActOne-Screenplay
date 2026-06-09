#!/bin/sh

if ! [ $# = 0 ]; then
	echo "ActOne .tar.gz installer"
	echo "Usage: sudo ./install.sh"
	exit
fi

echo "Installing ActOne to /usr/share/actone..."

# Check if root
if ! [ $(id -u) = 0 ]; then
	echo "Please re-run using sudo: sudo ${0}" 
	exit 1
fi

echo "Copying program files to /usr/share/..."
cp -R usr/share/actone /usr/share/

echo "Creating symlink /usr/bin/actone..."
ln -sf /usr/share/actone/actone /usr/bin/actone

# Install icon resources
if command -v xdg-icon-resource >/dev/null 2>&1; then
	echo "Installing application icons..."
	for size in 16 32 64 128 256 512; do
		if [ -f "usr/share/actone/icon_app/actone_icon_${size}x${size}.png" ]; then
			xdg-icon-resource install --novendor --size $size "usr/share/actone/icon_app/actone_icon_${size}x${size}.png" actone
		fi
	done
fi

# MIME type
if command -v xdg-mime >/dev/null 2>&1; then
	if [ -f "usr/share/mime/packages/actone.xml" ]; then
		echo "Adding MIME type..."
		xdg-mime install --novendor usr/share/mime/packages/actone.xml
		xdg-mime default actone.desktop text/vnd.fountain
	fi
fi

# Desktop resource
if command -v xdg-desktop-menu >/dev/null 2>&1; then
	echo "Adding to menu..."
	xdg-desktop-menu install --novendor usr/share/applications/actone.desktop
elif [ -d "/usr/share/applications" ]; then
	echo "Installing default .desktop file..."
	cp usr/share/applications/actone.desktop /usr/share/applications/
fi

echo "ActOne installation complete!"
