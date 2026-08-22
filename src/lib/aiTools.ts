import { FountainDocument, LineType } from "../parser/FountainParser";
import { buildScreenplayIndex } from "../utils/sceneIndexer";
import { getPerScriptSettingObject, updatePerScriptSetting } from "../utils/perScriptSettings";

export interface AIToolDeclaration {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required?: string[];
  };
}

export const MUSE_TOOLS: AIToolDeclaration[] = [
  {
    name: "read_scene",
    description: "Read the full, raw Fountain text of a specific scene by its scene number (ID).",
    parameters: {
      type: "object",
      properties: {
        sceneNumber: {
          type: "integer",
          description: "The ID/number of the scene to read (e.g. 1, 2, 3)",
        },
      },
      required: ["sceneNumber"],
    },
  },
  {
    name: "search_script",
    description: "Search the screenplay text for specific keywords across all scenes.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Keyword to search for across all scenes",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_character_scenes",
    description: "Find all scenes where a specific character appears, dialogue line counts, and co-stars.",
    parameters: {
      type: "object",
      properties: {
        characterName: {
          type: "string",
          description: "Name of the character (e.g. 'JOHN', 'SARAH')",
        },
      },
      required: ["characterName"],
    },
  },
  {
    name: "get_location_breakdown",
    description: "List all scenes set in a specific location.",
    parameters: {
      type: "object",
      properties: {
        locationName: {
          type: "string",
          description: "Name or keyword of location (e.g. 'COFFEE SHOP', 'HOSPITAL')",
        },
      },
      required: ["locationName"],
    },
  },
  {
    name: "get_screenplay_stats",
    description: "Get analytics on screenplay: total scene count, word count, estimated page count, action-to-dialogue ratio, and top speaking roles.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "search_character_dialogue",
    description: "Search for specific dialogue lines spoken by a particular character.",
    parameters: {
      type: "object",
      properties: {
        characterName: {
          type: "string",
          description: "Name of character",
        },
        query: {
          type: "string",
          description: "Dialogue text to search for",
        },
      },
      required: ["characterName", "query"],
    },
  },
  {
    name: "read_active_cursor_context",
    description: "Fetch the exact lines surrounding the user's current cursor position in the editor.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "read_title_page",
    description: "Retrieve title page metadata (Title, Author, Draft Date, Contact).",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "replace_scene",
    description: "Directly replace a scene in the user's screenplay editor with new Fountain-formatted text.",
    parameters: {
      type: "object",
      properties: {
        sceneNumber: {
          type: "integer",
          description: "The scene number (ID) to replace (e.g. 59)",
        },
        newFountainText: {
          type: "string",
          description: "The complete, new Fountain-formatted text for the scene (must include scene heading)",
        },
      },
      required: ["sceneNumber", "newFountainText"],
    },
  },
  {
    name: "add_project_todo",
    description: "Add a new task to the project's To-Do list.",
    parameters: {
      type: "object",
      properties: {
        taskText: {
          type: "string",
          description: "The task description to add",
        },
      },
      required: ["taskText"],
    },
  },
  {
    name: "add_parking_note",
    description: "Add a new note or idea to the project's Parking Lot / Scratchpad.",
    parameters: {
      type: "object",
      properties: {
        noteText: {
          type: "string",
          description: "The note content to add",
        },
      },
      required: ["noteText"],
    },
  },
  {
    name: "read_project_todos",
    description: "Retrieve the list of active project To-Dos.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "read_parking_lot",
    description: "Retrieve the scratchpad / parking lot notes.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "tag_scene",
    description: "Add color tags (e.g. 'red', 'orange', 'purple', 'blue', 'green', 'yellow') or storyline tags (e.g. 'storyline EDMOND'S PLANET') to scene headings.",
    parameters: {
      type: "object",
      properties: {
        sceneNumber: {
          type: "integer",
          description: "The scene number (ID) to tag",
        },
        color: {
          type: "string",
          description: "Optional color tag to apply (e.g. 'purple', 'red', 'blue', 'green', 'yellow', 'orange')",
        },
        storyline: {
          type: "string",
          description: "Optional storyline name/text to tag (e.g. 'EDMOND\\'S PLANET' or 'EARTH SUB-PLOT')",
        },
      },
      required: ["sceneNumber"],
    },
  },
  {
    name: "update_character_profile",
    description: "Create or update character profiles for X-Ray Analysis (Description, Role, Gender, Age, Backstory, Character Arc, Color Swatch).",
    parameters: {
      type: "object",
      properties: {
        characterName: {
          type: "string",
          description: "Name of character in uppercase (e.g. 'COOPER', 'BRAND', 'MURPH')",
        },
        role: {
          type: "string",
          description: "Role classification (e.g. 'Protagonist', 'Antagonist', 'Supporting', 'Minor')",
        },
        gender: {
          type: "string",
          description: "Gender ('male', 'female', 'nonbinary', 'unknown')",
        },
        age: {
          type: "string",
          description: "Age or age range (e.g. '35', '30s', '10')",
        },
        description: {
          type: "string",
          description: "Summary description of character",
        },
        backstory: {
          type: "string",
          description: "Character origin & backstory",
        },
        arc: {
          type: "string",
          description: "Emotional or narrative character arc",
        },
        color: {
          type: "string",
          description: "Color swatch ('blue', 'green', 'orange', 'magenta', 'purple', 'yellow', 'red')",
        },
      },
      required: ["characterName"],
    },
  },
  {
    name: "read_character_profiles",
    description: "Retrieve all currently saved character profiles in the project.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "open_xray_window",
    description: "Open the X-Ray Analysis window on screen to inspect or edit character demographics, pacing, and connections.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
];

export interface ToolExecutionContext {
  doc: FountainDocument | null;
  activeLineNumber?: number;
  replaceSceneText?: (sceneNumber: number, newFountainText: string) => boolean;
  updateSettings?: (updater: (prev: any) => any) => void;
  openXrayWindow?: () => void;
  scriptFileName?: string;
}

export function executeToolCall(
  name: string,
  args: Record<string, any>,
  context: ToolExecutionContext
): string {
  if (!context.doc) {
    return "Error: No active screenplay document open.";
  }

  const index = buildScreenplayIndex(context.doc);

  if (name === "read_scene") {
    const sceneId = Number(args.sceneNumber ?? args.scene_number ?? args.scene_id ?? args.id);
    const scene = index.scenes.find((s) => s.id === sceneId);
    if (!scene) {
      return `Error: Scene ${sceneId} not found. Total scenes: ${index.totalScenes}`;
    }
    const lines = context.doc.lines.slice(scene.startLine - 1, scene.endLine);
    const rawText = lines.map((l) => l.text).join("\n");
    return `--- CONTENT OF SCENE ${scene.id} (${scene.heading}) ---\n${rawText}`;
  }

  if (name === "search_script") {
    const query = String(args.query ?? args.q ?? args.search ?? "").toLowerCase();
    if (!query) return "Error: Search query cannot be empty.";

    const matches: string[] = [];
    const lines = context.doc.lines || [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].text.toLowerCase().includes(query)) {
        const lineNo = i + 1;
        const matchingScene = index.scenes.find((s) => lineNo >= s.startLine && lineNo <= s.endLine);
        const sceneInfo = matchingScene ? `[Scene ${matchingScene.id}: ${matchingScene.heading}]` : "";
        matches.push(`Line ${lineNo} ${sceneInfo}: ${lines[i].text}`);
      }
    }
    if (matches.length === 0) return `No matches found for query "${query}".`;
    const limit = 20;
    const truncated = matches.slice(0, limit);
    let result = `Found ${matches.length} matching line(s) for "${query}":\n` + truncated.join("\n");
    if (matches.length > limit) result += `\n...and ${matches.length - limit} more match(es).`;
    return result;
  }

  if (name === "get_character_scenes") {
    const charName = String(args.characterName ?? args.character ?? args.name ?? "").trim().toUpperCase();
    if (!charName) return "Error: Character name required.";

    const scenesWithChar = index.scenes.filter((s) =>
      s.characters.some((c) => c.toUpperCase() === charName)
    );

    if (scenesWithChar.length === 0) {
      return `Character "${charName}" not found in any scenes. Characters present in script: ${index.characters.join(", ") || "None"}`;
    }

    const sceneSummaries = scenesWithChar.map((s) => {
      const coStars = s.characters.filter((c) => c.toUpperCase() !== charName);
      const coStarsText = coStars.length > 0 ? ` (With: ${coStars.join(", ")})` : "";
      return `- Scene ${s.id} (L${s.startLine}-${s.endLine}): ${s.heading}${coStarsText}`;
    });

    return `Character Breakdown for ${charName} (Appears in ${scenesWithChar.length} scene(s)):\n` + sceneSummaries.join("\n");
  }

  if (name === "get_location_breakdown") {
    const locQuery = String(args.locationName ?? args.location ?? args.query ?? "").trim().toLowerCase();
    if (!locQuery) return "Error: Location name required.";

    const matchingScenes = index.scenes.filter((s) => s.heading.toLowerCase().includes(locQuery));
    if (matchingScenes.length === 0) {
      return `No scenes matching location "${locQuery}".`;
    }

    const result = matchingScenes.map((s) => `- Scene ${s.id} (L${s.startLine}-${s.endLine}): ${s.heading}`);
    return `Location Breakdown for "${locQuery}" (${matchingScenes.length} scene(s)):\n` + result.join("\n");
  }

  if (name === "get_screenplay_stats") {
    const lines = context.doc.lines || [];
    let actionLines = 0;
    let dialogueLines = 0;
    let wordCount = 0;
    const charSpeechCounts: Record<string, number> = {};

    for (const l of lines) {
      const trimmed = l.text.trim();
      if (!trimmed) continue;

      const words = trimmed.split(/\s+/).length;
      wordCount += words;

      if (l.type === LineType.heading) continue;

      if (l.type === LineType.character || l.type === LineType.dualDialogueCharacter) {
        const speakingChar = trimmed.replace(/\s*\([^)]*\)/g, "").replace(/\^/g, "").trim().toUpperCase();
        charSpeechCounts[speakingChar] = (charSpeechCounts[speakingChar] || 0) + 1;
      } else if (l.type === LineType.dialogue || l.type === LineType.dualDialogue) {
        dialogueLines++;
      } else if (l.type === LineType.action) {
        actionLines++;
      }
    }

    const estPages = Math.max(1, Math.round(lines.length / 55));
    const sortedChars = Object.entries(charSpeechCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => `${name} (${count} speeches)`)
      .slice(0, 5);

    return [
      `--- SCREENPLAY STATISTICS ---`,
      `Total Lines: ${lines.length}`,
      `Total Word Count: ${wordCount}`,
      `Estimated Page Count: ~${estPages} pages`,
      `Total Scenes: ${index.totalScenes}`,
      `Action Lines: ${actionLines} | Dialogue Lines: ${dialogueLines}`,
      `Top Speaking Roles: ${sortedChars.join(", ") || "None"}`,
    ].join("\n");
  }

  if (name === "search_character_dialogue") {
    const charName = String(args.characterName ?? args.character ?? args.name ?? "").trim().toUpperCase();
    const query = String(args.query ?? args.q ?? args.search ?? "").toLowerCase();
    const lines = context.doc.lines || [];

    const matches: string[] = [];
    let currentSpeaking = false;

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (l.type === LineType.character || l.type === LineType.dualDialogueCharacter) {
        const clean = l.text.replace(/\s*\([^)]*\)/g, "").replace(/\^/g, "").trim().toUpperCase();
        currentSpeaking = clean === charName;
      } else if (currentSpeaking && (l.type === LineType.dialogue || l.type === LineType.dualDialogue)) {
        if (l.text.toLowerCase().includes(query)) {
          matches.push(`Line ${i + 1}: ${l.text}`);
        }
      } else if (l.type === LineType.empty || l.type === LineType.heading || l.type === LineType.action) {
        currentSpeaking = false;
      }
    }

    if (matches.length === 0) return `No dialogue matches found for ${charName} containing "${query}".`;
    return `Dialogue matches for ${charName} ("${query}"):\n` + matches.join("\n");
  }

  if (name === "read_active_cursor_context") {
    const activeLine = context.activeLineNumber ?? 1;
    const lines = context.doc.lines || [];
    const start = Math.max(0, activeLine - 10);
    const end = Math.min(lines.length, activeLine + 10);

    const activeScene = index.scenes.find((s) => activeLine >= s.startLine && activeLine <= s.endLine);
    const sceneInfo = activeScene ? `(Active Scene ${activeScene.id}: ${activeScene.heading})` : "";

    const slice = lines.slice(start, end).map((l, idx) => {
      const lineNo = start + idx + 1;
      const marker = lineNo === activeLine ? " >>> " : "     ";
      return `${marker}Line ${lineNo}: ${l.text}`;
    });

    return `--- ACTIVE CURSOR CONTEXT ${sceneInfo} ---\n` + slice.join("\n");
  }

  if (name === "read_title_page") {
    const lines = context.doc.lines || [];
    const titleLines = lines.filter((l) =>
      l.type >= LineType.titlePageTitle && l.type <= LineType.titlePageUnknown
    );
    if (titleLines.length === 0) return "No title page metadata found.";
    return "Title Page:\n" + titleLines.map((l) => l.text).join("\n");
  }

  if (name === "replace_scene") {
    let sceneId = Number(args.sceneNumber ?? args.scene_number ?? args.scene_id ?? args.id ?? 0);
    if (!sceneId && context.activeLineNumber) {
      const activeScene = index.scenes.find((s) => (context.activeLineNumber ?? 0) >= s.startLine && (context.activeLineNumber ?? 0) <= s.endLine);
      if (activeScene) sceneId = activeScene.id;
    }
    const rawText = String(args.newFountainText ?? args.new_text ?? args.text ?? args.content ?? "");
    const newText = rawText.replace(/\\n/g, "\n").replace(/\r\n/g, "\n");
    if (!sceneId || !newText) return "Error: sceneNumber and newFountainText required.";

    return `__PENDING_APPLY__:${sceneId}:${btoa(unescape(encodeURIComponent(newText)))}`;
  }

  if (name === "add_project_todo") {
    const task = String(args.taskText ?? args.task ?? args.text ?? "").trim();
    if (!task) return "Error: taskText required.";

    if (context.updateSettings) {
      context.updateSettings((prev: any) => {
        const safe = prev && typeof prev === "object" ? prev : {};
        const existing = Array.isArray(safe.todos) ? safe.todos : [];
        const newTodo = { id: `todo-${Date.now()}`, text: task, completed: false, createdAt: Date.now() };
        return { ...safe, todos: [...existing, newTodo] };
      });
      return `Added To-Do: "${task}" to project task list.`;
    }
    return "Error: Cannot update settings in this context.";
  }

  if (name === "add_parking_note") {
    const note = String(args.noteText ?? args.note ?? args.text ?? "").trim();
    if (!note) return "Error: noteText required.";

    if (context.updateSettings) {
      context.updateSettings((prev: any) => {
        const safe = prev && typeof prev === "object" ? prev : {};
        const existing = typeof safe.parking === "string" ? safe.parking : "";
        const updated = existing ? `${existing}\n\n- ${note}` : `- ${note}`;
        return { ...safe, parking: updated };
      });
      return `Added note to Parking Lot: "${note}".`;
    }
    return "Error: Cannot update settings in this context.";
  }

  if (name === "read_project_todos") {
    const raw = context.doc.settings?.todos;
    let todos: any[] = [];
    if (Array.isArray(raw)) {
      todos = raw;
    } else if (raw && typeof raw === "object") {
      const keys = Object.keys(raw);
      todos = keys.length > 0 && Array.isArray((raw as any)[keys[0]]) ? (raw as any)[keys[0]] : [];
    }
    if (todos.length === 0) return "No project To-Dos found.";
    return "Project To-Dos:\n" + todos.map((t: any) => `- [${t.completed ? "x" : " "}] ${t.text}`).join("\n");
  }

  if (name === "read_parking_lot") {
    const parking = context.doc.settings?.parking;
    if (!parking) return "No parking lot notes found.";
    return typeof parking === "string" ? parking : JSON.stringify(parking, null, 2);
  }

  if (name === "read_script_bookmarks") {
    const lines = context.doc.lines || [];
    const markers = lines.filter((l) => l.marker).map((l, idx) => `Line ${idx + 1} (${l.marker?.color}): ${l.marker?.description || l.text}`);
    if (markers.length === 0) return "No markers or bookmarks found in script.";
    return "Script Bookmarks / Markers:\n" + markers.join("\n");
  }

  if (name === "tag_scene") {
    const sceneId = Number(args.sceneNumber ?? args.scene_number ?? args.scene_id ?? args.id);
    const color = args.color ? String(args.color).trim().toLowerCase() : null;
    const storyline = args.storyline ? String(args.storyline).trim() : null;

    if (!sceneId) return "Error: sceneNumber required.";
    if (!color && !storyline) return "Error: Either color or storyline parameter must be provided.";

    const scene = index.scenes.find((s) => s.id === sceneId);
    if (!scene) return `Error: Scene ${sceneId} not found.`;

    const headingLineIndex = scene.startLine - 1;
    const currentHeadingText = context.doc.lines[headingLineIndex]?.text || "";

    let newHeadingText = currentHeadingText;

    if (color) {
      newHeadingText += ` [[${color}]]`;
    }
    if (storyline) {
      const cleanStoryline = storyline.toLowerCase().startsWith("storyline") ? storyline : `storyline ${storyline}`;
      newHeadingText += ` [[${cleanStoryline}]]`;
    }

    const sceneLines = context.doc.lines.slice(scene.startLine - 1, scene.endLine);
    const newSceneFountainText = [newHeadingText, ...sceneLines.slice(1).map((l) => l.text)].join("\n");

    if (context.replaceSceneText) {
      const success = context.replaceSceneText(sceneId, newSceneFountainText);
      if (success) {
        const addedTags = [color ? `color: [[${color}]]` : "", storyline ? `storyline: [[${storyline}]]` : ""].filter(Boolean).join(", ");
        return `Successfully added tag(s) (${addedTags}) to Scene ${sceneId} heading: "${newHeadingText}".`;
      }
    }
    return `Error: Failed to tag Scene ${sceneId}. Editor unavailable.`;
  }

  if (name === "update_character_profile") {
    const rawItems = Array.isArray(args.profiles)
      ? args.profiles
      : Array.isArray(args.characters)
      ? args.characters
      : [args];

    const validProfiles: Array<{ name: string; updates: Record<string, any> }> = [];

    for (const item of rawItems) {
      if (!item || typeof item !== "object") continue;
      const cName = String(item.characterName ?? item.name ?? item.character ?? "").trim().toUpperCase();
      if (!cName) continue;
      const updates: Record<string, any> = {};
      if (item.description !== undefined) updates.description = String(item.description);
      if (item.role !== undefined) updates.role = String(item.role);
      if (item.gender !== undefined) updates.gender = String(item.gender);
      if (item.age !== undefined) updates.age = String(item.age);
      if (item.backstory !== undefined) updates.backstory = String(item.backstory);
      if (item.arc !== undefined) updates.arc = String(item.arc);
      if (item.color !== undefined) updates.color = String(item.color);
      if (Array.isArray(item.relationships)) updates.relationships = item.relationships;
      validProfiles.push({ name: cName, updates });
    }

    if (validProfiles.length === 0) {
      return "Error: characterName or profiles array is required.";
    }

    if (context.updateSettings) {
      const sf = context.scriptFileName || "";
      context.updateSettings((prev: any) => {
        const safe = prev && typeof prev === "object" ? prev : {};
        let updatedProfiles = getPerScriptSettingObject<Record<string, any>>("characterProfiles", safe, sf, {});
        let updatedGenders = getPerScriptSettingObject<Record<string, string>>("genders", safe, sf, {});

        for (const { name: cName, updates } of validProfiles) {
          const currentProfile = updatedProfiles[cName] || {};
          updatedProfiles = {
            ...updatedProfiles,
            [cName]: {
              ...currentProfile,
              ...updates,
            },
          };
          if (updates.gender) {
            updatedGenders = {
              ...updatedGenders,
              [cName]: updates.gender,
            };
          }
        }

        const updatedSettings = {
          ...safe,
          ...updatePerScriptSetting(safe, "characterProfiles", sf, updatedProfiles),
          ...updatePerScriptSetting(safe, "genders", sf, updatedGenders),
        };

        if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
          import("@tauri-apps/api/event").then(({ emit }) => {
            emit("modal:xray:init", {
              parsedDoc: context.doc,
              scriptFileName: sf,
              settings: updatedSettings,
            }).catch(() => void 0);
          }).catch(() => void 0);
        }

        return updatedSettings;
      });
      const namesStr = validProfiles.map(p => p.name).join(", ");
      return `Updated character profile(s) for ${namesStr} in X-Ray Analysis settings.`;
    }
    return "Error: Cannot update settings in this context.";
  }

  if (name === "read_character_profiles") {
    const sf = context.scriptFileName || "";
    const profiles = getPerScriptSettingObject("characterProfiles", context.doc.settings, sf, {});
    const keys = Object.keys(profiles);
    if (keys.length === 0) return "No character profiles saved yet.";
    return "Saved Character Profiles:\n" + JSON.stringify(profiles, null, 2);
  }

  if (name === "open_xray_window") {
    if (context.openXrayWindow) {
      context.openXrayWindow();
      return "Opened X-Ray Analysis window.";
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("actone:open-xray"));
      return "Triggered X-Ray Analysis window opening.";
    }
    return "Error: Unable to open X-Ray Analysis window.";
  }

  return `Error: Unknown tool "${name}"`;
}
