import { ParsedLine } from "../parser";

export const countWords = (text: string): number => {
  return text.trim().split(/\s+/).filter((w) => w !== "").length;
};

export function getSceneTitle(line: ParsedLine): string {
  return line.text
    .replace(/^[.#= ]+/, "")
    .replace(/\[\[.*?\]\]/g, "")
    .replace(/#[^#\s]+#\s*/g, "")
    .trim();
}
