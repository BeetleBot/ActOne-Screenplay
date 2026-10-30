import { describe, it, expect } from "vitest";
import { LineType, parseScreenplay } from "../parser";
import { analyzeFountainLine, segmentIntoScenes, getLineContextLabel } from "./translationEngine";

describe("analyzeFountainLine", () => {
  it("marks empty and whitespace lines as non-translatable", () => {
    const res = analyzeFountainLine("   ", { type: LineType.empty });
    expect(res.isTranslatable).toBe(false);
    expect(res.cleanText).toBe("");
  });

  it("handles character cues and forces @ prefix if absent", () => {
    const res = analyzeFountainLine("JOHN", { type: LineType.character });
    expect(res.isTranslatable).toBe(false);
    expect(res.cleanText).toBe("@JOHN");
    expect(res.original).toBe("@JOHN");

    const resWithAt = analyzeFountainLine("@JOHN", { type: LineType.character });
    expect(resWithAt.isTranslatable).toBe(false);
    expect(resWithAt.cleanText).toBe("@JOHN");
    expect(resWithAt.original).toBe("@JOHN");
  });

  it("handles scene headings and forces . prefix if absent", () => {
    const res = analyzeFountainLine("INT. COFFEE SHOP - DAY", { type: LineType.heading });
    expect(res.isTranslatable).toBe(false);
    expect(res.cleanText).toBe("INT. COFFEE SHOP - DAY");
    expect(res.prefix).toBe(".");

    const resWithDot = analyzeFountainLine(".INT. COFFEE SHOP - DAY", { type: LineType.heading });
    expect(resWithDot.isTranslatable).toBe(false);
    expect(resWithDot.cleanText).toBe("INT. COFFEE SHOP - DAY");
  });

  it("handles transitions and forces > prefix if absent", () => {
    const res = analyzeFountainLine("CUT TO:", { type: LineType.transitionLine });
    expect(res.isTranslatable).toBe(false);
    expect(res.cleanText).toBe("CUT TO:");
    expect(res.prefix).toBe("> ");
  });

  it("marks action lines as translatable with ! prefix", () => {
    const res = analyzeFountainLine("John enters the room slowly.", { type: LineType.action });
    expect(res.isTranslatable).toBe(true);
    expect(res.prefix).toBe("!");
    expect(res.cleanText).toBe("John enters the room slowly.");
  });

  it("marks dialogue lines as translatable with no prefix", () => {
    const res = analyzeFountainLine("I never wanted this to happen.", { type: LineType.dialogue });
    expect(res.isTranslatable).toBe(true);
    expect(res.prefix).toBe("");
    expect(res.cleanText).toBe("I never wanted this to happen.");
  });

  it("handles parentheticals with ( and ) prefix/suffix", () => {
    const res = analyzeFountainLine("(whispering softly)", { type: LineType.parenthetical });
    expect(res.isTranslatable).toBe(true);
    expect(res.prefix).toBe("(");
    expect(res.suffix).toBe(")");
    expect(res.cleanText).toBe("whispering softly");
  });

  it("handles shots with !! prefix", () => {
    const res = analyzeFountainLine("CLOSE UP ON GUN", { type: LineType.shot });
    expect(res.isTranslatable).toBe(true);
    expect(res.prefix).toBe("!!");
    expect(res.cleanText).toBe("CLOSE UP ON GUN");
  });

  it("handles synopsis lines with = prefix", () => {
    const res = analyzeFountainLine("= John arrives in London", { type: LineType.synopse });
    expect(res.isTranslatable).toBe(true);
    expect(res.prefix).toBe("=");
    expect(res.cleanText).toBe("John arrives in London");
  });

  it("marks section headers and page breaks as non-translatable", () => {
    const sectionRes = analyzeFountainLine("# Act 1", { type: LineType.section });
    expect(sectionRes.isTranslatable).toBe(false);

    const breakRes = analyzeFountainLine("===", { type: LineType.pageBreak });
    expect(breakRes.isTranslatable).toBe(false);
  });
});

describe("getLineContextLabel", () => {
  it("labels dialogue with the speaker character name", () => {
    const script = `
JOHN
Hello there!
`.trim();
    const parsed = parseScreenplay(script);
    // line 0 is JOHN (character), line 1 is "Hello there!" (dialogue)
    const label = getLineContextLabel(1, parsed.lines);
    expect(label).toBe("[Dialogue: JOHN]");
  });

  it("labels action lines as [Action]", () => {
    const script = `
He sits down slowly.
`.trim();
    const parsed = parseScreenplay(script);
    const label = getLineContextLabel(0, parsed.lines);
    expect(label).toBe("[Action]");
  });

  it("labels parentheticals as [Parenthetical]", () => {
    const script = `
JOHN
(whispering)
Don't look now.
`.trim();
    const parsed = parseScreenplay(script);
    const label = getLineContextLabel(1, parsed.lines);
    expect(label).toBe("[Parenthetical]");
  });
});

describe("segmentIntoScenes", () => {
  it("segments screenplay into individual scenes based on headings", () => {
    const script = `
INT. OFFICE - DAY

JOHN
Hello.

EXT. STREET - NIGHT

SARAH
Goodbye.
`.trim();

    const parsed = parseScreenplay(script);
    const rawLines = script.split(/\r?\n/);
    const analyzed = rawLines.map((l, i) => analyzeFountainLine(l, parsed.lines[i]));

    const scenes = segmentIntoScenes(analyzed, parsed.lines);
    expect(scenes.length).toBe(2);
    expect(scenes[0].heading).toContain("INT. OFFICE - DAY");
    expect(scenes[1].heading).toContain("EXT. STREET - NIGHT");
    expect(scenes[0].sceneIndex).toBe(0);
    expect(scenes[1].sceneIndex).toBe(1);
  });

  it("handles preamble before the first scene heading", () => {
    const script = `
An opening action line before any scene.

INT. CABIN - DAY

BOB
Welcome.
`.trim();

    const parsed = parseScreenplay(script);
    const rawLines = script.split(/\r?\n/);
    const analyzed = rawLines.map((l, i) => analyzeFountainLine(l, parsed.lines[i]));

    const scenes = segmentIntoScenes(analyzed, parsed.lines);
    expect(scenes.length).toBe(2);
    expect(scenes[0].heading).toBe("Preamble");
    expect(scenes[1].heading).toContain("INT. CABIN - DAY");
  });

  it("returns fallback chunk if no headings exist in the document", () => {
    const script = `
Just some action text.
And more action text.
`.trim();

    const parsed = parseScreenplay(script);
    const rawLines = script.split(/\r?\n/);
    const analyzed = rawLines.map((l, i) => analyzeFountainLine(l, parsed.lines[i]));

    const scenes = segmentIntoScenes(analyzed, parsed.lines);
    expect(scenes.length).toBe(1);
    expect(scenes[0].heading).toBe("Document");
  });

  it("adaptively splits very long scenes into numbered parts", () => {
    // Generate a scene with 45 translatable lines
    let script = "INT. LONG SCENE - DAY\n\n";
    for (let i = 0; i < 45; i++) {
      script += `CHARACTER_${i % 3}\nLine number ${i}.\n\n`;
    }

    const parsed = parseScreenplay(script.trim());
    const rawLines = script.trim().split(/\r?\n/);
    const analyzed = rawLines.map((l, i) => analyzeFountainLine(l, parsed.lines[i]));

    const scenes = segmentIntoScenes(analyzed, parsed.lines);
    expect(scenes.length).toBeGreaterThan(1);
    expect(scenes[0].partNumber).toBe(1);
    expect(scenes[0].totalParts).toBe(scenes.length);
    expect(scenes[1].partNumber).toBe(2);
  });
});
