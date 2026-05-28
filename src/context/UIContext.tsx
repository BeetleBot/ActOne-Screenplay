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
}

const UIContext = createContext<UIContextProps | undefined>(undefined);

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) throw new Error("useUI must be used within a UIProvider");
  return context;
};

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fontFamily, setFontFamilyState] = useState<'courier-prime' | 'courier-prime-sans'>(() => {
    return (localStorage.getItem("drafter-font-family") as any) || "courier-prime";
  });
  const [typewriterMode, setTypewriterModeState] = useState<boolean>(() => {
    return localStorage.getItem("drafter-typewriter-mode") === "true";
  });
  const [paperSize, setPaperSizeState] = useState<'letter' | 'a4'>(() => {
    return (localStorage.getItem("drafter-paper-size") as any) || "letter";
  });
  const [workspaceMode, setWorkspaceMode] = useState<'editor' | 'cards'>("editor");
  const [activeTab, setActiveTab] = useState<string>("outline");
  const [zoomLevel, setZoomLevelState] = useState<number>(() => {
    const saved = localStorage.getItem("drafter-zoom-level");
    const parsed = saved ? parseInt(saved, 10) : 100;
    return isNaN(parsed) ? 100 : parsed;
  });

  const [showTabBar, setShowTabBar] = useState(false);
  const hideTimerRef = useRef<any>(null);

  const [showTimeline, setShowTimelineState] = useState<boolean>(() => {
    return localStorage.getItem("drafter-show-timeline") !== "false";
  });

  const setZoomLevel = (zoom: number) => {
    const newZoom = Math.min(Math.max(zoom, 50), 300);
    setZoomLevelState(newZoom);
    localStorage.setItem("drafter-zoom-level", String(newZoom));
  };

  const setShowTimeline = (show: boolean) => {
    setShowTimelineState(show);
    localStorage.setItem("drafter-show-timeline", String(show));
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
    localStorage.setItem("drafter-font-family", font);
  };

  const setTypewriterMode = (enabled: boolean) => {
    setTypewriterModeState(enabled);
    localStorage.setItem("drafter-typewriter-mode", String(enabled));
  };

  const setPaperSize = (size: 'letter' | 'a4') => {
    setPaperSizeState(size);
    localStorage.setItem("drafter-paper-size", size);
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
      }}
    >
      {children}
    </UIContext.Provider>
  );
};
