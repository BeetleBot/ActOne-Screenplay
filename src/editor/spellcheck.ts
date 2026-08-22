import { Compartment, StateEffect, StateField, RangeSetBuilder } from "@codemirror/state";
import { EditorView, ViewPlugin, ViewUpdate, Decoration, DecorationSet } from "@codemirror/view";
import {
  lineTypesField,
  LINE_HEADING,
  LINE_CHARACTER,
  LINE_DUAL_CHARACTER,
  LINE_TRANSITION,
} from "./fountainSyntax";
import { cachedCharactersField } from "./inlineAutocomplete";

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
  private hasPerformedInitialCheck = false;

  constructor(view: EditorView) {
    this.scheduleCheck(view, 0, true);
  }

  update(update: ViewUpdate) {
    const hasForceEffect = update.transactions.some((tr) =>
      tr.effects.some((e) => e.is(forceSpellRecheckEffect))
    );

    if (hasForceEffect) {
      this.scheduleCheck(update.view, 0, true);
    } else if (update.docChanged) {
      this.scheduleCheck(update.view, 400, false);
    } else if (update.viewportChanged && !this.hasPerformedInitialCheck) {
      this.scheduleCheck(update.view, 0, true);
    }
  }

  destroy() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  scheduleCheck(view: EditorView, delay: number, isFull: boolean) {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => {
      this.timer = null;
      this.runCheck(view, isFull);
    }, delay);
  }

  async runCheck(view: EditorView, isFull: boolean) {
    if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
      return;
    }

    const runId = ++this.currentRunId;
    const ranges: TextRange[] = [];
    const lineTypes = view.state.field(lineTypesField, false);
    const doc = view.state.doc;

    if (isFull || !this.hasPerformedInitialCheck) {
      for (let l = 1; l <= doc.lines; l++) {
        const type = lineTypes ? lineTypes[l - 1] : undefined;
        if (
          type === LINE_HEADING ||
          type === LINE_CHARACTER ||
          type === LINE_DUAL_CHARACTER ||
          type === LINE_TRANSITION
        ) {
          continue;
        }

        const line = doc.line(l);
        if (line.from < line.to) {
          ranges.push({
            text: line.text,
            offset: line.from,
          });
        }
      }
    } else {
      for (const { from, to } of view.visibleRanges) {
        if (from >= to) continue;
        const startLine = doc.lineAt(from).number;
        const endLine = doc.lineAt(to).number;

        for (let l = startLine; l <= endLine; l++) {
          const type = lineTypes ? lineTypes[l - 1] : undefined;
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
    }

    if (ranges.length === 0) {
      if (isFull) {
        view.dispatch({
          effects: setSpellDecosEffect.of(Decoration.none),
        });
        this.hasPerformedInitialCheck = true;
      }
      return;
    }

    const cachedChars = view.state.field(cachedCharactersField, false);
    const characterNames = cachedChars && cachedChars.size > 0 ? Array.from(cachedChars) : undefined;

    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const misspelled = await invoke<MisspelledWord[]>("spellcheck_check_text", {
        ranges,
        characterNames,
      });

      if (this.currentRunId !== runId) return;

      const builder = new RangeSetBuilder<Decoration>();
      const sorted = [...misspelled].sort((a, b) => a.from - b.from);
      const docLen = view.state.doc.length;

      if (isFull) {
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
      } else {
        // Range-scoped update: keep existing decos outside checked ranges, replace within checked ranges
        const currentDecos = view.state.field(spellDecoField, false) || Decoration.none;
        const minChecked = ranges.reduce((m, r) => Math.min(m, r.offset), docLen);
        const maxChecked = ranges.reduce((m, r) => Math.max(m, r.offset + r.text.length), 0);

        const newRanges: { from: number; to: number }[] = [];
        currentDecos.between(0, docLen, (from, to) => {
          if (to <= minChecked || from >= maxChecked) {
            newRanges.push({ from, to });
          }
        });

        for (const item of sorted) {
          if (item.from >= minChecked && item.to <= maxChecked && item.from < item.to) {
            newRanges.push({ from: item.from, to: item.to });
          }
        }

        newRanges.sort((a, b) => a.from - b.from);
        let lastTo = 0;
        for (const r of newRanges) {
          if (r.from >= lastTo && r.to <= docLen && r.from < r.to) {
            builder.add(r.from, r.to, spellErrorMark);
            lastTo = r.to;
          }
        }
        view.dispatch({
          effects: setSpellDecosEffect.of(builder.finish()),
        });
      }
      this.hasPerformedInitialCheck = true;
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
