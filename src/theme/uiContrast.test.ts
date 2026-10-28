import { expect, it } from "vitest";
import { compileTheme, contrast, automaticInk } from "./paletteEngine";
import { createActOneTheme } from "./muiTheme";

it("keeps shared accent controls and secondary labels visible on saturated surfaces", () => {
  for (const surface of ["#0055ff", "#777777", "#ffffff", "#111111", "#ffe600"]) {
    const colors = compileTheme({ interface: surface, accent: surface, paper: "#fff8e8" });
    const theme = createActOneTheme({ id: "test", name: "Test", desc: "", category: "custom", isDark: false, colors });
    expect(contrast(theme.palette.primary.main, surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(theme.palette.primary.contrastText, theme.palette.primary.main)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(theme.palette.text.secondary, surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(automaticInk(colors.accent), colors.accent)).toBeGreaterThanOrEqual(4.5);
    expect(theme.palette.background.paper).toBe(colors.sidebar);
  }
});

it("composites imported alpha fields and resolves their labels without throwing", () => {
  const colors = { ...compileTheme({ interface: "#0055ff", accent: "#0055ff", paper: "#fff8e8" }), dropdown: "rgba(255,255,255,0.1)", dropdownText: "rgba(255,255,255,0.5)" };
  const theme = createActOneTheme({ id: "test", name: "Test", desc: "", category: "custom", isDark: false, colors });
  expect(theme.palette.primary.main).toMatch(/^#/);
  expect(theme.palette.text.secondary).toMatch(/^#/);
});
