import { ParsedLine } from "../parser";
import { parseFadeInToFountain, parseFadeInXmlToFountain } from "./fadeinParser";

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

/**
 * Extracts text from FDX Paragraph with bold, italic, underline adornments.
 */
function extractFdxParagraphText(p: Element): string {
  const textEls = p.querySelectorAll("Text");
  if (!textEls || textEls.length === 0) {
    return p.textContent?.trim() || "";
  }

  let full = "";
  textEls.forEach((t) => {
    let content = t.textContent || "";
    if (!content) return;

    const style = (t.getAttribute("Style") || "").toLowerCase();
    const adorn = t.getAttribute("Adornmentstyle") || "";

    const isBold = style.includes("bold") || adorn === "1" || adorn === "3" || adorn === "5" || adorn === "7";
    const isItalic = style.includes("italic") || adorn === "2" || adorn === "3" || adorn === "6" || adorn === "7";
    const isUnderline = style.includes("underline") || adorn === "4" || adorn === "5" || adorn === "6" || adorn === "7";

    if (isBold && isItalic && isUnderline) {
      content = `***_${content}_***`;
    } else if (isBold && isItalic) {
      content = `***${content}***`;
    } else if (isBold && isUnderline) {
      content = `**_${content}_**`;
    } else if (isItalic && isUnderline) {
      content = `*_${content}_*`;
    } else if (isBold) {
      content = `**${content}**`;
    } else if (isItalic) {
      content = `*${content}*`;
    } else if (isUnderline) {
      content = `_${content}_`;
    }

    full += content;
  });

  return full.trim();
}

/**
 * Parses Final Draft XML (.fdx) into Fountain screenplay text.
 */
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

    // Parse Title Page if available
    const titlePage = doc.querySelector("TitlePage");
    if (titlePage) {
      const titleLines: string[] = [];
      const tpParas = titlePage.querySelectorAll("Paragraph");
      tpParas.forEach((p) => {
        const text = p.textContent?.trim() || "";
        if (text) titleLines.push(text);
      });
      if (titleLines.length > 0) {
        lines.push(`Title: ${titleLines[0]}`);
        if (titleLines[1]) lines.push(`Author: ${titleLines[1]}`);
        lines.push("");
      }
    }

    const paraArray = Array.from(paragraphs);
    for (let i = 0; i < paraArray.length; i++) {
      const p = paraArray[i];
      const pType = (p.getAttribute("Type") || "").toLowerCase();
      const sceneProps = p.querySelector("SceneProperties");
      const sceneNum = sceneProps?.getAttribute("Number") || p.getAttribute("Number");
      const alignment = (p.getAttribute("Alignment") || "").toLowerCase();

      const text = extractFdxParagraphText(p);

      if (!text) {
        lines.push("");
        continue;
      }

      if (alignment === "center" || pType === "centered") {
        lines.push(`> ${text} <`);
        lines.push("");
        continue;
      }

      const nextType = i + 1 < paraArray.length
        ? (paraArray[i + 1].getAttribute("Type") || "").toLowerCase()
        : "";
      const dialogueBlockTypes = ["parenthetical", "dialogue"];

      switch (pType) {
        case "scene heading": {
          let heading = text.startsWith(".") ? text : `.${text}`;
          if (sceneNum) {
            heading = `${heading} #${sceneNum}#`;
          }
          lines.push("");
          lines.push(heading);
          lines.push("");
          break;
        }
        case "character": {
          lines.push("");
          const cleanChar = text.startsWith("@") ? text.substring(1) : text;
          lines.push(`@${cleanChar.toUpperCase()}`);
          break;
        }
        case "parenthetical": {
          const paren = text.startsWith("(") && text.endsWith(")") ? text : `(${text.replace(/^\(|\)$/g, "")})`;
          lines.push(paren);
          break;
        }
        case "dialogue": {
          lines.push(text);
          if (!dialogueBlockTypes.includes(nextType)) {
            lines.push("");
          }
          break;
        }
        case "transition": {
          lines.push("");
          const trans = text.startsWith(">") ? text : `> ${text}`;
          lines.push(trans);
          lines.push("");
          break;
        }
        case "shot": {
          lines.push("");
          const shot = text.startsWith("!!") ? text : `!! ${text.replace(/^!+/, "").trim()}`;
          lines.push(shot);
          lines.push("");
          break;
        }
        case "general":
        case "action":
        default: {
          const action = text.startsWith("!") ? text : `!${text}`;
          lines.push(action);
          lines.push("");
          break;
        }
      }
    }

    return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  } catch {
    return xmlText;
  }
}

/**
 * Unified script parser that converts .fdx, .fadein, and .fountain into Fountain text.
 */
export function parseScriptFileToFountain(fileName: string, data: Uint8Array | string): string {
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".fadein")) {
    if (data instanceof Uint8Array) {
      return parseFadeInToFountain(data);
    }
    // If passed as string, check if it's raw XML
    if (typeof data === "string" && data.includes("<fadein")) {
      return parseFadeInXmlToFountain(data);
    }
  }

  const textContent = typeof data === "string" ? data : new TextDecoder("utf-8").decode(data);

  if (lower.endsWith(".fdx") || textContent.includes("<FinalDraft")) {
    return parseFdxToFountain(textContent);
  }

  return textContent;
}

