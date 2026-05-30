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
