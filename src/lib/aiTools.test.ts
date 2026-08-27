import { describe, it, expect, vi } from "vitest";
import { AI_TOOLS, MUSE_TOOLS, executeToolCall } from "./aiTools";
import { FountainDocument, LineType } from "../parser/FountainParser";

function createMockDoc(lines: Array<{ text: string; type: LineType; sceneNumber?: string; marker?: { color: string; description: string } }> = [], settings: any = {}): FountainDocument {
  return {
    lines: lines.map((l, i) => ({
      id: `line-${i}`,
      text: l.text,
      type: l.type,
      sceneNumber: l.sceneNumber,
      marker: l.marker,
      isOutlineElement: l.type === LineType.heading,
    })),
    settings,
    screenplayText: lines.map((l) => l.text).join("\n"),
  };
}

describe("aiTools (Muse AI Tools)", () => {
  describe("Tool Declarations (AI_TOOLS & MUSE_TOOLS)", () => {
    it("exports MUSE_TOOLS and AI_TOOLS aliases identically", () => {
      expect(AI_TOOLS).toBe(MUSE_TOOLS);
      expect(Array.isArray(AI_TOOLS)).toBe(true);
      expect(AI_TOOLS.length).toBeGreaterThanOrEqual(10);
    });

    it("ensures all tool declarations have valid structure, name, description, and parameters", () => {
      const toolNames = new Set<string>();

      for (const tool of AI_TOOLS) {
        expect(typeof tool.name).toBe("string");
        expect(tool.name.length).toBeGreaterThan(0);
        expect(typeof tool.description).toBe("string");
        expect(tool.description.length).toBeGreaterThan(0);
        expect(tool.parameters).toBeDefined();
        expect(tool.parameters.type).toBe("object");
        expect(typeof tool.parameters.properties).toBe("object");

        if (tool.parameters.required) {
          expect(Array.isArray(tool.parameters.required)).toBe(true);
          for (const req of tool.parameters.required) {
            expect(tool.parameters.properties[req]).toBeDefined();
          }
        }

        expect(toolNames.has(tool.name)).toBe(false);
        toolNames.add(tool.name);
      }

      // Check expected core tools
      expect(toolNames.has("read_scene")).toBe(true);
      expect(toolNames.has("search_script")).toBe(true);
      expect(toolNames.has("get_character_scenes")).toBe(true);
      expect(toolNames.has("get_location_breakdown")).toBe(true);
      expect(toolNames.has("get_screenplay_stats")).toBe(true);
      expect(toolNames.has("search_character_dialogue")).toBe(true);
      expect(toolNames.has("read_active_cursor_context")).toBe(true);
      expect(toolNames.has("read_title_page")).toBe(true);
      expect(toolNames.has("replace_scene")).toBe(true);
      expect(toolNames.has("add_project_todo")).toBe(true);
      expect(toolNames.has("add_parking_note")).toBe(true);
      expect(toolNames.has("read_project_todos")).toBe(true);
      expect(toolNames.has("read_parking_lot")).toBe(true);
      expect(toolNames.has("tag_scene")).toBe(true);
      expect(toolNames.has("update_character_profile")).toBe(true);
      expect(toolNames.has("read_character_profiles")).toBe(true);
      expect(toolNames.has("open_xray_window")).toBe(true);
    });
  });

  describe("executeToolCall", () => {
    it("returns error when document is null", () => {
      const result = executeToolCall("get_screenplay_stats", {}, { doc: null });
      expect(result).toBe("Error: No active screenplay document open.");
    });

    it("handles unknown tool calls gracefully", () => {
      const doc = createMockDoc();
      const result = executeToolCall("non_existent_tool_xyz", {}, { doc });
      expect(result).toBe('Error: Unknown tool "non_existent_tool_xyz"');
    });

    describe("Document & Scene & Character Info Tools", () => {
      const sampleDoc = createMockDoc([
        { text: "Title: TEST SCRIPT", type: LineType.titlePageTitle },
        { text: "Author: Jane Doe", type: LineType.titlePageAuthor },
        { text: "EXT. COFFEE SHOP - DAY", type: LineType.heading },
        { text: "SARAH sits by the window sipping espresso.", type: LineType.action },
        { text: "SARAH", type: LineType.character },
        { text: "Where is he?", type: LineType.dialogue },
        { text: "JOHN", type: LineType.character },
        { text: "Right behind you.", type: LineType.dialogue },
        { text: "INT. OFFICE - NIGHT", type: LineType.heading },
        { text: "SARAH enters hurriedly.", type: LineType.action },
        { text: "SARAH", type: LineType.character },
        { text: "We need to talk now.", type: LineType.dialogue },
      ]);

      it("executes get_screenplay_stats (and document stats)", () => {
        const result = executeToolCall("get_screenplay_stats", {}, { doc: sampleDoc });
        expect(result).toContain("--- SCREENPLAY STATISTICS ---");
        expect(result).toContain("Total Lines: 12");
        expect(result).toContain("Total Scenes: 2");
        expect(result).toContain("SARAH");
        expect(result).toContain("Action Lines: 2 | Dialogue Lines: 3");
      });

      it("executes read_scene for valid scene number", () => {
        const result = executeToolCall("read_scene", { sceneNumber: 1 }, { doc: sampleDoc });
        expect(result).toContain("--- CONTENT OF SCENE 1 (EXT. COFFEE SHOP - DAY) ---");
        expect(result).toContain("SARAH sits by the window");
        expect(result).toContain("Where is he?");
      });

      it("executes read_scene with parameter aliases (scene_id, id)", () => {
        const result = executeToolCall("read_scene", { scene_id: 2 }, { doc: sampleDoc });
        expect(result).toContain("--- CONTENT OF SCENE 2 (INT. OFFICE - NIGHT) ---");
        expect(result).toContain("We need to talk now.");
      });

      it("returns error for invalid read_scene scene number", () => {
        const result = executeToolCall("read_scene", { sceneNumber: 99 }, { doc: sampleDoc });
        expect(result).toContain("Error: Scene 99 not found. Total scenes: 2");
      });

      it("executes search_script with matches and handles missing query", () => {
        const resEmpty = executeToolCall("search_script", {}, { doc: sampleDoc });
        expect(resEmpty).toBe("Error: Search query cannot be empty.");

        const resFound = executeToolCall("search_script", { query: "espresso" }, { doc: sampleDoc });
        expect(resFound).toContain('Found 1 matching line(s) for "espresso":');
        expect(resFound).toContain("SARAH sits by the window sipping espresso.");

        const resNotFound = executeToolCall("search_script", { query: "spaceship" }, { doc: sampleDoc });
        expect(resNotFound).toBe('No matches found for query "spaceship".');
      });

      it("executes get_character_scenes and co-star breakdown", () => {
        const resEmpty = executeToolCall("get_character_scenes", {}, { doc: sampleDoc });
        expect(resEmpty).toBe("Error: Character name required.");

        const resSarah = executeToolCall("get_character_scenes", { characterName: "SARAH" }, { doc: sampleDoc });
        expect(resSarah).toContain("Character Breakdown for SARAH (Appears in 2 scene(s)):");
        expect(resSarah).toContain("EXT. COFFEE SHOP - DAY (With: JOHN)");
        expect(resSarah).toContain("INT. OFFICE - NIGHT");

        const resNotFound = executeToolCall("get_character_scenes", { characterName: "BOB" }, { doc: sampleDoc });
        expect(resNotFound).toContain('Character "BOB" not found in any scenes.');
      });

      it("executes get_location_breakdown", () => {
        const resEmpty = executeToolCall("get_location_breakdown", {}, { doc: sampleDoc });
        expect(resEmpty).toBe("Error: Location name required.");

        const resCoffee = executeToolCall("get_location_breakdown", { locationName: "COFFEE" }, { doc: sampleDoc });
        expect(resCoffee).toContain('Location Breakdown for "coffee" (1 scene(s)):');
        expect(resCoffee).toContain("EXT. COFFEE SHOP - DAY");

        const resNone = executeToolCall("get_location_breakdown", { locationName: "BEACH" }, { doc: sampleDoc });
        expect(resNone).toBe('No scenes matching location "beach".');
      });

      it("executes search_character_dialogue", () => {
        const res = executeToolCall(
          "search_character_dialogue",
          { characterName: "SARAH", query: "talk" },
          { doc: sampleDoc }
        );
        expect(res).toContain('Dialogue matches for SARAH ("talk"):');
        expect(res).toContain("We need to talk now.");

        const resNone = executeToolCall(
          "search_character_dialogue",
          { characterName: "SARAH", query: "goodbye" },
          { doc: sampleDoc }
        );
        expect(resNone).toContain('No dialogue matches found for SARAH containing "goodbye".');
      });

      it("executes read_active_cursor_context", () => {
        const res = executeToolCall("read_active_cursor_context", {}, { doc: sampleDoc, activeLineNumber: 6 });
        expect(res).toContain("--- ACTIVE CURSOR CONTEXT (Active Scene 1: EXT. COFFEE SHOP - DAY) ---");
        expect(res).toContain(">>> Line 6: Where is he?");
      });

      it("executes read_title_page", () => {
        const res = executeToolCall("read_title_page", {}, { doc: sampleDoc });
        expect(res).toContain("Title Page:");
        expect(res).toContain("Title: TEST SCRIPT");
        expect(res).toContain("Author: Jane Doe");

        const noTitleDoc = createMockDoc([{ text: "EXT. PARK - DAY", type: LineType.heading }]);
        const resNoTitle = executeToolCall("read_title_page", {}, { doc: noTitleDoc });
        expect(resNoTitle).toBe("No title page metadata found.");
      });

      it("executes read_script_bookmarks", () => {
        const bookmarkDoc = createMockDoc([
          { text: "EXT. PARK - DAY", type: LineType.heading, marker: { color: "blue", description: "Important scene" } },
        ]);
        const res = executeToolCall("read_script_bookmarks", {}, { doc: bookmarkDoc });
        expect(res).toContain("Script Bookmarks / Markers:");
        expect(res).toContain("Line 1 (blue): Important scene");

        const emptyRes = executeToolCall("read_script_bookmarks", {}, { doc: sampleDoc });
        expect(emptyRes).toBe("No markers or bookmarks found in script.");
      });
    });

    describe("Scene Modification & Tagging", () => {
      const sampleDoc = createMockDoc([
        { text: "INT. ROOM - DAY", type: LineType.heading },
        { text: "Alice looks around.", type: LineType.action },
      ]);

      it("executes replace_scene and encodes result token", () => {
        const result = executeToolCall(
          "replace_scene",
          { sceneNumber: 1, newFountainText: "INT. ROOM - NIGHT\nAlice sleeps." },
          { doc: sampleDoc }
        );
        expect(result.startsWith("__PENDING_APPLY__:1:")).toBe(true);
      });

      it("handles replace_scene missing required params", () => {
        const result = executeToolCall("replace_scene", {}, { doc: sampleDoc });
        expect(result).toBe("Error: sceneNumber and newFountainText required.");
      });

      it("executes tag_scene with color and storyline", () => {
        const replaceMock = vi.fn(() => true);
        const result = executeToolCall(
          "tag_scene",
          { sceneNumber: 1, color: "blue", storyline: "CLIMAX" },
          { doc: sampleDoc, replaceSceneText: replaceMock }
        );
        expect(replaceMock).toHaveBeenCalled();
        expect(result).toContain("Successfully added tag(s)");
        expect(result).toContain("INT. ROOM - DAY [[blue]] [[storyline CLIMAX]]");
      });

      it("handles tag_scene error conditions", () => {
        const resNoScene = executeToolCall("tag_scene", { color: "red" }, { doc: sampleDoc });
        expect(resNoScene).toBe("Error: sceneNumber required.");

        const resNoTags = executeToolCall("tag_scene", { sceneNumber: 1 }, { doc: sampleDoc });
        expect(resNoTags).toBe("Error: Either color or storyline parameter must be provided.");

        const resMissingScene = executeToolCall("tag_scene", { sceneNumber: 99, color: "red" }, { doc: sampleDoc });
        expect(resMissingScene).toBe("Error: Scene 99 not found.");

        const resNoCallback = executeToolCall("tag_scene", { sceneNumber: 1, color: "red" }, { doc: sampleDoc });
        expect(resNoCallback).toBe("Error: Failed to tag Scene 1. Editor unavailable.");
      });
    });

    describe("Project To-Dos, Parking Lot & Character Profiles", () => {
      it("adds and reads project todos", () => {
        let savedSettings: any = {};
        const updateSettings = vi.fn((updater) => {
          savedSettings = updater(savedSettings);
        });

        const doc = createMockDoc([], savedSettings);
        const addRes = executeToolCall(
          "add_project_todo",
          { taskText: "Fix scene 3 pacing" },
          { doc, updateSettings }
        );
        expect(addRes).toContain('Added To-Do: "Fix scene 3 pacing"');
        expect(savedSettings.todos).toHaveLength(1);
        expect(savedSettings.todos[0].text).toBe("Fix scene 3 pacing");

        // Read todos from doc
        const docWithTodos = createMockDoc([], { todos: savedSettings.todos });
        const readRes = executeToolCall("read_project_todos", {}, { doc: docWithTodos });
        expect(readRes).toContain("Project To-Dos:");
        expect(readRes).toContain("- [ ] Fix scene 3 pacing");

        const emptyTodos = executeToolCall("read_project_todos", {}, { doc });
        expect(emptyTodos).toBe("No project To-Dos found.");
      });

      it("handles add_project_todo error on missing text or updater", () => {
        const doc = createMockDoc();
        expect(executeToolCall("add_project_todo", {}, { doc })).toBe("Error: taskText required.");
        expect(executeToolCall("add_project_todo", { taskText: "Test" }, { doc })).toBe("Error: Cannot update settings in this context.");
      });

      it("adds and reads parking lot notes", () => {
        let savedSettings: any = {};
        const updateSettings = vi.fn((updater) => {
          savedSettings = updater(savedSettings);
        });

        const doc = createMockDoc([], savedSettings);
        const addRes = executeToolCall(
          "add_parking_note",
          { noteText: "What if the butler is the detective?" },
          { doc, updateSettings }
        );
        expect(addRes).toContain('Added note to Parking Lot: "What if the butler is the detective?".');
        expect(savedSettings.parking).toContain("What if the butler is the detective?");

        const docWithParking = createMockDoc([], { parking: savedSettings.parking });
        const readRes = executeToolCall("read_parking_lot", {}, { doc: docWithParking });
        expect(readRes).toContain("What if the butler is the detective?");

        const emptyParking = executeToolCall("read_parking_lot", {}, { doc });
        expect(emptyParking).toBe("No parking lot notes found.");
      });

      it("updates and reads character profiles", () => {
        let savedSettings: any = {};
        const updateSettings = vi.fn((updater) => {
          savedSettings = updater(savedSettings);
        });

        const doc = createMockDoc([], savedSettings);
        const updateRes = executeToolCall(
          "update_character_profile",
          {
            characterName: "COOPER",
            role: "Protagonist",
            gender: "male",
            age: "35",
            description: "Former NASA pilot",
          },
          { doc, updateSettings, scriptFileName: "test.fountain" }
        );

        expect(updateRes).toContain("Updated character profile(s) for COOPER in X-Ray Analysis settings.");
        expect(savedSettings.characterProfiles?.["test.fountain"]?.COOPER?.role).toBe("Protagonist");
        expect(savedSettings.genders?.["test.fountain"]?.COOPER).toBe("male");

        const docWithProfiles = createMockDoc([], savedSettings);
        const readRes = executeToolCall(
          "read_character_profiles",
          {},
          { doc: docWithProfiles, scriptFileName: "test.fountain" }
        );
        expect(readRes).toContain("Saved Character Profiles:");
        expect(readRes).toContain("COOPER");
        expect(readRes).toContain("Protagonist");
      });

      it("handles update_character_profile with multiple profiles array", () => {
        let savedSettings: any = {};
        const updateSettings = vi.fn((updater) => {
          savedSettings = updater(savedSettings);
        });

        const doc = createMockDoc([], savedSettings);
        const updateRes = executeToolCall(
          "update_character_profile",
          {
            profiles: [
              { characterName: "BRAND", role: "Scientist", gender: "female" },
              { characterName: "MURPH", role: "Daughter", gender: "female" },
            ],
          },
          { doc, updateSettings, scriptFileName: "test.fountain" }
        );

        expect(updateRes).toContain("BRAND, MURPH");
        expect(savedSettings.characterProfiles?.["test.fountain"]?.BRAND?.role).toBe("Scientist");
        expect(savedSettings.characterProfiles?.["test.fountain"]?.MURPH?.role).toBe("Daughter");
      });

      it("handles update_character_profile error conditions", () => {
        const doc = createMockDoc();
        expect(executeToolCall("update_character_profile", {}, { doc })).toBe("Error: characterName or profiles array is required.");
        expect(executeToolCall("update_character_profile", { characterName: "BOB" }, { doc })).toBe("Error: Cannot update settings in this context.");
      });

      it("executes open_xray_window callback", () => {
        const openMock = vi.fn();
        const doc = createMockDoc();
        const res = executeToolCall("open_xray_window", {}, { doc, openXrayWindow: openMock });
        expect(openMock).toHaveBeenCalled();
        expect(res).toBe("Opened X-Ray Analysis window.");
      });
    });
  });
});
