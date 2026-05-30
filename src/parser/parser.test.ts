import { describe, it, expect } from "vitest";
import { parseScreenplay, serializeScreenplay, LineType } from "./FountainParser";

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
});
