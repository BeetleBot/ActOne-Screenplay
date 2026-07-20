# Getting Started

## Prerequisites

- **Node.js** >= 18
- **Rust** >= 1.80 (edition 2024)
- **System dependencies** for Tauri v2 (see [Tauri docs](https://v2.tauri.app/start/prerequisites/))

## Setup

```bash
# Clone the repository
git clone <repo-url>
cd ActOneCode

# Install frontend dependencies
npm ci

# Run the development server
npm run dev
```

This starts a Vite dev server on `http://127.0.0.1:1420`. The app runs in the browser during development, but file operations (open/save dialogs, PDF export) require the Tauri backend.

## Running in Tauri

```bash
npm run tauri dev
```

This launches the Tauri desktop window with both the Vite frontend and the Rust backend.

## Building for Production

```bash
npm run tauri build
```

### Platform-Specific Builds

**Linux:**
```bash
# Build tarball
bash Release/linux/build-tarball.sh
```

**Windows:**
```cmd
:: Build MSIX package
Release\windows\build.bat
```

## Key Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Vite dev server |
| `npm run test` | Run Vitest tests |
| `npm run test:watch` | Vitest watch mode |
| `npm run build` | tsc + vite build |
| `npm run lint` | ESLint check |
| `npm run typecheck` | TypeScript type check |
| `npm run format` | Prettier formatting |
| `npm run tauri dev` | Tauri + Vite dev |
| `npm run tauri build` | Production build |

## Version Synchronization

The `predev` / `prebuild` scripts run `sync-version.js`, which writes the `version` from `package.json` into both `src-tauri/tauri.conf.json` and `src-tauri/Cargo.toml`.
