import React, { useState, useMemo } from "react";
import { useAppContext } from "../context/AppContext";
import { LineType, ParsedLine } from "../parser/FountainParser";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import {
  Box,
  Typography,
  IconButton,
  TextField,
  Chip,
  Grid,
  List,
  ListItemButton,
  ListItemText,
} from "@mui/material";

interface MarkerItem {
  line: ParsedLine;
  index: number;
  context: string;
  sceneNumber?: string;
}

export const MarkerView: React.FC = () => {
  const { parsedDoc, scrollToLine } = useAppContext();
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
        for (let j = i; j >= 0; j--) {
          const l = lines[j];
          if (l.type === LineType.heading) {
            nearestContext = l.text
              .replace(/^[.#= ]+/, "")
              .replace(/\[\[.*?\]\]/g, "")
              .replace(/#[^#]+#\s*$/, "")
              .trim();
            nearestSceneNumber = l.sceneNumber;
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
        });
      }
    }
    return list;
  }, [parsedDoc.lines]);

  const colorStats = useMemo(() => {
    const stats: { [color: string]: number } = {};
    markersList.forEach((m) => {
      const color = m.line.marker?.color || "orange";
      stats[color] = (stats[color] || 0) + 1;
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
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", p: 2, gap: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, opacity: 0.8, fontSize: "0.7rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          Markers List
        </Typography>
        <Chip
          label={`${filteredMarkers.length} markers`}
          size="small"
          sx={{ height: 18, fontSize: 10, fontWeight: 600, borderRadius: '9999px' }}
        />
      </Box>

      {markersList.length > 0 && (
        <Grid container spacing={0.5} sx={{ mb: 0.5 }}>
          {Object.entries(colorStats).map(([color, count]) => {
            const isSelected = selectedColor === color;
            const colorVal = getMarkerColorValue(color);
            return (
              <Grid key={color}>
                <Chip
                  label={`${color} (${count})`}
                  size="small"
                  onClick={() => setSelectedColor(isSelected ? null : color)}
                  sx={{
                    fontSize: 9.5,
                    height: 20,
                    borderRadius: '9999px',
                    fontWeight: isSelected ? 700 : 500,
                    border: `1.5px solid ${colorVal}`,
                    bgcolor: isSelected ? colorVal : "transparent",
                    color: isSelected ? "#ffffff" : "text.secondary",
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
      )}

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
            endAdornment: (searchQuery || selectedColor) && (
              <IconButton
                size="small"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedColor(null);
                }}
              >
                <CloseIcon sx={{ fontSize: 12 }} />
              </IconButton>
            ),
          },
        }}
      />

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
                  py: 0.25,
                  borderRadius: '8px',
                  mb: 0.1,
                  alignItems: "center",
                  transition: "background-color 0.12s ease",
                }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: "flex", gap: 0.8, alignItems: "center" }}>
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
  );
};
