import { describe, it, expect } from "vitest";
import { parseScreenplay, serializeScreenplay, LineType, formatScreenplaySpaces, paginateScreenplay, wrapText, getElementMaxWidth, parseSceneHeading } from "./FountainParser";

describe("Fountain Screenplay Parser", () => {
  it("should parse headings and actions correctly", () => {
    const text = "EXT. HOUSE - DAY\n\nJohn walks to the door.";
    const doc = parseScreenplay(text);
    expect(doc.lines.length).toBe(3);
    expect(doc.lines[0].type).toBe(LineType.heading);
    expect(doc.lines[0].text).toBe("EXT. HOUSE - DAY");
    expect(doc.lines[1].type).toBe(LineType.empty);
    expect(doc.lines[2].type).toBe(LineType.action);
    expect(doc.lines[2].text).toBe("John walks to the door.");
  });

  it("should parse dialogue block correctly", () => {
    const text = "JOHN\nHello world.";
    const doc = parseScreenplay(text);
    expect(doc.lines).toHaveLength(2);
    expect(doc.lines[0].type).toBe(LineType.character);
    expect(doc.lines[1].type).toBe(LineType.dialogue);
  });

  it("should serialize screenplay lines", () => {
    const doc = parseScreenplay("EXT. HOUSE - DAY\n\nINT. ROOM - NIGHT");
    const serialized = serializeScreenplay(doc.lines);
    expect(serialized).toBe("EXT. HOUSE - DAY\n\nINT. ROOM - NIGHT");
  });

  describe("wrapText", () => {
    it("returns 1 for empty text", () => {
      expect(wrapText("", 60)).toBe(1);
    });

    it("returns 1 for short text", () => {
      expect(wrapText("Hello world", 60)).toBe(1);
    });

    it("returns multiple lines for long text", () => {
      expect(wrapText("word1 word2 word3 word4 word5 word6 word7", 10)).toBeGreaterThan(1);
    });
  });

  describe("getElementMaxWidth", () => {
    it("returns correct widths for different types", () => {
      expect(getElementMaxWidth(LineType.character, "letter")).toBe(38);
      expect(getElementMaxWidth(LineType.dialogue, "letter")).toBe(35);
      expect(getElementMaxWidth(LineType.parenthetical, "letter")).toBe(25);
      expect(getElementMaxWidth(LineType.heading, "letter")).toBe(60);
      expect(getElementMaxWidth(LineType.action, "letter")).toBe(60);
    });

    it("returns different widths for A4", () => {
      expect(getElementMaxWidth(LineType.character, "a4")).toBe(35);
      expect(getElementMaxWidth(LineType.heading, "a4")).toBe(57);
    });
  });

  describe("formatScreenplaySpaces", () => {
    it("should consolidate consecutive empty lines", () => {
      const input = "EXT. HOUSE - DAY\n\n\n\nJohn walks to the door.\n\n\n\nHe knocks.";
      const expected = "EXT. HOUSE - DAY\n\nJohn walks to the door.\n\nHe knocks.";
      expect(formatScreenplaySpaces(input)).toBe(expected);
    });

    it("should strip spaces after Fountain syntax prefixes and around notes", () => {
      const input = ". INT. HOUSE - DAY\n\n# ACT 1\n\n## SCENE 1\n\n= Synopsis of scene\n\n@ John\nHello [[ Note ]].\n\n! Action forced\n\n~ Lyrics here";
      const expected = ".INT. HOUSE - DAY\n\n#ACT 1\n\n##SCENE 1\n\n=Synopsis of scene\n\n@John\nHello [[Note]].\n\n!Action forced\n\n~Lyrics here";
      expect(formatScreenplaySpaces(input)).toBe(expected);
    });

    it("should remove all empty lines inside dialogue blocks", () => {
      const input = "JOHN\n\n(nervous)\n\nHello.\n\nALICE\n\nHi.";
      const expected = "JOHN\n(nervous)\nHello.\n\nALICE\nHi.";
      expect(formatScreenplaySpaces(input)).toBe(expected);
    });

    it("should preserve blank lines between outline elements (from Enter)", () => {
      const input = "# ACT 1\n\n= Synopsis 1\n\n## SCENE 1\n\n= Synopsis 2";
      const expected = "#ACT 1\n\n=Synopsis 1\n\n##SCENE 1\n\n=Synopsis 2";
      expect(formatScreenplaySpaces(input)).toBe(expected);
    });

    it("should preserve multi-line action paragraphs and separate distinct action paragraphs", () => {
      const input = "Line 1 of action.\nLine 2 of action.\n\n\nAnother paragraph.";
      const expected = "Line 1 of action.\nLine 2 of action.\n\nAnother paragraph.";
      expect(formatScreenplaySpaces(input)).toBe(expected);
    });

    it("should preserve title page and consolidate empty lines within it", () => {
      const input = "Title: Movie\nAuthor: Me\n\n\nEXT. HOUSE - DAY";
      const expected = "Title: Movie\nAuthor: Me\n\nEXT. HOUSE - DAY";
      expect(formatScreenplaySpaces(input)).toBe(expected);
    });

    it("handles only title page content", () => {
      const input = "Title: Movie\nAuthor: Me\n\n";
      const result = formatScreenplaySpaces(input);
      expect(result).toBeTruthy();
    });
  });

  describe("paginateScreenplay", () => {
    it("should prevent orphan headings", () => {
      const lines = [
        ...Array.from({ length: 53 }, (_, idx) => ({
          id: `line-${idx}`,
          text: `Action line ${idx}`,
          type: LineType.action,
          isOutlineElement: false,
        })),
        {
          id: "heading-1",
          text: "INT. HOUSE - DAY",
          type: LineType.heading,
          isOutlineElement: true,
        },
        {
          id: "empty-1",
          text: "",
          type: LineType.empty,
          isOutlineElement: false,
        },
        {
          id: "action-next",
          text: "Next scene action.",
          type: LineType.action,
          isOutlineElement: false,
        }
      ];
      const pageBreaks = paginateScreenplay(lines, "letter");
      expect(pageBreaks).toContain(54);
    });

    it("returns empty breaks for empty screenplay", () => {
      const breaks = paginateScreenplay([], "letter");
      expect(breaks).toEqual([]);
    });

    it("handles page break markers", () => {
      const lines = [
        { id: "a1", text: "Action 1.", type: LineType.action, isOutlineElement: false },
        { id: "pb", text: "===", type: LineType.pageBreak, isOutlineElement: false },
        { id: "a2", text: "Action 2.", type: LineType.action, isOutlineElement: false },
      ];
      const breaks = paginateScreenplay(lines, "letter");
      expect(breaks).toContain(3);
    });

    it("respects A4 paper size", () => {
      const lines = Array.from({ length: 60 }, (_, i) => ({
        id: `line-${i}`,
        text: `Action ${i}`,
        type: LineType.action,
        isOutlineElement: false,
      }));
      const breaks = paginateScreenplay(lines, "a4");
      expect(breaks.length).toBeGreaterThan(0);
    });
  });

  describe("Advanced Fountain parsing", () => {
    it("should parse forced character with @", () => {
      const doc = parseScreenplay("@JOHN\nHello.");
      expect(doc.lines[0].type).toBe(LineType.character);
    });

    it("should parse forced action with !", () => {
      const doc = parseScreenplay("!HE RUNS.");
      expect(doc.lines[0].type).toBe(LineType.action);
    });

    it("should parse transition with > prefix (after title page break)", () => {
      const doc = parseScreenplay("X\n\n> FADE TO:");
      expect(doc.lines[2].type).toBe(LineType.transitionLine);
    });

    it("should parse transition without colon", () => {
      const doc = parseScreenplay("X\n\n> FADE OUT");
      expect(doc.lines[2].type).toBe(LineType.transitionLine);
    });

    it("should parse centered text", () => {
      const doc = parseScreenplay(">THE END<");
      expect(doc.lines[0].type).toBe(LineType.centered);
    });

    it("should parse lyrics with ~", () => {
      const doc = parseScreenplay("~La la la");
      expect(doc.lines[0].type).toBe(LineType.lyrics);
    });

    it("should parse shot with !!", () => {
      const doc = parseScreenplay("!!CLOSE UP");
      expect(doc.lines[0].type).toBe(LineType.shot);
    });

    it("should parse section headings", () => {
      const doc = parseScreenplay("# ACT 1\n## SCENE 1");
      expect(doc.lines[0].type).toBe(LineType.section);
      expect(doc.lines[0].sectionDepth).toBe(1);
      expect(doc.lines[1].type).toBe(LineType.section);
      expect(doc.lines[1].sectionDepth).toBe(2);
    });

    it("should parse synopse lines", () => {
      const doc = parseScreenplay("= Synopsis");
      expect(doc.lines[0].type).toBe(LineType.synopse);
    });

    it("should parse page breaks (===)", () => {
      const doc = parseScreenplay("===");
      expect(doc.lines[0].type).toBe(LineType.pageBreak);
    });

    it("should parse title page", () => {
      const doc = parseScreenplay("Title: My Movie\nAuthor: Me\n\nEXT. HOUSE");
      expect(doc.lines[0].type).toBe(LineType.titlePageTitle);
      expect(doc.lines[1].type).toBe(LineType.titlePageAuthor);
    });

    it("should parse dual dialogue", () => {
      const doc = parseScreenplay("JOHN^\nHello world.\n\nALICE\nHi.");
      expect(doc.lines[0].type).toBe(LineType.dualDialogueCharacter);
      expect(doc.lines[1].type).toBe(LineType.dualDialogue);
    });

    it("should parse scene numbers", () => {
      const doc = parseScreenplay("EXT. HOUSE - DAY #1#");
      expect(doc.lines[0].sceneNumber).toBe("1");
    });

    it("should parse color notes on headings", () => {
      const doc = parseScreenplay("EXT. HOUSE - DAY [[red]]");
      expect(doc.lines[0].color).toBe("red");
    });

    it("should parse color notes with color prefix", () => {
      const doc = parseScreenplay("EXT. HOUSE - DAY [[color blue]]");
      expect(doc.lines[0].color).toBe("blue");
    });

    it("should parse storyline notes", () => {
      const doc = parseScreenplay("EXT. HOUSE - DAY [[storyline A, B]]");
      expect(doc.lines[0].storylines).toEqual(["A", "B"]);
    });

    it("should parse markers with color and description", () => {
      const doc = parseScreenplay("EXT. HOUSE - DAY\n\nJohn walks [[marker red: Fix action]]");
      expect(doc.lines[2].marker).toBeDefined();
      expect(doc.lines[2].marker!.color).toBe("red");
      expect(doc.lines[2].marker!.description).toBe("Fix action");
    });

    it("should parse markers with color only", () => {
      const doc = parseScreenplay("Line [[marker red]]");
      expect(doc.lines[0].marker).toBeDefined();
      expect(doc.lines[0].marker!.color).toBe("red");
      expect(doc.lines[0].marker!.description).toBe("");
    });

    it("should parse markers with default color", () => {
      const doc = parseScreenplay("X\n\nLine [[marker: fix me]]");
      expect(doc.lines[2].marker).toBeDefined();
      expect(doc.lines[2].marker!.color).toBe("orange");
      expect(doc.lines[2].marker!.description).toBe("fix me");
    });

    it("should parse markers without colon separator", () => {
      const doc = parseScreenplay("X\n\nLine [[marker fixme]]");
      expect(doc.lines[2].marker).toBeDefined();
      expect(doc.lines[2].marker!.color).toBe("orange");
      expect(doc.lines[2].marker!.description).toBe("fixme");
    });
  });

  describe("Edge cases", () => {
    it("handles empty input", () => {
      const doc = parseScreenplay("");
      expect(doc.lines).toHaveLength(1);
      expect(doc.screenplayText).toBe("");
    });

    it("handles whitespace-only input", () => {
      const doc = parseScreenplay("   \n\n  ");
      expect(doc.screenplayText).toBe("   \n\n  ");
    });

    it("handles lines starting with numbers", () => {
      const doc = parseScreenplay("42 is the answer.");
      expect(doc.lines[0].type).toBe(LineType.action);
    });

    it("handles parenthetical outside dialogue as action", () => {
      const doc = parseScreenplay("(standalone paren)");
      expect(doc.lines[0].type).toBe(LineType.action);
    });

    it("handles dual dialogue parenthetical", () => {
      const doc = parseScreenplay("JOHN^\n(whispering)\nHello.");
      expect(doc.lines[0].type).toBe(LineType.dualDialogueCharacter);
      expect(doc.lines[1].type).toBe(LineType.dualDialogueParenthetical);
      expect(doc.lines[2].type).toBe(LineType.dualDialogue);
    });

    it("handles lines starting with '..' (not a heading)", () => {
      const doc = parseScreenplay("..not a heading");
      expect(doc.lines[0].type).not.toBe(LineType.heading);
    });
  });

  describe("Marker color parsing", () => {
    it("supports all named colors", () => {
      const colors = ["blue", "brown", "cyan", "green", "magenta", "orange", "pink", "purple", "red", "yellow"];
      for (const c of colors) {
        const doc = parseScreenplay(`X\n\nLine [[marker ${c}: desc]]`);
        expect(doc.lines[2].marker?.color).toBe(c);
      }
    });

    it("supports color only without description", () => {
      const doc = parseScreenplay("X\n\nLine [[marker red]]");
      expect(doc.lines[2].marker?.color).toBe("red");
    });
  });

  describe("parseSceneHeading", () => {
    it("should extract INT setting, location and clean timeOfDay with modifiers", () => {
      const result = parseSceneHeading("INT. TEST - DAY [LATER]");
      expect(result.setting).toBe("INT");
      expect(result.location).toBe("TEST");
      expect(result.timeOfDay).toBe("DAY");
      expect(result.sceneNumber).toBeNull();
    });

    it("should extract EXT setting, location and clean timeOfDay with parentheticals", () => {
      const result = parseSceneHeading("EXT. COFFEE SHOP - NIGHT (LATER)");
      expect(result.setting).toBe("EXT");
      expect(result.location).toBe("COFFEE SHOP");
      expect(result.timeOfDay).toBe("NIGHT");
      expect(result.sceneNumber).toBeNull();
    });

    it("should extract settings, locations and timeOfDay without modifiers", () => {
      const result = parseSceneHeading("INT. ROOM - DAY");
      expect(result.setting).toBe("INT");
      expect(result.location).toBe("ROOM");
      expect(result.timeOfDay).toBe("DAY");
    });

    it("should not extract timeOfDay if there is no hyphen separator", () => {
      const result = parseSceneHeading("INT. TEST");
      expect(result.setting).toBe("INT");
      expect(result.location).toBe("TEST");
      expect(result.timeOfDay).toBeNull();
    });

    it("should extract scene number if present", () => {
      const result = parseSceneHeading("EXT. STREET - NIGHT #1A#");
      expect(result.setting).toBe("EXT");
      expect(result.location).toBe("STREET");
      expect(result.timeOfDay).toBe("NIGHT");
      expect(result.sceneNumber).toBe("1A");
    });

    it("should handle forced headings starting with a dot", () => {
      const result = parseSceneHeading(".EXT. FOREST - DAWN");
      expect(result.setting).toBe("EXT");
      expect(result.location).toBe("FOREST");
      expect(result.timeOfDay).toBe("DAWN");
    });

    it("should extract slash-delimited settings like INT/EXT, EXT/INT, E/I, /EXT, /INT without leaving leftovers", () => {
      const result1 = parseSceneHeading("INT/EXT. BLOOM HOUSE - DAY");
      expect(result1.setting).toBe("INT/EXT");
      expect(result1.location).toBe("BLOOM HOUSE");
      expect(result1.timeOfDay).toBe("DAY");

      const result2 = parseSceneHeading("EXT/INT. HOUSE - NIGHT");
      expect(result2.setting).toBe("EXT/INT");
      expect(result2.location).toBe("HOUSE");
      expect(result2.timeOfDay).toBe("NIGHT");

      const result3 = parseSceneHeading("E/I. COFFEE SHOP - DAY");
      expect(result3.setting).toBe("E/I");
      expect(result3.location).toBe("COFFEE SHOP");

      const result4 = parseSceneHeading("/EXT. BLOOM HOUSE - NIGHT");
      expect(result4.setting).toBe("/EXT");
      expect(result4.location).toBe("BLOOM HOUSE");
    });
  });
});
