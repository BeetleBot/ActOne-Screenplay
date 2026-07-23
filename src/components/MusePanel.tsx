import { useState, useCallback, useEffect, useRef, UIEvent } from "react";
import { Box, Typography, IconButton, Menu, MenuItem, ListItemText, Select, FormControl } from "@mui/material";
import { usePromptConfig, setPromptConfigField, fetchModels } from "../hooks/usePromptConfig";
import { useAIChat } from "../hooks/useAIChat";
import { useFile } from "../context/FileContext";
import { DeleteIcon, HistoryIcon, AddIcon, CloseIcon, ContentCopyIcon } from "./Icons";
import { AIChatMessage } from "./ai/AIChatMessage";
import { AIChatComposer, type ComposerAction } from "./ai/AIChatComposer";


import "../styles/ai-chat.css";

interface MusePanelProps {
  onInsertAtCursor?: (text: string) => void;
}

export const MusePanel: React.FC<MusePanelProps> = ({ onInsertAtCursor }) => {
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

  const handleSend = useCallback((text: string, action?: ComposerAction) => {
    const m = text.match(/^@(write-scene|q|lookup|synonyms)\s+(.*)/);
    const content = m ? m[2] : text;
    chat.send(content, text, action ?? "chat");
  }, [chat]);

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
          Muse
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
          className="ai-chat-messages"
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
              {parsedDoc.screenplayText ? "Start a conversation about your screenplay..." : "Open a screenplay to chat about it..."}
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
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.5, color: "error.main", fontSize: "0.75rem", px: 1.5, py: 1, border: "1px solid", borderColor: "error.main" }}>
              <Typography variant="inherit" sx={{ flex: 1, minWidth: 0, wordBreak: "break-all" }}>
                {chat.error}
              </Typography>
              <IconButton
                size="small"
                onClick={() => navigator.clipboard.writeText(chat.error!)}
                sx={{ p: 0.3, mt: -0.3, color: "error.main", flexShrink: 0 }}
              >
                <ContentCopyIcon fontSize="inherit" />
              </IconButton>
            </Box>
          )}
        </Box>

        <Box sx={{ borderTop: "1px solid", borderColor: "divider", bgcolor: "action.hover", display: "flex", flexDirection: "column", pb: 1.5 }}>
          <Box sx={{ px: 1.5, pt: 1, display: "flex", flexDirection: "column", gap: 1 }}>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 0.375 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, fontSize: 9, color: "text.secondary", letterSpacing: "0.04em" }}>
                  Provider
                </Typography>
                <FormControl size="small" fullWidth>
                  <Select
                    value={promptConfig.provider}
                    onChange={(e) => {
                      setPromptConfigField("provider", e.target.value as any);
                    }}
                    sx={{ fontSize: "11px", borderRadius: 0, height: 30 }}
                  >
                    <MenuItem value="openai-compatible">OpenAI API</MenuItem>
                    <MenuItem value="ollama">Ollama (Local)</MenuItem>
                    <MenuItem value="none">Disabled</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ flex: 1.4, display: "flex", flexDirection: "column", gap: 0.375 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, fontSize: 9, color: "text.secondary", letterSpacing: "0.04em" }}>
                  Active Model
                </Typography>
                <FormControl size="small" fullWidth>
                  <Select
                    value={promptConfig.provider === "openai-compatible" ? (promptConfig.apiModel || "") : (promptConfig.model || "")}
                    onChange={(e) => {
                      const nextModel = e.target.value;
                      if (promptConfig.provider === "openai-compatible") {
                        setPromptConfigField("apiModel", nextModel);
                      } else {
                        setPromptConfigField("model", nextModel);
                      }
                    }}
                    sx={{ fontSize: "11px", borderRadius: 0, height: 30 }}
                  >
                    {promptConfig.provider === "openai-compatible" ? (
                      <MenuItem value={promptConfig.apiModel || "deepseek-v4-flash-free"}>
                        {promptConfig.apiModel || "deepseek-v4-flash-free"}
                      </MenuItem>
                    ) : (
                      availableModels.length > 0 ? (
                        availableModels.map(m => (
                          <MenuItem key={m} value={m}>{m}</MenuItem>
                        ))
                      ) : (
                        <MenuItem value={promptConfig.model || ""}>{promptConfig.model || "Loading models..."}</MenuItem>
                      )
                    )}
                  </Select>
                </FormControl>
              </Box>
            </Box>
          </Box>

          <Box sx={{ pt: 0.75 }}>
            <AIChatComposer
              streaming={chat.streaming}
              disabled={promptConfig.provider === "none"}
              placeholder={parsedDoc.screenplayText ? "Message Muse..." : "Open a screenplay first..."}
              onSend={handleSend}
              onStop={chat.stop}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
