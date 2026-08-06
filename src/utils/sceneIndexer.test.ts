import { describe, it, expect } from "vitest";
import { parseScreenplay } from "../parser/FountainParser";
import { buildScreenplayIndex, formatIndexForPrompt } from "./sceneIndexer";
import { executeToolCall } from "../lib/aiTools";

describe("sceneIndexer", () => {
  const sampleFountain = `INT. COFFEE SHOP - DAY

JOHN
Hello Sarah!

SARAH
(smiling)
Hi John, nice to see you.

EXT. CITY STREET - NIGHT

SARAH
Look at the stars.`;

  it("should build a screenplay index with scene numbers, line ranges, and characters", () => {
    const doc = parseScreenplay(sampleFountain);
    const index = buildScreenplayIndex(doc);

    expect(index.totalScenes).toBe(2);
    expect(index.characters).toEqual(["JOHN", "SARAH"]);

    expect(index.scenes[0].heading).toContain("INT. COFFEE SHOP - DAY");
    expect(index.scenes[0].characters).toEqual(["JOHN", "SARAH"]);

    expect(index.scenes[1].heading).toContain("EXT. CITY STREET - NIGHT");
    expect(index.scenes[1].characters).toEqual(["SARAH"]);
  });

  it("should format index as prompt header", () => {
    const doc = parseScreenplay(sampleFountain);
    const index = buildScreenplayIndex(doc);
    const formatted = formatIndexForPrompt(index);

    expect(formatted).toContain("SCREENPLAY INDEX (2 Scenes");
    expect(formatted).toContain("Scene 1");
    expect(formatted).toContain("INT. COFFEE SHOP - DAY");
    expect(formatted).toContain("[Chars: JOHN, SARAH]");
  });

  it("should execute read_scene tool call correctly", () => {
    const doc = parseScreenplay(sampleFountain);
    const result = executeToolCall("read_scene", { sceneNumber: 1 }, { doc });

    expect(result).toContain("INT. COFFEE SHOP - DAY");
    expect(result).toContain("Hello Sarah!");
  });

  it("should execute search_script tool call correctly", () => {
    const doc = parseScreenplay(sampleFountain);
    const result = executeToolCall("search_script", { query: "stars" }, { doc });

    expect(result).toContain("Look at the stars.");
    expect(result).toContain("Scene 2");
  });
});
