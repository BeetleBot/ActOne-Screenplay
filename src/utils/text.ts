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

export function parseFdxToFountain(xmlText: string): string {
  if (!xmlText || typeof xmlText !== "string") return "";
  if (!xmlText.includes("<FinalDraft") && !xmlText.includes("<Paragraph")) {
    return xmlText;
  }
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, "text/xml");
    const paragraphs = doc.querySelectorAll("Paragraph");
    if (!paragraphs || paragraphs.length === 0) return xmlText;

    const lines: string[] = [];

    paragraphs.forEach((p) => {
      const pType = p.getAttribute("Type") || "";
      const textEls = p.querySelectorAll("Text");
      let text = "";
      textEls.forEach((t) => { text += t.textContent || ""; });
      text = text.trim();

      if (!text) {
        lines.push("");
        return;
      }

      switch (pType.toLowerCase()) {
        case "scene heading":
          if (!/^(INT|EXT|I\/E|INT\/EXT|EXT\/INT)\b/i.test(text) && !text.startsWith(".")) {
            lines.push(`.${text}`);
          } else {
            lines.push(text);
          }
          lines.push("");
          break;
        case "character":
          lines.push("");
          lines.push(text.toUpperCase());
          break;
        case "parenthetical":
          lines.push(text.startsWith("(") ? text : `(${text})`);
          break;
        case "dialogue":
          lines.push(text);
          lines.push("");
          break;
        case "transition":
          lines.push("");
          lines.push(text.startsWith(">") ? text : `> ${text}`);
          lines.push("");
          break;
        case "shot":
          lines.push(`!! ${text}`);
          break;
        default:
          lines.push(text);
          break;
      }
    });

    return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  } catch {
    return xmlText;
  }
}
