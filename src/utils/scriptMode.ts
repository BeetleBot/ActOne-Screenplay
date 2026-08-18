import type { ScriptInfo } from "./actone";

export function isProseScript(script?: ScriptInfo, filePath?: string | null): boolean {
  return script?.type === "markdown" ||
    /\.(md|markdown)$/i.test(script?.fileName || "") ||
    /\.(md|markdown)$/i.test(filePath || "");
}
