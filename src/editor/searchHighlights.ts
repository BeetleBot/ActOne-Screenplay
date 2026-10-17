import type { EditorState } from "@codemirror/state";
import { getSearchQuery, type SearchQuery } from "@codemirror/search";
import { Decoration, ViewPlugin, type DecorationSet, type EditorView, type ViewUpdate } from "@codemirror/view";

export interface SearchRange {
  from: number;
  to: number;
}

// SearchQuery interprets escapes unless literal is set. Normalization can expand
// a character, so use the normalized query length for the viewport boundary.
export function searchMargin(query: SearchQuery): number {
  return Math.max(1, query.search.normalize("NFKD").length * 2);
}

export function visibleSearchRanges(state: EditorState, ranges: readonly SearchRange[]): SearchRange[] {
  const query = getSearchQuery(state);
  if (!query.valid || !query.search) return [];
  const matches: SearchRange[] = [];
  let previousTo = -1;
  for (const range of ranges) {
    const margin = searchMargin(query);
    // The custom panel supports string queries. For externally supplied regular
    // expressions use the complete document to preserve unbounded matches.
    const from = query.regexp ? 0 : Math.max(0, range.from - margin);
    const to = query.regexp ? state.doc.length : Math.min(state.doc.length, range.to + margin);
    const cursor = query.getCursor(state, from, to);
    for (let next = cursor.next(); !next.done; next = cursor.next()) {
      const match = next.value;
      if (match.to < range.from || match.from > range.to || match.from < previousTo) continue;
      matches.push({ from: match.from, to: match.to });
      previousTo = match.to;
    }
    if (query.regexp) break;
  }
  return matches;
}

const normal = Decoration.mark({ class: "cm-searchMatch" });
const active = Decoration.mark({ class: "cm-searchMatch cm-searchMatch-selected" });

export const searchHighlightPlugin = ViewPlugin.fromClass(
  class {
    matches: SearchRange[];
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.matches = visibleSearchRanges(view.state, view.visibleRanges);
      this.decorations = this.decorate(view);
    }
    update(update: ViewUpdate) {
      const queryChanged = !getSearchQuery(update.state).eq(getSearchQuery(update.startState));
      if (update.docChanged || update.viewportChanged || queryChanged) {
        this.matches = visibleSearchRanges(update.state, update.view.visibleRanges);
      }
      if (update.docChanged || update.viewportChanged || queryChanged || update.selectionSet) {
        this.decorations = this.decorate(update.view);
      }
    }
    decorate(view: EditorView): DecorationSet {
      const selection = view.state.selection.main;
      return Decoration.set(
        this.matches.map(({ from, to }) =>
          (selection.from === from && selection.to === to ? active : normal).range(from, to),
        ),
      );
    }
  },
  { decorations: (plugin) => plugin.decorations },
);
