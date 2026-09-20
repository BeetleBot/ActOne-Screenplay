import { describe, it, expect } from "vitest";
import { stripFountainForExport } from "./fountainExport";

describe("stripFountainForExport", () => {
  const defaultOptions = {
    sections: false,
    synopses: false,
    titlePage: true,
  };

  describe("Scene Headings", () => {
    it("converts standard lowercase scene headings to uppercase", () => {
      const input = "int. coffee shop - day\n\nJohn sits at the bar.\n\next. street - night\n\nRain pours.";
      const result = stripFountainForExport(input, defaultOptions);
      expect(result).toContain("INT. COFFEE SHOP - DAY");
      expect(result).toContain("EXT. STREET - NIGHT");
      expect(result).toContain("John sits at the bar.");
      expect(result).toContain("Rain pours.");
    });

    it("converts I/E, E/I headings and preserves scene numbers", () => {
      const input = "i/e moving car - continuous #12A#\n\nThey drive fast.";
      const result = stripFountainForExport(input, defaultOptions);
      expect(result).toContain("I/E MOVING CAR - CONTINUOUS #12A#");
      expect(result).toContain("They drive fast.");
    });

    it("converts forced scene headings starting with period to uppercase", () => {
      const input = ".flashback - sunset\n\nYoung John plays.\n\n.bedroom #1#\n\nQuiet room.";
      const result = stripFountainForExport(input, defaultOptions);
      expect(result).toContain(".FLASHBACK - SUNSET");
      expect(result).toContain(".BEDROOM #1#");
      expect(result).toContain("Young John plays.");
    });

    it("does not treat double-period action ellipsis as a scene heading", () => {
      const input = "INT. ROOM - DAY\n\n..and then he left the room.";
      const result = stripFountainForExport(input, defaultOptions);
      expect(result).toContain("..and then he left the room.");
    });

    it("does not convert forced action starting with exclamation mark", () => {
      const input = "INT. ROOM - DAY\n\n!int. room on television screen - action line";
      const result = stripFountainForExport(input, defaultOptions);
      expect(result).toContain("!int. room on television screen - action line");
    });
  });

  describe("Character Names", () => {
    it("converts forced character names with @ to uppercase", () => {
      const input = "INT. ROOM - DAY\n\n@john\nHello there.\n\n@dr. smith (v.o.)\nI can hear you.";
      const result = stripFountainForExport(input, defaultOptions);
      expect(result).toContain("@JOHN\nHello there.");
      expect(result).toContain("@DR. SMITH (V.O.)\nI can hear you.");
    });

    it("converts lowercase extensions like (v.o.) and (cont'd) to uppercase", () => {
      const input = "INT. ROOM - DAY\n\nJOHN (v.o.)\nListen carefully.\n\nSARAH (cont'd)\nI am listening.";
      const result = stripFountainForExport(input, defaultOptions);
      expect(result).toContain("JOHN (V.O.)\nListen carefully.");
      expect(result).toContain("SARAH (CONT'D)\nI am listening.");
    });

    it("converts dual dialogue characters to uppercase", () => {
      const input = "BOB\nI agree.\n\nalice ^\nMe too.";
      const result = stripFountainForExport(input, defaultOptions);
      expect(result).toContain("BOB\nI agree.");
      expect(result).toContain("ALICE ^\nMe too.");
    });

    it("converts character cue followed by parenthetical to uppercase", () => {
      const input = "INT. ROOM - DAY\n\njohn\n(whispering)\nKeep quiet.\n\nHe moves.";
      const result = stripFountainForExport(input, defaultOptions);
      expect(result).toContain("JOHN\n(whispering)\nKeep quiet.");
      expect(result).toContain("He moves.");
    });

    it("converts lowercase character cue followed by dialogue to uppercase", () => {
      const input = "INT. ROOM - DAY\n\njohn\nHello, world.";
      const result = stripFountainForExport(input, defaultOptions);
      expect(result).toContain("JOHN\nHello, world.");
    });

    it("does not convert action sentences that happen to follow empty lines", () => {
      const input = "INT. ROOM - DAY\n\nJohn walks across the empty room slowly.\n\nHe opens the cabinet.";
      const result = stripFountainForExport(input, defaultOptions);
      expect(result).toContain("John walks across the empty room slowly.");
      expect(result).toContain("He opens the cabinet.");
    });
  });

  describe("Shots", () => {
    it("converts forced shot lines (!!) to uppercase", () => {
      const input = "INT. ROOM - DAY\n\n!!close up on clock\n\nThe pendulum swings.\n\n!! camera pans left\n\nA shadow moves.";
      const result = stripFountainForExport(input, defaultOptions);
      expect(result).toContain("!!CLOSE UP ON CLOCK");
      expect(result).toContain("!! CAMERA PANS LEFT");
      expect(result).toContain("The pendulum swings.");
    });
  });

  describe("Transitions", () => {
    it("converts forced transitions (>) to uppercase", () => {
      const input = "INT. ROOM - DAY\n\nHe falls asleep.\n\n> fade to black.\n\next. morning - day";
      const result = stripFountainForExport(input, defaultOptions);
      expect(result).toContain("> FADE TO BLACK.");
      expect(result).toContain("EXT. MORNING - DAY");
    });

    it("converts recognized transitions ending with TO: to uppercase", () => {
      const input = "INT. ROOM - DAY\n\nHe walks away.\n\ncut to:\n\nINT. HALLWAY - NIGHT";
      const result = stripFountainForExport(input, defaultOptions);
      expect(result).toContain("CUT TO:");
      expect(result).toContain("INT. HALLWAY - NIGHT");
    });

    it("converts standard transition phrases like fade out to uppercase", () => {
      const input = "INT. ROOM - DAY\n\nSilence.\n\nfade out.\n\nINT. NEXT - DAY";
      const result = stripFountainForExport(input, defaultOptions);
      expect(result).toContain("FADE OUT.");
    });

    it("preserves centered text and does not treat it as a transition", () => {
      const input = "INT. ROOM - DAY\n\n> THE END <\n\n> To Be Continued <";
      const result = stripFountainForExport(input, defaultOptions);
      expect(result).toContain("> THE END <");
      expect(result).toContain("> To Be Continued <");
    });
  });

  describe("Dialogue and Formatting Preservation", () => {
    it("preserves casing of dialogue, parentheticals, and lyrics", () => {
      const input = "INT. THEATRE - NIGHT\n\nSINGER\n(softly, smiling)\n~ Beautiful dreamer, awake unto me...\n\nThe crowd watches silently.";
      const result = stripFountainForExport(input, defaultOptions);
      expect(result).toContain("(softly, smiling)");
      expect(result).toContain("~ Beautiful dreamer, awake unto me...");
      expect(result).toContain("The crowd watches silently.");
    });
  });

  describe("Title Page and Stripping Options", () => {
    it("preserves title page case when titlePage is true", () => {
      const input = "Title: The Great Movie\nAuthor: John Doe\nDraft date: October 2026\n\nint. room - day\n\nAction.";
      const result = stripFountainForExport(input, { ...defaultOptions, titlePage: true });
      expect(result).toContain("Title: The Great Movie");
      expect(result).toContain("Author: John Doe");
      expect(result).toContain("Draft date: October 2026");
      expect(result).toContain("INT. ROOM - DAY");
    });

    it("strips title page when titlePage is false", () => {
      const input = "Title: The Great Movie\nAuthor: John Doe\n\nint. room - day\n\nAction.";
      const result = stripFountainForExport(input, { ...defaultOptions, titlePage: false });
      expect(result).not.toContain("Title: The Great Movie");
      expect(result).not.toContain("Author: John Doe");
      expect(result).toContain("INT. ROOM - DAY");
    });

    it("strips markers, color tags, and storyline tags", () => {
      const input = "int. room - day [[color red]] [[storyline Plot A]] [[marker blue: fix this]]\n\nAction.";
      const result = stripFountainForExport(input, defaultOptions);
      expect(result).not.toContain("[[color");
      expect(result).not.toContain("[[storyline");
      expect(result).not.toContain("[[marker");
      expect(result).toContain("INT. ROOM - DAY");
    });

    it("strips sections and synopses when options are false", () => {
      const input = "# ACT 1\n\n= Synopsis of Act 1\n\nint. room - day\n\nAction.";
      const result = stripFountainForExport(input, { sections: false, synopses: false, titlePage: true });
      expect(result).not.toContain("# ACT 1");
      expect(result).not.toContain("= Synopsis of Act 1");
      expect(result).toContain("INT. ROOM - DAY");
    });

    it("retains sections and synopses when options are true", () => {
      const input = "# ACT 1\n\n= Synopsis of Act 1\n\nint. room - day\n\nAction.";
      const result = stripFountainForExport(input, { sections: true, synopses: true, titlePage: true });
      expect(result).toContain("# ACT 1");
      expect(result).toContain("= Synopsis of Act 1");
      expect(result).toContain("INT. ROOM - DAY");
    });
  });
});
