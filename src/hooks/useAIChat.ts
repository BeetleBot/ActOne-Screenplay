import { useCallback, useEffect, useRef, useState } from 'react';
import { createAIProvider, ChatMessage } from '../lib/aiProviders';
import { usePromptConfig, getActiveModelName } from './usePromptConfig';
import { useUI } from '../context';
import { FountainDocument } from '../parser/FountainParser';
import { buildScreenplayIndex } from '../utils/sceneIndexer';
import { buildScreenplayContext } from '../utils/scriptCompressor';

export interface ToolCallStep {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: string;
  status: 'running' | 'done' | 'error';
  pendingApply?: {
    sceneNumber: number;
    fountainText: string;
  };
}

export interface ChatTurn {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  display?: string;
  thinking?: string;
  toolCalls?: ToolCallStep[];
  timestamp?: number;
  model?: string;
  tokens?: number;
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
  return 'conv-' + Date.now() + '-' + sessionCounter + '-' + Math.random().toString(36).slice(2, 6);
}

function loadSessions(key: string): ChatSession[] {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { void 0; }
  const initialId = createUniqueSessionId();
  return [{ id: initialId, title: 'New Conversation', createdAt: Date.now(), turns: [] }];
}

function getStorageKey(filePath: string | null, activeFileId: string): string {
  if (filePath) {
    const normalized = filePath.replace(/\\/g, '/').toLowerCase();
    return 'actone_ai_chat::' + normalized;
  }
  return 'actone_ai_chat::__unsaved__' + activeFileId;
}

export function extractThinkingAndClean(text: string): { thinking: string | null; cleanContent: string } {
  if (!text) return { thinking: null, cleanContent: '' };

  let thinking: string | null = null;
  let cleanContent = text;

  const thinkMatch = text.match(/<think>([\s\S]*?)<\/think>/i);
  const openThinkMatch = text.match(/<think>([\s\S]*)$/i);

  if (thinkMatch) {
    thinking = thinkMatch[1].trim();
    cleanContent = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  } else if (openThinkMatch) {
    thinking = openThinkMatch[1].trim();
    cleanContent = text.replace(/<think>[\s\S]*$/gi, '');
  }

  return { thinking, cleanContent: cleanContent.trim() };
}

export function useAIChat(
  getParsedDoc: () => FountainDocument | null,
  filePath: string | null,
  activeFileId: string,
  activeLineNumber?: number,
  _replaceSceneText?: (sceneNumber: number, newFountainText: string) => boolean,
  _updateSettings?: (updater: (prev: Record<string, unknown>) => Record<string, unknown>) => void,
  _openXrayWindow?: () => void,
  _scriptFileName?: string
) {
  const config = usePromptConfig();
  const { registerTranslationAbort } = useUI();

  const storageKey = getStorageKey(filePath, activeFileId);
  const storageKeyRef = useRef(storageKey);
  storageKeyRef.current = storageKey;

  const [sessions, setSessions] = useState<ChatSession[]>(() => loadSessions(storageKey));
  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return sessions[0]?.id || createUniqueSessionId();
  });
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const key = getStorageKey(filePath, activeFileId);
    const loaded = loadSessions(key);
    setSessions(loaded);
    setActiveSessionId(loaded[0]?.id || createUniqueSessionId());
    setError(null);
    setStreaming(false);
    abortRef.current?.abort();
  }, [filePath, activeFileId]);

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
          if (title === 'New Conversation' && nextTurns.length > 0) {
            const firstUser = nextTurns.find((t) => t.role === 'user');
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
        setError('AI Provider is not configured.');
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
      history.push({ role: 'user', content });

      const userId = Date.now();
      const assistantId = Date.now() + 1;
      const turnTimestamp = Date.now();
      const turnModel = getActiveModelName(config);
      const userTokens = Math.max(1, Math.ceil((display || content).length / 3.8));

      updateActiveSessionTurns((prev) => [
        ...prev,
        { id: userId, role: 'user', content, display, timestamp: turnTimestamp, model: turnModel, tokens: userTokens },
        { id: assistantId, role: 'assistant', content: '', toolCalls: [], timestamp: turnTimestamp, model: turnModel, tokens: 0 },
      ]);
      setStreaming(true);

      const doc = getParsedDoc();

      let systemPrompt = config.systemPrompt || 'Your name is Muse. You are a screenwriting assistant in ActOne. You help screenwriters understand, analyze, and discuss their screenplay. You are kind, intelligent, and concise. You answer questions accurately based on the provided screenplay context. When providing screenplay excerpts or scenes, format them in standard Fountain syntax.';

      if (doc) {
        const index = buildScreenplayIndex(doc);
        const scriptContext = buildScreenplayContext(doc, index, content, activeLineNumber);
        systemPrompt += '\n\n' + scriptContext;
      }

      try {
        let full = '';

        await provider.chat(history, {
          system: systemPrompt,
          temperature: config.chatTemp,
          signal: controller.signal,
          onChunk: (delta) => {
            full += delta;
            const { thinking, cleanContent } = extractThinkingAndClean(full);
            const assistantTokens = Math.max(1, Math.ceil(cleanContent.length / 3.8));
            updateActiveSessionTurns((prev) =>
              prev.map((turn) =>
                turn.id === assistantId
                  ? { ...turn, content: cleanContent, thinking: thinking || turn.thinking, tokens: assistantTokens }
                  : turn
              )
            );
          },
        });

        const { thinking, cleanContent } = extractThinkingAndClean(full);
        const finalTokens = Math.max(1, Math.ceil(cleanContent.length / 3.8));
        updateActiveSessionTurns((prev) =>
          prev.map((turn) =>
            turn.id === assistantId
              ? { ...turn, content: cleanContent, thinking: thinking || turn.thinking, tokens: finalTokens }
              : turn
          )
        );

      } catch (err: unknown) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          const msg = err instanceof Error ? err.message : String(err);
          setError(msg);
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
    [config, getParsedDoc, activeLineNumber, updateActiveSessionTurns, registerTranslationAbort]
  );

  const newSession = useCallback(() => {
    abortRef.current?.abort();
    const newId = createUniqueSessionId();
    const newSess: ChatSession = { id: newId, title: 'New Conversation', createdAt: Date.now(), turns: [] };
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
        const newId = createUniqueSessionId();
        setActiveSessionId(newId);
        return [{ id: newId, title: 'New Conversation', createdAt: Date.now(), turns: [] }];
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

  const retry = useCallback(() => {
    const lastUserTurn = [...turns].reverse().find((t) => t.role === 'user');
    if (!lastUserTurn) return;
    send(lastUserTurn.content, lastUserTurn.display);
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
