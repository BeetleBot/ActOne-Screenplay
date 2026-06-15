import { describe, it, expect } from "vitest";
import { deriveAllColors, mixHex, deriveThemeBg, themes, createActOneTheme } from "./muiTheme";

describe("deriveAllColors", () => {
  it("returns a complete ThemeColors object", () => {
    const result = deriveAllColors(
      { editor: "#fff", text: "#000", accent: "#0061a4", sidebar: "#f5f5f5", button: "#0061a4" },
      false
    );
    expect(result.editor).toBe("#fff");
    expect(result.text).toBe("#000");
    expect(result.accent).toBe("#0061a4");
    expect(result.sidebar).toBe("#f5f5f5");
    expect(result.button).toBe("#0061a4");
    expect(result.border).toBeTruthy();
    expect(result.dropdown).toBeTruthy();
    expect(result.textSecondary).toBeTruthy();
  });

  it("generates different selectionBg for dark vs light", () => {
    const light = deriveAllColors(
      { editor: "#fff", text: "#000", accent: "#0061a4", sidebar: "#f5f5f5", button: "#0061a4" },
      false
    );
    const dark = deriveAllColors(
      { editor: "#111416", text: "#e2e2e6", accent: "#a0caff", sidebar: "#1a1c1e", button: "#a0caff" },
      true
    );
    expect(light.selectionBg).not.toBe(dark.selectionBg);
  });
});

describe("mixHex", () => {
  it("mixes two hex colors with a weight", () => {
    const result = mixHex("#ff0000", "#0000ff", 0.5);
    expect(result).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("handles 3-digit hex codes", () => {
    const result = mixHex("#f00", "#00f", 0.5);
    expect(result).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe("deriveThemeBg", () => {
  it("returns a hex string", () => {
    const result = deriveThemeBg("#0061a4", false);
    expect(result).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe("themes", () => {
  it("has light and dark themes", () => {
    expect(themes.length).toBeGreaterThanOrEqual(2);
    expect(themes[0].id).toBe("light");
    expect(themes[1].id).toBe("dark");
  });

  it("each theme has required fields", () => {
    for (const t of themes) {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.colors).toBeTruthy();
      expect(t.colors.editor).toBeTruthy();
      expect(t.colors.text).toBeTruthy();
      expect(t.colors.accent).toBeTruthy();
    }
  });
});

describe("createActOneTheme", () => {
  it("creates an MUI theme from a ThemeConfig", () => {
    const theme = createActOneTheme(themes[0]);
    expect(theme).toBeTruthy();
    expect(theme.palette).toBeTruthy();
    expect(theme.palette.mode).toBe("light");
  });

  it("creates dark theme correctly", () => {
    const theme = createActOneTheme(themes[1]);
    expect(theme.palette.mode).toBe("dark");
  });
});
