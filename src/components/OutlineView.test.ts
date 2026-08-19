import { describe, it, expect } from "vitest";
import { getSceneColor, getSceneTitle, buildTree, flattenSelectable, parseProseHeadings } from "./OutlineView";
import { LineType, ParsedLine } from "../parser/FountainParser";

describe("OutlineView Helpers", () => {
  describe("getSceneColor", () => {
    it("returns hex color if present", () => {
      const line: ParsedLine = {
        id: "2", text: "EXT. ROAD - NIGHT", type: LineType.heading,
        isOutlineElement: true, color: "#00ff00",
      };
      expect(getSceneColor(line)).toBe("#00ff00");
    });

    it("returns CSS variable for named colors", () => {
      const line: ParsedLine = {
        id: "2", text: "EXT. ROAD - NIGHT", type: LineType.heading,
        isOutlineElement: true, color: "red",
      };
      expect(getSceneColor(line)).toBe("var(--scene-color-red)");
    });

    it("returns undefined if no color", () => {
      const line: ParsedLine = {
        id: "3", text: "INT. ROOM - DAY", type: LineType.heading,
        isOutlineElement: true,
      };
      expect(getSceneColor(line)).toBeUndefined();
    });
  });

  describe("getSceneTitle", () => {
    it("cleans formatting tags for normal titles", () => {
      const line: ParsedLine = {
        id: "2", text: ".EXT. HOUSE [[Ignore this note]] - DAY #scene-one#",
        type: LineType.heading, isOutlineElement: true,
      };
      expect(getSceneTitle(line)).toBe("EXT. HOUSE  - DAY");
    });

    it("strips section markers", () => {
      const line: ParsedLine = {
        id: "1", text: "# ACT 1", type: LineType.section,
        isOutlineElement: true, sectionDepth: 1,
      };
      expect(getSceneTitle(line)).toBe("ACT 1");
    });
  });

  describe("buildTree & flattenSelectable", () => {
    it("properly nests scenes and sections into a tree hierarchy", () => {
      const sectionLine: ParsedLine = {
        id: "sec-1", text: "# SECTION 1", type: LineType.section,
        sectionDepth: 1, isOutlineElement: true,
      };
      const sceneLine: ParsedLine = {
        id: "sce-1", text: "EXT. OFFICE - DAY", type: LineType.heading,
        isOutlineElement: true,
      };
      const synopsisLine: ParsedLine = {
        id: "syn-1", text: "= This is a synopsis", type: LineType.synopse,
        isOutlineElement: true,
      };
      const items = [
        { line: sectionLine, index: 0 },
        { line: sceneLine, index: 1 },
        { line: synopsisLine, index: 2 },
      ];

      const tree = buildTree(items, {});
      expect(tree).toHaveLength(1);
      expect(tree[0].item.line.id).toBe("sec-1");
      expect(tree[0].children).toHaveLength(1);
      expect(tree[0].children[0].item.line.id).toBe("sce-1");
      expect(tree[0].synopses).toHaveLength(0);
      expect(tree[0].children[0].synopses).toHaveLength(1);
      expect(tree[0].children[0].synopses[0].line.id).toBe("syn-1");

      const selectable = flattenSelectable(tree);
      expect(selectable).toHaveLength(2);
      expect(selectable[0].item.line.id).toBe("sec-1");
      expect(selectable[1].item.line.id).toBe("sce-1");
    });

    it("handles multiple sections at root level", () => {
      const s1: ParsedLine = { id: "s1", text: "# ACT 1", type: LineType.section, sectionDepth: 1, isOutlineElement: true };
      const s2: ParsedLine = { id: "s2", text: "# ACT 2", type: LineType.section, sectionDepth: 1, isOutlineElement: true };
      const items = [{ line: s1, index: 0 }, { line: s2, index: 1 }];
      const tree = buildTree(items, {});
      expect(tree).toHaveLength(2);
    });

    it("handles nested sections", () => {
      const s1: ParsedLine = { id: "s1", text: "# ACT 1", type: LineType.section, sectionDepth: 1, isOutlineElement: true };
      const s2: ParsedLine = { id: "s2", text: "## SCENE 1", type: LineType.section, sectionDepth: 2, isOutlineElement: true };
      const items = [{ line: s1, index: 0 }, { line: s2, index: 1 }];
      const tree = buildTree(items, {});
      expect(tree).toHaveLength(1);
      expect(tree[0].children).toHaveLength(1);
    });

    it("handles collapsed sections", () => {
      const s1: ParsedLine = { id: "s1", text: "# ACT 1", type: LineType.section, sectionDepth: 1, isOutlineElement: true };
      const scene: ParsedLine = { id: "sc1", text: "INT. ROOM", type: LineType.heading, isOutlineElement: true };
      const items = [{ line: s1, index: 0 }, { line: scene, index: 1 }];
      const tree = buildTree(items, { s1: true });
      expect(tree).toHaveLength(2);
      expect(tree[0].item.line.id).toBe("s1");
      expect(tree[0].children).toHaveLength(0);
      expect(tree[1].item.line.id).toBe("sc1");
    });

    it("handles synopses at root level when no parent", () => {
      const syn: ParsedLine = { id: "syn", text: "= Synopsis", type: LineType.synopse, isOutlineElement: true };
      const items = [{ line: syn, index: 0 }];
      const tree = buildTree(items, {});
      expect(tree).toHaveLength(1);
      expect(tree[0].item.line.type).toBe(LineType.synopse);
    });
  });

  describe("parseProseHeadings", () => {
    it("parses H1 to H6 headings with line numbers", () => {
      const text = [
        "# Chapter 1: Introduction",
        "Some body text here.",
        "## Section 1.1: Background",
        "### Detail Point",
        "#### Sub-detail",
        "##### Minor point",
        "###### Deep footnote header",
        "# Chapter 2: Conclusion",
      ].join("\n");

      const headings = parseProseHeadings(text);
      expect(headings).toHaveLength(7);
      expect(headings[0]).toEqual({
        id: "prose-heading-0",
        level: 1,
        title: "Chapter 1: Introduction",
        lineNumber: 0,
      });
      expect(headings[1]).toEqual({
        id: "prose-heading-2",
        level: 2,
        title: "Section 1.1: Background",
        lineNumber: 2,
      });
      expect(headings[2]).toEqual({
        id: "prose-heading-3",
        level: 3,
        title: "Detail Point",
        lineNumber: 3,
      });
      expect(headings[6]).toEqual({
        id: "prose-heading-7",
        level: 1,
        title: "Chapter 2: Conclusion",
        lineNumber: 7,
      });
    });

    it("returns empty array for text with no markdown headings", () => {
      const text = "Just regular paragraphs\nand text without headings.";
      expect(parseProseHeadings(text)).toEqual([]);
    });

    it("handles empty or blank string gracefully", () => {
      expect(parseProseHeadings("")).toEqual([]);
    });
  });
});
