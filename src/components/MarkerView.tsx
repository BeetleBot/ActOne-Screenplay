import React, { useState, useMemo } from "react";
import { useFile, useEditor } from "../context";
import { PILL_RADIUS } from "../constants";
import { LineType, ParsedLine } from "../parser";
import { getSceneTitle } from "../utils/text";
import { SearchIcon, CloseIcon, InfoOutlinedIcon } from "./Icons";

import {
  Box,
  Typography,
  IconButton,
  TextField,
  Chip,
  List,
  ListItemButton,
  ListItemText,
  Tooltip,
} from "@mui/material";

interface MarkerItem {
  line: ParsedLine;
  index: number;
  context: string;
  sceneNumber?: string;
  sceneStorylines?: string[];
}

export const MarkerView = React.memo(() => {
  const { parsedDoc } = useFile();
  const { scrollToLine } = useEditor();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  const markersList = useMemo(() => {
    const list: MarkerItem[] = [];
    const lines = parsedDoc.lines;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.marker) {
        let nearestContext = "Introduction";
        let nearestSceneNumber: string | undefined;
        let sceneStorylines: string[] | undefined;

        for (let j = i; j >= 0; j--) {
          const l = lines[j];
          if (l.type === LineType.heading) {
            nearestContext = getSceneTitle(l);
            nearestSceneNumber = l.sceneNumber;
            sceneStorylines = l.storylines;
            break;
          }
          if (l.type === LineType.section) {
            nearestContext = l.text.replace(/^[.#= ]+/, "").trim();
            break;
          }
        }
        list.push({
          line,
          index: i,
          context: nearestContext,
          sceneNumber: nearestSceneNumber,
          sceneStorylines,
        });
      }
    }
    return list;
  }, [parsedDoc.lines]);

  const colorStats = useMemo(() => {
    const stats: { [color: string]: number } = {};
    markersList.forEach((m) => {
      const mColor = m.line.marker?.color || "orange";
      stats[mColor] = (stats[mColor] || 0) + 1;
    });
    return stats;
  }, [markersList]);

  const [activeMarkerIdx, setActiveMarkerIdx] = useState<number>(-1);

  const filteredMarkers = useMemo(() => {
    return markersList.filter((m) => {
      const color = m.line.marker?.color || "orange";
      if (selectedColor && color !== selectedColor) {
        return false;
      }
      if (searchQuery) {
        const desc = m.line.marker?.description || "";
        const contextText = m.context;
        const query = searchQuery.toLowerCase();
        return (
          desc.toLowerCase().includes(query) ||
          contextText.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [markersList, selectedColor, searchQuery]);

  const handleMarkerClick = (index: number) => {
    scrollToLine(index, true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (filteredMarkers.length === 0) return;

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const dir = e.key === "ArrowDown" ? 1 : -1;
      const nextIdx = Math.max(0, Math.min(filteredMarkers.length - 1, activeMarkerIdx + dir));
      setActiveMarkerIdx(nextIdx);

      const target = filteredMarkers[nextIdx];
      scrollToLine(target.index, true);

      const el = e.currentTarget.querySelector(`[data-marker-id="${target.line.id}"]`) as HTMLElement;
      el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeMarkerIdx >= 0 && activeMarkerIdx < filteredMarkers.length) {
        scrollToLine(filteredMarkers[activeMarkerIdx].index, false);
      }
    }
  };

  const getMarkerColorValue = (color: string) => {
    if (color.startsWith("#")) return color;
    return `var(--scene-color-${color})`;
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, opacity: 0.8, fontSize: "0.7rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          Markers List
        </Typography>
        <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
          <Tooltip title="Markers displays bookmarks tagged at specific lines in your screenplay. Click to jump to the line, or filter by color.">
            <span>
              <InfoOutlinedIcon sx={{ fontSize: 14, opacity: 0.6, cursor: "help" }} />
            </span>
          </Tooltip>
          <Chip
            label={`${filteredMarkers.length} markers`}
            size="small"
            sx={{ height: 18, fontSize: 10, fontWeight: 600, borderRadius: PILL_RADIUS }}
          />
        </Box>
      </Box>

      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", p: 2, gap: 2, overflow: "hidden" }}>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
        <TextField
          placeholder="Filter markers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          fullWidth
          slotProps={{
            input: {
              sx: {
                bgcolor: "background.paper",
                fontSize: "0.75rem",
                "& fieldset": { borderColor: "divider" },
                "&:hover fieldset": { borderColor: "text.secondary" },
                "&.Mui-focused fieldset": { borderWidth: "1px", borderColor: "primary.main" },
              },
              startAdornment: (
                <Box sx={{ display: "flex", color: "text.secondary", mr: 0.8 }}>
                  <SearchIcon sx={{ fontSize: 14 }} />
                </Box>
              ),
              endAdornment: searchQuery && (
                <IconButton
                  size="small"
                  onClick={() => setSearchQuery("")}
                >
                  <CloseIcon sx={{ fontSize: 12 }} />
                </IconButton>
              ),
            },
          }}
        />
      </Box>

      {Object.keys(colorStats).length > 0 && (
        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: -1 }}>
          {Object.entries(colorStats).map(([color, count]) => {
            const isSelected = selectedColor === color;
            const colorVal = getMarkerColorValue(color);
            return (
              <Box
                key={color}
                onClick={() => setSelectedColor(isSelected ? null : color)}
                sx={{
                  fontSize: "8.5px",
                  fontFamily: "var(--font-ui)",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  px: 1,
                  py: 0.3,
                  borderRadius: "4px",
                  cursor: "pointer",
                  userSelect: "none",
                  border: "1px solid",
                  borderColor: isSelected ? colorVal : `color-mix(in srgb, ${colorVal} 30%, transparent)`,
                  bgcolor: isSelected ? colorVal : `color-mix(in srgb, ${colorVal} 8%, transparent)`,
                  color: isSelected ? "#ffffff" : `color-mix(in srgb, ${colorVal} 85%, currentColor)`,
                  transition: "all 0.15s ease",
                  "&:hover": {
                    borderColor: colorVal,
                    bgcolor: isSelected ? colorVal : `color-mix(in srgb, ${colorVal} 15%, transparent)`,
                  },
                }}
              >
                {color.toUpperCase()} ({count})
              </Box>
            );
          })}
        </Box>
      )}

      <List 
        tabIndex={0}
        onKeyDown={handleKeyDown}
        sx={{ 
          flex: 1, 
          overflowY: "auto", 
          outline: "none",
          p: 0,
          "&:focus": { outline: "none" }
        }}
      >
        {filteredMarkers.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: "center", fontStyle: "italic" }}>
            {markersList.length === 0 ? "No markers in this screenplay." : "No matching markers found."}
          </Typography>
        ) : (
          filteredMarkers.map((m, idx) => {
            const color = m.line.marker?.color || "orange";
            const colorVal = getMarkerColorValue(color);
            const isSelected = activeMarkerIdx === idx;
            const cleanDesc = (m.line.marker?.description || "Marker").replace(/\s+/g, " ").trim();
            const cleanContext = (m.context || "").replace(/\s+/g, " ").trim();
            return (
              <ListItemButton
                key={m.line.id}
                data-marker-id={m.line.id}
                selected={isSelected}
                onClick={(e) => {
                  setActiveMarkerIdx(idx);
                  handleMarkerClick(m.index);
                  e.currentTarget.parentElement?.focus();
                }}
                sx={{
                  pl: 1.5,
                  py: 0.5,
                  borderRadius: '6px',
                  mb: 0.25,
                  alignItems: "center",
                  transition: "all 0.12s ease",
                  bgcolor: isSelected
                    ? (colorVal.startsWith("var")
                        ? `color-mix(in srgb, ${colorVal} 20%, transparent)`
                        : `${colorVal}30`)
                    : (colorVal.startsWith("var")
                        ? `color-mix(in srgb, ${colorVal} 8%, transparent)`
                        : `${colorVal}12`),
                  "&.Mui-selected": {
                    bgcolor: colorVal.startsWith("var")
                      ? `color-mix(in srgb, ${colorVal} 20%, transparent)`
                      : `${colorVal}30`,
                    "&:hover": {
                      bgcolor: colorVal.startsWith("var")
                        ? `color-mix(in srgb, ${colorVal} 25%, transparent)`
                        : `${colorVal}38`,
                    },
                  },
                  "&:hover": {
                    bgcolor: colorVal.startsWith("var")
                      ? `color-mix(in srgb, ${colorVal} 15%, transparent)`
                      : `${colorVal}22`,
                  },
                }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: "flex", gap: 0.8, alignItems: "center", flexWrap: "wrap" }}>
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          bgcolor: colorVal,
                          flexShrink: 0,
                        }}
                      />
                      {m.sceneNumber && (
                        <Typography
                          variant="caption"
                          sx={{
                            bgcolor: "action.selected",
                            px: 0.4,
                            borderRadius: '4px',
                            fontSize: '8.5px',
                            fontWeight: 700,
                            color: "text.secondary",
                          }}
                        >
                          {m.sceneNumber}
                        </Typography>
                      )}
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: isSelected ? 600 : 400,
                          fontSize: '13px',
                          color: isSelected ? "primary.main" : "text.primary",
                          fontFamily: "var(--font-ui)",
                          letterSpacing: "0.01em",
                        }}
                      >
                        {cleanDesc}
                      </Typography>
                      {m.sceneStorylines && m.sceneStorylines.length > 0 && (
                        <Box sx={{ display: "flex", gap: 0.4 }}>
                          {m.sceneStorylines.map((sl) => (
                            <Chip
                              key={sl}
                              label={sl}
                              size="small"
                              variant="outlined"
                              sx={{
                                height: 12,
                                fontSize: '7.5px',
                                p: 0,
                                borderRadius: PILL_RADIUS,
                                textTransform: "lowercase",
                              }}
                            />
                          ))}
                        </Box>
                      )}
                    </Box>
                  }
                  secondary={
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 0.1, pl: 1.5 }}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          fontSize: 10,
                          maxWidth: "70%",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontStyle: "italic",
                        }}
                      >
                        {cleanContext}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          bgcolor: "action.selected",
                          px: 0.6,
                          py: 0.2,
                          borderRadius: '4px',
                          fontSize: 9,
                          fontWeight: 700,
                          color: "text.secondary",
                        }}
                      >
                        Line {m.index + 1}
                      </Typography>
                    </Box>
                  }
                />
              </ListItemButton>
            );
          })
        )}
      </List>
      </Box>
    </Box>
  );
});
