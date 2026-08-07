# ActOne Agent Instructions

## Project Overview

ActOne is a cross-platform screenplay editor for Windows and Linux. It uses:

- React 19 and TypeScript
- Material UI 9
- CodeMirror 6 for Fountain editing
- Tauri v2 with a Rust backend
- Vite 7 for frontend builds
- Vitest 4 with jsdom for frontend tests

All code must work in Windows WebView2 and Linux webkitgtk. Do not add platform-specific behavior without a capability-based cross-platform alternative and tests.

## Source of Truth

- Read the relevant files in `docs/` before changing architecture or public behavior.
- Treat current source code as authoritative when documentation, TODO files, or generated output disagree.
- Document every added, removed, or behaviorally changed feature in the relevant feature, developer, API, and help documentation.
- Do not document planned behavior as implemented behavior. Put unfinished work in `todo/` and label it as planned.
- Leave generated files, `dist/`, `node_modules/`, and `src-tauri/target/` out of source audits unless the task specifically concerns them.

## Directory Map

```text
src/
  App.tsx                         Main editor root and global event wiring
  main.tsx                        Entry point for editor and standalone windows
  constants.ts                    Storage keys, Fountain rules, shared types
  fonts.css                       Bundled font declarations
  index.css                       Global styles, scrollbars, print, responsive rules
  test-setup.ts                   Vitest browser and Tauri-runtime setup

  context/
    AppProviders.tsx              UI, modal, file, snapshot, editor, cursor, parking providers
    FileContext.tsx               Files, tabs, save/open/close, scripts, bundle metadata
    EditorContext.tsx              CodeMirror view and editor operations
    CursorContext.tsx              Active line and selected-scene state
    UIContext.tsx                  Preferences, panes, AI status, translation state
    ThemeContext.tsx               Theme state and MUI theme provider
    SprintContext.tsx              Writing sprint state and history
    ParkingContext.tsx             Per-script parked snippets
    SnapshotContext.tsx            Snapshot settings and snapshot operations
    CustomModalContext.tsx         Promise-based confirm and prompt dialogs

  hooks/
    useAIChat.ts                   Muse sessions, streaming, tool-loop execution
    usePromptConfig.ts             Reactive provider configuration and model lookup
    useKeyboardShortcuts.ts        Global keyboard shortcuts
    useNativeAppBehavior.ts        Drag/drop, native window and browser behavior
    useModalWindows.ts              Standalone Tauri window lifecycle
    useModals.ts                   In-window modal state
    useTourCoordinator.ts          Tutorial coordination
    useTourListener.ts             Tutorial event handling
    useStoreUpdateCheck.ts         Store update checks

  components/
    FountainEditor.tsx             CodeMirror editor shell and editor actions
    MusePanel.tsx                  Muse chat pane
    SettingsWindow.tsx             Standalone settings window
    HelpWindow.tsx                 Standalone help window
    XrayWindow.tsx                 X-Ray screenplay analysis window
    ThemeManagerWindow.tsx         Custom theme window
    TutorialsWindow.tsx            Tutorial launcher/window
    WelcomeScreen.tsx              Welcome and recent-file screen
    ModalManager.tsx               In-window modal coordination
    CommandPalette.tsx             Fuzzy command palette
    ExportModal.tsx                Export controls
    OutlineView.tsx                Scene and section outline
    ScriptsView.tsx                Multi-script bundle management
    SearchPanel.tsx                Search and replace
    TodoView.tsx                   Per-script todos
    MarkerView.tsx                 Fountain line markers
    SnapshotsPanel.tsx             Snapshot list and actions
    SidebarViews.tsx               Sidebar tab routing
    components/ai/                 Muse composer, messages, and Fountain blocks
    components/layout/             MainLayout, Workspace, HeaderBar, ActivityBar, StatusBar

  editor/
    useCodeMirror.ts               CodeMirror lifecycle and state retention
    fountainSyntax.ts              Fountain decorations and line classification
    inlineAutocomplete.ts          Character, transition, and Fountain suggestions
    emptyLineSelection.ts          Blank-line selection behavior
    rephraseState.ts               Rephrase-range decorations
    formatUtils.ts                 Inline Fountain formatting helpers
    cursorScroll.ts                Cursor and typewriter scrolling

  parser/
    FountainParser.ts              Frontend Fountain parser and document model

  lib/
    aiProviders.ts                 OpenAI-compatible and Ollama providers
    aiTools.ts                     Muse tool declarations and execution handlers

  utils/
    actone.ts                      .actone archive pack/unpack and migrations
    asyncParser.ts                 Parser worker bridge
    perScriptSettings.ts           Per-script metadata access and migration
    sceneIndexer.ts                Structured screenplay index for Muse and analysis
    text.ts                        Text and export helpers
    errorReport.ts                 Error capture and reporting
    window.ts                      Safe Tauri window lookup

src-tauri/
  src/lib.rs                       Tauri commands, setup, lifecycle, and IPC registration
  src/ollama.rs                    Ollama health, model, streaming, and cancellation commands
  src/app_prefs.rs                 Application preference persistence
  src/font_cache.rs                System font and script detection
  src/snapshots.rs                 Snapshot storage and retention
  src/structures.rs                Story structure templates
  src/pdf/                         Fountain parsing and PDF/FDX/FadeIn export
  capabilities/default.json       Window and plugin permissions
  tauri.conf.json                 Window, CSP, bundle, and file association configuration
```

## React and TypeScript Conventions

- Use named exports and the existing relative import style.
- Prefer `interface` for object shapes and `type` for unions.
- Keep feature logic in dedicated modules rather than adding unrelated behavior to the parser or layout shell.
- Keep icons in `src/components/Icons.tsx` and follow the existing icon factory.
- Keep CSS in `src/index.css`, `src/fonts.css`, or the existing AI stylesheet. Use MUI `sx` for component-local styling.
- Use bundled fonts declared in `fonts.css`; do not add OS-dependent font fallback chains.
- Add comments only when naming and structure cannot make non-obvious logic clear.
- Use `useRef` for values that must survive native event sequences or asynchronous callbacks.
- Do not add `useMemo` or `useCallback` by default. Follow the patterns already used by the surrounding feature.

## Muse Implementation Contract

Muse is currently implemented with a JSON/text tool protocol. The active implementation is in:

- `src/hooks/useAIChat.ts`
- `src/hooks/usePromptConfig.ts`
- `src/lib/aiProviders.ts`
- `src/lib/aiTools.ts`
- `src/components/MusePanel.tsx`
- `src/components/ai/AIChatComposer.tsx`
- `src/components/ai/AIChatMessage.tsx`
- `src/components/ai/FountainBlock.tsx`

Current provider behavior:

- OpenAI-compatible endpoints use streamed SSE and are used as configured. ActOne does not append `/chat/completions`.
- Ollama uses the Tauri Rust proxy in desktop mode and `/api/chat` in browser development mode.
- Ollama models are loaded from `/api/tags` or the Rust `ollama_list_models` command.
- Provider configuration is read reactively from localStorage through `usePromptConfig()`.

Current Muse tools include screenplay reads and analysis, scene drafting, scene tagging, todos, parking notes, character profiles, and opening X-Ray. `replace_scene` creates a pending review card; other mutating tools currently apply through the supplied settings/editor callbacks. Do not describe this as an approval-safe agent system until that behavior changes.

The current chat composer does not implement `@write-scene`, `@q`, `@lookup`, or `@synonyms` command autocomplete. Do not add those names to new documentation unless the feature is implemented.

When changing Muse:

- Keep one tool protocol. Do not introduce a second XML action protocol beside the existing parser.
- Validate model-generated tool names and arguments before execution.
- Treat screenplay text, notes, and model output as untrusted input.
- Keep read-only tools separate from mutation tools.
- Preserve per-script settings through `perScriptSettings.ts`.
- Use stable file/script/scene context and reject stale async mutations.
- Bound history, tool calls, response sizes, and request duration.
- Keep provider failures and cancellation from corrupting chat sessions.
- Document provider data transmission and persistence behavior.

## Cross-Platform Engineering

### Native Browser Interfaces

React synthetic events can be unreliable for `DataTransfer`, `File`, `clipboardData`, and related native interfaces in WebView2. Use the underlying native event:

```tsx
const nativeEvent = e.nativeEvent;
const dataTransfer = nativeEvent.dataTransfer;
dataTransfer?.setData("text/plain", id);
```

### Tauri API Safety

The app runs in browser development and in Tauri. Tauri calls must not crash browser mode or tests. Guard capability-dependent code with:

```ts
const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
```

Wrap dynamic imports and calls in `try/catch`. Use `getTauriWindow()` when a window handle is needed. Do not use a truthiness check on `window.__TAURI_INTERNALS__`.

### Tauri Detection in Tests

`src/test-setup.ts` deletes the Tauri marker:

```ts
```

Keep browser-mode tests outside the Tauri runtime unless the test explicitly mocks the capability.

### Paths

- Split frontend paths with `[/\\]`.
- Normalize frontend constructed paths with forward slashes only when a string path is required.
- In Rust, use `Path` and `PathBuf`, never manual path concatenation.
- Use `to_string_lossy()` when returning a Rust path to the frontend.
- Sanitize both Windows and POSIX separators, control characters, reserved names, and trailing spaces/dots when creating filenames.

### Line Endings

- Normalize `\r\n` to `\n` immediately after every text file read.
- Use `\r?\n` when splitting external text.
- Test both CRLF and LF input.

### Keyboard Events

- Use `e.key`, never `keyCode` or `which`.
- Treat `e.ctrlKey || e.metaKey` as the cross-platform command modifier.
- Check `e.code` for layout-sensitive keys such as Backslash.
- Test keyboard helpers with both modifier options where appropriate.

### Native Event Sequences

Handle the complete pointer, drag, drop, clipboard, or keyboard event sequence. Apply the required `preventDefault()`, `stopPropagation()`, pointer capture, and release behavior at the correct event.

For state that must survive between related native events, store it in both React state for rendering and a ref for the event sequence.

### Platform Capabilities

Do not branch on `navigator.platform`, user-agent strings, or `process.platform`. Branch on capabilities such as Tauri availability, available APIs, or feature support.

### Rust Backend

- Use `PathBuf` and `Path` for all file operations.
- Use `#[cfg(target_os = "...")]` only for genuinely platform-specific behavior.
- Keep the `windows_subsystem = "windows"` release attribute.
- Keep the `[lib] name = "actone_lib"` Cargo workaround.
- Validate command input, paths, URLs, archive contents, and resource sizes.
- Keep Tauri capabilities least-privilege and do not expose arbitrary filesystem or network access to frontend features.

## Testing and Verification

Frontend commands:

```bash
npm test
npm run typecheck
npm run lint
npm run format:check
npm run build
```

Rust commands:

```bash
cargo test --manifest-path src-tauri/Cargo.toml --locked
cargo fmt --manifest-path src-tauri/Cargo.toml --check
```

Before release, run the Tauri build on both Windows and Linux. Test file paths, CRLF normalization, file associations, window creation, archive save/reload, PDF export, Ollama streaming, and cancellation on both WebView2 and webkitgtk.

Test files are co-located as `*.test.ts` or `*.test.tsx`. Use Testing Library and `renderHook` for React behavior. High-risk tests must cover async races, stale editor ranges, multi-script metadata, provider failures, cancellation, and persistence.

## Documentation Checklist

For every user-visible or API change, update the applicable files:

- `docs/features/` for user-facing feature behavior
- `docs/developer-guide/` for architecture and implementation details
- `docs/api-reference/` for exported hooks, contexts, formats, or commands
- `src/data/helpArticles.tsx` for in-app help
- `CHANGELOG.md` for released behavior
- `PRIVACY.md` when data storage, transmission, diagnostics, or third-party services change

Verify file paths, component names, provider counts, command names, storage keys, and article IDs against source before finishing.

## Communication Style

Explain the user-visible behavior first, then the technical details. Include file paths and line references for code-specific explanations. Be direct and do not use analogies.

## Cross-Agent Compatibility

Other agents may use their own configuration files. Those files should instruct agents to read this `AGENTS.md` before modifying the repository.
