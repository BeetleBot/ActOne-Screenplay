import React, { createContext, useContext, useState, useRef } from "react";

export interface UIContextProps {
  fontFamily: 'courier-prime' | 'courier-prime-sans';
  paperSize: 'letter' | 'a4';
  setFontFamily: (font: 'courier-prime' | 'courier-prime-sans') => void;
  setPaperSize: (size: 'letter' | 'a4') => void;
  showTabBar: boolean;
  setShowTabBar: (show: boolean) => void;
  openTabBarManually: () => void;
  triggerTemporaryTabBar: () => void;
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

  const [showTabBar, setShowTabBar] = useState(false);
  const hideTimerRef = useRef<any>(null);

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

  const triggerTemporaryTabBar = () => {
    setShowTabBar(true);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = setTimeout(() => {
      setShowTabBar(false);
    }, 1500);
  };

  const openTabBarManually = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setShowTabBar(true);
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
        showTabBar,
        setShowTabBar,
        openTabBarManually,
        triggerTemporaryTabBar,
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
      }}
    >
      {children}
    </UIContext.Provider>
  );
};

