import { EditorState } from "@codemirror/state";
import { foldService, codeFolding, foldEffect, unfoldEffect, foldedRanges, foldKeymap } from "@codemirror/language";
import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { lineTypesField, LINE_SECTION, LINE_HEADING } from "./fountainSyntax";

export function getSectionDepth(lineText: string): number {
  const match = lineText.trim().match(/^#+/);
  // Screenplay structure has two levels. Legacy deeper prefixes are subsections.
  return match ? Math.min(2, match[0].length) : 1;
}

export function getFountainFoldRange(state: EditorState, lineNumber: number): { from: number; to: number } | null {
  if (lineNumber < 1 || lineNumber > state.doc.lines) return null;
  const types = state.field(lineTypesField, false);
  if (!types) return null;

  const currentType = types[lineNumber - 1];

  if (currentType === LINE_SECTION) {
    const currentDepth = getSectionDepth(state.doc.line(lineNumber).text);
    let endLine = state.doc.lines;

    for (let j = lineNumber + 1; j <= state.doc.lines; j++) {
      if (types[j - 1] === LINE_SECTION) {
        const nextDepth = getSectionDepth(state.doc.line(j).text);
        if (nextDepth <= currentDepth) {
          endLine = j - 1;
          break;
        }
      }
    }

    const from = state.doc.line(lineNumber).to;
    const to = state.doc.line(endLine).to;
    return to > from ? { from, to } : null;
  }

  if (currentType === LINE_HEADING) {
    let endLine = state.doc.lines;

    for (let j = lineNumber + 1; j <= state.doc.lines; j++) {
      const nextType = types[j - 1];
      if (nextType === LINE_HEADING || nextType === LINE_SECTION) {
        endLine = j - 1;
        break;
      }
    }

    const from = state.doc.line(lineNumber).to;
    const to = state.doc.line(endLine).to;
    return to > from ? { from, to } : null;
  }

  return null;
}

export function isLineFolded(state: EditorState, lineNumber: number): boolean {
  if (lineNumber < 1 || lineNumber > state.doc.lines) return false;
  const line = state.doc.line(lineNumber);
  let folded = false;
  foldedRanges(state).between(line.to, line.to, () => {
    folded = true;
  });
  return folded;
}

class FoldToggleWidget extends WidgetType {
  constructor(
    readonly lineNum: number,
    readonly isFolded: boolean,
    readonly kind: "section" | "subsection" | "scene"
  ) {
    super();
  }

  eq(other: FoldToggleWidget) {
    return this.lineNum === other.lineNum && this.isFolded === other.isFolded && this.kind === other.kind;
  }

  toDOM(view: EditorView) {
    const btn = document.createElement("span");
    btn.className = `cm-fountain-fold-toggle cm-fold-toggle-${this.kind} ${this.isFolded ? "is-folded" : "is-open"}`;
    btn.setAttribute("aria-label", this.isFolded ? "Expand" : "Collapse");
    btn.setAttribute("role", "button");
    btn.tabIndex = -1;
    btn.innerHTML = `<svg viewBox="0 0 24 24" class="cm-fold-svg"><path d="${this.isFolded ? "M9 5l7 7-7 7" : "M19 9l-7 7-7-7"}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

    btn.onmousedown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const range = getFountainFoldRange(view.state, this.lineNum);
      if (!range) return;

      if (this.isFolded) {
        view.dispatch({ effects: unfoldEffect.of(range) });
      } else {
        view.dispatch({ effects: foldEffect.of(range) });
      }
    };

    return btn;
  }

  ignoreEvent() {
    return false;
  }
}

function computeFoldToggleDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const types = view.state.field(lineTypesField, false);
  if (!types) return builder.finish();

  for (const { from, to } of view.visibleRanges) {
    const startLine = view.state.doc.lineAt(from).number;
    const endLine = view.state.doc.lineAt(to).number;

    for (let i = startLine; i <= endLine; i++) {
      const type = types[i - 1];
      if (type === LINE_SECTION || type === LINE_HEADING) {
        const line = view.state.doc.line(i);
        const range = getFountainFoldRange(view.state, i);
        const folded = isLineFolded(view.state, i);
        if (range || folded) {
          const kind = type === LINE_HEADING
            ? "scene"
            : getSectionDepth(line.text) === 1 ? "section" : "subsection";
          builder.add(
            line.from,
            line.from,
            Decoration.widget({
              side: -1,
              widget: new FoldToggleWidget(i, folded, kind),
            })
          );
        }
      }
    }
  }

  return builder.finish();
}

export const fountainFoldService = foldService.of((state, lineStart) => {
  const lineNum = state.doc.lineAt(lineStart).number;
  return getFountainFoldRange(state, lineNum);
});

export const fountainFoldTogglePlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = computeFoldToggleDecorations(view);
    }
    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.viewportChanged ||
        update.transactions.some(tr => tr.effects.some(e => e.is(foldEffect) || e.is(unfoldEffect)))
      ) {
        this.decorations = computeFoldToggleDecorations(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations }
);

export const fountainFoldCodeExtension = codeFolding({
  placeholderDOM(_view, onclick, prepared) {
    const badge = document.createElement("span");
    badge.className = "cm-foldPlaceholder cm-fountain-fold-placeholder";
    badge.textContent = prepared || "…";
    badge.onclick = (e) => {
      e.stopPropagation();
      onclick(e);
    };
    return badge;
  },
  preparePlaceholder(state, range) {
    const fromLine = state.doc.lineAt(range.from).number;
    const toLine = state.doc.lineAt(range.to).number;
    const count = toLine - fromLine;
    return `… (${count} line${count === 1 ? "" : "s"})`;
  }
});

export { foldKeymap };
