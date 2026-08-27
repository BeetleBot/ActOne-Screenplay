import { describe, it, expect } from "vitest";
import { EditorState } from "@codemirror/state";
import { lineTypesField } from "./fountainSyntax";
import { autoContdField, updateAutoContdEffect } from "./autoContd";

function createEditor(doc: string, selectionHead?: number) {
  return EditorState.create({
    doc,
    selection: selectionHead !== undefined ? { anchor: selectionHead } : undefined,
    extensions: [lineTypesField, autoContdField],
  });
}

function getDecorationPositions(state: EditorState): number[] {
  const fieldVal = state.field(autoContdField);
  const positions: number[] = [];
  const iter = fieldVal.decorations.iter();
  while (iter.value !== null) {
    positions.push(iter.from);
    iter.next();
  }
  return positions;
}

describe("autoContdField", () => {
  it("appends CONT'D decoration when same character speaks consecutively", () => {
    const text = [
      "JOHN",
      "Hello there.",
      "",
      "John looks around.",
      "",
      "JOHN",
      "Anyone home?",
    ].join("\n");

    const state = createEditor(text);
    const positions = getDecorationPositions(state);

    const line6 = state.doc.line(6);
    expect(positions).toEqual([line6.to]);
  });

  it("does not append CONT'D when different characters speak", () => {
    const text = [
      "JOHN",
      "Hello there.",
      "",
      "MARY",
      "Hi John.",
    ].join("\n");

    const state = createEditor(text);
    const positions = getDecorationPositions(state);
    expect(positions).toEqual([]);
  });

  it("does not duplicate CONT'D if already present in character line", () => {
    const text = [
      "JOHN",
      "Hello there.",
      "",
      "JOHN (CONT'D)",
      "Still here.",
    ].join("\n");

    const state = createEditor(text);
    const positions = getDecorationPositions(state);
    expect(positions).toEqual([]);
  });

  it("appends CONT'D when character has parenthetical extension", () => {
    const text = [
      "JOHN (V.O.)",
      "I was thinking...",
      "",
      "JOHN (V.O.)",
      "About the past.",
    ].join("\n");

    const state = createEditor(text);
    const positions = getDecorationPositions(state);

    const line4 = state.doc.line(4);
    expect(positions).toEqual([line4.to]);
  });

  it("does not append CONT'D when the cursor is on the active character line", () => {
    const text = [
      "JOHN",
      "Hello there.",
      "",
      "JOHN",
      "Anyone home?",
    ].join("\n");

    const line4Start = text.indexOf("JOHN\nAnyone");
    const state = createEditor(text, line4Start + 2);
    const positions = getDecorationPositions(state);
    expect(positions).toEqual([]);
  });

  it("removes decorations when disabled via updateAutoContdEffect", () => {
    const text = [
      "JOHN",
      "Hello there.",
      "",
      "JOHN",
      "Anyone home?",
    ].join("\n");

    let state = createEditor(text);
    expect(getDecorationPositions(state).length).toBe(1);

    const tr = state.update({
      effects: updateAutoContdEffect.of(false),
    });
    state = tr.state;
    expect(getDecorationPositions(state)).toEqual([]);
  });
});
