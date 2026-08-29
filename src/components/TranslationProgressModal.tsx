import React, { useMemo } from "react";
import {
  Box,
  Typography,
  LinearProgress,
  Button,
  Chip,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useUI, useFile } from "../context";
import { CheckIcon, PlayArrowIcon, StopIcon, PauseIcon, AutoAwesomeIcon, OpenInNewIcon } from "./Icons";

export const TranslationProgressModal: React.FC = () => {
  const {
    isTranslationModalOpen,
    setIsTranslationModalOpen,
    translationJob: job,
    pauseTranslation,
    resumeTranslation,
    cancelTranslation,
  } = useUI();
  const { scripts, setActiveScript } = useFile();

  const handleClose = () => {
    setIsTranslationModalOpen(false);
  };

  const handleOpenTranslatedScript = () => {
    if (job?.scriptName && scripts && scripts.length > 0) {
      const idx = scripts.findIndex((s) => s.name === job.scriptName);
      if (idx !== -1) {
        setActiveScript(idx);
      }
    }
    handleClose();
  };

  const handleCancel = () => {
    cancelTranslation();
    handleClose();
  };

  const handlePauseResume = () => {
    if (!job) return;
    if (job.state === "paused") {
      resumeTranslation();
    } else {
      pauseTranslation();
    }
  };

  const translatedLines = job?.translatedLines ?? 0;
  const totalLines = job?.totalLines && job.totalLines > 0 ? job.totalLines : 1;
  const percent = Math.min(100, Math.round((translatedLines / totalLines) * 100));
  const isFinished = job?.state === "completed" || percent >= 100;
  const isPaused = job?.state === "paused";
  const isError = job?.state === "error";

  const durationSec = useMemo(() => {
    if (!job?.startTime) return null;
    const end = job.endTime || Date.now();
    return Math.max(1, Math.round((end - job.startTime) / 1000));
  }, [job?.startTime, job?.endTime]);

  let progressText = `Line ${Math.min(translatedLines + 1, totalLines)} of ${totalLines}`;
  if (isFinished) progressText = `Translated ${totalLines} lines`;

  return (
    <Dialog
      open={isTranslationModalOpen}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: "12px",
            bgcolor: "background.paper",
            backgroundImage: "none",
          }
        }
      }}
    >
      <DialogTitle sx={{ 
        m: 0, 
        p: 2, 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between",
        borderBottom: "1px solid",
        borderColor: "divider"
      }}>
        <Typography variant="h6" sx={{ fontSize: "1rem", fontWeight: 700 }}>
          {isFinished ? "Translation Complete" : "Translating Document"}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ p: 2 }}>
        <Paper
          elevation={0}
          sx={{
            p: 1.75,
            borderRadius: "10px",
            border: "1px solid",
            borderColor: isFinished ? "color-mix(in srgb, var(--button-color, #2EAADC) 40%, divider)" : "divider",
            bgcolor: "background.default",
            mb: 2,
            mt: 1,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: "8px",
                  bgcolor: (t) => alpha(t.palette.primary.main, isFinished ? 0.2 : 0.12),
                  color: "primary.main",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {isFinished ? <CheckIcon sx={{ fontSize: 18 }} /> : <AutoAwesomeIcon sx={{ fontSize: 18 }} />}
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "0.9rem", lineHeight: 1.2 }}>
                  {job?.scriptName || "Target Script"}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
                  Source: {job?.sourceScriptName || "Active Script"}
                </Typography>
              </Box>
            </Box>

            <Chip
              label={job ? job.lang : "Translating"}
              size="small"
              sx={{
                fontWeight: 600,
                fontSize: "0.72rem",
                bgcolor: (t) => alpha(t.palette.primary.main, 0.15),
                color: "primary.main",
                border: "1px solid",
                borderColor: (t) => alpha(t.palette.primary.main, 0.3),
              }}
            />
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1.2, pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.72rem" }}>
              AI Engine:
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 600, fontSize: "0.72rem" }}>
              {job?.provider === "openai-compatible" ? "OpenAI API" : job?.provider === "ollama" ? "Ollama (Local)" : job?.provider?.toUpperCase() || "OpenAI API"} • {job?.model || "Configured Model"}
            </Typography>
          </Box>
        </Paper>

        {isFinished ? (
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              borderRadius: "8px",
              bgcolor: (t) => alpha(t.palette.primary.main, 0.06),
              border: "1px solid",
              borderColor: (t) => alpha(t.palette.primary.main, 0.2),
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main", fontSize: "0.85rem", mb: 1, display: "flex", alignItems: "center", gap: 0.8 }}>
              <CheckIcon sx={{ fontSize: 16 }} /> Translation Finished Successfully
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.7rem", display: "block" }}>
                  Lines Translated
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.82rem" }}>
                  {job?.translatedLines ?? 0} lines ({job?.totalBatches || 1} chunks)
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.7rem", display: "block" }}>
                  Time Elapsed
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.82rem" }}>
                  {durationSec ? `${durationSec}s` : "Complete"}
                </Typography>
              </Box>
            </Box>
          </Paper>
        ) : (
          <Box sx={{ mt: 1 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.82rem" }}>
                {isError
                  ? `Translation Error: ${job?.error || "Failed"}`
                  : isPaused
                  ? `Paused at ${progressText}`
                  : `Translating: ${progressText}`}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: isError ? "error.main" : "primary.main", fontSize: "0.85rem" }}>
                {percent}%
              </Typography>
            </Box>

            <LinearProgress
              variant="determinate"
              value={percent}
              color={isError ? "error" : "primary"}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: (t) => alpha(t.palette.text.primary, 0.08),
                "& .MuiLinearProgress-bar": {
                  borderRadius: 4,
                  transition: "transform 0.4s ease",
                },
              }}
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: "1px solid", borderColor: "divider", justifyContent: "space-between" }}>
        <Button
          variant="outlined"
          color="error"
          size="small"
          onClick={handleCancel}
          startIcon={<StopIcon sx={{ fontSize: 15 }} />}
          disabled={isFinished}
          sx={{ textTransform: "none", fontSize: "0.8rem", borderRadius: "6px" }}
        >
          Stop
        </Button>

        <Box sx={{ display: "flex", gap: 1 }}>
          {!isFinished && !isError && (
            <Button
              variant="outlined"
              size="small"
              onClick={handlePauseResume}
              startIcon={isPaused ? <PlayArrowIcon sx={{ fontSize: 16 }} /> : <PauseIcon sx={{ fontSize: 16 }} />}
              sx={{ textTransform: "none", fontSize: "0.8rem", borderRadius: "6px" }}
            >
              {isPaused ? "Resume" : "Pause"}
            </Button>
          )}

          {isFinished ? (
            <>
              <Button
                variant="outlined"
                size="small"
                onClick={handleClose}
                sx={{ textTransform: "none", fontSize: "0.8rem", borderRadius: "6px" }}
              >
                Close
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={handleOpenTranslatedScript}
                startIcon={<OpenInNewIcon sx={{ fontSize: 16 }} />}
                sx={{ textTransform: "none", fontSize: "0.8rem", borderRadius: "6px", fontWeight: 600 }}
              >
                Open Translated Script
              </Button>
            </>
          ) : (
            <Button
              variant="contained"
              size="small"
              onClick={handleClose}
              sx={{ textTransform: "none", fontSize: "0.8rem", borderRadius: "6px", fontWeight: 600 }}
            >
              Run in Background
            </Button>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
};
