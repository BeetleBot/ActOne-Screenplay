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
  Slider,
  CircularProgress,
  Tooltip,
  Tabs,
  Tab
} from "@mui/material";
import { useSprint, SprintSession } from "../context/SprintContext";
import { useAppContext } from "../context/AppContext";
import { countWords } from "../utils/text";
import { PlayArrowIcon, StopIcon, DeleteIcon, HistoryIcon, TimerIcon, InfoOutlinedIcon, EmojiEventsIcon } from "./Icons";


export const SprintView: React.FC = () => {
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

  const { rawText, parsedDoc, updateSettings, filePath, activeFileId } = useAppContext();
  const [activeTab, setActiveTab] = useState(0);

  const [sprintDuration, setSprintDuration] = useState(25);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<any>(null);

  const currentSprint = activeSprints[activeFileId];

  // Sync bundle history to global history when file changes or is loaded
  useEffect(() => {
    const bundleHistory = (parsedDoc.settings?.sprintHistory as SprintSession[]) || [];
    bundleHistory.forEach(session => {
      addHistoryItem(session);
    });
  }, [parsedDoc.settings?.sprintHistory, addHistoryItem]);

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
    startSprint(activeFileId, sprintDuration, currentTotalWords);
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

  const leaderboard = useMemo(() => {
    return [...sprintHistory]
      .sort((a, b) => b.wordCount - a.wordCount)
      .slice(0, 10);
  }, [sprintHistory]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", p: 0, gap: 0, overflow: "hidden" }}>
      <Box sx={{ p: 2, pb: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, opacity: 0.8, display: "flex", alignItems: "center", gap: 1 }}>
          <TimerIcon sx={{ fontSize: 18 }} /> Writing Sprint
        </Typography>
        <Tooltip title="Sprints are file-specific. Sprints track net word count gain in the active editor. Global history is stored locally; bundle data stays in .actone files.">
          <InfoOutlinedIcon sx={{ fontSize: 16, opacity: 0.5, cursor: "help" }} />
        </Tooltip>
      </Box>

      <Box sx={{ px: 2, mb: 2 }}>
        {!currentSprint ? (
          <Paper variant="outlined" sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2, borderRadius: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Set Sprint Duration</Typography>
            <Box sx={{ px: 1 }}>
              <Slider
                value={sprintDuration}
                onChange={(_, val) => setSprintDuration(val as number)}
                min={1}
                max={60}
                valueLabelDisplay="auto"
                marks={[
                  { value: 5, label: "5m" },
                  { value: 15, label: "15m" },
                  { value: 25, label: "25m" },
                  { value: 45, label: "45m" },
                  { value: 60, label: "60m" },
                ]}
              />
            </Box>
            <Button 
              variant="contained" 
              fullWidth 
              startIcon={<PlayArrowIcon />} 
              onClick={handleStart}
              sx={{ mt: 1, borderRadius: 2, textTransform: "none" }}
            >
              Start {sprintDuration}m Sprint
            </Button>
          </Paper>
        ) : (
          <Paper variant="outlined" sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2, borderRadius: 2, bgcolor: "action.hover" }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                <CircularProgress variant="determinate" value={progress} size={40} />
                <Box
                  sx={{
                    top: 0, left: 0, bottom: 0, right: 0,
                    position: 'absolute', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Typography variant="caption" component="div" color="text.secondary" sx={{ fontSize: 10 }}>
                    {Math.round(progress)}%
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ textAlign: "right" }}>
                <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: "monospace" }}>
                  {formatTime(timeLeft)}
                </Typography>
                <Typography variant="caption" color="text.secondary">Remaining</Typography>
              </Box>
            </Box>

            <Box sx={{ py: 2, textAlign: "center", border: "1px dashed", borderColor: "divider", borderRadius: 1, bgcolor: "background.paper" }}>
              <Typography variant="h4" sx={{ fontWeight: 800, color: "primary.main" }}>
                {sprintWords}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: "uppercase" }}>
                Words Written
              </Typography>
            </Box>

            <Box sx={{ display: "flex", gap: 1 }}>
              <Button 
                variant="contained" 
                color="error" 
                fullWidth 
                startIcon={<StopIcon />} 
                onClick={handleStop}
                sx={{ borderRadius: 2, textTransform: "none" }}
              >
                Finish Sprint
              </Button>
              <Button 
                variant="outlined" 
                color="inherit" 
                onClick={handleCancel}
                sx={{ borderRadius: 2, textTransform: "none" }}
              >
                Cancel
              </Button>
            </Box>
          </Paper>
        )}
      </Box>

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
                        <IconButton edge="end" size="small" onClick={() => deleteHistoryItem(session.id)}>
                          <DeleteIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      }
                      sx={{ px: 2, py: 1.5 }}
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
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                              {session.durationMinutes}m • {Math.round(session.wordCount / session.durationMinutes)} wpm
                            </Typography>
                            {session.fileName && (
                              <Typography variant="caption" sx={{ opacity: 0.6, fontStyle: "italic", fontSize: 10 }}>
                                Project: {session.fileName}
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
                  <Button size="small" color="error" onClick={clearHistory} sx={{ fontSize: 10, textTransform: "none" }}>
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
                leaderboard.map((session, index) => (
                  <React.Fragment key={session.id}>
                    <ListItem sx={{ px: 2, py: 1.5 }}>
                      <Box sx={{ minWidth: 30, fontWeight: 800, color: index < 3 ? "primary.main" : "text.disabled", fontSize: 16 }}>
                        #{index + 1}
                      </Box>
                      <ListItemText
                        primary={
                          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {session.wordCount} words
                            </Typography>
                            <Typography variant="body2" sx={{ color: "success.main", fontWeight: 800 }}>
                              {Math.round(session.wordCount / session.durationMinutes)} wpm
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            {session.durationMinutes}m sprint on {new Date(session.startTime).toLocaleDateString()}
                          </Typography>
                        }
                      />
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))
              )}
            </List>
          )}
        </Box>
      </Box>
    </Box>
  );
};
