import { LineType, type FountainDocument } from "../parser";
import { computeStats } from "../utils/analysis";
import { analyzeXray, summarizeXrayWorld } from "../utils/xray";
import type { UrAISource } from "./uraiSources";

export function screenplayStatistics(doc: FountainDocument, sources: UrAISource[]) {
  const report = analyzeXray(doc);
  const stats = computeStats(doc, {});
  const breaks = doc.pageBreaks ?? [];
  const hasTitle = doc.lines.some((line) => line.type >= LineType.titlePageTitle && line.type <= LineType.titlePageUnknown);
  const pageOf = (line: number) => Math.max(1, 1 + breaks.filter((start) => start <= line).length - Number(hasTitle && breaks.length > 0));
  const scenes = report.scenes.flatMap((scene) => {
    const source = sources[scene.number - 1];
    if (!source) return [];
    let lastLine = source.endLine;
    while (lastLine > source.startLine && [LineType.empty, LineType.section, LineType.synopse, LineType.pageBreak].includes(doc.lines[lastLine - 1].type)) lastLine--;
    const firstPage = pageOf(source.startLine);
    const lastPage = pageOf(lastLine);
    return [{
      id: source.id, label: source.label, heading: scene.heading, words: scene.words,
      dialogueWords: scene.dialogueWords, actionWords: scene.actionWords, readingSeconds: Math.round(scene.seconds),
      firstPage, lastPage, pages: lastPage - firstPage + 1,
      speakers: scene.speakers,
    }];
  });
  const monologue = stats.longestMonologue;
  const monologueScene = monologue && sources.find((source) => monologue.lineIndex + 1 >= source.startLine && monologue.lineIndex + 1 <= source.endLine);
  const world = summarizeXrayWorld(report);
  return {
    overview: {
      scenes: sources.length, pages: sources.length ? stats.pages : 0, characters: report.characters.length,
      words: report.words, dialogueWords: report.dialogueWords, actionWords: report.actionWords,
      readingSeconds: Math.round(report.seconds), totalSpeeches: stats.totalSpeeches,
      averageWordsPerSpeech: stats.avgWordsPerSpeech,
    },
    longestSpeech: monologue ? {
      character: monologue.character, words: monologue.wordCount, snippet: monologue.textSnippet,
      id: monologueScene?.id, label: monologueScene?.label, line: monologue.lineIndex + 1,
    } : null,
    scenes,
    characters: report.characters.map((character) => ({
      name: character.name, words: character.words, speeches: character.speeches,
      sceneCount: character.scenes.length, sceneIds: character.scenes, firstLine: character.firstLine + 1,
    })),
    findings: report.findings.map((finding) => ({
      title: finding.title, detail: finding.detail, line: finding.lineIndex + 1,
      id: sources.find((source) => finding.lineIndex + 1 >= source.startLine && finding.lineIndex + 1 <= source.endLine)?.id,
    })),
    connections: report.connections.map((connection) => ({ names: connection.names, sceneIds: connection.scenes })),
    ...world,
  };
}

export type UrAIStatistics = ReturnType<typeof screenplayStatistics>;

export function requestedStatistics(query: string): string | undefined {
  if (/\b(?:longest|largest|biggest)\s+(?:single\s+)?(?:dialogue|monologue|speech)\b/i.test(query)) return "dialogue";
  if (/\b(?:scenes?|scene)\b.*\b(?:most|longest|largest|pages?)\b|\b(?:longest|largest)\s+scenes?\b/i.test(query)) {
    if (/\b(?:pages?|longest|largest|reading time|dialogue|action|words)\b/i.test(query)) return "scenes";
  }
  if (/\b(?:who speaks|speaks the most|most (?:dialogue|speeches)|character statistics|cast breakdown)\b/i.test(query)) return "characters";
  if (/\bx[ -]?ray\b/i.test(query)) return "xray";
  if (/\b(?:statistics|stats|word count|page count|how many (?:scenes|pages|characters|words))\b/i.test(query)) return "overview";
}
