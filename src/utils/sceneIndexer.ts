import { FountainDocument, LineType } from "../parser/FountainParser";

export interface SceneIndexEntry {
  id: number;
  heading: string;
  startLine: number;
  endLine: number;
  sceneNumber?: string;
  characters: string[];
  setting?: string | null;
  location?: string | null;
  timeOfDay?: string | null;
}

export interface ScreenplayIndex {
  totalScenes: number;
  totalLines: number;
  characters: string[];
  scenes: SceneIndexEntry[];
}

export function buildScreenplayIndex(doc: FountainDocument): ScreenplayIndex {
  const lines = doc.lines || [];
  const scenes: SceneIndexEntry[] = [];
  const allCharacters = new Set<string>();

  let currentScene: Partial<SceneIndexEntry> | null = null;
  let sceneCount = 0;
  let currentCharacters = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    if (line.type === LineType.character || line.type === LineType.dualDialogueCharacter) {
      const cleanChar = line.text.replace(/\s*\([^)]*\)/g, "").replace(/\^/g, "").trim();
      if (cleanChar) {
        allCharacters.add(cleanChar);
        if (currentScene) {
          currentCharacters.add(cleanChar);
        }
      }
    }

    if (line.type === LineType.heading) {
      if (currentScene) {
        currentScene.endLine = lineNumber - 1;
        currentScene.characters = Array.from(currentCharacters);
        scenes.push(currentScene as SceneIndexEntry);
      }

      sceneCount++;
      currentCharacters = new Set<string>();

      currentScene = {
        id: sceneCount,
        heading: line.text,
        startLine: lineNumber,
        endLine: lines.length,
        sceneNumber: line.sceneNumber || String(sceneCount),
        setting: line.setting || null,
        location: line.location || null,
        timeOfDay: line.timeOfDay || null,
        characters: [],
      };
    }
  }

  if (currentScene) {
    currentScene.endLine = lines.length;
    currentScene.characters = Array.from(currentCharacters);
    scenes.push(currentScene as SceneIndexEntry);
  }

  return {
    totalScenes: scenes.length,
    totalLines: lines.length,
    characters: Array.from(allCharacters).sort(),
    scenes,
  };
}

export function formatIndexForPrompt(index: ScreenplayIndex): string {
  if (index.scenes.length === 0) {
    return "SCREENPLAY INDEX: Empty screenplay.";
  }

  const header = `SCREENPLAY INDEX (${index.totalScenes} Scenes, Characters: ${index.characters.join(", ") || "None"}):\n`;
  const sceneList = index.scenes.map((s) => {
    const chars = s.characters.length > 0 ? ` [Chars: ${s.characters.join(", ")}]` : "";
    return `Scene ${s.id} (L${s.startLine}-${s.endLine}): ${s.heading}${chars}`;
  }).join("\n");

  return header + sceneList;
}
