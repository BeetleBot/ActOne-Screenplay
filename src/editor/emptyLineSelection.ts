import { ViewPlugin, Decoration, DecorationSet, ViewUpdate, EditorView } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";

function computeEmptyLineDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const doc = view.state.doc;

  for (const range of view.state.selection.ranges) {
    if (range.from === range.to) continue;

    const fromLine = doc.lineAt(range.from);
    const toLine = doc.lineAt(Math.max(range.to - 1, range.from));

    for (let i = fromLine.number; i <= toLine.number; i++) {
      const line = doc.line(i);
      if (line.length === 0) {
        builder.add(line.from, line.from, Decoration.line({ class: "cm-selected-empty-line" }));
      }
    }
  }

  return builder.finish();
}

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
