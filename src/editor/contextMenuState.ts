import { StateField, StateEffect } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView } from "@codemirror/view";

export const setContextMenuHighlightEffect = StateEffect.define<{ from: number; to: number } | null>();

export const contextMenuHighlightField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    decorations = decorations.map(tr.changes);
    for (const effect of tr.effects) {
      if (effect.is(setContextMenuHighlightEffect)) {
        if (!effect.value || effect.value.from === effect.value.to) {
          return Decoration.none;
        } else {
          return Decoration.set([
            Decoration.mark({ class: "cm-contextmenu-selection" }).range(effect.value.from, effect.value.to)
          ]);
        }
      }
    }
    return decorations;
  },
  provide: (f) => EditorView.decorations.from(f)
});
