import type { ScriptInfo } from "./actone";

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

