import { Compartment, StateEffect, StateField, RangeSetBuilder } from "@codemirror/state";
import { EditorView, ViewPlugin, ViewUpdate, Decoration, DecorationSet } from "@codemirror/view";
import {
  lineTypesField,
  LINE_HEADING,
  LINE_CHARACTER,
  LINE_DUAL_CHARACTER,
  LINE_TRANSITION,
} from "./fountainSyntax";

export const setSpellDecosEffect = StateEffect.define<DecorationSet>();
export const forceSpellRecheckEffect = StateEffect.define<null>();

export const spellDecoField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decos, tr) {
    decos = decos.map(tr.changes);
    for (const effect of tr.effects) {
      if (effect.is(setSpellDecosEffect)) {
        return effect.value;
      }
    }
    return decos;
  },
  provide: (f) => EditorView.decorations.from(f),
});

const spellErrorMark = Decoration.mark({ class: "cm-spell-error" });

interface TextRange {
  text: string;
  offset: number;
}

interface MisspelledWord {
  from: number;
  to: number;
  word: string;
}

class SpellcheckPluginView {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private currentRunId = 0;

  constructor(view: EditorView) {
    this.scheduleCheck(view);
  }

  update(update: ViewUpdate) {
    const hasForceEffect = update.transactions.some((tr) =>
      tr.effects.some((e) => e.is(forceSpellRecheckEffect))
    );

    if (update.docChanged || update.viewportChanged || hasForceEffect) {
      this.scheduleCheck(update.view);
    }
  }

  destroy() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  scheduleCheck(view: EditorView) {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => {
      this.runCheck(view);
    }, 200);
  }

  async runCheck(view: EditorView) {
    if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
      return;
    }

    const runId = ++this.currentRunId;
    const ranges: TextRange[] = [];
    const lineTypes = view.state.field(lineTypesField, false);
    const doc = view.state.doc;

    for (const { from, to } of view.visibleRanges) {
      if (from >= to) continue;
      const startLine = doc.lineAt(from).number;
      const endLine = doc.lineAt(to).number;

      for (let l = startLine; l <= endLine; l++) {
        const type = lineTypes ? lineTypes[l - 1] : undefined;
        // Skip Scene Headings, Characters, Dual Characters, and Transitions
        if (
          type === LINE_HEADING ||
          type === LINE_CHARACTER ||
          type === LINE_DUAL_CHARACTER ||
          type === LINE_TRANSITION
        ) {
          continue;
        }

        const line = doc.line(l);
        const lineFrom = Math.max(line.from, from);
        const lineTo = Math.min(line.to, to);
        if (lineFrom < lineTo) {
          ranges.push({
            text: view.state.sliceDoc(lineFrom, lineTo),
            offset: lineFrom,
          });
        }
      }
    }

    if (ranges.length === 0) return;

    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const misspelled = await invoke<MisspelledWord[]>("spellcheck_check_text", { ranges });

      if (this.currentRunId !== runId) return;

      const builder = new RangeSetBuilder<Decoration>();
      const sorted = [...misspelled].sort((a, b) => a.from - b.from);

      const docLen = view.state.doc.length;
      let lastTo = 0;

      for (const item of sorted) {
        if (item.from >= lastTo && item.to <= docLen && item.from < item.to) {
          builder.add(item.from, item.to, spellErrorMark);
          lastTo = item.to;
        }
      }

      view.dispatch({
        effects: setSpellDecosEffect.of(builder.finish()),
      });
    } catch (err) {
      console.warn("[Spellcheck] check_text error:", err);
    }
  }
}

export const spellcheckPlugin = ViewPlugin.fromClass(SpellcheckPluginView);
export const spellcheckCompartment = new Compartment();
export const spellcheckExtension = [spellDecoField, spellcheckPlugin];

export function triggerSpellRecheck(view: EditorView) {
  view.dispatch({
    effects: forceSpellRecheckEffect.of(null),
  });
}
