import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";

export interface ActoneBundle {
  content: string;
  settings: Record<string, any>;
}

export function unpackActoneBundle(bytes: Uint8Array): ActoneBundle {
  const unzipped = unzipSync(bytes);
  const content = unzipped["document.fountain"] ? strFromU8(unzipped["document.fountain"]) : "";

  let parsedSettings: Record<string, any> = {};
  let genders: Record<string, string> = {};
  let revisionData: Record<string, any> = {};
  let todosData: any[] = [];
  let parkingData: any[] = [];
  let notepadData = "";
  let sprintData: any[] = [];
  let markerData: any[] = [];
  let productionTagsData: any = { tags: [], definitions: [] };

  if (unzipped["settings.json"]) {
    try { parsedSettings = JSON.parse(strFromU8(unzipped["settings.json"])); } catch {}
  }
  if (unzipped["characters.json"]) {
    try { const chars = JSON.parse(strFromU8(unzipped["characters.json"])); genders = chars.genders || {}; } catch {}
  }
  if (unzipped["revision.json"]) {
    try { revisionData = JSON.parse(strFromU8(unzipped["revision.json"])); } catch {}
  }
  if (unzipped["todos.json"]) {
    try { todosData = JSON.parse(strFromU8(unzipped["todos.json"])); } catch {}
  }
  if (unzipped["parking.json"]) {
    try { parkingData = JSON.parse(strFromU8(unzipped["parking.json"])); } catch {}
  }
  if (unzipped["notepad.json"]) {
    try { notepadData = JSON.parse(strFromU8(unzipped["notepad.json"])); } catch {}
  }
  if (unzipped["sprint_data.json"]) {
    try { sprintData = JSON.parse(strFromU8(unzipped["sprint_data.json"])); } catch {}
  }
  if (unzipped["marker.json"]) {
    try { markerData = JSON.parse(strFromU8(unzipped["marker.json"])); } catch {}
  }
  if (unzipped["production_tags.json"]) {
    try { productionTagsData = JSON.parse(strFromU8(unzipped["production_tags.json"])); } catch {}
  }

  const settings = {
    ...parsedSettings,
    genders,
    ...revisionData,
    todos: todosData,
    parking: parkingData,
    notepad: notepadData,
    sprintHistory: sprintData,
    markers: markerData,
    productionTags: productionTagsData,
  };

  return { content, settings };
}

export function packActoneBundle(content: string, settings: Record<string, any>): Uint8Array {
  const {
    genders, revisionModeEnabled, revisionBaseText, todos, parking,
    notepad, sprintHistory: sprintData, markers, productionTags, ...restSettings
  } = settings || {};
  const characters = genders ? { genders } : {};
  const revision = { revisionModeEnabled, revisionBaseText };

  return zipSync({
    "document.fountain": strToU8(content),
    "settings.json": strToU8(JSON.stringify(restSettings || {}, null, 2)),
    "characters.json": strToU8(JSON.stringify(characters, null, 2)),
    "revision.json": strToU8(JSON.stringify(revision, null, 2)),
    "todos.json": strToU8(JSON.stringify(todos || [], null, 2)),
    "parking.json": strToU8(JSON.stringify(parking || [], null, 2)),
    "notepad.json": strToU8(JSON.stringify(notepad || "", null, 2)),
    "sprint_data.json": strToU8(JSON.stringify(sprintData || [], null, 2)),
    "marker.json": strToU8(JSON.stringify(markers || [], null, 2)),
    "production_tags.json": strToU8(JSON.stringify(productionTags || { tags: [], definitions: [] }, null, 2)),
  });
}
