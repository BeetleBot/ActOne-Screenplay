import { LineType, stripFormatting, type FountainDocument } from "../parser";

export interface XrayScene {
  number: number;
  heading: string;
  lineIndex: number;
  location: string;
  setting: string;
  time: string;
  dialogueWords: number;
  actionWords: number;
  words: number;
  seconds: number;
  offset: number;
  speakers: string[];
  speechWords: Record<string, number>;
}
export interface XrayCharacter {
  name: string;
  words: number;
  speeches: number;
  scenes: number[];
  firstLine: number;
}
export interface XrayFinding {
  title: string;
  detail: string;
  lineIndex: number;
}
export interface XrayReport {
  scenes: XrayScene[];
  characters: XrayCharacter[];
  findings: XrayFinding[];
  connections: { names: [string, string]; scenes: number[] }[];
  words: number;
  dialogueWords: number;
  actionWords: number;
  seconds: number;
  preSceneWords: number;
}
export interface XrayDistribution {
  label: string;
  value: number;
}
export function summarizeXrayWorld(report: XrayReport) {
  const locations = new Map<string, number>();
  const settings = new Map<string, number>([
    ["Interior", 0],
    ["Exterior", 0],
    ["Mixed", 0],
    ["Other", 0],
  ]);
  const times = new Map<string, number>([
    ["Day", 0],
    ["Night", 0],
    ["Other", 0],
    ["Unspecified", 0],
  ]);
  for (const scene of report.scenes) {
    locations.set(scene.location, (locations.get(scene.location) || 0) + 1);
    const setting = scene.setting.toUpperCase().replace(/[.\s]/g, "");
    const category = /^(INT\/?EXT|EXT\/?INT|I\/E|E\/I)$/.test(setting)
      ? "Mixed"
      : setting === "INT"
        ? "Interior"
        : setting === "EXT"
          ? "Exterior"
          : "Other";
    settings.set(category, settings.get(category)! + 1);
    const time = scene.time.trim().toUpperCase();
    const period =
      time === "DAY" ? "Day" : time === "NIGHT" ? "Night" : time === "UNSPECIFIED" || !time ? "Unspecified" : "Other";
    times.set(period, times.get(period)! + 1);
  }
  const entries = (map: Map<string, number>): XrayDistribution[] =>
    [...map].map(([label, value]) => ({ label, value }));
  return {
    locations: entries(locations).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label)),
    settings: entries(settings),
    times: entries(times),
  };
}
const countWords = (text: string) =>
  stripFormatting(text)
    .replace(/^[!~>@]/, "")
    .trim()
    .split(/\s+/u)
    .filter(Boolean).length;
const normalizeSpeaker = (text: string) =>
  stripFormatting(text)
    .replace(/^@\s*/, "")
    .replace(/\s*\^\s*$/, "")
    .replace(/\s*\([^)]*\)/g, "")
    .trim()
    .toUpperCase();

/** A text-based reading estimate, never a prediction of performed screen time. */
export function analyzeXray(doc: FountainDocument, dialogueWpm = 150, actionWpm = 200): XrayReport {
  const scenes: XrayScene[] = [];
  const characters = new Map<string, XrayCharacter>();
  const findings: XrayFinding[] = [];
  let scene: XrayScene | undefined;
  let speaker = "";
  let speechWords = 0;
  let speechLine = 0;
  let words = 0,
    dialogueWords = 0,
    actionWords = 0,
    preSceneWords = 0;
  const finishSpeech = () => {
    if (speaker && speechWords >= 100)
      findings.push({
        title: `Long speech · ${speaker}`,
        detail: `${speechWords} words in one speech. Consider whether the uninterrupted beat serves this moment.`,
        lineIndex: speechLine,
      });
    speechWords = 0;
  };
  // Preserve source-line navigation while excluding even multiline notes/boneyards.
  const visibleText = doc.lines
    .map((line) => line.text)
    .join("\n")
    .replace(/\/\*[\s\S]*?(?:\*\/|$)|\[\[[\s\S]*?(?:\]\]|$)/g, (value) => value.replace(/[^\n]/g, " "))
    .split("\n");
  doc.lines.forEach((sourceLine, lineIndex) => {
    const line = { ...sourceLine, text: visibleText[lineIndex] || "" };
    if (!line.text.trim()) return;
    if (line.type === LineType.heading) {
      finishSpeech();
      speaker = "";
      scene = {
        number: scenes.length + 1,
        heading: stripFormatting(line.text).replace(/#.*?#/g, "").trim(),
        lineIndex,
        location: line.location?.trim().toUpperCase() || "Unspecified location",
        setting: line.setting || "Other",
        time: line.timeOfDay || "Unspecified",
        dialogueWords: 0,
        actionWords: 0,
        words: 0,
        seconds: 0,
        offset: 0,
        speakers: [],
        speechWords: Object.create(null),
      };
      scenes.push(scene);
      return;
    }
    if (line.type === LineType.character || line.type === LineType.dualDialogueCharacter) {
      finishSpeech();
      speaker = normalizeSpeaker(line.text);
      speechLine = lineIndex;
      if (speaker) {
        let character = characters.get(speaker);
        if (!character) {
          character = { name: speaker, words: 0, speeches: 0, scenes: [], firstLine: lineIndex };
          characters.set(speaker, character);
        }
        character.speeches++;
        if (scene && !character.scenes.includes(scene.number)) character.scenes.push(scene.number);
        if (scene && !scene.speakers.includes(speaker)) scene.speakers.push(speaker);
      }
      return;
    }
    const dialogue = line.type === LineType.dialogue || line.type === LineType.dualDialogue;
    const action = [LineType.action, LineType.lyrics, LineType.centered, LineType.shot].includes(line.type);
    if (
      !dialogue &&
      ![
        LineType.parenthetical,
        LineType.dualDialogueParenthetical,
        LineType.empty,
        LineType.more,
        LineType.dualDialogueMore,
      ].includes(line.type)
    ) {
      finishSpeech();
      speaker = "";
    }
    if (!dialogue && !action) return;
    if (action) {
      finishSpeech();
      speaker = "";
    }
    const n = countWords(line.text);
    words += n;
    if (dialogue) dialogueWords += n;
    else actionWords += n;
    if (!scene) preSceneWords += n;
    if (scene) {
      scene.words += n;
      if (dialogue) scene.dialogueWords += n;
      else scene.actionWords += n;
      if (dialogue && speaker) scene.speechWords[speaker] = (scene.speechWords[speaker] || 0) + n;
    }
    if (dialogue && speaker) {
      characters.get(speaker)!.words += n;
      speechWords += n;
    }
  });
  finishSpeech();
  const safeDialogueWpm = Number.isFinite(dialogueWpm) && dialogueWpm > 0 ? dialogueWpm : 150;
  const safeActionWpm = Number.isFinite(actionWpm) && actionWpm > 0 ? actionWpm : 200;
  let offset = 0;
  const pairs = new Map<string, { names: [string, string]; scenes: number[] }>();
  for (const s of scenes) {
    s.seconds = Math.round(60 * (s.dialogueWords / safeDialogueWpm + s.actionWords / safeActionWpm));
    s.offset = offset;
    offset += s.seconds;
    if (s.words === 0)
      findings.push({
        title: `Scene ${s.number} has no body text`,
        detail:
          "This heading has no action or dialogue. Check whether it is a placeholder or an intentional transition.",
        lineIndex: s.lineIndex,
      });
    if (s.seconds >= 180)
      findings.push({
        title: `Extended scene · ${s.number}`,
        detail: `${s.words} words; about ${Math.round(s.seconds / 60)} minutes at the selected reading rates. Review the scene's internal turns.`,
        lineIndex: s.lineIndex,
      });
    if (s.words >= 100 && s.dialogueWords / s.words >= 0.85)
      findings.push({
        title: `Dialogue-heavy scene · ${s.number}`,
        detail: `${Math.round((s.dialogueWords / s.words) * 100)}% dialogue by word count. Review opportunities for visual storytelling.`,
        lineIndex: s.lineIndex,
      });
    for (let i = 0; i < s.speakers.length; i++)
      for (let j = i + 1; j < s.speakers.length; j++) {
        const names = [s.speakers[i], s.speakers[j]].sort() as [string, string];
        const key = JSON.stringify(names);
        if (!pairs.has(key)) pairs.set(key, { names, scenes: [] });
        pairs.get(key)!.scenes.push(s.number);
      }
  }
  return {
    scenes,
    characters: [...characters.values()].sort((a, b) => b.words - a.words || a.name.localeCompare(b.name)),
    findings,
    connections: [...pairs.values()].sort((a, b) => b.scenes.length - a.scenes.length),
    words,
    dialogueWords,
    actionWords,
    seconds: Math.round(60 * (dialogueWords / safeDialogueWpm + actionWords / safeActionWpm)),
    preSceneWords,
  };
}
