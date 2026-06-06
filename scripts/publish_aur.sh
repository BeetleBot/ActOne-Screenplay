#!/bin/bash
# ActOne AUR Publish Script
# Usage: ./scripts/publish_aur.sh <version>

set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <version> (e.g., 0.1.0)"
    exit 1
fi

INPUT_VERSION=$1
PROJECT_DIR="."
AUR_REPO="ssh://aur@aur.archlinux.org/actone-bin.git"

# Split version and release (e.g., 0.1.0-2 -> pkgver=0.1.0, pkgrel=2)
if [[ "$INPUT_VERSION" == *"-"* ]]; then
    VERSION="${INPUT_VERSION%-*}"
    RELEASE="${INPUT_VERSION##*-}"
else
    VERSION="$INPUT_VERSION"
    RELEASE="1"
fi

if [ ! -f "packaging/aur/PKGBUILD" ]; then
    echo "❌ Error: Could not find PKGBUILD at packaging/aur/PKGBUILD"
    echo "Please run this script from the ActOne root directory."
    exit 1
fi

TEMP_DIR=$(mktemp -d)

echo "🚀 Preparing AUR update for v$VERSION..."

cp "packaging/aur/PKGBUILD" "$TEMP_DIR/"
cd "$TEMP_DIR"

sed -i "s/^pkgver=.*/pkgver=$VERSION/" PKGBUILD
sed -i "s/^pkgrel=.*/pkgrel=$RELEASE/" PKGBUILD

echo "📥 Updating checksums..."
updpkgsums

echo "📝 Generating .SRCINFO..."
makepkg --printsrcinfo > .SRCINFO

echo "📨 Pushing to AUR..."
git clone "$AUR_REPO" aur-repo
cp PKGBUILD .SRCINFO aur-repo/
cd aur-repo
git add PKGBUILD .SRCINFO
git commit -m "Update to v$VERSION"
git push origin master

echo "✅ AUR successfully updated to v$VERSION!"

rm -rf "$TEMP_DIR"
