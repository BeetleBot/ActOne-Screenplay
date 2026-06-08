import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { createActOneTheme, type ThemeMode, type ThemeId, themes } from "../theme/muiTheme";

export interface ThemeContextProps {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  mode: ThemeMode;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const saved = localStorage.getItem("actone-theme-id") as ThemeId | null;
    if (saved && themes.some(t => t.id === saved)) return saved;
    
    const isSystemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return isSystemDark ? "slate" : "baseline";
  });

  const setTheme = (t: ThemeId) => {
    setThemeState(t);
    localStorage.setItem("actone-theme-id", t);
  };

  const currentThemeConfig = useMemo(() => {
    return themes.find(t => t.id === theme) || themes[0];
  }, [theme]);

  const mode: ThemeMode = currentThemeConfig.isDark ? "dark" : "light";

  const toggleMode = () => {
    setTheme(mode === "light" ? "slate" : "baseline");
  };

  useEffect(() => {
    document.body.classList.toggle("dark-theme", mode === "dark");
  }, [mode]);

  const muiTheme = useMemo(() => createActOneTheme(theme), [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, mode, toggleMode }}>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
