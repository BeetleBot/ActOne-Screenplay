import { describe, it, expect } from "vitest";
import { fixFormatting } from "./fixFormatting";

describe("Fix Formatting Module", () => {
  it("should remove blank lines inside dialogue blocks", () => {
    const input = "JOHN\n\n(nervous)\n\nHello.\n\nALICE\n\nHi.";
    const expected = "JOHN\n(nervous)\nHello.\n\nALICE\nHi.";
    expect(fixFormatting(input).formattedText).toBe(expected);
  });

  it("should consolidate 2+ consecutive blank lines down to 1", () => {
    const input = "EXT. HOUSE - DAY\n\n\n\nJohn walks to the door.\n\n\n\nHe knocks.";
    const expected = "EXT. HOUSE - DAY\n\nJohn walks to the door.\n\nHe knocks.";
    expect(fixFormatting(input).formattedText).toBe(expected);
  });

  it("should strip trailing space after forced syntax prefixes and around note brackets", () => {
    const input = ". INT. HOUSE - DAY\n\n# ACT 1\n\n= Synopsis of scene\n\n@ John\nHello [[ Note ]].\n\n! Action forced\n\n~ Lyrics here";
    const expected = ".INT. HOUSE - DAY\n\n#ACT 1\n\n=Synopsis of scene\n\n@John\nHello [[Note]].\n\n!Action forced\n\n~Lyrics here";
    expect(fixFormatting(input).formattedText).toBe(expected);
  });

  it("should preserve multi-line action paragraphs and separate distinct action paragraphs", () => {
    const input = "Line 1 of action.\nLine 2 of action.\n\n\nAnother paragraph.";
    const expected = "Line 1 of action.\nLine 2 of action.\n\nAnother paragraph.";
    expect(fixFormatting(input).formattedText).toBe(expected);
  });

  it("should preserve title page metadata while consolidating extra blank lines", () => {
    const input = "Title: Movie\nAuthor: Me\n\n\nEXT. HOUSE - DAY";
    const expected = "Title: Movie\nAuthor: Me\n\nEXT. HOUSE - DAY";
    expect(fixFormatting(input).formattedText).toBe(expected);
  });

  it("should return detailed change statistics", () => {
    const input = "JOHN\n\n(nervous)\n\nHello.\n\n. INT. HOUSE - DAY\n\n\n\nAction [[ Note ]].";
    const report = fixFormatting(input);
    expect(report.totalChanges).toBeGreaterThan(0);
    expect(report.linesRemoved).toBeGreaterThan(0);
    expect(report.dialogueSpacesCleaned).toBe(3);
    expect(report.syntaxPrefixesTrimmed).toBe(1);
    expect(report.notesTrimmed).toBe(1);
  });
});
