import { useCallback, useEffect, useRef, useState } from "react";
import { createAIProvider, ChatMessage } from "../lib/aiProviders";
import { usePromptConfig } from "./usePromptConfig";
import { FOUNTAIN_SYNTAX_RULES } from "../constants";
import { useUI } from "../context";

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
  getDocContext: () => string | null,
  filePath: string | null,
  activeFileId: string,
) {
  const config = usePromptConfig();
  const { setAiStatus } = useUI();

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
    async (content: string, display?: string, action: "chat" | "write-scene" | "q" | "lookup" | "synonyms" = "chat") => {
      const provider = createAIProvider(config);
      if (!provider) {
        setError("AI Provider is not configured.");
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
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
      setAiStatus("Generating AI response...");

      const docContext = getDocContext();

      let systemPrompt: string;

      if (action === "write-scene") {
        systemPrompt = [
          "You are a professional screenplay writer inside ActOne.",
          "Write a complete, well-crafted Fountain-format screenplay scene based on the user's description.",
          "",
          "CRITICAL — your entire response must be ONLY this:",
          "```fountain",
          "Your scene here...",
          "```",
          "",
          "No greetings, no explanations, no notes, no commentary before or after the code block.",
          "Start with ```fountain on the very first line. End with ``` on the very last line.",
          "Every scene needs a heading (INT./EXT. LOCATION - TIME), action, and dialogue.",
          "Use character names and locations from the document context if provided.",
          "",
          "Fountain syntax rules:",
          FOUNTAIN_SYNTAX_RULES,
          docContext ? `\n\nDocument context:\n${docContext}` : "",
          config.writeSceneInstructions ? `\n\nAdditional instructions:\n${config.writeSceneInstructions}` : "",
        ].join("\n");

      } else if (action === "q") {
        systemPrompt = [
          "You are a document analysis assistant for the screenplay below.",
          "Answer the user's question strictly from the document content provided.",
          "",
          "RULES:",
          "1. Answer ONLY from the document. Do NOT invent plot points, characters, or events not present in the text.",
          "2. Quote or closely paraphrase relevant lines from the script to support your answer.",
          "3. If the answer is not in the document, respond exactly: \"This information isn't in the current document.\"",
          "4. Be concise. No padding.",
          "",
          config.qInstructions ? `Additional instructions:\n${config.qInstructions}\n\n` : "",
          docContext
            ? `SCREENPLAY DOCUMENT:\n\n${docContext}`
            : "No document is currently open. Tell the user to open a document first.",
        ].join("\n");

      } else if (action === "lookup") {
        systemPrompt = [
          "Define the word or phrase the user gives you.",
          "Be concise. 1-2 sentences max.",
          "No preamble, no context, just the definition.",
          config.lookupInstructions ? `\nAdditional instructions:\n${config.lookupInstructions}` : "",
        ].join("\n");

      } else if (action === "synonyms") {
        systemPrompt = [
          "List 6-10 synonyms or alternative words for the word the user gives you.",
          "No explanations, no preamble, no context.",
          "Format as a markdown bullet list, one word per line.",
          "Example:",
          "- word1",
          "- word2",
          "- word3",
          config.synonymsInstructions ? `\nAdditional instructions:\n${config.synonymsInstructions}` : "",
        ].join("\n");

      } else {
        systemPrompt = config.systemPrompt || "You are an AI assistant helping with screenwriting.";
        if (docContext) {
          systemPrompt += `\n\nHere is the current document context:\n${docContext}`;
        }
        systemPrompt += `\n\nFollow these strict Fountain syntax rules:\n${FOUNTAIN_SYNTAX_RULES}`;
      }

      try {
        const full = await provider.chat(history, {
          system: systemPrompt,
          temperature: config.chatTemp,
          signal: controller.signal,
          onChunk: (delta) =>
            updateActiveSessionTurns((prev) =>
              prev.map((turn) =>
                turn.id === assistantId ? { ...turn, content: turn.content + delta } : turn
              )
            ),
        });

        // Strip everything outside ```fountain fence for write-scene
        let finalContent = full;
        if (action === "write-scene") {
          // Find the opening fence
          const openIdx = finalContent.indexOf("```fountain");
          if (openIdx !== -1) {
            // Find closing fence AFTER the opening
            const afterOpen = finalContent.slice(openIdx);
            const closeIdx = afterOpen.indexOf("```", 11); // skip past ```fountain
            if (closeIdx !== -1) {
              // Extract content between fences
              const inner = afterOpen.slice(11, closeIdx).replace(/^\n/, "").replace(/\n$/, "").trim();
              finalContent = "```fountain\n" + inner + "\n```";
            } else {
              // No closing fence — take everything from opening onward
              const inner = afterOpen.slice(11).trim();
              finalContent = "```fountain\n" + inner + "\n```";
            }
          } else {
            // No fence found — wrap entire response
            finalContent = "```fountain\n" + finalContent.trim() + "\n```";
          }
        }

        updateActiveSessionTurns((prev) =>
          prev.map((turn) =>
            turn.id === assistantId && turn.content !== finalContent ? { ...turn, content: finalContent } : turn
          )
        );
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
        if (abortRef.current === controller) {
          abortRef.current = null;
          setStreaming(false);
        }
      }
    },
    [config, getDocContext, setAiStatus, updateActiveSessionTurns]
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
