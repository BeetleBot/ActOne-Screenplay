export interface StripFountainOptions {
  sections: boolean;
  synopses: boolean;
  titlePage: boolean;
  uppercaseElements?: boolean;
}

const COMMON_TRANSITIONS = /^(FADE OUT\.|FADE IN:|CUT TO BLACK\.|DISSOLVE TO:|MATCH CUT TO:|JUMP CUT TO:)$/i;
const HEADING_PREFIX = /^(INT|EXT|I\/E|I\.?\/?E\.?|E\/I|E\.?\/?I\.?)\b/i;

/**
 * Normalizes Fountain elements for export:
 * - Scene headings (.FORCED or INT/EXT) in UPPERCASE
 * - Character names (@FORCED, dual dialogue ^, or standard character cues) in UPPERCASE
 * - Shots (!!FORCED) in UPPERCASE
 * - Transitions (>FORCED or ending in TO: or standard transition cues) in UPPERCASE
 *
 * Strips ActOne-specific metadata, color tags, and markers.
 * Retains action, dialogue, parentheticals, lyrics, centered text, and title page formatting.
 */
export function stripFountainForExport(
  rawText: string,
  options: StripFountainOptions
): string {
  const uppercaseElements = options.uppercaseElements !== false;
  let text = rawText;

  text = text.replace(/\[\[marker[^\]]*\]\]/gi, "");
  text = text.replace(
    /\[\[(color\s[^\]]*|storyline[^\]]*|red|blue|green|pink|magenta|gray|purple|cyan|teal|yellow|orange|brown)\]\]/gi,
    ""
  );

  const lines = text.split(/\r?\n/);
  const titlePageLines: string[] = [];
  const bodyLines: string[] = [];

  let hasTitlePage = false;
  const firstNonEmptyLine = lines.find((l) => l.trim() !== "");
  if (firstNonEmptyLine) {
    const colonIdx = firstNonEmptyLine.indexOf(":");
    if (colonIdx !== -1) {
      const key = firstNonEmptyLine.substring(0, colonIdx).trim().toLowerCase();
      const validKeys = [
        "title",
        "credit",
        "author",
        "authors",
        "source",
        "notes",
        "draft date",
        "date",
        "contact",
        "copyright",
      ];
      if (validKeys.includes(key)) {
        hasTitlePage = true;
      }
    }
  }

  let inTitlePage = hasTitlePage;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (inTitlePage) {
      if (trimmed === "" && i > 0) {
        inTitlePage = false;
        if (!options.titlePage) {
          continue;
        }
      } else if (trimmed !== "") {
        if (!options.titlePage) {
          continue;
        }
      }
      titlePageLines.push(lines[i]);
      continue;
    }

    if (!options.sections && trimmed.startsWith("#") && !trimmed.startsWith("#!")) {
      continue;
    }

    if (
      !options.synopses &&
      trimmed.startsWith("=") &&
      !trimmed.startsWith("==") &&
      !(trimmed.startsWith("===") && trimmed.replace(/=/g, "").trim() === "")
    ) {
      continue;
    }

    bodyLines.push(lines[i]);
  }

  const processedBodyLines = uppercaseElements
    ? transformBodyLinesUppercase(bodyLines)
    : bodyLines;

  const combined = [...(options.titlePage ? titlePageLines : []), ...processedBodyLines];
  let result = combined.join("\n");
  result = result.replace(/\n{3,}/g, "\n\n");
  result = result.trimEnd() + "\n";

  return result;
}

function transformBodyLinesUppercase(lines: string[]): string[] {
  const result: string[] = [];
  const knownCharacters = new Set<string>();

  // Pass 1: Gather known characters across the script
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    const prevTrimmed = i > 0 ? lines[i - 1].trim() : "";
    const isPrecededByEmpty = prevTrimmed === "" || i === 0;

    if (trimmed.startsWith("@")) {
      const name = trimmed.slice(1).replace(/\s*\(.*?\)/g, "").replace(/\^$/, "").trim();
      if (name) knownCharacters.add(name.toUpperCase());
    } else if (isPrecededByEmpty && trimmed.endsWith("^")) {
      const name = trimmed.replace(/\^$/, "").replace(/\s*\(.*?\)/g, "").trim();
      if (name) knownCharacters.add(name.toUpperCase());
    } else if (isPrecededByEmpty && i < lines.length - 1) {
      const nextTrimmed = lines[i + 1].trim();
      if (/^\(.*?\)$/.test(nextTrimmed)) {
        const name = trimmed.replace(/\s*\(.*?\)/g, "").replace(/\^$/, "").trim();
        if (
          name &&
          !name.startsWith(".") &&
          !name.startsWith("!") &&
          !name.startsWith(">") &&
          !name.startsWith("#") &&
          !name.startsWith("=")
        ) {
          knownCharacters.add(name.toUpperCase());
        }
      }
    }
  }

  // Pass 2: Transform lines
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === "") {
      result.push(line);
      continue;
    }

    const prevTrimmed = i > 0 ? lines[i - 1].trim() : "";
    const isPrecededByEmpty = prevTrimmed === "" || i === 0;
    const nextTrimmed = i < lines.length - 1 ? lines[i + 1].trim() : "";

    const leadingWhitespace = line.match(/^\s*/)?.[0] || "";
    const trailingWhitespace = line.match(/\s*$/)?.[0] || "";

    // 1. Scene Headings
    // Forced scene heading: starts with . (not ..)
    if (trimmed.startsWith(".") && !trimmed.startsWith("..")) {
      const content = trimmed.slice(1);
      result.push(leadingWhitespace + "." + content.toUpperCase() + trailingWhitespace);
      continue;
    }

    // Standard scene heading: starts with INT, EXT, etc., preceded by empty line
    if (isPrecededByEmpty && HEADING_PREFIX.test(trimmed)) {
      result.push(leadingWhitespace + trimmed.toUpperCase() + trailingWhitespace);
      continue;
    }

    // Forced Action override: starts with ! (not !!) - preserve as-is
    if (trimmed.startsWith("!") && !trimmed.startsWith("!!")) {
      result.push(line);
      continue;
    }

    // 2. Shots
    // Starts with !!
    if (trimmed.startsWith("!!")) {
      const content = trimmed.slice(2);
      result.push(leadingWhitespace + "!!" + content.toUpperCase() + trailingWhitespace);
      continue;
    }

    // 3. Transitions
    // Centered text: > text < - preserve as-is
    if (trimmed.startsWith(">") && trimmed.endsWith("<")) {
      result.push(line);
      continue;
    }

    // Forced transition: starts with >
    if (trimmed.startsWith(">")) {
      const content = trimmed.slice(1);
      result.push(leadingWhitespace + ">" + content.toUpperCase() + trailingWhitespace);
      continue;
    }

    // Standard transition ending in TO: or recognized transition phrase, preceded by empty line
    if (isPrecededByEmpty && (/TO:$/i.test(trimmed) || COMMON_TRANSITIONS.test(trimmed))) {
      result.push(leadingWhitespace + trimmed.toUpperCase() + trailingWhitespace);
      continue;
    }

    // 4. Character Names
    // Forced character: starts with @
    if (trimmed.startsWith("@")) {
      const content = trimmed.slice(1);
      result.push(leadingWhitespace + "@" + content.toUpperCase() + trailingWhitespace);
      continue;
    }

    // Dual dialogue character: ends with ^
    if (isPrecededByEmpty && trimmed.endsWith("^")) {
      result.push(leadingWhitespace + trimmed.toUpperCase() + trailingWhitespace);
      continue;
    }

    // Character with extension e.g. "JOHN (V.O.)" or "sarah (off screen)" or "bob (cont'd)"
    const charWithExtMatch = trimmed.match(/^([^()]+)\s*(\(.*?\))\s*(\^)?$/);
    if (isPrecededByEmpty && charWithExtMatch) {
      const namePart = charWithExtMatch[1].trim();
      const isShortName = namePart.split(/\s+/).length <= 4 && !/[.,!?;:]$/.test(namePart);
      if (isShortName || knownCharacters.has(namePart.toUpperCase())) {
        result.push(leadingWhitespace + trimmed.toUpperCase() + trailingWhitespace);
        continue;
      }
    }

    // Followed by parenthetical line (e.g. "john\n(whispering)")
    if (isPrecededByEmpty && nextTrimmed.startsWith("(") && nextTrimmed.endsWith(")")) {
      const isNameCandidate =
        trimmed.split(/\s+/).length <= 5 &&
        !/[.,!?;:]$/.test(trimmed) &&
        trimmed.length <= 50;
      if (isNameCandidate) {
        result.push(leadingWhitespace + trimmed.toUpperCase() + trailingWhitespace);
        continue;
      }
    }

    // Preceded by empty line, followed by dialogue, matches known character
    if (isPrecededByEmpty && nextTrimmed !== "") {
      const cleanName = trimmed.replace(/\s*\(.*?\)/g, "").replace(/\^$/, "").trim().toUpperCase();
      if (knownCharacters.has(cleanName)) {
        result.push(leadingWhitespace + trimmed.toUpperCase() + trailingWhitespace);
        continue;
      }
    }

    // Preceded by empty line, followed by dialogue, looks like a character name
    // (1-3 words, no sentence punctuation, followed by non-empty dialogue)
    if (
      isPrecededByEmpty &&
      nextTrimmed !== "" &&
      !nextTrimmed.startsWith("#") &&
      !nextTrimmed.startsWith("=") &&
      !nextTrimmed.startsWith("!") &&
      !nextTrimmed.startsWith("~") &&
      !nextTrimmed.startsWith("!!") &&
      !nextTrimmed.startsWith(">") &&
      !nextTrimmed.startsWith(".") &&
      !HEADING_PREFIX.test(nextTrimmed)
    ) {
      const words = trimmed.split(/\s+/);
      const isAlreadyAllCaps = trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed);
      const isTitleCaseOrClean =
        words.length <= 3 &&
        trimmed.length <= 35 &&
        !/[.,!?;:]$/.test(trimmed) &&
        /^[A-Za-z0-9][A-Za-z0-9 '-]*$/.test(trimmed);

      if (isAlreadyAllCaps || isTitleCaseOrClean) {
        result.push(leadingWhitespace + trimmed.toUpperCase() + trailingWhitespace);
        continue;
      }
    }

    // Default: keep line unchanged
    result.push(line);
  }

  return result;
}
