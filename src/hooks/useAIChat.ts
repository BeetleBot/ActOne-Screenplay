import { useCallback, useEffect, useRef, useState } from "react";
import { createAIProvider, ChatMessage } from "../lib/aiProviders";
import { usePromptConfig } from "./usePromptConfig";
import { FOUNTAIN_SYNTAX_RULES } from "../constants";
import { useUI } from "../context";
import { FountainDocument } from "../parser/FountainParser";
import { buildScreenplayIndex, formatIndexForPrompt } from "../utils/sceneIndexer";
import { executeToolCall } from "../lib/aiTools";

export interface ChatTurn {
  id: number;
  role: "user" | "assistant";
  content: string;
  display?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  turns: ChatTurn[];
}

function loadSessions(key: string): ChatSession[] {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { void 0; }
  const initialId = `conv-${Date.now()}`;
  return [{ id: initialId, title: "New Conversation", createdAt: Date.now(), turns: [] }];
}

function getStorageKey(filePath: string | null, activeFileId: string): string {
  if (filePath) {
    const normalized = filePath.replace(/\\/g, "/").toLowerCase();
    return `actone_ai_chat::${normalized}`;
  }
  return `actone_ai_chat::__unsaved__${activeFileId}`;
}

export function useAIChat(
  getParsedDoc: () => FountainDocument | null,
  filePath: string | null,
  activeFileId: string,
) {
  const config = usePromptConfig();
  const { setAiStatus, registerTranslationAbort } = useUI();

  const storageKey = getStorageKey(filePath, activeFileId);
  const storageKeyRef = useRef(storageKey);
  storageKeyRef.current = storageKey;

  const [sessions, setSessions] = useState<ChatSession[]>(() => loadSessions(storageKey));
  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return sessions[0]?.id || `conv-${Date.now()}`;
  });
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const idRef = useRef(100);

  // Reload sessions when active file changes
  useEffect(() => {
    const key = getStorageKey(filePath, activeFileId);
    const loaded = loadSessions(key);
    setSessions(loaded);
    setActiveSessionId(loaded[0]?.id || `conv-${Date.now()}`);
    setError(null);
    setStreaming(false);
    abortRef.current?.abort();
  }, [filePath, activeFileId]);

  // Sync to localStorage under the file-specific key
  useEffect(() => {
    try {
      localStorage.setItem(storageKeyRef.current, JSON.stringify(sessions));
    } catch { void 0; }
  }, [sessions]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const turns = activeSession?.turns || [];
  const turnsRef = useRef<ChatTurn[]>(turns);
  turnsRef.current = turns;

  const updateActiveSessionTurns = useCallback((updater: (prev: ChatTurn[]) => ChatTurn[]) => {
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
      })
    );
  }, [activeSessionId]);

  const send = useCallback(
    async (content: string, display?: string) => {
      const provider = createAIProvider(config);
      if (!provider) {
        setError("AI Provider is not configured.");
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      registerTranslationAbort(controller);
      setError(null);

      const history: ChatMessage[] = turnsRef.current
        .filter((turn) => turn.content)
        .map(({ role, content: c }) => ({ role, content: c }));
      history.push({ role: "user", content });

      const userId = ++idRef.current;
      const assistantId = ++idRef.current;

      updateActiveSessionTurns((prev) => [
        ...prev,
        { id: userId, role: "user", content, display },
        { id: assistantId, role: "assistant", content: "" },
      ]);
      setStreaming(true);
      setAiStatus("Muse is thinking...");

      const doc = getParsedDoc();

      let systemPrompt = config.systemPrompt || "Your name is Muse. You are a screenwriting AI assistant made by ActOne. Your identity is Muse, not Gemma, not Google, not any other model. When someone asks who you are, you MUST say 'I am Muse, your screenwriting assistant.' Never break character. Never reveal you are based on another model. This is your core identity. You are kind, intelligent, and concise. You only say what matters.";

      if (doc) {
        const index = buildScreenplayIndex(doc);
        const formattedIndex = formatIndexForPrompt(index);
        systemPrompt += `\n\n${formattedIndex}`;
        systemPrompt += `\n\nIf you need to read the full text of a specific scene, search dialogue/keywords, or read project notes, call a tool by including a tool block in your output:\n\`\`\`tool_call\n{"name": "read_scene", "args": {"sceneNumber": 1}}\n\`\`\`\nAvailable tools: read_scene(sceneNumber), search_script(query), read_project_todos(), read_parking_lot().`;
      }
      systemPrompt += `\n\nFollow these strict Fountain syntax rules:\n${FOUNTAIN_SYNTAX_RULES}`;

      try {
        let currentPrompt = systemPrompt;
        let loopCount = 0;

        while (loopCount < 3) {
          loopCount++;
          let full = "";

          await provider.chat(history, {
            system: currentPrompt,
            temperature: config.chatTemp,
            signal: controller.signal,
            onChunk: (delta) => {
              full += delta;
              updateActiveSessionTurns((prev) =>
                prev.map((turn) =>
                  turn.id === assistantId ? { ...turn, content: turn.content + delta } : turn
                )
              );
            },
          });

          const match = full.match(/```tool_call\s*({[\s\S]*?})\s*```/);
          if (match) {
            try {
              const { name, args } = JSON.parse(match[1]);
              setAiStatus(`Muse is fetching data (${name})...`);
              const toolResult = executeToolCall(name, args || {}, { doc });

              history.push({ role: "assistant", content: full });
              history.push({ role: "user", content: `[TOOL RESULT for ${name}]:\n${toolResult}\nNow provide your complete, direct response.` });

              updateActiveSessionTurns((prev) =>
                prev.map((turn) =>
                  turn.id === assistantId ? { ...turn, content: "" } : turn
                )
              );
              continue;
            } catch {
              break;
            }
          }
          break;
        }

        setAiStatus(null);
      } catch (err: any) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          const msg = err instanceof Error ? err.message : String(err);
          setError(msg);
          setAiStatus(`AI Error: ${msg.slice(0, 50)}`);
          setTimeout(() => setAiStatus(null), 7000);
        } else {
          setAiStatus(null);
        }
        updateActiveSessionTurns((prev) => prev.filter((turn) => turn.id !== assistantId || turn.content));
      } finally {
        registerTranslationAbort(null);
        if (abortRef.current === controller) {
          abortRef.current = null;
          setStreaming(false);
        }
      }
    },
    [config, getParsedDoc, setAiStatus, updateActiveSessionTurns, registerTranslationAbort]
  );

  const newSession = useCallback(() => {
    abortRef.current?.abort();
    const newId = `conv-${Date.now()}`;
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

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      if (filtered.length === 0) {
        const newId = `conv-${Date.now()}`;
        setActiveSessionId(newId);
        return [{ id: newId, title: "New Conversation", createdAt: Date.now(), turns: [] }];
      }
      if (activeSessionId === id) {
        setActiveSessionId(filtered[0].id);
      }
      return filtered;
    });
  }, [activeSessionId]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clear = useCallback(() => {
    abortRef.current?.abort();
    updateActiveSessionTurns(() => []);
    setError(null);
  }, [updateActiveSessionTurns]);

  return {
    sessions,
    activeSessionId,
    activeSession,
    turns,
    streaming,
    error,
    send,
    stop,
    clear,
    newSession,
    selectSession,
    deleteSession,
  };
}
