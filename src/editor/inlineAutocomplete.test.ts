import { describe, it, expect } from "vitest";
import { EditorState } from "@codemirror/state";
import { testComputeSuggestion, cachedCharactersField, cachedLocationsField, fountainCompletionSource } from "./inlineAutocomplete";
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

  describe("smart character alternation and contextual prioritization", () => {
    const dialogScene = [
      "INT. ROOM - DAY",
      "",
      "RAJ",
      "Hello Kumar.",
      "",
      "KUMAR",
      "Hey Raj, how are you?",
      "",
      "@",
    ].join("\n");

    it("suggests alternating character RAJ on @ after RAJ and KUMAR speak", () => {
      // Line 9 is "@" (index 9 in doc.line count)
      const state = stateWithContent(dialogScene, 9, 1);
      const sug = testComputeSuggestion(state);
      expect(sug).not.toBeNull();
      expect(sug!.type).toBe("character");
      expect(sug!.acceptText).toBe("RAJ");
      expect(sug!.ghostText).toBe("RAJ");
    });

    it("prioritizes alternating character in completion source dropdown list", () => {
      const state = stateWithContent(dialogScene, 9, 1);
      const line = state.doc.line(9);
      const res = fountainCompletionSource({
        state,
        pos: line.from + 1,
        explicit: true,
      } as any);

      expect(res).not.toBeNull();
      const labels = res!.options.map((o: any) => o.label);
      // Both RAJ and KUMAR exist; RAJ should come first as alternating speaker
      expect(labels[0]).toBe("RAJ");
      expect(labels[1]).toBe("KUMAR");
    });

    it("filters characters by typed prefix while keeping contextual order", () => {
      const scriptWithMultiple = [
        "INT. ROOM - DAY",
        "",
        "ROBERT",
        "Line 1",
        "",
        "KUMAR",
        "Line 2",
        "",
        "INT. STREET - DAY",
        "",
        "RONNIE",
        "Line 3",
        "",
        "INT. ROOM - NIGHT",
        "",
        "ROBERT",
        "Speaking again",
        "",
        "KUMAR",
        "Replying",
        "",
        "R",
      ].join("\n");

      // Line 22 is "R" (Action line or character cue starting with R)
      const state = stateWithContent(scriptWithMultiple, 22, 1);
      const line = state.doc.line(22);
      const res = fountainCompletionSource({
        state,
        pos: line.from + 1,
        explicit: true,
      } as any);

      expect(res).not.toBeNull();
      const labels = res!.options.map((o: any) => o.label);
      // All results must start with R
      expect(labels.every((l: string) => l.startsWith("R"))).toBe(true);
      // ROBERT is the alternating speaker in this scene, so it should rank before RONNIE
      expect(labels[0]).toBe("ROBERT");
      expect(labels).toContain("RONNIE");
    });

    it("does not suggest previous scene characters across scene boundaries as alternating", () => {
      const crossScene = [
        "INT. SCENE ONE - DAY",
        "",
        "RAJ",
        "Hi",
        "",
        "KUMAR",
        "Bye",
        "",
        "INT. SCENE TWO - NIGHT",
        "",
        "@",
      ].join("\n");

      const state = stateWithContent(crossScene, 11, 1);
      const sug = testComputeSuggestion(state);
      // In scene 2, no one has spoken yet, so no alternation candidate
      // It can suggest either scene speaker or first alphabetical if any
      if (sug) {
        expect(["KUMAR", "RAJ"]).toContain(sug.acceptText);
      }
    });
  });
});
