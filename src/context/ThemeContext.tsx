import React, { createContext, useContext, useState, useEffect } from "react";

export type ThemeType = 'light' | 'dark' | 'sepia' | 'frost' | 'solarized' | 'midnight' | 'lilac' | 'mocha' | 'latte' | 'everforest-dark' | 'everforest-light' | 'tokyo-night';

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
      'theme-light', 'theme-dark', 'theme-sepia', 'theme-frost', 
      'theme-solarized', 'theme-midnight', 'theme-lilac',
      'theme-mocha', 'theme-latte', 'theme-everforest-dark', 
      'theme-everforest-light', 'theme-tokyo-night'
    ];
    document.body.classList.remove(...classes);
    document.body.classList.add(`theme-${theme}`);
    
    // Maintain dark-theme class for backwards compatibility or high-level styling
    const darkThemes = ['dark', 'solarized', 'midnight', 'mocha', 'everforest-dark', 'tokyo-night'];
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
