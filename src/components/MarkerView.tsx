import React, { useState, useMemo } from "react";
import { useFile, useEditor } from "../context";
import { PILL_RADIUS } from "../constants";
import { LineType, ParsedLine } from "../parser";
import { getSceneTitle } from "../utils/text";
import { SearchIcon, CloseIcon, InfoOutlinedIcon, TuneIcon } from "./Icons";
import { OutlineTag } from "./OutlineView";

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
  Popover,
  Badge,
  Grid,
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
  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLElement | null>(null);
  const activeFilterCount = selectedColor ? 1 : 0;

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
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, height: 40, minHeight: 40, borderBottom: "1px solid", borderColor: "divider" }}>
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

      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", p: 1.5, gap: 1.5, overflow: "hidden" }}>
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
                  borderRadius: "20px",
                  "& fieldset": { border: "none" },
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
                    <CloseIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                ),
              },
            }}
          />
          <IconButton
            size="small"
            onClick={(e) => setFilterAnchorEl(e.currentTarget)}
            sx={{
              border: "1px solid",
              borderColor: activeFilterCount > 0 ? "primary.main" : "divider",
              bgcolor: activeFilterCount > 0 ? "action.selected" : "action.hover",
              borderRadius: "20px",
              height: "auto",
              minHeight: 0,
              minWidth: 0,
              alignSelf: "stretch",
              width: 32,
              p: 0.3,
            }}
          >
            <Badge badgeContent={activeFilterCount} color="primary" sx={{ "& .MuiBadge-badge": { fontSize: 8, height: 14, minWidth: 14, top: -2, right: -2 } }}>
              <TuneIcon sx={{ fontSize: 14 }} />
            </Badge>
          </IconButton>
        </Box>

        <Popover
          open={Boolean(filterAnchorEl)}
          anchorEl={filterAnchorEl}
          onClose={() => setFilterAnchorEl(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          slotProps={{ paper: { sx: { p: 1.5, width: 240, borderRadius: "8px" } } }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: "uppercase", display: "block", mb: 1 }}>
            Filter Markers
          </Typography>

          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: "block", mb: 0.8 }}>
              Marker Color
            </Typography>
            <Grid container spacing={0.5}>
              <Grid>
                <Chip
                  label={`All Colors (${markersList.length})`}
                  size="small"
                  onClick={() => setSelectedColor(null)}
                  sx={{
                    fontSize: 9.5,
                    height: 20,
                    borderRadius: "4px",
                    fontWeight: selectedColor === null ? 700 : 500,
                    border: "1px solid",
                    borderColor: selectedColor === null ? "primary.main" : "divider",
                    bgcolor: selectedColor === null ? "primary.main" : "transparent",
                    color: selectedColor === null ? "#fff" : "text.secondary",
                    cursor: "pointer",
                    "&:hover": {
                      bgcolor: selectedColor === null ? "primary.main" : "action.hover",
                    },
                  }}
                />
              </Grid>
              {Object.entries(colorStats).map(([color, count]) => {
                const isSelected = selectedColor === color;
                const colorVal = getMarkerColorValue(color);
                return (
                  <Grid key={color}>
                    <Chip
                      label={`${color.toUpperCase()} (${count})`}
                      size="small"
                      onClick={() => setSelectedColor(isSelected ? null : color)}
                      sx={{
                        fontSize: 9.5,
                        height: 20,
                        borderRadius: "4px",
                        fontWeight: isSelected ? 700 : 500,
                        border: "1px solid",
                        borderColor: isSelected ? colorVal : "divider",
                        bgcolor: isSelected ? colorVal : "transparent",
                        color: isSelected ? "#fff" : "text.secondary",
                        cursor: "pointer",
                        "&:hover": {
                          bgcolor: isSelected ? colorVal : "action.hover",
                        },
                      }}
                    />
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        </Popover>

      <List 
        tabIndex={0}
        onKeyDown={handleKeyDown}
        sx={{ 
          flex: 1, 
          overflowY: "auto", 
          outline: "none",
          p: 0,
          display: "flex",
          flexDirection: "column",
          gap: 0.4,
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
            const hasSubCardContent = !!cleanContext || (m.sceneStorylines && m.sceneStorylines.length > 0);

            return (
              <Box key={m.line.id} sx={{ display: "flex", flexDirection: "column" }}>
                <ListItemButton
                  data-marker-id={m.line.id}
                  selected={isSelected}
                  onClick={(e) => {
                    setActiveMarkerIdx(idx);
                    handleMarkerClick(m.index);
                    e.currentTarget.parentElement?.focus();
                  }}
                  sx={{
                    py: 0.4,
                    px: 0.8,
                    borderRadius: hasSubCardContent ? "6px 6px 0 0" : "6px",
                    mb: hasSubCardContent ? 0 : 0.4,
                    border: "1px solid",
                    borderColor: isSelected
                      ? "var(--button-color, primary.main)"
                      : "color-mix(in srgb, var(--text-main) 10%, transparent)",
                    boxShadow: isSelected ? "0 1px 3px rgba(0,0,0,0.06)" : "0 1px 2px rgba(0,0,0,0.02)",
                    transition: "all var(--duration-fast) ease",
                    bgcolor: isSelected
                      ? (colorVal.startsWith("var")
                          ? `color-mix(in srgb, ${colorVal} 24%, transparent)`
                          : `${colorVal}35`)
                      : (colorVal.startsWith("var")
                          ? `color-mix(in srgb, ${colorVal} 12%, transparent)`
                          : `${colorVal}1A`),
                    position: "relative",
                    "&:hover": {
                      borderColor: "color-mix(in srgb, var(--button-color) 40%, transparent)",
                      bgcolor: colorVal.startsWith("var")
                        ? `color-mix(in srgb, ${colorVal} 20%, transparent)`
                        : `${colorVal}28`,
                    },
                    "&.Mui-selected": {
                      bgcolor: colorVal.startsWith("var")
                        ? `color-mix(in srgb, ${colorVal} 24%, transparent)`
                        : `${colorVal}35`,
                      "&:hover": {
                        bgcolor: colorVal.startsWith("var")
                          ? `color-mix(in srgb, ${colorVal} 28%, transparent)`
                          : `${colorVal}40`,
                      }
                    },
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: "flex", gap: 0.6, alignItems: "center", width: "100%" }}>
                        <OutlineTag label={`L${m.index + 1}`} size="0.65rem" />
                        {m.sceneNumber && (
                          <OutlineTag label={`#${m.sceneNumber}`} size="0.65rem" />
                        )}
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 700,
                            color: "text.primary",
                            fontSize: "12px",
                            fontFamily: "var(--font-ui)",
                            letterSpacing: "0.01em",
                            flex: 1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {cleanDesc}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItemButton>

                {hasSubCardContent && (
                  <Box
                    sx={{
                      mb: 0.4,
                      p: "5px 8px",
                      borderRadius: "0 0 6px 6px",
                      border: "1px solid",
                      borderColor: "color-mix(in srgb, var(--text-main) 10%, transparent)",
                      borderTop: "none",
                      bgcolor: "color-mix(in srgb, var(--text-main) 3%, transparent)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 0.4,
                    }}
                  >
                    {cleanContext && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          fontSize: "10.5px",
                          fontFamily: "var(--font-ui)",
                          letterSpacing: "0.01em",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {cleanContext}
                      </Typography>
                    )}
                    {m.sceneStorylines && m.sceneStorylines.length > 0 && (
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.6 }}>
                        {m.sceneStorylines.map((sl) => (
                          <Box
                            key={sl}
                            sx={{
                              display: "inline-flex",
                              alignItems: "center",
                              px: 0.8,
                              py: 0.25,
                              borderRadius: "4px",
                              border: "1px solid",
                              borderColor: "divider",
                              bgcolor: "background.paper",
                              color: "text.secondary",
                              fontSize: "9.5px",
                              fontWeight: 600,
                              letterSpacing: "0.03em",
                              textTransform: "uppercase",
                              fontFamily: "var(--font-ui)",
                              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                            }}
                          >
                            {sl}
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
            );
          })
        )}
      </List>
      </Box>
    </Box>
  );
});
