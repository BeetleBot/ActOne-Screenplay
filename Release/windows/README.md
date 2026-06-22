# Windows Release Build — ActOne

Builds MSIX package + portable executable for Windows Store submission.

## Prerequisites

- **Rust** — `rustup` + `x86_64-pc-windows-msvc` target
- **Node.js** — LTS version (18+)
- **Windows SDK** — comes with Visual Studio Build Tools or Visual Studio
- **npm dependencies** — already installed (`npm ci` from project root)

## Quick Start

```powershell
.\Release\windows\build-msix.ps1 -SelfSign
```

This will:
1. Build the Tauri app
2. Create an MSIX package signed with a self-signed cert (for local testing)
3. Copy a portable `actone.exe`
4. All output → `Release/artifacts/`

## Signing Options

| Flag | What it does |
|---|---|
| `-SelfSign` | Creates a matching cert on this machine, signs the MSIX. Good for local testing. |
| `-SkipSigning` | Produces unsigned MSIX. The Store signs it during ingestion. |
| `-PfxPath "file.pfx" -PfxPassword "xxx"` | Signs with your real code signing certificate. Required for Store submission. |

## Examples

```powershell
# Local testing (quick)
.\Release\windows\build-msix.ps1 -SelfSign

# Unsigned for Store upload
.\Release\windows\build-msix.ps1 -SkipSigning

# Signed with real cert
.\Release\windows\build-msix.ps1 -PfxPath "C:\certs\actone.pfx" -PfxPassword $pass
```

## Output

Everything goes to `Release/artifacts/`:

```
Release/artifacts/
  ActOne-<version>.msix              → Windows Store upload
  ActOne-Portable-x64-<version>.exe  → Standalone binary
```

## What Was Fixed

The MSIX was failing with `127.0.0.1 refused to connect` because the AppxManifest was missing network capabilities. WebView2's custom protocol handler needs these even with `runFullTrust`:

- `internetClient`
- `internetClientServer`
- `privateNetworkClientServer`

These are declared in `Release/windows/AppxManifest.xml`.
