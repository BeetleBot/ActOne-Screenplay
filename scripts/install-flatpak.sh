#!/usr/bin/env bash
# ActOne Screenplay - Linux Flatpak Installer
# Fetches and installs the latest Flatpak release for the current user.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/Beetlebot/ActOne-Screenplay/main/scripts/install-flatpak.sh | bash

set -euo pipefail

# ANSI color codes (disabled if not interactive terminal)
if [ -t 1 ]; then
  BOLD="\033[1m"
  GREEN="\033[32m"
  BLUE="\033[34m"
  YELLOW="\033[33m"
  RED="\033[31m"
  RESET="\033[0m"
else
  BOLD=""
  GREEN=""
  BLUE=""
  YELLOW=""
  RED=""
  RESET=""
fi

log_info() {
  echo -e "${BLUE}${BOLD}==>${RESET} ${BOLD}$*${RESET}"
}

log_success() {
  echo -e "${GREEN}${BOLD}==>${RESET} ${GREEN}${BOLD}$*${RESET}"
}

log_warn() {
  echo -e "${YELLOW}${BOLD}WARNING:${RESET} $*"
}

log_error() {
  echo -e "${RED}${BOLD}ERROR:${RESET} $*" >&2
}

REPO="Beetlebot/ActOne-Screenplay"
APP_ID="ink.iyal.actone"

log_info "ActOne Screenplay Flatpak Installer"

# 1. Check for required commands
if ! command -v curl >/dev/null 2>&1; then
  log_error "'curl' is required but not installed. Please install curl and re-run."
  exit 1
fi

if ! command -v flatpak >/dev/null 2>&1; then
  log_error "'flatpak' is not installed."
  echo "Please install Flatpak for your Linux distribution:"
  echo "  - Ubuntu/Debian:  sudo apt install flatpak"
  echo "  - Fedora:         sudo dnf install flatpak"
  echo "  - Arch Linux:     sudo pacman -S flatpak"
  echo "  - openSUSE:       sudo zypper install flatpak"
  echo "For other distributions, visit: https://flatpak.org/setup/"
  exit 1
fi

# 2. Ensure Flathub repository exists for required GNOME runtimes
log_info "Ensuring Flathub remote is configured..."
flatpak remote-add --if-not-exists --user flathub https://dl.flathub.org/repo/flathub.flatpakrepo 2>/dev/null || true

# 3. Determine latest release and Flatpak asset URL
log_info "Fetching latest release information for ${REPO}..."

DOWNLOAD_URL=""
VERSION=""

# Method A: Try GitHub API
API_URL="https://api.github.com/repos/${REPO}/releases/latest"
API_RESPONSE=$(curl -fsSL -H "Accept: application/vnd.github.v3+json" "$API_URL" 2>/dev/null || true)

if [ -n "$API_RESPONSE" ]; then
  if command -v jq >/dev/null 2>&1; then
    DOWNLOAD_URL=$(echo "$API_RESPONSE" | jq -r '.assets[] | select(.name | endswith(".flatpak")) | .browser_download_url' 2>/dev/null | head -n 1)
    VERSION=$(echo "$API_RESPONSE" | jq -r '.tag_name // empty' 2>/dev/null | sed -E 's/^v//')
  else
    DOWNLOAD_URL=$(echo "$API_RESPONSE" | grep -o 'https://[^"]*ActOne-Screenplay[^"]*\.flatpak' | head -n 1 || true)
    if [ -z "$DOWNLOAD_URL" ]; then
      DOWNLOAD_URL=$(echo "$API_RESPONSE" | grep -o 'https://[^"]*\.flatpak' | head -n 1 || true)
    fi
    VERSION=$(echo "$API_RESPONSE" | grep -m1 '"tag_name":' | sed -E 's/.*"tag_name":\s*"v?([^"]+)".*/\1/' || true)
  fi
fi

# Method B: Fallback to GitHub releases redirect URL if API was rate-limited or unavailable
if [ -z "$DOWNLOAD_URL" ]; then
  REDIRECT_URL=$(curl -fsSLI -o /dev/null -w '%{url_effective}' "https://github.com/${REPO}/releases/latest" 2>/dev/null || true)
  TAG=$(basename "${REDIRECT_URL:-}")
  if [[ "$TAG" =~ ^v?[0-9] ]]; then
    VERSION="${TAG#v}"
    DOWNLOAD_URL="https://github.com/${REPO}/releases/download/${TAG}/ActOne-Screenplay-x86_64-${VERSION}.flatpak"
  fi
fi

if [ -z "$DOWNLOAD_URL" ]; then
  log_error "Could not find a .flatpak asset in the latest release of ${REPO}."
  exit 1
fi

log_info "Latest version: ${BOLD}${VERSION:-latest}${RESET}"
log_info "Download URL: ${DOWNLOAD_URL}"

# 4. Download Flatpak bundle to a temporary directory
TMP_DIR=$(mktemp -d -t actone-flatpak-XXXXXX)
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT INT TERM

FLATPAK_BUNDLE="$TMP_DIR/ActOne.flatpak"

log_info "Downloading ActOne Flatpak bundle..."
if [ -t 1 ]; then
  curl -fL --progress-bar "$DOWNLOAD_URL" -o "$FLATPAK_BUNDLE"
else
  curl -fsSL "$DOWNLOAD_URL" -o "$FLATPAK_BUNDLE"
fi

# 5. Install bundle for the current user
log_info "Installing ActOne via Flatpak..."
flatpak install --user --or-update -y "$FLATPAK_BUNDLE"

log_success "ActOne Screenplay ${VERSION:-} installed successfully!"
echo
echo -e "You can launch ActOne from your application menu or run:"
echo -e "  ${BOLD}flatpak run ${APP_ID}${RESET}"
echo
echo -e "To uninstall:"
echo -e "  ${BOLD}flatpak uninstall ${APP_ID}${RESET}"
