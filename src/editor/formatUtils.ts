import type { EditorView } from "@codemirror/view";

export function toggleInlineMarker(
  view: EditorView | null,
  marker: string,
  overrideSelection?: { from: number; to: number; text: string }
) {
  if (!view) return;

  const from = overrideSelection ? overrideSelection.from : view.state.selection.main.from;
  const to = overrideSelection ? overrideSelection.to : view.state.selection.main.to;

  if (from === to && !overrideSelection) return;

  const selectedText = overrideSelection ? overrideSelection.text : view.state.sliceDoc(from, to);
  if (!selectedText) return;

  const lines = selectedText.split(/\r?\n/);

  const getPrefix = (line: string) => {
    let prefix = "";
    let suffix = "";
    let clean = line;

    const indentMatch = clean.match(/^\s+/);
    if (indentMatch) {
      prefix = indentMatch[0];
      clean = clean.slice(prefix.length);
    }

    if (clean.startsWith("!!")) {
      prefix += "!!";
      clean = clean.slice(2);
    } else if (clean.startsWith("@")) {
      prefix += "@";
      clean = clean.slice(1);
    } else if (clean.startsWith("=")) {
      prefix += "=";
      clean = clean.slice(1);
    } else if (clean.startsWith(".")) {
      prefix += ".";
      clean = clean.slice(1);
    } else if (clean.startsWith("-")) {
      if (clean.startsWith("- ")) {
        prefix += "- ";
        clean = clean.slice(2);
      } else {
        prefix += "-";
        clean = clean.slice(1);
      }
    } else if (clean.startsWith(">")) {
      if (clean.trim().endsWith("<") && clean.trim().length > 1) {
        prefix += ">";
        const suffixMatch = clean.match(/<\s*$/);
        suffix = suffixMatch ? suffixMatch[0] : "<";
        clean = clean.slice(1).replace(/<\s*$/, "");
      } else {
        prefix += ">";
        clean = clean.slice(1);
      }
    } else if (clean.startsWith("~")) {
      prefix += "~";
      clean = clean.slice(1);
    } else if (clean.startsWith("/*")) {
      prefix += "/*";
      clean = clean.slice(2);
      if (clean.endsWith("*/")) {
        suffix = "*/";
        clean = clean.slice(0, -2);
      }
    } else if (clean.startsWith("[[")) {
      prefix += "[[";
      clean = clean.slice(2);
      if (clean.endsWith("]]")) {
        suffix = "]]";
        clean = clean.slice(0, -2);
      }
    } else if (clean.startsWith("#")) {
      const match = clean.match(/^#+/);
      if (match) {
        prefix += match[0];
        clean = clean.slice(match[0].length);
      }
    }

    return { prefix, suffix, clean };
  };

  let allLinesWrapped = true;
  let validLinesCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const { clean } = getPrefix(lines[i]);
    if (clean.trim().length > 0) {
      validLinesCount++;
      const isWrapped = clean.startsWith(marker) && clean.endsWith(marker) && clean.length >= marker.length * 2;
      if (!isWrapped) {
        allLinesWrapped = false;
        break;
      }
    }
  }

  if (validLinesCount === 0) {
    allLinesWrapped = false;
  }

  const newLines = lines.map(originalLine => {
    if (originalLine.trim().length === 0) return originalLine;

    const { prefix, suffix, clean } = getPrefix(originalLine);
    const isWrapped = clean.startsWith(marker) && clean.endsWith(marker) && clean.length >= marker.length * 2;
    
    if (allLinesWrapped) {
      if (isWrapped) {
         return prefix + clean.slice(marker.length, clean.length - marker.length) + suffix;
      }
      return originalLine;
    } else {
      if (!isWrapped) {
         return prefix + marker + clean + marker + suffix;
      }
      return originalLine;
    }
  });

  const delimiter = selectedText.includes("\r\n") ? "\r\n" : "\n";
  const newText = newLines.join(delimiter);

  view.dispatch({
    changes: { from, to, insert: newText },
    selection: { anchor: from, head: from + newText.length }
  });
}
