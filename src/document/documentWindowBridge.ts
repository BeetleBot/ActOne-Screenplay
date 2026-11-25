import type { FountainDocument } from "../parser";
import { peekXrayReport, primeXrayReport, type XrayReport } from "../utils/xray";
import { documentSnapshotId } from "./documentIdentity";

export interface XrayWindowPayload {
  parsedDoc: FountainDocument | null;
  scriptFileName: string;
  settings: Record<string, unknown>;
  report: XrayReport | null;
  snapshotId?: number;
}

/** Transport never initiates analysis on the editor thread. Missing reports are
 * calculated by X-Ray, then returned for reuse by other consumers. */
export function createXrayWindowData(
  parsedDoc: FountainDocument | null,
  scriptFileName: string,
  settings: Record<string, unknown> = parsedDoc?.settings || {},
): XrayWindowPayload {
  return {
    parsedDoc,
    scriptFileName,
    settings,
    snapshotId: parsedDoc ? documentSnapshotId(parsedDoc.lines) : undefined,
    report: parsedDoc ? (peekXrayReport(parsedDoc) ?? null) : null,
  };
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
const count = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;
const numbers = (value: unknown): boolean => Array.isArray(value) && value.every(count);
const strings = (value: unknown): boolean => Array.isArray(value) && value.every((item) => typeof item === "string");

/** Validate window input before another window can populate shared data. */
export function isXrayReport(value: unknown): value is XrayReport {
  if (
    !record(value) ||
    ![value.words, value.dialogueWords, value.actionWords, value.seconds, value.preSceneWords].every(count)
  )
    return false;
  return (
    Array.isArray(value.scenes) &&
    value.scenes.every(
      (scene) =>
        record(scene) &&
        [
          scene.number,
          scene.lineIndex,
          scene.dialogueWords,
          scene.actionWords,
          scene.words,
          scene.seconds,
          scene.offset,
        ].every(count) &&
        [scene.heading, scene.location, scene.setting, scene.time].every((item) => typeof item === "string") &&
        strings(scene.speakers) &&
        record(scene.speechWords) &&
        Object.values(scene.speechWords).every(count),
    ) &&
    Array.isArray(value.characters) &&
    value.characters.every(
      (character) =>
        record(character) &&
        typeof character.name === "string" &&
        [character.words, character.speeches, character.firstLine].every(count) &&
        numbers(character.scenes),
    ) &&
    Array.isArray(value.findings) &&
    value.findings.every(
      (finding) =>
        record(finding) &&
        typeof finding.title === "string" &&
        typeof finding.detail === "string" &&
        count(finding.lineIndex),
    ) &&
    Array.isArray(value.connections) &&
    value.connections.every(
      (connection) =>
        record(connection) &&
        strings(connection.names) &&
        (connection.names as string[]).length === 2 &&
        numbers(connection.scenes),
    )
  );
}

export function acceptXrayWindowReport(doc: FountainDocument | null, payload: unknown): boolean {
  if (!doc || !record(payload) || payload.snapshotId !== documentSnapshotId(doc.lines) || !isXrayReport(payload.report))
    return false;
  primeXrayReport(doc, payload.report);
  return true;
}
