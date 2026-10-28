import type { ScriptInfo } from "./actone";

export function isCanvasScript(script?: ScriptInfo | null, filePath?: string | null): boolean {
  return script?.type === "canvas" || /\.excalidraw$/i.test(script?.fileName || filePath || "");
}

export function isNonScreenplay(script?: ScriptInfo | null, filePath?: string | null): boolean {
  return isProseScript(script, filePath) || isCanvasScript(script, filePath);
}

export function isProseScript(script?: ScriptInfo | null, filePath?: string | null): boolean {
  return script?.type === "markdown" ||
    /\.(md|markdown)$/i.test(script?.fileName || "") ||
    /\.(md|markdown)$/i.test(filePath || "");
}

export function isActonePath(p?: string | null): boolean {
  if (!p) return false;
  const lower = p.toLowerCase();
  return lower.endsWith(".actone") || lower.endsWith(".zip") || lower.endsWith(".actone.zip");
}

