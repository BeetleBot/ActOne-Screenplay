import { LineType, stripFormatting, type FountainDocument } from "../parser/FountainParser";
import { buildScreenplayIndex } from "../utils/sceneIndexer";

export interface UrAISceneRef {
  id: number;
  label: string;
  heading: string;
  startLine: number;
  endLine: number;
}

export interface UrAISource extends UrAISceneRef {
  explicitLabel: boolean;
  text: string;
  location: string;
  dialogue: { speaker: string; line: number; text: string }[];
}

export function sceneRef({ id, label, heading, startLine, endLine }: UrAISceneRef): UrAISceneRef {
  return { id, label, heading, startLine, endLine };
}

export function screenplaySources(doc: FountainDocument): UrAISource[] {
  return buildScreenplayIndex(doc).scenes.map((scene) => {
    const lines = doc.lines.slice(scene.startLine - 1, scene.endLine);
    const dialogue: UrAISource["dialogue"] = [];
    let speaker = "";
    lines.forEach((line, offset) => {
      if (line.type === LineType.character || line.type === LineType.dualDialogueCharacter) {
        speaker = stripFormatting(line.text).replace(/\s*\([^)]*\)/g, "").replace(/^@\s*|\s*\^\s*$/g, "").trim();
      } else if (speaker && (line.type === LineType.dialogue || line.type === LineType.dualDialogue)) {
        dialogue.push({ speaker, line: scene.startLine + offset, text: line.text });
      } else if (line.type !== LineType.parenthetical && line.type !== LineType.dualDialogueParenthetical) {
        speaker = "";
      }
    });
    return {
      id: scene.id,
      label: scene.sceneNumber ?? String(scene.id),
      explicitLabel: Boolean(lines[0]?.sceneNumber),
      heading: scene.heading,
      startLine: scene.startLine,
      endLine: scene.endLine,
      text: lines.map((line) => line.text).join("\n"),
      location: scene.location ?? "",
      dialogue,
    };
  });
}

export function locateScene(sources: UrAISource[], ref: UrAISceneRef): UrAISource | undefined {
  const matches = sources.filter((scene) => scene.label === ref.label && scene.heading === ref.heading);
  if (matches.length === 1) return matches[0];
  // A renumbered scene can still be found by a unique unchanged heading.
  const headings = sources.filter((scene) => scene.heading.replace(/#[^#\s]+#/g, "").trim() === ref.heading.replace(/#[^#\s]+#/g, "").trim());
  return headings.length === 1 ? headings[0] : undefined;
}

export interface UrAIFocus {
  ids: number[];
  error?: string;
}

export interface UrAIRevisionNote {
  id: string;
  text: string;
  kind: "revision" | "setup";
  scene: UrAISceneRef;
}

export function resolveSceneFocus(
  query: string, sources: UrAISource[], cursorLine?: number, previous: UrAISceneRef[] = [],
): UrAIFocus {
  const ids = new Set<number>();
  const hasSceneNumbers = sources.some((scene) => scene.explicitLabel);
  const byLabel = (label: string) => {
    const matches = sources.filter((scene) =>
      scene.label.toLowerCase() === label.toLowerCase() && (!hasSceneNumbers || scene.explicitLabel));
    if (matches.length === 1) return matches[0];
    if (!matches.length) throw new Error(`Scene ${label} was not found in the current screenplay.`);
    throw new Error(`Scene ${label} matches multiple headings. Specify its position: ${matches.map((scene) => `${scene.id} (${scene.heading})`).join(", ")}.`);
  };
  try {
    for (const match of query.matchAll(/\b(?:(\d+)(?:st|nd|rd|th)\s+scene|scene\s+at\s+position\s+(\d+))\b/gi)) {
      const scene = match[1] ? byLabel(match[1]) : sources.find(({ id }) => id === Number(match[2]));
      if (!scene) throw new Error(`The screenplay does not have a ${match[0]}.`);
      ids.add(scene.id);
    }
    for (const match of query.matchAll(/\bscenes?\s+(#?\d+[a-z]*#?(?:\s*(?:,\s*(?:and\s+)?|\band\s+|\bto\s+|[-–—]\s*)#?\d+[a-z]*#?)*)\b#?/gi)) {
      const parts = match[1].split(/\s*(,\s*(?:and\s+)?|\band\b|\bto\b|[-–—])\s*/i);
      let prior = byLabel(parts[0].replaceAll("#", ""));
      ids.add(prior.id);
      for (let index = 1; index < parts.length; index += 2) {
        const scene = byLabel(parts[index + 1].replaceAll("#", ""));
        if (/^(?:to|[-–—])$/i.test(parts[index])) {
          for (const entry of sources.slice(Math.min(prior.id, scene.id) - 1, Math.max(prior.id, scene.id))) ids.add(entry.id);
        }
        ids.add(scene.id);
        prior = scene;
      }
    }
    if (ids.size) return { ids: [...ids] };
    if (/\b(?:this|current|active) scene\b/i.test(query)) {
      const scene = sources.find(({ startLine, endLine }) => cursorLine !== undefined && cursorLine >= startLine && cursorLine <= endLine);
      return scene ? { ids: [scene.id] } : { ids: [], error: "Place the cursor inside a scene first." };
    }
    const next = /\b(next|previous|preceding) scene\b/i.exec(query);
    const anchor = previous.at(-1);
    const current = anchor && locateScene(sources, anchor);
    if (next) {
      if (!current) return { ids: [], error: "Tell UrAI which scene to start from first." };
      const scene = sources[current.id - 1 + (next[1].toLowerCase() === "next" ? 1 : -1)];
      return scene ? { ids: [scene.id] } : { ids: [], error: "There is no scene in that direction." };
    }
    return { ids: previous.flatMap((ref) => {
      const scene = locateScene(sources, ref);
      return scene ? [scene.id] : [];
    }) };
  } catch (error) {
    return { ids: [], error: (error as Error).message };
  }
}
