import { describe, it, expect } from "vitest";
import { EditorState } from "@codemirror/state";
import { lineTypesField, LINE_CHARACTER, LINE_DIALOGUE } from "./fountainSyntax";

describe("useScriptCodeMirror extensions & behaviors", () => {
  it("computes lineTypesField correctly within Fountain state", () => {
    const text = "EXT. HOUSE - DAY\n\nJOHN\nHello world.";
    const state = EditorState.create({
      doc: text,
      extensions: [lineTypesField],
    });

    const types = state.field(lineTypesField);
    expect(types).toBeDefined();
    expect(types[0]).toBe(10);
    expect(types[2]).toBe(LINE_CHARACTER);
    expect(types[3]).toBe(LINE_DIALOGUE);
  });
});
