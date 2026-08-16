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
export interface ActStat {
  title: string;
  lineIndex: number;
  wordCount: number;
  sceneCount: number;
  percentage: number;
}

export interface MonologueInfo {
  character: string;
  wordCount: number;
  textSnippet: string;
  sceneHeading: string;
  lineIndex: number;
}

export interface BusiestSceneInfo {
  heading: string;
  characterCount: number;
  lineIndex: number;
}

export interface SettingStat {
  name: string;
  count: number;
  percentage: number;
}

export interface TimeOfDayStat {
  name: string;
  count: number;
  percentage: number;
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
  // Advanced metrics
  acts: ActStat[];
  avgWordsPerSpeech: number;
  totalSpeeches: number;
  longestMonologue: MonologueInfo | null;
  avgCharsPerScene: number;
  soloSceneCount: number;
  busiestScene: BusiestSceneInfo | null;
  intCount: number;
  extCount: number;
  comboCount: number;
  dayCount: number;
  nightCount: number;
  otherTimeCount: number;
  sceneLengthBuckets: { under1Page: number; p1to2: number; p2to3: number; p3to5: number; over5Pages: number };
  settingStats: SettingStat[];
  timeOfDayStats: TimeOfDayStat[];
}

export function computeStats(
  doc: FountainDocument,
  genders: Record<string, string>,
  profiles?: Record<string, { gender?: string; role?: string; color?: string; [key: string]: unknown }>
): ScriptStats {
  const totalLines = doc.lines.length;
  const hasTitlePage = doc.lines.some(l => l.type >= LineType.titlePageTitle && l.type <= LineType.titlePageUnknown);
  const pages = doc.pageBreaks && doc.pageBreaks.length > 0
    ? (hasTitlePage ? Math.max(1, doc.pageBreaks.length) : doc.pageBreaks.length + 1)
    : 1;

  let totalWords = 0;
  let dialogueWords = 0;
  let actionWords = 0;
  let headingCount = 0;

  const locationCounts: { [loc: string]: number } = {};
  const genderDialogueLines: Record<string, number> = { male: 0, female: 0, nonbinary: 0, unknown: 0 };

  // Advanced tracking
  let currentSpeaker = "";
  let currentSpeechWords = 0;
  let currentSpeechSnippet = "";
  let currentSpeechStartLine = 0;
  let currentSceneHeading = "OVERTURE";
  let totalSpeeches = 0;
  let longestMonologue: MonologueInfo | null = null;

  let intCount = 0;
  let extCount = 0;
  let comboCount = 0;
  let dayCount = 0;
  let nightCount = 0;
  let otherTimeCount = 0;

  const settingMap: Record<string, number> = {};
  const timeOfDayMap: Record<string, number> = {};

  const sceneLengthBuckets = { under1Page: 0, p1to2: 0, p2to3: 0, p3to5: 0, over5Pages: 0 };

  const actList: { title: string; lineIndex: number; wordCount: number; sceneCount: number }[] = [];
  let currentActWords = 0;
  let currentActScenes = 0;

  const sceneSpeakersMap = new Map<number, Set<string>>();
  let currentSceneIndex = -1;
  let currentSceneWordCount = 0;

  const finalizeScene = () => {
    if (currentSceneIndex >= 0) {
      const pageLength = currentSceneWordCount / 250;
      if (pageLength < 1) sceneLengthBuckets.under1Page++;
      else if (pageLength < 2) sceneLengthBuckets.p1to2++;
      else if (pageLength < 3) sceneLengthBuckets.p2to3++;
      else if (pageLength < 5) sceneLengthBuckets.p3to5++;
      else sceneLengthBuckets.over5Pages++;
    }
  };

  const finalizeSpeech = () => {
    if (currentSpeaker && currentSpeechWords > 0) {
      totalSpeeches++;
      if (!longestMonologue || currentSpeechWords > longestMonologue.wordCount) {
        longestMonologue = {
          character: currentSpeaker,
          wordCount: currentSpeechWords,
          textSnippet: currentSpeechSnippet.trim().slice(0, 120) + (currentSpeechSnippet.length > 120 ? "..." : ""),
          sceneHeading: currentSceneHeading,
          lineIndex: currentSpeechStartLine,
        };
      }
    }
    currentSpeechWords = 0;
    currentSpeechSnippet = "";
  };

  for (let idx = 0; idx < doc.lines.length; idx++) {
    const line = doc.lines[idx];
    const words = line.text.trim().split(/\s+/).filter((w) => w !== "").length;
    totalWords += words;
    currentActWords += words;

    if (line.type === LineType.section) {
      if (actList.length > 0) {
        actList[actList.length - 1].wordCount = currentActWords - words;
        actList[actList.length - 1].sceneCount = currentActScenes;
      }
      actList.push({
        title: line.text.replace(/^#+\s*/, "").trim(),
        lineIndex: idx,
        wordCount: 0,
        sceneCount: 0,
      });
      currentActWords = words;
      currentActScenes = 0;
    } else if (line.type === LineType.heading) {
      finalizeScene();
      finalizeSpeech();

      headingCount++;
      currentSceneIndex++;
      currentActScenes++;
      currentSceneWordCount = words;
      currentSceneHeading = line.text;
      sceneSpeakersMap.set(currentSceneIndex, new Set());

      const loc = line.location || "UNKNOWN";
      locationCounts[loc] = (locationCounts[loc] || 0) + 1;

      // Extract precise setting
      let rawSetting = (line.setting || "").toUpperCase().trim();
      if (!rawSetting) {
        const textUpper = line.text.toUpperCase();
        if (textUpper.startsWith("INT/EXT") || textUpper.startsWith("EXT/INT") || textUpper.startsWith("I/E")) {
          rawSetting = "INT/EXT";
        } else if (textUpper.startsWith("INT")) {
          rawSetting = "INT";
        } else if (textUpper.startsWith("EXT")) {
          rawSetting = "EXT";
        } else {
          rawSetting = "OTHER";
        }
      }
      if (rawSetting === "I/E" || rawSetting === "EXT/INT" || rawSetting === "INT./EXT.") rawSetting = "INT/EXT";
      if (rawSetting === "INT." || rawSetting === "INT") rawSetting = "INT";
      if (rawSetting === "EXT." || rawSetting === "EXT") rawSetting = "EXT";
      settingMap[rawSetting] = (settingMap[rawSetting] || 0) + 1;

      if (rawSetting === "INT/EXT") comboCount++;
      else if (rawSetting === "INT") intCount++;
      else if (rawSetting === "EXT") extCount++;
      else comboCount++;

      // Extract precise time of day
      let rawTod = (line.timeOfDay || "").toUpperCase().trim();
      if (!rawTod) {
        // Try parsing from heading text after dash
        const dashParts = line.text.split(/\s+-\s+/);
        if (dashParts.length > 1) {
          rawTod = dashParts[dashParts.length - 1].replace(/[[(].*?[\])]/g, "").trim().toUpperCase();
        }
      }
      if (!rawTod) rawTod = "UNSPECIFIED";
      timeOfDayMap[rawTod] = (timeOfDayMap[rawTod] || 0) + 1;

      if (["DAY", "MORNING", "AFTERNOON"].includes(rawTod)) dayCount++;
      else if (["NIGHT", "EVENING", "DUSK", "DAWN"].includes(rawTod)) nightCount++;
      else otherTimeCount++;
    } else if (line.type === LineType.character || line.type === LineType.dualDialogueCharacter) {
      finalizeSpeech();
      currentSpeaker = line.text
        .replace(/^@[ ]*/, "")
        .replace(/[ ]*\^[ ]*$/, "")
        .replace(/\s*\([^)]*\)/g, "")
        .trim()
        .toUpperCase();
      currentSpeechStartLine = idx;
      if (currentSpeaker && currentSceneIndex >= 0) {
        sceneSpeakersMap.get(currentSceneIndex)?.add(currentSpeaker);
      }
    } else if (line.type === LineType.dialogue || line.type === LineType.dualDialogue) {
      dialogueWords += words;
      currentSpeechWords += words;
      currentSpeechSnippet += (currentSpeechSnippet ? " " : "") + line.text;
      currentSceneWordCount += words;

      const rawGender = profiles?.[currentSpeaker]?.gender || genders[currentSpeaker] || "unknown";
      const gender = ["male", "female", "nonbinary"].includes(rawGender.toLowerCase()) ? rawGender.toLowerCase() : "unknown";
      genderDialogueLines[gender] = (genderDialogueLines[gender] || 0) + 1;
    } else if (line.type === LineType.action) {
      actionWords += words;
      currentSceneWordCount += words;
      finalizeSpeech();
    } else {
      currentSceneWordCount += words;
    }
  }

  finalizeScene();
  finalizeSpeech();

  if (actList.length > 0) {
    actList[actList.length - 1].wordCount = currentActWords;
    actList[actList.length - 1].sceneCount = currentActScenes;
  }

  const acts: ActStat[] = actList.map((a) => ({
    ...a,
    percentage: totalWords > 0 ? Math.round((a.wordCount / totalWords) * 100) : 0,
  }));

  const avgWordsPerSpeech = totalSpeeches > 0 ? Math.round(dialogueWords / totalSpeeches) : 0;

  // Scene density
  let soloSceneCount = 0;
  let totalCharsInScenes = 0;
  let busiestScene: BusiestSceneInfo | null = null;

  sceneSpeakersMap.forEach((speakers, sIdx) => {
    const count = speakers.size;
    totalCharsInScenes += count;
    if (count === 1) soloSceneCount++;
    if (!busiestScene || count > busiestScene.characterCount) {
      const headingLine = doc.lines.find((l, i) => l.type === LineType.heading && i <= sIdx);
      busiestScene = {
        heading: headingLine ? headingLine.text : `Scene ${sIdx + 1}`,
        characterCount: count,
        lineIndex: sIdx,
      };
    }
  });

  const avgCharsPerScene = headingCount > 0 ? Number((totalCharsInScenes / headingCount).toFixed(1)) : 0;

  const dialoguePct = totalWords > 0 ? Math.round((dialogueWords / totalWords) * 100) : 0;
  const actionPct = totalWords > 0 ? Math.round((actionWords / totalWords) * 100) : 0;

  const locations = Object.entries(locationCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  const settingStats: SettingStat[] = Object.entries(settingMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      name,
      count,
      percentage: headingCount > 0 ? Math.round((count / headingCount) * 100) : 0,
    }));

  const timeOfDayStats: TimeOfDayStat[] = Object.entries(timeOfDayMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      name,
      count,
      percentage: headingCount > 0 ? Math.round((count / headingCount) * 100) : 0,
    }));

  return {
    totalLines,
    totalWords,
    dialogueWords,
    actionWords,
    headingCount,
    pages,
    dialoguePct,
    actionPct,
    locations,
    genderDialogueLines,
    acts,
    avgWordsPerSpeech,
    totalSpeeches,
    longestMonologue,
    avgCharsPerScene,
    soloSceneCount,
    busiestScene,
    intCount,
    extCount,
    comboCount,
    dayCount,
    nightCount,
    otherTimeCount,
    sceneLengthBuckets,
    settingStats,
    timeOfDayStats,
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

