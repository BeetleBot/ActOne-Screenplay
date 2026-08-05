import { parseScreenplay, LineType, type ParsedLine } from "../parser/FountainParser";

/**
 * Fix Formatting Module
 * 
 * Rules:
 * 1. Compact Dialogue: 0 blank lines between Character, Parenthetical, and Dialogue lines.
 * 2. Element Separation: Exactly 1 blank line between distinct screenplay elements; consolidates 2+ consecutive blank lines down to 1.
 * 3. Paragraph Preservation: Preserves multi-line action and lyric paragraphs without collapsing them into a single line.
 * 4. Syntax Prefix & Note Trimming: Strips trailing space after forced syntax prefixes (. # = @ ! ~) and around note brackets [[ ]].
 * 5. Title Page Isolation: Consolidates extra blank lines in title page metadata.
 */
export interface FixFormattingReport {
  formattedText: string;
  linesRemoved: number;
  dialogueSpacesCleaned: number;
  syntaxPrefixesTrimmed: number;
  notesTrimmed: number;
  totalChanges: number;
}

export function fixFormatting(
  rawText: string,
  paperSize: "letter" | "a4" = "letter"
): FixFormattingReport {
  let dialogueSpacesCleaned = 0;
  let syntaxPrefixesTrimmed = 0;
  let notesTrimmed = 0;

  const doc = parseScreenplay(rawText, paperSize);
  const rawLines = doc.screenplayText.split(/\r?\n/);
  const cleanedLinesText = rawLines.map((line) => {
    let cleanedText = line.trim();

    const preSyntax = cleanedText;
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
    if (cleanedText !== preSyntax) {
      syntaxPrefixesTrimmed++;
    }

    const preNotes = cleanedText;
    cleanedText = cleanedText.replace(/\[\[\s+/g, "[[").replace(/\s+\]\]/g, "]]");
    if (cleanedText !== preNotes) {
      notesTrimmed++;
    }

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
      const isHeading =
        /^(INT|EXT|I\/E|I\.?\/?E\.?|E\/I|E\.?\/?I\.?)\b/i.test(trimmed) ||
        trimmed.startsWith(".");
      const isTransition = trimmed.endsWith("TO:");
      const isOutline = trimmed.startsWith("#") || trimmed.startsWith("=");
      if (!isHeading && !isTransition && !isOutline) {
        let nextNonEmptyIdx = idx + 1;
        while (
          nextNonEmptyIdx < cleanedLinesText.length &&
          cleanedLinesText[nextNonEmptyIdx].trim() === ""
        ) {
          nextNonEmptyIdx++;
        }
        if (nextNonEmptyIdx < cleanedLinesText.length) {
          const nextTrimmed = cleanedLinesText[nextNonEmptyIdx].trim();
          const nextIsHeading =
            /^(INT|EXT|I\/E|I\.?\/?E\.?|E\/I|E\.?\/?I\.?)\b/i.test(nextTrimmed) ||
            nextTrimmed.startsWith(".");
          const nextIsTransition =
            nextTrimmed.endsWith("TO:") &&
            nextTrimmed === nextTrimmed.toUpperCase() &&
            /[A-Z]/.test(nextTrimmed);
          const nextIsOutline =
            nextTrimmed.startsWith("#") || nextTrimmed.startsWith("=");
          const nextIsForced =
            nextTrimmed.startsWith("@") ||
            nextTrimmed.startsWith("!") ||
            nextTrimmed.startsWith("~");

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
      let lastType: "character" | "parenthetical" | "dialogue" = "character";
      while (j < cleanedLinesText.length) {
        const nextLine = cleanedLinesText[j];
        const nextTrimmed = nextLine.trim();
        if (nextTrimmed === "") {
          crossedEmpty = true;
          j++;
          dialogueSpacesCleaned++;
          continue;
        }
        const nextIsHeading =
          /^(INT|EXT|I\/E|I\.?\/?E\.?|E\/I|E\.?\/?I\.?)\b/i.test(nextTrimmed) ||
          nextTrimmed.startsWith(".");
        const nextIsTransition =
          nextTrimmed.endsWith("TO:") &&
          nextTrimmed === nextTrimmed.toUpperCase() &&
          /[A-Z]/.test(nextTrimmed);
        const nextIsOutline =
          nextTrimmed.startsWith("#") || nextTrimmed.startsWith("=");
        const nextIsForced =
          nextTrimmed.startsWith("@") ||
          nextTrimmed.startsWith("!") ||
          nextTrimmed.startsWith("~");

        let isNewChar = false;
        if (
          nextTrimmed === nextTrimmed.toUpperCase() &&
          /[A-Z]/.test(nextTrimmed) &&
          crossedEmpty
        ) {
          isNewChar = true;
        }

        const nextIsParenthetical = nextTrimmed.startsWith("(");
        const shouldEndDialogue =
          nextIsHeading ||
          nextIsTransition ||
          nextIsOutline ||
          nextIsForced ||
          isNewChar ||
          (crossedEmpty && lastType === "dialogue" && !nextIsParenthetical);

        if (shouldEndDialogue) {
          if (crossedEmpty) {
            dialogueMergedLines.push("");
          }
          break;
        }

        dialogueMergedLines.push(nextLine);
        lastType = nextIsParenthetical ? "parenthetical" : "dialogue";
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
    const result = titlePageLines.join("\n");
    const linesRemoved = Math.max(0, rawLines.length - titlePageLines.length);
    const totalChanges = linesRemoved + dialogueSpacesCleaned + syntaxPrefixesTrimmed + notesTrimmed;
    return {
      formattedText: result,
      linesRemoved,
      dialogueSpacesCleaned,
      syntaxPrefixesTrimmed,
      notesTrimmed,
      totalChanges,
    };
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
      originalIndex: firstBodyIndex + iIdx,
    }))
    .filter((line) => line.type !== LineType.empty);

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
  let prevElement: (ParsedLine & { originalIndex: number }) | null = null;

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

  const finalFormattedText = resultLines.join("\n");
  const finalLinesCount = finalFormattedText.split(/\r?\n/).length;
  const linesRemoved = Math.max(0, rawLines.length - finalLinesCount);
  const totalChanges = linesRemoved + dialogueSpacesCleaned + syntaxPrefixesTrimmed + notesTrimmed;

  return {
    formattedText: finalFormattedText,
    linesRemoved,
    dialogueSpacesCleaned,
    syntaxPrefixesTrimmed,
    notesTrimmed,
    totalChanges,
  };
}
