import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  Box, 
  Typography, 
  Button, 
  IconButton, 
  List, 
  ListItem, 
  ListItemText, 
  Divider, 
  Paper,
  TextField,
  CircularProgress,
  Tooltip,
  Tabs,
  Tab
} from "@mui/material";
import { useSprint, useFile, useEditor, type SprintSession } from "../context";
import { countWords } from "../utils";
import { 
  PlayArrowIcon, 
  StopIcon, 
  DeleteIcon, 
  HistoryIcon, 
  TimerIcon, 
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

  const handleDeleteHistoryItem = (id: string) => {
    if (window.confirm("Are you sure you want to delete this sprint?")) {
      deleteHistoryItem(id);
      if (filePath?.toLowerCase().endsWith(".actone")) {
        updateSettings((prev: any) => {
          const bundleHistory = (prev.sprintHistory || []) as SprintSession[];
          return {
            ...prev,
            sprintHistory: bundleHistory.filter(s => s.id !== id)
          };
        });
      }
    }
  };

  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to clear all global sprint history and history stored in this file?")) {
      clearHistory();
      if (filePath?.toLowerCase().endsWith(".actone")) {
        updateSettings((prev: any) => ({
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
    const session = stopSprint(activeFileId, sprintWords, fileName);
    
    // Also save to bundle if available
    if (session && filePath?.toLowerCase().endsWith(".actone")) {
      updateSettings((prev: any) => ({
        ...prev,
        sprintHistory: [session, ...(prev.sprintHistory || [])]
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
      <Box sx={{ p: 2, pb: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, opacity: 0.9, display: "flex", alignItems: "center", gap: 1 }}>
          <TimerIcon sx={{ fontSize: 18, color: "primary.main" }} /> Writing Sprint
        </Typography>
        <Tooltip title="Sprints track net word count gain in the active editor. Global history is stored locally; bundle data stays in .actone files.">
          <InfoOutlinedIcon sx={{ fontSize: 16, opacity: 0.6, cursor: "help" }} />
        </Tooltip>
      </Box>

      {/* Main Timer Control Area */}
      <Box sx={{ px: 2, mb: 2 }}>
        {!currentSprint ? (
          <Paper variant="outlined" sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2, borderRadius: "14px", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "var(--shadow-sm)" }}>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", textTransform: "uppercase", display: "block", mb: 1 }}>
                Preset Duration
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {presets.map((p) => (
                  <Button
                    key={p}
                    variant={sprintDuration === p ? "contained" : "outlined"}
                    size="small"
                    onClick={() => setSprintDuration(p)}
                    sx={{
                      borderRadius: "20px",
                      textTransform: "none",
                      fontWeight: 600,
                      px: 2,
                      minWidth: "60px",
                      fontSize: "11.5px",
                    }}
                  >
                    {p}m
                  </Button>
                ))}
              </Box>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, borderTop: "1px solid", borderColor: "divider", pt: 1.5 }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>Custom Minutes</Typography>
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
                  width: 90,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                  }
                }}
              />
            </Box>

            <Button 
              variant="contained" 
              fullWidth 
              startIcon={<PlayArrowIcon />} 
              onClick={handleStart}
              disabled={!sprintDuration || sprintDuration <= 0}
              sx={{ 
                mt: 0.5, 
                py: 1.25,
                fontWeight: 700,
                fontSize: "13px",
                borderRadius: "12px", 
                textTransform: "none",
                transition: "transform 0.2s",
                "&:hover": {
                  transform: "translateY(-1px)",
                },
                "&:active": {
                  transform: "translateY(0)"
                }
              }}
            >
              Start Sprint
            </Button>
          </Paper>
        ) : (
          <Paper 
            variant="outlined" 
            sx={{ 
              p: 2.5, 
              display: "flex", 
              flexDirection: "column", 
              gap: 2.5, 
              borderRadius: "14px", 
              background: "linear-gradient(145deg, rgba(var(--accent-rgb), 0.04) 0%, rgba(var(--accent-rgb), 0.08) 100%)",
              border: "1px solid rgba(var(--accent-rgb), 0.15)",
              boxShadow: "var(--shadow-md)"
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

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
              <Box sx={{ py: 1.5, textAlign: "center", border: "1px solid rgba(0,0,0,0.06)", borderRadius: "10px", bgcolor: "background.paper" }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: "primary.main" }}>
                  {sprintWords}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: "uppercase", fontSize: "9.5px" }}>
                  Words Written
                </Typography>
              </Box>

              <Box sx={{ py: 1.5, textAlign: "center", border: "1px solid rgba(0,0,0,0.06)", borderRadius: "10px", bgcolor: "background.paper" }}>
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
                startIcon={<StopIcon />} 
                onClick={handleStop}
                sx={{ 
                  borderRadius: "10px", 
                  textTransform: "none", 
                  fontWeight: 700, 
                  py: 1.25,
                  boxShadow: "0 4px 12px rgba(211, 47, 47, 0.2)"
                }}
              >
                Finish Sprint
              </Button>
              <Button 
                variant="outlined" 
                color="inherit" 
                onClick={handleCancel}
                sx={{ 
                  borderRadius: "10px", 
                  textTransform: "none", 
                  fontWeight: 600, 
                  py: 1.25,
                  borderColor: "rgba(0,0,0,0.15)",
                  "&:hover": {
                    borderColor: "text.primary"
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
      <Box sx={{ borderTop: 1, borderColor: "divider", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <Tabs 
          value={activeTab} 
          onChange={(_, val) => setActiveTab(val)} 
          variant="fullWidth" 
          sx={{ minHeight: 40, "& .MuiTab-root": { minHeight: 40, fontSize: 11, fontWeight: 700 } }}
        >
          <Tab icon={<HistoryIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="History" />
          <Tab icon={<EmojiEventsIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Leaderboard" />
        </Tabs>
        
        {/* Statistics Dashboard Banner under tabs */}
        <Box sx={{ px: 2, py: 1.5, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5, bgcolor: "action.hover", borderBottom: "1px solid", borderColor: "divider" }}>
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Personal Best</Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{stats.pbWpm} WPM</Typography>
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Total Sprinted</Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{stats.totalWords} words</Typography>
          </Box>
        </Box>

        <Box sx={{ flex: 1, overflowY: "auto" }}>
          {activeTab === 0 ? (
            <List sx={{ width: "100%", p: 0 }}>
              {sprintHistory.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: "center", fontStyle: "italic" }}>
                  No history yet. Start your first sprint!
                </Typography>
              ) : (
                sprintHistory.map((session) => (
                  <React.Fragment key={session.id}>
                    <ListItem
                      alignItems="flex-start"
                      secondaryAction={
                        <IconButton edge="end" size="small" onClick={() => handleDeleteHistoryItem(session.id)}>
                          <DeleteIcon sx={{ fontSize: 15 }} />
                        </IconButton>
                      }
                      sx={{ px: 2, py: 1.25 }}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: "flex", justifyContent: "space-between", pr: 2 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {session.wordCount} words
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(session.startTime).toLocaleDateString()}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Box sx={{ mt: 0.5 }}>
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
                    <Divider />
                  </React.Fragment>
                ))
              )}
              {sprintHistory.length > 0 && (
                <Box sx={{ p: 2, textAlign: "center" }}>
                  <Button size="small" color="error" onClick={handleClearHistory} sx={{ fontSize: 10.5, textTransform: "none", fontWeight: 600 }}>
                    Clear Global History
                  </Button>
                </Box>
              )}
            </List>
          ) : (
            <List sx={{ width: "100%", p: 0 }}>
              {leaderboard.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: "center", fontStyle: "italic" }}>
                  Complete sprints to climb the ranks!
                </Typography>
              ) : (
                leaderboard.map((session, index) => {
                  let badgeColor = "text.disabled";
                  let badgeStyle = {};
                  if (index === 0) {
                    badgeColor = "#d4af37"; // Gold
                    badgeStyle = { textShadow: "0 0 4px rgba(212, 175, 55, 0.4)", fontWeight: "900" };
                  } else if (index === 1) {
                    badgeColor = "#c0c0c0"; // Silver
                    badgeStyle = { textShadow: "0 0 4px rgba(192, 192, 192, 0.4)", fontWeight: "900" };
                  } else if (index === 2) {
                    badgeColor = "#cd7f32"; // Bronze
                    badgeStyle = { textShadow: "0 0 4px rgba(205, 127, 50, 0.4)", fontWeight: "900" };
                  }

                  return (
                    <React.Fragment key={session.id}>
                      <ListItem sx={{ px: 2, py: 1.25 }}>
                        <Box sx={{ minWidth: 32, display: "flex", alignItems: "center", justifyContent: "center", color: badgeColor, fontSize: "15px", ...badgeStyle }}>
                          #{index + 1}
                        </Box>
                        <ListItemText
                          primary={
                            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                {session.wordCount} words
                              </Typography>
                              <Typography variant="body2" sx={{ color: "success.main", fontWeight: 800 }}>
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
                      <Divider />
                    </React.Fragment>
                  );
                })
              )}
            </List>
          )}
        </Box>
      </Box>
    </Box>
  );
});
