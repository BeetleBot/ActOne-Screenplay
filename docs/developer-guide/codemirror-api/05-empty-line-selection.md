# Empty Line Selection Extension

**File:** `src/editor/emptyLineSelection.ts` (40 lines)

A custom CodeMirror 6 `ViewPlugin` that renders a single-character-width selection marker on empty lines within the current selection range.

## Problem

CodeMirror 6's native selection rendering only highlights text content. When dragging to select across multiple lines, empty lines between them show no selection highlight. The browser's `::selection` CSS pseudo-element behavior differs between WebView2 (Windows) and webkitgtk (Linux), causing inconsistent appearance.

## Solution

The `emptyLineSelectionPlugin` ViewPlugin:

```typescript
export const emptyLineSelectionPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = computeEmptyLineDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.selectionSet || update.docChanged) {
        this.decorations = computeEmptyLineDecorations(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations }
);
```

The `computeEmptyLineDecorations` function uses a `RangeSetBuilder` to iterate over all selection ranges and, for each non-empty selection (`range.from !== range.to`), adds a `.cm-selected-empty-line` line decoration on every empty line within that range.

## CSS

```css
.cm-selected-empty-line::before {
  content: '\00a0';
  background: rgba(var(--accent-rgb), 0.3);
}
```

A non-breaking space is injected via `::before` with the same selection background color as text, producing a single-character-width block that matches the native Windows selection appearance on empty lines.

## Behavior

- Only fires during actual drag-selection (skips cursor-only positions via `range.from === range.to` guard)
- Empty lines within a multi-line selection show a 1-character-width marker
- Marker uses the same accent color and opacity as the text selection highlight
- Works identically on both Windows WebView2 and Linux webkitgtk
