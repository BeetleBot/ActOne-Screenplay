# Build & Deployment

## Build Process

```bash
# Development
npm run dev           # Vite dev server (browser)
npm run tauri dev     # Tauri desktop + Vite

# Production
npm run tauri build   # Full build
```

The `prebuild` hook runs `sync-version.js`, which stamps the `package.json` version into `tauri.conf.json` and `Cargo.toml`.

The Tauri application identifier is `ink.iyal.actone`, matching the Flatpak application ID. Keep the Flatpak manifest, desktop filename, icon name, and MetaInfo ID aligned. Tauri's application data directory depends on this identifier; installations using the previous identifier may retain preferences and other app data in their previous directory. This change does not migrate that data automatically.

## Chunk Splitting (Vite config)

The production build splits vendor code:

| Chunk | Contents |
|-------|----------|
| `vendor-mui` | MUI, emotion, material-color-utilities |
| `vendor-codemirror` | All CodeMirror 6 packages |
| `vendor-react` | React, ReactDOM |
| `vendor-tauri` | Tauri API packages |
| `vendor-core` | All other node_modules |

## Linux Build

**`Release/linux/build-tarball.sh`** (170 lines):

1. Detects Linux distro (Ubuntu/Fedora/Arch)
2. Installs system dependencies (apt/dnf/pacman)
3. Installs Rust and Node.js if missing
4. Runs `npm ci` + `npm run tauri build`
5. Packages into tar.gz with:
   - Desktop entry file (`.desktop`)
   - Application icons
   - Install/uninstall scripts
6. Output: `ActOne-Linux-x64-<version>.tar.gz` in `Release/artifacts/`

**`Release/appimage/build-appimage.sh`**:

1. Builds the Tauri release binary, then calls `Release/appimage/package-appimage.sh`.
2. The packaging script runs `tauri bundle --bundles appimage` with `src-tauri/tauri.appimage.conf.json` to preserve custom MIME definitions and document icons. Both Linux GitHub Actions workflows use this same script after downloading the compiled binary and installing npm dependencies.
3. Tauri's bundler includes WebKit helper executables, the injected bundle, and its relocation-aware AppRun. Generic linuxdeploy GTK packaging alone omitted the helpers and crashed at startup; setting `WEBKIT_EXEC_PATH` is insufficient for production WebKit builds that disable developer mode.
4. `verify-appimage.sh` extracts the final artifact and requires executable `WebKitNetworkProcess` and `WebKitWebProcess`, the injected bundle, and resolvable helper dependencies. This checks resolution on the build host, not compatibility with every distribution.
5. CI sets `APPIMAGE_SMOKE_TEST=1` to run `smoke-appimage.sh` under Xvfb. It uses temporary settings, requires a visible ActOne window and a surviving process after at least 11 seconds, and fails before release upload. It disables DMABUF rendering for the virtual display, without disabling WebKit sandboxing.
6. Output: `ActOne-Screenplay-x86_64-<version>.AppImage` in `Release/artifacts/`. Build release artifacts on Ubuntu 22.04 for the existing glibc baseline; bundling on a newer host can raise the minimum supported glibc version.

Run packaging regression checks with `npm test -- src/appimagePackaging.test.ts`. To inspect an existing artifact, run `bash Release/appimage/verify-appimage.sh /path/to/app.AppImage`. For a startup test, install Xvfb and xdotool, then prefix that command with `APPIMAGE_SMOKE_TEST=1`.

**Flatpak Bundle (`flatpak/ink.iyal.actone.yml`)**:

1. Built in CI via `flatpak-builder` container (`gnome-48` platform)
2. Packages metadata, icons, MIME database, and sandboxed binary
3. Generates offline single-file bundle: `ActOne-Screenplay-x86_64-<version>.flatpak`
4. Installer script: `scripts/install-flatpak.sh` dynamically queries GitHub releases API (with redirect fallback), downloads the latest `.flatpak` bundle, and installs or updates `ink.iyal.actone` for the current user (`flatpak install --user --or-update -y`).

## Windows Build

**`Release/windows/build-msix.ps1`** (180 lines):

Supports three signing modes:
1. **Self-sign** (local testing) — generates self-signed cert
2. **PFX signing** — prompts for certificate path/password
3. **Skip signing** — unsigned MSIX

Build steps:
1. Reads version from `package.json`
2. Runs `npm run tauri build -- --no-bundle`
3. Creates MSIX layout with assets, icons, `AppxManifest.xml`
4. Stamps version into manifest
5. Runs `MakeAppx.exe` to create `.msix`
6. Signs the package (self-signed or Store-ready)
7. Outputs `.msix` to `Release/artifacts/` for Microsoft Store submission

## Bundle Targets

Configured in `tauri.conf.json`:

| Platform | Formats |
|----------|---------|
| Linux | `.deb`, `.rpm` |
| Windows | `.msi`, `.nsis` (.exe installer) |

## File Associations

| Extension | Description |
|-----------|-------------|
| `.actone` | ActOne Screenplay Bundle |
| `.fountain` | Fountain Screenplay |
| `.txt` | Plain text |
