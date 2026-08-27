import { themes, deriveAllColors, type ThemeConfig, type ThemeColors } from "./muiTheme";

export interface CustomTheme {
  id: string;
  name: string;
  isDark: boolean;
  colors: ThemeColors;
}

export interface ThemePreset {
  id: string;
  name: string;
  isDark: boolean;
  colors: {
    sidebar: string;
    editor: string;
    accent: string;
    text?: string;
    button?: string;
  };
}

const DEFAULT_LIGHT = { editor: "#EEEEEE", text: "#101010", accent: "#555555", sidebar: "#EEEEEE", button: "#555555" };
const DEFAULT_DARK = { editor: "#101010", text: "#CCCCCC", accent: "#555555", sidebar: "#101010", button: "#555555" };

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "nord",
    name: "Nord",
    isDark: true,
    colors: {
      sidebar: "#2e3440",
      editor: "#3b4252",
      accent: "#88c0d0",
      text: "#eceff4",
      button: "#88c0d0",
    },
  },
  {
    id: "dracula",
    name: "Dracula",
    isDark: true,
    colors: {
      sidebar: "#21222c",
      editor: "#282a36",
      accent: "#bd93f9",
      text: "#f8f8f2",
      button: "#bd93f9",
    },
  },
  {
    id: "solarized-light",
    name: "Solarized Light",
    isDark: false,
    colors: {
      sidebar: "#eee8d5",
      editor: "#fdf6e3",
      accent: "#268bd2",
      text: "#657b83",
      button: "#268bd2",
    },
  },
  {
    id: "monokai",
    name: "Monokai",
    isDark: true,
    colors: {
      sidebar: "#1e1f1c",
      editor: "#272822",
      accent: "#a6e22e",
      text: "#f8f8f2",
      button: "#a6e22e",
    },
  },
];

export function completeCustomColors(colors: Partial<ThemeColors>, isDark: boolean): ThemeColors {
  const def = isDark ? DEFAULT_DARK : DEFAULT_LIGHT;
  const core = {
    editor: colors.editor ?? (colors as Record<string, string | undefined>).bg ?? def.editor,
    text: colors.text ?? def.text,
    accent: colors.accent ?? def.accent,
    sidebar: colors.sidebar ?? def.sidebar,
    button: colors.button ?? colors.accent ?? def.accent,
  };
  return deriveAllColors(core, isDark);
}

export function validateTheme(data: unknown): data is Omit<CustomTheme, "id"> & { id?: string } {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  if (typeof obj.name !== "string" || obj.name.trim().length === 0) return false;
  if (typeof obj.isDark !== "boolean") return false;

  const colors = obj.colors;
  if (!colors || typeof colors !== "object") return false;

  const requiredColors = ["editor", "text", "accent", "sidebar", "button"];
  const hexColorRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

  const colorObj = colors as Record<string, unknown>;
  for (const key of requiredColors) {
    if (typeof colorObj[key] !== "string" || !hexColorRegex.test(colorObj[key] as string)) {
      return false;
    }
  }
  return true;
}

export function exportTheme(theme: CustomTheme | ThemeConfig): string {
  const payload = {
    name: theme.name,
    isDark: theme.isDark,
    colors: {
      editor: theme.colors.editor,
      text: theme.colors.text,
      accent: theme.colors.accent,
      sidebar: theme.colors.sidebar,
      button: theme.colors.button,
    },
  };
  return JSON.stringify(payload, null, 2);
}

export function importTheme(jsonString: string): CustomTheme {
  const parsed = JSON.parse(jsonString);
  if (!validateTheme(parsed)) {
    throw new Error("Invalid theme format");
  }

  const id = parsed.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Math.random().toString(36).substring(2, 8);
  const fullColors = completeCustomColors(parsed.colors, parsed.isDark);

  return {
    id,
    name: parsed.name.trim(),
    isDark: parsed.isDark,
    colors: fullColors,
  };
}

export function applyThemePreset(presetIdOrName: string): CustomTheme {
  const preset = THEME_PRESETS.find(
    (p) => p.id === presetIdOrName.toLowerCase() || p.name.toLowerCase() === presetIdOrName.toLowerCase()
  );
  if (!preset) {
    throw new Error(`Theme preset "${presetIdOrName}" not found`);
  }

  const core = {
    editor: preset.colors.editor,
    text: preset.colors.text || (preset.isDark ? "#f8f8f2" : "#101010"),
    accent: preset.colors.accent,
    sidebar: preset.colors.sidebar,
    button: preset.colors.button || preset.colors.accent,
  };

  const id = `preset-${preset.id}-${Math.random().toString(36).substring(2, 8)}`;
  return {
    id,
    name: preset.name,
    isDark: preset.isDark,
    colors: deriveAllColors(core, preset.isDark),
  };
}

export function parseHexToRgb(hex: string): [number, number, number] {
  let c = hex.replace("#", "").trim();
  if (c.length === 3) {
    c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  }
  const num = parseInt(c, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function getRelativeLuminance(hex: string): number {
  const [r, g, b] = parseHexToRgb(hex).map((val) => {
    const s = val / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function getContrastRatio(fgHex: string, bgHex: string): number {
  const l1 = getRelativeLuminance(fgHex);
  const l2 = getRelativeLuminance(bgHex);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function isAccessibleContrast(
  fgHex: string,
  bgHex: string,
  level: "AA" | "AAA" = "AA",
  isLargeText = false
): boolean {
  const ratio = getContrastRatio(fgHex, bgHex);
  if (level === "AAA") {
    return isLargeText ? ratio >= 4.5 : ratio >= 7;
  }
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

export function injectThemeCssVariables(
  theme: ThemeConfig | CustomTheme,
  targetElement?: HTMLElement
): Record<string, string> {
  const c = theme.colors;
  const vars: Record<string, string> = {
    "--bg-app": c.editor,
    "--bg-sidebar": c.sidebar,
    "--bg-editor-wrapper": c.editor,
    "--bg-dropdown": c.dropdown,
    "--border-color": c.border,
    "--button-color": c.button,
    "--text-main": c.text,
    "--text-muted": c.textSecondary,
    "--text-secondary": c.textSecondary,
    "--accent-color": c.accent,
    "--selection-bg": c.selectionBg,
    "--selection-text": c.selectionText,
    "--dropdown-text": c.dropdownText,
  };

  const target = targetElement || (typeof document !== "undefined" ? document.documentElement : undefined);
  if (target) {
    Object.entries(vars).forEach(([key, val]) => {
      target.style.setProperty(key, val);
    });
  }

  return vars;
}

export function resolveThemeConfig(
  themeId: string,
  customThemes: CustomTheme[],
  systemDark: boolean,
): ThemeConfig {
  if (themeId === "adaptive") {
    const id = systemDark ? "dark" : "light";
    const theme = themes.find(x => x.id === id);
    if (theme) return theme;
  }
  if (themeId === "catppuccin-adaptive") {
    const id = systemDark ? "catppuccin-mocha" : "catppuccin-latte";
    const theme = themes.find(x => x.id === id);
    if (theme) return theme;
  }
  if (themeId === "pitch-adaptive") {
    const id = systemDark ? "pitch-black" : "pitch-white";
    const theme = themes.find(x => x.id === id);
    if (theme) return theme;
  }
  const builtin = themes.find(x => x.id === themeId);
  if (builtin) return builtin;
  const custom = customThemes.find(x => x.id === themeId);
  if (custom) {
    return {
      id: custom.id,
      name: custom.name,
      desc: "",
      category: "custom" as const,
      isDark: custom.isDark,
      colors: completeCustomColors(custom.colors, custom.isDark),
    };
  }
  return themes[0];
}
