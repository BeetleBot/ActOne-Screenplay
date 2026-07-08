import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  Slider,
  ToggleButtonGroup,
  ToggleButton,
  TextField,
  Button,
} from "@mui/material";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { TitleBar } from "./TitleBar";
import { SettingsIcon } from "./Icons";
import { createActOneTheme } from "../theme";
import { resolveThemeConfig, type CustomTheme } from "../theme/themeUtils";
import { initThemeEngine, setThemeState as engineSetTheme, onThemeChanged } from "../theme/ThemeEngine";
import { initPrefsEngine, setPrefs, onPrefsChanged } from "../theme/AppPrefsEngine";
import { STORAGE_KEYS } from "../constants";
import { logger } from "../utils/logger";
import { invoke } from "@tauri-apps/api/core";

function readLocal(key: string, fallback: string): string {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}
function readLocalBool(key: string, fallback: boolean): boolean {
  try { const v = localStorage.getItem(key); return v !== null ? v === "true" : fallback; } catch { return fallback; }
}
function readLocalNum(key: string, fallback: number): number {
  try { const v = localStorage.getItem(key); return v !== null ? parseInt(v, 10) || fallback : fallback; } catch { return fallback; }
}

export const SettingsWindow: React.FC = () => {
  const [themeId, setThemeId] = useState(() => readLocal(STORAGE_KEYS.THEME_ID, "light"));
  const [fontFamily, setFontFamily] = useState(() => readLocal(STORAGE_KEYS.FONT_FAMILY, "courier-prime-sans") as string);
  const [paperSize, setPaperSize] = useState(() => readLocal(STORAGE_KEYS.PAPER_SIZE, "a4") as string);
  const [typewriterMode, setTypewriterMode] = useState(() => readLocalBool(STORAGE_KEYS.TYPEWRITER_MODE, false));
  const [zoomLevel, setZoomLevel] = useState(() => readLocalNum(STORAGE_KEYS.ZOOM_LEVEL, 100));
  const [appScale, setAppScale] = useState(() => readLocalNum(STORAGE_KEYS.APP_SCALE, 100));
  const [autocompleteEnabled, setAutocompleteEnabled] = useState(() => readLocalBool(STORAGE_KEYS.AUTOCOMPLETE_ENABLED, true));
  const [smartQuotesEnabled, setSmartQuotesEnabled] = useState(() => readLocalBool(STORAGE_KEYS.SMART_QUOTES_ENABLED, true));
  const [matchParenthesesEnabled, setMatchParenthesesEnabled] = useState(() => readLocalBool(STORAGE_KEYS.MATCH_PARENTHESES_ENABLED, true));
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(() => readLocalBool(STORAGE_KEYS.AUTO_SAVE_ENABLED, true));
  const [autoSaveInterval, setAutoSaveInterval] = useState(() => readLocalNum(STORAGE_KEYS.AUTO_SAVE_INTERVAL, 60000));
  const [hideSyntaxEnabled, setHideSyntaxEnabled] = useState(() => readLocalBool(STORAGE_KEYS.HIDE_SYNTAX_ENABLED, false));
  const [hideTagsEnabled, setHideTagsEnabled] = useState(() => readLocalBool(STORAGE_KEYS.HIDE_TAGS_ENABLED, false));
  const [lineFocusEnabled, setLineFocusEnabled] = useState(() => readLocalBool(STORAGE_KEYS.LINE_FOCUS_ENABLED, false));
  const [snapshotsEnabled, setSnapshotsEnabled] = useState(() => readLocalBool(STORAGE_KEYS.SNAPSHOTS_ENABLED, false));
  const [snapshotLocation, setSnapshotLocation] = useState(() => readLocal(STORAGE_KEYS.SNAPSHOT_LOCATION, "project") as "project" | "app_data" | "custom");
  const [snapshotCustomPath, setSnapshotCustomPath] = useState(() => readLocal(STORAGE_KEYS.SNAPSHOT_CUSTOM_PATH, ""));
  const [snapshotAutoEnabled, setSnapshotAutoEnabled] = useState(() => readLocalBool(STORAGE_KEYS.SNAPSHOT_AUTO_ENABLED, false));
  const [snapshotAutoIntervalMinutes, setSnapshotAutoIntervalMinutes] = useState(() => readLocalNum(STORAGE_KEYS.SNAPSHOT_AUTO_INTERVAL, 15));
  const [snapshotOnSave, setSnapshotOnSave] = useState(() => readLocalBool(STORAGE_KEYS.SNAPSHOT_ON_SAVE, false));
  const [snapshotMaxRetention, setSnapshotMaxRetention] = useState(() => readLocalNum(STORAGE_KEYS.SNAPSHOT_MAX_RETENTION, 20));
  const [fountainColorsEnabled, setFountainColorsEnabled] = useState(() => readLocalBool(STORAGE_KEYS.FOUNTAIN_COLORS_ENABLED, true));
  const [iconStyle, setIconStyle] = useState(() => readLocal(STORAGE_KEYS.ICON_STYLE, "duotone") as string);
  const activeFilePathRef = useRef<string>("");
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "snapshots") return 2;
    } catch { void 0; }
    return 0;
  });
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOM_THEMES) ?? "[]"); } catch { return []; }
  });
  const [systemDark, setSystemDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);
  const prefsApplied = useRef(false);

  const initialLoadDone = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const setup = async () => {
      try {
        const { listen, emit } = await import("@tauri-apps/api/event");
        emit("modal:settings:ready");
        const unlisten = await listen<SettingsInitData>("modal:settings:init", (event) => {
          if (initialLoadDone.current) return;
          initialLoadDone.current = true;
          const d = event.payload;
          setThemeId(d.themeId);
          setFontFamily(d.fontFamily);
          setPaperSize(d.paperSize);
          setTypewriterMode(d.typewriterMode);
          setZoomLevel(d.zoomLevel);
          setAppScale(d.appScale);
          setAutocompleteEnabled(d.autocompleteEnabled);
          setSmartQuotesEnabled(d.smartQuotesEnabled);
          setMatchParenthesesEnabled(d.matchParenthesesEnabled);
          setAutoSaveEnabled(d.autoSaveEnabled);
          setAutoSaveInterval(d.autoSaveInterval);
          setHideSyntaxEnabled(d.hideSyntaxEnabled);
          setHideTagsEnabled(d.hideTagsEnabled);
          setLineFocusEnabled(d.lineFocusEnabled);
          setSnapshotsEnabled(d.snapshotsEnabled);
          setSnapshotLocation(d.snapshotLocation);
          setSnapshotCustomPath(d.snapshotCustomPath);
          setSnapshotAutoEnabled(d.snapshotAutoEnabled);
          setSnapshotAutoIntervalMinutes(d.snapshotAutoIntervalMinutes);
          setSnapshotOnSave(d.snapshotOnSave);
          setSnapshotMaxRetention(d.snapshotMaxRetention || 20);
          setFountainColorsEnabled(d.fountainColorsEnabled !== false);
          setIconStyle(d.iconStyle ?? "duotone");
          activeFilePathRef.current = d.activeFilePath || "";
        });
        return unlisten;
      } catch (e) {
        logger.error("settingsWindow", "Failed to set up event listeners:", e);
      }
    };
    let cleanup: (() => void) | undefined;
    setup().then((fn) => { cleanup = fn; });

    initThemeEngine();
    const unsub = onThemeChanged((state) => {
      setThemeId(state.themeId);
      setAppScale(state.appScale);
      try {
        const parsed = JSON.parse(state.customThemes);
        setCustomThemes(parsed);
        localStorage.setItem(STORAGE_KEYS.CUSTOM_THEMES, state.customThemes);
      } catch { void 0; }
    });
    return () => { if (cleanup) cleanup(); unsub(); };
  }, []);

  const applyPrefsRef = useRef(applyPrefs);
  applyPrefsRef.current = applyPrefs;

  useEffect(() => {
    initPrefsEngine().then((prefs) => {
      if (prefsApplied.current) return;
      prefsApplied.current = true;
      applyPrefsRef.current(prefs);
    });
    return onPrefsChanged((prefs) => {
      applyPrefsRef.current(prefs);
    });
  }, []);

  function applyPrefs(prefs: Record<string, string>) {
    if (prefs[STORAGE_KEYS.THEME_ID] !== undefined && prefs[STORAGE_KEYS.THEME_ID] !== themeId) {
      setThemeId(prefs[STORAGE_KEYS.THEME_ID]);
    }
    if (prefs[STORAGE_KEYS.FONT_FAMILY] !== undefined && prefs[STORAGE_KEYS.FONT_FAMILY] !== fontFamily) {
      setFontFamily(prefs[STORAGE_KEYS.FONT_FAMILY] as "courier-prime" | "courier-prime-sans");
    }
    if (prefs[STORAGE_KEYS.PAPER_SIZE] !== undefined && prefs[STORAGE_KEYS.PAPER_SIZE] !== paperSize) {
      setPaperSize(prefs[STORAGE_KEYS.PAPER_SIZE]);
    }
    if (prefs[STORAGE_KEYS.TYPEWRITER_MODE] !== undefined && prefs[STORAGE_KEYS.TYPEWRITER_MODE] !== String(typewriterMode)) {
      setTypewriterMode(prefs[STORAGE_KEYS.TYPEWRITER_MODE] === "true");
    }
    if (prefs[STORAGE_KEYS.ZOOM_LEVEL] !== undefined && prefs[STORAGE_KEYS.ZOOM_LEVEL] !== String(zoomLevel)) {
      setZoomLevel(parseInt(prefs[STORAGE_KEYS.ZOOM_LEVEL], 10));
    }
    if (prefs[STORAGE_KEYS.APP_SCALE] !== undefined && prefs[STORAGE_KEYS.APP_SCALE] !== String(appScale)) {
      setAppScale(parseInt(prefs[STORAGE_KEYS.APP_SCALE], 10));
    }
    if (prefs[STORAGE_KEYS.AUTOCOMPLETE_ENABLED] !== undefined && prefs[STORAGE_KEYS.AUTOCOMPLETE_ENABLED] !== String(autocompleteEnabled)) {
      setAutocompleteEnabled(prefs[STORAGE_KEYS.AUTOCOMPLETE_ENABLED] === "true");
    }
    if (prefs[STORAGE_KEYS.SMART_QUOTES_ENABLED] !== undefined && prefs[STORAGE_KEYS.SMART_QUOTES_ENABLED] !== String(smartQuotesEnabled)) {
      setSmartQuotesEnabled(prefs[STORAGE_KEYS.SMART_QUOTES_ENABLED] === "true");
    }
    if (prefs[STORAGE_KEYS.MATCH_PARENTHESES_ENABLED] !== undefined && prefs[STORAGE_KEYS.MATCH_PARENTHESES_ENABLED] !== String(matchParenthesesEnabled)) {
      setMatchParenthesesEnabled(prefs[STORAGE_KEYS.MATCH_PARENTHESES_ENABLED] === "true");
    }
    if (prefs[STORAGE_KEYS.AUTO_SAVE_ENABLED] !== undefined && prefs[STORAGE_KEYS.AUTO_SAVE_ENABLED] !== String(autoSaveEnabled)) {
      setAutoSaveEnabled(prefs[STORAGE_KEYS.AUTO_SAVE_ENABLED] === "true");
    }
    if (prefs[STORAGE_KEYS.AUTO_SAVE_INTERVAL] !== undefined && prefs[STORAGE_KEYS.AUTO_SAVE_INTERVAL] !== String(autoSaveInterval)) {
      setAutoSaveInterval(parseInt(prefs[STORAGE_KEYS.AUTO_SAVE_INTERVAL], 10));
    }
    if (prefs[STORAGE_KEYS.HIDE_SYNTAX_ENABLED] !== undefined && prefs[STORAGE_KEYS.HIDE_SYNTAX_ENABLED] !== String(hideSyntaxEnabled)) {
      setHideSyntaxEnabled(prefs[STORAGE_KEYS.HIDE_SYNTAX_ENABLED] === "true");
    }
    if (prefs[STORAGE_KEYS.HIDE_TAGS_ENABLED] !== undefined && prefs[STORAGE_KEYS.HIDE_TAGS_ENABLED] !== String(hideTagsEnabled)) {
      setHideTagsEnabled(prefs[STORAGE_KEYS.HIDE_TAGS_ENABLED] === "true");
    }
    if (prefs[STORAGE_KEYS.LINE_FOCUS_ENABLED] !== undefined && prefs[STORAGE_KEYS.LINE_FOCUS_ENABLED] !== String(lineFocusEnabled)) {
      setLineFocusEnabled(prefs[STORAGE_KEYS.LINE_FOCUS_ENABLED] === "true");
    }
    if (prefs[STORAGE_KEYS.SNAPSHOTS_ENABLED] !== undefined && prefs[STORAGE_KEYS.SNAPSHOTS_ENABLED] !== String(snapshotsEnabled)) {
      setSnapshotsEnabled(prefs[STORAGE_KEYS.SNAPSHOTS_ENABLED] === "true");
    }
    if (prefs[STORAGE_KEYS.SNAPSHOT_LOCATION] !== undefined && prefs[STORAGE_KEYS.SNAPSHOT_LOCATION] !== snapshotLocation) {
      setSnapshotLocation(prefs[STORAGE_KEYS.SNAPSHOT_LOCATION] as "project" | "app_data" | "custom");
    }
    if (prefs[STORAGE_KEYS.SNAPSHOT_CUSTOM_PATH] !== undefined && prefs[STORAGE_KEYS.SNAPSHOT_CUSTOM_PATH] !== snapshotCustomPath) {
      setSnapshotCustomPath(prefs[STORAGE_KEYS.SNAPSHOT_CUSTOM_PATH]);
    }
    if (prefs[STORAGE_KEYS.SNAPSHOT_AUTO_ENABLED] !== undefined && prefs[STORAGE_KEYS.SNAPSHOT_AUTO_ENABLED] !== String(snapshotAutoEnabled)) {
      setSnapshotAutoEnabled(prefs[STORAGE_KEYS.SNAPSHOT_AUTO_ENABLED] === "true");
    }
    if (prefs[STORAGE_KEYS.SNAPSHOT_AUTO_INTERVAL] !== undefined && prefs[STORAGE_KEYS.SNAPSHOT_AUTO_INTERVAL] !== String(snapshotAutoIntervalMinutes)) {
      setSnapshotAutoIntervalMinutes(parseInt(prefs[STORAGE_KEYS.SNAPSHOT_AUTO_INTERVAL], 10));
    }
    if (prefs[STORAGE_KEYS.SNAPSHOT_ON_SAVE] !== undefined && prefs[STORAGE_KEYS.SNAPSHOT_ON_SAVE] !== String(snapshotOnSave)) {
      setSnapshotOnSave(prefs[STORAGE_KEYS.SNAPSHOT_ON_SAVE] === "true");
    }
    if (prefs[STORAGE_KEYS.SNAPSHOT_MAX_RETENTION] !== undefined && prefs[STORAGE_KEYS.SNAPSHOT_MAX_RETENTION] !== String(snapshotMaxRetention)) {
      setSnapshotMaxRetention(parseInt(prefs[STORAGE_KEYS.SNAPSHOT_MAX_RETENTION], 10));
    }
    if (prefs[STORAGE_KEYS.FOUNTAIN_COLORS_ENABLED] !== undefined && prefs[STORAGE_KEYS.FOUNTAIN_COLORS_ENABLED] !== String(fountainColorsEnabled)) {
      setFountainColorsEnabled(prefs[STORAGE_KEYS.FOUNTAIN_COLORS_ENABLED] === "true");
    }
    if (prefs[STORAGE_KEYS.ICON_STYLE] !== undefined && prefs[STORAGE_KEYS.ICON_STYLE] !== iconStyle) {
      setIconStyle(prefs[STORAGE_KEYS.ICON_STYLE]);
    }
  }

  const emitUpdate = (storageKey: string, value: string | number | boolean) => {
    (async () => {
      try {
        const { emit } = await import("@tauri-apps/api/event");
        emit("modal:settings:update", { key: storageKey, value });
      } catch { void 0; }
    })();
    setPrefs({ [storageKey]: String(value) });
  };

  const handleClose = async () => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().close();
    } catch {
      window.close();
    }
  };

  const currentThemeConfig = resolveThemeConfig(themeId, customThemes, systemDark);
  const muiTheme = createActOneTheme(currentThemeConfig, appScale, fountainColorsEnabled);

  return (
    <MuiThemeProvider theme={muiTheme}>
      <CssBaseline />
      <Box sx={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
        <TitleBar title="Settings" onClose={handleClose} icon={<SettingsIcon sx={{ fontSize: 16 }} />} />
        <Box sx={{ px: 2, py: 1 }}>
          <ToggleButtonGroup
            value={activeTab}
            exclusive
            onChange={(_, val) => val !== null && setActiveTab(val as number)}
            fullWidth
            size="small"
          >
            <ToggleButton value={0} sx={{ fontSize: 12, py: 0.3 }}>General</ToggleButton>
            <ToggleButton value={1} sx={{ fontSize: 12, py: 0.3 }}>Editor</ToggleButton>
            <ToggleButton value={2} sx={{ fontSize: 12, py: 0.3 }}>Snapshots</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        <Box sx={{ flex: 1, overflow: "auto", px: 2, py: 1.5 }}>
          {activeTab === 0 && (
            <Box>
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 0, p: 1.5, mb: 1.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10, color: 'text.secondary', letterSpacing: 0.5, mb: 1.25, display: 'block' }}>
                  LAYOUT & SCALE
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <Select
                    fullWidth
                    size="small"
                    value={paperSize}
                    onChange={(e) => { const v = e.target.value as string; setPaperSize(v); localStorage.setItem(STORAGE_KEYS.PAPER_SIZE, v); emitUpdate(STORAGE_KEYS.PAPER_SIZE, v); }}
                  >
                    <MenuItem value="letter">Letter</MenuItem>
                    <MenuItem value="a4">A4</MenuItem>
                  </Select>
                </Box>
                <Box sx={{ mt: 1.25 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: 12 }}>Interface Scale</Typography>
                    <Typography variant="body2" color="primary" sx={{ fontWeight: 600, fontSize: 12 }}>{appScale}%</Typography>
                  </Box>
                  <Slider
                    size="small"
                    min={75}
                    max={300}
                    step={5}
                    value={appScale}
                    onChange={(_, val) => { const v = val as number; setAppScale(v); localStorage.setItem(STORAGE_KEYS.APP_SCALE, String(v)); emitUpdate(STORAGE_KEYS.APP_SCALE, v); engineSetTheme({ appScale: v }); }}
                    aria-label="Interface Scale"
                  />
                </Box>
              </Box>
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 0, p: 1.5, mb: 1.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10, color: 'text.secondary', letterSpacing: 0.5, mb: 1, display: 'block' }}>
                  ICON STYLE
                </Typography>
                <Select
                  fullWidth
                  size="small"
                  value={iconStyle}
                  onChange={(e) => { const v = e.target.value as string; setIconStyle(v); localStorage.setItem(STORAGE_KEYS.ICON_STYLE, v); emitUpdate(STORAGE_KEYS.ICON_STYLE, v); }}
                >
                  <MenuItem value="duotone">Dual Tone</MenuItem>
                  <MenuItem value="fill">Solid (Filled)</MenuItem>
                  <MenuItem value="regular">Stroke (Regular)</MenuItem>
                </Select>
              </Box>
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 0, p: 1.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10, color: 'text.secondary', letterSpacing: 0.5, mb: 1, display: 'block' }}>
                  SAVING
                </Typography>
                <FormControlLabel
                  control={<Switch size="small" checked={autoSaveEnabled}
                    onChange={(e) => { const v = e.target.checked; setAutoSaveEnabled(v); localStorage.setItem(STORAGE_KEYS.AUTO_SAVE_ENABLED, String(v)); emitUpdate(STORAGE_KEYS.AUTO_SAVE_ENABLED, v); }}
                  />}
                  label={<Typography variant="body2" sx={{ fontWeight: 500, fontSize: 12 }}>Auto-save</Typography>}
                  sx={{ mx: 0 }}
                />
                {autoSaveEnabled && (
                  <Select
                    fullWidth
                    size="small"
                    value={String(autoSaveInterval)}
                    onChange={(e) => { const v = parseInt(e.target.value, 10); setAutoSaveInterval(v); localStorage.setItem(STORAGE_KEYS.AUTO_SAVE_INTERVAL, String(v)); emitUpdate(STORAGE_KEYS.AUTO_SAVE_INTERVAL, v); }}
                    sx={{ mt: 0.75 }}
                  >
                    <MenuItem value="30000">30 seconds</MenuItem>
                    <MenuItem value="60000">1 minute</MenuItem>
                    <MenuItem value="120000">2 minutes</MenuItem>
                    <MenuItem value="300000">5 minutes</MenuItem>
                  </Select>
                )}
              </Box>
            </Box>
          )}
          {activeTab === 1 && (
            <Box>
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 0, p: 1.5, mb: 1.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10, color: 'text.secondary', letterSpacing: 0.5, mb: 1, display: 'block' }}>
                  TYPOGRAPHY
                </Typography>
                <Select
                  fullWidth
                  size="small"
                  value={fontFamily}
                  onChange={(e) => { const v = e.target.value as string; setFontFamily(v); localStorage.setItem(STORAGE_KEYS.FONT_FAMILY, v); emitUpdate(STORAGE_KEYS.FONT_FAMILY, v); }}
                >
                  <MenuItem value="courier-prime">Courier Prime</MenuItem>
                  <MenuItem value="courier-prime-sans">Courier Prime Sans</MenuItem>
                </Select>
              </Box>
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 0, p: 1.5, mb: 1.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10, color: 'text.secondary', letterSpacing: 0.5, mb: 1, display: 'block' }}>
                  VIEW
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, fontSize: 12 }}>Editor Zoom</Typography>
                  <Typography variant="body2" color="primary" sx={{ fontWeight: 600, fontSize: 12 }}>{zoomLevel}%</Typography>
                </Box>
                <Slider
                  size="small"
                  min={50}
                  max={400}
                  step={10}
                  value={zoomLevel}
                  onChange={(_, val) => { const v = val as number; setZoomLevel(v); localStorage.setItem(STORAGE_KEYS.ZOOM_LEVEL, String(v)); emitUpdate(STORAGE_KEYS.ZOOM_LEVEL, v); }}
                  aria-label="Editor Zoom"
                />
              </Box>
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 0, p: 1.5, mb: 1.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10, color: 'text.secondary', letterSpacing: 0.5, mb: 1, display: 'block' }}>
                  EDITING
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.5, mb: 0.5 }}>
                  <FormControlLabel
                    control={<Switch size="small" checked={typewriterMode}
                      onChange={(e) => { const v = e.target.checked; setTypewriterMode(v); localStorage.setItem(STORAGE_KEYS.TYPEWRITER_MODE, String(v)); emitUpdate(STORAGE_KEYS.TYPEWRITER_MODE, v); }}
                    />}
                    label={<Typography variant="body2" sx={{ fontWeight: 500, fontSize: 12 }}>Typewriter Mode</Typography>}
                    sx={{ mx: 0, flex: 1 }}
                  />
                  <FormControlLabel
                    control={<Switch size="small" checked={autocompleteEnabled}
                      onChange={(e) => { const v = e.target.checked; setAutocompleteEnabled(v); localStorage.setItem(STORAGE_KEYS.AUTOCOMPLETE_ENABLED, String(v)); emitUpdate(STORAGE_KEYS.AUTOCOMPLETE_ENABLED, v); }}
                    />}
                    label={<Typography variant="body2" sx={{ fontWeight: 500, fontSize: 12 }}>Autocomplete</Typography>}
                    sx={{ mx: 0, flex: 1 }}
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <FormControlLabel
                    control={<Switch size="small" checked={smartQuotesEnabled}
                      onChange={(e) => { const v = e.target.checked; setSmartQuotesEnabled(v); localStorage.setItem(STORAGE_KEYS.SMART_QUOTES_ENABLED, String(v)); emitUpdate(STORAGE_KEYS.SMART_QUOTES_ENABLED, v); }}
                    />}
                    label={<Typography variant="body2" sx={{ fontWeight: 500, fontSize: 12 }}>Smart Quotes</Typography>}
                    sx={{ mx: 0, flex: 1 }}
                  />
                  <FormControlLabel
                    control={<Switch size="small" checked={matchParenthesesEnabled}
                      onChange={(e) => { const v = e.target.checked; setMatchParenthesesEnabled(v); localStorage.setItem(STORAGE_KEYS.MATCH_PARENTHESES_ENABLED, String(v)); emitUpdate(STORAGE_KEYS.MATCH_PARENTHESES_ENABLED, v); }}
                    />}
                    label={<Typography variant="body2" sx={{ fontWeight: 500, fontSize: 12 }}>Auto-match ( )</Typography>}
                    sx={{ mx: 0, flex: 1 }}
                  />
                </Box>
              </Box>
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 0, p: 1.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10, color: 'text.secondary', letterSpacing: 0.5, mb: 1, display: 'block' }}>
                  DISPLAY
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <FormControlLabel
                    control={<Switch size="small" checked={hideSyntaxEnabled}
                      onChange={(e) => { const v = e.target.checked; setHideSyntaxEnabled(v); localStorage.setItem(STORAGE_KEYS.HIDE_SYNTAX_ENABLED, String(v)); emitUpdate(STORAGE_KEYS.HIDE_SYNTAX_ENABLED, v); }}
                    />}
                    label={<Typography variant="body2" sx={{ fontWeight: 500, fontSize: 12 }}>Hide Markup</Typography>}
                    sx={{ mx: 0, flex: 1 }}
                  />
                  <FormControlLabel
                    control={<Switch size="small" checked={lineFocusEnabled}
                      onChange={(e) => { const v = e.target.checked; setLineFocusEnabled(v); localStorage.setItem(STORAGE_KEYS.LINE_FOCUS_ENABLED, String(v)); emitUpdate(STORAGE_KEYS.LINE_FOCUS_ENABLED, v); }}
                    />}
                    label={<Typography variant="body2" sx={{ fontWeight: 500, fontSize: 12 }}>Focus Mode</Typography>}
                    sx={{ mx: 0, flex: 1 }}
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5, mt: 0.5 }}>
                  <FormControlLabel
                    control={<Switch size="small" checked={hideTagsEnabled}
                      onChange={(e) => { const v = e.target.checked; setHideTagsEnabled(v); localStorage.setItem(STORAGE_KEYS.HIDE_TAGS_ENABLED, String(v)); emitUpdate(STORAGE_KEYS.HIDE_TAGS_ENABLED, v); }}
                    />}
                    label={<Typography variant="body2" sx={{ fontWeight: 500, fontSize: 12 }}>Hide the Tags</Typography>}
                    sx={{ mx: 0, flex: 1 }}
                  />
                  <FormControlLabel
                    control={<Switch size="small" checked={fountainColorsEnabled}
                      onChange={(e) => { const v = e.target.checked; setFountainColorsEnabled(v); localStorage.setItem(STORAGE_KEYS.FOUNTAIN_COLORS_ENABLED, String(v)); emitUpdate(STORAGE_KEYS.FOUNTAIN_COLORS_ENABLED, v); }}
                    />}
                    label={<Typography variant="body2" sx={{ fontWeight: 500, fontSize: 12 }}>Syntax Colors</Typography>}
                    sx={{ mx: 0, flex: 1 }}
                  />
                </Box>
              </Box>
            </Box>
          )}
          {activeTab === 2 && (
            <Box>
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 0, p: 1.5, mb: 1.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10, color: 'text.secondary', letterSpacing: 0.5, mb: 1, display: 'block' }}>
                  GENERAL
                </Typography>
                <FormControlLabel
                  control={<Switch size="small" checked={snapshotsEnabled} onChange={(e) => { const v = e.target.checked; setSnapshotsEnabled(v); localStorage.setItem(STORAGE_KEYS.SNAPSHOTS_ENABLED, String(v)); emitUpdate(STORAGE_KEYS.SNAPSHOTS_ENABLED, v); }} />}
                  label={<Typography variant="body2" sx={{ fontWeight: 500, fontSize: 12 }}>Enable Snapshots</Typography>}
                  sx={{ mx: 0 }}
                />
              </Box>

              {snapshotsEnabled && (
                <>
                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 0, p: 1.5, mb: 1.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10, color: 'text.secondary', letterSpacing: 0.5, mb: 1, display: 'block' }}>
                      SAVE LOCATION
                    </Typography>
                    <Select
                      fullWidth
                      size="small"
                      value={snapshotLocation}
                      onChange={(e) => { const v = e.target.value as "project" | "app_data" | "custom"; setSnapshotLocation(v); localStorage.setItem(STORAGE_KEYS.SNAPSHOT_LOCATION, v); emitUpdate(STORAGE_KEYS.SNAPSHOT_LOCATION, v); }}
                    >
                      <MenuItem value="project">Project folder (.snapshots/)</MenuItem>
                      <MenuItem value="app_data">App data folder</MenuItem>
                      <MenuItem value="custom">Custom folder...</MenuItem>
                    </Select>
                    {snapshotLocation === "custom" && (
                      <Box sx={{ display: 'flex', gap: 0.75, mt: 0.75 }}>
                        <TextField
                          fullWidth
                          size="small"
                          value={snapshotCustomPath}
                          onChange={(e) => { const v = e.target.value; setSnapshotCustomPath(v); localStorage.setItem(STORAGE_KEYS.SNAPSHOT_CUSTOM_PATH, v); emitUpdate(STORAGE_KEYS.SNAPSHOT_CUSTOM_PATH, v); }}
                          placeholder="/path/to/snapshots"
                          sx={{ '& input': { fontSize: 12, py: 0.6 } }}
                        />
                      </Box>
                    )}
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={async () => {
                        try {
                          const path = await invoke<string>("get_snapshot_folder_path", { filePath: activeFilePathRef.current });
                          await invoke("open_folder", { path });
                        } catch (e) {
                          logger.error("settingsWindow", "Failed to open snapshots folder", e);
                        }
                      }}
                      sx={{ mt: 1.5, fontSize: '11px', textTransform: 'none', borderRadius: 0 }}
                    >
                      Open Snapshots Folder
                    </Button>
                  </Box>

                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 0, p: 1.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10, color: 'text.secondary', letterSpacing: 0.5, mb: 1, display: 'block' }}>
                      AUTO-SNAPSHOT
                    </Typography>
                    <FormControlLabel
                      control={<Switch size="small" checked={snapshotAutoEnabled} onChange={(e) => { const v = e.target.checked; setSnapshotAutoEnabled(v); localStorage.setItem(STORAGE_KEYS.SNAPSHOT_AUTO_ENABLED, String(v)); emitUpdate(STORAGE_KEYS.SNAPSHOT_AUTO_ENABLED, v); }} />}
                      label={<Typography variant="body2" sx={{ fontWeight: 500, fontSize: 12 }}>Auto-snapshot</Typography>}
                      sx={{ mx: 0 }}
                    />
                    {snapshotAutoEnabled && (
                      <Select
                        fullWidth
                        size="small"
                        value={String(snapshotAutoIntervalMinutes)}
                        onChange={(e) => { const v = parseInt(e.target.value, 10); setSnapshotAutoIntervalMinutes(v); localStorage.setItem(STORAGE_KEYS.SNAPSHOT_AUTO_INTERVAL, String(v)); emitUpdate(STORAGE_KEYS.SNAPSHOT_AUTO_INTERVAL, v); }}
                        sx={{ mt: 0.75 }}
                      >
                        <MenuItem value="1">Every 1 minute</MenuItem>
                        <MenuItem value="5">Every 5 minutes</MenuItem>
                        <MenuItem value="10">Every 10 minutes</MenuItem>
                        <MenuItem value="15">Every 15 minutes</MenuItem>
                        <MenuItem value="30">Every 30 minutes</MenuItem>
                        <MenuItem value="60">Every 60 minutes</MenuItem>
                      </Select>
                    )}
                    <FormControlLabel
                      control={<Switch size="small" checked={snapshotOnSave} onChange={(e) => { const v = e.target.checked; setSnapshotOnSave(v); localStorage.setItem(STORAGE_KEYS.SNAPSHOT_ON_SAVE, String(v)); emitUpdate(STORAGE_KEYS.SNAPSHOT_ON_SAVE, v); }} />}
                      label={<Typography variant="body2" sx={{ fontWeight: 500, fontSize: 12 }}>Snapshot on every save</Typography>}
                      sx={{ mx: 0, mt: 0.5 }}
                    />
                    <Box sx={{ mt: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: 12 }}>Max auto-snapshots to keep</Typography>
                        <Typography variant="body2" color="primary" sx={{ fontWeight: 600, fontSize: 12 }}>{snapshotMaxRetention}</Typography>
                      </Box>
                      <Slider
                        size="small"
                        min={5}
                        max={100}
                        step={5}
                        value={snapshotMaxRetention}
                        onChange={(_, val) => {
                          const v = val as number;
                          setSnapshotMaxRetention(v);
                          localStorage.setItem(STORAGE_KEYS.SNAPSHOT_MAX_RETENTION, String(v));
                          emitUpdate(STORAGE_KEYS.SNAPSHOT_MAX_RETENTION, v);
                        }}
                      />
                    </Box>
                  </Box>
                </>
              )}
            </Box>
          )}
        </Box>
      </Box>
    </MuiThemeProvider>
  );
};

interface SettingsInitData {
  themeId: string;
  fontFamily: string;
  paperSize: string;
  typewriterMode: boolean;
  zoomLevel: number;
  appScale: number;
  autocompleteEnabled: boolean;
  smartQuotesEnabled: boolean;
  matchParenthesesEnabled: boolean;
  autoSaveEnabled: boolean;
  autoSaveInterval: number;
  hideSyntaxEnabled: boolean;
  hideTagsEnabled: boolean;
  lineFocusEnabled: boolean;
  snapshotsEnabled: boolean;
  snapshotLocation: "project" | "app_data" | "custom";
  snapshotCustomPath: string;
  snapshotAutoEnabled: boolean;
  snapshotAutoIntervalMinutes: number;
  snapshotOnSave: boolean;
  snapshotMaxRetention: number;
  fountainColorsEnabled: boolean;
  iconStyle?: string;
  activeFilePath?: string;
}
