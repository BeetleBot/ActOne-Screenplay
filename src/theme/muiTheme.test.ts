import { deriveAllColors, mixHex, deriveThemeBg, themes, createActOneTheme, getThemeHighlightColors } from "./muiTheme";

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

  it("defaults fountainColorsEnabled to false (syntax colors off by default)", () => {
    const theme = createActOneTheme(themes[0]);
    const overrides = theme.components?.MuiCssBaseline?.styleOverrides as string;
    expect(overrides).toContain(`--text-editor-heading: ${themes[0].colors.text}`);
  });

  it("enables syntax colors when fountainColorsEnabled is true", () => {
    const theme = createActOneTheme(themes[0], 100, true);
    const overrides = theme.components?.MuiCssBaseline?.styleOverrides as string;
    expect(overrides).toContain(`--text-editor-heading: ${themes[0].colors.accent}`);
  });

  it("includes editor highlight CSS variables with solid yellow and contrast text", () => {
    const lightTheme = createActOneTheme(themes[0]);
    const lightOverrides = lightTheme.components?.MuiCssBaseline?.styleOverrides as string;
    expect(lightOverrides).toContain("--editor-highlight-bg:");
    expect(lightOverrides).toContain("--editor-highlight-text:");
    expect(lightOverrides).toContain("--editor-highlight-bg-strong:");

    const darkTheme = createActOneTheme(themes[1]);
    const darkOverrides = darkTheme.components?.MuiCssBaseline?.styleOverrides as string;
    expect(darkOverrides).toContain("--editor-highlight-bg:");
    expect(darkOverrides).toContain("--editor-highlight-text:");
  });
});

describe("getThemeHighlightColors", () => {
  it("returns solid yellow shades and dark text across all defined themes", () => {
    for (const t of themes) {
      const colors = getThemeHighlightColors(t);
      expect(colors.bg).toMatch(/^#[0-9a-f]{6}$/i);
      expect(colors.bgStrong).toMatch(/^#[0-9a-f]{6}$/i);
      expect(colors.text).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("adapts deeper amber yellow for warm/cream light themes where pale yellow is shallow", () => {
    const sunrise = themes.find((t) => t.id === "sunrise");
    if (sunrise) {
      const colors = getThemeHighlightColors(sunrise);
      expect(colors.bg).toBe("#f59e0b");
      expect(colors.text).toBe("#1a1012");
    }

    const honey = themes.find((t) => t.id === "honey");
    if (honey) {
      const colors = getThemeHighlightColors(honey);
      expect(colors.bg).toBe("#f59e0b");
    }
  });

  it("provides bright canary yellow for pitch-white and standard light themes", () => {
    const pitchWhite = themes.find((t) => t.id === "pitch-white");
    if (pitchWhite) {
      const colors = getThemeHighlightColors(pitchWhite);
      expect(colors.bg).toBe("#ffe600");
      expect(colors.text).toBe("#000000");
    }

    const light = themes.find((t) => t.id === "light");
    if (light) {
      const colors = getThemeHighlightColors(light);
      expect(colors.bg).toBe("#ffd600");
      expect(colors.text).toBe("#111827");
    }
  });

  it("provides luminous yellow with dark text for dark themes", () => {
    const pitchBlack = themes.find((t) => t.id === "pitch-black");
    if (pitchBlack) {
      const colors = getThemeHighlightColors(pitchBlack);
      expect(colors.bg).toBe("#ffd600");
      expect(colors.text).toBe("#000000");
    }

    const mocha = themes.find((t) => t.id === "catppuccin-mocha");
    if (mocha) {
      const colors = getThemeHighlightColors(mocha);
      expect(colors.bg).toBe("#f9e2af");
      expect(colors.text).toBe("#11111b");
    }
  });
});



