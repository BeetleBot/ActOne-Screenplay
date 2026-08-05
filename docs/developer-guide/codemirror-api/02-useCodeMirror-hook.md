# useCodeMirror Hook

**File:** `src/editor/useCodeMirror.ts` (~720 lines)

The central React hook that creates and manages the CodeMirror 6 `EditorView` instance.

## Interface

```typescript
function useCodeMirror(
    containerRef: RefObject<HTMLDivElement | null>,
): { current: EditorView | null };
```

The hook takes only the container ref and reads all configuration (text, theme, font size, modes) from React contexts directly (`useFile`, `useUI`, `useTheme`). It returns a mutable ref object whose `.current` is the `EditorView` instance once mounted.

## Lifecycle

1. **Mount:** Creates `EditorView` with all extensions, sets up update listeners
2. **External text change:** Updates editor via `dispatch({ changes: { from: 0, to: doc.length, insert: newText } })`
3. **Theme change:** Reconfigures `themeCompartment` with new CSS theme
4. **Font size change:** Reconfigures `fontSizeCompartment`
5. **Typewriter mode toggle:** Reconfigures `typewriterCompartment`
6. **Unmount:** Calls `editorView.destroy()`

## Internal Extensions

### Smart Quotes

Listens to document changes and replaces straight quotes (`"`, `'`) with curly quotes (`"`, `'`, `'`, `'`) using a custom `EditorState.transactionFilter`.

### Tab Key Handler

Custom `keymap` entry for Tab:
- If line is empty: cycles through common Fountain prefixes
- If cursor is at start of dialogue character: inserts tab
- Otherwise: inserts default tab

### Enter Key Handler

Custom `keymap` entry for Enter:
- After a character name: automatically creates a parenthetical if next line is empty
- In dialogue: continues as dialogue with auto-indent

### Active Line Highlight

Uses `ViewPlugin.fromClass()` to always highlight the active line (even when editor is unfocused).

### Typewriter Scroll

Uses `ViewPlugin.fromClass()` to keep the cursor vertically centered:
- On every document change or cursor move, scrolls to keep cursor at 50% viewport height
- Only active when `typewriterMode` is enabled
- Managed via `typewriterCompartment`

## Update Listener

The hook registers an `EditorView.updateListener` that fires:

- `onTextChange` — on every document change (debounced in some cases)
- `onSelectionChange` — when cursor position changes
- `onSceneChange` — when cursor enters a different scene (detected via the fountain syntax state field)

## Tab Switching & Viewport Stability

ActOne reuses a **single `EditorView`** across all open file tabs. Per-file state is
cached in the hook (`statesRef` + `scrollPositionsRef`, keyed by
`${activeFileId}-${activeScriptIndex}`) and swapped with `view.setState(...)`.

The visible scroll container is the external `.editor-scroll-area` element
(CodeMirror's own `.cm-scroller` is `overflow: visible`), so the viewport is **not**
part of `EditorState`. To keep the viewport stable and per-file:

1. **On tab switch**, the outgoing file's `scrollTop` is saved and the incoming
   file's `scrollTop` is restored, then a `EditorView.scrollIntoView(head, ...)`
   effect is dispatched so the cursor is always in view (`y: "center"` in
   typewriter mode, `y: "nearest"` otherwise). CodeMirror's `scrollRectIntoView`
   walks up scrollable ancestors, so this scrolls the outer `.editor-scroll-area`.
2. **Focus is restored via `view.focus()`**, which uses CodeMirror's internal
   `focusPreventScroll` helper — it feature-detects `preventScroll` support
   (including the Safari/WebKit regression where `preventScroll` is broken) and
   falls back to a scroll capture/restore kludge, so the browser's native
   focus-scroll can never fight the controlled restore on any engine.
3. **A module-level `scriptSwitchToken`** is incremented on every script switch.
   Every deferred scroll operation (rAF callbacks, `requestMeasure` writes,
   debounced center/restore helpers) captures the token when scheduled and bails
   out if the token changed, so a pending scroll from one tab can never move the
   viewport of another tab.
4. **Typewriter mode** centers the cursor by dispatching
   `EditorView.scrollIntoView(head, { y: "center" })` from a `ViewPlugin` on every
   document or selection change. Centering is instant (no smooth animation), so
   an in-flight scroll cannot bleed across a tab switch.
5. **Pending scroll targets** (e.g. outline click-to-scroll) are applied instantly
   (`behavior: "auto"`) and token-guarded for the same reason.
6. **While typing** in normal mode, the hook keeps the cursor from drifting
   visually by compensating the viewport by the cursor's movement; this
   compensation is disabled in typewriter mode (which centers instead) and is
   token-guarded.

The remaining pure scroll math lives in `src/editor/cursorScroll.ts`
(`pendingScrollTargetY`) and is unit-tested in
`src/editor/cursorScroll.test.ts`. All cursor-alignment (nearest/center) is done
through CodeMirror's own `EditorView.scrollIntoView`, which normalizes zoom
scale and works identically on WebView2 and webkitgtk.
