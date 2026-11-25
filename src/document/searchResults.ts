import { createTextCalculation } from "./documentDataStore";
import type { SearchMatch } from "../context/SearchContext";

/** Search semantics intentionally match SearchContext, including UTF-16 offsets. */
export function calculateSearchMatches(
  content: string,
  q: string,
  matchCase: boolean,
  matchWholeWord: boolean,
  isRegex: boolean,
): SearchMatch[] {
  let patternString = q;
  if (!isRegex) {
    patternString = patternString.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  if (matchWholeWord) {
    patternString = `\\b${patternString}\\b`;
  }

  const flags = matchCase ? "g" : "gi";
  const regex = new RegExp(patternString, flags);

  const found: SearchMatch[] = [];
  let match: RegExpExecArray | null;

  const lines = content.split("\n");
  const lineOffsets: number[] = [0];
  for (let i = 0; i < lines.length - 1; i++) {
    lineOffsets.push(lineOffsets[i] + lines[i].length + 1);
  }

  const findLineNumber = (offset: number) => {
    let low = 0;
    let high = lineOffsets.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (lineOffsets[mid] <= offset) {
        if (mid === lineOffsets.length - 1 || lineOffsets[mid + 1] > offset) {
          return mid + 1;
        }
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return 1;
  };

  while ((match = regex.exec(content)) !== null) {
    if (match[0].length === 0) {
      regex.lastIndex++;
      continue;
    }
    const from = match.index;
    const to = from + match[0].length;
    const lineNum = findLineNumber(from);
    const lineText = lines[lineNum - 1] || "";
    found.push({
      from,
      to,
      line: lineNum,
      text: match[0],
      preview: lineText.trim(),
    });
  }

  return found;
}

export const getSearchMatches = createTextCalculation<SearchMatch[]>("search", (content, options) => {
  const [q, matchCase, matchWholeWord, isRegex] = JSON.parse(options) as [string, boolean, boolean, boolean];
  return calculateSearchMatches(content, q, matchCase, matchWholeWord, isRegex);
});
