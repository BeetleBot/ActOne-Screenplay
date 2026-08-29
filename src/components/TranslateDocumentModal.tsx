import React, { useMemo, useState, useEffect } from "react";
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
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Tooltip,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useUI, useFile } from "../context";
import { CheckIcon, PlayArrowIcon, StopIcon, PauseIcon, AutoAwesomeIcon, OpenInNewIcon } from "./Icons";
import { usePromptConfig } from "../hooks/usePromptConfig";
import { runTranslationJob, analyzeFountainLine } from "../utils/translationEngine";
import { parseScreenplay } from "../parser";

export const BetaTooltip: React.FC = () => (
  <Tooltip title="Muse AI features are currently in Beta. Responses and capabilities are constantly improving with each update." arrow placement="top">
    <Chip 
      label="Beta" 
      size="small" 
      color="primary" 
      variant="outlined" 
      sx={{ 
        height: 16, 
        fontSize: "0.6rem", 
        ml: 1, 
        borderColor: (t) => alpha(t.palette.primary.main, 0.5),
        color: (t) => alpha(t.palette.primary.main, 0.8),
        cursor: "help"
      }} 
    />
  </Tooltip>
);

export const TranslateDocumentModal: React.FC = () => {
  const {
    isTranslationModalOpen,
    setIsTranslationModalOpen,
    translationJob: job,
    translationState,
    pauseTranslation,
    resumeTranslation,
    cancelTranslation,
    translationSetupTarget,
    setTranslationState,
    setTranslatingTarget,
    setTranslationJob,
    registerTranslationAbort,
    getTranslationState,
  } = useUI();
  const { scripts, setActiveScript, duplicateScript, activeFileId, updateFileScriptContent } = useFile();
  const promptConfig = usePromptConfig();

  // Mode determines what UI to show. If a job is active, show progress. Otherwise, show setup.
  const isJobActive = translationState === "running" || translationState === "paused" || job?.state === "completed" || job?.state === "error";
  const mode = (isJobActive && job) ? "progress" : "setup";

  // --- Setup State ---
  const sourceScript = translationSetupTarget && scripts ? scripts[translationSetupTarget.scriptIndex] : null;
  const originalNameClean = sourceScript?.name.replace(/\.fountain$/i, "").trim() || "Script";

  const [targetLang, setTargetLang] = useState<string>(promptConfig.translateLanguages[0] || "Spanish");
  const [targetFileName, setTargetFileName] = useState<string>("");
  const [preserveNames, setPreserveNames] = useState<boolean>(true);
  const [rememberSettings, setRememberSettings] = useState<boolean>(false);

  const [elements, setElements] = useState({
    heading: false,
    action: true,
    dialogue: true,
    parenthetical: false,
    transition: false,
  });

  const [tones, setTones] = useState({
    heading: "Translate as it is (Literal)",
    action: "Translate as it is (Literal)",
    dialogue: "Natural/Conversational",
    parenthetical: "Natural/Conversational",
    transition: "Translate as it is (Literal)",
  });

  // Load preferences
  useEffect(() => {
    if (isTranslationModalOpen && mode === "setup") {
      setTargetFileName(`${originalNameClean}-${targetLang}`);
      
      try {
        const saved = localStorage.getItem("actone-translate-doc-prefs");
        if (saved) {
          const p = JSON.parse(saved);
          if (p.elements) setElements(p.elements);
          if (p.tones) setTones(p.tones);
          if (p.preserveNames !== undefined) setPreserveNames(p.preserveNames);
          setRememberSettings(true);
        }
      } catch (e) {}
    }
  }, [isTranslationModalOpen, mode, originalNameClean, targetLang]);

  const handleStart = async () => {
    if (!translationSetupTarget || !sourceScript) return;

    if (rememberSettings) {
      localStorage.setItem("actone-translate-doc-prefs", JSON.stringify({ elements, tones, preserveNames }));
    } else {
      localStorage.removeItem("actone-translate-doc-prefs");
    }

    try {
      const duplicatedName = await duplicateScript(translationSetupTarget.scriptIndex, targetFileName, false);
      if (!duplicatedName) throw new Error("Failed to duplicate script");

      const rawLines = sourceScript.content.split(/\r?\n/);
      const doc = parseScreenplay(sourceScript.content);
      const parsedLines = doc.lines;
      
      // Override isTranslatable based on user selection
      const analyzedLines = rawLines.map((line, i) => {
        const analyzed = analyzeFountainLine(line, parsedLines[i]);
        const type = parsedLines[i]?.type;
        
        let translatable = false;
        if (type === 1 && elements.heading) translatable = true; // heading
        if (type === 2 && elements.action) translatable = true; // action
        if (type === 3 && elements.dialogue) translatable = true; // character
        if (type === 4 && elements.dialogue) translatable = true; // dialogue
        if (type === 5 && elements.parenthetical) translatable = true; // parenthetical
        if (type === 6 && elements.transition) translatable = true; // transition
        if (type === 13 && elements.action) translatable = true; // centered
        if (type === 15 && elements.action) translatable = true; // synopse

        return { ...analyzed, isTranslatable: translatable && !!analyzed.cleanText.trim() };
      });

      // Construct dynamic system prompt
      const toneInstructions = [];
      if (elements.dialogue) toneInstructions.push(`- Dialogue lines: ${tones.dialogue}`);
      if (elements.action) toneInstructions.push(`- Action lines: ${tones.action}`);
      if (elements.heading) toneInstructions.push(`- Scene Headings: ${tones.heading}`);
      if (elements.parenthetical) toneInstructions.push(`- Parentheticals: ${tones.parenthetical}`);
      if (elements.transition) toneInstructions.push(`- Transitions: ${tones.transition}`);

      await runTranslationJob({
        lang: targetLang,
        promptConfig,
        sourceScriptName: sourceScript.name,
        duplicatedName,
        targetFileId: activeFileId || translationSetupTarget.fileId,
        targetScriptIndex: translationSetupTarget.scriptIndex + 1,
        lines: rawLines,
        analyzedLines,
        parsedDoc: doc,
        preserveCharacterNames: preserveNames,
        dynamicToneInstructions: toneInstructions.join("\n"),
        updateFileScriptContent,
        uiActions: {
          setAiStatus: () => {},
          setTranslationState,
          setTranslatingTarget,
          setTranslationJob,
          setIsTranslationModalOpen,
          registerTranslationAbort,
          getTranslationState,
        },
      });
    } catch (err) {
      console.error(err);
    }
  };


  // --- Progress State ---
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

  const toneOptions = ["Natural/Conversational", "Translate as it is (Literal)", "Casual/Slang"];

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
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Typography variant="h6" sx={{ fontSize: "1rem", fontWeight: 700 }}>
            {mode === "setup" ? "Translate Whole Document" : (isFinished ? "Translation Complete" : "Translating Document")}
          </Typography>
          <BetaTooltip />
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {mode === "setup" ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Box sx={{ display: "flex", gap: 2 }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Target Language</InputLabel>
                <Select value={targetLang} label="Target Language" onChange={(e) => {
                  setTargetLang(e.target.value);
                  setTargetFileName(`${originalNameClean}-${e.target.value}`);
                }}>
                  {promptConfig.translateLanguages.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField 
                size="small" 
                fullWidth 
                label="New File Name" 
                value={targetFileName} 
                onChange={(e) => setTargetFileName(e.target.value)} 
              />
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Elements to Translate & Tone</Typography>
              <FormGroup>
                {(['dialogue', 'action', 'heading', 'parenthetical', 'transition'] as const).map((key) => (
                  <Box key={key} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
                    <FormControlLabel
                      control={<Checkbox size="small" checked={elements[key]} onChange={(e) => setElements({...elements, [key]: e.target.checked})} />}
                      label={<Typography variant="body2" sx={{ textTransform: "capitalize" }}>{key}</Typography>}
                    />
                    {elements[key] && (
                      <FormControl size="small" sx={{ width: 220 }}>
                        <Select 
                          value={tones[key]} 
                          onChange={(e) => setTones({...tones, [key]: e.target.value})}
                          sx={{ fontSize: "0.8rem", height: 32 }}
                        >
                          {toneOptions.map(opt => <MenuItem key={opt} value={opt} sx={{ fontSize: "0.8rem" }}>{opt}</MenuItem>)}
                        </Select>
                      </FormControl>
                    )}
                  </Box>
                ))}
              </FormGroup>
            </Box>

            <Box>
              <FormControlLabel
                control={<Checkbox size="small" checked={preserveNames} onChange={(e) => setPreserveNames(e.target.checked)} />}
                label={<Typography variant="body2">Do not translate Character Names</Typography>}
              />
              <FormControlLabel
                control={<Checkbox size="small" checked={rememberSettings} onChange={(e) => setRememberSettings(e.target.checked)} />}
                label={<Typography variant="body2">Remember my settings</Typography>}
              />
            </Box>
          </Box>
        ) : (
          <>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
              <Box sx={{ 
                width: 40, height: 40, borderRadius: "50%", 
                bgcolor: (t) => alpha(t.palette.primary.main, 0.1),
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "primary.main"
              }}>
                <AutoAwesomeIcon sx={{ fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.9rem" }}>
                  {job?.scriptName || "Document"}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.2 }}>
                  <Chip 
                    label={job?.lang} 
                    size="small" 
                    sx={{ height: 20, fontSize: "0.65rem", fontWeight: 600, bgcolor: "primary.main", color: "primary.contrastText" }} 
                  />
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Source: {job?.sourceScriptName}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Paper elevation={0} sx={{ p: 2, borderRadius: "10px", bgcolor: (t) => alpha(t.palette.background.default, 0.6), border: "1px solid", borderColor: "divider", mb: 3, position: "relative", overflow: "hidden" }}>
              {isFinished ? (
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main", mb: 1, display: "flex", alignItems: "center", gap: 0.8 }}>
                    <CheckIcon sx={{ fontSize: 16 }} /> Translation Finished Successfully
                  </Typography>
                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
                    <Box>
                      <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>Lines Translated</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{job?.translatedLines ?? 0} lines</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>Time Elapsed</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{durationSec ? `${durationSec}s` : "Complete"}</Typography>
                    </Box>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ mt: 1 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {isError ? `Error: ${job?.error || "Failed"}` : isPaused ? `Paused at ${progressText}` : `Translating: ${progressText}`}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: isError ? "error.main" : "primary.main" }}>{percent}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={percent} color={isError ? "error" : "primary"} />
                </Box>
              )}
            </Paper>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: "1px solid", borderColor: "divider", justifyContent: "space-between" }}>
        {mode === "setup" ? (
          <>
            <Button onClick={handleClose} color="inherit">Cancel</Button>
            <Button variant="contained" onClick={handleStart} disableElevation startIcon={<AutoAwesomeIcon />}>Start Translation</Button>
          </>
        ) : (
          <>
            <Button variant="outlined" color="error" size="small" onClick={handleCancel} startIcon={<StopIcon />} disabled={isFinished}>Stop</Button>
            <Box sx={{ display: "flex", gap: 1 }}>
              {!isFinished && !isError && (
                <Button variant="outlined" size="small" onClick={handlePauseResume} startIcon={isPaused ? <PlayArrowIcon /> : <PauseIcon />}>
                  {isPaused ? "Resume" : "Pause"}
                </Button>
              )}
              {isFinished ? (
                <Button variant="contained" size="small" onClick={handleOpenTranslatedScript} startIcon={<OpenInNewIcon />} disableElevation>Open Translated Script</Button>
              ) : (
                <Button variant="contained" size="small" onClick={handleClose} disableElevation>Run in Background</Button>
              )}
            </Box>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};
