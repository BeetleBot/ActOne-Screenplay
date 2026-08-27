import { useState, useCallback, useEffect, useRef, UIEvent, useMemo } from "react";
import { Box, Typography, IconButton, Menu, MenuItem, ListItemText, Divider, Tooltip } from "@mui/material";
import { usePromptConfig, setPromptConfigField, fetchModels } from "../hooks/usePromptConfig";
import { useAIChat } from "../hooks/useAIChat";
import { useFile, useEditor, useScriptEditor, useCursor } from "../context";
import { DeleteIcon, HistoryIcon, AddIcon, CloseIcon, ContentCopyIcon, RestartAltIcon } from "./Icons";
import { AIChatMessage } from "./ai/AIChatMessage";
import { AIChatComposer } from "./ai/AIChatComposer";
import { STORAGE_KEYS } from "../constants";
import type { ApiEntry } from "../constants";
import { LineType } from "../parser";
import { setRephraseRangeEffect } from "../editor/rephraseState";
import { copyToClipboard } from "../utils";

import "../styles/ai-chat.css";

interface MusePanelProps {
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

export const MusePanel: React.FC<MusePanelProps> = ({ onInsertAtCursor }) => {
  const { parsedDoc, filePath, activeFileId, updateSettings, scriptFileName } = useFile();
  const { scrollToLine, editorView } = useEditor();
  const { replaceSceneText } = useScriptEditor();
  const { activeLineNumber } = useCursor();
  const promptConfig = usePromptConfig();

  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [historyAnchorEl, setHistoryAnchorEl] = useState<null | HTMLElement>(null);
  const [modelAnchorEl, setModelAnchorEl] = useState<null | HTMLElement>(null);

  const apiList = useMemo(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PROMPT_API_LIST);
      return raw ? (JSON.parse(raw) as ApiEntry[]) : [];
    } catch {
      return [];
    }
  }, [promptConfig]);

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

  const chat = useAIChat(getParsedDoc, filePath, activeFileId, activeLineNumber, replaceSceneText, updateSettings, handleOpenXray, scriptFileName);

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
      chat.send(text, text);
    },
    [chat]
  );

  useEffect(() => {
    const handleLookup = (e: Event) => {
      const text = (e as CustomEvent<string>).detail;
      if (text?.trim()) {
        handleSend(`What is the definition of "${text.trim()}"?`);
      }
    };
    const handleSynonyms = (e: Event) => {
      const text = (e as CustomEvent<string>).detail;
      if (text?.trim()) {
        handleSend(`What are some synonyms for "${text.trim()}"?`);
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
    [onInsertAtCursor]
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
    [parsedDoc, scrollToLine, replaceSceneText, editorView]
  );

  const activeModelLabel = useMemo(() => {
    if (promptConfig.provider === "none") return "No model selected";
    if (promptConfig.provider === "openai-compatible") {
      const entry = apiList.find((a) => a.model === promptConfig.apiModel);
      return entry ? entry.name : promptConfig.apiModel || "OpenAI API";
    }
    return promptConfig.model || "Ollama";
  }, [promptConfig, apiList]);

  const activeSceneInfo = useMemo(() => {
    if (!parsedDoc?.lines || !activeLineNumber) return null;
    const lines = parsedDoc.lines;
    let sceneCount = 0;
    let targetHeading = "";
    let targetSceneNum = 0;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i]?.type === LineType.heading) {
        sceneCount++;
        if (i < activeLineNumber) {
          targetSceneNum = sceneCount;
          targetHeading = lines[i].text
            .replace(/^\.\s*/, "")
            .replace(/#[^#]+#/g, "")
            .replace(/\[\[[^\]]*\]\]/g, "")
            .trim();
        }
      }
    }

    if (!targetHeading) return null;
    return { num: targetSceneNum, heading: targetHeading };
  }, [parsedDoc, activeLineNumber]);

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
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 700, opacity: 0.8, fontSize: "0.7rem", letterSpacing: "0.05em", textTransform: "uppercase" }}
        >
          Muse
        </Typography>
        <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
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
              secondary={`${formatRelativeDate(sess.createdAt)} · ${sess.turns.filter((t) => t.role === "user").length} messages`}
              slotProps={{
                primary: { sx: { fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } },
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
            <Box sx={{ color: "text.secondary", fontSize: "0.78rem", textAlign: "center", py: 5, px: 2, lineHeight: 1.5 }}>
              {parsedDoc.screenplayText ? "Start a conversation about your screenplay..." : "Open a screenplay to chat about it..."}
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
          {/* Active scene context pill */}
          {activeSceneInfo && (
            <Box sx={{ px: 2, py: 0.5, display: "flex", alignItems: "center", gap: 0.75 }}>
              <Box
                sx={{
                  px: 0.6,
                  py: 0.1,
                  bgcolor: "action.selected",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 0.75,
                  fontSize: "0.62rem",
                  fontWeight: 700,
                  fontFamily: "monospace",
                  color: "primary.main",
                  lineHeight: 1.2,
                }}
              >
                {activeSceneInfo.num}
              </Box>
              <Typography
                variant="caption"
                sx={{
                  fontSize: "0.68rem",
                  color: "text.secondary",
                  opacity: 0.85,
                  fontWeight: 500,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {activeSceneInfo.heading}
              </Typography>
            </Box>
          )}

          {/* Composer */}
          <Box sx={{ pt: 0.5 }}>
            <AIChatComposer
              streaming={chat.streaming}
              disabled={promptConfig.provider === "none"}
              placeholder={parsedDoc.screenplayText ? "Message Muse..." : "Open a screenplay first..."}
              onSend={handleSend}
              onStop={chat.stop}
            />
          </Box>

          {/* Single Model Pill */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 2, pt: 0.25, pb: 0.75 }}>
            <AddIcon sx={{ fontSize: 12, color: "text.secondary", opacity: 0.5 }} />
            <Typography
              onClick={(e) => { loadModels(); setModelAnchorEl(e.currentTarget); }}
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
              onClick={(e) => { loadModels(); setModelAnchorEl(e.currentTarget); }}
              component="span"
              sx={{ cursor: "pointer", fontSize: "0.55rem", color: "text.secondary", opacity: 0.6 }}
            >
              ▲
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
              <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10, color: "text.secondary", letterSpacing: "0.05em" }}>
                OPENAI API
              </Typography>
            </Box>
            {apiList.map((entry) => (
              <MenuItem
                key={entry.id}
                selected={promptConfig.provider === "openai-compatible" && promptConfig.apiModel === entry.model}
                onClick={() => {
                  setPromptConfigField("provider", "openai-compatible");
                  setPromptConfigField("apiModel", entry.model);
                  setPromptConfigField("apiEndpoint", entry.endpoint);
                  setPromptConfigField("apiKey", entry.apiKey);
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
          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10, color: "text.secondary", letterSpacing: "0.05em" }}>
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
