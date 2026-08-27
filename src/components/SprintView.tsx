import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  Box, 
  Typography, 
  Button, 
  IconButton, 
  List, 
  ListItem, 
  ListItemText, 
  Paper,
  TextField,
  CircularProgress,
  Tooltip,
  Tabs,
  Tab,
  alpha
} from "@mui/material";
import { useSprint, useFile, useEditor, type SprintSession } from "../context";
import { countWords } from "../utils";
import { confirmDialog } from "../utils/dialog";
import { 
  PlayArrowIcon, 
  StopIcon, 
  DeleteIcon, 
  HistoryIcon, 
  InfoOutlinedIcon, 
  EmojiEventsIcon 
} from "./Icons";

export const SprintView = React.memo(() => {
  const { 
    activeSprints, 
    sprintHistory, 
    startSprint, 
    stopSprint, 
    cancelSprint, 
    addHistoryItem,
    deleteHistoryItem, 
    clearHistory 
  } = useSprint();

  const { rawText, parsedDoc, filePath, activeFileId } = useFile();
  const { updateSettings } = useEditor();
  const [activeTab, setActiveTab] = useState(0);

  const [sprintDuration, setSprintDuration] = useState<number>(25);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  const currentSprint = activeSprints[activeFileId];

  const [syncedFiles, setSyncedFiles] = useState<Record<string, boolean>>({});

  // Sync bundle history to global history when file changes or is loaded (runs only once per file ID)
  useEffect(() => {
    if (activeFileId && !syncedFiles[activeFileId]) {
      const bundleHistory = (parsedDoc.settings?.sprintHistory as SprintSession[]) || [];
      bundleHistory.forEach(session => {
        addHistoryItem(session);
      });
      setSyncedFiles(prev => ({ ...prev, [activeFileId]: true }));
    }
  }, [activeFileId, parsedDoc.settings?.sprintHistory, addHistoryItem, syncedFiles]);

  const handleDeleteHistoryItem = async (id: string) => {
    const isConfirmed = await confirmDialog("Are you sure you want to delete this sprint?", { kind: "warning" });
    if (isConfirmed) {
      deleteHistoryItem(id);
      if (filePath?.toLowerCase().endsWith(".actone")) {
        updateSettings((prev) => {
          const bundleHistory = (prev.sprintHistory || []) as SprintSession[];
          return {
            ...prev,
            sprintHistory: bundleHistory.filter(s => s.id !== id)
          };
        });
      }
    }
  };

  const handleClearHistory = async () => {
    const isConfirmed = await confirmDialog("Are you sure you want to clear all global sprint history and history stored in this file?", { kind: "warning" });
    if (isConfirmed) {
      clearHistory();
      if (filePath?.toLowerCase().endsWith(".actone")) {
        updateSettings((prev) => ({
          ...prev,
          sprintHistory: []
        }));
      }
    }
  };

  const currentTotalWords = useMemo(() => countWords(rawText), [rawText]);
  const sprintWords = currentSprint ? Math.max(0, currentTotalWords - currentSprint.startWordCount) : 0;

  useEffect(() => {
    if (currentSprint) {
      const updateTimer = () => {
        const elapsed = Math.floor((Date.now() - currentSprint.startTime) / 1000);
        const total = currentSprint.durationMinutes * 60;
        const remaining = Math.max(0, total - elapsed);
        setTimeLeft(remaining);
      };

      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setTimeLeft(0);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentSprint]);

  const handleStart = () => {
    if (sprintDuration && sprintDuration > 0) {
      startSprint(activeFileId, sprintDuration, currentTotalWords);
    }
  };

  const handleStop = () => {
    const fileName = filePath ? filePath.split(/[/\\]/).pop() : "Untitled";
    const session = stopSprint(activeFileId, currentTotalWords, fileName);
    
    // Also save to bundle if available
    if (session && filePath?.toLowerCase().endsWith(".actone")) {
      updateSettings((prev) => ({
        ...prev,
        sprintHistory: [session, ...((prev.sprintHistory as any[]) || [])]
      }));
    }
  };

  const handleCancel = () => {
    cancelSprint(activeFileId);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = currentSprint ? (1 - timeLeft / (currentSprint.durationMinutes * 60)) * 100 : 0;

  const presets = [5, 15, 25, 45, 60];

  // Dynamic statistics calculations
  const stats = useMemo(() => {
    if (sprintHistory.length === 0) return { pbWpm: 0, totalWords: 0, count: 0 };
    let totalWords = 0;
    let pbWpm = 0;
    sprintHistory.forEach(s => {
      totalWords += s.wordCount;
      const wpm = s.durationMinutes > 0 ? Math.round(s.wordCount / s.durationMinutes) : 0;
      if (wpm > pbWpm) pbWpm = wpm;
    });
    return { pbWpm, totalWords, count: sprintHistory.length };
  }, [sprintHistory]);

  const leaderboard = useMemo(() => {
    return [...sprintHistory]
      .sort((a, b) => b.wordCount - a.wordCount)
      .slice(0, 10);
  }, [sprintHistory]);

  // Dynamic WPM during active sprint
  const activeWpm = useMemo(() => {
    if (!currentSprint) return 0;
    const elapsedSeconds = Math.max(1, Math.floor((Date.now() - currentSprint.startTime) / 1000));
    const elapsedMinutes = elapsedSeconds / 60;
    return Math.round(sprintWords / elapsedMinutes);
  }, [currentSprint, sprintWords]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", p: 0, gap: 0, overflow: "hidden" }}>
      {/* Header Panel */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, height: 40, minHeight: 40, borderBottom: "1px solid", borderColor: "divider" }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, opacity: 0.8, fontSize: "0.7rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          Writing Sprint
        </Typography>
        <Tooltip title="Sprints track net word count gain in the active editor. Global history is stored locally; bundle data stays in .actone files.">
          <InfoOutlinedIcon sx={{ fontSize: 16, opacity: 0.6, cursor: "help" }} />
        </Tooltip>
      </Box>

      {/* Content Area */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", p: 1.5, gap: 1.5, overflowY: "auto" }}>
        {/* Main Timer Control Area */}
        <Box sx={{ mb: 0 }}>
        {!currentSprint ? (
          <Paper elevation={0} sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2, borderRadius: "12px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", boxShadow: (t) => t.palette.mode === "dark" ? "0 4px 16px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.04)" }}>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "text.disabled", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", display: "block", mb: 1 }}>
                Preset Duration
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {presets.map((p) => {
                  const isSelected = sprintDuration === p;
                  return (
                    <Box
                      key={p}
                      onClick={() => setSprintDuration(p)}
                      sx={{
                        px: 1.75,
                        py: 0.5,
                        borderRadius: "20px",
                        border: "none",
                        bgcolor: (t) => isSelected ? alpha(t.palette.primary.main, t.palette.mode === "dark" ? 0.25 : 0.14) : alpha(t.palette.text.primary, 0.05),
                        color: isSelected ? "primary.main" : "text.secondary",
                        fontSize: 11,
                        fontWeight: isSelected ? 700 : 600,
                        letterSpacing: "0.02em",
                        cursor: "pointer",
                        textTransform: "uppercase",
                        transition: "all 0.15s ease",
                        userSelect: "none",
                        "&:hover": {
                          bgcolor: (t) => isSelected ? alpha(t.palette.primary.main, 0.28) : alpha(t.palette.text.primary, 0.09),
                          color: isSelected ? "primary.main" : "text.primary",
                        },
                      }}
                    >
                      {p}m
                    </Box>
                  );
                })}
              </Box>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, borderTop: "1px solid", borderColor: "divider", pt: 1.5 }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>Custom Minutes</Typography>
                <Typography variant="caption" color="text.secondary">Enter custom duration</Typography>
              </Box>
              <TextField
                type="number"
                size="small"
                value={sprintDuration || ""}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setSprintDuration(isNaN(val) ? 0 : val);
                }}
                slotProps={{
                  htmlInput: { min: 1, max: 999, style: { textAlign: 'center', fontWeight: '700', width: '50px' } }
                }}
                sx={{
                  width: 85,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                  }
                }}
              />
            </Box>

            <Button
              variant="contained"
              fullWidth
              size="small"
              startIcon={<PlayArrowIcon />}
              onClick={handleStart}
              disabled={!sprintDuration || sprintDuration <= 0}
              sx={{
                borderRadius: "20px",
                py: 0.75,
                fontSize: "0.75rem",
                fontWeight: 600,
                textTransform: "none",
              }}
            >
              Start Sprint
            </Button>
          </Paper>
        ) : (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              display: "flex",
              flexDirection: "column",
              gap: 2,
              borderRadius: "12px",
              bgcolor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
              boxShadow: (t) => t.palette.mode === "dark" ? "0 6px 20px rgba(0,0,0,0.35)" : "0 2px 10px rgba(0,0,0,0.05)",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                <CircularProgress 
                  variant="determinate" 
                  value={progress} 
                  size={52} 
                  thickness={4.5} 
                  sx={{ color: "primary.main" }}
                />
                <Box
                  sx={{
                    top: 0, left: 0, bottom: 0, right: 0,
                    position: 'absolute', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Typography variant="caption" component="div" color="text.secondary" sx={{ fontSize: 11, fontWeight: 700 }}>
                    {Math.round(progress)}%
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ textAlign: "right" }}>
                <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: "monospace", letterSpacing: "-0.5px" }}>
                  {formatTime(timeLeft)}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Remaining</Typography>
              </Box>
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.25 }}>
              <Box sx={{ py: 1.25, textAlign: "center", borderRadius: "10px", bgcolor: (t) => alpha(t.palette.text.primary, 0.04) }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: "primary.main" }}>
                  {sprintWords}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: "uppercase", fontSize: "9.5px" }}>
                  Words Written
                </Typography>
              </Box>

              <Box sx={{ py: 1.25, textAlign: "center", borderRadius: "10px", bgcolor: (t) => alpha(t.palette.text.primary, 0.04) }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: "success.main" }}>
                  {activeWpm}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: "uppercase", fontSize: "9.5px" }}>
                  Current WPM
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                variant="contained"
                color="error"
                fullWidth
                size="small"
                startIcon={<StopIcon />}
                onClick={handleStop}
                sx={{
                  borderRadius: "20px",
                  py: 0.75,
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  textTransform: "none",
                }}
              >
                Finish Sprint
              </Button>
              <Button 
                variant="outlined" 
                color="inherit" 
                size="small"
                onClick={handleCancel}
                sx={{ 
                  borderRadius: "20px", 
                  py: 0.75,
                  px: 2,
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  textTransform: "none",
                  borderColor: "divider",
                  "&:hover": {
                    borderColor: "text.primary",
                    bgcolor: (t) => alpha(t.palette.text.primary, 0.06),
                  }
                }}
              >
                Cancel
              </Button>
            </Box>
          </Paper>
        )}
      </Box>

      {/* Tabs and History/Leaderboard Lists */}
      <Box sx={{ borderTop: "1px solid", borderColor: "divider", flex: 1, display: "flex", flexDirection: "column", minHeight: 0, pt: 1 }}>
        <Tabs 
          value={activeTab} 
          onChange={(_, val) => setActiveTab(val)} 
          variant="fullWidth" 
          sx={{ minHeight: 36, "& .MuiTab-root": { minHeight: 36, fontSize: 11.5, fontWeight: 700, borderRadius: "20px", mx: 0.5 } }}
        >
          <Tab icon={<HistoryIcon sx={{ fontSize: 15 }} />} iconPosition="start" label="History" />
          <Tab icon={<EmojiEventsIcon sx={{ fontSize: 15 }} />} iconPosition="start" label="Leaderboard" />
        </Tabs>
        
        {/* Statistics Dashboard Banner under tabs */}
        <Box sx={{ mx: 0.5, my: 1, px: 2, py: 1.25, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5, bgcolor: (t) => alpha(t.palette.text.primary, 0.04), borderRadius: "10px" }}>
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: 10.5 }}>Personal Best</Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{stats.pbWpm} WPM</Typography>
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: 10.5 }}>Total Sprinted</Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{stats.totalWords} words</Typography>
          </Box>
        </Box>

        <Box sx={{ flex: 1, overflowY: "auto", px: 0.5 }}>
          {activeTab === 0 ? (
            <List sx={{ width: "100%", p: 0, display: "flex", flexDirection: "column", gap: 0.5 }}>
              {sprintHistory.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: "center", fontStyle: "italic" }}>
                  No history yet. Start your first sprint!
                </Typography>
              ) : (
                sprintHistory.map((session) => (
                  <ListItem
                    key={session.id}
                    alignItems="flex-start"
                    secondaryAction={
                      <IconButton edge="end" size="small" onClick={() => handleDeleteHistoryItem(session.id)}>
                        <DeleteIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    }
                    sx={{ px: 1.5, py: 1, borderRadius: "8px", "&:hover": { bgcolor: (t) => alpha(t.palette.text.primary, 0.04) } }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: "flex", justifyContent: "space-between", pr: 2 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 12.5 }}>
                            {session.wordCount} words
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(session.startTime).toLocaleDateString()}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 0.25 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "11px" }}>
                            {session.durationMinutes}m • {session.durationMinutes > 0 ? Math.round(session.wordCount / session.durationMinutes) : 0} wpm
                          </Typography>
                          {session.fileName && (
                            <Typography variant="caption" sx={{ opacity: 0.7, fontStyle: "italic", fontSize: "10px", display: "block" }}>
                              File: {session.fileName}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                ))
              )}
              {sprintHistory.length > 0 && (
                <Box sx={{ p: 1.5, textAlign: "center" }}>
                  <Button size="small" color="error" onClick={handleClearHistory} sx={{ fontSize: 11, textTransform: "none", fontWeight: 600, borderRadius: "20px" }}>
                    Clear Global History
                  </Button>
                </Box>
              )}
            </List>
          ) : (
            <List sx={{ width: "100%", p: 0, display: "flex", flexDirection: "column", gap: 0.5 }}>
              {leaderboard.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: "center", fontStyle: "italic" }}>
                  Complete sprints to climb the ranks!
                </Typography>
              ) : (
                leaderboard.map((session, index) => {
                  let badgeColor = "text.disabled";
                  let badgeStyle = {};
                  if (index === 0) {
                    badgeColor = "#d4af37";
                    badgeStyle = { fontWeight: "900" };
                  } else if (index === 1) {
                    badgeColor = "#c0c0c0";
                    badgeStyle = { fontWeight: "900" };
                  } else if (index === 2) {
                    badgeColor = "#cd7f32";
                    badgeStyle = { fontWeight: "900" };
                  }

                  return (
                    <ListItem key={session.id} sx={{ px: 1.5, py: 1, borderRadius: "8px", "&:hover": { bgcolor: (t) => alpha(t.palette.text.primary, 0.04) } }}>
                      <Box sx={{ minWidth: 28, display: "flex", alignItems: "center", justifyContent: "center", color: badgeColor, fontSize: "14px", ...badgeStyle }}>
                        #{index + 1}
                      </Box>
                      <ListItemText
                        primary={
                          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 12.5 }}>
                              {session.wordCount} words
                            </Typography>
                            <Typography variant="body2" sx={{ color: "success.main", fontWeight: 800, fontSize: 12.5 }}>
                              {session.durationMinutes > 0 ? Math.round(session.wordCount / session.durationMinutes) : 0} wpm
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: "11px" }}>
                            {session.durationMinutes}m sprint on {new Date(session.startTime).toLocaleDateString()}
                          </Typography>
                        }
                      />
                    </ListItem>
                  );
                })
              )}
            </List>
          )}
        </Box>
      </Box>
      </Box>
    </Box>
  );
});
