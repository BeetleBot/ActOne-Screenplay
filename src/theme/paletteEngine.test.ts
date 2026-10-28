import { getEditorVars } from "./muiTheme";
import { expect, it } from "vitest";
import { compileTheme, contrast } from "./paletteEngine";
import { completeCustomColors, exportTheme, importTheme } from "./themeUtils";

it("generates readable text across independently light, dark and coloured surfaces", () => {
  const surfaces = ["#ffffff", "#111111", "#777777", "#ffcc00", "#005580", "#fcebdd", "#826f92"];
  for (const surface of surfaces) for (const paper of surfaces) {
    const colors = compileTheme({ interface: surface, accent: surface, paper });
    expect(contrast(colors.text, colors.sidebar)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.editorText!, colors.editor)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.buttonText!, colors.accent)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.selectionText, colors.selectionBg)).toBeGreaterThanOrEqual(4.5);
  }
});
it("preserves generated supporting roles through save and sharing", () => {
  const colors = compileTheme({ interface: "#13221a", accent: "#d7b67a", paper: "#fff5e4" });
  const theme = { id: "test", name: "Golden hour", isDark: true, colors };
  expect(importTheme(exportTheme(theme)).colors).toEqual(colors);
  expect(completeCustomColors(colors, true)).toEqual(colors);
});
it("accepts deliberate text overrides and rejects CSS in seeds", () => {
  expect(compileTheme({ interface: "#fff", accent: "#abc", paper: "#222", writingText: "#ddd" }).editorText).toBe("#dddddd");
  expect(() => compileTheme({ interface: "url(bad)", accent: "#abc", paper: "#222" })).toThrow();
});

it("matches status bar chrome and keeps visible timeline lines on saturated and neutral interfaces", () => {
  for (const surface of ["#ffffff", "#111111", "#004bdb", "#777777"]) {
    const colors = compileTheme({ interface: surface, accent: "#aabbcc", paper: "#fff8e8" });
    const vars = getEditorVars({ id: "test", name: "Test", desc: "", category: "custom", isDark: true, colors });
    expect(vars["--bg-timeline"]).toBe(colors.sidebar);
    expect(contrast(vars["--timeline-line"], vars["--bg-timeline"])).toBeGreaterThanOrEqual(3);
    expect(contrast(vars["--timeline-ink"], vars["--bg-timeline"])).toBeGreaterThanOrEqual(4.5);
  }
});

it("provides contrasting ink for solid scene pills", () => {
  const colors = compileTheme({ interface: "#004bdb", accent: "#ffcc00", paper: "#fff8e8" });
  const vars = getEditorVars({ id: "test", name: "Test", desc: "", category: "custom", isDark: true, colors });
  for (const name of ["blue", "brown", "cyan", "green", "magenta", "orange", "pink", "purple", "red", "yellow"]) {
    expect(contrast(vars[`--scene-ink-${name}`], vars[`--scene-color-${name}`])).toBeGreaterThanOrEqual(4.5);
  }
});

it("keeps footer accents and saved indicators readable even when accent matches the surface", () => {
  for (const surface of ["#0055ff", "#111111", "#ffffff", "#777777"]) {
    const colors = compileTheme({ interface: surface, accent: surface, paper: "#fff8e8" });
    const vars = getEditorVars({ id: "test", name: "Test", desc: "", category: "custom", isDark: false, colors });
    for (const role of ["--status-ink", "--status-accent", "--status-success", "--status-error"]) {
      expect(contrast(vars[role], surface)).toBeGreaterThanOrEqual(4.5);
    }
  }
});
