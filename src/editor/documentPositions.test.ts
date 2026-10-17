import { describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { DocumentPositions } from "./documentPositions";
import { reconcileOutline } from "../components/outlineModel";
import { parseScreenplay } from "../parser";

describe("sidebar positions", () => {
  it("maps clicks through edits before the parser updates", () => {
    const text = "INT. FIRST - DAY\n\nAction.\n\nINT. SECOND - DAY";
    const state = EditorState.create({ doc: text });
    const positions = new DocumentPositions(state.doc);
    const transaction = state.update({ changes: { from: 0, insert: "\n\n" } });
    positions.record(state.doc, transaction.state.doc, transaction.changes);
    expect(positions.mapper(text)(4)).toBe(6);
  });

  it("keeps duplicate sections distinct when an identical section is inserted above them", () => {
    const text = "# Act\n\nAction.\n\n# Act\n\nMore.";
    const state = EditorState.create({ doc: text });
    const positions = new DocumentPositions(state.doc);
    const before = reconcileOutline([], parseScreenplay(text).lines);
    const transaction = state.update({ changes: { from: 0, insert: "# Act\n\n" } });
    positions.record(state.doc, transaction.state.doc, transaction.changes);
    const nextText = transaction.state.doc.toString();
    const after = reconcileOutline(before, parseScreenplay(nextText).lines, positions.mapper(text, nextText));
    expect(after[1].key).toBe(before[0].key);
    expect(after[2].key).toBe(before[1].key);
    expect(after[0].key).not.toBe(before[0].key);
  });

  it("falls back safely when a source revision is older than retained history", () => {
    const text = "INT. FIRST - DAY\n\nAction.\n\nINT. SECOND - DAY";
    const current = EditorState.create({ doc: "\n\n" + text + "\n" });
    const positions = new DocumentPositions(current.doc);
    expect(positions.mapper(text)(4)).toBe(6);
  });
});
