import React, { createContext, useContext, useState, useEffect } from "react";
import { STORAGE_KEYS } from "../constants";
import { DEFAULTS } from "../constants/defaults";
import { logger } from "../utils/logger";
import { setPrefs } from "../theme/AppPrefsEngine";
import { setThemeState } from "../theme/ThemeEngine";
import { ambientSoundEngine } from "../utils/AmbientSoundEngine";
import { getTauriWindow } from "../utils/window";

export interface UIContextProps {
  fontFamily: 'courier-prime' | 'courier-prime-sans';
  paperSize: 'letter' | 'a4';
  setFontFamily: (font: 'courier-prime' | 'courier-prime-sans') => void;
  setPaperSize: (size: 'letter' | 'a4') => void;
  isZenMode: boolean;
  setIsZenMode: (enabled: boolean) => void;
  typewriterMode: boolean;
  setTypewriterMode: (enabled: boolean) => void;
  activeAmbientTrack: string | null;
  playAmbientTrack: (track: string) => void;
  stopAmbientTrack: () => void;
  ambientVolume: number;
  setAmbientVolume: (vol: number) => void;
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

  activeRightPane: string | null;
  setActiveRightPane: (pane: string | null) => void;
  rightPaneWidth: number;
  setRightPaneWidth: (w: number) => void;
  autoSaveEnabled: boolean;
  setAutoSaveEnabled: (enabled: boolean) => void;
  autoSaveInterval: number;
  setAutoSaveInterval: (interval: number) => void;
  hideSyntaxEnabled: boolean;
  setHideSyntaxEnabled: (enabled: boolean) => void;
  hideTagsEnabled: boolean;
  setHideTagsEnabled: (enabled: boolean) => void;
  lineFocusEnabled: boolean;
  setLineFocusEnabled: (enabled: boolean) => void;
  fountainColorsEnabled: boolean;
  setFountainColorsEnabled: (enabled: boolean) => void;
  iconStyle: string;
  setIconStyle: (style: string) => void;
  aiStatus: string | null;
  setAiStatus: (status: string | null) => void;
  translationState: 'idle' | 'running' | 'paused' | 'cancelled';
  setTranslationState: (state: 'idle' | 'running' | 'paused' | 'cancelled') => void;
}

const UIContext = createContext<UIContextProps | undefined>(undefined);

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) throw new Error("useUI must be used within a UIProvider");
  return context;
};

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const handler = (e: Event) => {
      const { key, value } = (e as CustomEvent).detail as { key: string; value: string };
      const strVal = String(value);
      switch (key) {
        case STORAGE_KEYS.FONT_FAMILY:
          setFontFamilyState(strVal as "courier-prime" | "courier-prime-sans");
          break;
        case STORAGE_KEYS.PAPER_SIZE:
          setPaperSizeState(strVal as "letter" | "a4");
          break;
        case STORAGE_KEYS.TYPEWRITER_MODE:
          setTypewriterModeState(strVal === "true");
          break;
        case STORAGE_KEYS.ZOOM_LEVEL:
          setZoomLevelState(parseInt(strVal, 10) || 100);
          break;
        case STORAGE_KEYS.APP_SCALE:
          setAppScaleState(parseInt(strVal, 10) || 100);
          break;
        case STORAGE_KEYS.AUTOCOMPLETE_ENABLED:
          setAutocompleteEnabledState(strVal !== "false");
          break;
        case STORAGE_KEYS.SMART_QUOTES_ENABLED:
          setSmartQuotesEnabledState(strVal !== "false");
          break;
        case STORAGE_KEYS.MATCH_PARENTHESES_ENABLED:
          setMatchParenthesesEnabledState(strVal !== "false");
          break;
        case STORAGE_KEYS.AUTO_SAVE_ENABLED:
          setAutoSaveEnabledState(strVal !== "false");
          break;
        case STORAGE_KEYS.AUTO_SAVE_INTERVAL:
          setAutoSaveIntervalState(parseInt(strVal, 10) || 60000);
          break;
        case STORAGE_KEYS.HIDE_SYNTAX_ENABLED:
          setHideSyntaxEnabledState(strVal === "true");
          break;
        case STORAGE_KEYS.HIDE_TAGS_ENABLED:
          setHideTagsEnabledState(strVal === "true");
          break;
        case STORAGE_KEYS.LINE_FOCUS_ENABLED:
          setLineFocusEnabledState(strVal === "true");
          break;
        case STORAGE_KEYS.FOUNTAIN_COLORS_ENABLED:
          setFountainColorsEnabledState(strVal !== "false");
          break;
        case STORAGE_KEYS.ICON_STYLE:
          setIconStyleState(strVal || "fill");
          break;
        case STORAGE_KEYS.THEME_ID:
          forceUpdate(n => n + 1);
          break;
      }
    };
    window.addEventListener("settings-changed", handler);
    return () => window.removeEventListener("settings-changed", handler);
  }, []);
  const [fontFamily, setFontFamilyState] = useState<'courier-prime' | 'courier-prime-sans'>(() => {
    return (localStorage.getItem(STORAGE_KEYS.FONT_FAMILY) as 'courier-prime' | 'courier-prime-sans' | null) ?? String(DEFAULTS[STORAGE_KEYS.FONT_FAMILY]) as 'courier-prime' | 'courier-prime-sans';
  });
  const [typewriterMode, setTypewriterModeState] = useState<boolean>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.TYPEWRITER_MODE);
    return stored !== null ? stored === "true" : Boolean(DEFAULTS[STORAGE_KEYS.TYPEWRITER_MODE]);
  });
  const [paperSize, setPaperSizeState] = useState<'letter' | 'a4'>(() => {
    return (localStorage.getItem(STORAGE_KEYS.PAPER_SIZE) as 'letter' | 'a4' | null) ?? String(DEFAULTS[STORAGE_KEYS.PAPER_SIZE]) as 'letter' | 'a4';
  });
  const [activeTab, setActiveTab] = useState<string>("outline");
  const [zoomLevel, setZoomLevelState] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ZOOM_LEVEL);
    const parsed = saved ? parseInt(saved, 10) : Number(DEFAULTS[STORAGE_KEYS.ZOOM_LEVEL]);
    return isNaN(parsed) ? Number(DEFAULTS[STORAGE_KEYS.ZOOM_LEVEL]) : parsed;
  });
  const [appScale, setAppScaleState] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.APP_SCALE);
    const parsed = saved ? parseInt(saved, 10) : Number(DEFAULTS[STORAGE_KEYS.APP_SCALE]);
    return isNaN(parsed) ? Number(DEFAULTS[STORAGE_KEYS.APP_SCALE]) : parsed;
  });

  const [autocompleteEnabled, setAutocompleteEnabledState] = useState<boolean>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.AUTOCOMPLETE_ENABLED);
    return stored !== null ? stored !== "false" : Boolean(DEFAULTS[STORAGE_KEYS.AUTOCOMPLETE_ENABLED]);
  });
  const [smartQuotesEnabled, setSmartQuotesEnabledState] = useState<boolean>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.SMART_QUOTES_ENABLED);
    return stored !== null ? stored !== "false" : Boolean(DEFAULTS[STORAGE_KEYS.SMART_QUOTES_ENABLED]);
  });
  const [matchParenthesesEnabled, setMatchParenthesesEnabledState] = useState<boolean>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.MATCH_PARENTHESES_ENABLED);
    return stored !== null ? stored !== "false" : Boolean(DEFAULTS[STORAGE_KEYS.MATCH_PARENTHESES_ENABLED]);
  });
  const [aiStatus, setAiStatus] = useState<string | null>(null);
  const [translationState, setTranslationState] = useState<'idle' | 'running' | 'paused' | 'cancelled'>('idle');



  const [autoSaveEnabled, setAutoSaveEnabledState] = useState<boolean>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.AUTO_SAVE_ENABLED);
    return stored !== null ? stored !== "false" : Boolean(DEFAULTS[STORAGE_KEYS.AUTO_SAVE_ENABLED]);
  });
  const [autoSaveInterval, setAutoSaveIntervalState] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.AUTO_SAVE_INTERVAL);
    return saved ? parseInt(saved, 10) : Number(DEFAULTS[STORAGE_KEYS.AUTO_SAVE_INTERVAL]);
  });
  const [hideSyntaxEnabled, setHideSyntaxEnabledState] = useState<boolean>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.HIDE_SYNTAX_ENABLED);
    return stored !== null ? stored === "true" : Boolean(DEFAULTS[STORAGE_KEYS.HIDE_SYNTAX_ENABLED]);
  });

  const [hideTagsEnabled, setHideTagsEnabledState] = useState<boolean>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.HIDE_TAGS_ENABLED);
    return stored !== null ? stored === "true" : Boolean(DEFAULTS[STORAGE_KEYS.HIDE_TAGS_ENABLED]);
  });

  const [activeRightPane, setActiveRightPaneState] = useState<string | null>(null);
  const [rightPaneWidth, setRightPaneWidthState] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.RIGHT_PANE_WIDTH);
      if (stored) {
        const n = parseInt(stored, 10);
        if (!isNaN(n) && n >= 240 && n <= 700) return n;
      }
    } catch { void 0; }
    return 360;
  });

  useEffect(() => {
    document.documentElement.style.setProperty("--app-scale", `${appScale}%`);
  }, [appScale]);

  const [activeAmbientTrack, setActiveAmbientTrack] = useState<string | null>(null);
  const [ambientVolume, setAmbientVolumeState] = useState<number>(() => {
    try {
      const stored = localStorage.getItem("ambient-volume");
      return stored ? parseFloat(stored) : 0.5;
    } catch {
      return 0.5;
    }
  });

  const playAmbientTrack = (track: string) => {
    setActiveAmbientTrack(track);
    ambientSoundEngine.play(track);
  };

  const stopAmbientTrack = () => {
    setActiveAmbientTrack(null);
    ambientSoundEngine.stop();
  };

  const setAmbientVolume = (vol: number) => {
    setAmbientVolumeState(vol);
    ambientSoundEngine.setVolume(vol);
    try { localStorage.setItem("ambient-volume", String(vol)); } catch { /* localStorage may be full or unavailable */ }
  };

  useEffect(() => {
    ambientSoundEngine.setVolume(ambientVolume);
  }, [ambientVolume]);

  const [isZenMode, setIsZenModeState] = useState(false);

  const [lineFocusEnabled, setLineFocusEnabledState] = useState<boolean>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.LINE_FOCUS_ENABLED);
    return stored !== null ? stored === "true" : Boolean(DEFAULTS[STORAGE_KEYS.LINE_FOCUS_ENABLED]);
  });

  const [fountainColorsEnabled, setFountainColorsEnabledState] = useState<boolean>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.FOUNTAIN_COLORS_ENABLED);
    return stored !== null ? stored !== "false" : Boolean(DEFAULTS[STORAGE_KEYS.FOUNTAIN_COLORS_ENABLED]);
  });
  const [iconStyle, setIconStyleState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.ICON_STYLE) || String(DEFAULTS[STORAGE_KEYS.ICON_STYLE]);
  });

  useEffect(() => {
    const applyZenMode = async () => {
      let tauriSuccess = false;
      const win = getTauriWindow();
      if (win) {
        try {
          await win.setFullscreen(isZenMode);
          tauriSuccess = true;
        } catch (e) {
          logger.warn("ui", "Failed to set Tauri fullscreen:", e);
        }
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

  function broadcastSetting(key: string, value: string) {
    setPrefs({ [key]: value });
  }

  const setZoomLevel = (zoom: number) => {
    const newZoom = Math.min(Math.max(zoom, 50), 400);
    setZoomLevelState(newZoom);
    localStorage.setItem(STORAGE_KEYS.ZOOM_LEVEL, String(newZoom));
    broadcastSetting(STORAGE_KEYS.ZOOM_LEVEL, String(newZoom));
  };

  const setAppScale = (scale: number) => {
    const newScale = Math.min(Math.max(scale, 50), 300);
    setAppScaleState(newScale);
    localStorage.setItem(STORAGE_KEYS.APP_SCALE, String(newScale));
    broadcastSetting(STORAGE_KEYS.APP_SCALE, String(newScale));
    setThemeState({ appScale: newScale });
  };

  const setIsZenMode = (enabled: boolean) => {
    setIsZenModeState(enabled);
  };

  const setFontFamily = (font: 'courier-prime' | 'courier-prime-sans') => {
    setFontFamilyState(font);
    localStorage.setItem(STORAGE_KEYS.FONT_FAMILY, font);
    broadcastSetting(STORAGE_KEYS.FONT_FAMILY, font);
  };

  const setTypewriterMode = (enabled: boolean) => {
    setTypewriterModeState(enabled);
    localStorage.setItem(STORAGE_KEYS.TYPEWRITER_MODE, String(enabled));
    broadcastSetting(STORAGE_KEYS.TYPEWRITER_MODE, String(enabled));
  };

  const setPaperSize = (size: 'letter' | 'a4') => {
    setPaperSizeState(size);
    localStorage.setItem(STORAGE_KEYS.PAPER_SIZE, size);
    broadcastSetting(STORAGE_KEYS.PAPER_SIZE, size);
  };

  const setAutocompleteEnabled = (enabled: boolean) => {
    setAutocompleteEnabledState(enabled);
    localStorage.setItem(STORAGE_KEYS.AUTOCOMPLETE_ENABLED, String(enabled));
    broadcastSetting(STORAGE_KEYS.AUTOCOMPLETE_ENABLED, String(enabled));
  };

  const setSmartQuotesEnabled = (enabled: boolean) => {
    setSmartQuotesEnabledState(enabled);
    localStorage.setItem(STORAGE_KEYS.SMART_QUOTES_ENABLED, String(enabled));
    broadcastSetting(STORAGE_KEYS.SMART_QUOTES_ENABLED, String(enabled));
  };

  const setMatchParenthesesEnabled = (enabled: boolean) => {
    setMatchParenthesesEnabledState(enabled);
    localStorage.setItem(STORAGE_KEYS.MATCH_PARENTHESES_ENABLED, String(enabled));
    broadcastSetting(STORAGE_KEYS.MATCH_PARENTHESES_ENABLED, String(enabled));
  };

  const setAutoSaveEnabled = (enabled: boolean) => {
    setAutoSaveEnabledState(enabled);
    localStorage.setItem(STORAGE_KEYS.AUTO_SAVE_ENABLED, String(enabled));
    broadcastSetting(STORAGE_KEYS.AUTO_SAVE_ENABLED, String(enabled));
  };

  const setAutoSaveInterval = (interval: number) => {
    setAutoSaveIntervalState(interval);
    localStorage.setItem(STORAGE_KEYS.AUTO_SAVE_INTERVAL, String(interval));
    broadcastSetting(STORAGE_KEYS.AUTO_SAVE_INTERVAL, String(interval));
  };

  const setHideSyntaxEnabled = (enabled: boolean) => {
    setHideSyntaxEnabledState(enabled);
    localStorage.setItem(STORAGE_KEYS.HIDE_SYNTAX_ENABLED, String(enabled));
    broadcastSetting(STORAGE_KEYS.HIDE_SYNTAX_ENABLED, String(enabled));
  };

  const setHideTagsEnabled = (enabled: boolean) => {
    setHideTagsEnabledState(enabled);
    localStorage.setItem(STORAGE_KEYS.HIDE_TAGS_ENABLED, String(enabled));
    broadcastSetting(STORAGE_KEYS.HIDE_TAGS_ENABLED, String(enabled));
  };

  const setLineFocusEnabled = (enabled: boolean) => {
    setLineFocusEnabledState(enabled);
    localStorage.setItem(STORAGE_KEYS.LINE_FOCUS_ENABLED, enabled ? "true" : "false");
    broadcastSetting(STORAGE_KEYS.LINE_FOCUS_ENABLED, enabled ? "true" : "false");
  };

  const setFountainColorsEnabled = (enabled: boolean) => {
    setFountainColorsEnabledState(enabled);
    localStorage.setItem(STORAGE_KEYS.FOUNTAIN_COLORS_ENABLED, enabled ? "true" : "false");
    broadcastSetting(STORAGE_KEYS.FOUNTAIN_COLORS_ENABLED, enabled ? "true" : "false");
  };

  const setIconStyle = (style: string) => {
    setIconStyleState(style);
    localStorage.setItem(STORAGE_KEYS.ICON_STYLE, style);
    broadcastSetting(STORAGE_KEYS.ICON_STYLE, style);
  };

  const setRightPaneWidth = (w: number) => {
    const clamped = Math.max(240, Math.min(700, w));
    setRightPaneWidthState(clamped);
    try { localStorage.setItem(STORAGE_KEYS.RIGHT_PANE_WIDTH, String(clamped)); } catch { void 0; }
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

        activeRightPane,
        setActiveRightPane: setActiveRightPaneState,
        rightPaneWidth,
        setRightPaneWidth,
        autoSaveEnabled,
        setAutoSaveEnabled,
        autoSaveInterval,
        setAutoSaveInterval,
        hideSyntaxEnabled,
        setHideSyntaxEnabled,
        hideTagsEnabled,
        setHideTagsEnabled,
        lineFocusEnabled,
        setLineFocusEnabled,
        fountainColorsEnabled,
        setFountainColorsEnabled,
        iconStyle,
        setIconStyle,
        aiStatus,
        setAiStatus,
        translationState,
        setTranslationState,
        activeAmbientTrack,
        playAmbientTrack,
        stopAmbientTrack,
        ambientVolume,
        setAmbientVolume,
      }}
    >
      {children}
    </UIContext.Provider>
  );
};

