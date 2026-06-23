import React, { useMemo, useState, useEffect } from "react";
import { useFile, useUI, useSprint } from "../../context";
import { LineType } from "../../parser";
import { countWords } from "../../utils/text";
import { Box, Typography, Menu, MenuItem, ListItemText } from "@mui/material";

import { useEditor } from "../../context";

export const StatusBar: React.FC = () => {
  const { rawText, parsedDoc, isBundle, scripts, activeScriptIndex, filePath, activeScriptName, setActiveScript, activeFileId, saveStatus } = useFile();
  const { isZenMode, viewMode, setViewMode } = useUI();
  const { activeLineId } = useEditor();
  const { activeSprints } = useSprint();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [tick, setTick] = useState(0);

  const currentSprint = activeSprints[activeFileId];

  useEffect(() => {
    if (currentSprint) {
      const timer = setInterval(() => {
        setTick(t => t + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [currentSprint]);

  const stats = useMemo(() => {
    const text = rawText || "";
    const words = countWords(text);
    const chars = text.length;
    const pages = parsedDoc?.pageBreaks ? parsedDoc.pageBreaks.length + 1 : 1;

    let currentPage = 1;
    if (parsedDoc?.lines) {
      const activeLineIndex = parsedDoc.lines.findIndex(l => l.id === activeLineId);
      if (activeLineIndex !== -1 && parsedDoc.pageBreaks) {
        currentPage = parsedDoc.pageBreaks.filter(b => b <= activeLineIndex).length + 1;
      }
    }

    const sceneCount = parsedDoc?.lines ? parsedDoc.lines.filter(l => l.type === LineType.heading).length : 0;

    return { words, chars, pages, currentPage, sceneCount };
  }, [rawText, parsedDoc, activeLineId]);

  const sprintDetails = useMemo(() => {
    if (!currentSprint) return null;
    const totalSec = currentSprint.durationMinutes * 60;
    const elapsed = Math.floor((Date.now() - currentSprint.startTime) / 1000);
    const remaining = Math.max(0, totalSec - elapsed);
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    const timeStr = `${m}:${s.toString().padStart(2, "0")}`;

    const text = rawText || "";
    const currentWords = countWords(text);
    const diffWords = Math.max(0, currentWords - currentSprint.startWordCount);
    const elapsedMins = Math.max(0.1, elapsed / 60);
    const wpm = Math.round(diffWords / elapsedMins);

    return { timeStr, total: currentSprint.durationMinutes, wpm };
  }, [currentSprint, rawText, tick]);

  const handleScriptClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isBundle && scripts.length > 0) {
      setAnchorEl(event.currentTarget);
    }
  };

  const handleScriptSelect = (index: number) => {
    setActiveScript(index);
    setAnchorEl(null);
  };

  const fileName = filePath ? filePath.split(/[/\\]/).pop() || "Untitled" : "Untitled";

  return (
    <Box 
      sx={{ 
        height: isZenMode ? 0 : 28, 
        bgcolor: "background.paper", 
        borderTop: isZenMode ? 0 : 1, 
        borderColor: "divider", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between", 
        px: 2, 
        userSelect: "none", 
        flexShrink: 0,
        // Zen mode transition support with staggered delay (0.15s)
        opacity: isZenMode ? 0 : 1,
        transform: isZenMode ? 'translateY(100%)' : 'translateY(0)',
        pointerEvents: isZenMode ? 'none' : 'auto',
        transition: 'opacity 0.3s ease-in-out 0.15s, transform 0.3s ease-in-out 0.15s, height 0.3s ease-in-out 0.15s, border-top 0.3s ease-in-out 0.15s',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, minWidth: 0 }}>
        <Typography 
          onClick={handleScriptClick}
          variant="caption" 
          sx={{ 
            fontSize: 11, 
            color: "text.secondary",
            cursor: isBundle && scripts.length > 0 ? "pointer" : "default",
            display: "flex",
            alignItems: "center",
            '&:hover': isBundle && scripts.length > 0 ? { color: "primary.main" } : {},
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: { xs: 150, sm: 250, md: 350 },
            flexShrink: 0
          }}
        >
          File: <strong style={{ color: "var(--text-main)", marginLeft: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {isBundle ? `${activeScriptName} (${fileName})` : fileName}
          </strong>
          {isBundle && scripts.length > 0 && <span style={{ marginLeft: 4, fontSize: 8, flexShrink: 0 }}>▼</span>}
        </Typography>


        {saveStatus !== "idle" && (
          <Box 
            sx={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 0.5,
              opacity: 1,
              transition: "opacity 0.2s ease-in-out",
              flexShrink: 0
            }}
          >
            {saveStatus === "saving" && (
              <Box 
                sx={{ 
                  width: 10, 
                  height: 10, 
                  border: "1.5px solid",
                  borderColor: "primary.main",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                  "@keyframes spin": {
                    "0%": { transform: "rotate(0deg)" },
                    "100%": { transform: "rotate(360deg)" }
                  }
                }}
              />
            )}
            {saveStatus === "saved" && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5L4.5 7.5L8.5 2.5" stroke="#4caf50" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            <Typography variant="caption" sx={{ fontSize: 10, color: saveStatus === "saved" ? "#4caf50" : "text.secondary", fontWeight: 500 }}>
              {saveStatus === "saving" ? "Saving..." : "Saved"}
            </Typography>
          </Box>
        )}

        {isBundle && scripts.length > 0 && (
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            slotProps={{ paper: { sx: { maxHeight: 200, width: 220 } } }}
          >
            {scripts.map((script, idx) => (
              <MenuItem 
                key={script.fileName} 
                selected={idx === activeScriptIndex}
                onClick={() => handleScriptSelect(idx)}
              >
                <ListItemText 
                  primary={`${script.name}.fountain`} 
                  slotProps={{
                    primary: { sx: { fontWeight: idx === activeScriptIndex ? 700 : 400, fontSize: 13 } },
                  }}
                />
              </MenuItem>
            ))}
          </Menu>
        )}
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1.5, sm: 3 }, flexShrink: 0 }}>
        {sprintDetails && (
          <Typography 
            variant="caption" 
            sx={{ 
              fontSize: 11, 
              color: "primary.main", 
              fontWeight: 500, 
              display: "flex", 
              alignItems: "center",
              mr: 1,
              whiteSpace: "nowrap",
              flexShrink: 0
            }}
          >
            <span style={{ 
              display: "inline-block", 
              width: 6, 
              height: 6, 
              borderRadius: "50%", 
              backgroundColor: "var(--accent-color)", 
              marginRight: 6,
              flexShrink: 0
            }}></span>
            Sprint: <strong style={{ color: "var(--text-main)", marginLeft: 3 }}>{sprintDetails.timeStr} / {sprintDetails.total}m</strong>&nbsp;({sprintDetails.wpm} WPM)
          </Typography>
        )}

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexShrink: 0 }}>
          <Box
            onClick={() => setViewMode(viewMode === "board" ? "editor" : "board")}
            sx={{
              fontSize: 11, color: "text.secondary", cursor: "pointer", whiteSpace: "nowrap",
              px: 0.6, py: 0.2, borderRadius: "4px",
              bgcolor: viewMode === "board" ? "action.selected" : "transparent",
              fontWeight: viewMode === "board" ? 600 : 400,
              "&:hover": { bgcolor: "action.hover" },
            }}
          >
            <strong style={{ color: "var(--text-main)" }}>{viewMode === "board" ? "Editor" : "Board"}</strong>
          </Box>
          <Typography variant="caption" sx={{ fontSize: 11, color: "text.secondary", whiteSpace: "nowrap", display: { xs: "none", md: "inline" } }}>
            Scenes: <strong style={{ color: "var(--text-main)" }}>{stats.sceneCount}</strong>
          </Typography>
          <Typography variant="caption" sx={{ fontSize: 11, color: "text.secondary", whiteSpace: "nowrap", display: { xs: "none", sm: "inline" } }}>
            Words: <strong style={{ color: "var(--text-main)" }}>{stats.words}</strong>
          </Typography>
          <Typography variant="caption" sx={{ fontSize: 11, color: "text.secondary", whiteSpace: "nowrap" }}>
            Page: <strong style={{ color: "var(--text-main)" }}>{stats.currentPage} of {stats.pages}</strong>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};
