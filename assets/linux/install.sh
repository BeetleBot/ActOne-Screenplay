#!/bin/sh
set -e

if [ "$(id -u)" -ne 0 ]; then
    echo "Error: This installer requires root privileges."
    echo "Please run this script from the terminal using:"
    echo "    sudo $0"
    exit 1
fi

echo "=========================================="
echo "      ActOne Linux Installer             "
echo "=========================================="

# --- Function to check missing shared libraries ---
check_lib() {
    lib_name="$1"
    if command -v ldconfig >/dev/null 2>&1; then
        ldconfig -p 2>/dev/null | grep -q "$lib_name" && return 0
    fi
    for path in /lib /usr/lib /lib64 /usr/lib64 /usr/lib/*-linux-gnu /lib/*-linux-gnu; do
        if [ -d "$path" ] && ls "$path"/$lib_name* >/dev/null 2>&1; then
            return 0
        fi
    done
    return 1
}

# --- Install Runtime Dependencies ---
echo ""
echo "[1/4] Checking system dependencies..."

MISSING_DEPS=0
check_lib "libwebkit2gtk-4.1.so" || check_lib "libwebkit2gtk-4.0.so" || MISSING_DEPS=1
check_lib "libgtk-3.so" || MISSING_DEPS=1
check_lib "libsoup-3.0.so" || check_lib "libsoup-2.4.so" || MISSING_DEPS=1

if [ "$MISSING_DEPS" -eq 1 ]; then
    echo "Missing required runtime dependencies. Detecting package manager to install them..."
    
    if command -v apt-get >/dev/null 2>&1; then
        echo "--> Detected APT (Ubuntu/Debian/Linux Mint/Pop!_OS)"
        apt-get update -qq || true
        apt-get install -y libwebkit2gtk-4.1-0 libgtk-3-0 libsoup-3.0-0 libayatana-appindicator3-1 librsvg2-2 || \
        apt-get install -y libwebkit2gtk-4.0-3 libgtk-3-0 libsoup2.4-1 libappindicator3-1 librsvg2-2
    elif command -v dnf >/dev/null 2>&1; then
        echo "--> Detected DNF (Fedora/RHEL/CentOS)"
        dnf install -y webkit2gtk4.1 gtk3 libsoup3 libappindicator-gtk3 librsvg2 || \
        dnf install -y webkit2gtk3.0 gtk3 libsoup libappindicator-gtk3 librsvg2
    elif command -v pacman >/dev/null 2>&1; then
        echo "--> Detected Pacman (Arch Linux/Manjaro)"
        pacman -S --needed --noconfirm webkit2gtk-4.1 gtk3 libsoup3 libayatana-appindicator librsvg
    elif command -v zypper >/dev/null 2>&1; then
        echo "--> Detected Zypper (openSUSE)"
        zypper install -y libwebkit2gtk-4_1-0 libgtk-3-0 libsoup-3_0-0 libayatana-appindicator3-1
    else
        echo "WARNING: Could not automatically install dependencies. Unrecognized package manager."
        echo "Please ensure GTK3, WebKitGTK 4.1 (or 4.0), and libsoup are installed."
    fi
else
    echo "All core runtime dependencies are already present."
fi

# --- Install Application Files ---
echo ""
echo "[2/4] Installing program files to /usr/share/actone..."
mkdir -p /usr/share/actone
cp -R usr/share/actone/* /usr/share/actone/ 2>/dev/null || cp -R usr/share/actone /usr/share/

echo ""
echo "[3/4] Creating executable symlink /usr/bin/actone..."
ln -sf /usr/share/actone/actone /usr/bin/actone

# Remove old location binary if present
if [ -f "/usr/local/bin/actone" ] && ! [ -L "/usr/local/bin/actone" ]; then
    rm -f /usr/local/bin/actone
fi

# --- Desktop Integration ---
echo ""
echo "[4/4] Configuring menu shortcuts & icons..."

# Install icons
if command -v xdg-icon-resource >/dev/null 2>&1; then
    for size in 16 32 64 128 256 512; do
        if [ -f "usr/share/actone/icon_app/actone_icon_${size}x${size}.png" ]; then
            xdg-icon-resource install --novendor --size $size "usr/share/actone/icon_app/actone_icon_${size}x${size}.png" actone 2>/dev/null || true
        fi
    done

    for size in 64 256; do
        if [ -f "usr/share/actone/icon_mime/text-vnd.fountain_${size}x${size}.png" ]; then
            xdg-icon-resource install --context mimetypes --novendor --size $size "usr/share/actone/icon_mime/text-vnd.fountain_${size}x${size}.png" text-vnd.fountain 2>/dev/null || true
        fi
        if [ -f "usr/share/actone/icon_mime/application-vnd.actone.bundle_${size}x${size}.png" ]; then
            xdg-icon-resource install --context mimetypes --novendor --size $size "usr/share/actone/icon_mime/application-vnd.actone.bundle_${size}x${size}.png" application-vnd.actone.bundle 2>/dev/null || true
        fi
        if [ -f "usr/share/actone/icon_mime/application-vnd.actone.theme_${size}x${size}.png" ]; then
            xdg-icon-resource install --context mimetypes --novendor --size $size "usr/share/actone/icon_mime/application-vnd.actone.theme_${size}x${size}.png" application-vnd.actone.theme 2>/dev/null || true
        fi
    done
fi

# MIME types
if command -v xdg-mime >/dev/null 2>&1; then
    if [ -f "usr/share/mime/packages/actone.xml" ]; then
        xdg-mime install --novendor usr/share/mime/packages/actone.xml 2>/dev/null || true
        xdg-mime default actone.desktop text/vnd.fountain 2>/dev/null || true
        xdg-mime default actone.desktop application/vnd.actone.bundle 2>/dev/null || true
        xdg-mime default actone.desktop application/vnd.actone.theme 2>/dev/null || true
    fi
fi

# Desktop Menu Entry
if command -v xdg-desktop-menu >/dev/null 2>&1; then
    xdg-desktop-menu install --novendor usr/share/applications/actone.desktop 2>/dev/null || true
elif [ -d "/usr/share/applications" ]; then
    cp usr/share/applications/actone.desktop /usr/share/applications/ 2>/dev/null || true
fi

echo ""
echo "=========================================="
echo " ActOne installation complete!"
echo " Launch it from your menu or type 'actone'."
echo "=========================================="

