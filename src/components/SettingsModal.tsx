import React, { useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import { useTheme } from "../context/ThemeContext";
import { useAppContext } from "../context/AppContext";
import { themes } from "../theme/muiTheme";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Tabs,
  Tab,
  Box,
  Typography,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
} from "@mui/material";

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { theme, setTheme } = useTheme();
  const {
    fontFamily,
    setFontFamily,
    paperSize,
    setPaperSize,
    typewriterMode,
    setTypewriterMode,
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
    autoSaveEnabled,
    setAutoSaveEnabled,
    autoSaveInterval,
    setAutoSaveInterval
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<number>(0);

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ m: 0, p: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>Settings</Typography>
        <IconButton aria-label="close" onClick={onClose} sx={{ color: "text.secondary" }}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)} variant="fullWidth">
          <Tab label="General" />
          <Tab label="Editor" />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 3, minHeight: 340 }}>
        {activeTab === 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="theme-select-label">Visual Theme</InputLabel>
              <Select
                labelId="theme-select-label"
                value={theme}
                label="Visual Theme"
                onChange={(e) => setTheme(e.target.value as any)}
              >
                {themes.map((t) => (
                  <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel id="paper-size-select-label">Paper/Page Size</InputLabel>
              <Select
                labelId="paper-size-select-label"
                value={paperSize}
                label="Paper/Page Size"
                onChange={(e) => setPaperSize(e.target.value as any)}
              >
                <MenuItem value="letter">Letter (US)</MenuItem>
                <MenuItem value="a4">A4 (Standard)</MenuItem>
              </Select>
            </FormControl>

            <FormControlLabel
              control={<Switch checked={autoSaveEnabled} onChange={(e) => setAutoSaveEnabled(e.target.checked)} />}
              label={
                <Box sx={{ ml: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>Auto-save</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Automatically save changes periodically</Typography>
                </Box>
              }
            />

            {autoSaveEnabled && (
              <FormControl fullWidth size="small">
                <InputLabel id="autosave-interval-label">Auto-save Interval</InputLabel>
                <Select
                  labelId="autosave-interval-label"
                  value={String(autoSaveInterval)}
                  label="Auto-save Interval"
                  onChange={(e) => setAutoSaveInterval(parseInt(e.target.value, 10))}
                >
                  <MenuItem value="30000">30 seconds</MenuItem>
                  <MenuItem value="60000">1 minute</MenuItem>
                  <MenuItem value="120000">2 minutes</MenuItem>
                  <MenuItem value="300000">5 minutes</MenuItem>
                </Select>
              </FormControl>
            )}
          </Box>
        )}

        {activeTab === 1 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="font-family-label">Font Style</InputLabel>
              <Select
                labelId="font-family-label"
                value={fontFamily}
                label="Font Style"
                onChange={(e) => setFontFamily(e.target.value as any)}
              >
                <MenuItem value="courier-prime">Courier Prime (Serif)</MenuItem>
                <MenuItem value="courier-prime-sans">Courier Prime Sans</MenuItem>
              </Select>
            </FormControl>

            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>Editor Zoom</Typography>
                <Typography variant="body2" color="primary" sx={{ fontWeight: 600 }}>{zoomLevel}%</Typography>
              </Box>
              <Slider
                min={50}
                max={200}
                step={10}
                value={zoomLevel}
                onChange={(_, val) => setZoomLevel(val as number)}
                valueLabelDisplay="auto"
              />
            </Box>

            <FormControlLabel
              control={<Switch checked={typewriterMode} onChange={(e) => setTypewriterMode(e.target.checked)} />}
              label={
                <Box sx={{ ml: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>Typewriter Mode</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Keep the typing line centered vertically</Typography>
                </Box>
              }
            />

            <FormControlLabel
              control={<Switch checked={autocompleteEnabled} onChange={(e) => setAutocompleteEnabled(e.target.checked)} />}
              label={
                <Box sx={{ ml: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>Character/Scene Autocomplete</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Smart suggestions based on Fountain structure</Typography>
                </Box>
              }
            />

            <FormControlLabel
              control={<Switch checked={smartQuotesEnabled} onChange={(e) => setSmartQuotesEnabled(e.target.checked)} />}
              label={
                <Box sx={{ ml: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>Smart Quotes</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Convert straight quotes to curly quotes</Typography>
                </Box>
              }
            />

            <FormControlLabel
              control={<Switch checked={matchParenthesesEnabled} onChange={(e) => setMatchParenthesesEnabled(e.target.checked)} />}
              label={
                <Box sx={{ ml: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>Auto-match Parentheses</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Automatically insert closing parenthesis</Typography>
                </Box>
              }
            />

            <FormControlLabel
              control={<Switch checked={hideFountainMarkupEnabled} onChange={(e) => setHideFountainMarkupEnabled(e.target.checked)} />}
              label={
                <Box sx={{ ml: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>Hide Fountain Markup</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Hide formatting markup tags inside the editor</Typography>
                </Box>
              }
            />
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};
