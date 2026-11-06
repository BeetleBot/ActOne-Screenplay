import { activateConfiguredApi, reportCredentialError } from "../hooks/usePromptConfig";
import { destination, EMPTY_CONTEXT } from "../lib/urai";
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
import { useFile, useEditor, useCursor, useUI } from "../context";
import { DeleteIcon, HistoryIcon, AddIcon, CloseIcon, ContentCopyIcon, RestartAltIcon, SettingsIcon, MenuBookIcon, BookmarkIcon } from "./Icons";
import { AIChatMessage } from "./ai/AIChatMessage";
import { AIChatComposer } from "./ai/AIChatComposer";
import { UrAIAbout } from "./ai/UrAIAbout";
import { parseScreenplay } from "../parser";
import { locateScene, resolveSceneFocus, sceneRef, screenplaySources, type UrAIRevisionNote, type UrAISceneRef } from "../lib/uraiSources";
import { getPerScriptSettingArray, updatePerScriptSetting } from "../utils/perScriptSettings";
import { isNonScreenplay } from "../utils/scriptMode";
import { readLiveEditorText } from "../editor/pendingEdits";
import { requestedStatistics, screenplayStatistics } from "../lib/uraiStats";
import { copyToClipboard } from "../utils";

import "../styles/ai-chat.css";

function formatRelativeDate(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function UrAIPanel() {
  const { parsedDoc, filePath, activeFileId, updateSettings, scriptFileName, rawText, scripts, activeScriptIndex } = useFile();
  const { scrollToLine } = useEditor();
  const { paperSize } = useUI();
  const { activeLineNumber } = useCursor();
  const promptConfig = usePromptConfig();

  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [historyAnchorEl, setHistoryAnchorEl] = useState<null | HTMLElement>(null);
  const [modelAnchorEl, setModelAnchorEl] = useState<null | HTMLElement>(null);
  const [settingsAnchorEl, setSettingsAnchorEl] = useState<null | HTMLElement>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState<Omit<UrAIRevisionNote, "id"> | null>(null);
  const [noteError, setNoteError] = useState("");

  const apiList = useApiList();

  const loadModels = useCallback(() => {
    fetchModels("ollama").then((models) => {
      setAvailableModels(models);
    });
  }, []);

  useEffect(() => {
    loadModels();
  }, [loadModels, promptConfig.ollamaUrl]);

  const [contextTokens, setContextTokens] = useState(8192);
  const [allowedKey, setAllowedKey] = useState<string | null>(null);
  const accessKey = JSON.stringify([activeFileId, filePath, scriptFileName, destination(promptConfig)]);
  const allowed = allowedKey === accessKey;
  const [pending, setPending] = useState<{ kind: "index" | "chat"; text?: string } | null>(null);
  const index = useScreenplayIndex(parsedDoc, promptConfig, (filePath || activeFileId) + "::" + scriptFileName);
  useEffect(() => {
    setAllowedKey(null);
    setPending(null);
    setNoteDraft(null);
    setNotesOpen(false);
    setNoteError("");
  }, [accessKey]);
  const liveDocument = () => {
    if (isNonScreenplay(scripts[activeScriptIndex], filePath)) return null;
    const text = readLiveEditorText(activeFileId, scriptFileName) ?? rawText;
    return parsedDoc.screenplayText === text ? parsedDoc : parseScreenplay(text, paperSize);
  };
  const liveSources = () => {
    const doc = liveDocument();
    return doc ? screenplaySources(doc) : [];
  };
  const resolveReading = (query: string, previous: UrAISceneRef[]) => {
    const doc = liveDocument();
    const scenes = doc ? screenplaySources(doc) : [];
    const statisticsCategory = requestedStatistics(query);
    const focus = resolveSceneFocus(query, scenes, activeLineNumber + 1, statisticsCategory ? [] : previous);
    if (focus.error) return { error: focus.error };
    const review = /\b(?:setup|payoff|foreshadow\w*|plant(?:ed)?)\b/i.test(query) ? "setup"
      : /\b(?:continuity|knows?|knew|learn\w*|finds? out|contradict\w*)\b/i.test(query) ? "continuity" : undefined;
    const candidateIds = review || !focus.ids.length ? index.suggest(query, scenes).filter((id) => !focus.ids.includes(id)) : [];
    const showSource = focus.ids.length === 1 && /^(?:please\s+)?(?:read|show)\s+(?:me\s+)?(?:the\s+)?(?:scenes?\s+#?\d+[a-z]*#?|\d+(?:st|nd|rd|th)\s+scene|(?:this|current|next|previous) scene)[.!?]?$/i.test(query.trim());
    return { scenes, focusIds: focus.ids, showSource, candidateIds, review, statisticsCategory, statistics: doc ? screenplayStatistics(doc, scenes) : undefined } as const;
  };
  const chat = useAIChat(
    filePath,
    activeFileId,
    scriptFileName,
    { context: EMPTY_CONTEXT, contextTokens, resolveReading: allowed ? resolveReading : undefined },
  );

  const notes = getPerScriptSettingArray<UrAIRevisionNote>("uraiNotes", parsedDoc.settings, scriptFileName);
  const changeNotes = (change: (previous: UrAIRevisionNote[]) => UrAIRevisionNote[]) => updateSettings((previous) => ({
    ...previous,
    ...updatePerScriptSetting(previous, "uraiNotes", scriptFileName, change(getPerScriptSettingArray("uraiNotes", previous, scriptFileName))),
  }));
  const jumpToScene = (reference: UrAISceneRef) => {
    const scene = locateScene(liveSources(), reference);
    if (scene) scrollToLine(scene.startLine - 1);
  };
  const startNote = (text: string, reference: UrAISceneRef, kind: UrAIRevisionNote["kind"] = "revision") => {
    setNoteError("");
    setNoteDraft({ text, scene: sceneRef(reference), kind });
  };

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

  const handleSend = (text: string) => {
    setNoteError("");
    if (/^(?:please\s+)?(?:save|add|track|pin)\b.*\b(?:note|setup|payoff)\b/i.test(text)) {
      const response = [...chat.turns].reverse().find((turn) => turn.role === "assistant" && turn.content);
      const scenes = liveSources();
      const target = resolveSceneFocus(text, scenes, activeLineNumber + 1, response?.focusSources);
      const reference = target.ids.length === 1 ? scenes.find((scene) => scene.id === target.ids[0]) : undefined;
      if (!reference) {
        setNoteError(target.error ?? "Specify one scene to attach the note to.");
        return;
      }
      const kind = /\b(?:setup|payoff)\b/i.test(text) ? "setup" : "revision";
      startNote(/\b(?:that|this)\b/i.test(text) ? response?.content ?? "" : "", reference, kind);
      return;
    }
    if (!allowed) { setPending({ kind: "chat", text }); return; }
    void chat.send(text, text);
  };

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
          <Tooltip title="Scene notes" placement="bottom">
            <IconButton size="small" aria-label="Scene notes" onClick={() => setNotesOpen(true)}>
              <BookmarkIcon sx={{ fontSize: 16 }} />
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
        {allowed && <Button size="small" onClick={() => { index.stop(); chat.stop(); setAllowedKey(null); }}>Revoke access</Button>}
        <Typography variant="caption" sx={{ display: "block" }}>{(index.progress ? formatIndexProgress(index.progress) : null) || (index.ready ? "Index ready" : "Not indexed or changes need indexing")}</Typography>
        {index.error && <Typography color="error" variant="caption">{index.error}</Typography>}
        {index.progress && <Button onClick={index.stop}>Pause indexing</Button>}
        <TextField size="small" label="Model context limit (tokens)" type="number" value={contextTokens} disabled={chat.streaming} onChange={(e) => setContextTokens(Math.max(2048, Math.min(1048576, Number(e.target.value) || 8192)))} slotProps={{ htmlInput: { "aria-label": "Model context limit in tokens" } }} helperText="Must fit the model's configured context and available memory." sx={{ mt: 1.25, width: "100%" }} />
      </Popover>

      <Dialog open={Boolean(pending) && !allowed} onClose={() => setPending(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Allow UrAI to read this screenplay?</DialogTitle>
        <DialogContent>UrAI can index this document and automatically read relevant scenes to answer your questions. Text is sent to {promptConfig.provider === "ollama" ? promptConfig.ollamaUrl : promptConfig.apiEndpoint}. Permission lasts until you switch documents or providers, revoke access, or close this panel. Index summaries are saved locally.</DialogContent>
        <DialogActions><Button onClick={() => { const text = pending?.text; setPending(null); if (text) void chat.send(text, text); }}>Don't allow</Button><Button onClick={() => setAllowedKey(accessKey)}>Allow</Button></DialogActions>
      </Dialog>
      <Dialog open={Boolean(noteDraft)} onClose={() => setNoteDraft(null)} fullWidth maxWidth="sm">
        <DialogTitle>Save a note for scene {noteDraft?.scene.label}</DialogTitle>
        <DialogContent>
          <TextField
            select fullWidth label="Note type" value={noteDraft?.kind ?? "revision"} sx={{ mt: 1, mb: 2 }}
            onChange={(event) => setNoteDraft((draft) => draft && { ...draft, kind: event.target.value as UrAIRevisionNote["kind"] })}
          >
            <MenuItem value="revision">Revision note</MenuItem>
            <MenuItem value="setup">Setup to track</MenuItem>
          </TextField>
          <TextField
            fullWidth multiline minRows={3} maxRows={12} label="Scene note" value={noteDraft?.text ?? ""}
            onChange={(event) => setNoteDraft((draft) => draft && { ...draft, text: event.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoteDraft(null)}>Cancel</Button>
          <Button disabled={!noteDraft?.text.trim()} onClick={() => {
            if (!noteDraft?.text.trim()) return;
            const note = { ...noteDraft, text: noteDraft.text.trim(), id: crypto.randomUUID() };
            changeNotes((previous) => [note, ...previous]);
            setNoteDraft(null);
          }}>Save note</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={notesOpen} onClose={() => setNotesOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Scene notes</DialogTitle>
        <DialogContent>
          {!notes.length && <Typography variant="body2">Save a revision note or an unresolved setup from an UrAI response.</Typography>}
          {notes.map((note) => (
            <Box key={note.id} sx={{ mb: 2 }}>
              <Typography variant="subtitle2">{note.kind === "setup" ? "Setup to track" : "Revision note"}</Typography>
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{note.text}</Typography>
              <Button size="small" disabled={!locateScene(liveSources(), note.scene)} onClick={() => { jumpToScene(note.scene); setNotesOpen(false); }}>Scene {note.scene.label}</Button>
              <Button size="small" disabled={chat.streaming || !locateScene(liveSources(), note.scene)} onClick={() => {
                const scene = locateScene(liveSources(), note.scene);
                if (!scene) return;
                setNotesOpen(false);
                const prompt = `For the scene at position ${scene.id}, help me ${note.kind === "setup" ? "trace this setup and its payoff" : "work through this revision note"}:\n${note.text}`;
                // This button explicitly attaches the note to the next request.
                if (!allowed) setPending({ kind: "chat", text: prompt });
                else void chat.send(prompt, prompt);
              }}>Discuss in UrAI</Button>
              <Button size="small" onClick={() => changeNotes((previous) => previous.filter(({ id }) => id !== note.id))}>
                {note.kind === "setup" ? "Mark resolved" : "Delete note"}
              </Button>
            </Box>
          ))}
        </DialogContent>
        <DialogActions><Button onClick={() => setNotesOpen(false)}>Close</Button></DialogActions>
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
              onPin={() => chat.togglePin(turn.id)}
              onSource={jumpToScene}
              onSaveNote={(source) => startNote(turn.content, source)}
            />
          ))}
          {noteError && <Typography role="alert" variant="body2" color="error">{noteError}</Typography>}
          {chat.error && (
            <Box
              role="alert"
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
              disabled={!chat.ready || promptConfig.provider === "none"}
              placeholder={parsedDoc.screenplayText ? "Message UrAI..." : "Open a screenplay first..."}
              onSend={handleSend}
              onStop={chat.stop}
            />
          </Box>

          <Box sx={{ px: 2, pt: 0.25, pb: 0.75 }}>
            <Tooltip title={activeModelLabel}>
              <Button
                size="small"
                aria-label="Choose AI model"
                aria-haspopup="menu"
                aria-expanded={Boolean(modelAnchorEl)}
                onClick={(event) => {
                  loadModels();
                  setModelAnchorEl(event.currentTarget);
                }}
                sx={{ maxWidth: "100%", minWidth: 0, color: "text.secondary", textTransform: "none" }}
              >
                <Typography variant="caption" noWrap>{activeModelLabel.split("/").at(-1)}</Typography>
                <Box component="span" aria-hidden="true" sx={{ ml: 0.75 }}>▾</Box>
              </Button>
            </Tooltip>
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
