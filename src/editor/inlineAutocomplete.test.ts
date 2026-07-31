import { describe, it, expect } from "vitest";
import { EditorState } from "@codemirror/state";
import { testComputeSuggestion, cachedCharactersField, cachedLocationsField } from "./inlineAutocomplete";
import { lineTypesField } from "./fountainSyntax";

const testExtensions = [lineTypesField, cachedCharactersField, cachedLocationsField];

function stateWithContent(text: string, cursorLine: number, cursorCol: number) {
  const doc = EditorState.create({ doc: text }).doc;
  const line = doc.line(cursorLine);
  return EditorState.create({
    doc: text,
    selection: { anchor: line.from + cursorCol, head: line.from + cursorCol },
    extensions: testExtensions,
  });
}

function createState(text: string) {
  const doc = EditorState.create({ doc: text }).doc;
  const lastLine = doc.lines;
  const line = doc.line(lastLine);
  return EditorState.create({
    doc: text,
    selection: { anchor: line.from + 6, head: line.from + 6 },
    extensions: testExtensions,
  });
}

describe("computeSuggestion", () => {
  const preamble = "INT. HIVE - DAY\n\nINT. ROYAL CHAMBER - NIGHT\n\n";

  it("suggests location on scene heading with INT. prefix", () => {
    const state = stateWithContent(preamble + "INT. H", 5, 6);
    const sug = testComputeSuggestion(state);
    expect(sug).not.toBeNull();
    expect(sug!.type).toBe("location");
    expect(sug!.ghostText).toBe("IVE");
  });

  it("suggests location on dot-prefix heading", () => {
    const state = stateWithContent(preamble + ".H", 5, 2);
    const sug = testComputeSuggestion(state);
    expect(sug).not.toBeNull();
    expect(sug!.type).toBe("location");
    expect(sug!.ghostText).toBe("IVE");
  });

  it("suggests nothing when location is fully typed", () => {
    const state = stateWithContent(preamble + "INT. HIVE", 5, 9);
    const sug = testComputeSuggestion(state);
    expect(sug).toBeNull();
  });

  it("suggests character name on character line", () => {
    const state = stateWithContent("BARRY\n\nB", 3, 1);
    const sug = testComputeSuggestion(state);
    expect(sug).not.toBeNull();
    expect(sug!.type).toBe("character");
    expect(sug!.acceptText).toBe("BARRY");
  });

  it("suggests nothing on empty line", () => {
    const state = stateWithContent(preamble + "\n", 6, 0);
    const sug = testComputeSuggestion(state);
    expect(sug).toBeNull();
  });

  it("suggests nothing when cursor is not at end of line", () => {
    const doc = preamble + "INT. HIV";
    const state = EditorState.create({
      doc,
      selection: { anchor: doc.length - 3, head: doc.length - 3 },
    });
    const sug = testComputeSuggestion(state);
    expect(sug).toBeNull();
  });

  it("suggests nothing when no matching location exists", () => {
    const state = stateWithContent(preamble + "INT. Z", 5, 6);
    const sug = testComputeSuggestion(state);
    expect(sug).toBeNull();
  });

  it("suggests from multiple existing headings", () => {
    const state = stateWithContent(preamble + "INT. R", 5, 6);
    const sug = testComputeSuggestion(state);
    expect(sug).not.toBeNull();
    expect(sug!.type).toBe("location");
    expect(sug!.ghostText).toBe("OYAL CHAMBER");
  });

  it("suggests from headings with notes and scene numbers", () => {
    const state = createState(
      "INT. ROYAL CHAMBER - DAWN [[red]] #1#\n\nINT. R"
    );
    const sug = testComputeSuggestion(state);
    expect(sug).not.toBeNull();
    expect(sug!.type).toBe("location");
  });

  it("suggests from multiple real BeeDetective headings", () => {
    const state = createState(
      "INT. ROYAL CHAMBER - DAWN [[red]] #1#\n" +
      "\n" +
      "INT. DETECTIVE'S OFFICE - MORNING [[color blue]] #2#\n" +
      "\n" +
      "INT. MORGUE - DAY [[green]] #4#\n" +
      "\n" +
      "INT. R"
    );
    const sug = testComputeSuggestion(state);
    expect(sug).not.toBeNull();
    expect(sug!.type).toBe("location");
    expect(sug!.ghostText).toBe("OYAL CHAMBER");
  });

  it("suggests V.O. when ( typed on character line", () => {
    const state = stateWithContent("QUEEN ASTER\n\nQUEEN ASTER (", 3, 13);
    const sug = testComputeSuggestion(state);
    expect(sug).not.toBeNull();
    expect(sug!.type).toBe("extension");
    expect(sug!.ghostText).toBe("V.O.)");
    expect(sug!.acceptText).toBe("(V.O.)");
  });

  it("suggests O.S. when (O typed on character line", () => {
    const state = stateWithContent("QUEEN ASTER\n\nQUEEN ASTER (O", 3, 14);
    const sug = testComputeSuggestion(state);
    expect(sug).not.toBeNull();
    expect(sug!.type).toBe("extension");
    expect(sug!.ghostText).toBe(".S.)");
    expect(sug!.acceptText).toBe("(O.S.)");
  });

  it("suggests nothing for non-matching extension prefix", () => {
    const state = stateWithContent("QUEEN ASTER\n\nQUEEN ASTER (Z", 3, 14);
    const sug = testComputeSuggestion(state);
    expect(sug).toBeNull();
  });

  it("suggests nothing when extension is complete", () => {
    const state = stateWithContent("QUEEN ASTER\n\nQUEEN ASTER (V.O.)", 3, 18);
    const sug = testComputeSuggestion(state);
    expect(sug).toBeNull();
  });

  it("suggests name on character line without parens", () => {
    const state = stateWithContent("QUEEN ASTER\n\nQ", 3, 1);
    const sug = testComputeSuggestion(state);
    expect(sug).not.toBeNull();
    expect(sug!.type).toBe("character");
    expect(sug!.acceptText).toBe("QUEEN ASTER");
  });
});
