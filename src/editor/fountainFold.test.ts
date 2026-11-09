import { describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { lineTypesField } from "./fountainSyntax";
import { getFountainFoldRange, getSectionDepth } from "./fountainFold";

function createState(doc: string) {
  return EditorState.create({ doc, extensions: [lineTypesField] });
}

describe("fountainFold", () => {
  it("determines section depth correctly", () => {
    expect(getSectionDepth("# ACT I")).toBe(1);
    expect(getSectionDepth("## SEQUENCE 1")).toBe(2);
    expect(getSectionDepth("### LEGACY SUBSECTION")).toBe(2);
    expect(getSectionDepth("INT. ROOM - DAY")).toBe(1);
  });

  it("calculates scene folding range stopping at next scene", () => {
    const text = [
      "INT. ROOM - DAY",
      "Alice looks around.",
      "",
      "INT. HALLWAY - CONTINUOUS",
      "Bob waits outside."
    ].join("\n");
    const state = createState(text);

    const range = getFountainFoldRange(state, 1);
    expect(range).not.toBeNull();
    // Fold should start at end of line 1 and extend to end of line 3
    const fromLine = state.doc.lineAt(range!.from).number;
    const toLine = state.doc.lineAt(range!.to).number;
    expect(fromLine).toBe(1);
    expect(toLine).toBe(3);
  });

  it("calculates scene folding range stopping at a section", () => {
    const text = [
      "INT. ROOM - DAY",
      "Alice leaves.",
      "",
      "# ACT II",
      "INT. OTHER - DAY"
    ].join("\n");
    const state = createState(text);

    const range = getFountainFoldRange(state, 1);
    expect(range).not.toBeNull();
    const toLine = state.doc.lineAt(range!.to).number;
    expect(toLine).toBe(3);
  });

  it("calculates subsection folding range stopping at next subsection or higher section", () => {
    const text = [
      "# ACT I",
      "## SEQUENCE 1",
      "INT. ROOM - DAY",
      "Action 1.",
      "## SEQUENCE 2",
      "INT. OTHER - DAY",
      "# ACT II"
    ].join("\n");
    const state = createState(text);

    // Sequence 1 (line 2) folds through line 4 (before Sequence 2 at line 5)
    const seq1Range = getFountainFoldRange(state, 2);
    expect(seq1Range).not.toBeNull();
    expect(state.doc.lineAt(seq1Range!.to).number).toBe(4);

    // Act I (line 1) folds through line 6 (before Act II at line 7)
    const act1Range = getFountainFoldRange(state, 1);
    expect(act1Range).not.toBeNull();
    expect(state.doc.lineAt(act1Range!.to).number).toBe(6);
  });

  it("treats legacy deeper prefixes as peer subsections, never a third level", () => {
    const state = createState("# ACT I\n## SEQ A\nBody\n### LEGACY SEQ B\nBody\n# ACT II");
    expect(state.doc.lineAt(getFountainFoldRange(state, 2)!.to).number).toBe(3);
    expect(state.doc.lineAt(getFountainFoldRange(state, 4)!.to).number).toBe(5);
    expect(state.doc.lineAt(getFountainFoldRange(state, 1)!.to).number).toBe(5);
  });

  it("returns null for non-heading, non-section lines", () => {
    const state = createState("INT. ROOM - DAY\nAction here.");
    expect(getFountainFoldRange(state, 2)).toBeNull();
  });
});
