import { describe, expect, it } from "vitest";
import { parseScreenplay } from "../parser";
import { resolveSceneFocus, screenplaySources } from "./uraiSources";
import { requestedStatistics, screenplayStatistics } from "./uraiStats";

const text = [
  "Title: A test screenplay", "Contact: private@example.com", "",
  "INT. ATTIC - DAY #3#", "", "MAYA", "I found the letter.", "",
  "EXT. RIVER - NIGHT #67#", "", "MAYA (V.O.)", "This is my longest uninterrupted speech today.", "",
  "===", "", "Maya hides the letter.", "",
  "INT. STATION - DAY #67A#", "", "Maya boards the train.",
].join("\n");

describe("UrAI screenplay evidence", () => {
  const doc = parseScreenplay(text);
  const scenes = screenplaySources(doc);

  it("resolves displayed numbers independently of their positions, including suffixes and ranges", () => {
    expect(resolveSceneFocus("Read scene #67#", scenes).ids).toEqual([2]);
    expect(resolveSceneFocus("Read scene 67A", scenes).ids).toEqual([3]);
    expect(resolveSceneFocus("Read the 67th scene", scenes).ids).toEqual([2]);
    expect(resolveSceneFocus("Read the 2nd scene", scenes).error).toMatch(/not found/);
    expect(resolveSceneFocus("Compare scenes #3# to #67A#", scenes).ids).toEqual([1, 2, 3]);
    expect(resolveSceneFocus("Compare scenes 3 and 67A", scenes).ids).toEqual([1, 3]);
    expect(resolveSceneFocus("Read scene 2", scenes).error).toMatch(/not found/);
    expect(resolveSceneFocus("Read scene 67", [...scenes, { ...scenes[1], id: 4 }]).error).toMatch(/multiple headings/);
  });

  it("falls back to position only when the entire screenplay is unnumbered", () => {
    const draft = (heading: string) => screenplaySources(parseScreenplay(`INT. ROOM - DAY\n\nFirst.\n\n${heading}\n\nSecond.`));
    const unnumbered = draft("EXT. ROAD - DAY");
    expect(resolveSceneFocus("Read the 2nd scene", unnumbered).ids).toEqual([2]);
    expect(resolveSceneFocus("Read scene 2", unnumbered).ids).toEqual([2]);
    const mixed = draft("EXT. ROAD - DAY #16#");
    expect(resolveSceneFocus("Read the 1st scene", mixed).error).toMatch(/not found/);
    expect(resolveSceneFocus("Read scene 1", mixed).error).toMatch(/not found/);
  });

  it("uses the cursor and re-resolves previous references after scenes move", () => {
    expect(resolveSceneFocus("Read this scene", scenes, 11).ids).toEqual([2]);
    expect(resolveSceneFocus("What about the next scene?", scenes, 4, [scenes[1]]).ids).toEqual([3]);
    const reordered = screenplaySources(parseScreenplay([scenes[1].text, scenes[0].text, scenes[2].text].join("\n\n")));
    expect(resolveSceneFocus("Why does she leave?", reordered, 4, [scenes[1]]).ids).toEqual([1]);
  });

  it("preserves source text and line numbers, excludes title-page data, and maps dialogue to its speaker", () => {
    expect(scenes[1].text).toContain("MAYA (V.O.)\nThis is my longest uninterrupted speech today.");
    expect(scenes[1].dialogue).toEqual([{ speaker: "MAYA", text: "This is my longest uninterrupted speech today.", line: 12 }]);
    expect(JSON.stringify(scenes)).not.toContain("private@example.com");
  });

  it("provides X-Ray values, longest speech, and actual page spans with displayed labels", () => {
    const stats = screenplayStatistics(doc, scenes);
    expect(stats.overview).toMatchObject({ scenes: 3, pages: 2, characters: 1 });
    expect(stats.characters).toEqual([expect.objectContaining({ name: "MAYA", speeches: 2, sceneIds: [1, 2] })]);
    expect(stats.longestSpeech).toMatchObject({ character: "MAYA", id: 2, label: "67", words: 7 });
    expect(stats.scenes[1]).toMatchObject({ label: "67", firstPage: 1, lastPage: 2, pages: 2 });
    expect(requestedStatistics("Which scene spans the most pages?")).toBe("scenes");
    expect(requestedStatistics("Show the longest dialogue")).toBe("dialogue");
  });
});
