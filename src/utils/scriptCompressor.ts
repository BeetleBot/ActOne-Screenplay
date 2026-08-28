import { FountainDocument, LineType } from '../parser/FountainParser';
import { ScreenplayIndex, SceneIndexEntry } from './sceneIndexer';

export function compressSceneToStructuredText(doc: FountainDocument, scene: SceneIndexEntry): string {
  const lines = doc.lines.slice(scene.startLine - 1, scene.endLine);
  const result: string[] = [];
  const charList = scene.characters.length > 0 ? '|' + scene.characters.join(',') : '';
  result.push('S' + scene.id + '|' + scene.heading + charList);
  let currentSpeaker = '';
  let pendingParenthetical = '';
  for (const line of lines) {
    if (line.type === LineType.heading) continue;
    if (line.type === LineType.action) {
      currentSpeaker = '';
      const text = line.text.trim();
      if (text) result.push('A:' + text);
    } else if (line.type === LineType.character || line.type === LineType.dualDialogueCharacter) {
      const cleanChar = line.text.replace(/\s*\([^)]*\)/g, '').replace(/\^/g, '').trim();
      currentSpeaker = cleanChar;
      pendingParenthetical = '';
    } else if (line.type === LineType.parenthetical || line.type === LineType.dualDialogueParenthetical) {
      pendingParenthetical = line.text.trim();
    } else if (line.type === LineType.dialogue || line.type === LineType.dualDialogue) {
      const speaker = currentSpeaker || 'CHAR';
      const paren = pendingParenthetical ? pendingParenthetical + ' ' : '';
      const text = line.text.trim();
      if (text) result.push(speaker + ':' + paren + text);
      pendingParenthetical = '';
    } else if (line.type === LineType.transitionLine) {
      currentSpeaker = '';
      const text = line.text.trim();
      if (text) result.push('T:' + text);
    }
  }
  return result.join('\n');
}

export function formatCompactIndex(index: ScreenplayIndex): string {
  if (index.scenes.length === 0) return 'SCREENPLAY INDEX: Empty screenplay.';
  const header = 'SCREENPLAY INDEX (' + index.totalScenes + ' Scenes, Characters: ' + (index.characters.join(', ') || 'None') + '):\n';
  const list = index.scenes.map((s) => {
    const chars = s.characters.length > 0 ? ' [Chars: ' + s.characters.join(', ') + ']' : '';
    return 'S' + s.id + ' (L' + s.startLine + '-' + s.endLine + '): ' + s.heading + chars;
  }).join('\n');
  return header + list;
}

export interface QueryIntentContext {
  targetSceneIds: number[];
  reason: 'character_filter' | 'scene_numbers' | 'cursor' | 'fallback';
  matchedCharacters?: string[];
}

export function detectQueryIntent(
  prompt: string,
  index: ScreenplayIndex,
  activeLineNumber?: number
): QueryIntentContext {
  const lower = prompt.toLowerCase();
  const matchedCharacters: string[] = [];
  for (const char of index.characters) {
    const charRegex = new RegExp('\\b' + char.toLowerCase() + '\\b', 'i');
    if (charRegex.test(lower)) {
      matchedCharacters.push(char);
    }
  }
  if (matchedCharacters.length > 0) {
    const matchingSceneIds = index.scenes
      .filter((s) => s.characters.some((c) => matchedCharacters.includes(c)))
      .map((s) => s.id);
    if (matchingSceneIds.length > 0) {
      return {
        targetSceneIds: matchingSceneIds,
        reason: 'character_filter',
        matchedCharacters,
      };
    }
  }
  const sceneIds = new Set<number>();
  const singleSceneRegex = /\b(?:scene|s)\s*#?(\d+)\b/gi;
  let singleMatch;
  while ((singleMatch = singleSceneRegex.exec(lower)) !== null) {
    const num = parseInt(singleMatch[1], 10);
    if (num > 0 && num <= index.totalScenes) {
      sceneIds.add(num);
    }
  }
  const rangeSceneRegex = /\bscenes?\s*#?(\d+)\s*(?:-|to)\s*#?(\d+)\b/gi;
  let rangeMatch;
  while ((rangeMatch = rangeSceneRegex.exec(lower)) !== null) {
    const start = parseInt(rangeMatch[1], 10);
    const end = parseInt(rangeMatch[2], 10);
    const min = Math.min(start, end);
    const max = Math.max(start, end);
    for (let n = min; n <= max; n++) {
      if (n > 0 && n <= index.totalScenes) {
        sceneIds.add(n);
      }
    }
  }
  if (sceneIds.size > 0) {
    return {
      targetSceneIds: Array.from(sceneIds).sort((a, b) => a - b),
      reason: 'scene_numbers',
    };
  }
  const cursorKeywords = /\b(this scene|current scene|here|cursor)\b/i;
  if (cursorKeywords.test(lower) && activeLineNumber && activeLineNumber > 0) {
    const activeScene = index.scenes.find(
      (s) => activeLineNumber >= s.startLine && activeLineNumber <= s.endLine
    );
    if (activeScene) {
      return {
        targetSceneIds: [activeScene.id],
        reason: 'cursor',
      };
    }
  }
  if (activeLineNumber && activeLineNumber > 0) {
    const activeScene = index.scenes.find(
      (s) => activeLineNumber >= s.startLine && activeLineNumber <= s.endLine
    );
    if (activeScene) {
      return {
        targetSceneIds: [activeScene.id],
        reason: 'fallback',
      };
    }
  }
  return {
    targetSceneIds: [],
    reason: 'fallback',
  };
}

export function buildScreenplayContext(
  doc: FountainDocument,
  index: ScreenplayIndex,
  prompt: string,
  activeLineNumber?: number
): string {
  const intent = detectQueryIntent(prompt, index, activeLineNumber);
  const sections: string[] = [];
  sections.push(formatCompactIndex(index));
  if (intent.targetSceneIds.length > 0) {
    let sectionHeader = 'SCENE CONTEXT:';
    if (intent.reason === 'character_filter' && intent.matchedCharacters) {
      sectionHeader = 'SCENES WITH ' + intent.matchedCharacters.join(', ') + ' (Scenes ' + intent.targetSceneIds.join(', ') + '):';
    } else if (intent.reason === 'scene_numbers') {
      sectionHeader = 'REQUESTED SCENES (' + intent.targetSceneIds.map((id) => 'Scene ' + id).join(', ') + '):';
    } else if (intent.reason === 'cursor' || intent.reason === 'fallback') {
      sectionHeader = 'CURRENTLY ACTIVE SCENE (Scene ' + intent.targetSceneIds[0] + '):';
    }
    const compressedScenes = intent.targetSceneIds
      .map((id) => {
        const scene = index.scenes.find((s) => s.id === id);
        return scene ? compressSceneToStructuredText(doc, scene) : '';
      })
      .filter(Boolean)
      .join('\n\n');
    if (compressedScenes) {
      sections.push(sectionHeader + '\n' + compressedScenes);
    }
  }
  return sections.join('\n\n');
}
