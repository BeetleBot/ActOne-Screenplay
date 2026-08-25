# ActOne Documentation

Welcome to the ActOne documentation. This site covers everything from architecture and development to feature usage and API references.

> **Design System:** The warm **Arc / Craft** visual language is authoritative in [`DESIGN.md`](../DESIGN.md) — 5 elevation levels, radius/shadow/motion tokens, and full shell/overlay/panel specifications (implemented in `src/index.css`, `src/constants.ts`, `src/theme/muiTheme.ts`).

---

## Developer Guide

Architecture, setup, and implementation details for developers working on ActOne.

### Getting Started

| Document | Description |
|----------|-------------|
| [Getting Started](developer-guide/01-getting-started.md) | Prerequisites, setup, dev server, build commands |
| [Architecture Overview](developer-guide/02-architecture.md) | High-level architecture, directory structure, multi-window design |

### Frontend

| Document | Description |
|----------|-------------|
| [Frontend Architecture](developer-guide/03-frontend.md) | Component tree, state management, import, spellcheck, and UI components |
| [Editor Integration](developer-guide/05-editor.md) | CodeMirror 6 setup, extensions, editor features |
| [Fountain Parser](developer-guide/06-fountain-parser.md) | Both frontend (TypeScript) and backend (Rust) parsers |
| [State Management](developer-guide/08-state-management.md) | All 7 React contexts, state, actions, persistence |
| [Theming System](developer-guide/11-theming.md) | 17 built-in themes, category+adaptive system, custom themes, color system, Craft design system (radii/shadows/motion) |

### Backend

| Document | Description |
|----------|-------------|
| [Rust Backend](developer-guide/04-backend.md) | Architecture, modules, current Tauri commands, spellcheck, and window state |
| [PDF Export Engine](developer-guide/07-pdf-export.md) | Page layout, font system, pagination algorithm, watermarks |

### Tauri API Reference

| Document | Description |
|----------|-------------|
| [Tauri API Overview](developer-guide/tauri-api/01-overview.md) | IPC, events, window management, capabilities |
| [File I/O Commands](developer-guide/tauri-api/02-file-commands.md) | Open/save/read/write/CLI commands |
| [Export Commands](developer-guide/tauri-api/03-export-commands.md) | PDF, FDX, FadeIn, CSV, Fountain export |
| [Theme & Prefs Commands](developer-guide/tauri-api/04-theme-prefs-commands.md) | Theme state, app preferences |
| [Font Commands](developer-guide/tauri-api/05-font-commands.md) | System fonts, script detection, font recommendations |
| [Snapshot Commands](developer-guide/tauri-api/06-snapshot-commands.md) | File versioning system |
| [Structure Commands](developer-guide/tauri-api/07-structure-commands.md) | Story structure templates |
| [Licensing Commands](developer-guide/tauri-api/08-licensing-commands.md) | Microsoft Store license verification |
| [Spellcheck Commands](developer-guide/tauri-api/09-spellcheck-commands.md) | Native spellcheck, dictionaries, and custom words |

### CodeMirror API Reference

| Document | Description |
|----------|-------------|
| [CM6 Integration Overview](developer-guide/codemirror-api/01-overview.md) | Extension architecture, compartments, dependencies |
| [useCodeMirror Hook](developer-guide/codemirror-api/02-useCodeMirror-hook.md) | Editor lifecycle, smart quotes, typewriter mode |
| [Fountain Syntax Extension](developer-guide/codemirror-api/03-fountain-syntax.md) | StateField, 25+ line types, decoration system |
| [Inline Autocomplete](developer-guide/codemirror-api/04-inline-autocomplete.md) | Ghost text, sources, interaction |
| [Empty Line Selection](developer-guide/codemirror-api/05-empty-line-selection.md) | ViewPlugin for blank line interaction |
| [Keyboard Shortcuts](developer-guide/codemirror-api/06-keyboard-shortcuts.md) | All custom keybindings and global shortcuts |

### Testing & Deployment

| Document | Description |
|----------|-------------|
| [Testing](developer-guide/09-testing.md) | Vitest setup, test patterns, Rust tests |
| [Build & Deploy](developer-guide/10-build-deploy.md) | Build process, Linux/Windows packaging, CI/CD |

### Reliability

| Document | Description |
|----------|-------------|
| [Error Reporting](features/22-error-reporting.md) | Automatic Discord crash reports, severity-based recovery, compact crash window |

---

## API Reference

Frontend API and data format documentation.

| Document | Description |
|----------|-------------|
| [Frontend Hooks](api-reference/01-frontend-hooks.md) | useKeyboardShortcuts, useNativeAppBehavior, useModals, useModalWindows, useAIChat, usePromptConfig |
| [Frontend Contexts](api-reference/02-frontend-contexts.md) | All 7 React context APIs with state and actions |
| [.actone Bundle Format](api-reference/03-actone-bundle.md) | File structure, pack/unpack API, legacy compat |
| [Fountain Syntax Reference](api-reference/04-fountain-syntax.md) | Complete Fountain markup reference with ActOne extensions |

---

## Feature Documentation

End-user documentation for every feature in ActOne.

| Document | Description |
|----------|-------------|
| [Editor](features/01-editor.md) | Core editing features, syntax highlighting, smart typing |
| [Autocomplete](features/02-autocomplete.md) | Ghost text suggestions for characters, transitions, etc. |
| [Sidebar Panels](features/03-sidebar.md) | 8 sidebar tabs (46px grouped dock, pill active) + Header pill tabs, Search/Muse floating panes |
| [Export](features/05-export.md) | PDF, FDX, FadeIn, Fountain, CSV export — pill nav + rounded modal |
| [Multi-Script Bundles](features/06-scripts.md) | Managing multiple scripts in .actone bundles (rounded cards, pill search) |
| [Parking](features/07-parking.md) | Temporary text storage (rounded cards) |
| [Sprint Tracking](features/08-sprint.md) | Countdown timer with presets, history & leaderboard (pill controls, 12px cards) |
| [Todos & Markers](features/09-todos-markers.md) | Task list and margin markers (rounded cards, pill filters) |
| [Character Management](features/10-characters.md) | Character list and gender tracking (X-Ray Characters mode) |
| [Snapshots](features/11-snapshots.md) | File versioning system (pill filters, two-tier cards, Browse… picker) |
| [Themes](features/12-themes.md) | Built-in and custom themes + Craft design system (radii/shadows) |
| [Command Palette](features/13-command-palette.md) | Fuzzy-search command launcher |
| [Structure Templates](features/14-structure-templates.md) | 8 story structure templates (rounded nav pills) |
| [Title Page Editor](features/15-title-page.md) | Title page metadata editing (pill tabs, 8px cards) |
| [X-Ray Analysis](features/17-xray.md) | Screenplay analysis dashboard (pill modes, transparent TitleBar) |
| [Settings](features/18-settings.md) | All configuration options — pill tabs, 8px cards, ambient removal |
| [Help Guide](features/19-help-guide.md) | 88 searchable articles across 10 categories (incl. Markdown Syntax) |
| [Interactive Tutorials](features/20-onboarding-tutorials.md) | User onboarding and Fountain writing tours |
| [Muse AI Assistant](features/21-muse.md) | AI screenwriting assistant — pill composer (v0.4.0+) |

---

## Quick Links

- **Source:** `src/` — React/TypeScript frontend (85+ files)
- **Backend:** `src-tauri/src/` — Rust backend (7 modules, 51 commands)
- **Build scripts:** `Release/` — Linux and Windows packaging
- **Config:** `package.json`, `vite.config.ts`, `tsconfig.json`, `tauri.conf.json`
