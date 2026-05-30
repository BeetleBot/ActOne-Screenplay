import { describe, it, expect } from "vitest";
import { computeRevisedLines, getInlineDiff, filterDiffs, LineEdit } from "./diff";

describe("computeRevisedLines", () => {
  it("should return all false if base and current are identical", () => {
    const text = "line 1\nline 2\nline 3";
    const result = computeRevisedLines(text, text);
    expect(result).toEqual([false, false, false]);
  });

  it("should return all true if base is empty", () => {
    const baseText = "";
    const currentText = "line 1\nline 2";
    const result = computeRevisedLines(baseText, currentText);
    expect(result).toEqual([true, true]);
  });

  it("should correctly identify a single modified line", () => {
    const baseText = "line 1\nline 2\nline 3";
    const currentText = "line 1\nline 2 edited\nline 3";
    const result = computeRevisedLines(baseText, currentText);
    expect(result).toEqual([false, true, false]);
  });

  it("should correctly identify a single inserted line", () => {
    const baseText = "line 1\nline 3";
    const currentText = "line 1\nline 2\nline 3";
    const result = computeRevisedLines(baseText, currentText);
    expect(result).toEqual([false, true, false]);
  });

  it("should handle deletions without marking surrounding lines as revised", () => {
    const baseText = "line 1\nline 2\nline 3";
    const currentText = "line 1\nline 3";
    const result = computeRevisedLines(baseText, currentText);
    expect(result).toEqual([false, false]);
  });

  it("should handle complex edits with prefix and suffix matching", () => {
    const baseText = "A\nB\nC\nD\nE\nF";
    const currentText = "A\nB\nC updated\nD\nX\nE\nF";
    const result = computeRevisedLines(baseText, currentText);
    expect(result).toEqual([false, false, true, false, true, false, false]);
  });
});

describe("getInlineDiff", () => {
  it("should compute inline word edits correctly", () => {
    const oldLine = "We're underwater, watching a fat catfish swim along.";
    const newLine = "We're underwater, watchin a fat catfish swim along.";
    const diff = getInlineDiff(oldLine, newLine);
    expect(diff).toEqual([
      { type: "unchanged", text: "We're underwater, " },
      { type: "removed", text: "watching" },
      { type: "added", text: "watchin" },
      { type: "unchanged", text: " a fat catfish swim along." }
    ]);
  });
});

describe("filterDiffs", () => {
  it("should filter out single empty line changes but keep double empty lines", () => {
    const diffs: LineEdit[] = [
      { type: "added", text: "Some text" },
      { type: "added", text: "" }, // single empty line, should be kept as false
      { type: "unchanged", text: "Other text" },
      { type: "removed", text: "" }, // consecutive empty lines? Let's check 2 removals
      { type: "removed", text: "" },
    ];
    const keep = filterDiffs(diffs);
    expect(keep).toEqual([true, false, true, true, true]);
  });
});

