#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SOURCE="$REPO_ROOT/assets/icons/FountTUI_Logo.png"
OUT_DIR="${1:-$SCRIPT_DIR/Assets}"

mkdir -p "$OUT_DIR"

declare -A SIZES=(
  ["StoreLogo"]=50
  ["Square44x44Logo"]=44
  ["Square150x150Logo"]=150
  ["Wide310x150Logo"]=310x150
  ["LargeSquareLogo"]=310
)

for name in "${!SIZES[@]}"; do
  size="${SIZES[$name]}"
  if [[ "$size" == *x* ]]; then
    w="${size%%x*}"
    h="${size##*x}"
    magick "$SOURCE" -resize "${w}x${h}" -gravity center -background "#1a1b26" -extent "${w}x${h}" "$OUT_DIR/${name}.png"
  else
    magick "$SOURCE" -resize "${size}x${size}" "$OUT_DIR/${name}.png"
  fi
  echo "Generated $OUT_DIR/${name}.png (${size})"
done

echo "All MSIX assets generated in $OUT_DIR"
