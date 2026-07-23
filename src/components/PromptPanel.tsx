import { useState, useCallback, useEffect, useRef, UIEvent } from "react";
import { Box, Typography, IconButton, Menu, MenuItem, ListItemText } from "@mui/material";
import { usePromptConfig, setPromptConfigField, fetchModels } from "../hooks/usePromptConfig";
import { useAIChat } from "../hooks/useAIChat";
import { useFile } from "../context/FileContext";
import { DeleteIcon, HistoryIcon, AddIcon, CloseIcon } from "./Icons";
import { AIChatMessage } from "./ai/AIChatMessage";
import { AIChatComposer, type ComposerAction } from "./ai/AIChatComposer";
import { AIQuickActions, AIAction } from "./ai/AIQuickActions";

import "../styles/ai-chat.css";

interface PromptPanelProps {
  onInsertAtCursor?: (text: string) => void;
}

export const PromptPanel: React.FC<PromptPanelProps> = ({ onInsertAtCursor }) => {
  const { parsedDoc, filePath, activeFileId } = useFile();
  const promptConfig = usePromptConfig();

  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [historyAnchorEl, setHistoryAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    if (promptConfig.provider === "none" || promptConfig.provider === "openai-compatible") {
      setAvailableModels([]);
      return;
    }
    let cancelled = false;
    fetchModels(promptConfig.provider).then((models) => {
      if (cancelled) return;
      setAvailableModels(models);
      if (models.length > 0 && (!promptConfig.model || !models.includes(promptConfig.model))) {
        setPromptConfigField("model", models[0]);
      }
    });
    return () => { cancelled = true; };
  }, [promptConfig.provider, promptConfig.model]);

  const getDocContext = useCallback(() => {
    return parsedDoc.screenplayText || null;
  }, [parsedDoc.screenplayText]);

  const chat = useAIChat(getDocContext, filePath, activeFileId);

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

  const handleQuickAction = useCallback((action: AIAction) => {
    let content = "";
    if (action === "summarize") content = "Please summarize the document.";
    else if (action === "analyzeTone") content = "Analyze the tone of the document.";
    else if (action === "checkSpelling") content = "Check the document for spelling errors.";
    if (content) {
      chat.send(content, action);
    }
  }, [chat]);

  const handleSend = useCallback((text: string, action?: ComposerAction) => {
    // Strip @command prefix from content sent to AI, keep full text for display
    const m = text.match(/^@(write-scene|q|lookup|synonyms)\s+(.*)/);
    const content = m ? m[2] : text;
    chat.send(content, text, action ?? "chat");
  }, [chat]);

  // ── Listen for lookup/synonyms events from FountainEditor ──
  useEffect(() => {
    const handleLookup = (e: Event) => {
      const text = (e as CustomEvent<string>).detail;
      if (text?.trim()) {
        handleSend(`@lookup ${text.trim()}`, "lookup");
      }
    };
    const handleSynonyms = (e: Event) => {
      const text = (e as CustomEvent<string>).detail;
      if (text?.trim()) {
        handleSend(`@synonyms ${text.trim()}`, "synonyms");
      }
    };
    window.addEventListener("prompt-lookup", handleLookup);
    window.addEventListener("prompt-synonyms", handleSynonyms);
    return () => {
      window.removeEventListener("prompt-lookup", handleLookup);
      window.removeEventListener("prompt-synonyms", handleSynonyms);
    };
  }, [handleSend]);

  const handleInsert = useCallback((fountainText: string) => {
    onInsertAtCursor?.(fountainText);
  }, [onInsertAtCursor]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pl: 2, pr: 4.5, height: 40, minHeight: 40, borderBottom: "1px solid", borderColor: "divider", flexShrink: 0 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, opacity: 0.8, fontSize: "0.7rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          Prompt
        </Typography>
        <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
          <IconButton size="small" onClick={() => chat.newSession()} title="New Chat">
            <AddIcon sx={{ fontSize: 16 }} />
          </IconButton>
          <IconButton size="small" onClick={(e) => setHistoryAnchorEl(e.currentTarget)} title="Chat History">
            <HistoryIcon sx={{ fontSize: 16 }} />
          </IconButton>
          <IconButton size="small" onClick={() => chat.clear()} title="Clear Current Chat">
            <DeleteIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </Box>

      <Menu
        anchorEl={historyAnchorEl}
        open={Boolean(historyAnchorEl)}
        onClose={() => setHistoryAnchorEl(null)}
        slotProps={{ paper: { sx: { width: 250, maxHeight: 320 } } }}
      >
        <Box sx={{ px: 2, py: 1, borderBottom: "1px solid", borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 11 }}>Chat History</Typography>
          <IconButton size="small" onClick={() => { setHistoryAnchorEl(null); chat.newSession(); }} title="New Chat">
            <AddIcon sx={{ fontSize: 14 }} />
          </IconButton>
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
              secondary={new Date(sess.createdAt).toLocaleDateString()}
              slotProps={{
                primary: { sx: { fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } },
                secondary: { sx: { fontSize: 10 } }
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
                title="Delete Session"
              >
                <CloseIcon sx={{ fontSize: 12 }} />
              </IconButton>
            )}
          </MenuItem>
        ))}
      </Menu>

      <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <Box
          ref={bodyRef}
          onScroll={handleScroll}
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            bgcolor: "background.paper",
            display: "flex",
            flexDirection: "column",
            gap: 3,
            p: 2,
          }}
        >
          {promptConfig.provider === "none" && (
            <Box sx={{ color: "error.main", fontSize: "0.75rem", p: 1.25, border: "1px solid", borderColor: "error.main", bgcolor: "error.main", opacity: 0.1 }}>
              AI Provider is not configured. Go to Settings.
            </Box>
          )}
          {chat.turns.length === 0 && (
            <Box sx={{ color: "text.secondary", fontSize: "0.78rem", textAlign: "center", py: 5, px: 2, lineHeight: 1.5 }}>
              {parsedDoc.screenplayText ? "Start a conversation about your document..." : "Open a document to chat about it..."}
            </Box>
          )}
          {chat.turns.map((turn, index) => (
            <AIChatMessage
              key={turn.id}
              turn={turn}
              pending={
                chat.streaming && index === chat.turns.length - 1 && turn.role === "assistant" && !turn.content
              }
              onInsertAtCursor={handleInsert}
            />
          ))}
          {chat.error && (
            <Box sx={{ color: "error.main", fontSize: "0.75rem", px: 1.5, py: 1, border: "1px solid", borderColor: "error.main" }}>
              {chat.error}
            </Box>
          )}
        </Box>

        <Box sx={{ p: 1.5, borderTop: "1px solid", borderColor: "divider", bgcolor: "background.default", display: "flex", flexDirection: "column", gap: 1 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 9, color: "text.secondary", letterSpacing: "0.05em" }}>
                PROVIDER:
              </Typography>
              <select
                value={promptConfig.provider}
                onChange={(e) => {
                  setPromptConfigField("provider", e.target.value as any);
                }}
                style={{
                  backgroundColor: "var(--background-paper, #1e1e1e)",
                  color: "var(--text-primary, #ffffff)",
                  border: "1px solid var(--divider, #333333)",
                  borderRadius: "0px",
                  padding: "2px 6px",
                  fontSize: "10px",
                  fontFamily: "inherit",
                  outline: "none",
                  cursor: "pointer"
                }}
              >
                <option value="openai-compatible">API (OpenAI Compatible)</option>
                <option value="ollama">Ollama (Local)</option>
                <option value="lm-studio">LM Studio (Local)</option>
                <option value="none">Disabled</option>
              </select>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 9, color: "text.secondary", letterSpacing: "0.05em" }}>
                ACTIVE MODEL:
              </Typography>
              <select
                value={promptConfig.provider === "openai-compatible" ? (promptConfig.apiModel || "") : (promptConfig.model || "")}
                onChange={(e) => {
                  const nextModel = e.target.value;
                  if (promptConfig.provider === "openai-compatible") {
                    setPromptConfigField("apiModel", nextModel);
                  } else {
                    setPromptConfigField("model", nextModel);
                  }
                }}
                style={{
                  backgroundColor: "var(--background-paper, #1e1e1e)",
                  color: "var(--text-primary, #ffffff)",
                  border: "1px solid var(--divider, #333333)",
                  borderRadius: "0px",
                  padding: "2px 6px",
                  fontSize: "10px",
                  fontFamily: "inherit",
                  outline: "none",
                  cursor: "pointer"
                }}
              >
                {promptConfig.provider === "openai-compatible" ? (
                  <option value={promptConfig.apiModel || "deepseek-v4-flash-free"}>
                    {promptConfig.apiModel || "deepseek-v4-flash-free"}
                  </option>
                ) : (
                  availableModels.length > 0 ? (
                    availableModels.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))
                  ) : (
                    <option value={promptConfig.model || ""}>{promptConfig.model || "Loading models..."}</option>
                  )
                )}
              </select>
            </Box>
          </Box>

          <AIQuickActions onAction={handleQuickAction} disabled={chat.streaming} />

          <AIChatComposer
            streaming={chat.streaming}
            disabled={promptConfig.provider === "none"}
            placeholder={parsedDoc.screenplayText ? "Message AI Assistant..." : "Open a document first..."}
            onSend={handleSend}
            onStop={chat.stop}
          />
        </Box>
      </Box>
    </Box>
  );
};
