# Empty Line Selection Extension

**File:** `src/editor/emptyLineSelection.ts` (~80 lines)

A custom CodeMirror 6 `ViewPlugin` that handles selection behavior on blank lines.

## Problem

CodeMirror 6 treats blank lines as "invisible" in terms of selection — clicking on a blank line may not produce the expected selection range, and certain interactions (context menus, decorations) don't work well on empty lines.

## Solution

The `emptyLineSelectionPlugin` ViewPlugin:

```typescript
export const emptyLineSelectionPlugin = ViewPlugin.fromClass(
    class EmptyLineSelection {
        decorations: DecorationSet;

        constructor(view: EditorView) {
            this.decorations = this.buildDecorations(view);
        }

        update(update: ViewUpdate) {
            if (update.docChanged || update.selectionSet) {
                this.decorations = this.buildDecorations(update.view);
            }
        }

        buildDecorations(view: EditorView): DecorationSet {
            const decorations: Range<Decoration>[] = [];
            const doc = view.state.doc;

            for (let i = 1; i <= doc.lines; i++) {
                const line = doc.line(i);
                if (line.length === 0) {
                    // Add a zero-width decoration so CM6 treats
                    // this line as selectable
                    decorations.push(
                        Decoration.line({
                            class: "cm-empty-line",
                        }).range(line.from)
                    );
                }
            }

            return Decoration.set(decorations);
        }
    },
    { decorations: (v) => v.decorations }
);
```

## Behavior

- Clicking on a blank line now selects the entire line
- Context menu works on blank lines (marker/color/note actions)
- Empty lines receive the `cm-empty-line` CSS class for styling
