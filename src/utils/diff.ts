export function computeRevisedLines(baseText: string, currentText: string): boolean[] {
  if (!baseText) {
    return new Array(currentText.split("\n").length).fill(true);
  }
  const baseLines = baseText.split("\n");
  const currentLines = currentText.split("\n");
  const revised = new Array(currentLines.length).fill(false);

  let start = 0;
  let endBase = baseLines.length - 1;
  let endCurrent = currentLines.length - 1;

  while (start <= endBase && start <= endCurrent && baseLines[start] === currentLines[start]) {
    start++;
  }

  while (endBase >= start && endCurrent >= start && baseLines[endBase] === currentLines[endCurrent]) {
    endBase--;
    endCurrent--;
  }

  const subBase = baseLines.slice(start, endBase + 1);
  const subCurrent = currentLines.slice(start, endCurrent + 1);

  if (subCurrent.length > 0) {
    if (subBase.length === 0) {
      for (let i = start; i <= endCurrent; i++) {
        revised[i] = true;
      }
    } else {
      const m = subBase.length;
      const n = subCurrent.length;
      
      const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
      for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
          if (subBase[i - 1] === subCurrent[j - 1]) {
            dp[i][j] = dp[i - 1][j - 1] + 1;
          } else {
            dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
          }
        }
      }

      let i = m;
      let j = n;
      const matchedCurrent = new Set<number>();
      while (i > 0 && j > 0) {
        if (subBase[i - 1] === subCurrent[j - 1]) {
          matchedCurrent.add(j - 1);
          i--;
          j--;
        } else if (dp[i - 1][j] >= dp[i][j - 1]) {
          i--;
        } else {
          j--;
        }
      }

      for (let k = 0; k < n; k++) {
        if (!matchedCurrent.has(k)) {
          revised[start + k] = true;
        }
      }
    }
  }

  return revised;
}

export interface LineEdit {
  type: "added" | "removed" | "unchanged";
  text: string;
  originalLineNum?: number;
  currentLineNum?: number;
}

export function computeDetailedDiff(baseText: string, currentText: string): LineEdit[] {
  const baseLines = baseText.split("\n");
  const currentLines = currentText.split("\n");

  const m = baseLines.length;
  const n = currentLines.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (baseLines[i - 1] === currentLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const edits: LineEdit[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && baseLines[i - 1] === currentLines[j - 1]) {
      edits.unshift({
        type: "unchanged",
        text: baseLines[i - 1],
        originalLineNum: i,
        currentLineNum: j
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      edits.unshift({
        type: "added",
        text: currentLines[j - 1],
        currentLineNum: j
      });
      j--;
    } else {
      edits.unshift({
        type: "removed",
        text: baseLines[i - 1],
        originalLineNum: i
      });
      i--;
    }
  }

  return edits;
}

export interface DiffSegment {
  type: "added" | "removed" | "unchanged";
  text: string;
}

export function getInlineDiff(oldLine: string, newLine: string): DiffSegment[] {
  const oldTokens = oldLine.split(/(\s+|[^\w\s])/).filter(Boolean);
  const newTokens = newLine.split(/(\s+|[^\w\s])/).filter(Boolean);

  const m = oldTokens.length;
  const n = newTokens.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldTokens[i - 1] === newTokens[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const segments: DiffSegment[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldTokens[i - 1] === newTokens[j - 1]) {
      segments.unshift({ type: "unchanged", text: oldTokens[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      segments.unshift({ type: "added", text: newTokens[j - 1] });
      j--;
    } else {
      segments.unshift({ type: "removed", text: oldTokens[i - 1] });
      i--;
    }
  }

  const merged: DiffSegment[] = [];
  for (const seg of segments) {
    if (merged.length > 0 && merged[merged.length - 1].type === seg.type) {
      merged[merged.length - 1].text += seg.text;
    } else {
      merged.push(seg);
    }
  }

  return merged;
}

export function filterDiffs(diffs: LineEdit[]): boolean[] {
  const keep = new Array(diffs.length).fill(true);
  
  let idx = 0;
  while (idx < diffs.length) {
    const edit = diffs[idx];
    if ((edit.type === "added" || edit.type === "removed") && edit.text.trim() === "") {
      const runType = edit.type;
      const runIndices: number[] = [idx];
      let next = idx + 1;
      while (next < diffs.length && diffs[next].type === runType && diffs[next].text.trim() === "") {
        runIndices.push(next);
        next++;
      }
      
      if (runIndices.length === 1) {
        keep[idx] = false;
      }
      
      idx = next;
    } else {
      idx++;
    }
  }
  
  return keep;
}


