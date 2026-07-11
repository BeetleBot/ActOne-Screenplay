import React, { useMemo, useState, useEffect } from "react";
import { useFile, useUI, useSprint } from "../../context";
import { LineType } from "../../parser";
import { countWords } from "../../utils/text";
import { Box, Typography, Menu, MenuItem, ListItemText, IconButton } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { BarChartIcon } from "../Icons";
import { useEditor } from "../../context";

export const StatusBar = React.memo(({ onOpenXray }: { onOpenXray?: () => void }) => {
  const { rawText, parsedDoc, isBundle, scripts, activeScriptIndex, filePath, activeScriptName, setActiveScript, activeFileId, saveStatus } = useFile();
  const { isZenMode, activeAmbientTrack, stopAmbientTrack } = useUI();
  const { activeLineNumber } = useEditor();
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
    if (parsedDoc?.lines && parsedDoc.pageBreaks) {
      const idx = activeLineNumber >= 0 && activeLineNumber < parsedDoc.lines.length
        ? activeLineNumber
        : -1;
      if (idx !== -1) {
        currentPage = parsedDoc.pageBreaks.filter(b => b <= idx).length + 1;
      }
    }

    const sceneCount = parsedDoc?.lines ? parsedDoc.lines.filter(l => l.type === LineType.heading).length : 0;

    return { words, chars, pages, currentPage, sceneCount };
  }, [rawText, parsedDoc, activeLineNumber]);

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
      id="status-bar"
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
              transition: "opacity var(--duration-fast) ease-in-out",
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
          {activeAmbientTrack && (
            <Typography
              variant="caption"
              onClick={stopAmbientTrack}
              sx={{
                fontSize: 10,
                color: "primary.main",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                cursor: "pointer",
                bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
                border: "1px solid",
                borderColor: (t) => alpha(t.palette.primary.main, 0.15),
                px: 1.2,
                py: 0.25,
                borderRadius: 0,
                transition: "all var(--duration-normal) ease",
                "&:hover": {
                  bgcolor: (t) => alpha(t.palette.primary.main, 0.15),
                },
              }}
              title={`Click to stop: ${activeAmbientTrack}`}
            >
              <span className="ambient-pulse" style={{ display: "inline-block", width: 4, height: 4, borderRadius: "50%", backgroundColor: "currentColor" }} />
              ♪ {activeAmbientTrack}
            </Typography>
          )}
          {onOpenXray && (
            <IconButton
              size="small"
              onClick={onOpenXray}
              sx={{ p: 0.3, color: "text.secondary", '&:hover': { color: "primary.main" } }}
              title="X-Ray (Analysis)"
            >
              <BarChartIcon sx={{ fontSize: 14 }} />
            </IconButton>
          )}
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
});
