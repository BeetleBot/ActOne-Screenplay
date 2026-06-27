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
} from "@mui/material";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { TitleBar } from "./TitleBar";
import { createActOneTheme, themes } from "../theme";
import { initThemeEngine, setThemeState as engineSetTheme, onThemeChanged } from "../theme/ThemeEngine";
import { STORAGE_KEYS } from "../constants";
import { logger } from "../utils/logger";

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
  const [lineFocusEnabled, setLineFocusEnabled] = useState(() => readLocalBool(STORAGE_KEYS.LINE_FOCUS_ENABLED, false));
  const [activeTab, setActiveTab] = useState(0);

  const initialLoadDone = useRef(false);

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
          setLineFocusEnabled(d.lineFocusEnabled);
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
    });
    return () => { if (cleanup) cleanup(); unsub(); };
  }, []);

  const emitUpdate = (key: string, value: string | number | boolean) => {
    (async () => {
      try {
        const { emit } = await import("@tauri-apps/api/event");
        emit("modal:settings:update", { key, value });
      } catch {}
    })();
  };

  const handleClose = async () => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().close();
    } catch {
      window.close();
    }
  };

  const currentThemeConfig = themes.find(t => t.id === themeId) || themes[0];
  const muiTheme = createActOneTheme(currentThemeConfig, appScale);

  return (
    <MuiThemeProvider theme={muiTheme}>
      <CssBaseline />
      <Box sx={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
        <TitleBar title="Settings" onClose={handleClose} />
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
          </ToggleButtonGroup>
        </Box>
        <Box sx={{ flex: 1, overflow: "auto", px: 2, py: 1.5 }}>
          {activeTab === 0 && (
            <Box>
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5, mb: 1.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10, color: 'text.secondary', letterSpacing: 0.5, mb: 1.25, display: 'block' }}>
                  DISPLAY
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <Select
                    fullWidth
                    size="small"
                    value={themeId}
                    onChange={(e) => { const v = e.target.value as string; setThemeId(v); localStorage.setItem(STORAGE_KEYS.THEME_ID, v); emitUpdate("themeId", v); engineSetTheme({ themeId: v }); }}
                  >
                    {themes.map((t) => (
                      <MenuItem key={t.id} value={t.id} sx={{ gap: 1.5 }}>
                        <Box sx={{ width: 18, height: 18, borderRadius: '5px', bgcolor: t.colors.sidebar, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                          <Box sx={{ width: 7, height: 7, borderRadius: '2px', bgcolor: t.colors.accent }} />
                        </Box>
                        {t.name}
                      </MenuItem>
                    ))}
                  </Select>
                  <Select
                    fullWidth
                    size="small"
                    value={paperSize}
                    onChange={(e) => { const v = e.target.value as string; setPaperSize(v); localStorage.setItem(STORAGE_KEYS.PAPER_SIZE, v); emitUpdate("paperSize", v); }}
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
                    onChange={(_, val) => { const v = val as number; setAppScale(v); localStorage.setItem(STORAGE_KEYS.APP_SCALE, String(v)); emitUpdate("appScale", v); engineSetTheme({ appScale: v }); }}
                    aria-label="Interface Scale"
                  />
                </Box>
              </Box>
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10, color: 'text.secondary', letterSpacing: 0.5, mb: 1, display: 'block' }}>
                  SAVING
                </Typography>
                <FormControlLabel
                  control={<Switch size="small" checked={autoSaveEnabled}
                    onChange={(e) => { const v = e.target.checked; setAutoSaveEnabled(v); localStorage.setItem(STORAGE_KEYS.AUTO_SAVE_ENABLED, String(v)); emitUpdate("autoSaveEnabled", v); }}
                  />}
                  label={<Typography variant="body2" sx={{ fontWeight: 500, fontSize: 12 }}>Auto-save</Typography>}
                  sx={{ mx: 0 }}
                />
                {autoSaveEnabled && (
                  <Select
                    fullWidth
                    size="small"
                    value={String(autoSaveInterval)}
                    onChange={(e) => { const v = parseInt(e.target.value, 10); setAutoSaveInterval(v); localStorage.setItem(STORAGE_KEYS.AUTO_SAVE_INTERVAL, String(v)); emitUpdate("autoSaveInterval", v); }}
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
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5, mb: 1.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10, color: 'text.secondary', letterSpacing: 0.5, mb: 1, display: 'block' }}>
                  TYPOGRAPHY
                </Typography>
                <Select
                  fullWidth
                  size="small"
                  value={fontFamily}
                  onChange={(e) => { const v = e.target.value as string; setFontFamily(v); localStorage.setItem(STORAGE_KEYS.FONT_FAMILY, v); emitUpdate("fontFamily", v); }}
                >
                  <MenuItem value="courier-prime">Courier Prime</MenuItem>
                  <MenuItem value="courier-prime-sans">Courier Prime Sans</MenuItem>
                </Select>
              </Box>
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5, mb: 1.5 }}>
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
                  onChange={(_, val) => { const v = val as number; setZoomLevel(v); localStorage.setItem(STORAGE_KEYS.ZOOM_LEVEL, String(v)); emitUpdate("zoomLevel", v); }}
                  aria-label="Editor Zoom"
                />
              </Box>
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5, mb: 1.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10, color: 'text.secondary', letterSpacing: 0.5, mb: 1, display: 'block' }}>
                  EDITING
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.5, mb: 0.5 }}>
                  <FormControlLabel
                    control={<Switch size="small" checked={typewriterMode}
                      onChange={(e) => { const v = e.target.checked; setTypewriterMode(v); localStorage.setItem(STORAGE_KEYS.TYPEWRITER_MODE, String(v)); emitUpdate("typewriterMode", v); }}
                    />}
                    label={<Typography variant="body2" sx={{ fontWeight: 500, fontSize: 12 }}>Typewriter Mode</Typography>}
                    sx={{ mx: 0, flex: 1 }}
                  />
                  <FormControlLabel
                    control={<Switch size="small" checked={autocompleteEnabled}
                      onChange={(e) => { const v = e.target.checked; setAutocompleteEnabled(v); localStorage.setItem(STORAGE_KEYS.AUTOCOMPLETE_ENABLED, String(v)); emitUpdate("autocompleteEnabled", v); }}
                    />}
                    label={<Typography variant="body2" sx={{ fontWeight: 500, fontSize: 12 }}>Autocomplete</Typography>}
                    sx={{ mx: 0, flex: 1 }}
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <FormControlLabel
                    control={<Switch size="small" checked={smartQuotesEnabled}
                      onChange={(e) => { const v = e.target.checked; setSmartQuotesEnabled(v); localStorage.setItem(STORAGE_KEYS.SMART_QUOTES_ENABLED, String(v)); emitUpdate("smartQuotesEnabled", v); }}
                    />}
                    label={<Typography variant="body2" sx={{ fontWeight: 500, fontSize: 12 }}>Smart Quotes</Typography>}
                    sx={{ mx: 0, flex: 1 }}
                  />
                  <FormControlLabel
                    control={<Switch size="small" checked={matchParenthesesEnabled}
                      onChange={(e) => { const v = e.target.checked; setMatchParenthesesEnabled(v); localStorage.setItem(STORAGE_KEYS.MATCH_PARENTHESES_ENABLED, String(v)); emitUpdate("matchParenthesesEnabled", v); }}
                    />}
                    label={<Typography variant="body2" sx={{ fontWeight: 500, fontSize: 12 }}>Auto-match ( )</Typography>}
                    sx={{ mx: 0, flex: 1 }}
                  />
                </Box>
              </Box>
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10, color: 'text.secondary', letterSpacing: 0.5, mb: 1, display: 'block' }}>
                  DISPLAY
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <FormControlLabel
                    control={<Switch size="small" checked={hideSyntaxEnabled}
                      onChange={(e) => { const v = e.target.checked; setHideSyntaxEnabled(v); localStorage.setItem(STORAGE_KEYS.HIDE_SYNTAX_ENABLED, String(v)); emitUpdate("hideSyntaxEnabled", v); }}
                    />}
                    label={<Typography variant="body2" sx={{ fontWeight: 500, fontSize: 12 }}>Hide Markup</Typography>}
                    sx={{ mx: 0, flex: 1 }}
                  />
                  <FormControlLabel
                    control={<Switch size="small" checked={lineFocusEnabled}
                      onChange={(e) => { const v = e.target.checked; setLineFocusEnabled(v); localStorage.setItem(STORAGE_KEYS.LINE_FOCUS_ENABLED, String(v)); emitUpdate("lineFocusEnabled", v); }}
                    />}
                    label={<Typography variant="body2" sx={{ fontWeight: 500, fontSize: 12 }}>Focus Mode</Typography>}
                    sx={{ mx: 0, flex: 1 }}
                  />
                </Box>
              </Box>
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
  lineFocusEnabled: boolean;
}
