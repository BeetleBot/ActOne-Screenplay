# MSIX Issue & Unified Build Workflow Plan

## The Issue

ActOne v0.1.16 was uploaded to the Microsoft Store as an MSIX package, built by
the `release-windows-msix.yml` GitHub Actions workflow. When installed from the
Store, the app fails to load — it attempts to connect to `127.0.0.1` and never
renders the UI.

The same release binary works correctly when installed via the NSIS installer
(standalone `.exe`). This confirms the problem is not the binary itself, but the
**MSIX runtime environment**.

## Root Cause

Tauri v2 serves embedded frontend assets via a custom protocol
(`http://tauri.localhost/`) registered at runtime. In the MSIX sandbox, this
protocol registration is blocked by Windows App Container restrictions, even
with the `runFullTrust` capability declared in the manifest. The WebView2 cannot
reach the app's assets and fails to connect.

The NSIS installer works because the app runs as a regular desktop process with
no sandbox — the custom protocol registers normally.

## Fix: Option C — Microsoft WinApp CLI

Instead of manually packaging the MSIX with `MakeAppx.exe`, we use Microsoft's
official [WinAppCli](https://github.com/microsoft/WinAppCli) tool. WinApp
creates Store-compliant MSIX packages with proper package identity, capability
declarations, and sandbox configuration — ensuring the Tauri runtime can serve
assets correctly within the sandbox.

### Changes

- Add `winapp/Package.appxmanifest` — MSIX manifest (replaces the manual
  `packaging/msix/AppxManifest.xml`)
- Add `winapp/Assets/` — icons for MSIX (same source: `src-tauri/icons/`)
- Keep `packaging/msix/AppxManifest.xml` for reference, or remove it if
  redundant

## Unified Build Workflow

Currently there are two separate Windows release workflows:
`release-windows-msix.yml` and `release-windows-nsis.yml`. Both build the app
independently — wasteful and risks drift.

The new `release-windows-store.yml` replaces both with a single pipeline:

```
windows-latest job:
  1. npm run tauri build -- --no-bundle    → release binary
  2. npm run tauri bundle -- --bundles nsis → NSIS installer (same binary)
  3. winapp pack ...                        → MSIX package (same binary)
  4. Upload both NSIS and MSIX as artifacts
```

Linux workflows (`release-linux-packages.yml`, `release-linux-tarball.yml`)
remain unchanged — cross-platform builds cannot share binaries.

## Pipeline Diagram

```
Git tag push / workflow_dispatch
                │
      ┌─────────┴─────────┐
      ▼                   ▼
windows-latest        ubuntu-latest
      │                   │
      │                   ├── .deb
      ├── .exe (NSIS)     ├── .rpm
      ├── .msix           └── .tar.gz
      │
      └── All from ONE binary
```

## Files to Delete

| File | Reason |
|---|---|
| `.github/workflows/release-windows-msix.yml` | Replaced by unified workflow |
| `.github/workflows/release-windows-nsis.yml` | Replaced by unified workflow |
| `packaging/msix/build-msix.ps1` | Local script, CI no longer uses it |
| `packaging/msix/generate_assets.ps1` | Local script, CI no longer uses it |
| `packaging/msix/generate_assets.sh` | Local script, CI no longer uses it |
| `tarball/` | Pre-built tarball directory — CI builds fresh |
| `.vs/` | Visual Studio user files |
| `libtest_inherent_impl.rlib` | Accidental Rust build artifact |
| `website/` | Standalone website, own repo |
| `TestFiles/` | Personal test data |
| `docs/` | Outdated architecture planning docs |
| `PLAN-markdown-support.md` | Planning doc |
| `PLANNING_BOARD_REWRITE_PLAN.md` | Planning doc |
| `SCRIPTS_FEATURE_PLAN.md` | Planning doc |
| `TUTORIAL_TOPICS.md` | Planning doc |
| `mobile_implementation_plan.md` | Planning doc |
| `Export Logic.md` | Planning doc |
| `Cloudgdrive.md` | Planning doc |
| `SHORTCUTS.md` | Planning doc (shortcuts are in-app) |
| `assets/Logo/` | Duplicate logo files (can be regenerated) |

**Keep:**
- `packaging/msix/AppxManifest.xml` — keep for reference, may be useful
- `todo.md` — per your request
- `assets/linux/` — used by Linux tarball CI
- `CHANGELOG.md`, `LICENSE`, `PRIVACY.md`, `MICROSOFT_STORE_LICENSING.md`
- `sync-version.js` — used in build scripts
