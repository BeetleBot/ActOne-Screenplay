import React, { useState } from "react";
import { useTheme, useUI } from "../context";
import { themes } from "../theme";
import { CloseIcon, SettingsIcon } from "./Icons";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
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
    appScale,
    setAppScale,
    autocompleteEnabled,
    setAutocompleteEnabled,
    smartQuotesEnabled,
    setSmartQuotesEnabled,
    matchParenthesesEnabled,
    setMatchParenthesesEnabled,
    autoSaveEnabled,
    setAutoSaveEnabled,
    autoSaveInterval,
    setAutoSaveInterval,
    hideSyntaxEnabled,
    setHideSyntaxEnabled,
    lineFocusEnabled,
    setLineFocusEnabled,
  } = useUI();

  const [activeTab, setActiveTab] = useState<number>(0);

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs" disableScrollLock transitionDuration={200} sx={{ '& .MuiDialog-paper': { zoom: `${appScale}%`, borderRadius: '12px' } }}>
      <DialogTitle sx={{ m: 0, px: 2, py: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <SettingsIcon sx={{ fontSize: 18 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: 14 }}>Settings</Typography>
        </Box>
        <IconButton aria-label="close" onClick={onClose} sx={{ color: "text.secondary" }}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

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

      <DialogContent dividers sx={{ px: 2, py: 1.5, maxHeight: `${(70 * 100) / appScale}vh` }}>
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
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as string)}
                  sx={{
                    fontSize: 12,
                    '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                    bgcolor: 'action.hover', borderRadius: '6px',
                    '&:hover': { bgcolor: 'action.selected' },
                    '& .MuiSelect-select': { py: 0.6, px: 1.25 },
                  }}
                  MenuProps={{
                    slotProps: {
                      paper: { sx: { '& .MuiMenuItem-root': { fontSize: 12, py: 0.4, minHeight: 30 } } }
                    }
                  }}
                >
                  {themes.map((t) => (
                    <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                  ))}
                </Select>
                <Select
                  fullWidth
                  size="small"
                  value={paperSize}
                  onChange={(e) => setPaperSize(e.target.value as 'letter' | 'a4')}
                  sx={{
                    fontSize: 12,
                    '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                    bgcolor: 'action.hover', borderRadius: '6px',
                    '&:hover': { bgcolor: 'action.selected' },
                    '& .MuiSelect-select': { py: 0.6, px: 1.25 },
                  }}
                  MenuProps={{
                    slotProps: {
                      paper: { sx: { '& .MuiMenuItem-root': { fontSize: 12, py: 0.4, minHeight: 30 } } }
                    }
                  }}
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
                  onChange={(_, val) => setAppScale(val as number)}
                  aria-label="Interface Scale"
                />
              </Box>
            </Box>

            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10, color: 'text.secondary', letterSpacing: 0.5, mb: 1, display: 'block' }}>
                SAVING
              </Typography>
              <FormControlLabel
                control={<Switch size="small" checked={autoSaveEnabled} onChange={(e) => setAutoSaveEnabled(e.target.checked)} />}
                label={<Typography variant="body2" sx={{ fontWeight: 500, fontSize: 12 }}>Auto-save</Typography>}
                sx={{ mx: 0 }}
              />
              {autoSaveEnabled && (
                <Select
                  fullWidth
                  size="small"
                  value={String(autoSaveInterval)}
                  onChange={(e) => setAutoSaveInterval(parseInt(e.target.value, 10))}
                  sx={{
                    fontSize: 12, mt: 0.75,
                    '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                    bgcolor: 'action.hover', borderRadius: '6px',
                    '&:hover': { bgcolor: 'action.selected' },
                    '& .MuiSelect-select': { py: 0.6, px: 1.25 },
                  }}
                  MenuProps={{
                    slotProps: {
                      paper: { sx: { '& .MuiMenuItem-root': { fontSize: 12, py: 0.4, minHeight: 30 } } }
                    }
                  }}
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
                onChange={(e) => setFontFamily(e.target.value as 'courier-prime' | 'courier-prime-sans')}
                sx={{
                  fontSize: 12,
                  '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                  bgcolor: 'action.hover', borderRadius: '6px',
                  '&:hover': { bgcolor: 'action.selected' },
                  '& .MuiSelect-select': { py: 0.6, px: 1.25 },
                }}
                MenuProps={{
                  slotProps: {
                    paper: { sx: { '& .MuiMenuItem-root': { fontSize: 12, py: 0.4, minHeight: 30 } } }
                  }
                }}
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
                onChange={(_, val) => setZoomLevel(val as number)}
                aria-label="Editor Zoom"
              />
            </Box>

            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5, mb: 1.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10, color: 'text.secondary', letterSpacing: 0.5, mb: 1, display: 'block' }}>
                EDITING
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5, mb: 0.5 }}>
                <FormControlLabel
                  control={<Switch size="small" checked={typewriterMode} onChange={(e) => setTypewriterMode(e.target.checked)} />}
                  label={<Typography variant="body2" sx={{ fontWeight: 500, fontSize: 12 }}>Typewriter Mode</Typography>}
                  sx={{ mx: 0, flex: 1 }}
                />
                <FormControlLabel
                  control={<Switch size="small" checked={autocompleteEnabled} onChange={(e) => setAutocompleteEnabled(e.target.checked)} />}
                  label={<Typography variant="body2" sx={{ fontWeight: 500, fontSize: 12 }}>Autocomplete</Typography>}
                  sx={{ mx: 0, flex: 1 }}
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <FormControlLabel
                  control={<Switch size="small" checked={smartQuotesEnabled} onChange={(e) => setSmartQuotesEnabled(e.target.checked)} />}
                  label={<Typography variant="body2" sx={{ fontWeight: 500, fontSize: 12 }}>Smart Quotes</Typography>}
                  sx={{ mx: 0, flex: 1 }}
                />
                <FormControlLabel
                  control={<Switch size="small" checked={matchParenthesesEnabled} onChange={(e) => setMatchParenthesesEnabled(e.target.checked)} />}
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
                  control={<Switch size="small" checked={hideSyntaxEnabled} onChange={(e) => setHideSyntaxEnabled(e.target.checked)} />}
                  label={<Typography variant="body2" sx={{ fontWeight: 500, fontSize: 12 }}>Hide Markup</Typography>}
                  sx={{ mx: 0, flex: 1 }}
                />
                <FormControlLabel
                  control={<Switch size="small" checked={lineFocusEnabled} onChange={(e) => setLineFocusEnabled(e.target.checked)} />}
                  label={<Typography variant="body2" sx={{ fontWeight: 500, fontSize: 12 }}>Focus Mode</Typography>}
                  sx={{ mx: 0, flex: 1 }}
                />
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};
