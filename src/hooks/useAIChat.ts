import { useCallback, useEffect, useRef, useState } from "react";
import {
  nativeChat,
  loadNativeSessions,
  saveNativeSessions,
  contextFingerprint,
  destination,
  estimateUrAITokens,
  EMPTY_CONTEXT,
  isUrAIDesktop,
  type UrAIContext,
  type UrAIReading,
} from "../lib/urai";
import { sceneRef, type UrAISceneRef } from "../lib/uraiSources";
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
import { usePromptConfig, getActiveModelName } from "./usePromptConfig";

export interface ToolCallStep {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: string;
  status: "running" | "done" | "error";
  sources?: UrAISceneRef[];
  pendingApply?: {
    sceneNumber: number;
    fountainText: string;
  };
}

export interface ChatTurn {
  id: number;
  role: "user" | "assistant";
  content: string;
  display?: string;
  thinking?: string;
  toolCalls?: ToolCallStep[];
  timestamp?: number;
  model?: string;
  tokens?: number;
  sharingKey?: string;
  inputTokens?: number;
  conversationScope?: string;
  sources?: UrAISceneRef[];
  pinned?: boolean;
  focusSources?: UrAISceneRef[];
  sourceText?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  turns: ChatTurn[];
}

function conversationMemory(turns: ChatTurn[], limit: number): string {
  const excerpts = [
    ...turns.filter((turn) => turn.pinned).reverse(),
    ...turns.slice(0, -6).filter((turn) => !turn.pinned).reverse(),
  ];
  let remaining = Math.min(900, Math.floor(limit / 12));
  const notes: string[] = [];
  for (const turn of excerpts) {
    const labels = [...new Set(turn.sources?.map((source) => source.label))].join(", ");
    const excerpt = Array.from(turn.content).slice(0, 300).join("");
    const note = `${turn.pinned ? "Pinned · " : ""}${turn.role}${labels ? ` · scenes ${labels}` : ""}: ${excerpt}`;
    const cost = estimateUrAITokens(note) + 4;
    if (cost > remaining) continue;
    remaining -= cost;
    notes.push(note);
  }
  return notes.join("\n");
}

let sessionCounter = 0;
function createUniqueSessionId(): string {
  sessionCounter++;
  return "conv-" + Date.now() + "-" + sessionCounter + "-" + Math.random().toString(36).slice(2, 6);
}

function loadSessions(key: string): ChatSession[] {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    void 0;
  }
  const initialId = createUniqueSessionId();
  return [{ id: initialId, title: "New Conversation", createdAt: Date.now(), turns: [] }];
}

function getStorageKey(filePath: string | null, activeFileId: string): string {
  if (filePath) {
    const normalized = filePath.replace(/\\/g, "/");
    return "actone_ai_chat::" + normalized;
  }
  return "actone_ai_chat::__unsaved__" + activeFileId;
}

export function extractThinkingAndClean(text: string): { thinking: string | null; cleanContent: string } {
  if (!text) return { thinking: null, cleanContent: "" };

  let thinking: string | null = null;
  let cleanContent = text;

  const thinkMatch = text.match(/<think>([\s\S]*?)<\/think>/i);
  const openThinkMatch = text.match(/<think>([\s\S]*)$/i);

  if (thinkMatch) {
    thinking = thinkMatch[1].trim();
    cleanContent = text.replace(/<think>[\s\S]*?<\/think>/gi, "");
  } else if (openThinkMatch) {
    thinking = openThinkMatch[1].trim();
    cleanContent = text.replace(/<think>[\s\S]*$/gi, "");
  }

  return { thinking, cleanContent: cleanContent.trim() };
}

export function useAIChat(
  filePath: string | null,
  activeFileId: string,
  scriptFileName = "",
  sharing?: {
    context: UrAIContext;
    contextTokens: number;
    resolveReading?: (query: string, previous: UrAISceneRef[]) => UrAIReading | { error: string } | Promise<UrAIReading | { error: string }>;
    currentRevision?: () => string;
  },
  freshHistory = false,
) {
  const config = usePromptConfig();

  // Preserve the existing unsaved-script key so local histories still reopen.
  const documentKey = scriptFileName ? `${activeFileId}::${scriptFileName}` : activeFileId;
  const storageKey = (freshHistory ? "rewrite-v1::" : "") + getStorageKey(filePath, documentKey) + "::" + scriptFileName;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const [sessions, setSessions] = useState<ChatSession[]>(() => loadSessions(storageKey));
  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return sessions[0]?.id || createUniqueSessionId();
  });
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const flushRef = useRef<(() => void) | null>(null);
  const previousStorage = useRef<{ documentKey: string; key: string } | null>(null);
  const providerDestination = destination(config);
  useEffect(() => () => abortRef.current?.abort(), [providerDestination]);

  useEffect(() => () => {
    flushRef.current?.();
    flushRef.current = null;
  }, [storageKey]);

  useEffect(() => {
    let cancelled = false;
    abortRef.current?.abort();
    setStreaming(false);
    setLoadedKey(null);
    const key = storageKey;
    const previous = previousStorage.current;
    previousStorage.current = { documentKey, key };
    const legacyKey = getStorageKey(filePath, activeFileId.split("::")[0]).toLowerCase();
    const legacy = loadSessions(freshHistory || localStorage.getItem(key) ? key : legacyKey);
    void loadNativeSessions(key)
      .then(async (saved) => {
        if (freshHistory && !saved && previous?.documentKey === documentKey && previous.key !== key && !localStorage.getItem(key)) {
          saved = await loadNativeSessions(previous.key) ?? loadSessions(previous.key);
        }
        if (cancelled) return;
        const loaded = Array.isArray(saved) && saved.length ? (saved as ChatSession[]) : legacy;
        setSessions(loaded);
        setActiveSessionId(loaded[0].id);
        setError(null);
        setLoadedKey(key);
      })
      .catch((e) => {
        if (!cancelled) setError(`Cannot load conversations: ${String(e)}`);
      });
    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
  }, [storageKey, documentKey, filePath, activeFileId, freshHistory]);

  useEffect(() => {
    if (loadedKey !== storageKey) return;
    const key = storageKey;
    const ordered = [...sessions].sort((a, b) => Number(b.id === activeSessionId) - Number(a.id === activeSessionId));
    let saved = false;
    const save = () => {
      if (saved) return;
      saved = true;
      if (!isUrAIDesktop()) {
        try {
          localStorage.setItem(key, JSON.stringify(ordered));
        } catch {
          // Browser storage can be unavailable.
        }
      }
      void saveNativeSessions(key, ordered).catch((e) => setError(`Cannot save conversations: ${String(e)}`));
    };
    const timer = setTimeout(save, 100);
    flushRef.current = save;
    return () => clearTimeout(timer);
  }, [sessions, activeSessionId, storageKey, loadedKey]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const turns = activeSession?.turns || [];
  const turnsRef = useRef<ChatTurn[]>(turns);
  turnsRef.current = turns;

  const updateActiveSessionTurns = useCallback(
    (updater: (prev: ChatTurn[]) => ChatTurn[]) => {
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === activeSessionId) {
            const nextTurns = updater(s.turns || []);
            let title = s.title;
            if (title === "New Conversation" && nextTurns.length > 0) {
              const firstUser = nextTurns.find((t) => t.role === "user");
              if (firstUser) {
                title = firstUser.display || firstUser.content.slice(0, 30);
              }
            }
            return { ...s, title, turns: nextTurns };
          }
          return s;
        }),
      );
    },
    [activeSessionId],
  );

  const send = useCallback(
    async (content: string, display?: string, retryFrom?: number) => {
      if (loadedKey !== storageKey) {
        setError("Conversations are still loading.");
        return;
      }
      if (config.provider === "none") {
        setError("AI Provider is not configured.");
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const requestContext = sharing?.context ?? EMPTY_CONTEXT;
      const sharingKey = await contextFingerprint(config, requestContext);
      if (controller.signal.aborted) return;
      setError(null);

      const earlier = retryFrom === undefined ? turnsRef.current : turnsRef.current.slice(0, retryFrom);
      const scope = sharing?.resolveReading ? destination(config) + "::live-screenplay" : undefined;
      const scopedTurns = earlier.filter((turn) => turn.content && (
        scope ? turn.conversationScope === scope || (!turn.conversationScope && turn.sharingKey === sharingKey && requestContext.scope === "none")
          : !turn.conversationScope && turn.sharingKey === sharingKey
      ));
      let reading: UrAIReading | { error: string } | undefined;
      const revision = sharing?.currentRevision?.();
      try {
        const previous = [...scopedTurns].reverse().find((turn) => turn.focusSources?.length)?.focusSources ?? [];
        reading = await sharing?.resolveReading?.(content, previous);
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : String(failure));
        return;
      }
      if (controller.signal.aborted) return;
      if (reading && "error" in reading) {
        setError(reading.error);
        return;
      }
      const history: ChatMessage[] = scopedTurns.map((turn) => ({
        role: turn.role,
        content: turn.sourceText ? `Displayed live scene ${turn.sources?.[0]?.label ?? ""} in the chat.` : turn.content,
      }));
      history.push({ role: "user", content });

      const userId = Math.max(Date.now(), (turnsRef.current.at(-1)?.id ?? 0) + 1);
      const assistantId = userId + 1;
      const turnTimestamp = Date.now();
      const turnModel = getActiveModelName(config);
      const userTokens = estimateUrAITokens(display || content);
      const directScene = reading?.showSource ? reading.scenes.find((scene) => scene.id === reading.focusIds[0]) : undefined;

      updateActiveSessionTurns((prev) => [
        ...(retryFrom === undefined ? prev : prev.slice(0, retryFrom)),
        {
          id: userId,
          role: "user",
          content,
          display,
          timestamp: turnTimestamp,
          model: turnModel,
          tokens: userTokens,
          sharingKey,
          conversationScope: scope,
        },
        {
          id: assistantId,
          role: "assistant",
          content: directScene?.text ?? "",
          sourceText: Boolean(directScene),
          sources: directScene ? [sceneRef(directScene)] : undefined,
          toolCalls: [],
          timestamp: turnTimestamp,
          model: directScene ? "Live screenplay" : turnModel,
          tokens: 0,
          sharingKey,
          conversationScope: scope,
          focusSources: reading?.focusIds.flatMap((id) => reading.scenes.filter((scene) => scene.id === id).map(sceneRef)),
        },
      ]);
      if (directScene) {
        abortRef.current = null;
        setStreaming(false);
        return;
      }
      setStreaming(true);

      const systemPrompt = config.systemPrompt || "You are UrAI, a concise brainstorming and writing companion.";

      let frame: number | undefined;
      try {
        let full = "";
        let projectedContent: string | undefined;

        const completion = await nativeChat(config, history, {
          instructions: systemPrompt,
          context: requestContext,
          reading,
          memory: freshHistory ? undefined : conversationMemory(scopedTurns, sharing?.contextTokens ?? 8192),
          compactHistory: freshHistory,
          contextTokens: sharing?.contextTokens,
          temperature: config.chatTemp,
          signal: controller.signal,
          onTurn: (snapshot) => {
            if (abortRef.current !== controller) return;
            if (snapshot.status === "completed") projectedContent = snapshot.content;
            updateActiveSessionTurns((prev) => prev.map((turn) => turn.id === assistantId ? {
              ...turn,
              content: snapshot.content,
              tokens: snapshot.tokens,
              inputTokens: snapshot.inputTokens ?? undefined,
              sources: snapshot.sources,
              toolCalls: snapshot.toolCalls.map((tool) => ({ ...tool, args: tool.args ?? {}, status: tool.status ?? "done" })),
            } : turn));
          },
          onTool: freshHistory ? undefined : (tool) =>
            updateActiveSessionTurns((prev) =>
              prev.map((turn) =>
                turn.id === assistantId
                  ? {
                      ...turn,
                      toolCalls: [
                        ...(turn.toolCalls ?? []).filter((step) => tool.name !== "index_screenplay" || step.name !== tool.name),
                        {
                          id: crypto.randomUUID(),
                          name: tool.name,
                          args: tool.args ?? {},
                          result: tool.result,
                          status: tool.status ?? "done",
                          sources: tool.sources,
                        },
                      ],
                      sources: [...(turn.sources ?? []), ...(tool.sources ?? [])],
                    }
                  : turn,
              ),
            ),
          onChunk: freshHistory ? undefined : (delta) => {
            full += delta;
            if (frame !== undefined) return;
            frame = window.requestAnimationFrame(() => {
              frame = undefined;
              if (controller.signal.aborted) return;
              const { thinking, cleanContent } = extractThinkingAndClean(full);
              const assistantTokens = estimateUrAITokens(cleanContent);
              updateActiveSessionTurns((prev) =>
                prev.map((turn) => turn.id === assistantId
                  ? { ...turn, content: cleanContent, thinking: thinking || turn.thinking, tokens: assistantTokens }
                  : turn),
              );
            });
          },
        });

        const { thinking, cleanContent } = projectedContent !== undefined
          ? { thinking: null, cleanContent: projectedContent }
          : extractThinkingAndClean(completion.text || full);
        const finalTokens = estimateUrAITokens(cleanContent);
        updateActiveSessionTurns((prev) =>
          prev.map((turn) =>
            turn.id === assistantId
              ? {
                  ...turn,
                  content: reading && revision !== sharing?.currentRevision?.()
                    ? `${cleanContent}\n\nThis reply used an earlier draft revision.`
                    : cleanContent,
                  thinking: thinking || turn.thinking,
                  tokens: completion.outputTokens ?? finalTokens,
                  inputTokens: completion.inputTokens ?? undefined,
                }
              : turn,
          ),
        );
      } catch (err: unknown) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          const raw = err instanceof Error ? err.message : String(err);
          const msg = raw.startsWith("RATE_LIMIT:")
            ? `Provider rate limit reached. Retry after ${raw.split(":")[1]} seconds.`
            : raw;
          setError(msg);
        }
        updateActiveSessionTurns((prev) => prev.filter((turn) => turn.id !== assistantId || turn.content));
      } finally {
        if (frame !== undefined) window.cancelAnimationFrame(frame);
        if (abortRef.current === controller) {
          abortRef.current = null;
          setStreaming(false);
        }
      }
    },
    [config, sharing, loadedKey, storageKey, updateActiveSessionTurns, freshHistory],
  );

  const newSession = useCallback(() => {
    abortRef.current?.abort();
    const newId = createUniqueSessionId();
    const newSess: ChatSession = { id: newId, title: "New Conversation", createdAt: Date.now(), turns: [] };
    setSessions((prev) => [newSess, ...prev]);
    setActiveSessionId(newId);
    setError(null);
  }, []);

  const selectSession = useCallback((id: string) => {
    abortRef.current?.abort();
    setActiveSessionId(id);
    setError(null);
  }, []);

  const deleteSession = useCallback(
    (id: string) => {
      setSessions((prev) => {
        const filtered = prev.filter((s) => s.id !== id);
        if (filtered.length === 0) {
          const newId = createUniqueSessionId();
          setActiveSessionId(newId);
          return [{ id: newId, title: "New Conversation", createdAt: Date.now(), turns: [] }];
        }
        if (activeSessionId === id) {
          setActiveSessionId(filtered[0].id);
        }
        return filtered;
      });
    },
    [activeSessionId],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const togglePin = useCallback((id: number) => {
    updateActiveSessionTurns((prev) => prev.map((turn) => turn.id === id ? { ...turn, pinned: !turn.pinned } : turn));
  }, [updateActiveSessionTurns]);

  const clear = useCallback(() => {
    abortRef.current?.abort();
    updateActiveSessionTurns(() => []);
    setError(null);
  }, [updateActiveSessionTurns]);

  const retry = useCallback(() => {
    const lastUserTurn = [...turns].reverse().find((t) => t.role === "user");
    if (!lastUserTurn) return;
    void send(lastUserTurn.content, lastUserTurn.display, turns.indexOf(lastUserTurn));
  }, [turns, send]);

  return {
    sessions,
    activeSessionId,
    activeSession,
    turns,
    ready: loadedKey === storageKey,
    streaming,
    error,
    send,
    retry,
    stop,
    togglePin,
    clear,
    newSession,
    selectSession,
    deleteSession,
  };
}
