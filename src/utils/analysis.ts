import { LineType, type FountainDocument } from "../parser";

export interface CharacterEntry {
  name: string;
  lineCount: number;
  gender: string;
  wordCount: number;
  sceneCount: number;
  dialoguePercentage: number;
  role: string;
  color: string;
}


export function extractCharacters(
  doc: FountainDocument,
  genders: Record<string, string>,
  profiles?: Record<string, { gender?: string; role?: string; color?: string; [key: string]: unknown }>
): CharacterEntry[] {
  const charactersMap: Record<string, { lineCount: number; wordCount: number; scenes: Set<number> }> = {};
  let currentSpeaker = "";
  let sceneIndex = -1;
  let totalDialogueWords = 0;

  for (const line of doc.lines) {
    const words = line.text.trim().split(/\s+/).filter((w) => w !== "").length;

    if (line.type === LineType.heading) {
      sceneIndex++;
    } else if (line.type === LineType.character || line.type === LineType.dualDialogueCharacter) {
      currentSpeaker = line.text
        .replace(/^@[ ]*/, "")
        .replace(/[ ]*\^[ ]*$/, "")
        .replace(/\s*\([^)]*\)/g, "")
        .trim()
        .toUpperCase();
      if (currentSpeaker) {
        if (!charactersMap[currentSpeaker]) {
          charactersMap[currentSpeaker] = { lineCount: 0, wordCount: 0, scenes: new Set() };
        }
        charactersMap[currentSpeaker].lineCount++;
        if (sceneIndex >= 0) {
          charactersMap[currentSpeaker].scenes.add(sceneIndex);
        }
      }
    } else if (line.type === LineType.dialogue || line.type === LineType.dualDialogue) {
      if (currentSpeaker && charactersMap[currentSpeaker]) {
        charactersMap[currentSpeaker].wordCount += words;
        totalDialogueWords += words;
      }
    }
  }

  return Object.entries(charactersMap)
    .map(([name, data]) => {
      const profile = profiles?.[name] || {};
      const gender = profile.gender || genders[name] || "unknown";
      const role = profile.role || "—";
      const color = profile.color || "";
      const dialoguePercentage = totalDialogueWords > 0 ? (data.wordCount / totalDialogueWords) * 100 : 0;
      return {
        name,
        lineCount: data.lineCount,
        gender,
        wordCount: data.wordCount,
        sceneCount: data.scenes.size,
        dialoguePercentage,
        role,
        color,
      };
    })
    .sort((a, b) => b.wordCount - a.wordCount);
}

export interface ScriptStats {
  totalLines: number;
  totalWords: number;
  dialogueWords: number;
  actionWords: number;
  headingCount: number;
  pages: number;
  dialoguePct: number;
  actionPct: number;
  locations: { name: string; count: number }[];
  genderDialogueLines: Record<string, number>;
}

export function computeStats(
  doc: FountainDocument,
  genders: Record<string, string>,
  profiles?: Record<string, { gender?: string; role?: string; color?: string; [key: string]: unknown }>
): ScriptStats {
  const totalLines = doc.lines.length;
  const pages = doc.pageBreaks ? doc.pageBreaks.length + 1 : 1;

  let totalWords = 0;
  let dialogueWords = 0;
  let actionWords = 0;
  let headingCount = 0;

  const locationCounts: { [loc: string]: number } = {};
  const genderDialogueLines: Record<string, number> = { male: 0, female: 0, nonbinary: 0, unknown: 0 };

  let currentSpeaker = "";

  for (const line of doc.lines) {
    const words = line.text.trim().split(/\s+/).filter((w) => w !== "").length;
    totalWords += words;

    if (line.type === LineType.heading) {
      headingCount++;
      const loc = line.location || "UNKNOWN";
      locationCounts[loc] = (locationCounts[loc] || 0) + 1;
    } else if (line.type === LineType.character || line.type === LineType.dualDialogueCharacter) {
      currentSpeaker = line.text
        .replace(/^@[ ]*/, "")
        .replace(/[ ]*\^[ ]*$/, "")
        .replace(/\s*\([^)]*\)/g, "")
        .trim()
        .toUpperCase();
    } else if (line.type === LineType.dialogue || line.type === LineType.dualDialogue) {
      dialogueWords += words;
      const rawGender = profiles?.[currentSpeaker]?.gender || genders[currentSpeaker] || "unknown";
      const gender = ["male", "female", "nonbinary"].includes(rawGender.toLowerCase()) ? rawGender.toLowerCase() : "unknown";
      genderDialogueLines[gender] = (genderDialogueLines[gender] || 0) + 1;
    } else if (line.type === LineType.action) {
      actionWords += words;
    }
  }


  const dialoguePct = totalWords > 0 ? Math.round((dialogueWords / totalWords) * 100) : 0;
  const actionPct = totalWords > 0 ? Math.round((actionWords / totalWords) * 100) : 0;

  const locations = Object.entries(locationCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  return {
    totalLines, totalWords, dialogueWords, actionWords,
    headingCount, pages, dialoguePct, actionPct,
    locations, genderDialogueLines,
  };
}

export interface SceneTiming {
  heading: string;
  dialogueWords: number;
  actionWords: number;
  totalWords: number;
  durationSeconds: number;
  offsetSeconds: number;
  lineIndex: number;
}

export function computeSceneTiming(doc: FountainDocument): SceneTiming[] {
  const timings: SceneTiming[] = [];
  let currentScene: Omit<SceneTiming, "offsetSeconds"> | null = null;
  let cumulativeOffset = 0;
  let lineIndex = -1;

  for (const line of doc.lines) {
    lineIndex++;
    const words = line.text.trim().split(/\s+/).filter((w) => w !== "").length;

    if (line.type === LineType.heading) {
      if (currentScene) {
        const duration = Math.max(5, Math.round((currentScene.totalWords / 250) * 60));
        timings.push({
          ...currentScene,
          durationSeconds: duration,
          offsetSeconds: cumulativeOffset,
        });
        cumulativeOffset += duration;
      }
      currentScene = {
        heading: line.text,
        dialogueWords: 0,
        actionWords: 0,
        totalWords: words,
        durationSeconds: 0,
        lineIndex,
      };
    } else if (currentScene) {
      currentScene.totalWords += words;
      if (line.type === LineType.dialogue || line.type === LineType.dualDialogue) {
        currentScene.dialogueWords += words;
      } else if (line.type === LineType.action) {
        currentScene.actionWords += words;
      }
    }
  }

  if (currentScene) {
    const duration = Math.max(5, Math.round((currentScene.totalWords / 250) * 60));
    timings.push({
      ...currentScene,
      durationSeconds: duration,
      offsetSeconds: cumulativeOffset,
    });
  }

  return timings;
}

export interface CharacterConnection {
  source: string;
  target: string;
  interactions: number;
}

export function computeCharacterConnections(doc: FountainDocument): CharacterConnection[] {
  const connectionsMap: Record<string, Record<string, number>> = {};
  let currentSceneSpeakers = new Set<string>();

  for (const line of doc.lines) {
    if (line.type === LineType.heading) {
      // Process the accumulated speakers of the scene
      const speakers = Array.from(currentSceneSpeakers);
      for (let i = 0; i < speakers.length; i++) {
        for (let j = i + 1; j < speakers.length; j++) {
          const s1 = speakers[i];
          const s2 = speakers[j];
          const [first, second] = s1 < s2 ? [s1, s2] : [s2, s1];
          if (!connectionsMap[first]) connectionsMap[first] = {};
          connectionsMap[first][second] = (connectionsMap[first][second] || 0) + 1;
        }
      }
      currentSceneSpeakers = new Set<string>();
    } else if (line.type === LineType.character || line.type === LineType.dualDialogueCharacter) {
      const name = line.text.replace(/^@[ ]*/, "").replace(/[ ]*\^[ ]*$/, "").replace(/\s*\([^)]*\)/g, "").trim().toUpperCase();
      if (name) {
        currentSceneSpeakers.add(name);
      }
    }
  }

  // Process the final scene
  const speakers = Array.from(currentSceneSpeakers);
  for (let i = 0; i < speakers.length; i++) {
    for (let j = i + 1; j < speakers.length; j++) {
      const s1 = speakers[i];
      const s2 = speakers[j];
      const [first, second] = s1 < s2 ? [s1, s2] : [s2, s1];
      if (!connectionsMap[first]) connectionsMap[first] = {};
      connectionsMap[first][second] = (connectionsMap[first][second] || 0) + 1;
    }
  }

  const connections: CharacterConnection[] = [];
  for (const source of Object.keys(connectionsMap)) {
    for (const target of Object.keys(connectionsMap[source])) {
      connections.push({
        source,
        target,
        interactions: connectionsMap[source][target],
      });
    }
  }

  return connections;
}

