export enum LineType {
  empty = 0,
  section = 1,
  synopse = 2,
  titlePageTitle = 3,
  titlePageAuthor = 4,
  titlePageCredit = 5,
  titlePageSource = 6,
  titlePageContact = 7,
  titlePageDraftDate = 8,
  titlePageUnknown = 9,
  heading = 10,
  action = 11,
  character = 12,
  parenthetical = 13,
  dialogue = 14,
  dualDialogueCharacter = 15,
  dualDialogueParenthetical = 16,
  dualDialogue = 17,
  transitionLine = 18,
  lyrics = 19,
  pageBreak = 20,
  centered = 21,
  shot = 22,
  more = 23,
  dualDialogueMore = 24
}

export interface ParsedLine {
  id: string;
  text: string;
  type: LineType;
  sceneNumber?: string;
  color?: string;
  sectionDepth?: number;
  isOutlineElement: boolean;
  collapsed?: boolean;
  marker?: { color: string; description: string };
  storylines?: string[];
}

export interface FountainDocument {
  lines: ParsedLine[];
  settings: any;
  screenplayText: string;
  pageBreaks?: number[];
}

const SUPPORTED_COLORS = [
  "blue", "brown", "cyan", "green", "magenta", "none", "orange", "pink", "purple", "red", "yellow"
];

function generateUUID(): string {
  return "line-" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function parseScreenplay(rawText: string, paperSize: 'letter' | 'a4' = 'letter'): FountainDocument {
  let screenplayText = rawText;
  let settings: any = {};

  let beatStartIdx = rawText.indexOf("/* If you are seeing this and you are not using ActOne, you can delete these. - ACTONE:");
  let beatEndIdx = rawText.indexOf("END_ACTONE*/");
  let startStr = "/* If you are seeing this and you are not using ActOne, you can delete these. - ACTONE:";

  if (beatStartIdx === -1) {
    beatStartIdx = rawText.indexOf("/* If you're seeing this, you can remove the following stuff - ACTONE:");
    startStr = "/* If you're seeing this, you can remove the following stuff - ACTONE:";
  }

  if (beatStartIdx !== -1 && beatEndIdx !== -1 && beatEndIdx > beatStartIdx) {
    const jsonStr = rawText.substring(beatStartIdx + startStr.length, beatEndIdx).trim();
    try {
      settings = JSON.parse(jsonStr);
    } catch (e) {
      settings = {};
    }
    screenplayText = rawText.substring(0, beatStartIdx).trimEnd();
  }

  const rawLines = screenplayText.split(/\r?\n/);
  const parsedLines: ParsedLine[] = [];
  let inTitlePage = true;
  let lastTitlePageType = LineType.titlePageUnknown;

  for (let i = 0; i < rawLines.length; i++) {
    const rawLine = rawLines[i];
    const trimmed = rawLine.trim();

    if (inTitlePage) {
      if (trimmed === "") {
        if (parsedLines.length > 0) {
          inTitlePage = false;
        }
        parsedLines.push({
          id: generateUUID(),
          text: rawLine,
          type: LineType.empty,
          isOutlineElement: false
        });
        continue;
      }

      const colonIdx = trimmed.indexOf(":");
      if (colonIdx !== -1) {
        const key = trimmed.substring(0, colonIdx).trim().toLowerCase();
        let type = LineType.titlePageUnknown;

        if (key === "title") type = LineType.titlePageTitle;
        else if (key === "author" || key === "authors") type = LineType.titlePageAuthor;
        else if (key === "credit") type = LineType.titlePageCredit;
        else if (key === "source") type = LineType.titlePageSource;
        else if (key === "contact") type = LineType.titlePageContact;
        else if (key === "draft date" || key === "date") type = LineType.titlePageDraftDate;

        lastTitlePageType = type;
        parsedLines.push({
          id: generateUUID(),
          text: rawLine,
          type,
          isOutlineElement: false
        });
        continue;
      } else if (trimmed.startsWith(" ") || trimmed.startsWith("\t") || parsedLines.length > 0) {
        parsedLines.push({
          id: generateUUID(),
          text: rawLine,
          type: lastTitlePageType,
          isOutlineElement: false
        });
        continue;
      } else {
        inTitlePage = false;
      }
    }

    let type = LineType.action;
    let isOutlineElement = false;
    let sectionDepth: number | undefined;
    let sceneNumber: string | undefined;
    let color: string | undefined;
    let marker: { color: string; description: string } | undefined;
    let storylines: string[] | undefined;

    if (trimmed === "") {
      type = LineType.empty;
    } else if (trimmed.startsWith("#")) {
      type = LineType.section;
      isOutlineElement = true;
      let depth = 0;
      while (depth < trimmed.length && trimmed[depth] === "#") {
        depth++;
      }
      sectionDepth = depth;
    } else if (trimmed.startsWith("=")) {
      if (trimmed.startsWith("===") && trimmed.replace(/=/g, "").trim() === "") {
        type = LineType.pageBreak;
      } else {
        type = LineType.synopse;
        isOutlineElement = true;
      }
    } else if (trimmed.startsWith("~")) {
      type = LineType.lyrics;
    } else if (trimmed.startsWith("!!")) {
      type = LineType.shot;
    } else if (trimmed.startsWith("!")) {
      type = LineType.action;
    } else if (trimmed.startsWith(".") && !trimmed.startsWith("..")) {
      type = LineType.heading;
      isOutlineElement = true;
    } else if (trimmed.startsWith(">") && trimmed.endsWith("<")) {
      type = LineType.centered;
    } else if (trimmed.startsWith(">")) {
      type = LineType.transitionLine;
    } else {
      const prevLine = i > 0 ? parsedLines[i - 1] : null;
      const nextLineStr = i + 1 < rawLines.length ? rawLines[i + 1].trim() : "";

      const uppercaseTrimmed = trimmed.toUpperCase();
      const isAllCaps = trimmed === uppercaseTrimmed && /[A-Z]/.test(trimmed);
      const isForcedCharacter = trimmed.startsWith("@");

      const isHeadingPrefix = /^(INT|EXT|I\/E|I\.?\/?E\.?|E\/I|E\.?\/?I\.?)\b/i.test(trimmed);

      if (isHeadingPrefix && (!prevLine || prevLine.type === LineType.empty)) {
        type = LineType.heading;
        isOutlineElement = true;
      } else if (isAllCaps && trimmed.endsWith("TO:") && (!prevLine || prevLine.type === LineType.empty)) {
        type = LineType.transitionLine;
      } else if ((isAllCaps || isForcedCharacter) && (!prevLine || prevLine.type === LineType.empty) && nextLineStr !== "") {
        if (trimmed.endsWith("^")) {
          type = LineType.dualDialogueCharacter;
        } else {
          type = LineType.character;
        }
      } else if (trimmed.startsWith("(") && trimmed.endsWith(")")) {
        const isPrevDialogue = prevLine && (
          prevLine.type === LineType.character ||
          prevLine.type === LineType.dialogue ||
          prevLine.type === LineType.parenthetical ||
          prevLine.type === LineType.dualDialogueCharacter ||
          prevLine.type === LineType.dualDialogue ||
          prevLine.type === LineType.dualDialogueParenthetical
        );
        if (isPrevDialogue) {
          type = prevLine.type === LineType.dualDialogueCharacter ||
                 prevLine.type === LineType.dualDialogue ||
                 prevLine.type === LineType.dualDialogueParenthetical
            ? LineType.dualDialogueParenthetical
            : LineType.parenthetical;
        }
      } else {
        const isPrevDialogue = prevLine && (
          prevLine.type === LineType.character ||
          prevLine.type === LineType.dialogue ||
          prevLine.type === LineType.parenthetical ||
          prevLine.type === LineType.dualDialogueCharacter ||
          prevLine.type === LineType.dualDialogue ||
          prevLine.type === LineType.dualDialogueParenthetical
        );
        if (isPrevDialogue) {
          type = prevLine.type === LineType.dualDialogueCharacter ||
                 prevLine.type === LineType.dualDialogue ||
                 prevLine.type === LineType.dualDialogueParenthetical
            ? LineType.dualDialogue
            : LineType.dialogue;
        }
      }
    }

    const noteMatches = rawLine.match(/\[\[(.*?)\]\]/g);
    if (noteMatches) {
      for (const note of noteMatches) {
        const content = note.substring(2, note.length - 2).trim();
        const contentLower = content.toLowerCase();

        if (contentLower.startsWith("marker")) {
          const markerBody = content.substring(6).trim();
          let markerColor = "orange";
          let description = markerBody;
          const colonIdx = markerBody.indexOf(":");
          if (colonIdx !== -1) {
            const beforeColon = markerBody.substring(0, colonIdx).trim().toLowerCase();
            if (SUPPORTED_COLORS.includes(beforeColon) || (beforeColon.startsWith("#") && beforeColon.length === 7)) {
              markerColor = beforeColon;
            }
            description = markerBody.substring(colonIdx + 1).trim();
          } else if (SUPPORTED_COLORS.includes(markerBody.toLowerCase())) {
            markerColor = markerBody.toLowerCase();
            description = "";
          }
          marker = { color: markerColor, description };
          isOutlineElement = true;
        } else if (contentLower.startsWith("storyline") && type === LineType.heading) {
          const storylineBody = content.substring(9).trim();
          storylines = storylineBody.split(",").map(s => s.trim().toUpperCase()).filter(s => s.length > 0);
        } else if (type === LineType.heading) {
          if (contentLower.startsWith("color ")) {
            const possibleColor = contentLower.substring(6).trim();
            if (SUPPORTED_COLORS.includes(possibleColor) || (possibleColor.startsWith("#") && possibleColor.length === 7)) {
              color = possibleColor;
            }
          } else if (SUPPORTED_COLORS.includes(contentLower) || (contentLower.startsWith("#") && contentLower.length === 7)) {
            color = contentLower;
          }
        }
      }
    }

    if (type === LineType.heading) {
      let workingText = trimmed;
      if (workingText.startsWith(".")) {
        workingText = workingText.substring(1).trim();
      }
      const matchNum = workingText.match(/#([^#]+)#$/);
      if (matchNum) {
        sceneNumber = matchNum[1];
      }
    }

    const line: ParsedLine = {
      id: generateUUID(),
      text: rawLine,
      type,
      sceneNumber,
      color,
      sectionDepth,
      isOutlineElement
    };
    if (marker) line.marker = marker;
    if (storylines && storylines.length > 0) line.storylines = storylines;
    parsedLines.push(line);
  }

  const pageBreaks = paginateScreenplay(parsedLines, paperSize);

  return {
    lines: parsedLines,
    settings,
    screenplayText,
    pageBreaks
  };
}

export function getElementMaxWidth(type: LineType, paperSize: 'letter' | 'a4'): number {
  const isA4 = paperSize === 'a4';
  switch (type) {
    case LineType.character:
    case LineType.dualDialogueCharacter:
      return isA4 ? 35 : 38;
    case LineType.dialogue:
    case LineType.dualDialogue:
      return 35;
    case LineType.parenthetical:
    case LineType.dualDialogueParenthetical:
      return 25;
    case LineType.heading:
    case LineType.action:
    case LineType.shot:
    case LineType.section:
    case LineType.synopse:
    case LineType.lyrics:
    case LineType.centered:
    case LineType.transitionLine:
      return isA4 ? 57 : 60;
    default:
      return isA4 ? 57 : 60;
  }
}

export function wrapText(text: string, maxWidth: number): number {
  const trimmed = text.trim();
  if (trimmed === "") return 1;
  const words = trimmed.split(/\s+/);
  let linesCount = 1;
  let currentLineLength = 0;
  for (const word of words) {
    if (currentLineLength === 0) {
      currentLineLength = word.length;
    } else if (currentLineLength + 1 + word.length <= maxWidth) {
      currentLineLength += 1 + word.length;
    } else {
      linesCount++;
      currentLineLength = word.length;
    }
  }
  return linesCount;
}

export function paginateScreenplay(lines: ParsedLine[], paperSize: 'letter' | 'a4'): number[] {
  const maxPageLines = paperSize === 'a4' ? 58 : 54;
  const pageBreaks: number[] = [];
  
  let titlePageEndIndex = -1;
  let hasTitlePage = false;
  
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].type;
    const isTitleType = t >= LineType.titlePageTitle && t <= LineType.titlePageUnknown;
    if (isTitleType) {
      hasTitlePage = true;
    }
    const isContent = t !== LineType.empty && !isTitleType;
    if (isContent) {
      titlePageEndIndex = i - 1;
      break;
    }
  }

  if (hasTitlePage && titlePageEndIndex >= 0) {
    pageBreaks.push(titlePageEndIndex + 2);
  }

  const startContentIndex = hasTitlePage ? titlePageEndIndex + 1 : 0;
  let currentLinesOnPage = 0;

  let lastWasEmpty = false;
  const heights = lines.map(line => {
    const t = line.type;
    const isTitleType = t >= LineType.titlePageTitle && t <= LineType.titlePageUnknown;
    if (isTitleType) {
      lastWasEmpty = false;
      return 0;
    }
    if (line.marker) {
      lastWasEmpty = false;
      return 0;
    }
    if (t === LineType.synopse || t === LineType.section) {
      lastWasEmpty = false;
      return 0;
    }
    if (t === LineType.pageBreak) {
      lastWasEmpty = false;
      return 0;
    }
    if (t === LineType.empty) {
      if (lastWasEmpty) {
        return 0;
      }
      lastWasEmpty = true;
      return 1;
    }
    lastWasEmpty = false;
    return wrapText(line.text, getElementMaxWidth(t, paperSize));
  });

  for (let i = startContentIndex; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.type === LineType.pageBreak) {
      pageBreaks.push(i + 2);
      currentLinesOnPage = 0;
      continue;
    }

    const h = heights[i];
    if (h === 0) continue;

    if (currentLinesOnPage + h > maxPageLines) {
      let breakIndex = i;

      if (line.type === LineType.heading) {
        breakIndex = i;
      } else {
        let foundHeadingIndex = -1;
        for (let j = i; j >= startContentIndex; j--) {
          if (lines[j].type === LineType.heading) {
            foundHeadingIndex = j;
            break;
          }
          if (lines[j].type === LineType.empty || lines[j].type === LineType.character || lines[j].type === LineType.dialogue) {
            break;
          }
        }
        if (foundHeadingIndex !== -1) {
          breakIndex = foundHeadingIndex;
        }
      }

      if (breakIndex === i) {
        let foundCharIndex = -1;
        for (let j = i; j >= startContentIndex; j--) {
          if (lines[j].type === LineType.character || lines[j].type === LineType.dualDialogueCharacter) {
            foundCharIndex = j;
            break;
          }
          if (lines[j].type === LineType.empty || lines[j].type === LineType.heading || lines[j].type === LineType.action) {
            break;
          }
        }
        if (foundCharIndex !== -1) {
          breakIndex = foundCharIndex;
        }
      }

      if (breakIndex <= startContentIndex) {
        breakIndex = i;
      }

      pageBreaks.push(breakIndex + 1);
      currentLinesOnPage = 0;
      i = breakIndex - 1;
    } else {
      currentLinesOnPage += h;
    }
  }

  return pageBreaks;
}

export function serializeScreenplay(lines: ParsedLine[], settings: any): string {
  const text = lines.map(l => l.text).join("\n");
  if (!settings || Object.keys(settings).length === 0) {
    return text;
  }
  const settingsBlock = `\n\n/* If you are seeing this and you are not using ActOne, you can delete these. - ACTONE:\n${JSON.stringify(settings, null, 2)}\nEND_ACTONE*/`;
  return text + settingsBlock;
}
