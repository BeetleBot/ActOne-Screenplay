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
4. `repack-appimage.sh` extracts Tauri's image, replaces `.DirIcon` with a regular 256×256 PNG, and grants all users read/directory-traversal permissions (`a+rX`) before repacking with checksum-pinned appimagetool. This repairs the absolute link into the build runner's directory emitted by the bundler and restrictive extracted directory modes. `APPIMAGETOOL` can specify a local tool; otherwise the script downloads it and checks its SHA-256. Update the URL and digest together when upgrading the tool.
5. `verify-appimage.sh` checks the exact repacked artifact. `verify-appdir.py` validates all four required AppDir root entries: executable `AppRun`, PNG `.DirIcon`, exactly one desktop file, and a root icon matching its `Icon` entry. Required links must resolve inside the AppDir. It then requires executable `WebKitNetworkProcess` and `WebKitWebProcess`, the injected bundle, and resolvable helper dependencies. Dependency resolution on the build host does not guarantee compatibility with every distribution.
6. CI sets `APPIMAGE_SMOKE_TEST=1` to run `smoke-appimage.sh` under Xvfb. It uses temporary settings, requires a visible ActOne window and a surviving process after at least 11 seconds, and fails before release upload. It disables DMABUF rendering for the virtual display, without disabling WebKit sandboxing.
7. Output: `ActOne-Screenplay-x86_64-<version>.AppImage` in `Release/artifacts/`. Build release artifacts on Ubuntu 22.04 for the existing glibc baseline; bundling on a newer host can raise the minimum supported glibc version.

Run packaging regression checks with `npm test -- src/appimagePackaging.test.ts`. To inspect an existing artifact, run `bash Release/appimage/verify-appimage.sh /path/to/app.AppImage`. For a startup test, install Xvfb and xdotool, then prefix that command with `APPIMAGE_SMOKE_TEST=1`.

**Flatpak Bundle (`flatpak/ink.iyal.actone.yml`)**:

1. Built in CI via `flatpak-builder` container (`gnome-48` platform)
2. Packages metadata, icons, MIME database, and sandboxed binary
3. Generates offline single-file bundle: `ActOne-Screenplay-x86_64-<version>.flatpak`
4. Installer script: `scripts/install-flatpak.sh` dynamically queries GitHub releases API (with redirect fallback), downloads the latest `.flatpak` bundle, and installs or updates `ink.iyal.actone` for the current user (`flatpak install --user --or-update -y`).

### Signed Flatpak repository on Cloudflare R2

The final `publish-flatpak-repository` job in **`build-linux.yml`** waits for `package-flatpak`, downloads that run's `ActOne-Screenplay-Flatpak-x86_64` artifact, and publishes it to the `actone-flatpak` R2 bucket. There is no separate publishing workflow. The standalone `build-flatpak.yml` workflow continues to produce downloadable bundles only.

Repository secrets:

| Name | Value |
|------|-------|
| `R2_ACCESS_KEY_ID` | R2 S3 access key, scoped to the publishing bucket |
| `R2_SECRET_ACCESS_KEY` | Corresponding S3 secret |
| `FLATPAK_GPG_PRIVATE_KEY` | Armored, passphrase-protected private signing key |
| `FLATPAK_GPG_PASSPHRASE` | Signing key passphrase |

`scripts/sign-flatpak-repository.sh` imports the key into a temporary GnuPG home, presets its passphrase in gpg-agent, imports and signs the release commit, signs the AppStream branches and repository summary, and exports only the public key. It preserves the bundle's `master` branch and requires the `ink.iyal.actone/x86_64` application identity. An isolated OSTree client verifies the signed commit and summary before upload. Run `python3 scripts/test-flatpak-repository.py` to check this process offline using a disposable signing key and miniature Flatpak.

The R2 custom domain is `flatpak.iyal.ink`; repository files live under `/repo/`. Public installation files generated by `write-flatpak-reference.py` are `/actone.flatpakref`, `/actone.flatpakrepo`, `/actone.gpg`, and `/actone.png`. After the first successful publication, install with:

```bash
flatpak install --user https://flatpak.iyal.ink/actone.flatpakref
flatpak update --user ink.iyal.actone
```

The workflow restores the existing repository to preserve update history. It uploads objects before summaries and uses `Cache-Control: no-cache` to prevent stale metadata. It does not delete old remote objects; monitor R2 storage and operations as releases accumulate. Do not configure an age-based deletion lifecycle for repository objects: older objects can still belong to current app versions. The publication job is serialized, and it cleans up private signing material even on failure. Preserve an encrypted backup of the signing key and passphrase; changing the key requires a migration plan for installed clients. Installing an old standalone bundle does not automatically move its origin to the new remote.

### Discover listing and screenshots

Edit `flatpak/ink.iyal.actone.metainfo.xml` for the displayed publisher (`developer/name`, currently `iyal.ink`), summary, description, links, screenshot captions, and release notes. Keep the latest `releases/release` version and date aligned with `package.json` and `CHANGELOG.md`; Discover uses this metadata for the version shown on its app page.

Screenshot PNGs are tracked in `flatpak/screenshots/v0.5.7/`. Their public URLs are under `https://flatpak.iyal.ink/screenshots/v0.5.7/`, with actual pixel dimensions declared in MetaInfo. Exactly one screenshot is marked `type="default"`. The signing script stages these assets, and `build-linux.yml` uploads them to R2 before publishing repository metadata. For replacement screenshots, prefer a new versioned path so cached images remain consistent with their captions.

Listing-only corrections can be published under the existing app version by manually running `build-linux.yml` on `main` with that version. This rebuilds and replaces the GitHub release packages and refreshes the signed repository. It does not move the existing Git tag. Discover may cache listing data; refresh it with `flatpak update --user --appstream actone`, then restart Discover if needed. `python3 scripts/test-flatpak-repository.py` validates publisher/version alignment, screenshot URLs and image dimensions, and screenshot staging alongside its signing integration test.

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
