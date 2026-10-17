import { afterEach, describe, expect, it, vi } from "vitest";
import { EditorState } from "@codemirror/state";
import { search, SearchQuery, setSearchQuery } from "@codemirror/search";
import { scanSearchResults, scanUpdatedSearchResults } from "./searchResults";
import { visibleSearchRanges } from "./searchHighlights";

afterEach(() => vi.useRealTimers());

describe("bounded search scans", () => {
  it.each([
    ["ab".repeat(10000), "aba", false, false],
    ["x".repeat(4095) + "target\nnext" + " target".repeat(1000), "target", false, false],
    ["word words WORD word_\n".repeat(1000), "word", true, true],
    ["a\nb\n".repeat(3000), "a\\nb", false, false],
    ["CAFÉ cafe\u0301 café\n".repeat(1000), "café", false, false],
    ["nothing\n".repeat(3000), "missing", false, false],
    ["", "missing", false, false],
  ])("matches the complete CodeMirror scan", async (doc, text, caseSensitive, wholeWord) => {
    vi.useFakeTimers();
    const state = EditorState.create({ doc });
    const query = new SearchQuery({ search: text, caseSensitive, wholeWord });
    const expected = Array.from({ [Symbol.iterator]: () => query.getCursor(state) }, ({ from, to }) => ({ from, to }));
    const publish = vi.fn();
    scanSearchResults(state, query, publish);
    await vi.runAllTimersAsync();
    expect(publish).toHaveBeenCalledExactlyOnceWith(expected);
  });

  it("cancels an obsolete document scan", async () => {
    vi.useFakeTimers();
    const publish = vi.fn();
    const cancel = scanSearchResults(
      EditorState.create({ doc: "match ".repeat(10000) }),
      new SearchQuery({ search: "match" }),
      publish,
    );
    cancel();
    await vi.runAllTimersAsync();
    expect(publish).not.toHaveBeenCalled();
  });
});

describe("viewport search highlights", () => {
  it("includes matches crossing both viewport boundaries", () => {
    let state = EditorState.create({ doc: "xx target xx target xx", extensions: search() });
    state = state.update({ effects: setSearchQuery.of(new SearchQuery({ search: "target" })) }).state;
    expect(visibleSearchRanges(state, [{ from: 5, to: 15 }])).toEqual([
      { from: 3, to: 9 },
      { from: 13, to: 19 },
    ]);
  });

  it("honors whole word matching and clears empty queries", () => {
    let state = EditorState.create({ doc: "cat cats CAT", extensions: search() });
    state = state.update({
      effects: setSearchQuery.of(new SearchQuery({ search: "cat", wholeWord: true, caseSensitive: true })),
    }).state;
    expect(visibleSearchRanges(state, [{ from: 0, to: 12 }])).toEqual([{ from: 0, to: 3 }]);
    state = state.update({ effects: setSearchQuery.of(new SearchQuery({ search: "" })) }).state;
    expect(visibleSearchRanges(state, [{ from: 0, to: 12 }])).toEqual([]);
  });
});

describe("incremental search", () => {
  it.each(["word", "aa", "caf�", "word\\nword"])(
    "stays equivalent to a full scan for %s across edits and undo",
    async (text) => {
      vi.useFakeTimers();
      let state = EditorState.create({ doc: "word aa aaaa CAF� cafe\u0301 words\nword\n".repeat(30) });
      const query = new SearchQuery({ search: text, wholeWord: text === "word" });
      let ranges = Array.from({ [Symbol.iterator]: () => query.getCursor(state) }, ({ from, to }) => ({ from, to }));
      for (let index = 0; index < 25; index++) {
        const from = (index * 127) % state.doc.length;
        const transaction = state.update({
          changes: { from, to: Math.min(state.doc.length, from + (index % 4)), insert: index % 3 ? "word aa " : "\n" },
        });
        const publish = vi.fn();
        scanUpdatedSearchResults(transaction.state, query, publish, { state, query, ranges }, transaction.changes);
        await vi.runAllTimersAsync();
        const expected = Array.from(
          { [Symbol.iterator]: () => query.getCursor(transaction.state) },
          ({ from, to }) => ({ from, to }),
        );
        expect(publish).toHaveBeenCalledExactlyOnceWith(expected);
        ranges = expected;
        state = transaction.state;
      }
    },
  );
});
