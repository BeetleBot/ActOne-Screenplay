import { describe, it, expect } from "vitest";
import { EditorState } from "@codemirror/state";
import {
  classifyLines, isDialogueType, isDualType, needsBlankAfterEnter,
  LINE_EMPTY, LINE_SECTION, LINE_SYNOPSE, LINE_TITLE_PAGE,
  LINE_HEADING, LINE_ACTION, LINE_CHARACTER, LINE_PARENTHETICAL,
  LINE_DIALOGUE, LINE_DUAL_CHARACTER, LINE_DUAL_PARENTHETICAL,
  LINE_DUAL_DIALOGUE, LINE_TRANSITION, LINE_LYRICS, LINE_PAGEBREAK,
  LINE_CENTERED, LINE_SHOT,
} from "./fountainSyntax";

function classify(text: string): number[] {
  const state = EditorState.create({ doc: text });
  return classifyLines(state.doc);
}

describe("classifyLines", () => {
  it("classifies a heading and action", () => {
    const types = classify("EXT. HOUSE - DAY\n\nJohn walks in.");
    expect(types[0]).toBe(LINE_HEADING);
    expect(types[1]).toBe(LINE_EMPTY);
    expect(types[2]).toBe(LINE_ACTION);
  });

  it("classifies forced heading with period", () => {
    const types = classify(".INT. HOUSE - DAY");
    expect(types[0]).toBe(LINE_HEADING);
  });

  it("classifies section headings", () => {
    const types = classify("# ACT 1\n## SCENE 1");
    expect(types[0]).toBe(LINE_SECTION);
    expect(types[1]).toBe(LINE_SECTION);
  });

  it("classifies synopses", () => {
    const types = classify("= This is a synopsis");
    expect(types[0]).toBe(LINE_SYNOPSE);
  });

  it("classifies page breaks (===)", () => {
    const types = classify("===");
    expect(types[0]).toBe(LINE_PAGEBREAK);
  });

  it("classifies lyrics", () => {
    const types = classify("~La la la");
    expect(types[0]).toBe(LINE_LYRICS);
  });

  it("classifies shots (!!)", () => {
    const types = classify("!!CLOSE UP");
    expect(types[0]).toBe(LINE_SHOT);
  });

  it("classifies forced action (!)", () => {
    const types = classify("!He runs.");
    expect(types[0]).toBe(LINE_ACTION);
  });

  it("classifies centered text", () => {
    const types = classify(">The End<");
    expect(types[0]).toBe(LINE_CENTERED);
  });

  it("classifies transition lines", () => {
    const types = classify("FADE OUT.\n\n> FADE TO:");
    expect(types[2]).toBe(LINE_TRANSITION);
  });

  it("classifies character and dialogue", () => {
    const types = classify("JOHN\nHello there.");
    expect(types[0]).toBe(LINE_CHARACTER);
    expect(types[1]).toBe(LINE_DIALOGUE);
  });

  it("classifies forced character with @", () => {
    const types = classify("@JOHN\nHello.");
    expect(types[0]).toBe(LINE_CHARACTER);
    expect(types[1]).toBe(LINE_DIALOGUE);
  });

  it("classifies dual dialogue character (^)", () => {
    const types = classify("JOHN^\nHello.\n\nALICE\nHi.");
    expect(types[0]).toBe(LINE_DUAL_CHARACTER);
    expect(types[1]).toBe(LINE_DUAL_DIALOGUE);
    expect(types[2]).toBe(LINE_EMPTY);
    expect(types[3]).toBe(LINE_CHARACTER);
    expect(types[4]).toBe(LINE_DIALOGUE);
  });

  it("classifies parentheticals", () => {
    const types = classify("JOHN\n(whispering)\nHello.");
    expect(types[0]).toBe(LINE_CHARACTER);
    expect(types[1]).toBe(LINE_PARENTHETICAL);
    expect(types[2]).toBe(LINE_DIALOGUE);
  });

  it("classifies title page lines", () => {
    const types = classify("Title: My Movie\nAuthor: Me\n\nEXT. HOUSE - DAY");
    expect(types[0]).toBe(LINE_TITLE_PAGE);
    expect(types[1]).toBe(LINE_TITLE_PAGE);
    expect(types[2]).toBe(LINE_EMPTY);
    expect(types[3]).toBe(LINE_HEADING);
  });

  it("classifies empty lines", () => {
    const types = classify("Line 1\n\n\nLine 2");
    const emptyCount = types.filter(t => t === LINE_EMPTY).length;
    expect(emptyCount).toBe(2);
  });
});

describe("isDialogueType", () => {
  it("returns true for dialogue-related types", () => {
    expect(isDialogueType(LINE_CHARACTER)).toBe(true);
    expect(isDialogueType(LINE_DIALOGUE)).toBe(true);
    expect(isDialogueType(LINE_PARENTHETICAL)).toBe(true);
    expect(isDialogueType(LINE_DUAL_CHARACTER)).toBe(true);
    expect(isDialogueType(LINE_DUAL_DIALOGUE)).toBe(true);
    expect(isDialogueType(LINE_DUAL_PARENTHETICAL)).toBe(true);
  });

  it("returns false for non-dialogue types", () => {
    expect(isDialogueType(LINE_ACTION)).toBe(false);
    expect(isDialogueType(LINE_HEADING)).toBe(false);
    expect(isDialogueType(LINE_EMPTY)).toBe(false);
  });
});

describe("isDualType", () => {
  it("returns true for dual dialogue types", () => {
    expect(isDualType(LINE_DUAL_CHARACTER)).toBe(true);
    expect(isDualType(LINE_DUAL_DIALOGUE)).toBe(true);
    expect(isDualType(LINE_DUAL_PARENTHETICAL)).toBe(true);
  });

  it("returns false for non-dual types", () => {
    expect(isDualType(LINE_CHARACTER)).toBe(false);
    expect(isDualType(LINE_DIALOGUE)).toBe(false);
  });
});

describe("classifyLines", () => {
  it("returns same classification for same content", () => {
    const text = "EXT. HOUSE - DAY\n\nJOHN\nHello.";
    const doc1 = EditorState.create({ doc: text }).doc;
    const doc2 = EditorState.create({ doc: text }).doc;

    const result1 = classifyLines(doc1);
    const result2 = classifyLines(doc2);

    expect(result1).toStrictEqual(result2);
  });

  it("returns different arrays for separate calls (no stale cache)", () => {
    const doc = EditorState.create({ doc: "EXT. HOUSE - DAY\n\nJOHN\nHello." }).doc;

    const result1 = classifyLines(doc);
    const result2 = classifyLines(doc);

    expect(result1).toStrictEqual(result2);
    expect(result1).not.toBe(result2);
  });
});

describe("needsBlankAfterEnter", () => {
  it("returns true for heading, action, dialogue, transition, shot, section, synopsis", () => {
    expect(needsBlankAfterEnter(LINE_HEADING)).toBe(true);
    expect(needsBlankAfterEnter(LINE_ACTION)).toBe(true);
    expect(needsBlankAfterEnter(LINE_DIALOGUE)).toBe(true);
    expect(needsBlankAfterEnter(LINE_DUAL_DIALOGUE)).toBe(true);
    expect(needsBlankAfterEnter(LINE_TRANSITION)).toBe(true);
    expect(needsBlankAfterEnter(LINE_SHOT)).toBe(true);
    expect(needsBlankAfterEnter(LINE_SECTION)).toBe(true);
    expect(needsBlankAfterEnter(LINE_SYNOPSE)).toBe(true);
  });

  it("returns false for other types", () => {
    expect(needsBlankAfterEnter(LINE_EMPTY)).toBe(false);
    expect(needsBlankAfterEnter(LINE_CHARACTER)).toBe(false);
    expect(needsBlankAfterEnter(LINE_PARENTHETICAL)).toBe(false);
  });
});
