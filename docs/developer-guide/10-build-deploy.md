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
6. Signs the package
7. Copies portable `.exe` to `Release/artifacts/`

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

## CI/CD

No CI/CD configuration is present in the repository. Builds are manual.
