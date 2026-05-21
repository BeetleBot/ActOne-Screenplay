import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { invoke } from "@tauri-apps/api/core";
import { FountainDocument, LineType, ParsedLine, getElementMaxWidth } from "../parser/FountainParser";

interface TextSegment {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

function parseInlineStyles(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let i = 0;
  let currentBold = false;
  let currentItalic = false;
  let currentUnderline = false;
  let currentText = "";

  while (i < text.length) {
    if (text.startsWith("**", i)) {
      if (currentText !== "") {
        segments.push({ text: currentText, bold: currentBold, italic: currentItalic, underline: currentUnderline });
        currentText = "";
      }
      currentBold = !currentBold;
      i += 2;
    } else if (text.startsWith("*", i)) {
      if (currentText !== "") {
        segments.push({ text: currentText, bold: currentBold, italic: currentItalic, underline: currentUnderline });
        currentText = "";
      }
      currentItalic = !currentItalic;
      i += 1;
    } else if (text.startsWith("_", i)) {
      if (currentText !== "") {
        segments.push({ text: currentText, bold: currentBold, italic: currentItalic, underline: currentUnderline });
        currentText = "";
      }
      currentUnderline = !currentUnderline;
      i += 1;
    } else {
      currentText += text[i];
      i++;
    }
  }
  if (currentText !== "") {
    segments.push({ text: currentText, bold: currentBold, italic: currentItalic, underline: currentUnderline });
  }
  return segments;
}

function wrapTextToLines(text: string, maxWidth: number): string[] {
  const trimmed = text.trim();
  if (trimmed === "") return [""];
  const words = trimmed.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";
  for (const word of words) {
    if (currentLine === "") {
      currentLine = word;
    } else if (currentLine.length + 1 + word.length <= maxWidth) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine !== "") {
    lines.push(currentLine);
  }
  return lines;
}

function cleanFountainSyntax(text: string, type: LineType): string {
  let cleaned = text;
  const trimmed = text.trim();
  if (type === LineType.heading && trimmed.startsWith(".")) {
    cleaned = text.replace(/^\s*\./, "");
  } else if (type === LineType.character && trimmed.startsWith("@")) {
    cleaned = text.replace(/^\s*@/, "");
  } else if (type === LineType.action && trimmed.startsWith("!")) {
    cleaned = text.replace(/^\s*!/, "");
  } else if (type === LineType.lyrics && trimmed.startsWith("~")) {
    cleaned = text.replace(/^\s*~/, "");
  } else if (type === LineType.centered && trimmed.startsWith(">") && trimmed.endsWith("<")) {
    cleaned = text.replace(/^\s*>/, "").replace(/<\s*$/, "");
  } else if (type === LineType.transitionLine && trimmed.startsWith(">")) {
    cleaned = text.replace(/^\s*>/, "");
  }

  if ((type === LineType.character || type === LineType.dualDialogueCharacter) && cleaned.endsWith("^")) {
    cleaned = cleaned.substring(0, cleaned.length - 1).trimEnd();
  }

  if (type === LineType.heading) {
    cleaned = cleaned.replace(/#[^#]+#\s*$/, "").trimEnd();
  }

  return cleaned;
}

function getStyledLineWidth(
  text: string,
  fontSize: number,
  fontRegular: any,
  fontBold: any,
  fontItalic: any,
  fontBoldItalic: any
): number {
  const segments = parseInlineStyles(text);
  let totalWidth = 0;
  for (const seg of segments) {
    let font = fontRegular;
    if (seg.bold && seg.italic) {
      font = fontBoldItalic;
    } else if (seg.bold) {
      font = fontBold;
    } else if (seg.italic) {
      font = fontItalic;
    }
    totalWidth += font.widthOfTextAtSize(seg.text, fontSize);
  }
  return totalWidth;
}

function drawStyledLine(
  page: any,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  fontRegular: any,
  fontBold: any,
  fontItalic: any,
  fontBoldItalic: any
) {
  const segments = parseInlineStyles(text);
  let currentX = x;

  for (const seg of segments) {
    let font = fontRegular;
    if (seg.bold && seg.italic) {
      font = fontBoldItalic;
    } else if (seg.bold) {
      font = fontBold;
    } else if (seg.italic) {
      font = fontItalic;
    }

    page.drawText(seg.text, {
      x: currentX,
      y,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    });

    const width = font.widthOfTextAtSize(seg.text, fontSize);

    if (seg.underline) {
      page.drawLine({
        start: { x: currentX, y: y - 1.5 },
        end: { x: currentX + width, y: y - 1.5 },
        thickness: 0.8,
        color: rgb(0, 0, 0),
      });
    }

    currentX += width;
  }
}

function findCharacterName(lines: ParsedLine[], startIdx: number): string {
  for (let i = startIdx; i >= 0; i--) {
    if (lines[i].type === LineType.character || lines[i].type === LineType.dualDialogueCharacter) {
      return lines[i].text.trim().replace(/\s*\^$/, "").replace(/\s*\(.*\)$/, "").trim().toUpperCase();
    }
  }
  return "";
}

function isTitlePage(pageLines: ParsedLine[]): boolean {
  return pageLines.some(l => l.type >= LineType.titlePageTitle && l.type <= LineType.titlePageUnknown);
}

function renderTitlePage(
  page: any,
  pageLines: ParsedLine[],
  width: number,
  height: number,
  fontRegular: any,
  fontBold: any,
  fontItalic: any
) {
  let title = "";
  let credit = "";
  let author = "";
  let source = "";
  let contact = "";
  let draftDate = "";

  for (const line of pageLines) {
    const trimmed = line.text.trim();
    if (trimmed === "") continue;
    const colonIdx = trimmed.indexOf(":");
    const value = colonIdx !== -1 ? trimmed.substring(colonIdx + 1).trim() : trimmed;

    if (line.type === LineType.titlePageTitle) {
      title += (title ? "\n" : "") + value;
    } else if (line.type === LineType.titlePageCredit) {
      credit += (credit ? "\n" : "") + value;
    } else if (line.type === LineType.titlePageAuthor) {
      author += (author ? "\n" : "") + value;
    } else if (line.type === LineType.titlePageSource) {
      source += (source ? "\n" : "") + value;
    } else if (line.type === LineType.titlePageContact) {
      contact += (contact ? "\n" : "") + value;
    } else if (line.type === LineType.titlePageDraftDate) {
      draftDate += (draftDate ? "\n" : "") + value;
    }
  }

  if (title) {
    const cleanTitle = title.replace(/\*\*|\*|_/g, "").toUpperCase();
    const titleLines = cleanTitle.split("\n");
    let currentY = height - 340;
    for (const tLine of titleLines) {
      const w = fontBold.widthOfTextAtSize(tLine, 12);
      page.drawText(tLine, {
        x: width / 2 - w / 2,
        y: currentY,
        size: 12,
        font: fontBold,
        color: rgb(0, 0, 0),
      });
      currentY -= 16;
    }
  }

  if (credit) {
    const creditLines = credit.split("\n");
    let currentY = height - 420;
    for (const cLine of creditLines) {
      const w = fontItalic.widthOfTextAtSize(cLine, 12);
      page.drawText(cLine, {
        x: width / 2 - w / 2,
        y: currentY,
        size: 12,
        font: fontItalic,
        color: rgb(0, 0, 0),
      });
      currentY -= 16;
    }
  }

  if (author) {
    const authorLines = author.split("\n");
    let currentY = height - 450;
    for (const aLine of authorLines) {
      const w = fontRegular.widthOfTextAtSize(aLine, 12);
      page.drawText(aLine, {
        x: width / 2 - w / 2,
        y: currentY,
        size: 12,
        font: fontRegular,
        color: rgb(0, 0, 0),
      });
      currentY -= 16;
    }
  }

  if (source) {
    const sourceLines = source.split("\n");
    let currentY = height - 500;
    for (const sLine of sourceLines) {
      const w = fontRegular.widthOfTextAtSize(sLine, 12);
      page.drawText(sLine, {
        x: width / 2 - w / 2,
        y: currentY,
        size: 12,
        font: fontRegular,
        color: rgb(0, 0, 0),
      });
      currentY -= 16;
    }
  }

  let contactY = 120;
  if (contact) {
    const contactLines = contact.split("\n");
    for (const cLine of contactLines) {
      page.drawText(cLine, {
        x: 108,
        y: contactY,
        size: 12,
        font: fontRegular,
        color: rgb(0, 0, 0),
      });
      contactY -= 14;
    }
  }

  if (draftDate) {
    const dateLines = draftDate.split("\n");
    for (const dLine of dateLines) {
      page.drawText(dLine, {
        x: 108,
        y: contactY,
        size: 12,
        font: fontItalic,
        color: rgb(0, 0, 0),
      });
      contactY -= 14;
    }
  }
}

function renderContentPage(
  page: any,
  pageLines: ParsedLine[],
  width: number,
  height: number,
  fontRegular: any,
  fontBold: any,
  fontItalic: any,
  fontBoldItalic: any,
  paperSize: 'letter' | 'a4',
  nextPageLines: ParsedLine[] | null,
  allLines: ParsedLine[]
) {
  let y = height - 84;
  const fontSize = 12;

  const firstLine = pageLines.find(l => l.type !== LineType.empty && l.type !== LineType.pageBreak);
  if (firstLine && (
    firstLine.type === LineType.dialogue ||
    firstLine.type === LineType.parenthetical ||
    firstLine.type === LineType.dualDialogue ||
    firstLine.type === LineType.dualDialogueParenthetical
  )) {
    const firstLineIdx = allLines.findIndex(l => l.id === firstLine.id);
    if (firstLineIdx !== -1) {
      const charName = findCharacterName(allLines, firstLineIdx);
      if (charName) {
        page.drawText(`${charName} (CONT'D)`, {
          x: 266.4,
          y,
          size: fontSize,
          font: fontRegular,
          color: rgb(0, 0, 0),
        });
        y -= 12;
      }
    }
  }

  for (let i = 0; i < pageLines.length; i++) {
    const line = pageLines[i];
    if (line.type === LineType.empty || line.type === LineType.pageBreak) {
      y -= 12;
      continue;
    }

    const cleanedText = cleanFountainSyntax(line.text, line.type);
    if (cleanedText.trim() === "") {
      y -= 12;
      continue;
    }

    const maxWidth = getElementMaxWidth(line.type, paperSize);
    const wrappedLines = wrapTextToLines(cleanedText, maxWidth);

    for (const wrappedLine of wrappedLines) {
      let x = 108;

      if (line.type === LineType.character || line.type === LineType.dualDialogueCharacter) {
        x = 266.4;
      } else if (line.type === LineType.parenthetical || line.type === LineType.dualDialogueParenthetical) {
        x = 223.2;
      } else if (line.type === LineType.dialogue || line.type === LineType.dualDialogue) {
        x = 180;
      } else if (line.type === LineType.transitionLine) {
        const totalWidth = getStyledLineWidth(wrappedLine, fontSize, fontRegular, fontBold, fontItalic, fontBoldItalic);
        x = width - 72 - totalWidth;
      } else if (line.type === LineType.centered) {
        const totalWidth = getStyledLineWidth(wrappedLine, fontSize, fontRegular, fontBold, fontItalic, fontBoldItalic);
        x = (width + 36) / 2 - totalWidth / 2;
      }

      drawStyledLine(
        page,
        wrappedLine,
        x,
        y,
        fontSize,
        fontRegular,
        fontBold,
        fontItalic,
        fontBoldItalic
      );

      if (line.type === LineType.heading && line.sceneNumber) {
        const leftSceneX = 92 - fontBold.widthOfTextAtSize(line.sceneNumber, fontSize);
        const rightSceneX = width - 56;

        page.drawText(line.sceneNumber, {
          x: leftSceneX,
          y,
          size: fontSize,
          font: fontBold,
          color: rgb(0, 0, 0),
        });

        page.drawText(line.sceneNumber, {
          x: rightSceneX,
          y,
          size: fontSize,
          font: fontBold,
          color: rgb(0, 0, 0),
        });
      }

      y -= 12;
    }
  }

  if (nextPageLines && nextPageLines.length > 0) {
    const nextFirstLine = nextPageLines.find(l => l.type !== LineType.empty && l.type !== LineType.pageBreak);
    if (nextFirstLine && (
      nextFirstLine.type === LineType.dialogue ||
      nextFirstLine.type === LineType.parenthetical ||
      nextFirstLine.type === LineType.dualDialogue ||
      nextFirstLine.type === LineType.dualDialogueParenthetical
    )) {
      page.drawText("(MORE)", {
        x: 266.4,
        y: y > 72 ? y : 72,
        size: fontSize,
        font: fontRegular,
        color: rgb(0, 0, 0),
      });
    }
  }
}

async function fetchFont(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load font: ${url}`);
  }
  return response.arrayBuffer();
}

export async function exportToPDF(
  parsedDoc: FountainDocument,
  fontFamilyName: 'courier-prime' | 'courier-prime-sans',
  paperSize: 'letter' | 'a4'
) {
  const isA4 = paperSize === "a4";
  const width = isA4 ? 595 : 612;
  const height = isA4 ? 842 : 792;

  const baseName = fontFamilyName === "courier-prime" ? "Courier Prime" : "Courier Prime Sans";

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const [regBytes, boldBytes, italBytes, biBytes] = await Promise.all([
    fetchFont(`/fonts/${encodeURIComponent(baseName)}.ttf`),
    fetchFont(`/fonts/${encodeURIComponent(baseName + " Bold")}.ttf`),
    fetchFont(`/fonts/${encodeURIComponent(baseName + " Italic")}.ttf`),
    fetchFont(`/fonts/${encodeURIComponent(baseName + " Bold Italic")}.ttf`),
  ]);

  const fontRegular = await pdfDoc.embedFont(regBytes);
  const fontBold = await pdfDoc.embedFont(boldBytes);
  const fontItalic = await pdfDoc.embedFont(italBytes);
  const fontBoldItalic = await pdfDoc.embedFont(biBytes);

  const pages: ParsedLine[][] = [];
  let prevIdx = 0;
  if (parsedDoc.pageBreaks && parsedDoc.pageBreaks.length > 0) {
    for (const breakLineNum of parsedDoc.pageBreaks) {
      const breakIdx = breakLineNum - 1;
      pages.push(parsedDoc.lines.slice(prevIdx, breakIdx));
      prevIdx = breakIdx;
    }
  }
  pages.push(parsedDoc.lines.slice(prevIdx));

  let contentPageNum = 1;

  for (let p = 0; p < pages.length; p++) {
    const pageLines = pages[p];
    if (isTitlePage(pageLines)) {
      const page = pdfDoc.addPage([width, height]);
      renderTitlePage(page, pageLines, width, height, fontRegular, fontBold, fontItalic);
    } else {
      const page = pdfDoc.addPage([width, height]);

      if (contentPageNum > 1) {
        const pageNumText = `${contentPageNum}.`;
        const numWidth = fontRegular.widthOfTextAtSize(pageNumText, 12);
        page.drawText(pageNumText, {
          x: width - 72 - numWidth,
          y: height - 36,
          size: 12,
          font: fontRegular,
          color: rgb(0, 0, 0),
        });
      }

      renderContentPage(
        page,
        pageLines,
        width,
        height,
        fontRegular,
        fontBold,
        fontItalic,
        fontBoldItalic,
        paperSize,
        p < pages.length - 1 ? pages[p + 1] : null,
        parsedDoc.lines
      );

      contentPageNum++;
    }
  }

  const isTauri = typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__;
  if (isTauri) {
    try {
      const pdfBytes = await pdfDoc.save();
      await invoke("save_pdf_dialog", { bytes: Array.from(pdfBytes) });
    } catch (e) {
      console.error("Tauri PDF save failed:", e);
    }
  } else {
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "screenplay.pdf";
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  }
}
