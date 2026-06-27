import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { createActOneTheme, deriveAllColors, type ThemeMode, type ThemeConfig, type ThemeColors, themes } from "../theme";
import { STORAGE_KEYS } from "../constants";
import { useUI } from "./UIContext";
import { initThemeEngine, setThemeState as engineSetTheme, onThemeChanged } from "../theme/ThemeEngine";

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
  } catch (e) { /* theme load failure is non-critical */ return []; }
}

function saveCustomThemes(t: CustomTheme[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
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

function getCurrentThemeConfig(themeId: string, customThemes: CustomTheme[], systemDark: boolean): ThemeConfig {
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

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<string>(() => {
    const saved = localStorage.getItem(THEME_ID_KEY);
    if (saved) {
      if (saved === "adaptive") return saved;
      if (themes.some(t => t.id === saved)) return saved;
      const customs = loadCustomThemes();
      if (customs.some(t => t.id === saved)) return saved;
    }
    const isSystemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return isSystemDark ? "dark" : "light";
  });
  const themeRef = useRef(theme);
  themeRef.current = theme;

  const [systemDark, setSystemDark] = useState<boolean>(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const [customThemes, setCustomThemes] = useState<CustomTheme[]>(loadCustomThemes);
  const customThemesRef = useRef(customThemes);
  customThemesRef.current = customThemes;

  useEffect(() => {
    initThemeEngine().then((state) => {
      if (state.themeId !== themeRef.current) {
        engineSetTheme({ themeId: themeRef.current });
      }
    });
    return onThemeChanged((state) => {
      if (state.themeId !== themeRef.current) {
        setThemeState(state.themeId);
        localStorage.setItem(THEME_ID_KEY, state.themeId);
      }
      try {
        const parsed = JSON.parse(state.customThemes);
        const localRaw = JSON.stringify(customThemesRef.current);
        if (JSON.stringify(parsed) !== localRaw) {
          setCustomThemes(parsed);
          saveCustomThemes(parsed);
        }
      } catch { /* ignore parse errors */ }
    });
  }, []);

  const setTheme = useCallback((t: string) => {
    setThemeState(t);
    localStorage.setItem(THEME_ID_KEY, t);
    engineSetTheme({ themeId: t });
  }, []);

  const currentThemeConfig = useMemo(
    () => getCurrentThemeConfig(theme, customThemes, systemDark),
    [theme, customThemes, systemDark]
  );

  const mode: ThemeMode = currentThemeConfig.isDark ? "dark" : "light";

  const toggleMode = useCallback(() => {
    if (theme === "adaptive") {
      setTheme(systemDark ? "light" : "dark");
    } else {
      setTheme(mode === "light" ? "dark" : "light");
    }
  }, [theme, mode, systemDark, setTheme]);

  useEffect(() => {
    document.body.classList.toggle("dark-theme", mode === "dark");
  }, [mode]);

  const { appScale } = useUI();

  const muiTheme = useMemo(() => createActOneTheme(currentThemeConfig, appScale), [currentThemeConfig, appScale]);

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
    engineSetTheme({ customThemes: JSON.stringify(updated) });
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
    engineSetTheme({ customThemes: JSON.stringify(updated) });
  }, [customThemes]);

  const deleteCustomTheme = useCallback((id: string) => {
    const updated = customThemes.filter(t => t.id !== id);
    setCustomThemes(updated);
    saveCustomThemes(updated);
    engineSetTheme({ customThemes: JSON.stringify(updated) });
    if (theme === id) {
      setTheme(systemDark ? "dark" : "light");
    }
  }, [customThemes, theme, systemDark, setTheme]);

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
