# useCodeMirror Hook

**File:** `src/editor/useCodeMirror.ts` (~500 lines)

The central React hook that creates and manages the CodeMirror 6 `EditorView` instance.

## Interface

```typescript
function useCodeMirror({
    containerRef: RefObject<HTMLDivElement | null>,
    rawText: string,
    isReadOnly: boolean,
    placeholder: string,
    theme: { isDark: boolean; fountainColors: Record<LineType, string> },
    fontSize: number,
    typewriterMode: boolean,
    zenMode: boolean,
    onTextChange: (text: string, update: ViewUpdate) => void,
    onSelectionChange: (offset: number) => void,
    onSceneChange: (index: number) => void,
    editorReady: () => void,
}): UseCodeMirrorReturn;

interface UseCodeMirrorReturn {
    editorView: EditorView | null;
    getCursorOffset: () => number;
    getSelectedRange: () => { from: number; to: number };
    isEditorFocused: () => boolean;
}
```

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
