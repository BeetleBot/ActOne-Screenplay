import { activateConfiguredApi, reportCredentialError } from "../hooks/usePromptConfig";
import { EMPTY_CONTEXT } from "../lib/urai";
import { formatIndexProgress, useScreenplayIndex } from "../hooks/useScreenplayIndex";

import { useState, useCallback, useEffect, useRef, UIEvent, useMemo } from "react";
import {
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Popover,
  LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  ListItemText,
  Divider,
  Tooltip,
  Chip,
  TextField,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { usePromptConfig, setPromptConfigField, fetchModels } from "../hooks/usePromptConfig";
import { useApiList } from "../hooks/useApiList";
import { useAIChat } from "../hooks/useAIChat";
import { useFile, useEditor, useScriptEditor, useCursor } from "../context";
import { DeleteIcon, HistoryIcon, AddIcon, CloseIcon, ContentCopyIcon, RestartAltIcon, SettingsIcon, MenuBookIcon } from "./Icons";
import { AIChatMessage } from "./ai/AIChatMessage";
import { AIChatComposer } from "./ai/AIChatComposer";
import { UrAIAbout } from "./ai/UrAIAbout";
import { LineType } from "../parser";
import { setRephraseRangeEffect } from "../editor/rephraseState";
import { copyToClipboard } from "../utils";

import "../styles/ai-chat.css";

interface UrAIPanelProps {
  onInsertAtCursor?: (text: string) => void;
}

function formatRelativeDate(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export const UrAIPanel: React.FC<UrAIPanelProps> = ({ onInsertAtCursor }) => {
  const { parsedDoc, filePath, activeFileId, updateSettings, scriptFileName } = useFile();
  const { scrollToLine, editorView } = useEditor();
  const { replaceSceneText } = useScriptEditor();
  const { activeLineNumber } = useCursor();
  const promptConfig = usePromptConfig();

  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [historyAnchorEl, setHistoryAnchorEl] = useState<null | HTMLElement>(null);
  const [modelAnchorEl, setModelAnchorEl] = useState<null | HTMLElement>(null);
  const [settingsAnchorEl, setSettingsAnchorEl] = useState<null | HTMLElement>(null);

  const apiList = useApiList();

  const loadModels = useCallback(() => {
    fetchModels("ollama").then((models) => {
      setAvailableModels(models);
    });
  }, []);

  useEffect(() => {
    loadModels();
  }, [loadModels, promptConfig.ollamaUrl]);

  const getParsedDoc = useCallback(() => {
    return parsedDoc || null;
  }, [parsedDoc]);

  const handleOpenXray = useCallback(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("actone:open-xray"));
    }
  }, []);

  const [contextTokens, setContextTokens] = useState(8192);
  const [allowed, setAllowed] = useState(false);
  const [pending, setPending] = useState<{ kind: "index" | "chat"; text?: string } | null>(null);
  const index = useScreenplayIndex(parsedDoc, promptConfig, (filePath || activeFileId) + "::" + scriptFileName);
  useEffect(() => { setAllowed(false); setPending(null); }, [activeFileId, scriptFileName, promptConfig.provider, promptConfig.apiEndpoint, promptConfig.ollamaUrl]);
  const chat = useAIChat(
    getParsedDoc,
    filePath,
    activeFileId + "::" + scriptFileName,
    activeLineNumber,
    replaceSceneText,
    updateSettings,
    handleOpenXray,
    scriptFileName,
    { context: EMPTY_CONTEXT, contextTokens, resolveContext: allowed ? index.retrieve : undefined },
  );

  const bodyRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(true);

  const handleScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }, []);

  useEffect(() => {
    if (chat.turns.length === 0) return;
    const el = bodyRef.current;
    if (el && pinnedRef.current) el.scrollTop = el.scrollHeight;
  }, [chat.turns]);

  const handleSend = useCallback(
    (text: string) => {
      if (!allowed) { setPending({ kind: "chat", text }); return; }
      void chat.send(text, text);
    },
    [chat, allowed],
  );

  useEffect(() => {
    if (!allowed || !pending) return;
    setPending(null);
    if (pending.kind === "index") void index.run();
    else if (pending.text) void chat.send(pending.text, pending.text);
  }, [allowed, pending, chat, index]);
  useEffect(() => {
    const handleLookup = (e: Event) => {
      const text = (e as CustomEvent<string>).detail;
      if (text?.trim()) {
        handleSend(`What is the definition and usage of "${text.trim()}" in a screenwriting/story context?`);
      }
    };
    const handleSynonyms = (e: Event) => {
      const text = (e as CustomEvent<string>).detail;
      if (text?.trim()) {
        handleSend(
          `What are some evocative synonyms and alternative action/dialogue phrases for "${text.trim()}" in a screenwriting context?`,
        );
      }
    };
    window.addEventListener("prompt-lookup", handleLookup);
    window.addEventListener("prompt-synonyms", handleSynonyms);
    return () => {
      window.removeEventListener("prompt-lookup", handleLookup);
      window.removeEventListener("prompt-synonyms", handleSynonyms);
    };
  }, [handleSend]);

  const handleInsert = useCallback(
    (fountainText: string) => {
      onInsertAtCursor?.(fountainText);
    },
    [onInsertAtCursor],
  );

  const handleApplyToEditor = useCallback(
    (sceneNumber: number, fountainText: string) => {
      if (!parsedDoc?.lines) return;

      const lines = parsedDoc.lines;
      let sceneCount = 0;
      let startLineIdx = -1;

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].type === LineType.heading) {
          sceneCount++;
          if (sceneCount === sceneNumber) {
            startLineIdx = i;
            break;
          }
        }
      }

      if (startLineIdx === -1) return;

      scrollToLine(startLineIdx);

      if (editorView) {
        try {
          const doc = editorView.state.doc;
          const fromPos = doc.line(startLineIdx + 1).from;

          let endLineIdx = lines.length - 1;
          for (let i = startLineIdx + 1; i < lines.length; i++) {
            if (lines[i].type === LineType.heading) {
              endLineIdx = i - 1;
              break;
            }
          }
          const toPos = doc.line(endLineIdx + 1).to;

          editorView.dispatch({ effects: setRephraseRangeEffect.of({ from: fromPos, to: toPos }) });

          setTimeout(() => {
            replaceSceneText(sceneNumber, fountainText);
            setTimeout(() => {
              try {
                editorView.dispatch({ effects: setRephraseRangeEffect.of(null) });
              } catch {}
            }, 800);
          }, 500);
        } catch {
          replaceSceneText(sceneNumber, fountainText);
        }
      } else {
        replaceSceneText(sceneNumber, fountainText);
      }
    },
    [parsedDoc, scrollToLine, replaceSceneText, editorView],
  );

  const activeModelLabel = useMemo(() => {
    if (promptConfig.provider === "none") return "No model selected";
    if (promptConfig.provider === "openai-compatible") {
      const entry = apiList.find((a) => a.model === promptConfig.apiModel);
      return entry ? entry.name : promptConfig.apiModel || "OpenAI API";
    }
    return promptConfig.model || "Ollama";
  }, [promptConfig, apiList]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header bar */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pl: 2,
          pr: 4.5,
          height: 40,
          minHeight: 40,
          borderBottom: "1px solid",
          borderColor: "divider",
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 700, opacity: 0.8, fontSize: "0.7rem", letterSpacing: "0.05em" }}
          >
            UrAI
          </Typography>
          <UrAIAbout />
          <Tooltip
            title="UrAI features are currently in Beta. Responses and capabilities are constantly improving with each update."
            arrow
            placement="bottom"
          >
            <Chip
              label="Beta"
              size="small"
              color="primary"
              variant="outlined"
              sx={{
                height: 16,
                fontSize: "0.55rem",
                ml: 1,
                borderColor: (t) => alpha(t.palette.primary.main, 0.4),
                color: "primary.main",
                cursor: "help",
              }}
            />
          </Tooltip>
        </Box>
        <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
          <Tooltip title={(index.progress ? formatIndexProgress(index.progress) : null) || (index.ready ? "Update screenplay index" : "Index screenplay")}>
            <IconButton aria-label="Index screenplay" color={index.ready ? "primary" : "default"} size="small" disabled={Boolean(index.progress) || promptConfig.provider !== "ollama"} onClick={() => { if (allowed) void index.run(); else setPending({ kind: "index" }); }}><MenuBookIcon sx={{ fontSize: 16 }} /></IconButton>
          </Tooltip>
          <Tooltip title="Chat settings" placement="bottom">
            <IconButton size="small" onClick={(e) => setSettingsAnchorEl(e.currentTarget)} aria-label="Chat settings">
              <SettingsIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="New conversation" placement="bottom">
            <IconButton size="small" onClick={() => chat.newSession()}>
              <AddIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Chat history" placement="bottom">
            <IconButton size="small" onClick={(e) => setHistoryAnchorEl(e.currentTarget)}>
              <HistoryIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Clear current chat" placement="bottom">
            <span>
              <IconButton size="small" onClick={() => chat.clear()} disabled={chat.turns.length === 0}>
                <DeleteIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {index.progress && <Box sx={{ px: 1.5, py: 0.75, borderBottom: "1px solid", borderColor: "divider" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><Typography variant="caption">Indexing | {formatIndexProgress(index.progress)}</Typography><Button size="small" onClick={index.stop}>Pause</Button></Box>
        <LinearProgress />
      </Box>}
      <Popover
        open={Boolean(settingsAnchorEl)}
        anchorEl={settingsAnchorEl}
        onClose={() => setSettingsAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { p: 1.5, width: 300, maxWidth: "calc(100vw - 32px)" } } }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 650, mb: 1 }}>Chat settings</Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>Screenplay access: {allowed ? "Allowed for this document and provider" : "Ask before reading"}</Typography>
        {allowed && <Button size="small" onClick={() => { index.stop(); chat.stop(); setAllowed(false); }}>Revoke access</Button>}
        <Typography variant="caption" sx={{ display: "block" }}>{(index.progress ? formatIndexProgress(index.progress) : null) || (index.ready ? "Index ready" : "Not indexed or changes need indexing")}</Typography>
        {index.error && <Typography color="error" variant="caption">{index.error}</Typography>}
        {index.progress && <Button onClick={index.stop}>Pause indexing</Button>}
        <TextField size="small" label="Model context limit (tokens)" type="number" value={contextTokens} disabled={chat.streaming} onChange={(e) => setContextTokens(Math.max(2048, Math.min(1048576, Number(e.target.value) || 8192)))} slotProps={{ htmlInput: { "aria-label": "Model context limit in tokens" } }} helperText="Must fit the model's configured context and available memory." sx={{ mt: 1.25, width: "100%" }} />
      </Popover>

      <Dialog open={Boolean(pending) && !allowed} onClose={() => setPending(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Allow UrAI to read this screenplay?</DialogTitle>
        <DialogContent>UrAI can index this document and automatically read relevant scenes to answer your questions. Text is sent to {promptConfig.provider === "ollama" ? promptConfig.ollamaUrl : promptConfig.apiEndpoint}. Permission lasts until you switch documents or providers, revoke access, or close this panel. Index summaries are saved locally.</DialogContent>
        <DialogActions><Button onClick={() => { const text = pending?.text; setPending(null); if (text) void chat.send(text, text); }}>Don't allow</Button><Button onClick={() => setAllowed(true)}>Allow</Button></DialogActions>
      </Dialog>
      {/* History Menu */}
      <Menu
        anchorEl={historyAnchorEl}
        open={Boolean(historyAnchorEl)}
        onClose={() => setHistoryAnchorEl(null)}
        slotProps={{ paper: { sx: { width: 280, maxHeight: 360 } } }}
      >
        <Box
          sx={{
            px: 2,
            py: 1,
            borderBottom: "1px solid",
            borderColor: "divider",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 11 }}>
            Chat History
          </Typography>
          <Tooltip title="New conversation">
            <IconButton
              size="small"
              onClick={() => {
                setHistoryAnchorEl(null);
                chat.newSession();
              }}
            >
              <AddIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </Box>
        {chat.sessions.map((sess) => (
          <MenuItem
            key={sess.id}
            selected={sess.id === chat.activeSessionId}
            onClick={() => {
              chat.selectSession(sess.id);
              setHistoryAnchorEl(null);
            }}
            sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
          >
            <ListItemText
              primary={sess.title || "Conversation"}
              secondary={`${formatRelativeDate(sess.createdAt)} | ${sess.turns.filter((t) => t.role === "user").length} messages`}
              slotProps={{
                primary: {
                  sx: {
                    fontSize: 12,
                    fontWeight: 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  },
                },
                secondary: { sx: { fontSize: 10 } },
              }}
            />
            {chat.sessions.length > 1 && (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  chat.deleteSession(sess.id);
                }}
                sx={{ ml: 1, opacity: 0.6, "&:hover": { opacity: 1, color: "error.main" } }}
              >
                <CloseIcon sx={{ fontSize: 12 }} />
              </IconButton>
            )}
          </MenuItem>
        ))}
      </Menu>

      {/* Main chat body */}
      <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <Box
          ref={bodyRef}
          onScroll={handleScroll}
          className="ai-chat-messages"
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            bgcolor: "background.paper",
            display: "flex",
            flexDirection: "column",
            gap: 2,
            p: 2,
          }}
        >
          {promptConfig.provider === "none" && (
            <Box
              sx={{
                color: "error.main",
                fontSize: "0.75rem",
                p: 1.25,
                border: "1px solid",
                borderColor: "error.main",
                bgcolor: "error.main",
                opacity: 0.1,
              }}
            >
              AI Provider is not configured. Go to Settings.
            </Box>
          )}
          {chat.turns.length === 0 && (
            <Box
              sx={{ color: "text.secondary", fontSize: "0.78rem", textAlign: "center", py: 5, px: 2, lineHeight: 1.5 }}
            >
              {parsedDoc.screenplayText
                ? "Start a conversation about your screenplay..."
                : "Open a screenplay to chat about it..."}
            </Box>
          )}
          {chat.turns.map((turn, index) => (
            <AIChatMessage
              key={turn.id}
              turn={turn}
              isStreaming={chat.streaming && index === chat.turns.length - 1 && turn.role === "assistant"}
              onInsertAtCursor={handleInsert}
              onApplyToEditor={handleApplyToEditor}
            />
          ))}
          {chat.error && (
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-start",
                gap: 0.5,
                color: "error.main",
                fontSize: "0.75rem",
                px: 1.5,
                py: 1,
                border: "1px solid",
                borderColor: "error.main",
              }}
            >
              <Typography variant="inherit" sx={{ flex: 1, minWidth: 0, wordBreak: "break-all" }}>
                {chat.error}
              </Typography>
              <Tooltip title="Retry last prompt" placement="top">
                <IconButton
                  size="small"
                  onClick={() => chat.retry()}
                  disabled={chat.streaming}
                  sx={{ p: 0.3, mt: -0.3, color: "error.main", flexShrink: 0 }}
                >
                  <RestartAltIcon fontSize="inherit" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Copy error" placement="top">
                <IconButton
                  size="small"
                  onClick={() => {
                    if (chat.error) {
                      void copyToClipboard(chat.error);
                    }
                  }}
                  sx={{ p: 0.3, mt: -0.3, color: "error.main", flexShrink: 0 }}
                >
                  <ContentCopyIcon fontSize="inherit" />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>

        {/* Bottom controls bar */}
        <Box sx={{ borderTop: "1px solid", borderColor: "divider", display: "flex", flexDirection: "column" }}>
          {/* Composer */}
          <Box sx={{ pt: 0.5 }}>
            <AIChatComposer
              streaming={chat.streaming}
              disabled={promptConfig.provider === "none"}
              placeholder={parsedDoc.screenplayText ? "Message UrAI..." : "Open a screenplay first..."}
              onSend={handleSend}
              onStop={chat.stop}
            />
          </Box>

          {/* Single Model Pill */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 2, pt: 0.25, pb: 0.75 }}>
            <AddIcon sx={{ fontSize: 12, color: "text.secondary", opacity: 1 }} />
            <Typography
              onClick={(e) => {
                loadModels();
                setModelAnchorEl(e.currentTarget);
              }}
              variant="caption"
              sx={{
                cursor: "pointer",
                fontSize: "0.7rem",
                fontWeight: 500,
                color: "text.secondary",
                userSelect: "none",
                "&:hover": { color: "text.primary" },
              }}
            >
              {activeModelLabel}
            </Typography>
            <Box
              onClick={(e) => {
                loadModels();
                setModelAnchorEl(e.currentTarget);
              }}
              component="span"
              sx={{ cursor: "pointer", fontSize: "0.55rem", color: "text.secondary", opacity: 0.6 }}
            >
              ^
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Model Selection Menu */}
      <Menu
        anchorEl={modelAnchorEl}
        open={Boolean(modelAnchorEl)}
        onClose={() => setModelAnchorEl(null)}
        anchorOrigin={{ vertical: "top", horizontal: "left" }}
        transformOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{ paper: { sx: { width: 280, maxHeight: 400 } } }}
      >
        {apiList.length > 0 && (
          <>
            <Box sx={{ px: 2, py: 0.75, borderBottom: "1px solid", borderColor: "divider" }}>
              <Typography
                variant="caption"
                sx={{ fontWeight: 700, fontSize: 10, color: "text.secondary", letterSpacing: "0.05em" }}
              >
                OPENAI API
              </Typography>
            </Box>
            {apiList.map((entry) => (
              <MenuItem
                key={entry.id}
                selected={promptConfig.provider === "openai-compatible" && promptConfig.apiModel === entry.model}
                onClick={() => {
                  void activateConfiguredApi(entry).catch(reportCredentialError);
                  setModelAnchorEl(null);
                }}
                sx={{ fontSize: 12 }}
              >
                <ListItemText
                  primary={entry.name}
                  secondary={entry.model}
                  slotProps={{
                    primary: { sx: { fontSize: 12, fontWeight: 500 } },
                    secondary: { sx: { fontSize: 10 } },
                  }}
                />
              </MenuItem>
            ))}
          </>
        )}

        <Box
          sx={{
            px: 2,
            py: 0.75,
            borderBottom: "1px solid",
            borderTop: apiList.length > 0 ? "1px solid" : "none",
            borderColor: "divider",
          }}
        >
          <Typography
            variant="caption"
            sx={{ fontWeight: 700, fontSize: 10, color: "text.secondary", letterSpacing: "0.05em" }}
          >
            OLLAMA (LOCAL)
          </Typography>
        </Box>
        {availableModels.length > 0 ? (
          availableModels.map((m) => (
            <MenuItem
              key={m}
              selected={promptConfig.provider === "ollama" && promptConfig.model === m}
              onClick={() => {
                setPromptConfigField("provider", "ollama");
                setPromptConfigField("model", m);
                setModelAnchorEl(null);
              }}
              sx={{ fontSize: 12 }}
            >
              {m}
            </MenuItem>
          ))
        ) : (
          <MenuItem disabled sx={{ fontSize: 11, fontStyle: "italic" }}>
            No Ollama models found
          </MenuItem>
        )}

        <Divider />
        <MenuItem
          selected={promptConfig.provider === "none"}
          onClick={() => {
            setPromptConfigField("provider", "none");
            setModelAnchorEl(null);
          }}
          sx={{ fontSize: 12, color: "text.secondary" }}
        >
          Disable AI
        </MenuItem>
      </Menu>
    </Box>
  );
};
