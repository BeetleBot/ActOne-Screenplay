# Linux Release Build — ActOne

Builds a `.tar.gz` tarball for Linux distribution.

Run this inside **WSL2** (Ubuntu recommended) or a native Linux machine.

## Prerequisites

- **WSL2** with Ubuntu (install: `wsl --install -d Ubuntu`)
- Inside WSL, you just need internet — the script installs everything.

## Quick Start

Inside WSL terminal:

```bash
cd /mnt/c/Users/nkr/Documents/Projects/ActOne\ Family/ActOneCode
chmod +x Release/linux/build-tarball.sh
./Release/linux/build-tarball.sh
```

This will:
1. Install system deps (webkit2gtk, Rust, Node.js)
2. Build the Tauri app
3. Package a `.tar.gz` with binary, icons, desktop file, and install scripts
4. Output → `Release/artifacts/ActOne-Linux-x64-<version>.tar.gz`

## Output

```
Release/artifacts/
  ActOne-Linux-x64-<version>.tar.gz
```

Inside the tarball:
```
usr/share/actone/actone              → Main binary
usr/share/actone/icon_app/           → App icons (16x16 → 512x512)
usr/share/applications/actone.desktop → Desktop entry
usr/share/mime/packages/actone.xml   → MIME type registration
install.sh                            → Installs to /usr/local
uninstall.sh                          → Removes from /usr/local
```

## User Installation

```bash
tar -xzf ActOne-Linux-x64-<version>.tar.gz
sudo ./install.sh
```

This symlinks the binary, registers MIME types (`.fountain`, `.actone`, `.txt`), and installs the desktop entry.
