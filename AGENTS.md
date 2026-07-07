# ActOne — Agent Instructions

## Project Overview

ActOne is a cross-platform (Windows + Linux) screenplay editor built with:
- **React 19** + **TypeScript** + **Material UI 9**
- **Tauri v2** (Rust backend) — targets Windows (NSIS), Linux (deb/rpm)

**IMPORTANT: This app targets both Windows and Linux. Any code you write must work on both platforms.** Do not use platform-specific APIs, file paths, or behaviors without providing cross-platform alternatives. Test your assumptions against both WebView2 (Windows) and webkitgtk (Linux).
- **CodeMirror 6** — screenplay text editor with Fountain syntax highlighting
- **Vite 7** — build tool
- **Vitest 4** — test runner with jsdom environment

---

## Directory Map

```
src/
  App.tsx                    — Root component, wires global hooks + layout
  main.tsx                   — Entry point
  fonts.css                  — @font-face declarations
  index.css                  — Globals, scrollbars, print, responsive breakpoints
  test-setup.ts              — Vitest setup (mocks __TAURI_INTERNALS__)

  context/
    FileContext.tsx           — File open/save/close, CRLF normalization, path parsing
    EditorContext.tsx         — CodeMirror document state, block reordering
    UIContext.tsx             — View mode (editor/board), zoom, zen mode, fullscreen
    AppProviders.tsx          — Composes all context providers
    CustomModalContext.tsx     — confirm()-style modal dialogs
    SprintContext.tsx         — Sprint tracking feature
    ThemeContext.tsx           — Theme loading
    ParkingContext.tsx        — Parking feature

  hooks/
    useNativeAppBehavior.ts   — Global key/wheel/contextmenu/drop interception
    useKeyboardShortcuts.ts   — All keyboard shortcuts (Ctrl+N/S/O etc.)
    useModals.ts              — Modal visibility toggles

  components/
    FountainEditor.tsx        — CodeMirror 6 editor instance
    PlanningBoard.tsx         — Visual board view with drag-to-reorder cards
    OutlineView.tsx           — Sidebar outline tree with scene reordering
    ScriptsView.tsx           — Script bundle management
    SearchPanel.tsx           — Floating search/replace panel
    StatusBar.tsx             — Status bar with mode toggle + file stats
    HeaderBar.tsx             — Title bar with window controls
    Workspace.tsx             — Conditional render of editor vs planning board
    MainLayout.tsx            — Layout shell (sidebar, workspace, statusbar)
    ActivityBar.tsx           — Sidebar activity switcher
    Icons.tsx                 — All SVG icon components
    WindowResizeHandles.tsx   — Tauri-native window resize drag handles
    ExportModal.tsx           — PDF/FDX export
    HelpModal.tsx             — Help documentation
    SettingsModal.tsx         — App settings
    WelcomeScreen.tsx         — Welcome/launcher window
    ModalManager.tsx          — Renders all modals conditionally
    CommandPalette.tsx        — Ctrl+Shift+P command palette
    ErrorBoundary.tsx         — React error boundary
    (production-related views: SprintView, ProductionBreakdownModal, etc.)

  editor/
    useCodeMirror.ts          — CodeMirror hook (view creation, themes, dispatching)
    fountainSyntax.ts         — Fountain syntax highlighting extension
    autocomplete.ts           — Autocomplete for character names, transitions

  parser/
    FountainParser.ts         — Fountain screenplay parser (PEG-style)

  utils/
    boardUtils.ts             — parseBlocks / serializeBlocks for planning board
    text.ts                   — Text manipulation utilities
    actone.ts                 — .actone archive format read/write
    window.ts                 — getTauriWindow() guard (null outside Tauri)

  theme/
    muiTheme.ts               — MUI theme (light + dark mode)

src-tauri/
  src/
    lib.rs                    — All Tauri commands (file I/O, dialogs, PDF export, fonts)
    main.rs                   — Entry point (windows_subsystem = "windows" on release)
  pdf/export/                 — Fountain-to-PDF rendering (krilla + cosmic-text)
  tauri.conf.json             — Window config, bundle targets, CSP, Tauri plugins
  Cargo.toml                  — Rust dependencies
```

---

## Code Conventions

- **Read the docs first** — before making assumptions, check `docs/` for architecture, API, and feature documentation. It covers the full codebase.
- **Document every change** — any removal, addition, or behavioral change must be reflected in the relevant `docs/` files. Keep them in sync with the code.
- **No comments in source code** unless the logic is non-obvious and cannot be clarified by naming.
- **Icons** live in `src/components/Icons.tsx` as inline SVG paths using the `createIcon()` helper.
- **Contexts** live in `src/context/`, each with a `.test.tsx` file.
- **Hooks** live in `src/hooks/`, each with a `.test.ts` file.
- **Components** are PascalCase files in `src/components/` or subdirectories.
- **CSS** goes in `src/index.css` or `src/fonts.css`. No CSS-in-JS outside MUI `sx` prop.
- **Imports**: use path aliases where configured, prefer named exports.
- **Fonts**: declared in `fonts.css`. No system font fallback chains that differ per OS.
- **Types**: prefer `interface` over `type` for object shapes. Use `type` for unions.

---

## Cross-Platform Engineering

This app targets **Windows** (WebView2) and **Linux** (webkitgtk) via Tauri. The two WebView engines differ in their compliance rigor. Write to the **HTML/JS spec**, not to what works on your current platform.

### 1. React SyntheticEvents and Native Browser APIs

**Problem**: React's `SyntheticEvent` wraps native `Event` objects. For certain native APIs (`DataTransfer`, `File`, `Clipboard`, `DataView`), the proxy can silently fail on Windows WebView2 — `setData()`, `effectAllowed`, `dropEffect` may never reach the underlying engine.

**Rule**: For any property or method involving these native interfaces, use `e.nativeEvent` directly:

```tsx
// ❌ Avoid — may silently fail on Windows
e.dataTransfer.setData("text/plain", id);
e.dataTransfer.effectAllowed = "move";

// ✅ Use — bypasses the proxy
const dt = e.nativeEvent.dataTransfer;
dt.setData("text/plain", id);
dt.effectAllowed = "move";
```

This applies to: `dataTransfer`, `clipboardData`, `files`, and any `DataView`-derived properties.

### 2. Tauri API Safety

**Problem**: The app can run outside Tauri (browser dev, tests). Tauri APIs throw when the runtime is absent. Dynamic imports of `@tauri-apps/api/*` are async and can fail.

**Rule**: Wrap every Tauri API import + call in `try/catch`. Use the safe helper where possible:

```tsx
// Preferred guard helper (src/utils/window.ts)
import { getTauriWindow } from "../utils/window";
const win = getTauriWindow(); // null outside Tauri

// Dynamic import pattern for infrequent Tauri calls
try {
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().setFullscreen(true);
} catch (e) {
  console.error("Tauri API unavailable:", e);
}
```

### 3. Tauri Detection

**Problem**: Need to check at runtime whether we're inside a Tauri window.

**Rule**: Use the `in` operator on `__TAURI_INTERNALS__`:

```tsx
const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
```

This is more robust than checking the value truthiness (`(window as any).__TAURI_INTERNALS__`), because the global exists with a value even when some plugins are unavailable.

**Required in test-setup.ts**:
```ts
(window as any).__TAURI_INTERNALS__ = undefined;
```

### 4. File Paths

**Problem**: Windows uses `\`, Linux uses `/`. Paths come from the Rust backend as strings and need splitting/filename extraction.

**Rule**: Always split on both separators. Normalize with forward slashes when constructing paths.

```tsx
// Extract filename — handles both platforms
const name = path.split(/[/\\]/).pop() || "Untitled";

// Sanitize — strip both separators
name.replace(/[<>:"/\\|?*\x00-\x1f]/g, "").trim()

// Normalize to forward slashes when constructing
const normalized = path.replace(/\\/g, "/");
```

In Rust, use `std::path::PathBuf` / `Path` methods (`join()`, `extension()`, `set_extension()`, `to_string_lossy()`) — never string-concatenate paths.

### 5. Line Endings

**Problem**: Fountain and .actone files may have `\r\n` (Windows) or `\n` (Linux/macOS) line endings. The parser and text processing need consistent `\n`.

**Rule**: Normalize on every file read. Use `\r?\n` in regex splits.

```tsx
// On read
const normalized = text.replace(/\r\n/g, "\n");

// In regex splits
const lines = text.split(/\r?\n/);
```

### 6. Keyboard Events

**Problem**: `e.keyCode` / `e.which` are deprecated and behave differently across platforms. Modifier keys: Windows/Linux use `ctrlKey`, macOS uses `metaKey`.

**Rule**:
- Always use `e.key` (string), never `e.keyCode` or `e.which`.
- For Ctrl shortcuts: `e.ctrlKey || e.metaKey`
- For backslash: also check `e.code === "Backslash"` because keyboard layouts vary.
- Test helpers should construct `KeyboardEvent` with both `ctrlKey` and `metaKey` options.

```tsx
const ctrl = e.ctrlKey || e.metaKey;
if (e.key === "s" && ctrl) { e.preventDefault(); /* save */ }
```

### 7. Completeness in Event Chains

**Problem**: Certain user interactions fire a sequence of related events (mouse → drag, pointer capture sequences). If any event in the chain lacks the proper spec-required response (e.g., `preventDefault()`), the initiating engine (especially Windows WebView2) may cancel or reroute the sequence.

**Rule**: For any multi-event interaction, handle every event in the sequence. Each must call the spec-mandated methods (`preventDefault()`, `stopPropagation()`) at the right point.

```tsx
// ✅ Full event chain for pointer capture
element.onpointerdown = (e) => { element.setPointerCapture(e.pointerId); };
element.onpointermove = (e) => { /* update position */ };
element.onpointerup = (e) => { element.releasePointerCapture(e.pointerId); };
```

If you skip one event in the chain, test on Windows before shipping.

### 8. State Persistence Across Native Event Sequences

**Problem**: A sequence of native events (e.g., `eventA` → `eventB` → `eventC`) can trigger React re-renders in between. React state updates are batched and may not be available to the next handler in the sequence if it uses a stale closure.

**Rule**: For data that must survive across a sequence of related native events, store it in **both `useState`** (for rendering) and **`useRef`** (for persistence):

```tsx
const [trackedId, setTrackedId] = useState<string | null>(null);
const trackedIdRef = useRef<string | null>(null);

const handleStart = (e: Event) => {
  const id = getTargetId(e);
  setTrackedId(id);
  trackedIdRef.current = id; // survives re-renders
};

const handleEnd = (e: Event) => {
  const id = trackedIdRef.current; // always available
  // ... use id
};
```

### 9. No Platform Detection Branches

**Problem**: Using `navigator.platform`, `navigator.userAgent`, or `process.platform` to branch behavior is fragile and untestable.

**Rule**: Never branch code paths by platform detection. If behavior must differ, check a **capability** (e.g., `"__TAURI_INTERNALS__" in window` for Tauri availability, or `document.fonts.ready` for font loading) rather than the platform name.

The codebase currently has **zero** uses of `navigator.platform` or `process.platform`. Keep it that way.

### 10. CSS Cross-Platform Consistency

**Problem**: Different OS render fonts, scrollbars, and form controls differently.

**Rule**:
- Use `-webkit-font-smoothing: antialiased` and `-moz-osx-font-smoothing: grayscale` (already in `index.css`).
- All fonts must be declared via `@font-face` in `fonts.css` — never use system font names.
- Scrollbar styling uses `::-webkit-scrollbar` (works in both WebView2 and webkitgtk).
- No `@media` queries targeting OS. Use feature queries (`@supports`) if needed.
- Avoid CSS `content:` with platform-specific characters.

### 11. Rust Backend

- Use `PathBuf` / `Path` for all file operations — never manual string concatenation of paths.
- `to_string_lossy()` for returning paths to the frontend (handles non-UTF8 gracefully).
- Use `#[cfg(target_os = "...")]` only for genuinely platform-specific behavior (e.g., opening file explorer). Prefer Tauri's cross-platform abstractions when available.
- The `windows_subsystem = "windows"` attribute in `main.rs` is the only acceptable platform-specific config — it hides the console on Windows release builds.
- The `[lib] name = "actone_lib"` workaround in `Cargo.toml` is Windows-only (Cargo issue #8519). Do not remove or rename.

---

## Testing

- **Framework**: Vitest 4 with jsdom.
- **Run**: `vitest run` or `npm test`.
- **Watch**: `npm run test:watch`.
- **Mock Tauri**: `src/test-setup.ts` sets `(window as any).__TAURI_INTERNALS__ = undefined`.
- **Test files**: Co-located with source, named `*.test.ts` or `*.test.tsx`.
- **Rendering tests**: Use `@testing-library/react` + `renderHook`.
- **Keyboard tests**: Construct `KeyboardEvent` with both `ctrlKey` and `metaKey`. Use `fireKey()` helper pattern from `useKeyboardShortcuts.test.ts`.

### Platform Matrix Recommendation

Add a GitHub Actions workflow that runs `vitest run` on both `windows-latest` and `ubuntu-latest`. Many bugs (especially in event handling, path parsing, line ending normalization) only surface on one platform.

---

## Quick Reference

```bash
npm run dev        # Vite dev server
npm test           # Run all vitest tests
npm run build      # tsc + vite build
npm run tauri      # Tauri CLI (build, dev, etc.)
```

---

## Communication Style

**Explain in plain language, then technical.** When explaining a bug, feature, or code behavior, start with clear plain-English wording — no postman/wizard/butler analogies, just direct non-technical phrasing. Then follow with a brief technical breakdown including file paths and line numbers. Do not talk down; assume the user is technically literate but wants the conceptual context before the low-level details.

---

## Cross-Agent Compatibility

Other agents (Cursor, Copilot, Windsurf) can use their own config files pointing here — add a line like `Read AGENTS.md for project instructions` to `.cursorrules` or `.github/copilot-instructions.md`.
