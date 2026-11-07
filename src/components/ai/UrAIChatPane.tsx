import {
  AssistantRuntimeProvider, ComposerPrimitive, MessagePrimitive, ThreadPrimitive,
  useAuiState, useExternalStoreRuntime, type ThreadMessageLike,
} from "@assistant-ui/react";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, ListSubheader, Menu, MenuItem, Paper, Tooltip, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useCursor, useEditor, useFile, useUI } from "../../context";
import { useAIChat, type ChatTurn } from "../../hooks/useAIChat";
import { activateConfiguredApi, fetchModels, reportCredentialError, setPromptConfigField, usePromptConfig } from "../../hooks/usePromptConfig";
import { useApiList } from "../../hooks/useApiList";
import { AddIcon, DeleteIcon, HistoryIcon, KeyboardArrowDownIcon, SendIcon, StopIcon } from "../Icons";
import { destination, EMPTY_CONTEXT, isUrAIDesktop, resolveNativeSceneFocus, type UrAIReading } from "../../lib/urai";
import { locateScene, resolveSceneFocus, screenplaySources, type UrAISceneRef } from "../../lib/uraiSources";
import { parseScreenplay } from "../../parser";
import { readLiveEditorText } from "../../editor/pendingEdits";
import { isNonScreenplay } from "../../utils/scriptMode";
import { requestedStatistics, screenplayStatistics } from "../../lib/uraiStats";

export function requestsWholeScreenplay(text: string) {
  return /^\s*(?:please\s+)?(?:read|index)\s+(?:my\s+|the\s+|this\s+)?(?:whole|entire|full)\s+(?:screenplay|script|draft)\b/i.test(text);
}

function screenplayReview(text: string) {
  if (/\b(?:setup|payoff|foreshadow\w*)\b/i.test(text)) return "setup";
  if (/\b(?:continuity|knows?|knew|learn\w*|contradict\w*)\b/i.test(text)) return "continuity";
}

function requestsScreenplayContext(text: string) {
  return requestedStatistics(text) || screenplayReview(text) || /\b(?:scenes?|screenplay|draft|script|dialogue)\b|^\s*(?:find|search|locate)\b/i.test(text);
}

function convertMessage(turn: ChatTurn): ThreadMessageLike {
  return {
    id: String(turn.id),
    role: turn.role,
    content: [{ type: "text", text: turn.display ?? turn.content }],
    metadata: { custom: { sources: turn.sources ?? [], sourceText: turn.sourceText } },
  };
}

function MarkdownReply({ text }: { text: string }) {
  return (
    <Box sx={{ whiteSpace: "normal", "& p, & ul, & ol, & pre, & blockquote": { my: 1 }, "& > :first-child": { mt: 0 }, "& > :last-child": { mb: 0 }, "& ul, & ol": { pl: 3 }, "& h1, & h2, & h3, & h4": { fontSize: "1.05em", mt: 1.5, mb: 0.5 }, "& pre": { overflowX: "auto", bgcolor: "action.hover", borderRadius: 1, p: 1 }, "& table": { display: "block", overflowX: "auto", borderCollapse: "collapse" }, "& th, & td": { border: 1, borderColor: "divider", px: 1 }, "& a": { color: "primary.main" } }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          img: ({ alt }) => <span>{alt || "Image"}</span>,
          a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
        }}
      >
        {hideStoredToolCalls(text)}
      </ReactMarkdown>
    </Box>
  );
}

function hideStoredToolCalls(text: string) {
  const lines = text.split("\n");
  const visible: string[] = [];
  for (let index = 0; index < lines.length; index++) {
    const fenced = /^\s*```(?:json)?\s*$/i.test(lines[index]);
    const start = fenced ? index + 1 : index;
    if (!/^\s*\{\s*"tool"\s*:/.test(lines[start] ?? "")) {
      visible.push(lines[index]);
      continue;
    }
    let end = start;
    let json = lines[start];
    let matched = false;
    for (; end < lines.length && end < start + 32; end++) {
      if (end > start) json += "\n" + lines[end];
      try {
        const value = JSON.parse(json);
        matched = typeof value?.tool === "string" && value.args !== null && typeof value.args === "object" && !Array.isArray(value.args);
        break;
      } catch {
        // A stored tool call can span several lines.
      }
    }
    if (!matched) {
      visible.push(lines[index]);
      continue;
    }
    while (visible.length && !visible.at(-1)?.trim()) visible.pop();
    if (/^[ #*_\x60]*(?:scene[- ]read|tool[- ]call(?:ing)?)[ *_\x60:]*$/i.test(visible.at(-1) ?? "")) visible.pop();
    index = fenced && /^\s*```\s*$/.test(lines[end + 1] ?? "") ? end + 1 : end;
  }
  return visible.join("\n").trim();
}

function ChatMessage({ onSource }: { onSource: (source: UrAISceneRef) => void }) {
  const role = useAuiState((state) => state.message.role);
  const sources = useAuiState((state) => state.message.metadata.custom.sources) as UrAISceneRef[] | undefined;
  const sourceText = useAuiState((state) => state.message.metadata.custom.sourceText);
  const user = role === "user";
  return (
    <Box className="urai-chat-message" sx={{ alignSelf: user ? "flex-end" : "stretch", maxWidth: user ? "85%" : "100%", px: user ? 1.25 : 1.5, py: user ? 0.75 : 1.25, borderRadius: user ? "var(--radius-lg)" : "var(--radius-md)", bgcolor: user ? "action.selected" : "action.hover", whiteSpace: "pre-wrap", overflowWrap: "anywhere", typography: "body2", lineHeight: 1.65 }}>
      {!user && (
        <Typography component="span" variant="caption" color="text.secondary" sx={{ display: "inline-flex", alignItems: "center", px: 0.75, mb: 1, border: 1, borderColor: "divider", borderRadius: "var(--radius-xs)", bgcolor: "action.hover", fontWeight: 600, fontSize: 11, lineHeight: "18px" }}>
          UrAI
        </Typography>
      )}
      <MessagePrimitive.Root>
        <MessagePrimitive.Parts components={user || sourceText ? undefined : { Text: MarkdownReply }} />
      </MessagePrimitive.Root>
      {!!sources?.length && <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 1 }}>
        {[...new Map(sources.map((source) => [source.id, source])).values()].map((source) => (
          <Button key={source.id} size="small" variant="outlined" onClick={() => onSource(source)}>Scene {source.label}</Button>
        ))}
      </Box>}
    </Box>
  );
}

export function UrAIChatPane() {
  const { filePath, activeFileId, scriptFileName, rawText, parsedDoc, scripts, activeScriptIndex } = useFile();
  const { scrollToLine } = useEditor();
  const { activeLineNumber } = useCursor();
  const { paperSize } = useUI();
  const config = usePromptConfig();
  const { provider } = config;
  const apiEntries = useApiList();
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ identity: string; id: string; title: string }>();
  const [modelMenu, setModelMenu] = useState<HTMLElement | null>(null);
  const [models, setModels] = useState<string[]>();
  const [switchingModel, setSwitchingModel] = useState(false);
  const activeApi = apiEntries.find((entry) => entry.endpoint === config.apiEndpoint && entry.model === config.apiModel);
  const modelLabel = provider === "ollama" ? config.model : provider === "openai-compatible" ? activeApi?.name || config.apiModel : undefined;
  const shortModelLabel = modelLabel?.split("/").at(-1)?.replace(/-GGUF(?=:|$)/i, "");
  const [access, setAccess] = useState<string>();
  const [pending, setPending] = useState<{ key: string; text: string }>();
  const [navigationError, setNavigationError] = useState("");
  const identity = JSON.stringify([filePath || activeFileId, scriptFileName]);
  const key = JSON.stringify([identity, destination(config)]);
  const allowed = access === key;
  const currentText = useRef(rawText);
  const statisticsCache = useRef<{ doc: ReturnType<typeof parseScreenplay>; statistics: ReturnType<typeof screenplayStatistics> } | undefined>(undefined);
  currentText.current = rawText;
  const currentRevision = () => (readLiveEditorText(activeFileId, scriptFileName) ?? currentText.current ?? "").replace(/\r\n/g, "\n");
  const liveDocument = () => {
    if (isNonScreenplay(scripts?.[activeScriptIndex], filePath)) return undefined;
    const text = currentRevision();
    return parsedDoc?.screenplayText === text ? parsedDoc : parseScreenplay(text, paperSize);
  };
  const resolveReading = async (query: string, previous: UrAISceneRef[]): Promise<UrAIReading | { error: string }> => {
    const doc = liveDocument();
    const scenes = doc ? screenplaySources(doc) : [];
    const indexRequested = requestsWholeScreenplay(query);
    const statisticsCategory = requestedStatistics(query);
    const review = screenplayReview(query);
    const startsSearch = /^\s*(?:find|search|locate|where)\b/i.test(query) && /["“]/.test(query);
    const anchors = statisticsCategory || startsSearch ? [] : previous;
    const focus = indexRequested ? { ids: [] } : isUrAIDesktop()
      ? { ids: await resolveNativeSceneFocus(query, scenes, activeLineNumber + 1, anchors) }
      : resolveSceneFocus(query, scenes, activeLineNumber + 1, anchors);
    if (focus.error) return { error: focus.error };
    if (indexRequested && !scenes.length) return { error: "This draft has no screenplay scenes to read." };
    const showSource = focus.ids.length === 1 && /^(?:please\s+)?(?:read|show)\s+(?:me\s+)?(?:the\s+)?(?:scenes?\s+#?\d+[a-z]*#?|\d+(?:st|nd|rd|th)\s+scene|(?:this|current|next|previous) scene)[.!?]?$/i.test(query.trim());
    if (doc && statisticsCache.current?.doc !== doc) {
      statisticsCache.current = { doc, statistics: screenplayStatistics(doc, scenes) };
    }
    return { scenes, focusIds: focus.ids, showSource, indexKey: identity, indexRequested, review, statisticsCategory, statistics: doc ? statisticsCache.current?.statistics : undefined };
  };
  const chat = useAIChat(filePath, activeFileId, scriptFileName, { context: EMPTY_CONTEXT, contextTokens: provider === "ollama" ? 8192 : 32768, currentRevision, resolveReading: allowed ? resolveReading : undefined }, true);
  const canSend = chat.ready && provider !== "none" && !switchingModel;
  const { send, streaming } = chat;
  useEffect(() => {
    setAccess(undefined);
    setPending(undefined);
  }, [key]);
  useEffect(() => {
    if (!allowed || pending?.key !== key) return;
    setPending(undefined);
    void send(pending.text);
  }, [allowed, key, pending, send]);
  useEffect(() => {
    const lookup = (event: Event) => {
      const selection = (event as CustomEvent<string>).detail?.trim();
      if (!selection || !canSend || streaming) return;
      const request = event.type === "prompt-lookup" ? "Explain the meaning and usage of" : "Suggest synonyms for";
      void send(`${request} ${JSON.stringify(selection)} in a screenplay.`);
    };
    window.addEventListener("prompt-lookup", lookup);
    window.addEventListener("prompt-synonyms", lookup);
    return () => {
      window.removeEventListener("prompt-lookup", lookup);
      window.removeEventListener("prompt-synonyms", lookup);
    };
  }, [canSend, send, streaming]);
  const runtime = useExternalStoreRuntime({
    messages: chat.ready ? chat.turns : [],
    convertMessage,
    isRunning: chat.streaming,
    onNew: async (message) => {
      if (!canSend) return;
      const text = message.content.map((part) => part.type === "text" ? part.text : "").join("").trim();
      if (!text) return;
      setNavigationError("");
      if (!allowed && requestsScreenplayContext(text)) {
        setPending({ key, text });
        return;
      }
      await chat.send(text);
    },
    onCancel: async () => chat.stop(),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Box component={ThreadPrimitive.Root} sx={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, pl: 2, pr: 5, height: 40, flexShrink: 0, borderBottom: 1, borderColor: "divider", "& .MuiIconButton-root": { width: 28, height: 28, borderRadius: "var(--radius-sm)", color: "text.secondary" } }}>
          <Typography variant="subtitle2" sx={{ flex: 1, minWidth: 0, fontWeight: 700, opacity: 0.8, fontSize: "0.7rem", letterSpacing: "0.05em", textTransform: "uppercase" }} noWrap>UrAI Chat</Typography>
          <Tooltip title="History"><span><IconButton size="small" aria-label="History" aria-haspopup="menu" aria-expanded={Boolean(menu)} disabled={!chat.ready} onClick={(event) => setMenu(event.currentTarget)}><HistoryIcon sx={{ fontSize: 16 }} /></IconButton></span></Tooltip>
          <Tooltip title="New chat"><span><IconButton size="small" aria-label="New chat" disabled={!chat.ready} onClick={() => { setPending(undefined); chat.newSession(); }}><AddIcon sx={{ fontSize: 16 }} /></IconButton></span></Tooltip>
          <Menu anchorEl={menu} open={Boolean(menu)} onClose={() => setMenu(null)} slotProps={{ paper: { sx: { width: 280, maxWidth: "calc(100vw - 32px)", maxHeight: 320 } } }}>
            <ListSubheader>Conversations</ListSubheader>
            {chat.sessions.map((session) => (
              <MenuItem key={session.id} selected={chat.activeSessionId === session.id} sx={{ gap: 1, pr: 1 }} onClick={() => {
                setPending(undefined);
                chat.selectSession(session.id);
                setMenu(null);
              }}>
                <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }} title={session.title}>{session.title}</Typography>
                <IconButton
                  size="small"
                  aria-label={`Delete chat: ${session.title}`}
                  disabled={chat.streaming}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    setMenu(null);
                    setDeleteTarget({ identity, id: session.id, title: session.title });
                  }}
                  sx={{ color: "text.secondary", "&:hover": { color: "error.main" } }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </MenuItem>
            ))}
          </Menu>
          <Dialog open={deleteTarget?.identity === identity} onClose={() => setDeleteTarget(undefined)} aria-labelledby="urai-delete-chat-title">
            <DialogTitle id="urai-delete-chat-title">Delete conversation?</DialogTitle>
            <DialogContent><Typography variant="body2">“{deleteTarget?.title}” will be removed from your chat history.</Typography></DialogContent>
            <DialogActions>
              <Button autoFocus onClick={() => setDeleteTarget(undefined)}>Cancel</Button>
              <Button color="error" variant="contained" disabled={chat.streaming} onClick={() => {
                if (deleteTarget?.identity === identity) {
                  setPending(undefined);
                  chat.deleteSession(deleteTarget.id);
                }
                setDeleteTarget(undefined);
              }}>Delete chat</Button>
            </DialogActions>
          </Dialog>
        </Box>
        <Box component={ThreadPrimitive.Viewport} sx={{ flex: 1, minHeight: 0, overflowY: "auto", scrollbarGutter: "stable", px: 2, py: 2 }}>
          <Box sx={{ mx: "auto", maxWidth: 640, display: "flex", flexDirection: "column", gap: 2 }}>
          <ThreadPrimitive.Empty>
            <Box sx={{ mx: "auto", mt: 5, maxWidth: 270, textAlign: "center", px: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Talk through your screenplay</Typography>
              <Typography variant="body2" color="text.secondary">Ask about a scene, explore a story idea, or ask UrAI to read the whole draft.</Typography>
            </Box>
          </ThreadPrimitive.Empty>
          <ThreadPrimitive.Messages>{() => <ChatMessage onSource={(reference) => {
            const doc = liveDocument();
            const scene = doc && locateScene(screenplaySources(doc), reference);
            if (scene) scrollToLine(scene.startLine - 1);
            else setNavigationError("That scene has moved or changed. Ask UrAI to read it again.");
          }} />}</ThreadPrimitive.Messages>
          </Box>
        </Box>
        {pending?.key === key && <Paper variant="outlined" sx={{ mx: 1.5, p: 1.25 }}>
          <Typography variant="body2">Allow UrAI to read this screenplay for this provider?</Typography>
          <Button size="small" onClick={() => setAccess(key)}>Allow</Button>
          <Button size="small" onClick={() => setPending(undefined)}>Cancel</Button>
        </Paper>}
        <Box role="status" sx={{ px: 1.5, typography: "caption", color: chat.error ? "error.main" : "text.secondary" }}>
          {chat.error ?? (navigationError || (chat.streaming ? chat.turns.at(-1)?.toolCalls?.at(-1)?.result || "Replying…" : provider === "none" ? "Choose a provider in Settings." : ""))}
        </Box>
        {chat.error && chat.turns.some((turn) => turn.role === "user") && (
          <Button disabled={chat.streaming} onClick={chat.retry}>Retry</Button>
        )}
        <Paper variant="outlined" sx={{ width: "calc(100% - 32px)", maxWidth: 640, mx: "auto", mt: 0.75, mb: 1.5, borderRadius: "var(--radius-md)", bgcolor: "background.default", "&:focus-within": { borderColor: "primary.main" } }}>
        <Box component={ComposerPrimitive.Root} sx={{ display: "flex", alignItems: "end", gap: 0.75, px: 1, pt: 0.75, "& textarea": { flex: 1, minWidth: 0, maxHeight: "8rem", resize: "none", typography: "body2", color: "text.primary", bgcolor: "transparent", border: 0, outline: 0, p: 0.75 }, "& button": { bgcolor: "action.selected", width: 28, height: 28, borderRadius: "var(--radius-sm)" } }}>
          <ComposerPrimitive.Input aria-label="Message UrAI" placeholder="Message UrAI…" disabled={!canSend} />
          {chat.streaming ? (
            <Tooltip title="Stop"><IconButton size="small" color="primary" aria-label="Stop" component={ComposerPrimitive.Cancel}><StopIcon /></IconButton></Tooltip>
          ) : (
            <Tooltip title="Send"><span><IconButton size="small" color="primary" aria-label="Send" component={ComposerPrimitive.Send} disabled={!canSend || pending?.key === key}><SendIcon /></IconButton></span></Tooltip>
          )}
        </Box>
        <Button
          size="small"
          color="inherit"
          aria-label={modelLabel ? `Choose model, current model ${modelLabel}` : "Choose model"}
          aria-haspopup="menu"
          aria-expanded={Boolean(modelMenu)}
          title={modelLabel}
          disabled={chat.streaming || switchingModel}
          endIcon={<KeyboardArrowDownIcon fontSize="small" />}
          onClick={(event) => {
            setModelMenu(event.currentTarget);
            setModels(undefined);
            void fetchModels("ollama").then(setModels);
          }}
          sx={{ maxWidth: "min(100% - 16px, 250px)", minWidth: 0, mx: 1, mb: 0.5, color: "text.secondary", textTransform: "none", "& .MuiButton-endIcon": { flexShrink: 0 } }}
        >
          <Typography variant="caption" noWrap>{shortModelLabel || "Choose model"}</Typography>
        </Button>
        </Paper>
        <Menu
          anchorEl={modelMenu}
          open={Boolean(modelMenu)}
          onClose={() => setModelMenu(null)}
          anchorOrigin={{ vertical: "top", horizontal: "left" }}
          transformOrigin={{ vertical: "bottom", horizontal: "left" }}
          slotProps={{ paper: { sx: { mt: -0.5, maxWidth: 360, maxHeight: "min(320px, 55vh)" } } }}
        >
          {!!apiEntries.length && <ListSubheader>Configured providers</ListSubheader>}
          {apiEntries.map((entry) => (
            <MenuItem key={entry.id} selected={provider === "openai-compatible" && entry.id === activeApi?.id} onClick={async () => {
              setModelMenu(null);
              setSwitchingModel(true);
              try {
                await activateConfiguredApi(entry);
              } catch (error) {
                reportCredentialError(error);
              } finally {
                setSwitchingModel(false);
              }
            }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" noWrap>{entry.name}</Typography>
                <Typography variant="caption" color="text.secondary" noWrap component="div">{entry.model}</Typography>
              </Box>
            </MenuItem>
          ))}
          <ListSubheader>Ollama</ListSubheader>
          {!models?.length && <MenuItem disabled>{models ? "No Ollama models found" : "Loading models…"}</MenuItem>}
          {[...new Set(models)].map((model) => (
            <MenuItem key={model} selected={provider === "ollama" && config.model === model} onClick={() => {
              setPromptConfigField("model", model);
              setPromptConfigField("provider", "ollama");
              setModelMenu(null);
            }}><Typography variant="body2" noWrap>{model}</Typography></MenuItem>
          ))}
        </Menu>
      </Box>
    </AssistantRuntimeProvider>
  );
}
