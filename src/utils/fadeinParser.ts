import { unzipSync, strFromU8 } from "fflate";

/**
 * Formats text element runs with bold, italic, and underline markdown.
 */
function extractFormattedText(para: Element): string {
  const textEls = para.querySelectorAll("text");
  if (!textEls || textEls.length === 0) {
    return para.textContent?.trim() || "";
  }

  let full = "";
  textEls.forEach((t) => {
    let content = t.textContent || "";
    if (!content) return;

    const isBold = t.getAttribute("bold") === "1";
    const isItalic = t.getAttribute("italic") === "1";
    const isUnderline = t.getAttribute("underline") === "1";

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
 * Parses Fade In XML (document.xml) string into Fountain text with forced element syntax.
 */
export function parseFadeInXmlToFountain(xmlText: string): string {
  if (!xmlText || typeof xmlText !== "string") return "";

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, "text/xml");
    const paras = doc.querySelectorAll("para");
    if (!paras || paras.length === 0) return "";

    const lines: string[] = [];

    paras.forEach((para) => {
      const styleEl = para.querySelector("style");
      const baseStyle = styleEl?.getAttribute("basestyle") || styleEl?.getAttribute("name") || "";
      const align = styleEl?.getAttribute("align") || "";
      const isDual = para.getAttribute("dualdialogue") === "1";
      const sceneNum = para.getAttribute("number");

      const text = extractFormattedText(para);
      if (!text) {
        lines.push("");
        return;
      }

      const styleLower = baseStyle.toLowerCase();

      if (align === "center" || styleLower === "centered" || styleLower === "centered text") {
        lines.push(`> ${text} <`);
        lines.push("");
        return;
      }

      switch (styleLower) {
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
          let charLine = `@${cleanChar.toUpperCase()}`;
          if (isDual) {
            charLine = `${charLine} ^`;
          }
          lines.push(charLine);
          break;
        }

        case "parenthetical": {
          const paren = text.startsWith("(") && text.endsWith(")") ? text : `(${text.replace(/^\(|\)$/g, "")})`;
          lines.push(paren);
          break;
        }

        case "dialogue": {
          lines.push(text);
          lines.push("");
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

        case "lyrics": {
          const lyric = text.startsWith("~") ? text : `~ ${text}`;
          lines.push(lyric);
          break;
        }

        case "action":
        default: {
          const action = text.startsWith("!") ? text : `!${text}`;
          lines.push(action);
          lines.push("");
          break;
        }
      }
    });

    return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  } catch (err) {
    console.warn("Failed to parse Fade In XML:", err);
    return "";
  }
}

/**
 * Parses a binary .fadein zip file into Fountain text with forced element syntax.
 */
export function parseFadeInToFountain(bytes: Uint8Array): string {
  try {
    const unzipped = unzipSync(bytes);
    let xmlBytes = unzipped["document.xml"];

    if (!xmlBytes) {
      // Look for any .xml file inside
      const xmlKey = Object.keys(unzipped).find((k) => k.toLowerCase().endsWith(".xml"));
      if (xmlKey) {
        xmlBytes = unzipped[xmlKey];
      }
    }

    if (!xmlBytes) {
      throw new Error("No document.xml found inside .fadein archive");
    }

    const xmlText = strFromU8(xmlBytes);
    return parseFadeInXmlToFountain(xmlText);
  } catch (err) {
    console.warn("Failed to unzip Fade In file:", err);
    return "";
  }
}
