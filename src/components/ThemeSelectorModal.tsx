import React, { useState, useCallback, useRef, useEffect } from "react";
import CloseIcon from "@mui/icons-material/Close";
import CheckIcon from "@mui/icons-material/Check";
import { useTheme } from "../context/ThemeContext";
import { themes } from "../theme/muiTheme";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Typography,
  ButtonBase,
} from "@mui/material";

interface ThemeSelectorModalProps {
  onClose: () => void;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({ onClose }) => {
  const { theme, setTheme } = useTheme();
  const [focusedIdx, setFocusedIdx] = useState(() => {
    const idx = themes.findIndex(t => t.id === theme);
    return idx >= 0 ? idx : 0;
  });
  const gridRef = useRef<HTMLDivElement>(null);

  const scrollIntoView = useCallback((idx: number) => {
    const el = gridRef.current?.querySelector(`[data-theme-idx="${idx}"]`) as HTMLElement;
    el?.scrollIntoView({ block: "nearest" });
  }, []);

  useEffect(() => {
    scrollIntoView(focusedIdx);
  }, [focusedIdx, scrollIntoView]);

  const handleGridKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIdx(prev => Math.min(themes.length - 1, prev + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIdx(prev => Math.max(0, prev - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setFocusedIdx(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setFocusedIdx(themes.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (focusedIdx >= 0 && focusedIdx < themes.length) {
        setTheme(themes[focusedIdx].id);
      }
    }
  }, [focusedIdx, setTheme]);

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ m: 0, p: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>Select Theme</Typography>
        <IconButton aria-label="close" onClick={onClose} sx={{ color: "text.secondary" }}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 2, maxHeight: 400, overflowY: "auto" }}>
        <Box
          ref={gridRef}
          role="listbox"
          tabIndex={0}
          onKeyDown={handleGridKeyDown}
          sx={{ outline: "none", display: "flex", flexDirection: "column", gap: 1 }}
        >
          {themes.map((t, idx) => {
            const isActive = theme === t.id;
            const isFocused = idx === focusedIdx;
            return (
              <ButtonBase
                key={t.id}
                data-theme-idx={idx}
                onClick={() => setTheme(t.id)}
                onFocus={() => setFocusedIdx(idx)}
                onMouseEnter={() => setFocusedIdx(idx)}
                role="option"
                aria-selected={isActive}
                sx={{
                  display: "flex",
                  width: "100%",
                  alignItems: "center",
                  justifyContent: "space-between",
                  p: 1.5,
                  borderRadius: 0,
                  textAlign: "left",
                  bgcolor: isActive ? "action.selected" : "transparent",
                  border: "1px solid",
                  borderColor: isFocused ? "primary.main" : "divider",
                  transition: "all 0.15s ease",
                  "&:hover": {
                    bgcolor: "action.hover",
                  },
                }}
              >
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary" }}>
                    {t.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                    {t.desc}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 0.5, mt: 0.5 }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: t.colors.bg, border: "1px solid", borderColor: "divider" }} title="Canvas BG" />
                    <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: t.colors.sidebar, border: "1px solid", borderColor: "divider" }} title="Sidebar BG" />
                    <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: t.colors.text, border: "1px solid", borderColor: "divider" }} title="Text color" />
                    <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: t.colors.accent, border: "1px solid", borderColor: "divider" }} title="Accent color" />
                  </Box>
                </Box>
                <Box sx={{ ml: 2, flexShrink: 0 }}>
                  {isActive && (
                    <Box sx={{ color: "primary.main", display: "flex" }}>
                      <CheckIcon sx={{ fontSize: 18, fontWeight: 700 }} />
                    </Box>
                  )}
                </Box>
              </ButtonBase>
            );
          })}
        </Box>
      </DialogContent>
    </Dialog>
  );
};
export default ThemeSelectorModal;
