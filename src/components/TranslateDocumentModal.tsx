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
  Divider,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useUI, useFile } from "../context";
import { CheckIcon, PlayArrowIcon, StopIcon, PauseIcon, AutoAwesomeIcon, OpenInNewIcon, RestartAltIcon } from "./Icons";
import { usePromptConfig, fetchModels, getActiveModelName, PromptProvider, PromptConfig } from "../hooks/usePromptConfig";
import { STORAGE_KEYS } from "../constants";
import { runTranslationJob, analyzeFountainLine } from "../utils/translationEngine";
import { parseScreenplay, LineType } from "../parser";

export const BetaTooltip: React.FC = () => (
  <Tooltip title="Muse AI features are currently in Beta. Responses and capabilities are constantly improving with each update." arrow placement="top">
    <Chip 
      label="Beta" 
      size="small" 
      color="primary" 
      variant="outlined" 
      sx={{ 
        height: 18, 
        fontSize: "0.65rem", 
        ml: 1.5,
        mt: 0.2, // Tiny nudge down to align with text cap height
        borderColor: (t) => alpha(t.palette.primary.main, 0.5),
        color: (t) => alpha(t.palette.primary.main, 0.8),
        cursor: "help",
        "& .MuiChip-label": { px: 1, py: 0 }
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
  const { scripts, activeScriptIndex, setActiveScript, duplicateScript, activeFileId, updateFileScriptContent } = useFile();
  const promptConfig = usePromptConfig();

  // Mode determines what UI to show. If a job is active, show progress. Otherwise, show setup.
  const isJobActive = translationState === "running" || translationState === "paused" || job?.state === "running" || job?.state === "completed" || job?.state === "error";
  const mode = (isJobActive && job) ? "progress" : "setup";

  // --- Setup State ---
  const effectiveTarget = translationSetupTarget || (activeFileId && scripts?.length ? { fileId: activeFileId, scriptIndex: activeScriptIndex ?? 0 } : null);
  const sourceScript = effectiveTarget && scripts && scripts.length > 0 ? scripts[effectiveTarget.scriptIndex] || scripts[0] : null;
  const originalNameClean = sourceScript?.name.replace(/\.fountain$/i, "").trim() || "Script";

  const [setupError, setSetupError] = useState<string | null>(null);
  const [targetLang, setTargetLang] = useState<string>(promptConfig.translateLanguages[0] || "Spanish");
  const [targetFileName, setTargetFileName] = useState<string>("");
  const [preserveNames, setPreserveNames] = useState<boolean>(true);
  const [rememberSettings, setRememberSettings] = useState<boolean>(false);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>("current");

  useEffect(() => {
    fetchModels("ollama").then((models) => {
      setOllamaModels(models);
    });
  }, [promptConfig.ollamaUrl]);

  interface ModelOption {
    id: string;
    name: string;
    provider: PromptProvider;
    model: string;
    endpoint?: string;
    apiKey?: string;
  }

  const modelOptions = useMemo<ModelOption[]>(() => {
    const options: ModelOption[] = [];

    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PROMPT_API_LIST);
      if (raw) {
        const list = JSON.parse(raw) as { id: string; name: string; endpoint: string; apiKey: string; model: string }[];
        list.forEach((entry) => {
          options.push({
            id: `api-${entry.id || entry.model}`,
            name: `${entry.name || entry.model} (API)`,
            provider: "openai-compatible",
            model: entry.model,
            endpoint: entry.endpoint,
            apiKey: entry.apiKey,
          });
        });
      }
    } catch {}

    ollamaModels.forEach((m) => {
      options.push({
        id: `ollama-${m}`,
        name: `${m} (Ollama)`,
        provider: "ollama",
        model: m,
        endpoint: promptConfig.ollamaUrl,
      });
    });

    return options;
  }, [ollamaModels, promptConfig.ollamaUrl]);

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
          if (p.selectedModelId) setSelectedModelId(p.selectedModelId);
          setRememberSettings(true);
        }
      } catch {}
    }
  }, [isTranslationModalOpen, mode, originalNameClean, targetLang]);

  const handleStart = async () => {
    setSetupError(null);
    if (!effectiveTarget || !sourceScript) {
      setSetupError("No script available to translate.");
      return;
    }

    if (!targetFileName.trim()) {
      setSetupError("Please enter a valid file name.");
      return;
    }

    const selectedModel = modelOptions.find(opt => opt.id === selectedModelId);
    const effectivePromptConfig: PromptConfig = selectedModel ? {
      ...promptConfig,
      provider: selectedModel.provider,
      model: selectedModel.model,
      apiModel: selectedModel.model,
      apiEndpoint: selectedModel.endpoint || promptConfig.apiEndpoint,
      apiKey: selectedModel.apiKey || promptConfig.apiKey,
    } : promptConfig;

    if (effectivePromptConfig.provider === "none" || (effectivePromptConfig.provider === "openai-compatible" && !effectivePromptConfig.apiEndpoint)) {
      setSetupError("AI model is not configured. Please select a configured model or setup Muse in Settings.");
      return;
    }

    if (rememberSettings) {
      localStorage.setItem("actone-translate-doc-prefs", JSON.stringify({ elements, tones, preserveNames, selectedModelId }));
    } else {
      localStorage.removeItem("actone-translate-doc-prefs");
    }

    try {
      const duplicatedName = await duplicateScript(effectiveTarget.scriptIndex, targetFileName.trim(), false);
      if (!duplicatedName) {
        setSetupError("Failed to duplicate script file.");
        return;
      }

      const rawLines = sourceScript.content.split(/\r?\n/);
      const doc = parseScreenplay(sourceScript.content);
      const parsedLines = doc.lines;
      
      // Override isTranslatable based on user selection
      const analyzedLines = rawLines.map((line, i) => {
        const analyzed = analyzeFountainLine(line, parsedLines[i]);
        const type = parsedLines[i]?.type;
        
        let translatable = false;
        if (type === LineType.heading && elements.heading) translatable = true;
        if (type === LineType.action && elements.action) translatable = true;
        if (type === LineType.dialogue && elements.dialogue) translatable = true;
        if (type === LineType.parenthetical && elements.parenthetical) translatable = true;
        if (type === LineType.dualDialogueParenthetical && elements.parenthetical) translatable = true;
        if (type === LineType.transitionLine && elements.transition) translatable = true;
        if (type === LineType.centered && elements.action) translatable = true;
        if (type === LineType.synopse && elements.action) translatable = true;
        if (type === LineType.shot && elements.action) translatable = true;

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
        promptConfig: effectivePromptConfig,
        sourceScriptName: sourceScript.name,
        duplicatedName,
        targetFileId: activeFileId || effectiveTarget.fileId,
        targetScriptIndex: effectiveTarget.scriptIndex + 1,
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
    } catch (err: any) {
      console.error(err);
      setSetupError(err?.message || "Failed to start translation");
    }
  };


  // --- Progress State ---
  useEffect(() => {
    // If the modal is opened for a specific target, ensure any leftover finished jobs are cleared
    if (isTranslationModalOpen && translationSetupTarget) {
      if (job && (job.state === "completed" || job.state === "error" || job.state === "cancelled")) {
        setTranslationJob(null);
      }
    }
  }, [isTranslationModalOpen, translationSetupTarget]);

  const handleClose = () => {
    setIsTranslationModalOpen(false);
    if (job && (job.state === "completed" || job.state === "error" || job.state === "cancelled")) {
      setTranslationJob(null);
    }
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
      }}>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Typography variant="h6" sx={{ fontSize: "1rem", fontWeight: 700, lineHeight: 1 }}>
            {mode === "setup" ? "Translate Whole Document" : (isFinished ? "Translation Complete" : "Translating Document")}
          </Typography>
          <BetaTooltip />
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3, pt: "20px !important" }}>
        {mode === "setup" ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 0.5 }}>
            {setupError && (
              <Box sx={{ p: 1.5, bgcolor: (t) => alpha(t.palette.error.main, 0.1), border: "1px solid", borderColor: "error.main", color: "error.main", borderRadius: "8px", fontSize: "0.85rem" }}>
                {setupError}
              </Box>
            )}

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Target Language</InputLabel>
                <Select value={targetLang} label="Target Language" onChange={(e) => {
                  setTargetLang(e.target.value);
                  setTargetFileName(`${originalNameClean}-${e.target.value}`);
                }}>
                  {promptConfig.translateLanguages.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
                </Select>
              </FormControl>

              <FormControl size="small" fullWidth>
                <InputLabel>AI Model</InputLabel>
                <Select 
                  value={selectedModelId} 
                  label="AI Model" 
                  onChange={(e) => setSelectedModelId(e.target.value)}
                >
                  <MenuItem value="current">
                    {getActiveModelName(promptConfig)} (Default)
                  </MenuItem>
                  {modelOptions.map((opt) => (
                    <MenuItem key={opt.id} value={opt.id}>
                      {opt.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <TextField 
              size="small" 
              fullWidth 
              label="New File Name" 
              value={targetFileName} 
              onChange={(e) => setTargetFileName(e.target.value)} 
            />

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

            <Box sx={{ display: "flex", flexDirection: "column" }}>
              <FormControlLabel
                control={<Checkbox size="small" checked={preserveNames} onChange={(e) => setPreserveNames(e.target.checked)} />}
                label={<Typography variant="body2">Do not translate Character Names</Typography>}
              />
              <FormControlLabel
                control={<Checkbox size="small" checked={rememberSettings} onChange={(e) => setRememberSettings(e.target.checked)} />}
                label={<Typography variant="body2">Remember my settings</Typography>}
              />
            </Box>

            <Box 
              sx={{ 
                p: 1.5, 
                borderRadius: "8px", 
                bgcolor: (t) => alpha(t.palette.primary.main, 0.04), 
                border: "1px solid", 
                borderColor: (t) => alpha(t.palette.primary.main, 0.15),
              }}
            >
              <Typography variant="caption" sx={{ color: "text.secondary", lineHeight: 1.5, fontSize: "0.74rem", display: "block" }}>
                💡 <strong>Tip:</strong> Translation naturalness and prompt adherence depend on the chosen AI model. Choosing a more capable model will yield higher quality dialogue and phrasing.
              </Typography>
            </Box>
          </Box>
        ) : (
          <>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
              <Box sx={{ 
                width: 44, height: 44, borderRadius: "50%", 
                bgcolor: (t) => alpha(t.palette.primary.main, 0.15),
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "primary.main",
                position: "relative",
                animation: (translationState === "running" || job?.state === "running") ? "pulseAura 2.2s infinite ease-in-out" : "none",
                "@keyframes pulseAura": {
                  "0%": {
                    boxShadow: (t: any) => `0 0 0 0 ${alpha(t.palette.primary.main, 0.5)}`,
                    transform: "scale(1)",
                  },
                  "50%": {
                    boxShadow: (t: any) => `0 0 0 10px ${alpha(t.palette.primary.main, 0)}`,
                    transform: "scale(1.06)",
                  },
                  "100%": {
                    boxShadow: (t: any) => `0 0 0 0 ${alpha(t.palette.primary.main, 0)}`,
                    transform: "scale(1)",
                  },
                }
              }}>
                <AutoAwesomeIcon sx={{ fontSize: 22 }} />
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

            <Paper elevation={0} sx={{ 
              p: isFinished ? 4 : 2.5, 
              borderRadius: "12px", 
              bgcolor: (t) => alpha(t.palette.background.default, 0.65), 
              border: "1px solid", 
              borderColor: (translationState === "running" || job?.state === "running") ? (t) => alpha(t.palette.primary.main, 0.3) : "divider", 
              mb: 2, 
              position: "relative", 
              overflow: "hidden",
              transition: "border-color 0.3s ease"
            }}>
              {isFinished ? (
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                  <Box sx={{ 
                    width: 48, height: 48, borderRadius: "50%", 
                    bgcolor: (t) => alpha(job?.failedLines ? t.palette.warning.main : t.palette.primary.main, 0.1), 
                    color: job?.failedLines ? "warning.main" : "primary.main", 
                    display: "flex", alignItems: "center", justifyContent: "center",
                    mb: 2
                  }}>
                    <CheckIcon sx={{ fontSize: 24 }} />
                  </Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: job?.failedLines ? "warning.main" : "primary.main" }}>
                    {job?.failedLines ? "Translation Finished with Unparsed Lines" : "Translation Finished Successfully"}
                  </Typography>
                  {!!job?.failedLines && (
                    <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                      {job.failedLines} lines could not be parsed after 5 automatic retries. You can manually retry them now.
                    </Typography>
                  )}
                  
                  <Box sx={{ display: "flex", width: "100%", justifyContent: "center", gap: 4, mt: 1 }}>
                    <Box sx={{ textAlign: "center" }}>
                      <Typography variant="caption" sx={{ color: "text.secondary", textTransform: 'uppercase', letterSpacing: '0.05em', display: "block", mb: 0.5 }}>
                        Lines Translated
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1 }}>
                        {job?.translatedLines ?? 0} / {job?.totalLines ?? 0}
                      </Typography>
                    </Box>
                    <Divider orientation="vertical" flexItem />
                    <Box sx={{ textAlign: "center" }}>
                      <Typography variant="caption" sx={{ color: "text.secondary", textTransform: 'uppercase', letterSpacing: '0.05em', display: "block", mb: 0.5 }}>
                        Failed Lines
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1, color: job?.failedLines ? "warning.main" : "text.primary" }}>
                        {job?.failedLines ?? 0}
                      </Typography>
                    </Box>
                    <Divider orientation="vertical" flexItem />
                    <Box sx={{ textAlign: "center" }}>
                      <Typography variant="caption" sx={{ color: "text.secondary", textTransform: 'uppercase', letterSpacing: '0.05em', display: "block", mb: 0.5 }}>
                        Time Elapsed
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1 }}>
                        {durationSec ? `${durationSec}s` : "Complete"}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ) : (
                <Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {!isError && (
                        <Box 
                          sx={{ 
                            width: 8, 
                            height: 8, 
                            borderRadius: "50%", 
                            bgcolor: isPaused ? "warning.main" : "primary.main",
                            animation: (translationState === "running" || job?.state === "running") ? "pulseDot 1.5s infinite ease-in-out" : "none",
                            "@keyframes pulseDot": {
                              "0%": { opacity: 0.4, transform: "scale(0.8)" },
                              "50%": { opacity: 1, transform: "scale(1.2)" },
                              "100%": { opacity: 0.4, transform: "scale(0.8)" },
                            }
                          }} 
                        />
                      )}
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {isError ? `Error: ${job?.error || "Failed"}` : isPaused ? `Paused: ${progressText}` : `Translating: ${progressText}`}
                      </Typography>
                    </Box>

                    <Typography variant="body2" sx={{ fontWeight: 700, color: isError ? "error.main" : "primary.main", fontVariantNumeric: "tabular-nums" }}>
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
                      bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
                      "& .MuiLinearProgress-bar": {
                        borderRadius: 4,
                        transition: "transform 0.4s ease",
                        background: (t) => isError ? t.palette.error.main : `linear-gradient(90deg, ${t.palette.primary.main}, ${alpha(t.palette.primary.light || t.palette.primary.main, 0.85)})`,
                        boxShadow: (t) => isError ? "none" : `0 0 10px ${alpha(t.palette.primary.main, 0.5)}`
                      }
                    }} 
                  />

                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1.5, pt: 1, borderTop: "1px dashed", borderColor: (t) => alpha(t.palette.divider, 0.5) }}>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.72rem" }}>
                      Model: <strong>{job?.model || "AI Model"}</strong>
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.72rem" }}>
                      Batch {job?.completedBatches ?? 0} of {job?.totalBatches ?? 1}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Paper>

            {!isFinished && job?.latestPreview && (
              <Box sx={{
                p: 1.5,
                borderRadius: "8px",
                bgcolor: (t) => alpha(t.palette.background.default, 0.45),
                border: "1px solid",
                borderColor: "divider",
                mb: 2,
              }}>
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, display: "block", mb: 0.5 }}>
                  Live Preview
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.78rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {job.latestPreview}
                </Typography>
              </Box>
            )}
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
            {isFinished ? (
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button onClick={handleClose} color="inherit">Close</Button>
                {!!job?.failedLines && job.failedIndices && job.failedIndices.length > 0 && (
                  <Button
                    variant="outlined"
                    color="warning"
                    size="small"
                    startIcon={<RestartAltIcon />}
                    onClick={async () => {
                      if (!job || !job.failedIndices || !scripts) return;
                      const targetIdx = scripts.findIndex((s) => s.name === job.scriptName);
                      if (targetIdx === -1) return;
                      const currentScript = scripts[targetIdx];
                      const currentRawLines = currentScript.content.split(/\r?\n/);
                      const currentDoc = parseScreenplay(currentScript.content);
                      const currentParsedLines = currentDoc.lines;
                      const reAnalyzed = currentRawLines.map((l, i) => {
                        const an = analyzeFountainLine(l, currentParsedLines[i]);
                        return { ...an, isTranslatable: !!an.cleanText.trim() };
                      });
                      const selectedModel = modelOptions.find((opt) => opt.id === selectedModelId);
                      const effectiveCfg: PromptConfig = selectedModel ? {
                        ...promptConfig,
                        provider: selectedModel.provider,
                        model: selectedModel.model,
                        apiModel: selectedModel.model,
                        apiEndpoint: selectedModel.endpoint || promptConfig.apiEndpoint,
                        apiKey: selectedModel.apiKey || promptConfig.apiKey,
                      } : promptConfig;

                      await runTranslationJob({
                        lang: job.lang,
                        promptConfig: effectiveCfg,
                        sourceScriptName: job.sourceScriptName,
                        duplicatedName: job.scriptName,
                        targetFileId: job.fileId,
                        targetScriptIndex: targetIdx,
                        lines: currentRawLines,
                        analyzedLines: reAnalyzed,
                        parsedDoc: currentDoc,
                        preserveCharacterNames: preserveNames,
                        retryIndices: job.failedIndices,
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
                    }}
                  >
                    Retry Failed Lines ({job.failedLines})
                  </Button>
                )}
              </Box>
            ) : (
              <Button variant="outlined" color="error" size="small" onClick={handleCancel} startIcon={<StopIcon />}>Stop</Button>
            )}
            
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
