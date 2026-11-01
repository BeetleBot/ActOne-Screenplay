import { describe, expect, it } from "vitest";
import { parseScreenplay } from "./FountainParser";
describe("oversized source lines", () => {
  it.each(["letter", "a4"] as const)("terminates and preserves text on %s", (size) => {
    const text = "INT. ROOM - DAY\n\n" + "A very long action sentence. ".repeat(2000) + "\n\nNext action.";
    const doc = parseScreenplay(text, size);
    expect(doc.screenplayText).toBe(text);
    expect(doc.pageBreaks!.length).toBeLessThan(doc.lines.length + 1);
  });
});
