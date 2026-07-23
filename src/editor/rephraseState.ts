import { StateField, StateEffect } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView } from "@codemirror/view";

export const setRephraseRangeEffect = StateEffect.define<{ from: number; to: number } | null>();

export const rephraseHighlightField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    decorations = decorations.map(tr.changes);
    for (const effect of tr.effects) {
      if (effect.is(setRephraseRangeEffect)) {
        if (effect.value === null) {
          return Decoration.none;
        } else {
          const { from, to } = effect.value;
          return Decoration.set([
            Decoration.mark({ class: "cm-rephrasing-pulse" }).range(from, to)
          ]);
        }
      }
    }
    return decorations;
  },
  provide: (f) => EditorView.decorations.from(f)
});
