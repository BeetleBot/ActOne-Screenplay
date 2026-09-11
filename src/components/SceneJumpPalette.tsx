import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Box,
  Dialog,
  DialogContent,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  InputBase,
  Chip,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useFile, useEditor } from "../context";
import { LineType } from "../parser";
import { getSceneTitle } from "../utils/text";
import { isProseScript } from "../utils/scriptMode";
import { SearchIcon, ViewAgendaIcon, BeenhereIcon } from "./Icons";

export interface SceneJumpItem {
  id: string;
  lineNumber: number;
  title: string;
  sceneNumber?: string;
  setting?: string | null;
  location?: string | null;
  timeOfDay?: string | null;
  color?: string;
  storylines?: string[];
  synopsis?: string;
  isProse?: boolean;
}

interface SceneJumpPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function fuzzyMatchScore(query: string, target: string): number {
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase();
  if (!q) return 1;
  if (t === q) return 1000;
  if (t.startsWith(q)) return 500 + (100 - t.length);

  const exactIdx = t.indexOf(q);
  if (exactIdx !== -1) return 300 - exactIdx;

  const words = q.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    let allFound = true;
    let score = 200;
    for (const w of words) {
      const idx = t.indexOf(w);
      if (idx === -1) {
        allFound = false;
        break;
      }
      score += 20 - Math.min(idx, 15);
    }
    if (allFound) return score;
  }

  let qIdx = 0;
  let tIdx = 0;
  let score = 0;
  let consecutive = 0;

  while (qIdx < q.length && tIdx < t.length) {
    if (q[qIdx] === t[tIdx]) {
      score += 10 + consecutive * 5;
      consecutive++;
      qIdx++;
    } else {
      consecutive = 0;
    }
    tIdx++;
  }

  return qIdx === q.length ? score : 0;
}

export const SceneJumpPalette: React.FC<SceneJumpPaletteProps> = ({
  isOpen,
  onClose,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { parsedDoc, rawText, files, activeFileId, activeScriptIndex, filePath } = useFile();
  const { scrollToLine, editorView } = useEditor();

  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevOpen = useRef(isOpen);

  const activeFile = files?.find((f) => f.id === activeFileId);
  const activeScript = activeFile?.scripts?.[activeFile.activeScriptIndex ?? activeScriptIndex ?? 0];
  const isProse = isProseScript(activeScript, filePath || activeFile?.filePath);
  const proseText = activeScript?.content ?? rawText ?? "";

  const sceneItems = useMemo<SceneJumpItem[]>(() => {
    if (isProse) {
      if (!proseText) return [];
      const lines = proseText.split(/\r?\n/);
      const items: SceneJumpItem[] = [];
      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(/^(#{1,6})\s+(.+)$/);
        if (match) {
          items.push({
            id: `prose-heading-${i}`,
            lineNumber: i,
            title: match[2].trim(),
            sceneNumber: match[1],
            isProse: true,
          });
        }
      }
      return items;
    }

    if (!parsedDoc || !parsedDoc.lines) return [];
    const items: SceneJumpItem[] = [];
    const lines = parsedDoc.lines;
    let fallbackSceneIndex = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.type === LineType.heading) {
        const title = getSceneTitle(line);
        const sceneNum = line.sceneNumber || String(fallbackSceneIndex++);

        let synopsis: string | undefined;
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].type === LineType.heading || lines[j].type === LineType.section) {
            break;
          }
          if (lines[j].type === LineType.synopse) {
            synopsis = lines[j].text.replace(/^=\s*/, "").trim();
            break;
          }
        }

        items.push({
          id: line.id || `scene-${i}`,
          lineNumber: i,
          title,
          sceneNumber: sceneNum,
          setting: line.setting,
          location: line.location,
          timeOfDay: line.timeOfDay,
          color: line.color,
          storylines: line.storylines,
          synopsis,
        });
      }
    }
    return items;
  }, [isProse, proseText, parsedDoc]);

  const filteredItems = useMemo(() => {
    const q = search.trim();
    if (!q) return sceneItems;

    const queryClean = q.replace(/^#/, "").trim();
    const queryIsNum = /^\d+[a-zA-Z]?$/i.test(queryClean);

    return sceneItems
      .map((item) => {
        let bestScore = 0;

        if (item.sceneNumber) {
          const num = item.sceneNumber.toLowerCase();
          if (num === queryClean.toLowerCase()) {
            bestScore = Math.max(bestScore, 2000);
          } else if (num.startsWith(queryClean.toLowerCase())) {
            bestScore = Math.max(bestScore, 1200);
          } else if (queryIsNum && num.includes(queryClean.toLowerCase())) {
            bestScore = Math.max(bestScore, 800);
          }
        }

        const titleScore = fuzzyMatchScore(q, item.title);
        bestScore = Math.max(bestScore, titleScore);

        if (item.location) {
          const locScore = fuzzyMatchScore(q, item.location);
          if (locScore > 0) bestScore = Math.max(bestScore, locScore + 50);
        }

        if (item.setting) {
          const setScore = fuzzyMatchScore(q, item.setting);
          if (setScore > 0) bestScore = Math.max(bestScore, setScore + 40);
        }

        if (item.timeOfDay) {
          const todScore = fuzzyMatchScore(q, item.timeOfDay);
          if (todScore > 0) bestScore = Math.max(bestScore, todScore + 30);
        }

        if (item.storylines && item.storylines.length > 0) {
          for (const s of item.storylines) {
            const stScore = fuzzyMatchScore(q, s);
            if (stScore > 0) bestScore = Math.max(bestScore, stScore);
          }
        }

        if (item.synopsis) {
          const synScore = fuzzyMatchScore(q, item.synopsis);
          if (synScore > 0) bestScore = Math.max(bestScore, synScore - 30);
        }

        return { item, score: bestScore };
      })
      .filter((res) => res.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((res) => res.item);
  }, [sceneItems, search]);

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setSelectedIndex(0);
      const focusTimer = window.setTimeout(() => {
        searchRef.current?.focus({ preventScroll: true });
      }, 40);
      return () => window.clearTimeout(focusTimer);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  useEffect(() => {
    if (prevOpen.current && !isOpen) {
      if (editorView) {
        window.setTimeout(() => {
          if (!document.activeElement || document.activeElement === document.body) {
            editorView.contentDOM.focus({ preventScroll: true });
          }
        }, 50);
      }
    }
    prevOpen.current = isOpen;
  }, [isOpen, editorView]);

  useEffect(() => {
    if (!containerRef.current) return;
    const selectedEl = containerRef.current.querySelector(`[data-index="${selectedIndex}"]`);
    if (selectedEl && typeof (selectedEl as HTMLElement).scrollIntoView === "function") {
      (selectedEl as HTMLElement).scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const handleSelect = (item: SceneJumpItem) => {
    onClose();
    scrollToLine(item.lineNumber);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : Math.max(0, filteredItems.length - 1)));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        handleSelect(filteredItems[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(4px)",
          },
        },
        paper: {
          sx: {
            borderRadius: "12px",
            bgcolor: isDark ? "background.paper" : "#ffffff",
            boxShadow: isDark
              ? "0 20px 40px rgba(0,0,0,0.6)"
              : "0 20px 40px rgba(0,0,0,0.15)",
            border: `1px solid ${theme.palette.divider}`,
            backgroundImage: "none",
            overflow: "hidden",
          },
        },
      }}
    >
      <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
        <SearchIcon sx={{ color: "text.secondary", fontSize: 20 }} />
        <InputBase
          inputRef={searchRef}
          placeholder={
            isProse
              ? "Jump to section or chapter..."
              : "Jump to scene... (e.g. 14, INT, coffee shop, NIGHT)"
          }
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          fullWidth
          sx={{
            fontSize: "0.95rem",
            color: "text.primary",
            "& input::placeholder": {
              opacity: 0.6,
            },
          }}
        />
        {search && (
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontFamily: "monospace",
              fontSize: 11,
              flexShrink: 0,
            }}
          >
            {filteredItems.length} match{filteredItems.length === 1 ? "" : "es"}
          </Typography>
        )}
      </Box>

      <Divider />

      <DialogContent dividers sx={{ p: 0, maxHeight: "55vh" }} ref={containerRef}>
        {filteredItems.length === 0 ? (
          <Typography
            color="text.secondary"
            sx={{ p: 3, textAlign: "center", fontSize: 13 }}
          >
            {sceneItems.length === 0
              ? "No scenes or headings found in document"
              : `No scenes matching "${search}"`}
          </Typography>
        ) : (
          <List disablePadding sx={{ px: 1, py: 0.5 }}>
            {filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <ListItemButton
                  key={item.id}
                  data-index={idx}
                  selected={isSelected}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  sx={{
                    py: 0.9,
                    px: 1.5,
                    my: 0.25,
                    borderRadius: "6px",
                    gap: 1.2,
                    transition: "all var(--duration-fast) ease",
                    "&.Mui-selected": {
                      backgroundColor: `${theme.palette.primary.main}20`,
                    },
                    "&:hover": {
                      backgroundColor: `${theme.palette.primary.main}12`,
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: "auto",
                      color: isSelected ? "var(--button-color)" : "text.secondary",
                    }}
                  >
                    {item.isProse ? (
                      <BeenhereIcon sx={{ fontSize: 18 }} />
                    ) : (
                      <ViewAgendaIcon sx={{ fontSize: 18 }} />
                    )}
                  </ListItemIcon>

                  <ListItemText
                    disableTypography
                    primary={
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "nowrap" }}>
                        {item.sceneNumber && (
                          <Typography
                            component="span"
                            sx={{
                              bgcolor: isSelected
                                ? alpha(theme.palette.primary.main, 0.25)
                                : isDark
                                ? "rgba(255, 255, 255, 0.08)"
                                : "rgba(0, 0, 0, 0.06)",
                              color: isSelected ? "primary.main" : "text.secondary",
                              px: 0.75,
                              py: 0.15,
                              borderRadius: "4px",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              fontFamily: "monospace",
                              letterSpacing: "0.02em",
                              flexShrink: 0,
                            }}
                          >
                            {item.isProse ? item.sceneNumber : `#${item.sceneNumber}`}
                          </Typography>
                        )}
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: isSelected ? 600 : 500,
                            fontSize: "0.85rem",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            color: "text.primary",
                          }}
                        >
                          {item.title}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      item.synopsis ? (
                        <Typography
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                            display: "-webkit-box",
                            WebkitLineClamp: 1,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            mt: 0.25,
                            fontSize: "0.76rem",
                          }}
                        >
                          {item.synopsis}
                        </Typography>
                      ) : null
                    }
                  />

                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, flexShrink: 0 }}>
                    {item.setting && (
                      <Chip
                        label={item.setting}
                        size="small"
                        variant="outlined"
                        sx={{
                          fontSize: "0.68rem",
                          height: 18,
                          fontFamily: "monospace",
                          borderColor: "divider",
                          opacity: 0.8,
                        }}
                      />
                    )}
                    {item.timeOfDay && (
                      <Chip
                        label={item.timeOfDay}
                        size="small"
                        variant="outlined"
                        sx={{
                          fontSize: "0.68rem",
                          height: 18,
                          borderColor: "divider",
                          opacity: 0.8,
                        }}
                      />
                    )}
                    <Typography
                      variant="caption"
                      sx={{
                        color: "text.secondary",
                        fontFamily: "monospace",
                        fontSize: "0.72rem",
                        opacity: 0.7,
                        ml: 0.5,
                      }}
                    >
                      L{item.lineNumber + 1}
                    </Typography>
                  </Box>
                </ListItemButton>
              );
            })}
          </List>
        )}
      </DialogContent>

      <Divider />

      <Box
        sx={{
          px: 2,
          py: 1,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          bgcolor: isDark ? `${theme.palette.background.default}66` : "action.hover",
          color: theme.palette.text.secondary,
        }}
      >
        <Box sx={{ display: "flex", gap: 1.5 }}>
          <Typography variant="caption" color="text.secondary">
            <Typography
              variant="caption"
              component="span"
              sx={{
                fontFamily: "monospace",
                fontWeight: 700,
                bgcolor: isDark ? `${theme.palette.text.primary}1a` : "action.selected",
                color: theme.palette.text.primary,
                px: 0.6,
                py: 0.2,
                borderRadius: "4px",
              }}
            >
              ↑↓
            </Typography>{" "}
            navigate
          </Typography>
          <Typography variant="caption" color="text.secondary">
            <Typography
              variant="caption"
              component="span"
              sx={{
                fontFamily: "monospace",
                fontWeight: 700,
                bgcolor: isDark ? `${theme.palette.text.primary}1a` : "action.selected",
                color: theme.palette.text.primary,
                px: 0.6,
                py: 0.2,
                borderRadius: "4px",
              }}
            >
              Enter
            </Typography>{" "}
            jump
          </Typography>
          <Typography variant="caption" color="text.secondary">
            <Typography
              variant="caption"
              component="span"
              sx={{
                fontFamily: "monospace",
                fontWeight: 700,
                bgcolor: isDark ? `${theme.palette.text.primary}1a` : "action.selected",
                color: theme.palette.text.primary,
                px: 0.6,
                py: 0.2,
                borderRadius: "4px",
              }}
            >
              Esc
            </Typography>{" "}
            close
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ fontWeight: 600, opacity: 0.7 }}>
          Ctrl+J Jump
        </Typography>
      </Box>
    </Dialog>
  );
};
