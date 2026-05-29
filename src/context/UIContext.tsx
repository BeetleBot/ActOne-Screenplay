import React, { createContext, useContext, useState, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

export interface UIContextProps {
  fontFamily: 'courier-prime' | 'courier-prime-sans';
  paperSize: 'letter' | 'a4';
  setFontFamily: (font: 'courier-prime' | 'courier-prime-sans') => void;
  setPaperSize: (size: 'letter' | 'a4') => void;
  isZenMode: boolean;
  setIsZenMode: (enabled: boolean) => void;
  typewriterMode: boolean;
  setTypewriterMode: (enabled: boolean) => void;
  workspaceMode: 'editor' | 'cards';
  setWorkspaceMode: (mode: 'editor' | 'cards') => void;
  showTimeline: boolean;
  setShowTimeline: (show: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  zoomLevel: number;
  setZoomLevel: (zoom: number) => void;
  autocompleteEnabled: boolean;
  setAutocompleteEnabled: (enabled: boolean) => void;
  smartQuotesEnabled: boolean;
  setSmartQuotesEnabled: (enabled: boolean) => void;
  matchParenthesesEnabled: boolean;
  setMatchParenthesesEnabled: (enabled: boolean) => void;
  hideFountainMarkupEnabled: boolean;
  setHideFountainMarkupEnabled: (enabled: boolean) => void;
  showSearchPanel: boolean;
  setShowSearchPanel: (show: boolean) => void;
  showReplacePanel: boolean;
  setShowReplacePanel: (show: boolean) => void;
}

const UIContext = createContext<UIContextProps | undefined>(undefined);

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) throw new Error("useUI must be used within a UIProvider");
  return context;
};

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fontFamily, setFontFamilyState] = useState<'courier-prime' | 'courier-prime-sans'>(() => {
    return (localStorage.getItem("actone-font-family") as any) || "courier-prime";
  });
  const [typewriterMode, setTypewriterModeState] = useState<boolean>(() => {
    return localStorage.getItem("actone-typewriter-mode") === "true";
  });
  const [paperSize, setPaperSizeState] = useState<'letter' | 'a4'>(() => {
    return (localStorage.getItem("actone-paper-size") as any) || "letter";
  });
  const [workspaceMode, setWorkspaceMode] = useState<'editor' | 'cards'>("editor");
  const [activeTab, setActiveTab] = useState<string>("outline");
  const [zoomLevel, setZoomLevelState] = useState<number>(() => {
    const saved = localStorage.getItem("actone-zoom-level");
    const parsed = saved ? parseInt(saved, 10) : 100;
    return isNaN(parsed) ? 100 : parsed;
  });

  const [autocompleteEnabled, setAutocompleteEnabledState] = useState<boolean>(() => {
    return localStorage.getItem("actone-autocomplete-enabled") !== "false";
  });
  const [smartQuotesEnabled, setSmartQuotesEnabledState] = useState<boolean>(() => {
    return localStorage.getItem("actone-smart-quotes-enabled") === "true";
  });
  const [matchParenthesesEnabled, setMatchParenthesesEnabledState] = useState<boolean>(() => {
    return localStorage.getItem("actone-match-parentheses-enabled") === "true";
  });
  const [hideFountainMarkupEnabled, setHideFountainMarkupEnabledState] = useState<boolean>(() => {
    return localStorage.getItem("actone-hide-fountain-markup-enabled") === "true";
  });

  const [showSearchPanel, setShowSearchPanel] = useState<boolean>(false);
  const [showReplacePanel, setShowReplacePanel] = useState<boolean>(false);

  const [isZenMode, setIsZenModeState] = useState(false);

  useEffect(() => {
    const applyZenMode = async () => {
      let tauriSuccess = false;
      try {
        const win = getCurrentWindow();
        if (win) {
          await win.setFullscreen(isZenMode);
          tauriSuccess = true;
        }
      } catch (e) {
        console.error("Failed to set Tauri fullscreen:", e);
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
          console.error("HTML5 fullscreen toggle failed:", err);
        }
      }
    };
    applyZenMode();
  }, [isZenMode]);

  const [showTimeline, setShowTimelineState] = useState<boolean>(() => {
    return localStorage.getItem("actone-show-timeline") !== "false";
  });

  const setZoomLevel = (zoom: number) => {
    const newZoom = Math.min(Math.max(zoom, 50), 300);
    setZoomLevelState(newZoom);
    localStorage.setItem("actone-zoom-level", String(newZoom));
  };

  const setShowTimeline = (show: boolean) => {
    setShowTimelineState(show);
    localStorage.setItem("actone-show-timeline", String(show));
  };

  const setIsZenMode = (enabled: boolean) => {
    setIsZenModeState(enabled);
  };

  const setFontFamily = (font: 'courier-prime' | 'courier-prime-sans') => {
    setFontFamilyState(font);
    localStorage.setItem("actone-font-family", font);
  };

  const setTypewriterMode = (enabled: boolean) => {
    setTypewriterModeState(enabled);
    localStorage.setItem("actone-typewriter-mode", String(enabled));
  };

  const setPaperSize = (size: 'letter' | 'a4') => {
    setPaperSizeState(size);
    localStorage.setItem("actone-paper-size", size);
  };

  const setAutocompleteEnabled = (enabled: boolean) => {
    setAutocompleteEnabledState(enabled);
    localStorage.setItem("actone-autocomplete-enabled", String(enabled));
  };

  const setSmartQuotesEnabled = (enabled: boolean) => {
    setSmartQuotesEnabledState(enabled);
    localStorage.setItem("actone-smart-quotes-enabled", String(enabled));
  };

  const setMatchParenthesesEnabled = (enabled: boolean) => {
    setMatchParenthesesEnabledState(enabled);
    localStorage.setItem("actone-match-parentheses-enabled", String(enabled));
  };

  const setHideFountainMarkupEnabled = (enabled: boolean) => {
    setHideFountainMarkupEnabledState(enabled);
    localStorage.setItem("actone-hide-fountain-markup-enabled", String(enabled));
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
        workspaceMode,
        setWorkspaceMode,
        showTimeline,
        setShowTimeline,
        activeTab,
        setActiveTab,
        zoomLevel,
        setZoomLevel,
        autocompleteEnabled,
        setAutocompleteEnabled,
        smartQuotesEnabled,
        setSmartQuotesEnabled,
        matchParenthesesEnabled,
        setMatchParenthesesEnabled,
        hideFountainMarkupEnabled,
        setHideFountainMarkupEnabled,
        showSearchPanel,
        setShowSearchPanel,
        showReplacePanel,
        setShowReplacePanel,
      }}
    >
      {children}
    </UIContext.Provider>
  );
};

