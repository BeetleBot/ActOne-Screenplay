import React, { createContext, useContext, useState, useEffect } from "react";
import { STORAGE_KEYS } from "../constants";
import { logger } from "../utils/logger";

export interface UIContextProps {
  fontFamily: 'courier-prime' | 'courier-prime-sans';
  paperSize: 'letter' | 'a4';
  setFontFamily: (font: 'courier-prime' | 'courier-prime-sans') => void;
  setPaperSize: (size: 'letter' | 'a4') => void;
  isZenMode: boolean;
  setIsZenMode: (enabled: boolean) => void;
  typewriterMode: boolean;
  setTypewriterMode: (enabled: boolean) => void;
  viewMode: 'editor' | 'board';
  setViewMode: (mode: 'editor' | 'board') => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  zoomLevel: number;
  setZoomLevel: (zoom: number) => void;
  appScale: number;
  setAppScale: (scale: number) => void;
  autocompleteEnabled: boolean;
  setAutocompleteEnabled: (enabled: boolean) => void;
  smartQuotesEnabled: boolean;
  setSmartQuotesEnabled: (enabled: boolean) => void;
  matchParenthesesEnabled: boolean;
  setMatchParenthesesEnabled: (enabled: boolean) => void;

  showSearchPanel: boolean;
  setShowSearchPanel: (show: boolean) => void;
  showReplacePanel: boolean;
  setShowReplacePanel: (show: boolean) => void;
  autoSaveEnabled: boolean;
  setAutoSaveEnabled: (enabled: boolean) => void;
  autoSaveInterval: number;
  setAutoSaveInterval: (interval: number) => void;
  hideSyntaxEnabled: boolean;
  setHideSyntaxEnabled: (enabled: boolean) => void;
  lineFocusEnabled: boolean;
  setLineFocusEnabled: (enabled: boolean) => void;
}

const UIContext = createContext<UIContextProps | undefined>(undefined);

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) throw new Error("useUI must be used within a UIProvider");
  return context;
};

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fontFamily, setFontFamilyState] = useState<'courier-prime' | 'courier-prime-sans'>(() => {
    return (localStorage.getItem(STORAGE_KEYS.FONT_FAMILY) as 'courier-prime' | 'courier-prime-sans' | null) ?? "courier-prime-sans";
  });
  const [typewriterMode, setTypewriterModeState] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEYS.TYPEWRITER_MODE) === "true";
  });
  const [paperSize, setPaperSizeState] = useState<'letter' | 'a4'>(() => {
    return (localStorage.getItem(STORAGE_KEYS.PAPER_SIZE) as 'letter' | 'a4' | null) ?? "a4";
  });
  const [viewMode, setViewMode] = useState<'editor' | 'board'>('editor');
  const [activeTab, setActiveTab] = useState<string>("outline");
  const [zoomLevel, setZoomLevelState] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ZOOM_LEVEL);
    const parsed = saved ? parseInt(saved, 10) : 100;
    return isNaN(parsed) ? 100 : parsed;
  });
  const [appScale, setAppScaleState] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.APP_SCALE);
    const parsed = saved ? parseInt(saved, 10) : 100;
    return isNaN(parsed) ? 100 : parsed;
  });

  const [autocompleteEnabled, setAutocompleteEnabledState] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEYS.AUTOCOMPLETE_ENABLED) !== "false";
  });
  const [smartQuotesEnabled, setSmartQuotesEnabledState] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEYS.SMART_QUOTES_ENABLED) !== "false";
  });
  const [matchParenthesesEnabled, setMatchParenthesesEnabledState] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEYS.MATCH_PARENTHESES_ENABLED) !== "false";
  });



  const [autoSaveEnabled, setAutoSaveEnabledState] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEYS.AUTO_SAVE_ENABLED) !== "false";
  });
  const [autoSaveInterval, setAutoSaveIntervalState] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.AUTO_SAVE_INTERVAL);
    return saved ? parseInt(saved, 10) : 60000;
  });
  const [hideSyntaxEnabled, setHideSyntaxEnabledState] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEYS.HIDE_SYNTAX_ENABLED) === "true";
  });

  const [showSearchPanel, setShowSearchPanel] = useState<boolean>(false);
  const [showReplacePanel, setShowReplacePanel] = useState<boolean>(false);

  const [isZenMode, setIsZenModeState] = useState(false);

  const [lineFocusEnabled, setLineFocusEnabledState] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEYS.LINE_FOCUS_ENABLED) === "true";
  });

  useEffect(() => {
    const applyZenMode = async () => {
      let tauriSuccess = false;
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const win = getCurrentWindow();
        if (win) {
          await win.setFullscreen(isZenMode);
          tauriSuccess = true;
        }
      } catch (e) {
        logger.error("ui", "Failed to set Tauri fullscreen:", e);
      }

      if (!tauriSuccess) {
        try {
          if (isZenMode) {
            if (!document.fullscreenElement) {
              await document.documentElement.requestFullscreen().catch(() => {});
            }
          } else {
            if (document.fullscreenElement) {
              await document.exitFullscreen().catch(() => {});
            }
          }
        } catch (err) {
          logger.error("ui", "HTML5 fullscreen toggle failed:", err);
        }
      }
    };
    applyZenMode();
  }, [isZenMode]);

  const setZoomLevel = (zoom: number) => {
    const newZoom = Math.min(Math.max(zoom, 50), 400);
    setZoomLevelState(newZoom);
    localStorage.setItem(STORAGE_KEYS.ZOOM_LEVEL, String(newZoom));
  };

  const setAppScale = (scale: number) => {
    const newScale = Math.min(Math.max(scale, 50), 300);
    setAppScaleState(newScale);
    localStorage.setItem(STORAGE_KEYS.APP_SCALE, String(newScale));
  };

  const setIsZenMode = (enabled: boolean) => {
    setIsZenModeState(enabled);
  };

  const setFontFamily = (font: 'courier-prime' | 'courier-prime-sans') => {
    setFontFamilyState(font);
    localStorage.setItem(STORAGE_KEYS.FONT_FAMILY, font);
  };

  const setTypewriterMode = (enabled: boolean) => {
    setTypewriterModeState(enabled);
    localStorage.setItem(STORAGE_KEYS.TYPEWRITER_MODE, String(enabled));
  };

  const setPaperSize = (size: 'letter' | 'a4') => {
    setPaperSizeState(size);
    localStorage.setItem(STORAGE_KEYS.PAPER_SIZE, size);
  };

  const setAutocompleteEnabled = (enabled: boolean) => {
    setAutocompleteEnabledState(enabled);
    localStorage.setItem(STORAGE_KEYS.AUTOCOMPLETE_ENABLED, String(enabled));
  };

  const setSmartQuotesEnabled = (enabled: boolean) => {
    setSmartQuotesEnabledState(enabled);
    localStorage.setItem(STORAGE_KEYS.SMART_QUOTES_ENABLED, String(enabled));
  };

  const setMatchParenthesesEnabled = (enabled: boolean) => {
    setMatchParenthesesEnabledState(enabled);
    localStorage.setItem(STORAGE_KEYS.MATCH_PARENTHESES_ENABLED, String(enabled));
  };



  const setAutoSaveEnabled = (enabled: boolean) => {
    setAutoSaveEnabledState(enabled);
    localStorage.setItem(STORAGE_KEYS.AUTO_SAVE_ENABLED, String(enabled));
  };

  const setAutoSaveInterval = (interval: number) => {
    setAutoSaveIntervalState(interval);
    localStorage.setItem(STORAGE_KEYS.AUTO_SAVE_INTERVAL, String(interval));
  };

  const setHideSyntaxEnabled = (enabled: boolean) => {
    setHideSyntaxEnabledState(enabled);
    localStorage.setItem(STORAGE_KEYS.HIDE_SYNTAX_ENABLED, String(enabled));
  };

  const setLineFocusEnabled = (enabled: boolean) => {
    setLineFocusEnabledState(enabled);
    localStorage.setItem(STORAGE_KEYS.LINE_FOCUS_ENABLED, enabled ? "true" : "false");
  };

  return (
    <UIContext.Provider
      value={{
        fontFamily,
        paperSize,
        setFontFamily,
        setPaperSize,
        isZenMode,
        setIsZenMode,
        typewriterMode,
        setTypewriterMode,
        viewMode,
        setViewMode,
        activeTab,
        setActiveTab,
        zoomLevel,
        setZoomLevel,
        appScale,
        setAppScale,
        autocompleteEnabled,
        setAutocompleteEnabled,
        smartQuotesEnabled,
        setSmartQuotesEnabled,
        matchParenthesesEnabled,
        setMatchParenthesesEnabled,

        showSearchPanel,
        setShowSearchPanel,
        showReplacePanel,
        setShowReplacePanel,
        autoSaveEnabled,
        setAutoSaveEnabled,
        autoSaveInterval,
        setAutoSaveInterval,
        hideSyntaxEnabled,
        setHideSyntaxEnabled,
        lineFocusEnabled,
        setLineFocusEnabled,
      }}
    >
      {children}
    </UIContext.Provider>
  );
};

