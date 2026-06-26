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
  let genders: Record<string, string> = {};
  let todosData: unknown[] = [];
  let parkingData: unknown[] = [];
  let notepadData = "";
  let sprintData: unknown[] = [];
  let markerData: unknown[] = [];
  let productionTagsData: { tags: unknown[]; definitions: unknown[] } = { tags: [], definitions: [] };

  if (unzipped["settings.json"]) {
    try { parsedSettings = JSON.parse(strFromU8(unzipped["settings.json"])); } catch (e) { logger.warn("actone", "Failed to parse settings.json", e); }
  }
  if (unzipped["characters.json"]) {
    try { const chars = JSON.parse(strFromU8(unzipped["characters.json"])); genders = chars.genders || {}; } catch (e) { logger.warn("actone", "Failed to parse characters.json", e); }
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
  if (unzipped["marker.json"]) {
    try { markerData = JSON.parse(strFromU8(unzipped["marker.json"])); } catch (e) { logger.warn("actone", "Failed to parse marker.json", e); }
  }
  if (unzipped["production_tags.json"]) {
    try { productionTagsData = JSON.parse(strFromU8(unzipped["production_tags.json"])); } catch (e) { logger.warn("actone", "Failed to parse production_tags.json", e); }
  }

  const settings = {
    ...parsedSettings,
    genders,
    todos: todosData,
    parking: parkingData,
    notepad: notepadData,
    sprintHistory: sprintData,
    markers: markerData,
    productionTags: productionTagsData,
  };

  let scripts: ScriptInfo[];
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

  return { scripts, settings };
}

export function packActoneBundle(scripts: ScriptInfo[], settings: Record<string, any>): Uint8Array {
  const {
    genders, todos, parking, notepad, sprintHistory: sprintData, markers, productionTags, ...restSettings
  } = settings || {};
  const characters = genders ? { genders } : {};

  const manifest = scripts.map((s) => ({ name: s.name, file: s.fileName }));

  const entries: Record<string, Uint8Array> = {
    "fountain.json": strToU8(JSON.stringify(manifest, null, 2)),
    "settings.json": strToU8(JSON.stringify(restSettings || {}, null, 2)),
    "characters.json": strToU8(JSON.stringify(characters, null, 2)),
    "todos.json": strToU8(JSON.stringify(todos || [], null, 2)),
    "parking.json": strToU8(JSON.stringify(parking || [], null, 2)),
    "notepad.json": strToU8(JSON.stringify(notepad || "", null, 2)),
    "sprint_data.json": strToU8(JSON.stringify(sprintData || [], null, 2)),
    "marker.json": strToU8(JSON.stringify(markers || [], null, 2)),
    "production_tags.json": strToU8(JSON.stringify(productionTags || { tags: [], definitions: [] }, null, 2)),
  };

  for (const script of scripts) {
    entries[script.fileName] = strToU8(script.content);
  }

  const zipped = zipSync(entries);
  const result = new Uint8Array(zipped.length + MAGIC_LENGTH);
  result.set(zipped);
  result.set(ACTONE_MAGIC, zipped.length);
  return result;
}
