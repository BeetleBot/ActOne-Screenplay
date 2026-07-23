import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";
import { migrateProductionTags } from "./perScriptSettings";
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings: Record<string, any>;
  promptChats?: { conversations: unknown[]; activeConversationId: string | null };
}

export function unpackActoneBundle(bytes: Uint8Array, bundleName?: string): ActoneBundle {
  const hasStartMagic = bytes.length >= MAGIC_LENGTH &&
    bytes[0] === ACTONE_MAGIC[0] &&
    bytes[1] === ACTONE_MAGIC[1] &&
    bytes[2] === ACTONE_MAGIC[2] &&
    bytes[3] === ACTONE_MAGIC[3];
  const hasEndMagic = !hasStartMagic && bytes.length >= MAGIC_LENGTH &&
    bytes[bytes.length - 4] === ACTONE_MAGIC[0] &&
    bytes[bytes.length - 3] === ACTONE_MAGIC[1] &&
    bytes[bytes.length - 2] === ACTONE_MAGIC[2] &&
    bytes[bytes.length - 1] === ACTONE_MAGIC[3];
  let zipBytes: Uint8Array;
  if (hasStartMagic) {
    zipBytes = bytes.slice(MAGIC_LENGTH);
  } else if (hasEndMagic) {
    zipBytes = bytes.slice(0, bytes.length - MAGIC_LENGTH);
  } else {
    zipBytes = bytes;
  }
  const unzipped = unzipSync(zipBytes);

  let parsedSettings: Record<string, unknown> = {};
  if (unzipped["settings.json"]) {
    try { parsedSettings = JSON.parse(strFromU8(unzipped["settings.json"])); } catch (e) { logger.warn("actone", "Failed to parse settings.json", e); }
  }
  const tryParse = <T>(key: string, fallback: T): T => {
    const buf = unzipped[key];
    if (!buf || buf.length === 0) return fallback;
    try { return JSON.parse(strFromU8(buf)); } catch (e) { logger.warn("actone", `Failed to parse ${key}`, e); return fallback; }
  };

  const gendersData = tryParse("characters.json", {});
  const todosData = tryParse("todos.json", []);
  const parkingData = tryParse("parking.json", []);
  const notepadData = tryParse("notepad.json", "");
  const sprintData = tryParse("sprint_data.json", []);
  const productionTagsData = migrateProductionTags(tryParse("production_tags.json", { tags: [], definitions: [] }));
  const promptChatsData = tryParse("prompt.json", { conversations: [], activeConversationId: null });

  let scripts: ScriptInfo[];

  const settings: Record<string, unknown> = {
    ...parsedSettings,
    sprintHistory: sprintData,
    productionTags: productionTagsData,
    promptChats: promptChatsData,
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
      : scripts.reduce((acc, s) => ({ ...acc, [s.fileName]: notepadData }), {} as Record<string, unknown>);
    const genderMap = gendersData as { genders?: unknown };
    settings.genders = gendersData && typeof gendersData === 'object' && !Array.isArray(gendersData)
      ? (Object.keys(gendersData).some(k => scripts.some(s => s.fileName === k))
        ? gendersData
        : genderMap.genders
          ? scripts.reduce((acc, s) => ({ ...acc, [s.fileName]: genderMap.genders }), {} as Record<string, unknown>)
          : gendersData)
      : scripts.reduce((acc, s) => ({ ...acc, [s.fileName]: gendersData }), {} as Record<string, unknown>);
    settings.todos = todosData && Array.isArray(todosData) && todosData.length > 0 && typeof todosData[0] !== 'string'
      ? scripts.reduce((acc, s) => ({ ...acc, [s.fileName]: todosData }), {} as Record<string, unknown>)
      : (todosData && typeof todosData === 'object' && !Array.isArray(todosData)
        ? todosData
        : scripts.reduce((acc, s) => ({ ...acc, [s.fileName]: todosData }), {} as Record<string, unknown>));
    settings.parking = parkingData && typeof parkingData === 'object' && !Array.isArray(parkingData)
      ? parkingData
      : scripts.reduce((acc, s) => ({ ...acc, [s.fileName]: parkingData }), {} as Record<string, unknown>);
  } else {
    settings.notepad = notepadData;
    const genderMap = gendersData as { genders?: unknown };
    settings.genders = gendersData && typeof gendersData === 'object' && genderMap.genders
      ? genderMap.genders
      : gendersData;
    settings.todos = todosData;
    settings.parking = parkingData;
  }
  return { scripts, settings, promptChats: promptChatsData as ActoneBundle["promptChats"] };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function packActoneBundle(scripts: ScriptInfo[], settings: Record<string, any>): Uint8Array {
  const {
    genders, todos, parking, notepad, sprintHistory: sprintData, productionTags, promptChats, ...restSettings
  } = settings || {};

  const resolvePerScript = (key: string, scripts: ScriptInfo[]): unknown => {
    const val = (settings || {})[key];
    if (!val || scripts.length <= 1) return val;

    const isKeyed = typeof val === "object" && !Array.isArray(val) &&
      Object.keys(val).some(k => scripts.some(s => s.fileName === k));

    const result: Record<string, unknown> = {};
    for (const s of scripts) {
      if (isKeyed) {
        let fallback: unknown = undefined;
        if (key === "todos" || key === "parking") fallback = [];
        else if (key === "notepad") fallback = "";
        else if (key === "genders") fallback = {};
        result[s.fileName] = (val as Record<string, unknown>)[s.fileName] ?? fallback;
      } else {
        result[s.fileName] = val;
      }
    }
    return result;
  };

  const manifest = scripts.map((s) => ({ name: s.name, file: s.fileName }));

  const entries: Record<string, Uint8Array> = {
    "fountain.json": strToU8(JSON.stringify(manifest, null, 2)),
    "settings.json": strToU8(JSON.stringify(restSettings || {}, null, 2)),
    "sprint_data.json": strToU8(JSON.stringify(sprintData || [], null, 2)),
    "production_tags.json": strToU8(JSON.stringify(productionTags || { tags: [], definitions: [] }, null, 2)),
    "prompt.json": strToU8(JSON.stringify(promptChats || { conversations: [], activeConversationId: null }, null, 2)),
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
  const result = new Uint8Array(MAGIC_LENGTH + zipped.length);
  result.set(ACTONE_MAGIC);
  result.set(zipped, MAGIC_LENGTH);
  return result;
}
