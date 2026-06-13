import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { createActOneTheme, deriveAllColors, type ThemeMode, type ThemeConfig, type ThemeColors, themes } from "../theme";
import { STORAGE_KEYS } from "../constants";

export interface CustomTheme {
  id: string;
  name: string;
  isDark: boolean;
  colors: ThemeColors;
}

export interface ThemeContextProps {
  theme: string;
  setTheme: (theme: string) => void;
  mode: ThemeMode;
  toggleMode: () => void;
  customThemes: CustomTheme[];
  addCustomTheme: (name: string, isDark: boolean, colors: ThemeColors) => string;
  updateCustomTheme: (id: string, name: string, isDark: boolean, colors: ThemeColors) => void;
  deleteCustomTheme: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
};

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'theme';
}

const STORAGE_KEY = STORAGE_KEYS.CUSTOM_THEMES;
const THEME_ID_KEY = STORAGE_KEYS.THEME_ID;

function loadCustomThemes(): CustomTheme[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { console.warn("Failed to load custom themes", e); return []; }
}

function saveCustomThemes(t: CustomTheme[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
}

const DEFAULT_LIGHT = { editor: "#ffffff", text: "#1a1c1e", accent: "#0061a4", sidebar: "#f5f5f5", button: "#0061a4" };
const DEFAULT_DARK = { editor: "#111416", text: "#e2e2e6", accent: "#a0caff", sidebar: "#1a1c1e", button: "#a0caff" };

function completeCustomColors(colors: Partial<ThemeColors>, isDark: boolean): ThemeColors {
  const def = isDark ? DEFAULT_DARK : DEFAULT_LIGHT;
  const core = {
    editor: (colors.editor || (colors as any).bg) ?? def.editor,
    text: colors.text ?? def.text,
    accent: colors.accent ?? def.accent,
    sidebar: colors.sidebar ?? def.sidebar,
    button: colors.button ?? colors.accent ?? def.accent,
  };
  return deriveAllColors(core, isDark);
}

function getCurrentThemeConfig(themeId: string, customThemes: CustomTheme[]): ThemeConfig {
  const builtin = themes.find(x => x.id === themeId);
  if (builtin) return builtin;
  const custom = customThemes.find(x => x.id === themeId);
  if (custom) {
    return {
      id: custom.id,
      name: custom.name,
      desc: "",
      isDark: custom.isDark,
      colors: completeCustomColors(custom.colors, custom.isDark),
    };
  }
  return themes[0];
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<string>(() => {
    const saved = localStorage.getItem(THEME_ID_KEY);
    if (saved === "light" || saved === "dark") return saved;
    const customs = loadCustomThemes();
    if (saved && customs.some(t => t.id === saved)) return saved;
    const isSystemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return isSystemDark ? "dark" : "light";
  });

  const [customThemes, setCustomThemes] = useState<CustomTheme[]>(loadCustomThemes);

  const setTheme = useCallback((t: string) => {
    setThemeState(t);
    localStorage.setItem(THEME_ID_KEY, t);
  }, []);

  const currentThemeConfig = useMemo(
    () => getCurrentThemeConfig(theme, customThemes),
    [theme, customThemes]
  );

  const mode: ThemeMode = currentThemeConfig.isDark ? "dark" : "light";

  const toggleMode = useCallback(() => {
    setTheme(mode === "light" ? "dark" : "light");
  }, [mode, setTheme]);

  useEffect(() => {
    document.body.classList.toggle("dark-theme", mode === "dark");
  }, [mode]);

  const muiTheme = useMemo(() => createActOneTheme(currentThemeConfig), [currentThemeConfig]);

  const addCustomTheme = useCallback((
    name: string,
    isDark: boolean,
    colors: ThemeColors
  ): string => {
    const id = slugify(name) + "-" + Date.now().toString(36);
    const newTheme: CustomTheme = { id, name, isDark, colors };
    const updated = [...customThemes, newTheme];
    setCustomThemes(updated);
    saveCustomThemes(updated);
    return id;
  }, [customThemes]);

  const updateCustomTheme = useCallback((
    id: string,
    name: string,
    isDark: boolean,
    colors: ThemeColors
  ) => {
    const updated = customThemes.map(t => t.id === id ? { ...t, name, isDark, colors } : t);
    setCustomThemes(updated);
    saveCustomThemes(updated);
  }, [customThemes]);

  const deleteCustomTheme = useCallback((id: string) => {
    const updated = customThemes.filter(t => t.id !== id);
    setCustomThemes(updated);
    saveCustomThemes(updated);
    if (theme === id) {
      setTheme(mode === "dark" ? "dark" : "light");
    }
  }, [customThemes, theme, mode, setTheme]);

  return (
    <ThemeContext.Provider value={{
      theme, setTheme, mode, toggleMode,
      customThemes, addCustomTheme, updateCustomTheme, deleteCustomTheme
    }}>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
