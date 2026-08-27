import { describe, it, expect } from "vitest";
import {
  resolveThemeConfig,
  completeCustomColors,
  validateTheme,
  exportTheme,
  importTheme,
  applyThemePreset,
  getRelativeLuminance,
  getContrastRatio,
  isAccessibleContrast,
  injectThemeCssVariables,
  THEME_PRESETS,
  type CustomTheme,
} from "./themeUtils";
import { themes } from "./muiTheme";

describe("themeUtils", () => {
  const mockCustomTheme: CustomTheme = {
    id: "my-custom-theme",
    name: "My Custom Theme",
    isDark: true,
    colors: {
      editor: "#1e1e1e",
      text: "#ffffff",
      accent: "#388e3c",
      sidebar: "#252526",
      button: "#388e3c",
      selectionText: "#ffffff",
      selectionBg: "rgba(56,142,60,0.25)",
      dropdown: "#252526",
      dropdownText: "#ffffff",
      border: "rgba(255,255,255,0.1)",
      textSecondary: "rgba(255,255,255,0.54)",
    },
  };

  describe("resolveThemeConfig", () => {
    it("resolves adaptive theme according to system dark mode", () => {
      const darkConfig = resolveThemeConfig("adaptive", [], true);
      expect(darkConfig.id).toBe("dark");
      expect(darkConfig.isDark).toBe(true);

      const lightConfig = resolveThemeConfig("adaptive", [], false);
      expect(lightConfig.id).toBe("light");
      expect(lightConfig.isDark).toBe(false);
    });

    it("resolves catppuccin-adaptive theme", () => {
      const darkConfig = resolveThemeConfig("catppuccin-adaptive", [], true);
      expect(darkConfig.id).toBe("catppuccin-mocha");
      expect(darkConfig.isDark).toBe(true);

      const lightConfig = resolveThemeConfig("catppuccin-adaptive", [], false);
      expect(lightConfig.id).toBe("catppuccin-latte");
      expect(lightConfig.isDark).toBe(false);
    });

    it("resolves pitch-adaptive theme", () => {
      const darkConfig = resolveThemeConfig("pitch-adaptive", [], true);
      expect(darkConfig.id).toBe("pitch-black");
      expect(darkConfig.isDark).toBe(true);

      const lightConfig = resolveThemeConfig("pitch-adaptive", [], false);
      expect(lightConfig.id).toBe("pitch-white");
      expect(lightConfig.isDark).toBe(false);
    });

    it("resolves standard built-in themes", () => {
      const sunset = resolveThemeConfig("sunset", [], false);
      expect(sunset.id).toBe("sunset");
      expect(sunset.name).toBe("Sunset");
    });

    it("resolves custom themes", () => {
      const resolved = resolveThemeConfig("my-custom-theme", [mockCustomTheme], false);
      expect(resolved.id).toBe("my-custom-theme");
      expect(resolved.name).toBe("My Custom Theme");
      expect(resolved.category).toBe("custom");
      expect(resolved.isDark).toBe(true);
    });

    it("falls back to default theme when unknown themeId is provided", () => {
      const resolved = resolveThemeConfig("unknown-theme-xyz", [], false);
      expect(resolved.id).toBe(themes[0].id);
    });
  });

  describe("completeCustomColors", () => {
    it("fills missing colors with defaults for light theme", () => {
      const partial = { editor: "#ffffff", text: "#000000" };
      const colors = completeCustomColors(partial, false);
      expect(colors.editor).toBe("#ffffff");
      expect(colors.text).toBe("#000000");
      expect(colors.accent).toBe("#555555");
      expect(colors.sidebar).toBe("#EEEEEE");
      expect(colors.border).toBeDefined();
    });

    it("fills missing colors with defaults for dark theme", () => {
      const partial = { accent: "#ff0055" };
      const colors = completeCustomColors(partial, true);
      expect(colors.editor).toBe("#101010");
      expect(colors.text).toBe("#CCCCCC");
      expect(colors.accent).toBe("#ff0055");
      expect(colors.button).toBe("#ff0055");
    });
  });

  describe("validateTheme", () => {
    it("validates a correctly structured theme object", () => {
      const valid = {
        name: "Test Theme",
        isDark: false,
        colors: {
          editor: "#ffffff",
          text: "#000000",
          accent: "#0066cc",
          sidebar: "#f0f0f0",
          button: "#0066cc",
        },
      };
      expect(validateTheme(valid)).toBe(true);
    });

    it("rejects null or non-object values", () => {
      expect(validateTheme(null)).toBe(false);
      expect(validateTheme(undefined)).toBe(false);
      expect(validateTheme("string")).toBe(false);
      expect(validateTheme(123)).toBe(false);
    });

    it("rejects themes with empty or invalid names", () => {
      expect(validateTheme({ name: "", isDark: false, colors: {} })).toBe(false);
      expect(validateTheme({ name: "   ", isDark: false, colors: {} })).toBe(false);
      expect(validateTheme({ isDark: false, colors: {} })).toBe(false);
    });

    it("rejects themes with missing or non-boolean isDark", () => {
      expect(validateTheme({ name: "Test", isDark: "true", colors: {} })).toBe(false);
      expect(validateTheme({ name: "Test", colors: {} })).toBe(false);
    });

    it("rejects themes with missing required colors or invalid hex codes", () => {
      const invalidHex = {
        name: "Test Theme",
        isDark: false,
        colors: {
          editor: "red", // not hex
          text: "#000000",
          accent: "#0066cc",
          sidebar: "#f0f0f0",
          button: "#0066cc",
        },
      };
      expect(validateTheme(invalidHex)).toBe(false);

      const missingColor = {
        name: "Test Theme",
        isDark: false,
        colors: {
          editor: "#ffffff",
          text: "#000000",
          accent: "#0066cc",
          // sidebar missing
          button: "#0066cc",
        },
      };
      expect(validateTheme(missingColor)).toBe(false);
    });
  });

  describe("exportTheme & importTheme", () => {
    it("exports a theme to JSON string", () => {
      const json = exportTheme(mockCustomTheme);
      const parsed = JSON.parse(json);
      expect(parsed.name).toBe("My Custom Theme");
      expect(parsed.isDark).toBe(true);
      expect(parsed.colors.editor).toBe("#1e1e1e");
      expect(parsed.colors.accent).toBe("#388e3c");
    });

    it("imports a valid theme from JSON string", () => {
      const exported = exportTheme(mockCustomTheme);
      const imported = importTheme(exported);

      expect(imported.name).toBe("My Custom Theme");
      expect(imported.isDark).toBe(true);
      expect(imported.colors.editor).toBe("#1e1e1e");
      expect(imported.colors.accent).toBe("#388e3c");
      expect(imported.id).toMatch(/^my-custom-theme-/);
    });

    it("throws an error when importing invalid JSON or schema", () => {
      expect(() => importTheme("invalid json")).toThrow();
      expect(() => importTheme(JSON.stringify({ name: "", isDark: false }))).toThrow("Invalid theme format");
    });
  });

  describe("applyThemePreset", () => {
    it("applies built-in presets by ID or name", () => {
      const dracula = applyThemePreset("dracula");
      expect(dracula.name).toBe("Dracula");
      expect(dracula.isDark).toBe(true);
      expect(dracula.colors.accent).toBe("#bd93f9");

      const nord = applyThemePreset("Nord");
      expect(nord.name).toBe("Nord");
      expect(nord.colors.sidebar).toBe("#2e3440");

      const solarized = applyThemePreset("solarized-light");
      expect(solarized.isDark).toBe(false);
      expect(solarized.colors.editor).toBe("#fdf6e3");
    });

    it("throws an error for non-existent presets", () => {
      expect(() => applyThemePreset("non-existent-preset")).toThrow('Theme preset "non-existent-preset" not found');
    });

    it("contains defined presets in THEME_PRESETS list", () => {
      expect(THEME_PRESETS.length).toBeGreaterThanOrEqual(4);
      expect(THEME_PRESETS.some((p) => p.id === "nord")).toBe(true);
      expect(THEME_PRESETS.some((p) => p.id === "dracula")).toBe(true);
      expect(THEME_PRESETS.some((p) => p.id === "monokai")).toBe(true);
    });
  });

  describe("Color Contrast Calculations", () => {
    it("calculates relative luminance for black and white", () => {
      expect(getRelativeLuminance("#000000")).toBe(0);
      expect(getRelativeLuminance("#ffffff")).toBeCloseTo(1, 4);
    });

    it("calculates correct contrast ratio between black and white (21:1)", () => {
      const contrast = getContrastRatio("#000000", "#ffffff");
      expect(contrast).toBeCloseTo(21, 1);
    });

    it("calculates 1:1 contrast for identical colors", () => {
      const contrast = getContrastRatio("#388e3c", "#388e3c");
      expect(contrast).toBeCloseTo(1, 2);
    });

    it("handles 3-character hex values in contrast calculation", () => {
      const contrast = getContrastRatio("#000", "#fff");
      expect(contrast).toBeCloseTo(21, 1);
    });

    it("verifies accessible contrast thresholds (WCAG AA & AAA)", () => {
      // Black on White
      expect(isAccessibleContrast("#000000", "#ffffff", "AA")).toBe(true);
      expect(isAccessibleContrast("#000000", "#ffffff", "AAA")).toBe(true);

      // Low contrast: light gray on white
      expect(isAccessibleContrast("#e0e0e0", "#ffffff", "AA")).toBe(false);

      // Large text threshold (AA >= 3, AAA >= 4.5)
      const mediumGray = "#767676"; // ~4.54:1 on white
      expect(isAccessibleContrast(mediumGray, "#ffffff", "AA", false)).toBe(true);
      expect(isAccessibleContrast(mediumGray, "#ffffff", "AAA", true)).toBe(true);
    });
  });

  describe("injectThemeCssVariables", () => {
    it("returns CSS variables map from theme configuration", () => {
      const vars = injectThemeCssVariables(mockCustomTheme);
      expect(vars["--bg-app"]).toBe("#1e1e1e");
      expect(vars["--bg-sidebar"]).toBe("#252526");
      expect(vars["--accent-color"]).toBe("#388e3c");
      expect(vars["--text-main"]).toBe("#ffffff");
      expect(vars["--border-color"]).toBe("rgba(255,255,255,0.1)");
    });

    it("sets CSS variables on provided DOM element", () => {
      const dummyElement = document.createElement("div");
      injectThemeCssVariables(mockCustomTheme, dummyElement);
      expect(dummyElement.style.getPropertyValue("--bg-app")).toBe("#1e1e1e");
      expect(dummyElement.style.getPropertyValue("--accent-color")).toBe("#388e3c");
    });
  });
});
