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

export interface ParsedSceneHeading {
  setting: string | null;
  location: string | null;
  timeOfDay: string | null;
  sceneNumber: string | null;
}

export function parseSceneHeading(headingText: string): ParsedSceneHeading {
  let cleanText = headingText.trim();
  if (cleanText.startsWith(".")) {
    cleanText = cleanText.substring(1).trim();
  }
  cleanText = cleanText.replace(/\[\[.*?\]\]/g, "").trim();
  
  let sceneNumber: string | null = null;
  const matchNum = cleanText.match(/#([^#\s]+)#/);
  if (matchNum) {
    sceneNumber = matchNum[1].trim();
    cleanText = cleanText.replace(/#([^#\s]+)#/, "").trim();
  }

  let setting: string | null = null;
  const settingMatch = cleanText.match(/^(INT\/EXT|EXT\/INT|INT|EXT|I\/E|E\/I|\/EXT|\/INT)(?:\.|\s+|$)/i);
  if (settingMatch) {
    setting = settingMatch[1].toUpperCase();
    cleanText = cleanText.substring(settingMatch[0].length).trim();
  }

  let location: string | null = null;
  let timeOfDay: string | null = null;
  const parts = cleanText.split(/\s+-\s+/);

  if (parts.length > 1) {
    const rawTime = parts[parts.length - 1].trim();
    const cleanTime = rawTime.replace(/[[(].*?[\])]/g, "").trim().toUpperCase();
    if (cleanTime) {
      timeOfDay = cleanTime;
    }
    const locPart = parts.slice(0, parts.length - 1).join(" - ").trim().toUpperCase();
    if (locPart) {
      location = locPart;
    }
  } else if (cleanText) {
    location = cleanText.trim().toUpperCase();
  }

  if (location) {
    location = location
      .replace(/^(INT\/EXT|EXT\/INT|INT|EXT|I\/E|E\/I|\/EXT|\/INT)\b\.?\s*/i, "")
      .trim();
  }

  return { setting, location, timeOfDay, sceneNumber };
}

export function parseScreenplay(rawText: string, paperSize: 'letter' | 'a4' = 'letter'): FountainDocument {
  const screenplayText = rawText;
  const settings: any = {};

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
        else if (key === "notes") type = LineType.titlePageUnknown;

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
    } else if (/^#{1,2}(?:[^#]|$)/.test(trimmed)) {
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
      const matchNum = workingText.match(/#([^#\s]+)#/);
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

      let lastVisibleIndex = -1;
      for (let j = i - 1; j >= startContentIndex; j--) {
        const t = lines[j].type;
        const isTitleType = t >= LineType.titlePageTitle && t <= LineType.titlePageUnknown;
        if (t !== LineType.empty && !isTitleType && !lines[j].marker && t !== LineType.synopse && t !== LineType.section) {
          lastVisibleIndex = j;
          break;
        }
      }

      if (lastVisibleIndex !== -1) {
        const lastType = lines[lastVisibleIndex].type;
        if (lastType === LineType.heading) {
          let earliestIndex = lastVisibleIndex;
          for (let j = lastVisibleIndex - 1; j >= startContentIndex; j--) {
            const t = lines[j].type;
            if (t === LineType.heading || t === LineType.empty || t === LineType.synopse || t === LineType.section || !!lines[j].marker) {
              earliestIndex = j;
            } else {
              break;
            }
          }
          breakIndex = earliestIndex;
        } else if (lastType === LineType.character || lastType === LineType.dualDialogueCharacter) {
          breakIndex = lastVisibleIndex;
        } else if (lastType === LineType.parenthetical || lastType === LineType.dualDialogueParenthetical) {
          let charIndex = -1;
          for (let j = lastVisibleIndex - 1; j >= startContentIndex; j--) {
            if (lines[j].type === LineType.character || lines[j].type === LineType.dualDialogueCharacter) {
              charIndex = j;
              break;
            }
          }
          if (charIndex !== -1) {
            breakIndex = charIndex;
          }
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

export function serializeScreenplay(lines: ParsedLine[]): string {
  return lines.map(l => l.text).join("\n");
}

export function formatScreenplaySpaces(rawText: string, paperSize: 'letter' | 'a4' = 'letter'): string {
  const doc = parseScreenplay(rawText, paperSize);
  const rawLines = doc.screenplayText.split(/\r?\n/);
  const cleanedLinesText = rawLines.map(line => {
    let cleanedText = line.trim();
    if (cleanedText.startsWith(".")) {
      cleanedText = "." + cleanedText.slice(1).trimStart();
    } else if (cleanedText.startsWith("#")) {
      const match = cleanedText.match(/^(#+)(.*)$/);
      if (match) {
        cleanedText = match[1] + match[2].trimStart();
      }
    } else if (cleanedText.startsWith("=")) {
      if (!cleanedText.startsWith("===")) {
        cleanedText = "=" + cleanedText.slice(1).trimStart();
      }
    } else if (cleanedText.startsWith("@")) {
      cleanedText = "@" + cleanedText.slice(1).trimStart();
    } else if (cleanedText.startsWith("!")) {
      cleanedText = "!" + cleanedText.slice(1).trimStart();
    } else if (cleanedText.startsWith("~")) {
      cleanedText = "~" + cleanedText.slice(1).trimStart();
    }
    cleanedText = cleanedText.replace(/\[\[\s+/g, "[[").replace(/\s+\]\]/g, "]]");
    return cleanedText;
  });

  const dialogueMergedLines: string[] = [];
  let idx = 0;
  while (idx < cleanedLinesText.length) {
    const line = cleanedLinesText[idx];
    const trimmed = line.trim();
    const isPrevEmpty = idx === 0 || cleanedLinesText[idx - 1].trim() === "";
    const isCaps = trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed);
    const isForcedChar = trimmed.startsWith("@");

    let isChar = false;
    if ((isCaps || isForcedChar) && isPrevEmpty && trimmed !== "") {
      const isHeading = /^(INT|EXT|I\/E|I\.?\/?E\.?|E\/I|E\.?\/?I\.?)\b/i.test(trimmed) || trimmed.startsWith(".");
      const isTransition = trimmed.endsWith("TO:");
      const isOutline = trimmed.startsWith("#") || trimmed.startsWith("=");
      if (!isHeading && !isTransition && !isOutline) {
        let nextNonEmptyIdx = idx + 1;
        while (nextNonEmptyIdx < cleanedLinesText.length && cleanedLinesText[nextNonEmptyIdx].trim() === "") {
          nextNonEmptyIdx++;
        }
        if (nextNonEmptyIdx < cleanedLinesText.length) {
          const nextTrimmed = cleanedLinesText[nextNonEmptyIdx].trim();
          const nextIsHeading = /^(INT|EXT|I\/E|I\.?\/?E\.?|E\/I|E\.?\/?I\.?)\b/i.test(nextTrimmed) || nextTrimmed.startsWith(".");
          const nextIsTransition = nextTrimmed.endsWith("TO:") && nextTrimmed === nextTrimmed.toUpperCase() && /[A-Z]/.test(nextTrimmed);
          const nextIsOutline = nextTrimmed.startsWith("#") || nextTrimmed.startsWith("=");
          const nextIsForced = nextTrimmed.startsWith("@") || nextTrimmed.startsWith("!") || nextTrimmed.startsWith("~");

          if (!nextIsHeading && !nextIsTransition && !nextIsOutline && !nextIsForced) {
            isChar = true;
          }
        }
      }
    }

    if (isChar) {
      dialogueMergedLines.push(line);
      let j = idx + 1;
      let crossedEmpty = false;
      let lastType: 'character' | 'parenthetical' | 'dialogue' = 'character';
      while (j < cleanedLinesText.length) {
        const nextLine = cleanedLinesText[j];
        const nextTrimmed = nextLine.trim();
        if (nextTrimmed === "") {
          crossedEmpty = true;
          j++;
          continue;
        }
        const nextIsHeading = /^(INT|EXT|I\/E|I\.?\/?E\.?|E\/I|E\.?\/?I\.?)\b/i.test(nextTrimmed) || nextTrimmed.startsWith(".");
        const nextIsTransition = nextTrimmed.endsWith("TO:") && nextTrimmed === nextTrimmed.toUpperCase() && /[A-Z]/.test(nextTrimmed);
        const nextIsOutline = nextTrimmed.startsWith("#") || nextTrimmed.startsWith("=");
        const nextIsForced = nextTrimmed.startsWith("@") || nextTrimmed.startsWith("!") || nextTrimmed.startsWith("~");

        let isNewChar = false;
        if (nextTrimmed === nextTrimmed.toUpperCase() && /[A-Z]/.test(nextTrimmed) && crossedEmpty) {
          isNewChar = true;
        }

        const nextIsParenthetical = nextTrimmed.startsWith("(");
        const shouldEndDialogue = nextIsHeading || nextIsTransition || nextIsOutline || nextIsForced || isNewChar || 
                                  (crossedEmpty && lastType === 'dialogue' && !nextIsParenthetical);

        if (shouldEndDialogue) {
          if (crossedEmpty) {
            dialogueMergedLines.push("");
          }
          break;
        }

        dialogueMergedLines.push(nextLine);
        lastType = nextIsParenthetical ? 'parenthetical' : 'dialogue';
        j++;
      }
      idx = j;
    } else {
      dialogueMergedLines.push(line);
      idx++;
    }
  }

  const cleanedRawText = dialogueMergedLines.join("\n");
  const cleanedDoc = parseScreenplay(cleanedRawText, paperSize);

  let firstBodyIndex = -1;
  for (let i = 0; i < cleanedDoc.lines.length; i++) {
    const line = cleanedDoc.lines[i];
    const t = line.type;
    const isTitleType = t >= LineType.titlePageTitle && t <= LineType.titlePageUnknown;
    if (!isTitleType && t !== LineType.empty) {
      firstBodyIndex = i;
      break;
    }
  }

  if (firstBodyIndex === -1) {
    const titlePageLines: string[] = [];
    let lastWasEmpty = false;
    for (const line of dialogueMergedLines) {
      if (line === "") {
        if (!lastWasEmpty) {
          titlePageLines.push("");
          lastWasEmpty = true;
        }
      } else {
        titlePageLines.push(line);
        lastWasEmpty = false;
      }
    }
    return titlePageLines.join("\n");
  }

  const titlePageLines: string[] = [];
  let lastWasEmpty = false;
  for (const line of dialogueMergedLines.slice(0, firstBodyIndex)) {
    if (line === "") {
      if (!lastWasEmpty) {
        titlePageLines.push("");
        lastWasEmpty = true;
      }
    } else {
      titlePageLines.push(line);
      lastWasEmpty = false;
    }
  }

  const bodyElements = cleanedDoc.lines
    .slice(firstBodyIndex)
    .map((line, iIdx) => ({
      ...line,
      originalIndex: firstBodyIndex + iIdx
    }))
    .filter(line => line.type !== LineType.empty);

  const isDialogueType = (type: LineType) => {
    return (
      type === LineType.character ||
      type === LineType.parenthetical ||
      type === LineType.dialogue ||
      type === LineType.dualDialogueCharacter ||
      type === LineType.dualDialogueParenthetical ||
      type === LineType.dualDialogue
    );
  };

  const isDialogueSubElement = (type: LineType) => {
    return (
      type === LineType.parenthetical ||
      type === LineType.dialogue ||
      type === LineType.dualDialogueParenthetical ||
      type === LineType.dualDialogue
    );
  };

  const hasEmptyBetween = (startIdx: number, endIdx: number): boolean => {
    for (let i = startIdx + 1; i < endIdx; i++) {
      if (cleanedDoc.lines[i].type === LineType.empty) {
        return true;
      }
    }
    return false;
  };

  const resultLines: string[] = [...titlePageLines];
  let prevElement: any = null;

  for (let i = 0; i < bodyElements.length; i++) {
    const curr = bodyElements[i];
    if (prevElement === null) {
      resultLines.push(curr.text);
    } else {
      let spacing: number;
      if (isDialogueSubElement(curr.type) && isDialogueType(prevElement.type)) {
        spacing = 0;
      } else if (curr.type === LineType.action && prevElement.type === LineType.action) {
        spacing = hasEmptyBetween(prevElement.originalIndex, curr.originalIndex) ? 1 : 0;
      } else if (curr.type === LineType.lyrics && prevElement.type === LineType.lyrics) {
        spacing = hasEmptyBetween(prevElement.originalIndex, curr.originalIndex) ? 1 : 0;
      } else {
        spacing = 1;
      }

      if (spacing === 1) {
        resultLines.push("");
      }
      resultLines.push(curr.text);
    }
    prevElement = curr;
  }

  return resultLines.join("\n");
}
