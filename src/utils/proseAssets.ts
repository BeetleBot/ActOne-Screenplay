import type { ScriptInfo } from "./actone";

// Images stay portable in editor state, undo history and recovery. Bundle codecs
// move their bytes into archive entries only at the persistence boundary.
export const proseImagePattern =
  /!\[([^\]\n]*)\]\((data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+|actone-image:assets\/prose\/[A-Za-z0-9%._/-]+|image[1-9][0-9]*)\)/g;

export function packProseAssets(script: ScriptInfo, entries: Record<string, Uint8Array>): string {
  if (script.type !== "markdown") return script.content;
  let index = 0;
  return script.content.replace(proseImagePattern, (_whole, alt: string, url: string) => {
    if (/^image[1-9][0-9]*$/.test(url)) return _whole;
    if (!url.startsWith("data:")) throw new Error("Unresolved prose image");
    const [prefix, encoded] = url.split(",");
    const ext = prefix.includes("jpeg") ? "jpg" : prefix.includes("webp") ? "webp" : "png";
    const path = `assets/prose/${encodeURIComponent(script.fileName)}/${index++}.${ext}`;
    entries[path] = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
    return `![${alt}](actone-image:${path})`;
  });
}

export function restoreProseAssets(content: string, entries: Record<string, Uint8Array>): string {
  return content.replace(proseImagePattern, (whole, alt: string, url: string) => {
    if (!url.startsWith("actone-image:")) return whole;
    const path = url.slice("actone-image:".length);
    const bytes = entries[path];
    if (!bytes) throw new Error(`Missing prose image: ${path}`);
    const mime = path.endsWith(".jpg") ? "image/jpeg" : path.endsWith(".webp") ? "image/webp" : "image/png";
    const parts: string[] = [];
    for (let i = 0; i < bytes.length; i += 8192) parts.push(String.fromCharCode(...bytes.subarray(i, i + 8192)));
    return `![${alt}](data:${mime};base64,${btoa(parts.join(""))})`;
  });
}

export function imageDescription(name: string): string {
  return (
    name
      .replace(/\.(png|jpe?g|webp)$/i, "")
      .replace(/[[\]\\\r\n]/g, " ")
      .trim() || "Image"
  );
}

export function optimizedImageSize(width: number, height: number): { width: number; height: number } {
  const scale = Math.min(1, 2400 / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export async function readProseImage(file: File): Promise<string> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw new Error("Choose a PNG, JPEG or WebP image.");
  if (file.size > 40 * 1024 * 1024) throw new Error("Choose an image smaller than 40 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const valid =
    file.type === "image/png"
      ? bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71
      : file.type === "image/jpeg"
        ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        : String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (!valid) throw new Error("This file is not a valid PNG, JPEG or WebP image.");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read this image."));
    reader.readAsDataURL(file);
  });
}

export async function optimizeProseImage(url: string): Promise<string> {
  const image = new Image();
  image.src = url;
  await image.decode();
  const size = optimizedImageSize(image.naturalWidth, image.naturalHeight);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image optimization is unavailable.");
  context.drawImage(image, 0, 0, size.width, size.height);
  const mime = url.startsWith("data:image/jpeg;") ? "image/jpeg" : "image/webp";
  const optimized = canvas.toDataURL(mime, 0.85);
  return optimized.length < url.length ? optimized : url;
}

export interface ProseImageRegistry {
  [name: string]: string;
}
export function getProseImages(settings?: Record<string, unknown>): ProseImageRegistry {
  const value = settings?.proseImages;
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(([name, url]) => /^image[1-9][0-9]*$/.test(name) && typeof url === "string"),
  );
}
export function nextProseImageName(images: ProseImageRegistry): string {
  return `image${Math.max(0, ...Object.keys(images).map((name) => Number(name.slice(5)) || 0)) + 1}`;
}
export function resolveProseImages(text: string, settings?: Record<string, unknown>): string {
  const images = getProseImages(settings);
  return text.replace(proseImagePattern, (whole, alt: string, reference: string) => {
    if (!/^image[1-9][0-9]*$/.test(reference)) return whole;
    const url = images[reference];
    if (!url || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(url))
      throw new Error(`Missing prose image: ${reference}`);
    return `![${alt}](${url})`;
  });
}
export function packProseImageRegistry(
  settings: Record<string, unknown>,
  entries: Record<string, Uint8Array>,
): Record<string, unknown> {
  if (!settings.proseImages) return settings;
  const stored: ProseImageRegistry = {};
  for (const [name, url] of Object.entries(getProseImages(settings))) {
    const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(url);
    if (!match) throw new Error(`Invalid prose image: ${name}`);
    const ext = match[1] === "jpeg" ? "jpg" : match[1];
    const path = `assets/prose/${name}.${ext}`;
    entries[path] = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
    stored[name] = `actone-image:${path}`;
  }
  return { ...settings, proseImages: stored };
}
export function restoreProseImageRegistry(
  settings: Record<string, unknown>,
  entries: Record<string, Uint8Array>,
): Record<string, unknown> {
  if (!settings.proseImages) return settings;
  const restored: ProseImageRegistry = {};
  for (const [name, url] of Object.entries(getProseImages(settings))) {
    const restoredMarkdown = restoreProseAssets(`![${name}](${url})`, entries);
    const match = /^!\[[^\]]*\]\((data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+)\)$/.exec(restoredMarkdown);
    if (!match) throw new Error(`Invalid prose image: ${name}`);
    restored[name] = match[1];
  }
  return { ...settings, proseImages: restored };
}

export function validateProseImageReferences(text: string, settings: Record<string, unknown>): void {
  const images = getProseImages(settings);
  for (const match of text.matchAll(proseImagePattern)) {
    if (/^image[1-9][0-9]*$/.test(match[2]) && !images[match[2]]) throw new Error(`Missing prose image: ${match[2]}`);
  }
}
export function shortenProseImages(
  text: string,
  images: ProseImageRegistry,
): { text: string; images: ProseImageRegistry } {
  const next = { ...images };
  const shortened = text.replace(proseImagePattern, (whole, _alt: string, url: string) => {
    if (!url.startsWith("data:")) return whole;
    const name = Object.keys(next).find((name) => next[name] === url) || nextProseImageName(next);
    next[name] = url;
    return `![${name}](${name})`;
  });
  return { text: shortened, images: next };
}

export function exportProseMarkdown(
  text: string,
  settings?: Record<string, unknown>,
): { content: string; entries: Record<string, Uint8Array> } {
  const images = getProseImages(settings);
  const entries: Record<string, Uint8Array> = {};
  let ordinal = 1;
  const content = text.replace(proseImagePattern, (whole, alt: string, reference: string) => {
    const named = /^image[1-9][0-9]*$/.test(reference);
    const url = named ? images[reference] : reference;
    if (!url?.startsWith("data:")) {
      if (named) throw new Error(`Missing prose image: ${reference}`);
      return whole;
    }
    const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(url);
    if (!match) throw new Error("Invalid prose image");
    const name = named ? reference : `image${ordinal++}`;
    const path = `images/${name}.${match[1] === "jpeg" ? "jpg" : match[1]}`;
    entries[path] = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
    return `![${alt}](${path})`;
  });
  return { content, entries };
}
