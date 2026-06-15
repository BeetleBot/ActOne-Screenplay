import React, { useMemo, useState, useEffect } from "react";
import { useFile, useUI, useSprint } from "../../context";
import { LineType } from "../../parser";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemText from "@mui/material/ListItemText";

import { useEditor } from "../../context";

export const StatusBar: React.FC = () => {
  const { rawText, parsedDoc, isBundle, scripts, activeScriptIndex, filePath, activeScriptName, setActiveScript, activeFileId } = useFile();
  const { isZenMode, mainView, setMainView } = useUI();
  const { activeLineId } = useEditor();
  const { activeSprints } = useSprint();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [modeAnchorEl, setModeAnchorEl] = useState<null | HTMLElement>(null);
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

  const planningStats = useMemo(() => {
    let sections = 0;
    let subsections = 0;
    let scenes = 0;
    if (parsedDoc?.lines) {
      for (const line of parsedDoc.lines) {
        if (line.type === LineType.section) {
          const depth = line.sectionDepth || 0;
          if (depth === 1) sections++;
          else if (depth === 2) subsections++;
        } else if (line.type === LineType.heading) {
          scenes++;
        }
      }
    }
    return { sections, subsections, scenes };
  }, [parsedDoc]);

  const stats = useMemo(() => {
    const text = rawText || "";
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const pages = parsedDoc.pageBreaks ? parsedDoc.pageBreaks.length + 1 : 1;

    let currentPage = 1;
    if (parsedDoc?.lines) {
      const activeLineIndex = parsedDoc.lines.findIndex(l => l.id === activeLineId);
      if (activeLineIndex !== -1 && parsedDoc.pageBreaks) {
        currentPage = parsedDoc.pageBreaks.filter(b => b <= activeLineIndex).length + 1;
      }
    }
    const sceneCount = parsedDoc.lines.filter(l => l.type === LineType.heading).length;
    return { words, chars, pages, currentPage, sceneCount };
  }, [rawText, parsedDoc, activeLineId]);

  const sprintDetails = useMemo(() => {
    if (!currentSprint) return null;
    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - currentSprint.startTime) / 1000));
    const elapsedMinutes = elapsedSeconds / 60;
    const sprintWords = Math.max(0, stats.words - currentSprint.startWordCount);
    const wpm = elapsedMinutes > 0 ? Math.round(sprintWords / elapsedMinutes) : 0;

    const elapsedMins = Math.floor(elapsedSeconds / 60);
    const elapsedSecs = elapsedSeconds % 60;
    const timeStr = `${elapsedMins}:${elapsedSecs.toString().padStart(2, "0")}`;

    return {
      timeStr,
      total: currentSprint.durationMinutes,
      wpm,
      words: sprintWords
    };
  }, [currentSprint, stats.words, tick]);

  if (isZenMode) return null;

  const fileName = filePath ? filePath.split(/[/\\]/).pop() || "Untitled" : "Untitled";

  return (
    <Box
      sx={{
        height: 24,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: 2,
        bgcolor: "background.paper",
        borderTop: 1,
        borderColor: "divider",
        color: "text.secondary",
        fontSize: 11,
        fontFamily: "var(--font-ui)",
        userSelect: "none",
        zIndex: 5,
      }}
    >
      <Box
        sx={{ display: "flex", alignItems: "center", gap: 0.5, cursor: isBundle ? "pointer" : "default", minWidth: 0 }}
        onClick={(e) => { if (isBundle) setAnchorEl(e.currentTarget); }}
      >
        {isBundle ? (
          <>
            <Typography variant="caption" sx={{ fontSize: 11, color: "text.secondary", fontWeight: 500 }}>
              {fileName}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: 11, color: "text.disabled" }}>&gt;</Typography>
            <Typography variant="caption" sx={{ fontSize: 11, color: "text.primary", fontWeight: 600 }}>
              {activeScriptName}.fountain
            </Typography>
            {scripts.length > 1 && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.5, marginLeft: 2 }}>
                <path d="M7 10l5 5 5-5z" />
              </svg>
            )}
          </>
        ) : (
          <Typography variant="caption" sx={{ fontSize: 11, color: "text.secondary", fontWeight: 500 }}>
            {fileName}
          </Typography>
        )}
      </Box>

      <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
        {sprintDetails && !isBundle && (
          <Typography 
            variant="caption" 
            sx={{ 
              fontSize: 11, 
              color: "primary.main", 
              fontWeight: 500, 
              display: "flex", 
              alignItems: "center",
              mr: 1
            }}
          >
            <span style={{ 
              display: "inline-block", 
              width: 6, 
              height: 6, 
              borderRadius: "50%", 
              backgroundColor: "var(--accent-color)", 
              marginRight: 6
            }}></span>
            Sprint: <strong style={{ color: "var(--text-main)", marginLeft: 3 }}>{sprintDetails.timeStr} / {sprintDetails.total}m</strong>&nbsp;({sprintDetails.wpm} WPM)
          </Typography>
        )}

        {mainView === 'board' ? (
          <>
            <Typography variant="caption" sx={{ fontSize: 11, color: "text.secondary" }}>
              Sections: <strong style={{ color: "var(--text-main)" }}>{planningStats.sections}</strong>
            </Typography>
            <Typography variant="caption" sx={{ fontSize: 11, color: "text.secondary" }}>
              Subsections: <strong style={{ color: "var(--text-main)" }}>{planningStats.subsections}</strong>
            </Typography>
            <Typography variant="caption" sx={{ fontSize: 11, color: "text.secondary" }}>
              Scenes: <strong style={{ color: "var(--text-main)" }}>{planningStats.scenes}</strong>
            </Typography>
          </>
        ) : (
          <>
            <Typography variant="caption" sx={{ fontSize: 11, color: "text.secondary" }}>
              Scenes: <strong style={{ color: "var(--text-main)" }}>{stats.sceneCount}</strong>
            </Typography>
            <Typography variant="caption" sx={{ fontSize: 11, color: "text.secondary" }}>
              Words: <strong style={{ color: "var(--text-main)" }}>{stats.words}</strong>
            </Typography>
            <Typography variant="caption" sx={{ fontSize: 11, color: "text.secondary" }}>
              Page: <strong style={{ color: "var(--text-main)" }}>{stats.currentPage} of {stats.pages}</strong>
            </Typography>
          </>
        )}

        <Box 
          onClick={(e) => setModeAnchorEl(e.currentTarget)}
          sx={{ 
            display: "flex", 
            alignItems: "center", 
            cursor: "pointer", 
            px: 1, 
            py: 0.25,
            borderRadius: "4px",
            '&:hover': { bgcolor: 'action.hover' }, 
            gap: 0.5 
          }}
        >
          <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600, color: "primary.main", textTransform: "uppercase" }}>
            {mainView === 'board' ? "Planning" : "Editor"}
          </Typography>
          <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.5 }}>
            <path d="M7 14l5-5 5 5z" />
          </svg>
        </Box>
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "top", horizontal: "left" }}
        transformOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{ paper: { sx: { minWidth: 180, maxHeight: 240 } } }}
      >
        {scripts.map((script, index) => (
          <MenuItem
            key={script.fileName}
            selected={index === activeScriptIndex}
            onClick={() => { setActiveScript(index); setAnchorEl(null); }}
            dense
          >
            <ListItemText
              primary={`${script.name}.fountain`}
              slotProps={{
                primary: { sx: { fontWeight: index === activeScriptIndex ? 700 : 400, fontSize: 13 } },
              }}
            />
            {index === activeScriptIndex && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 8, color: "var(--button-color)" }}>
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            )}
          </MenuItem>
        ))}
      </Menu>

      <Menu
        anchorEl={modeAnchorEl}
        open={Boolean(modeAnchorEl)}
        onClose={() => setModeAnchorEl(null)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        transformOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <MenuItem onClick={() => { setMainView('editor'); setModeAnchorEl(null); }} selected={mainView === 'editor'}>
          <ListItemText primary="Editor Mode" />
        </MenuItem>
        <MenuItem onClick={() => { setMainView('board'); setModeAnchorEl(null); }} selected={mainView === 'board'}>
          <ListItemText primary="Planning Mode" />
        </MenuItem>
      </Menu>
    </Box>
  );
};
