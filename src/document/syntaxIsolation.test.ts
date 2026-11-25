import { expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { parseScreenplay } from "../parser";
import { fountainHighlightField, lineTypesField, updateParsedDocEffect } from "../editor/fountainSyntax";

it("preserves syntax decorations on pagination-only updates and still stores current layout", () => {
  const text = "INT. HIVE - DAY\n\nA bee flies.";
  const doc = parseScreenplay(text);
  let state = EditorState.create({ doc: text, extensions: [lineTypesField, fountainHighlightField] });
  state = state.update({ effects: updateParsedDocEffect.of(doc) }).state;
  const decorations = state.field(fountainHighlightField).decorations;
  const paginated = { ...doc, pageBreaks: [2] };
  state = state.update({ effects: updateParsedDocEffect.of(paginated) }).state;
  expect(state.field(fountainHighlightField).decorations).toBe(decorations);
  expect(state.field(fountainHighlightField).doc).toBe(paginated);
  const edited = parseScreenplay(text + "\nMore action.");
  state = state.update({ effects: updateParsedDocEffect.of(edited) }).state;
  expect(state.field(fountainHighlightField).decorations).not.toBe(decorations);
});
