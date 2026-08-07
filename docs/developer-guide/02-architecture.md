# Architecture Overview

ActOne is a cross-platform desktop screenplay editor built with **Tauri v2**, **Rust**, **React 19**, and **TypeScript**. The editor uses **CodeMirror 6** for Fountain editing. PDF generation uses the Rust `krilla` and `cosmic-text` pipeline.

## High-Level Architecture

```text
Tauri desktop shell
  React frontend in one main WebView
    MUI interface
    CodeMirror 6 editor
    React Context state domains
    Fountain parser and parser worker
    Muse providers and tool loop
  Tauri IPC and events
    Rust file, export, snapshot, preference, font, update, and Ollama commands
  Rust backend
    PDF/FDX/FadeIn exporters
    Fountain parser for export
    font cache, app preferences, snapshots, structures, Ollama proxy
```

The frontend can run in a browser during development and tests. Native dialogs, filesystem operations, standalone windows, and the desktop Ollama proxy require Tauri.

## Directory Structure

```text
ActOneCode/
├── src/
│   ├── main.tsx                 Entry point for the editor and standalone windows
│   ├── App.tsx                  Main editor root and global event wiring
│   ├── components/              Feature and layout components
│   │   ├── layout/              MainLayout, Workspace, HeaderBar, ActivityBar, StatusBar
│   │   ├── ai/                  Muse composer, messages, and Fountain blocks
│   │   ├── FountainEditor.tsx   CodeMirror editor shell
│   │   └── ...
│   ├── context/                 React Context providers and domain actions
│   ├── editor/                  CodeMirror extensions and editor helpers
│   ├── hooks/                   Application hooks, Muse hooks, and window hooks
│   ├── lib/                     AI providers and Muse tool handlers
│   ├── parser/                  Frontend Fountain parser
│   ├── theme/                   Theme and application preference engines
│   ├── utils/                   Archives, parser bridge, indexing, text, and diagnostics
│   ├── workers/                 Parser worker entry point
│   ├── data/                    In-app help articles and static data
│   └── types/                   Shared TypeScript types
├── src-tauri/
│   ├── src/lib.rs               Tauri setup and IPC command registration
│   ├── src/ollama.rs            Ollama health, model, streaming, and cancellation proxy
│   ├── src/pdf/                 Fountain parsing and export pipeline
│   ├── src/app_prefs.rs         Application preference persistence
│   ├── src/font_cache.rs        Font detection and script recommendations
│   ├── src/snapshots.rs         Snapshot storage and retention
│   └── src/structures.rs        Story structure templates
├── docs/                        Feature, developer, and API documentation
├── todo/                        Planned work and design reviews
├── Release/                     Linux and Windows packaging scripts
├── package.json                 Frontend scripts and dependencies
├── vite.config.ts               Vite configuration
└── tsconfig.json                Frontend TypeScript configuration
```

## Frontend Entry Points and Windows

`src/main.tsx` selects the root from the `modal` query parameter:

| Query | Component | Purpose |
|---|---|---|
| none | `App` | Main editor window |
| `?modal=settings` | `SettingsWindow` | General, editor, snapshot, and Muse settings |
| `?modal=help` | `HelpWindow` | Searchable in-app help guide |
| `?modal=theme-manager` | `ThemeManagerWindow` | Custom theme editor |
| `?modal=xray` | `XrayWindow` | Screenplay analysis and character profiles |
| `?modal=tutorials` | `TutorialsWindow` | Interactive tutorial launcher |
| `?modal=crash` | `CrashScreen` | Crash recovery and error report window |

Standalone windows use a reduced `UIProvider` and `ThemeProvider` wrapper. The main editor uses the complete provider tree.

## Main Editor Provider Tree

The main editor is composed as follows:

```text
ErrorBoundary
  AppProviders
    UIProvider
      CustomModalProvider
        FileProvider
          SnapshotProvider
            EditorProvider
              CursorProvider
                ParkingProvider
  ThemeProvider
    SprintProvider
      AppInner
        MainLayout
```

`AppProviders` contains seven providers. `ThemeProvider` and `SprintProvider` wrap `AppInner` outside `AppProviders` because the theme provider supplies MUI theme state and the sprint provider is used by the editor shell.

## Main Editor Layout

```text
App
  ErrorBoundary
    AppProviders
      ThemeProvider
        SprintProvider
          AppInner
            MainLayout
              HeaderBar
              ActivityBar
              Workspace
                SidebarViews
                FountainEditor
                SearchPanel or AmbientPanel
              StatusBar
            ModalManager
              CommandPalette
              ExportModal
              StructureImportModal
              TitlePageEditorModal
```

The right pane can display search, ambient audio, or Muse. Muse is provided by `MusePanel` in `Workspace` and is not a separate Tauri window.

## State Domains

React Context is the application state mechanism. The domains are:

- `FileContext`: open tabs, paths, Fountain text, parsed documents, save state, bundles, and scripts.
- `EditorContext`: CodeMirror view registration, editor scrolling, line edits, scene replacement, and scene reordering.
- `CursorContext`: active line and selected scene state.
- `UIContext`: preferences, active panes, AI status, and translation state.
- `ThemeContext`: theme selection, light/dark mode, and custom themes.
- `SprintContext`: active writing sprints and sprint history.
- `ParkingContext`: per-script parked snippets.
- `SnapshotContext`: snapshot settings, lists, creation, deletion, and opening snapshots.
- `CustomModalContext`: promise-based confirm and prompt dialogs.

See `docs/developer-guide/08-state-management.md` and `docs/api-reference/02-frontend-contexts.md` for current public contracts.

## Parsing and Editor State

CodeMirror owns the live editor view. `useCodeMirror.ts` retains editor state per open file and script, while `FileContext` maintains the raw text and parsed `FountainDocument` used by the rest of the UI.

Text changes are normalized to LF. Parsing is debounced and uses `src/utils/asyncParser.ts` and `src/workers/parserWorker.ts` for the asynchronous path. The frontend parser classifies Fountain lines and supplies title-page, scene, character, dialogue, marker, section, synopsis, and formatting information.

`sceneIndexer.ts` builds a structured scene and character index for Muse and analysis views. Scene IDs in the current Muse tool protocol are ordinal scene indexes, not guaranteed to equal printed Fountain scene numbers.

## Muse Architecture

Muse has four layers:

1. `usePromptConfig()` reads provider configuration and model preferences.
2. `aiProviders.ts` streams OpenAI-compatible SSE or Ollama responses.
3. `useAIChat.ts` manages file-scoped sessions, prompt context, streaming, and the tool loop.
4. `aiTools.ts` declares and executes screenplay read, analysis, drafting, metadata, and X-Ray tools.

The current tool protocol is JSON/text based. It is not the XML system described by the older `todo/ActOneAgenticAI.md` plan. `replace_scene` creates a pending review card; other current mutating tools may apply immediately through settings or editor callbacks.

Muse context can include the screenplay index, active scene lines, todos, parking notes, and character profiles. Provider selection determines whether that content leaves the device. See `docs/features/21-muse.md` and `PRIVACY.md`.

## Tauri Backend Boundary

The Rust backend exposes commands for:

- File and bundle I/O
- PDF, Fountain, CSV, FDX, and FadeIn export
- Font discovery and script detection
- Theme and application preferences
- Snapshots
- Story structures
- Store update and licensing operations
- System diagnostics and crash-report handling
- Ollama health checks, model discovery, streaming, and cancellation

Commands are registered in `src-tauri/src/lib.rs`. Capabilities are declared in `src-tauri/capabilities/default.json`. Browser-mode code must guard Tauri-only APIs.

## Multi-Window Communication

Standalone windows communicate through Tauri events and shared local storage. Important events include:

- `theme:state-changed`
- `app-prefs:changed`
- `settings-changed`
- `file-opened`
- `editor:ready`
- `modal:xray:init`
- `ollama-chat-chunk`

Events are coordination mechanisms, not authorization. Payloads must be treated as untrusted input and validated before changing application or document state.
