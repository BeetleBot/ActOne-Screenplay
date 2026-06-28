import { themes, deriveAllColors, type ThemeConfig, type ThemeColors } from "./muiTheme";

export interface CustomTheme {
  id: string;
  name: string;
  isDark: boolean;
  colors: ThemeColors;
}

const DEFAULT_LIGHT = { editor: "#ffffff", text: "#1a1c1e", accent: "#0061a4", sidebar: "#f5f5f5", button: "#0061a4" };
const DEFAULT_DARK = { editor: "#111416", text: "#e2e2e6", accent: "#a0caff", sidebar: "#1a1c1e", button: "#a0caff" };

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
