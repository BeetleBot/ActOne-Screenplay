import { describe, it, expect } from "vitest";
import { EditorState } from "@codemirror/state";
import {
  classifyLines, isDialogueType, isDualType, needsBlankAfterEnter,
  computeFountainDecorations, lineTypesField,
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

  it("returns false for character, parenthetical, and empty", () => {
    expect(needsBlankAfterEnter(LINE_EMPTY)).toBe(false);
    expect(needsBlankAfterEnter(LINE_CHARACTER)).toBe(false);
    expect(needsBlankAfterEnter(LINE_PARENTHETICAL)).toBe(false);
  });
});

describe("computeFountainDecorations viewport bounds", () => {
  it("computes decorations restricted to visibleRanges", () => {
    const lines = [];
    for (let i = 1; i <= 500; i++) {
      lines.push(`EXT. LOCATION ${i} - DAY\n\nAction line ${i}.\n`);
    }
    const text = lines.join("\n");
    const state = EditorState.create({ doc: text, extensions: [lineTypesField] });
    const types = state.field(lineTypesField);

    // Full doc compute
    const fullDecos = computeFountainDecorations(state, types, false);
    expect(fullDecos.size).toBeGreaterThan(0);

    // Viewport compute for lines 1..10
    const line10To = state.doc.line(10).to;
    const viewportDecos = computeFountainDecorations(state, types, false, [{ from: 0, to: line10To }]);
    expect(viewportDecos.size).toBeGreaterThan(0);
    expect(viewportDecos.size).toBeLessThan(fullDecos.size);
  });
});

describe("formatted and highlighted elements in classifyLines", () => {
  it("classifies highlighted character cue and following dialogue", () => {
    const types = classify("==COOPER==\nHello there.");
    expect(types[0]).toBe(LINE_CHARACTER);
    expect(types[1]).toBe(LINE_DIALOGUE);
  });

  it("classifies highlighted character with extensions", () => {
    const types1 = classify("==COOPER== (V.O.)\nI knew it.");
    expect(types1[0]).toBe(LINE_CHARACTER);
    expect(types1[1]).toBe(LINE_DIALOGUE);

    const types2 = classify("==COOPER (V.O.)==\nI knew it.");
    expect(types2[0]).toBe(LINE_CHARACTER);
    expect(types2[1]).toBe(LINE_DIALOGUE);
  });

  it("classifies bold, italic, and underlined character cues", () => {
    const boldTypes = classify("**COOPER**\nHello.");
    expect(boldTypes[0]).toBe(LINE_CHARACTER);
    expect(boldTypes[1]).toBe(LINE_DIALOGUE);

    const italicTypes = classify("*COOPER*\nHello.");
    expect(italicTypes[0]).toBe(LINE_CHARACTER);
    expect(italicTypes[1]).toBe(LINE_DIALOGUE);

    const underlineTypes = classify("_COOPER_\nHello.");
    expect(underlineTypes[0]).toBe(LINE_CHARACTER);
    expect(underlineTypes[1]).toBe(LINE_DIALOGUE);
  });

  it("classifies dual dialogue with highlighting", () => {
    const types = classify("==COOPER==^\nHello.\n\nALICE\nHi.");
    expect(types[0]).toBe(LINE_DUAL_CHARACTER);
    expect(types[1]).toBe(LINE_DUAL_DIALOGUE);
    expect(types[2]).toBe(LINE_EMPTY);
    expect(types[3]).toBe(LINE_CHARACTER);
    expect(types[4]).toBe(LINE_DIALOGUE);
  });

  it("classifies forced characters with highlighting", () => {
    const types1 = classify("@==COOPER==\nHello.");
    expect(types1[0]).toBe(LINE_CHARACTER);
    expect(types1[1]).toBe(LINE_DIALOGUE);

    const types2 = classify("==@COOPER==\nHello.");
    expect(types2[0]).toBe(LINE_CHARACTER);
    expect(types2[1]).toBe(LINE_DIALOGUE);
  });

  it("classifies highlighted parentheticals within dialogue blocks", () => {
    const types = classify("COOPER\n==(whispering)==\nHello there.");
    expect(types[0]).toBe(LINE_CHARACTER);
    expect(types[1]).toBe(LINE_PARENTHETICAL);
    expect(types[2]).toBe(LINE_DIALOGUE);

    const typesBoth = classify("==COOPER==\n==(whispering)==\nHello there.");
    expect(typesBoth[0]).toBe(LINE_CHARACTER);
    expect(typesBoth[1]).toBe(LINE_PARENTHETICAL);
    expect(typesBoth[2]).toBe(LINE_DIALOGUE);
  });

  it("classifies bold, italic, and underlined parentheticals", () => {
    const typesBold = classify("COOPER\n(**whispering**)\nHello there.");
    expect(typesBold[0]).toBe(LINE_CHARACTER);
    expect(typesBold[1]).toBe(LINE_PARENTHETICAL);
    expect(typesBold[2]).toBe(LINE_DIALOGUE);

    const typesUnderline = classify("COOPER\n(_whispering_)\nHello there.");
    expect(typesUnderline[0]).toBe(LINE_CHARACTER);
    expect(typesUnderline[1]).toBe(LINE_PARENTHETICAL);
    expect(typesUnderline[2]).toBe(LINE_DIALOGUE);
  });

  it("classifies highlighted and formatted scene headings", () => {
    const typesHighlight = classify("==INT. ROOM - DAY==\n\nJohn enters.");
    expect(typesHighlight[0]).toBe(LINE_HEADING);
    expect(typesHighlight[1]).toBe(LINE_EMPTY);
    expect(typesHighlight[2]).toBe(LINE_ACTION);

    const typesBold = classify("**INT. ROOM - DAY**\n\nJohn enters.");
    expect(typesBold[0]).toBe(LINE_HEADING);
    expect(typesBold[1]).toBe(LINE_EMPTY);
    expect(typesBold[2]).toBe(LINE_ACTION);

    const typesUnderline = classify("_EXT. PARK - NIGHT_\n\nJohn walks.");
    expect(typesUnderline[0]).toBe(LINE_HEADING);
    expect(typesUnderline[1]).toBe(LINE_EMPTY);
    expect(typesUnderline[2]).toBe(LINE_ACTION);

    const typesSceneNum = classify("==EXT. BEACH - SUNSET #42#==\n\nWaves crash.");
    expect(typesSceneNum[0]).toBe(LINE_HEADING);
  });

  it("classifies forced scene headings with formatting", () => {
    const typesForced1 = classify(".==INT. SECRET ROOM - NIGHT==\n\nDarkness.");
    expect(typesForced1[0]).toBe(LINE_HEADING);

    const typesForced2 = classify("==.INT. SECRET ROOM - NIGHT==\n\nDarkness.");
    expect(typesForced2[0]).toBe(LINE_HEADING);
  });

  it("classifies highlighted and formatted transitions", () => {
    const typesHighlight = classify("John leaves.\n\n==CUT TO:==");
    expect(typesHighlight[2]).toBe(LINE_TRANSITION);

    const typesForced = classify("John leaves.\n\n>==SMASH CUT TO:==");
    expect(typesForced[2]).toBe(LINE_TRANSITION);

    const typesBold = classify("John leaves.\n\n**CUT TO:**");
    expect(typesBold[2]).toBe(LINE_TRANSITION);
  });

  it("classifies highlighted shots", () => {
    const types1 = classify("==!!CLOSE UP==");
    expect(types1[0]).toBe(LINE_SHOT);

    const types2 = classify("!!==CLOSE UP==");
    expect(types2[0]).toBe(LINE_SHOT);
  });

  it("classifies highlighted centered text", () => {
    const types = classify(">==THE END==<");
    expect(types[0]).toBe(LINE_CENTERED);
  });

  it("classifies highlighted lyrics", () => {
    const types1 = classify("==~La la la==");
    expect(types1[0]).toBe(LINE_LYRICS);

    const types2 = classify("~==La la la==");
    expect(types2[0]).toBe(LINE_LYRICS);
  });

  it("classifies highlighted action lines correctly", () => {
    const types = classify("He walks in.\n==Quickly==, he hides behind the door.");
    expect(types[0]).toBe(LINE_ACTION);
    expect(types[1]).toBe(LINE_ACTION);
  });

  it("disambiguates synopsis vs highlight correctly", () => {
    const typesSynopse = classify("= This is a synopsis with ==highlighted words==");
    expect(typesSynopse[0]).toBe(LINE_SYNOPSE);

    const typesPlainSynopse = classify("= Simple synopsis");
    expect(typesPlainSynopse[0]).toBe(LINE_SYNOPSE);

    const typesPageBreak = classify("===");
    expect(typesPageBreak[0]).toBe(LINE_PAGEBREAK);
  });

  it("computes both line decoration and inline highlight decoration", () => {
    const text = "==COOPER==\nHello there.";
    const state = EditorState.create({ doc: text, extensions: [lineTypesField] });
    const types = state.field(lineTypesField);
    expect(types[0]).toBe(LINE_CHARACTER);

    const decos = computeFountainDecorations(state, types, false);
    let hasLineCharDeco = false;
    let hasInlineHighlightDeco = false;

    decos.between(0, text.length, (from, to, value) => {
      const cls = (value.spec as { class?: string }).class || "";
      if (cls.includes("cm-fountain-character")) {
        hasLineCharDeco = true;
      }
      if (cls.includes("cm-fountain-highlight")) {
        hasInlineHighlightDeco = true;
        expect(from).toBe(2);
        expect(to).toBe(8); // "COOPER"
      }
    });

    expect(hasLineCharDeco).toBe(true);
    expect(hasInlineHighlightDeco).toBe(true);
  });

  it("handles incremental lineTypesField update when character is highlighted", () => {
    const initialText = "COOPER\nHello there.";
    const state = EditorState.create({ doc: initialText, extensions: [lineTypesField] });
    expect(state.field(lineTypesField)[0]).toBe(LINE_CHARACTER);
    expect(state.field(lineTypesField)[1]).toBe(LINE_DIALOGUE);

    // Replace COOPER with ==COOPER==
    const tr = state.update({
      changes: { from: 0, to: 6, insert: "==COOPER==" },
    });
    const updatedTypes = tr.state.field(lineTypesField);
    expect(updatedTypes[0]).toBe(LINE_CHARACTER);
    expect(updatedTypes[1]).toBe(LINE_DIALOGUE);
  });
});

