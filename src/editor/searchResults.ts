import type { ChangeSet, EditorState } from "@codemirror/state";
import type { SearchQuery } from "@codemirror/search";
import { searchMargin, type SearchRange } from "./searchHighlights";

/** Bounded scans yield even when a document has no matches. */
export function scanSearchResults(
  state: EditorState,
  query: SearchQuery,
  publish: (matches: SearchRange[]) => void,
  regions: SearchRange[] = [{ from: 0, to: state.doc.length }],
): () => void {
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout>;
  const matches: SearchRange[] = [];
  let regionIndex = 0;
  let position = regions[0]?.from ?? 0;
  const regexpCursor = query.regexp && query.valid ? query.getCursor(state) : null;
  const step = () => {
    if (cancelled) return;
    if (regexpCursor) {
      const deadline = performance.now() + 3;
      do {
        const next = regexpCursor.next();
        if (next.done) {
          publish(matches);
          return;
        }
        matches.push({ from: next.value.from, to: next.value.to });
      } while (performance.now() < deadline);
      timer = setTimeout(step, 0);
      return;
    }
    const deadline = performance.now() + 3;
    do {
      const region = regions[regionIndex];
      if (!region) {
        publish(matches);
        return;
      }
      const end = Math.min(region.to, position + 4096);
      const cursor = query.getCursor(state, position, Math.min(region.to, end + searchMargin(query)));
      let nextPosition = end;
      for (let next = cursor.next(); !next.done; next = cursor.next()) {
        if (next.value.from >= end && end < region.to) break;
        matches.push({ from: next.value.from, to: next.value.to });
        nextPosition = Math.max(nextPosition, next.value.to);
      }
      position = nextPosition;
      if (position >= region.to) {
        regionIndex++;
        position = regions[regionIndex]?.from ?? 0;
        if (regionIndex >= regions.length) {
          if (!cancelled) publish(matches);
          return;
        }
      }
    } while (performance.now() < deadline);
    timer = setTimeout(step, 0);
  };
  timer = setTimeout(() => {
    if (!query.valid || !query.search) {
      publish([]);
      return;
    }
    step();
  }, 0);
  return () => {
    cancelled = true;
    clearTimeout(timer);
  };
}

export interface SearchSnapshot {
  state: EditorState;
  query: SearchQuery;
  ranges: SearchRange[];
}

/** Single-line string queries are independent across complete source lines. */
export function scanUpdatedSearchResults(
  state: EditorState,
  query: SearchQuery,
  publish: (matches: SearchRange[]) => void,
  previous?: SearchSnapshot | null,
  changes?: ChangeSet | null,
): () => void {
  const multiline = query.literal ? query.search.includes("\n") : /\n|\\n|\\r/.test(query.search);
  if (
    !previous ||
    !changes ||
    !query.eq(previous.query) ||
    multiline ||
    query.regexp ||
    changes.length !== previous.state.doc.length ||
    changes.newLength !== state.doc.length
  ) {
    return scanSearchResults(state, query, publish);
  }
  const regions: SearchRange[] = [];
  changes.iterChangedRanges((_fromA, _toA, from, to) => {
    const start = state.doc.lineAt(from).number;
    const end = state.doc.lineAt(to).number;
    regions.push({
      from: state.doc.line(Math.max(1, start - 1)).from,
      to: state.doc.line(Math.min(state.doc.lines, end + 1)).to,
    });
  });
  regions.sort((a, b) => a.from - b.from);
  const merged: SearchRange[] = [];
  for (const range of regions) {
    const last = merged[merged.length - 1];
    if (last && range.from <= last.to) last.to = Math.max(last.to, range.to);
    else merged.push({ ...range });
  }
  const untouched = previous.ranges
    .map(({ from, to }) => ({ from: changes.mapPos(from, 1), to: changes.mapPos(to, -1) }))
    .filter(
      (range) => range.from < range.to && !merged.some((region) => range.to >= region.from && range.from <= region.to),
    );
  return scanSearchResults(
    state,
    query,
    (ranges) => publish([...untouched, ...ranges].sort((a, b) => a.from - b.from)),
    merged,
  );
}
