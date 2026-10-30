import { useCallback, useEffect, useRef, useState } from "react";
import {
  nativeChat,
  loadNativeSessions,
  saveNativeSessions,
  contextFingerprint,
  estimateUrAITokens,
  EMPTY_CONTEXT,
  type UrAIContext,
} from "../lib/urai";
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
import { usePromptConfig, getActiveModelName } from "./usePromptConfig";
import { FountainDocument } from "../parser/FountainParser";

export interface ToolCallStep {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: string;
  status: "running" | "done" | "error";
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
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  turns: ChatTurn[];
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
  _getParsedDoc: () => FountainDocument | null,
  filePath: string | null,
  activeFileId: string,
  _activeLineNumber?: number,
  _replaceSceneText?: (sceneNumber: number, newFountainText: string) => boolean,
  _updateSettings?: (updater: (prev: Record<string, unknown>) => Record<string, unknown>) => void,
  _openXrayWindow?: () => void,
  _scriptFileName?: string,
  sharing?: { context: UrAIContext; contextTokens: number; resolveContext?: (query: string) => UrAIContext },
) {
  const config = usePromptConfig();

  const storageKey = getStorageKey(filePath, activeFileId) + "::" + (_scriptFileName || "");
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const [sessions, setSessions] = useState<ChatSession[]>(() => loadSessions(storageKey));
  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return sessions[0]?.id || createUniqueSessionId();
  });
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;
    abortRef.current?.abort();
    setStreaming(false);
    setLoadedKey(null);
    const key = storageKey;
    const legacyKey = getStorageKey(filePath, activeFileId.split("::")[0]).toLowerCase();
    const legacy = loadSessions(localStorage.getItem(key) ? key : legacyKey);
    void loadNativeSessions(key)
      .then((saved) => {
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
  }, [storageKey, filePath, activeFileId]);

  useEffect(() => {
    if (loadedKey !== storageKey) return;
    const key = storageKey;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(sessions));
      } catch {
        /* Native storage remains authoritative. */
      }
      void saveNativeSessions(key, sessions).catch((e) => setError(`Cannot save conversations: ${String(e)}`));
    }, 100);
    return () => clearTimeout(timer);
  }, [sessions, storageKey, loadedKey]);

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
      const requestContext = sharing?.resolveContext?.(content) ?? sharing?.context ?? EMPTY_CONTEXT;
      const sharingKey = await contextFingerprint(config, requestContext);
      if (controller.signal.aborted) return;
      setError(null);

      const history: ChatMessage[] = (retryFrom === undefined ? turnsRef.current : turnsRef.current.slice(0, retryFrom))
        .filter((turn) => turn.content && turn.sharingKey === sharingKey)
        .map(({ role, content: c }) => ({ role, content: c }));
      history.push({ role: "user", content });

      const userId = Date.now();
      const assistantId = Date.now() + 1;
      const turnTimestamp = Date.now();
      const turnModel = getActiveModelName(config);
      const userTokens = estimateUrAITokens(display || content);

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
        },
        {
          id: assistantId,
          role: "assistant",
          content: "",
          toolCalls: [],
          timestamp: turnTimestamp,
          model: turnModel,
          tokens: 0,
          sharingKey,
        },
      ]);
      setStreaming(true);

      const systemPrompt = config.systemPrompt || "You are UrAI, a concise brainstorming and writing companion.";

      try {
        let full = "";

        const completion = await nativeChat(config, history, {
          instructions: systemPrompt,
          context: requestContext,
          contextTokens: sharing?.contextTokens,
          temperature: config.chatTemp,
          signal: controller.signal,
          onTool: (tool) =>
            updateActiveSessionTurns((prev) =>
              prev.map((turn) =>
                turn.id === assistantId
                  ? {
                      ...turn,
                      toolCalls: [
                        ...(turn.toolCalls ?? []),
                        {
                          id: crypto.randomUUID(),
                          name: tool.name,
                          args: {},
                          result: tool.result,
                          status: "done" as const,
                        },
                      ],
                    }
                  : turn,
              ),
            ),
          onChunk: (delta) => {
            full += delta;
            const { thinking, cleanContent } = extractThinkingAndClean(full);
            const assistantTokens = estimateUrAITokens(cleanContent);
            updateActiveSessionTurns((prev) =>
              prev.map((turn) =>
                turn.id === assistantId
                  ? { ...turn, content: cleanContent, thinking: thinking || turn.thinking, tokens: assistantTokens }
                  : turn,
              ),
            );
          },
        });

        const { thinking, cleanContent } = extractThinkingAndClean(completion.text || full);
        const finalTokens = estimateUrAITokens(cleanContent);
        updateActiveSessionTurns((prev) =>
          prev.map((turn) =>
            turn.id === assistantId
              ? {
                  ...turn,
                  content: cleanContent,
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
        if (abortRef.current === controller) {
          abortRef.current = null;
          setStreaming(false);
        }
      }
    },
    [config, sharing, loadedKey, storageKey, updateActiveSessionTurns],
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
    streaming,
    error,
    send,
    retry,
    stop,
    clear,
    newSession,
    selectSession,
    deleteSession,
  };
}
