import { describe, it, expect } from "vitest";
import { parseScreenplay } from "../parser/FountainParser";
import { buildScreenplayIndex, formatIndexForPrompt } from "./sceneIndexer";
import { executeToolCall } from "../lib/aiTools";

describe("sceneIndexer & aiTools", () => {
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

  it("should execute get_character_scenes correctly", () => {
    const doc = parseScreenplay(sampleFountain);
    const result = executeToolCall("get_character_scenes", { characterName: "JOHN" }, { doc });

    expect(result).toContain("Character Breakdown for JOHN");
    expect(result).toContain("Scene 1");
  });

  it("should execute get_screenplay_stats correctly", () => {
    const doc = parseScreenplay(sampleFountain);
    const result = executeToolCall("get_screenplay_stats", {}, { doc });

    expect(result).toContain("SCREENPLAY STATISTICS");
    expect(result).toContain("Total Scenes: 2");
    expect(result).toContain("SARAH");
  });

  it("should execute read_active_cursor_context correctly", () => {
    const doc = parseScreenplay(sampleFountain);
    const result = executeToolCall("read_active_cursor_context", {}, { doc, activeLineNumber: 4 });

    expect(result).toContain("ACTIVE CURSOR CONTEXT");
    expect(result).toContain(">>> Line 4:");
  });

  it("should execute replace_scene correctly returning pending approval payload", () => {
    const doc = parseScreenplay(sampleFountain);

    const result = executeToolCall("replace_scene", { sceneNumber: 1, newFountainText: "INT. COFFEE SHOP - DAY\nJOHN\nHey!" }, { doc });

    expect(result).toContain("__PENDING_APPLY__:1:");
  });

  it("should execute add_project_todo correctly", () => {
    const doc = parseScreenplay(sampleFountain);
    let updatedSettings: any = null;
    const mockUpdate = (fn: any) => {
      updatedSettings = fn({});
    };

    const result = executeToolCall("add_project_todo", { taskText: "Fix Scene 2 ending" }, { doc, updateSettings: mockUpdate });

    expect(result).toContain("Added To-Do: \"Fix Scene 2 ending\"");
    expect(updatedSettings.todos.length).toBe(1);
    expect(updatedSettings.todos[0].text).toBe("Fix Scene 2 ending");
  });
});
