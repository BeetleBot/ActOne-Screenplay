import React, { createContext, useContext, useState, useEffect } from "react";

export type ThemeType = 'light' | 'dark' | 'pitch-black' | 'lilac' | 'warm-paper' | 'honey' | 'sage' | 'forest' | 'plum' | 'ayu-mirage';

interface ThemeContextProps {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeType>(() => {
    return (localStorage.getItem("actone-theme") as ThemeType) || "light";
  });

  const setTheme = (t: ThemeType) => {
    setThemeState(t);
    localStorage.setItem("actone-theme", t);
  };

  useEffect(() => {
    const classes = [
      'theme-light', 'theme-dark', 'theme-pitch-black', 'theme-lilac',
      'theme-warm-paper', 'theme-honey', 'theme-sage', 'theme-forest',
      'theme-plum', 'theme-ayu-mirage'
    ];
    document.body.classList.remove(...classes);
    document.body.classList.add(`theme-${theme}`);
    
    // Maintain dark-theme class for backwards compatibility or high-level styling
    const darkThemes = ['dark', 'pitch-black', 'forest', 'plum', 'ayu-mirage'];
    if (darkThemes.includes(theme)) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
