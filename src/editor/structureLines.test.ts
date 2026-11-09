import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { EditorState } from "@codemirror/state";
import { lineTypesField } from "./fountainSyntax";
import {
  getStructureLinesExtension,
  computeStructureBlocks,
  computeStructureMarkers,
  structureBlocksField,
  StructureRailMarker,
  getStructureLabel,
} from "./structureLines";
import { getStructureSubsectionColor, getThemeStructureLines, themes } from "../theme/muiTheme";

describe("structureLines", () => {
  it("uses a pointer and widens only the hovered rail without changing its length or position", () => {
    const css = readFileSync("src/index.css", "utf8");
    const base = css.match(/\.cm-structure-line \{[^}]+\}/)![0];
    const hover = css.match(/\.cm-structure-line:hover \{[^}]+\}/)![0];
    const style = document.createElement("style");
    style.textContent = base + hover.replace(":hover", ".test-hover");
    document.head.append(style);
    const rail = new StructureRailMarker("cm-structure-line", -96, 4, 3.5, 100, "Act I").draw();
    const other = new StructureRailMarker("cm-structure-line", -88, 4, 3.5, 100, "Sequence").draw();
    document.body.append(rail, other);
    try {
      expect(getComputedStyle(rail).cursor).toBe("pointer");
      rail.classList.add("test-hover");
      expect(getComputedStyle(rail).transform).toBe("scaleX(1.5)");
      expect(getComputedStyle(other).transform).not.toBe("scaleX(1.5)");
      expect(rail.style.height).toBe("100px");
      expect(rail.style.left).toBe("-96px");
      expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.cm-structure-line\s*\{\s*transition: none;/);
    } finally { rail.remove(); other.remove(); style.remove(); }
  });
  it.each(["section", "subsection", "scene"])("clicking a %s rail moves the cursor to its starting heading and focuses the editor", kind => {
    let state = EditorState.create({
      doc: "# ACT I\n\n## SEQUENCE\n\nINT. ROOM - DAY\n\nAction",
      extensions: [lineTypesField, getStructureLinesExtension(true)],
    });
    const focus = vi.fn();
    const dispatch = vi.fn((spec: import("@codemirror/state").TransactionSpec) => { state = state.update(spec).state; });
    const view = {
      get state() { return state; }, dom: document.createElement("div"), focus, dispatch,
      visibleRanges: [{ from: 0, to: state.doc.length }],
      lineBlockAt: (position: number) => ({ top: position, bottom: position + 20 }),
    } as unknown as import("@codemirror/view").EditorView;
    const marker = computeStructureMarkers(view).find(marker => marker.draw().classList.contains(`cm-structure-line-${kind}`))!;
    const element = marker.draw();
    const mouseDown = new MouseEvent("mousedown", { button: 0, cancelable: true });
    element.dispatchEvent(mouseDown);
    expect(mouseDown.defaultPrevented).toBe(true);
    element.click();
    const line = kind === "section" ? 1 : kind === "subsection" ? 3 : 5;
    expect(state.selection.main.anchor).toBe(state.doc.line(line).from);
    expect(state.selection.main.empty).toBe(true);
    expect(focus).toHaveBeenCalledOnce();
    expect(dispatch.mock.calls[0][0].effects).toBeDefined();
  });
  it("refreshes the navigation target when an existing rail moves after editing", () => {
    const view = { state: EditorState.create({ doc: "First\nSecond" }), dispatch: vi.fn(), focus: vi.fn() } as unknown as import("@codemirror/view").EditorView;
    const before = new StructureRailMarker("rail", -96, 4, 3.5, 100, "Heading", 0, view);
    const after = new StructureRailMarker("rail", -96, 4, 3.5, 100, "Heading", 6, view);
    const element = before.draw();
    expect(after.eq(before)).toBe(false);
    expect(after.update(element, before)).toBe(true);
    element.click();
    expect(view.dispatch).toHaveBeenCalledWith(expect.objectContaining({ selection: { anchor: 6 } }));
  });
  it("renders slightly thicker structure rails while retaining their margin positions", () => {
    const state = EditorState.create({
      doc: "# ACT I\n\n## SEQUENCE\n\nINT. ROOM - DAY\n\nAction",
      extensions: [lineTypesField, getStructureLinesExtension(true)],
    });
    const view = {
      state, dom: document.createElement("div"),
      visibleRanges: [{ from: 0, to: state.doc.length }],
      lineBlockAt: (position: number) => ({ top: position, bottom: position + 20 }),
    } as unknown as import("@codemirror/view").EditorView;
    const rails = computeStructureMarkers(view).map(marker => marker.draw()).sort((a, b) => Number.parseFloat(a.style.left) - Number.parseFloat(b.style.left));
    expect(rails.map(rail => rail.style.width)).toEqual(["3.5px", "3.5px", "3px"]);
    expect(rails.map(rail => rail.style.left)).toEqual(["-96px", "-88px", "-80px"]);
  });
  it("provides extension when enabled", () => {
    const ext = getStructureLinesExtension(true);
    expect(ext).toBeDefined();
    const state = EditorState.create({
      doc: "# ACT I\n\n## SEQ 1\n\nINT. ROOM - DAY\n\nAction",
      extensions: [lineTypesField, ext],
    });
    expect(state).toBeDefined();
  });

  it("provides empty extension when disabled", () => {
    const ext = getStructureLinesExtension(false);
    expect(ext).toBeDefined();
    const state = EditorState.create({
      doc: "# ACT I\n\n## SEQ 1\n\nINT. ROOM - DAY\n\nAction",
      extensions: [lineTypesField, ext],
    });
    expect(state).toBeDefined();
  });

  it("computes continuous structure blocks across sections, subsections, and scenes", () => {
    const text = [
      "# ACT ONE",         // 1: Section 1 start
      "",                  // 2
      "INT. ROOM - DAY",   // 3: Scene 1 start
      "Dialogue",          // 4
      "",                  // 5
      "## SUBSECTION A",   // 6: Subsection 1 start
      "",                  // 7
      "INT. OFFICE - DAY", // 8: Scene 2 start
      "More action",       // 9
      "",                  // 10
      "# ACT TWO",         // 11: Section 2 start (closes Section 1, Subsection 1, Scene 2)
      "",                  // 12
      "EXT. BEACH - DAY",  // 13: Scene 3 start
    ].join("\n");

    const state = EditorState.create({
      doc: text,
      extensions: [lineTypesField, getStructureLinesExtension(true)],
    });

    const types = state.field(lineTypesField);
    const blocks = computeStructureBlocks(state.doc, types);

    // Section 1: spans lines 1 to 10 (continuous across Scene 1, Subsection 1, Scene 2!)
    const sec1 = blocks.find((b) => b.kind === "section" && b.startLine === 1);
    expect(sec1).toBeDefined();
    expect(sec1?.endLine).toBe(10);

    // Scene 1: spans lines 3 to 5 (closes before Subsection A at line 6)
    const scn1 = blocks.find((b) => b.kind === "scene" && b.startLine === 3);
    expect(scn1).toBeDefined();
    expect(scn1?.endLine).toBe(5);

    // Subsection 1: spans lines 6 to 10 (continues alongside Section 1 until Act Two at line 11)
    const sub1 = blocks.find((b) => b.kind === "subsection" && b.startLine === 6);
    expect(sub1).toBeDefined();
    expect(sub1?.endLine).toBe(10);

    // Scene 2: spans lines 8 to 10
    const scn2 = blocks.find((b) => b.kind === "scene" && b.startLine === 8);
    expect(scn2).toBeDefined();
    expect(scn2?.endLine).toBe(10);

    // Section 2: spans lines 11 to 13
    const sec2 = blocks.find((b) => b.kind === "section" && b.startLine === 11);
    expect(sec2).toBeDefined();
    expect(sec2?.endLine).toBe(13);

    // Scene 3: spans line 13 to 13
    const scn3 = blocks.find((b) => b.kind === "scene" && b.startLine === 13);
    expect(scn3).toBeDefined();
    expect(scn3?.endLine).toBe(13);

    // Verify structureBlocksField state
    const fieldBlocks = state.field(structureBlocksField);
    expect(fieldBlocks.length).toBe(blocks.length);
  });

  it("filters key events: bypasses recomputation when typing non-structural text", () => {
    const text = "# ACT ONE\n\nINT. ROOM - DAY\n\nHello world";
    const state = EditorState.create({
      doc: text,
      extensions: [lineTypesField, getStructureLinesExtension(true)],
    });

    const initialBlocks = state.field(structureBlocksField);

    // Type a letter inside "Hello world" on line 5
    const pos = text.length;
    const tr = state.update({
      changes: { from: pos, insert: "!" },
    });

    const updatedBlocks = tr.state.field(structureBlocksField);
    // Reference equality check: must return the exact same array without recomputing!
    expect(updatedBlocks).toBe(initialBlocks);

    // Now insert a newline (Enter key)
    const enterTr = tr.state.update({
      changes: { from: pos + 1, insert: "\n" },
    });
    const afterEnterBlocks = enterTr.state.field(structureBlocksField);
    // Line count changed: must recompute and return new array
    expect(afterEnterBlocks).not.toBe(initialBlocks);
  });

  it.each([
    { doc: "# ACT I\n\nINT. ROOM - DAY\n\nAction", line: 2, insert: "x" },
    { doc: "# ACT I\nx\nINT. ROOM - DAY\n\nAction", line: 2, insert: "" },
    { doc: "# ACT I\n\nTXT ROOM - DAY\n\nAction", line: 3, insert: "INT" },
  ])("updates rails when classification propagates or an unpunctuated prefix changes: $doc", ({ doc, line, insert }) => {
    const state = EditorState.create({ doc, extensions: [lineTypesField, getStructureLinesExtension(true)] });
    const target = state.doc.line(line);
    const to = line === 3 ? target.from + 3 : target.to;
    const next = state.update({ changes: { from: target.from, to, insert } }).state;
    expect(next.field(structureBlocksField)).toEqual(computeStructureBlocks(next.doc, next.field(lineTypesField)));
    expect(next.field(structureBlocksField)).not.toEqual(state.field(structureBlocksField));
  });

  it("handles multiline replacements with unchanged line count and section depth edits", () => {
    let state = EditorState.create({ doc: "# ACT I\nAction\n## SEQ\nBody\n# ACT II\nEnd", extensions: [lineTypesField, getStructureLinesExtension(true)] });
    for (const changes of [
      { from: state.doc.line(2).from, to: state.doc.line(4).to, insert: "New action\n# ACT X\nNew body" },
      { from: 0, insert: "#" },
    ]) {
      state = state.update({ changes }).state;
      expect(state.field(structureBlocksField)).toEqual(computeStructureBlocks(state.doc, state.field(lineTypesField)));
    }
  });

  it("matches fresh scopes through a deterministic sequence of typing, deletion, paste and undo-like replacements", () => {
    let state = EditorState.create({ doc: "# ACT I\n\nINT. ROOM - DAY\n\nAction\n## SEQ\n\nEXT. PARK - DAY\nEnd", extensions: [lineTypesField, getStructureLinesExtension(true)] });
    let seed = 123456;
    const nextRandom = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0);
    const inserts = ["x", "", "\n", "#", "INT", ".", "\n## SEQ\n", " "];
    for (let i = 0; i < 150; i++) {
      const from = nextRandom() % (state.doc.length + 1);
      const to = Math.min(state.doc.length, from + nextRandom() % 5);
      state = state.update({ changes: { from, to, insert: inserts[nextRandom() % inserts.length] } }).state;
      expect(state.field(structureBlocksField)).toEqual(computeStructureBlocks(state.doc, state.field(lineTypesField)));
    }
  });

  it.each([
    ["section", "# ACT ONE", "ACT ONE"],
    ["subsection", "## Sequence A", "Sequence A"],
    ["scene", ".PROLOGUE #0#", "0 — PROLOGUE"],
    ["scene", "INT. ROOM - DAY #123A#", "123A — INT. ROOM - DAY"],
    ["scene", "EXT. PARK - NIGHT", "EXT. PARK - NIGHT"],
  ] as const)("labels %s rails with their heading", (kind, text, expected) => {
    expect(getStructureLabel(kind, text)).toBe(expected);
  });

  it("refreshes hover text when a heading changes without changing geometry and treats it as plain text", () => {
    const before = new StructureRailMarker("rail", -80, 4, 2, 100, "Old heading");
    const after = new StructureRailMarker("rail", -80, 4, 2, 100, '<img src=x onerror="alert(1)">');
    expect(after.eq(before)).toBe(false);
    const element = before.draw();
    expect(after.update(element, before)).toBe(true);
    expect(element.title).toBe(after.label);
    expect(element.children).toHaveLength(0);
    expect(after.eq(new StructureRailMarker("rail", -80, 4, 2, 100, after.label))).toBe(true);
  });

  describe("getThemeStructureLines & dynamic palettes", () => {
    it("returns distinct peach color for Catppuccin Latte", () => {
      const color = getStructureSubsectionColor("#8839ef", true, false, false);
      expect(color).toBe("#fe640b");
      expect(color).not.toBe("#8839ef");
    });

    it("returns distinct peach color for Catppuccin Mocha", () => {
      const color = getStructureSubsectionColor("#cba6f7", false, true, true);
      expect(color).toBe("#fab387");
      expect(color).not.toBe("#cba6f7");
    });

    it("generates complete 3-tier dynamic harmonic palettes for custom themes", () => {
      const customDark = getThemeStructureLines({
        id: "custom-noir",
        name: "Noir",
        desc: "",
        category: "custom",
        isDark: true,
        colors: { ...themes[0].colors, accent: "#8839ef" },
      });

      expect(customDark.section).toBeDefined();
      expect(customDark.subsection).toBeDefined();
      expect(customDark.scene).toBeDefined();
      expect(customDark.section).not.toBe(customDark.subsection);
      expect(customDark.subsection).not.toBe(customDark.scene);
    });

    it("handles monochrome themes cleanly with bright contrast", () => {
      const mono = getThemeStructureLines({
        id: "custom-mono",
        name: "Mono",
        desc: "",
        category: "custom",
        isDark: true,
        colors: { ...themes[0].colors, accent: "#555555" },
      });

      expect(mono.section).toMatch(/^#[0-9a-f]{6}$/i);
      expect(mono.subsection).toMatch(/^#[0-9a-f]{6}$/i);
      expect(mono.section).not.toBe(mono.subsection);
    });
  });
});
