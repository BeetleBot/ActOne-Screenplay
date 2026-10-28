import type { ScriptInfo } from "./actone";

interface CanvasAsset {
  dataURL?: string;
  actoneAsset?: string;
  mimeType?: string;
  [key: string]: unknown;
}
interface CanvasData {
  files?: Record<string, CanvasAsset>;
  [key: string]: unknown;
}

export function packCanvasAssets(script: ScriptInfo, entries: Record<string, Uint8Array>): string {
  if (script.type !== "canvas") return script.content;
  let data: CanvasData;
  try {
    data = JSON.parse(script.content);
  } catch {
    return script.content;
  }
  if (!data || typeof data !== "object" || data.type !== "excalidraw") return script.content;
  for (const [id, asset] of Object.entries(data.files || {})) {
    if (!asset || typeof asset !== "object") continue;
    if (typeof asset.dataURL !== "string") continue;
    const match = /^data:([^;,]+);base64,(.*)$/s.exec(asset.dataURL);
    if (!match) continue;
    const path = `assets/${encodeURIComponent(script.fileName)}/${encodeURIComponent(id)}`;
    const bytes = atob(match[2]);
    entries[path] = Uint8Array.from(bytes, (c) => c.charCodeAt(0));
    data.files![id] = { ...asset, dataURL: undefined, actoneAsset: path };
  }
  return JSON.stringify(data);
}

export function restoreCanvasAssets(content: string, entries: Record<string, Uint8Array>): string {
  let data: CanvasData;
  try {
    data = JSON.parse(content);
  } catch {
    return content;
  }
  if (!data || data.type !== "excalidraw") return content;
  let changed = false;
  for (const asset of Object.values(data.files || {})) {
    if (!asset || typeof asset !== "object") continue;
    if (!asset.actoneAsset) continue;
    const bytes = entries[asset.actoneAsset];
    if (!bytes) throw new Error(`Missing Canvas image: ${asset.actoneAsset}`);
    const parts: string[] = [];
    for (let i = 0; i < bytes.length; i += 8192) parts.push(String.fromCharCode(...bytes.subarray(i, i + 8192)));
    asset.dataURL = `data:${asset.mimeType || "application/octet-stream"};base64,${btoa(parts.join(""))}`;
    delete asset.actoneAsset;
    changed = true;
  }
  return changed ? JSON.stringify(data) : content;
}
