import React, { createContext, useContext, useState, useEffect } from "react";

export type ThemeType = 'light' | 'dark' | 'sepia' | 'frost' | 'solarized' | 'midnight' | 'lilac';

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
    return (localStorage.getItem("drafter-theme") as ThemeType) || "light";
  });

  const setTheme = (t: ThemeType) => {
    setThemeState(t);
    localStorage.setItem("drafter-theme", t);
  };

  useEffect(() => {
    const classes = ['theme-light', 'theme-dark', 'theme-sepia', 'theme-frost', 'theme-solarized', 'theme-midnight', 'theme-lilac'];
    document.body.classList.remove(...classes);
    document.body.classList.add(`theme-${theme}`);
    
    // Maintain dark-theme class for backwards compatibility
    if (theme === 'dark' || theme === 'solarized' || theme === 'midnight') {
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
