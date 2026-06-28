import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";
import { logger } from "./logger";

const ACTONE_MAGIC = new Uint8Array([0x41, 0x43, 0x54, 0x31]); // "ACT1"
const MAGIC_LENGTH = 4;

export interface ScriptInfo {
  name: string;
  fileName: string;
  content: string;
  savedContent: string;
}

export interface ActoneBundle {
  scripts: ScriptInfo[];
  settings: Record<string, any>;
}

export function unpackActoneBundle(bytes: Uint8Array, bundleName?: string): ActoneBundle {
  const hasMagic = bytes.length >= MAGIC_LENGTH &&
    bytes[bytes.length - 4] === ACTONE_MAGIC[0] &&
    bytes[bytes.length - 3] === ACTONE_MAGIC[1] &&
    bytes[bytes.length - 2] === ACTONE_MAGIC[2] &&
    bytes[bytes.length - 1] === ACTONE_MAGIC[3];
  const zipBytes = hasMagic ? bytes.slice(0, bytes.length - MAGIC_LENGTH) : bytes;
  const unzipped = unzipSync(zipBytes);

  let parsedSettings: Record<string, any> = {};
  let gendersData: Record<string, any> = {};
  let todosData: unknown[] = [];
  let parkingData: unknown[] = [];
  let notepadData: unknown = "";
  let sprintData: unknown[] = [];
  let productionTagsData: { tags: unknown[]; definitions: unknown[] } = { tags: [], definitions: [] };

  if (unzipped["settings.json"]) {
    try { parsedSettings = JSON.parse(strFromU8(unzipped["settings.json"])); } catch (e) { logger.warn("actone", "Failed to parse settings.json", e); }
  }
  if (unzipped["characters.json"]) {
    try { const chars = JSON.parse(strFromU8(unzipped["characters.json"])); gendersData = chars; } catch (e) { logger.warn("actone", "Failed to parse characters.json", e); }
  }
  if (unzipped["todos.json"]) {
    try { todosData = JSON.parse(strFromU8(unzipped["todos.json"])); } catch (e) { logger.warn("actone", "Failed to parse todos.json", e); }
  }
  if (unzipped["parking.json"]) {
    try { parkingData = JSON.parse(strFromU8(unzipped["parking.json"])); } catch (e) { logger.warn("actone", "Failed to parse parking.json", e); }
  }
  if (unzipped["notepad.json"]) {
    try { notepadData = JSON.parse(strFromU8(unzipped["notepad.json"])); } catch (e) { logger.warn("actone", "Failed to parse notepad.json", e); }
  }
  if (unzipped["sprint_data.json"]) {
    try { sprintData = JSON.parse(strFromU8(unzipped["sprint_data.json"])); } catch (e) { logger.warn("actone", "Failed to parse sprint_data.json", e); }
  }
  if (unzipped["production_tags.json"]) {
    try { productionTagsData = JSON.parse(strFromU8(unzipped["production_tags.json"])); } catch (e) { logger.warn("actone", "Failed to parse production_tags.json", e); }
  }

  let scripts: ScriptInfo[];

  const settings: Record<string, any> = {
    ...parsedSettings,
    sprintHistory: sprintData,
    productionTags: productionTagsData,
  };

  if (unzipped["fountain.json"]) {
    const manifest: { name: string; file: string }[] = JSON.parse(strFromU8(unzipped["fountain.json"]));
    scripts = manifest.map((entry) => {
      const content = unzipped[entry.file] ? strFromU8(unzipped[entry.file]) : "";
      return { name: entry.name, fileName: entry.file, content, savedContent: content };
    });
    if (scripts.length === 0) {
      const name = bundleName || "Untitled";
      scripts = [{ name, fileName: `${name}.fountain`, content: "", savedContent: "" }];
    }
  } else {
    const content = unzipped["document.fountain"] ? strFromU8(unzipped["document.fountain"]) : "";
    const name = bundleName || "Untitled";
    scripts = [{ name, fileName: "document.fountain", content, savedContent: content }];
  }

  if (scripts.length > 1) {
    settings.notepad = notepadData && typeof notepadData === 'object' && !Array.isArray(notepadData)
      ? notepadData
      : scripts.reduce((acc, s) => ({ ...acc, [s.fileName]: notepadData }), {} as Record<string, any>);
    settings.genders = gendersData && typeof gendersData === 'object' && !Array.isArray(gendersData)
      ? (Object.keys(gendersData).some(k => scripts.some(s => s.fileName === k))
        ? gendersData
        : (gendersData as any).genders
          ? scripts.reduce((acc, s) => ({ ...acc, [s.fileName]: gendersData }), {} as Record<string, any>)
          : gendersData)
      : scripts.reduce((acc, s) => ({ ...acc, [s.fileName]: gendersData }), {} as Record<string, any>);
    settings.todos = todosData && Array.isArray(todosData) && todosData.length > 0 && typeof todosData[0] !== 'string'
      ? scripts.reduce((acc, s) => ({ ...acc, [s.fileName]: todosData }), {} as Record<string, any>)
      : (todosData && typeof todosData === 'object' && !Array.isArray(todosData)
        ? todosData
        : scripts.reduce((acc, s) => ({ ...acc, [s.fileName]: todosData }), {} as Record<string, any>));
    settings.parking = parkingData && typeof parkingData === 'object' && !Array.isArray(parkingData)
      ? parkingData
      : scripts.reduce((acc, s) => ({ ...acc, [s.fileName]: parkingData }), {} as Record<string, any>);
  } else {
    settings.notepad = notepadData;
    settings.genders = gendersData && typeof gendersData === 'object' && (gendersData as any).genders
      ? (gendersData as any).genders
      : gendersData;
    settings.todos = todosData;
    settings.parking = parkingData;
  }
  return { scripts, settings };
}

export function packActoneBundle(scripts: ScriptInfo[], settings: Record<string, any>): Uint8Array {
  const {
    genders, todos, parking, notepad, sprintHistory: sprintData, productionTags, ...restSettings
  } = settings || {};

  const resolvePerScript = (key: string, scripts: ScriptInfo[]): any => {
    const val = (settings || {})[key];
    if (!val || scripts.length <= 1) return val;
    const result: Record<string, any> = {};
    for (const s of scripts) {
      result[s.fileName] = (val as Record<string, any>)[s.fileName] ?? val;
    }
    return result;
  };

  const manifest = scripts.map((s) => ({ name: s.name, file: s.fileName }));

  const entries: Record<string, Uint8Array> = {
    "fountain.json": strToU8(JSON.stringify(manifest, null, 2)),
    "settings.json": strToU8(JSON.stringify(restSettings || {}, null, 2)),
    "sprint_data.json": strToU8(JSON.stringify(sprintData || [], null, 2)),
    "production_tags.json": strToU8(JSON.stringify(productionTags || { tags: [], definitions: [] }, null, 2)),
  };

  if (scripts.length > 1) {
    entries["characters.json"] = strToU8(JSON.stringify(resolvePerScript("genders", scripts), null, 2));
    entries["todos.json"] = strToU8(JSON.stringify(resolvePerScript("todos", scripts), null, 2));
    entries["parking.json"] = strToU8(JSON.stringify(resolvePerScript("parking", scripts), null, 2));
    entries["notepad.json"] = strToU8(JSON.stringify(resolvePerScript("notepad", scripts), null, 2));
  } else {
    const genderVal = genders && typeof genders === 'object' && !Array.isArray(genders) && !Object.keys(genders).some(k => scripts.some(s => s.fileName === k))
      ? { genders }
      : genders;
    entries["characters.json"] = strToU8(JSON.stringify(genderVal || {}, null, 2));
    entries["todos.json"] = strToU8(JSON.stringify(todos || [], null, 2));
    entries["parking.json"] = strToU8(JSON.stringify(parking || [], null, 2));
    entries["notepad.json"] = strToU8(JSON.stringify(notepad || "", null, 2));
  }

  for (const script of scripts) {
    entries[script.fileName] = strToU8(script.content);
  }

  const zipped = zipSync(entries);
  const result = new Uint8Array(zipped.length + MAGIC_LENGTH);
  result.set(zipped);
  result.set(ACTONE_MAGIC, zipped.length);
  return result;
}
