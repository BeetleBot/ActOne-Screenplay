import { describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { lineTypesField } from "./fountainSyntax";
import { getSceneBlockAtLine } from "./sceneBlock";

function createState(doc: string) {
  return EditorState.create({ doc, extensions: [lineTypesField] });
}

describe("getSceneBlockAtLine", () => {
  it("returns the current scene as the original Fountain text", () => {
    const text = [
      "INT. HOUSE - NIGHT",
      "",
      "BOB",
      "I *heard* something.",
      "",
      "EXT. STREET - DAY",
      "",
      "ALICE",
      "Run!",
    ].join("\n");
    const state = createState(text);

    expect(getSceneBlockAtLine(state, 4)).toEqual({
      headingLine: 1,
      text: "INT. HOUSE - NIGHT\n\nBOB\nI *heard* something.\n\n",
    });
  });

  it("uses the selected scene heading when the cursor is on a heading", () => {
    const state = createState("INT. HOUSE - NIGHT\n\nBOB\nHello.\n\nINT. STREET - DAY\n\nALICE\nHi.");
    expect(getSceneBlockAtLine(state, 6)).toEqual({
      headingLine: 6,
      text: "INT. STREET - DAY\n\nALICE\nHi.",
    });
  });

  it("returns null when there is no scene heading before the requested line", () => {
    const state = createState("A title\n\nAn opening note.");
    expect(getSceneBlockAtLine(state, 3)).toBeNull();
  });
});
