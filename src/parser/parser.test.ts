import { describe, it, expect } from "vitest";
import { parseScreenplay, serializeScreenplay, LineType, formatScreenplaySpaces, paginateScreenplay } from "./FountainParser";

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
    
    expect(doc.lines.length).toBe(2);
    expect(doc.lines[0].type).toBe(LineType.character);
    expect(doc.lines[1].type).toBe(LineType.dialogue);
  });

  it("should parse settings comment block at the end", () => {
    const text = "EXT. HOUSE - DAY\n\n/* If you are seeing this and you are not using ActOne, you can delete these. - ACTONE:\n{\n  \"revisionModeEnabled\": true\n}\nEND_ACTONE*/";
    const doc = parseScreenplay(text);
    
    expect(doc.settings.revisionModeEnabled).toBe(true);
    expect(doc.screenplayText).toBe("EXT. HOUSE - DAY");
  });

  it("should serialize screenplay lines and settings block correctly", () => {
    const doc = parseScreenplay("EXT. HOUSE - DAY");
    const settings = { revisionModeEnabled: true };
    const serialized = serializeScreenplay(doc.lines, settings);
    
    expect(serialized).toContain("EXT. HOUSE - DAY");
    expect(serialized).toContain("/* If you are seeing this and you are not using ActOne, you can delete these. - ACTONE:");
    expect(serialized).toContain("revisionModeEnabled");
    expect(serialized).toContain("END_ACTONE*/");
  });

  describe("formatScreenplaySpaces", () => {
    it("should consolidate consecutive empty lines", () => {
      const input = "EXT. HOUSE - DAY\n\n\n\nJohn walks to the door.\n\n\n\nHe knocks.";
      const expected = "EXT. HOUSE - DAY\n\nJohn walks to the door.\n\nHe knocks.";
      expect(formatScreenplaySpaces(input)).toBe(expected);
    });

    it("should strip spaces after Fountain syntax prefixes and around notes", () => {
      const input = ". INT. HOUSE - DAY\n\n# ACT 1\n\n## SCENE 1\n\n= Synopsis of scene\n\n@ John\nHello [[ Note ]].\n\n! Action forced\n\n~ Lyrics here";
      const expected = ".INT. HOUSE - DAY\n\n#ACT 1\n##SCENE 1\n=Synopsis of scene\n\n@John\nHello [[Note]].\n\n!Action forced\n\n~Lyrics here";
      expect(formatScreenplaySpaces(input)).toBe(expected);
    });

    it("should remove all empty lines inside dialogue blocks", () => {
      const input = "JOHN\n\n(nervous)\n\nHello.\n\nALICE\n\nHi.";
      const expected = "JOHN\n(nervous)\nHello.\n\nALICE\nHi.";
      expect(formatScreenplaySpaces(input)).toBe(expected);
    });

    it("should remove all empty lines between outline elements", () => {
      const input = "# ACT 1\n\n= Synopsis 1\n\n## SCENE 1\n\n= Synopsis 2";
      const expected = "#ACT 1\n=Synopsis 1\n##SCENE 1\n=Synopsis 2";
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
  });

  describe("markers parsing", () => {
    it("should parse markers with different colors and descriptions", () => {
      const text = "EXT. HOUSE - DAY\n\nJohn walks [[marker red: Fix action]]\n\nAlice walks [[marker blue: check character]]";
      const doc = parseScreenplay(text);
      expect(doc.lines[2].marker).toBeDefined();
      expect(doc.lines[2].marker?.color).toBe("red");
      expect(doc.lines[2].marker?.description).toBe("Fix action");
      expect(doc.lines[4].marker).toBeDefined();
      expect(doc.lines[4].marker?.color).toBe("blue");
      expect(doc.lines[4].marker?.description).toBe("check character");
    });
  });
});
