import { FountainDocument } from "../parser/FountainParser";
import { buildScreenplayIndex } from "../utils/sceneIndexer";

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
    description: "Search the screenplay text for specific keywords or character dialogue.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Keyword or character name to search for across all scenes",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "read_project_todos",
    description: "Retrieve the list of active To-Dos and tasks for this screenplay project.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "read_parking_lot",
    description: "Retrieve the scratchpad / parking lot notes stored in this screenplay project.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
];

export interface ToolExecutionContext {
  doc: FountainDocument | null;
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
    const sceneId = Number(args.sceneNumber);
    const scene = index.scenes.find((s) => s.id === sceneId);
    if (!scene) {
      return `Error: Scene ${sceneId} not found. Total scenes in document: ${index.totalScenes}`;
    }

    const lines = context.doc.lines.slice(scene.startLine - 1, scene.endLine);
    const rawText = lines.map((l) => l.text).join("\n");
    return `--- CONTENT OF SCENE ${scene.id} (${scene.heading}) ---\n${rawText}`;
  }

  if (name === "search_script") {
    const query = String(args.query || "").toLowerCase();
    if (!query) {
      return "Error: Search query cannot be empty.";
    }

    const matches: string[] = [];
    const lines = context.doc.lines || [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.text.toLowerCase().includes(query)) {
        // Find which scene this line belongs to
        const lineNo = i + 1;
        const matchingScene = index.scenes.find((s) => lineNo >= s.startLine && lineNo <= s.endLine);
        const sceneInfo = matchingScene ? `[Scene ${matchingScene.id}: ${matchingScene.heading}]` : "";
        matches.push(`Line ${lineNo} ${sceneInfo}: ${line.text}`);
      }
    }

    if (matches.length === 0) {
      return `No matches found for query "${query}".`;
    }

    const limit = 20;
    const truncated = matches.slice(0, limit);
    let result = `Found ${matches.length} matching line(s) for "${query}":\n` + truncated.join("\n");
    if (matches.length > limit) {
      result += `\n...and ${matches.length - limit} more match(es).`;
    }
    return result;
  }

  if (name === "read_project_todos") {
    const todos = context.doc.settings?.todos;
    if (!todos || !Array.isArray(todos) || todos.length === 0) {
      return "No project To-Dos found.";
    }
    return "Project To-Dos:\n" + JSON.stringify(todos, null, 2);
  }

  if (name === "read_parking_lot") {
    const parking = context.doc.settings?.parking;
    if (!parking) {
      return "No parking lot notes found.";
    }
    return typeof parking === "string" ? parking : JSON.stringify(parking, null, 2);
  }

  return `Error: Unknown tool "${name}"`;
}
