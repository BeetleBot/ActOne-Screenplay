import { describe, it, expect } from "vitest";
import { getSceneColor, getSceneTitle, buildTree, flattenSelectable } from "./OutlineView";
import { LineType, ParsedLine } from "../parser/FountainParser";

describe("OutlineView Helpers", () => {
  describe("getSceneColor", () => {
    it("returns custom line color if present and no marker", () => {
      const line: ParsedLine = {
        id: "2",
        text: "EXT. ROAD - NIGHT",
        type: LineType.heading,
        isOutlineElement: true,
        color: "#00ff00",
      };
      expect(getSceneColor(line)).toBe("#00ff00");
    });

    it("returns undefined if no color or marker", () => {
      const line: ParsedLine = {
        id: "3",
        text: "INT. ROOM - DAY",
        type: LineType.heading,
        isOutlineElement: true,
      };
      expect(getSceneColor(line)).toBeUndefined();
    });
  });

  describe("getSceneTitle", () => {
    it("cleans formatting tags for normal titles", () => {
      const line: ParsedLine = {
        id: "2",
        text: ".EXT. HOUSE [[Ignore this note]] - DAY #scene-one#",
        type: LineType.heading,
        isOutlineElement: true,
      };
      expect(getSceneTitle(line)).toBe("EXT. HOUSE  - DAY");
    });
  });

  describe("buildTree & flattenSelectable", () => {
    it("properly nests scenes and sections into a tree hierarchy", () => {
      const sectionLine: ParsedLine = {
        id: "sec-1",
        text: "# SECTION 1",
        type: LineType.section,
        sectionDepth: 1,
        isOutlineElement: true,
      };
      const sceneLine: ParsedLine = {
        id: "sce-1",
        text: "EXT. OFFICE - DAY",
        type: LineType.heading,
        isOutlineElement: true,
      };
      const synopsisLine: ParsedLine = {
        id: "syn-1",
        text: "= This is a synopsis",
        type: LineType.synopse,
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
  });
});
