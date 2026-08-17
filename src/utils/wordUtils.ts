export interface WordAtPosition {
  word: string;
  from: number;
  to: number;
}

export function getWordAtPosition(text: string, pos: number): WordAtPosition | null {
  if (!text || pos < 0 || pos > text.length) return null;

  const lineStart = text.lastIndexOf("\n", pos - 1) + 1;
  let lineEnd = text.indexOf("\n", pos);
  if (lineEnd === -1) lineEnd = text.length;

  const lineText = text.slice(lineStart, lineEnd);
  const offsetInLine = pos - lineStart;

  const wordRegex = /[\p{L}\p{N}'\u2019]+/gu;
  let match: RegExpExecArray | null;

  while ((match = wordRegex.exec(lineText)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (offsetInLine >= start && offsetInLine <= end) {
      const raw = match[0];
      const clean = raw.replace(/^['\u2019]+|['\u2019]+$/g, "");
      if (!clean) return null;
      const leadingTrim = raw.indexOf(clean);
      return {
        word: clean,
        from: lineStart + start + leadingTrim,
        to: lineStart + start + leadingTrim + clean.length,
      };
    }
  }

  return null;
}
