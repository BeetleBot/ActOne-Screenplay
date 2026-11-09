import { describe, it, expect } from "vitest";
import { splitRowCells, getTableColumnWidths, formatTableMarkdown, tables } from "./table-widget";

describe("table-widget markdown utilities", () => {
  it("splits row cells correctly without boundary pipes", () => {
    const row = "| Title | Author | Date |";
    const cells = splitRowCells(row);
    expect(cells).toEqual(["Title", "Author", "Date"]);
  });

  it("handles escaped pipes within cells", () => {
    const row = "| A \\| B | Second |";
    const cells = splitRowCells(row);
    expect(cells).toEqual(["A \\| B", "Second"]);
  });

  it("calculates table column widths across all non-delimiter rows", () => {
    const table = ["| ColA | LongerColumnHeader |", "| --- | --- |", "| Short | Medium |"];
    const widths = getTableColumnWidths(table);
    expect(widths[0]).toBe(Math.max(3, "Short".length, "ColA".length));
    expect(widths[1]).toBe("LongerColumnHeader".length);
  });

  it("formats table markdown with aligned columns and proper delimiters", () => {
    const input = ["| Name | Age |", "| --- | --- |", "| Alice | 30 |", "| Christopher | 25 |"].join("\n");

    const formatted = formatTableMarkdown(input);
    const lines = formatted.split("\n");

    expect(lines).toHaveLength(4);
    // Delimiter row should align with column width
    expect(lines[1]).toContain("---");
    // All rows should start and end with pipe
    lines.forEach((l) => {
      expect(l.startsWith("|")).toBe(true);
      expect(l.endsWith("|")).toBe(true);
    });
  });

  it("tables() returns valid CodeMirror extensions", () => {
    const extension = tables();
    expect(extension).toBeDefined();
    expect(Array.isArray(extension)).toBe(true);
  });

  it("aligns every cell exactly and keeps left, center and right delimiters", () => {
    const input = "| A | BB | C |\n| :--- | :---: | ---: |\n| Long name | X | Final |";
    const expected = ["| A         | BB  | C     |", "| :-------- | :-: | ----: |", "| Long name | X   | Final |"].join(
      "\n",
    );
    expect(formatTableMarkdown(input)).toBe(expected);
    expect(formatTableMarkdown(expected)).toBe(expected);
  });

  it("pads missing cells without splitting escaped pipes", () => {
    const formatted = formatTableMarkdown("| A | B |\n| --- | --- |\n| one\\|two |");
    expect(formatted).toBe("| A        | B   |\n| -------- | --- |\n| one\\|two |     |");
    expect(splitRowCells(formatted.split("\n")[2])).toEqual(["one\\|two", ""]);
  });

  it("leaves incomplete input untouched until there is a table to format", () => {
    expect(formatTableMarkdown("| unfinished")).toBe("| unfinished");
    expect(formatTableMarkdown("Plain paragraph\nNo table")).toBe("Plain paragraph\nNo table");
    expect(getTableColumnWidths([])).toEqual([]);
  });
});
