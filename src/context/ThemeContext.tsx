import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { createActOneTheme, themes, type ThemeMode, type ThemeColors } from "../theme";
import { resolveThemeConfig, type CustomTheme } from "../theme/themeUtils";
import { STORAGE_KEYS } from "../constants";
import { useUI } from "./UIContext";
import { initThemeEngine, setThemeState as engineSetTheme, onThemeChanged } from "../theme/ThemeEngine";

export type { CustomTheme };

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
  } catch { return []; }
}

function saveCustomThemes(t: CustomTheme[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<string>(() => {
    const saved = localStorage.getItem(THEME_ID_KEY);
    if (saved) {
      if (saved === "adaptive" || saved === "catppuccin-adaptive" || saved === "pitch-adaptive") return saved;
      if (themes.some(t => t.id === saved)) return saved;
      const customs = loadCustomThemes();
      if (customs.some(t => t.id === saved)) return saved;
    }
    return "adaptive";
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
    () => resolveThemeConfig(theme, customThemes, systemDark),
    [theme, customThemes, systemDark]
  );

  const mode: ThemeMode = currentThemeConfig.isDark ? "dark" : "light";

  const toggleMode = useCallback(() => {
    if (theme === "adaptive") {
      setTheme(systemDark ? "light" : "dark");
    } else if (theme === "catppuccin-adaptive") {
      setTheme(systemDark ? "catppuccin-latte" : "catppuccin-mocha");
    } else if (theme === "pitch-adaptive") {
      setTheme(systemDark ? "pitch-white" : "pitch-black");
    } else {
      setTheme(mode === "light" ? "dark" : "light");
    }
  }, [theme, mode, systemDark, setTheme]);

  useEffect(() => {
    document.body.classList.toggle("dark-theme", mode === "dark");
  }, [mode]);

  const { appScale, fountainColorsEnabled } = useUI();

  const muiTheme = useMemo(() => createActOneTheme(currentThemeConfig, appScale, fountainColorsEnabled), [currentThemeConfig, appScale, fountainColorsEnabled]);

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
