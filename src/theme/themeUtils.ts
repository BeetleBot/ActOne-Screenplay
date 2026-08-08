import { themes, deriveAllColors, type ThemeConfig, type ThemeColors } from "./muiTheme";

export interface CustomTheme {
  id: string;
  name: string;
  isDark: boolean;
  colors: ThemeColors;
}

const DEFAULT_LIGHT = { editor: "#EEEEEE", text: "#101010", accent: "#555555", sidebar: "#EEEEEE", button: "#555555" };
const DEFAULT_DARK = { editor: "#101010", text: "#CCCCCC", accent: "#555555", sidebar: "#101010", button: "#555555" };

function completeCustomColors(colors: Partial<ThemeColors>, isDark: boolean): ThemeColors {
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
