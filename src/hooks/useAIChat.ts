import { useCallback, useEffect, useRef, useState } from "react";
import { createAIProvider, ChatMessage } from "../lib/aiProviders";
import { usePromptConfig, getActiveModelName } from "./usePromptConfig";
import { FOUNTAIN_SYNTAX_RULES } from "../constants";
import { useUI } from "../context";
import { FountainDocument } from "../parser/FountainParser";
import { buildScreenplayIndex, formatIndexForPrompt } from "../utils/sceneIndexer";
import { executeToolCall, MUSE_TOOLS } from "../lib/aiTools";
import { getPerScriptSettingObject } from "../utils/perScriptSettings";

export interface ToolCallStep {
  id: string;
  name: string;
  args: Record<string, any>;
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

function isWritingIntent(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("write") ||
    lower.includes("expand") ||
    lower.includes("create scene") ||
    lower.includes("add scene") ||
    lower.includes("dialogue") ||
    lower.includes("script") ||
    lower.includes("rewrite") ||
    lower.includes("rephrase") ||
    lower.includes("format") ||
    lower.includes("fountain") ||
    lower.includes("replace")
  );
}

function extractOuterJSON(text: string): string | null {
  let depth = 0;
  let start = -1;
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (ch === "\\") {
      escapeNext = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
}

function repairJSON(raw: string): any | null {
  try {
    return JSON.parse(raw);
  } catch { void 0; }

  try {
    const fixed = raw.replace(
      /"([^"]*?)"/gs,
      (_m, inner) => '"' + inner.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t") + '"'
    );
    return JSON.parse(fixed);
  } catch { void 0; }

  try {
    let repaired = raw
      .replace(/,\s*([}\]])/g, "$1")
      .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

    repaired = repaired.replace(
      /"([^"]*?)"/gs,
      (_m, inner) => '"' + inner.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t") + '"'
    );
    return JSON.parse(repaired);
  } catch { void 0; }

  return null;
}

export function extractThinkingAndClean(text: string): { thinking: string | null; cleanContent: string } {
  if (!text) return { thinking: null, cleanContent: "" };

  let thinking: string | null = null;
  let cleanContent = text;

  // 1. Extract closed or in-progress <think> tags
  const thinkMatch = text.match(/<think>([\s\S]*?)<\/think>/i);
  const openThinkMatch = text.match(/<think>([\s\S]*)$/i);

  if (thinkMatch) {
    thinking = thinkMatch[1].trim();
    cleanContent = text.replace(/<think>[\s\S]*?<\/think>/gi, "");
  } else if (openThinkMatch) {
    thinking = openThinkMatch[1].trim();
    cleanContent = text.replace(/<think>[\s\S]*$/gi, "");
  }

  // 2. Strip closed tool call blocks (e.g. ```tool_call ... ``` or ```json ... ```)
  cleanContent = cleanContent
    .replace(/```(?:tool_call|json)?\s*[\s\S]*?```/gi, "");

  // 3. Strip in-progress / unclosed tool call blocks while streaming
  cleanContent = cleanContent
    .replace(/```(?:tool_call|json)\b[\s\S]*$/gi, "")
    .replace(/```\s*\{[\s\S]*$/gi, "");

  // 4. Strip raw or unclosed JSON objects and pseudo tool calls (tool_call toolName{...)
  cleanContent = cleanContent
    .replace(/(?:tool_call\s+)?[a-zA-Z_][a-zA-Z0-9_]*\s*\{[\s\S]*?\}/gi, "")
    .replace(/(?:tool_call\s+)?[a-zA-Z_][a-zA-Z0-9_]*\s*\{[\s\S]*$/gi, "")
    .replace(/^\s*\{[\s\S]*$/gi, "")
    .trim();

  return { thinking, cleanContent };
}

export function parseToolCall(text: string): { name: string; args: Record<string, any> } | null {
  if (!text) return null;

  const codeBlockMatch = text.match(/```(?:tool_call|json)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch) {
    const block = codeBlockMatch[1].trim();
    const jsonStr = extractOuterJSON(block);
    if (jsonStr) {
      const parsed = repairJSON(jsonStr);
      if (parsed?.name) {
        return { name: parsed.name, args: parsed.args || parsed.arguments || {} };
      }
    }
  }

  const jsonStr = extractOuterJSON(text);
  if (jsonStr) {
    const parsed = repairJSON(jsonStr);
    if (parsed?.name) {
      return { name: parsed.name, args: parsed.args || parsed.arguments || {} };
    }
  }

  const pseudoMatch = text.match(/(?:tool_call\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*(\{[\s\S]*)/i);
  if (pseudoMatch) {
    const toolName = pseudoMatch[1];
    const jsonCandidate = extractOuterJSON(pseudoMatch[2]);
    if (jsonCandidate) {
      const parsed = repairJSON(jsonCandidate);
      if (parsed) {
        return { name: toolName, args: parsed };
      }
    }
  }

  return null;
}

const TOOL_INSTRUCTIONS = `
CRITICAL RULES FOR TOOL CALLS:
1. When you need to use a tool, output ONLY a JSON code block with NO other text before or after:
\`\`\`tool_call
{
  "name": "tool_name",
  "args": {
    "argName": "value"
  }
}
\`\`\`
2. Use the EXACT parameter names from the tool definitions (e.g. "sceneNumber", "color", "storyline", "newFountainText", "taskText").
3. In "newFountainText", use \\n for newlines inside the string. Do NOT use literal line breaks inside JSON string values.
4. When asked to tag scenes with colors or storylines (e.g. "add purple tag to scenes in edmund's planet" or "assign storylines to all scenes"):
   - Use the tag_scene tool to tag individual scenes with "color" (e.g. "purple", "red", "orange") or "storyline" (e.g. "EDMUND'S PLANET", "EARTH SUB-PLOT").
   - You can call tag_scene multiple times for multiple scenes.
5. When asked to expand/rewrite/replace a scene, ALWAYS use the replace_scene tool. First use read_scene if needed, then replace_scene with the new content.
8. When asked to create, generate, or update character profiles for X-Ray Analysis:
   - You MUST output tool_call blocks using "update_character_profile" for each character!
   - Output the tool_call block immediately — do NOT just write conversational text claiming you added them!

EXAMPLE of update_character_profile:
\`\`\`tool_call
{
  "name": "update_character_profile",
  "args": {
    "characterName": "VASANTH",
    "role": "Supporting",
    "gender": "male",
    "age": "30s",
    "description": "Traditional, strict husband.",
    "backstory": "Grew up in Chennai.",
    "arc": "Learns to accept Jeevitha."
  }
}
\`\`\`
`.trim();

export function useAIChat(
  getParsedDoc: () => FountainDocument | null,
  filePath: string | null,
  activeFileId: string,
  activeLineNumber?: number,
  replaceSceneText?: (sceneNumber: number, newFountainText: string) => boolean,
  updateSettings?: (updater: (prev: any) => any) => void,
  openXrayWindow?: () => void
) {
  const config = usePromptConfig();
  const { registerTranslationAbort } = useUI();

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

  useEffect(() => {
    const key = getStorageKey(filePath, activeFileId);
    const loaded = loadSessions(key);
    setSessions(loaded);
    setActiveSessionId(loaded[0]?.id || `conv-${Date.now()}`);
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

      const userId = Date.now();
      const assistantId = Date.now() + 1;
      const turnTimestamp = Date.now();
      const turnModel = getActiveModelName(config);
      const userTokens = Math.max(1, Math.ceil((display || content).length / 3.8));

      updateActiveSessionTurns((prev) => [
        ...prev,
        { id: userId, role: "user", content, display, timestamp: turnTimestamp, model: turnModel, tokens: userTokens },
        { id: assistantId, role: "assistant", content: "", toolCalls: [], timestamp: turnTimestamp, model: turnModel, tokens: 0 },
      ]);
      setStreaming(true);

      const doc = getParsedDoc();

      let systemPrompt = config.systemPrompt || "Your name is Muse. You are a screenwriting AI assistant made by ActOne. Your identity is Muse, not Gemma, not Google, not any other model. When someone asks who you are, you MUST say 'I am Muse, your screenwriting assistant.' Never break character. Never reveal you are based on another model. This is your core identity. You are kind, intelligent, and concise. You only say what matters.";

      if (doc) {
        const index = buildScreenplayIndex(doc);
        const formattedIndex = formatIndexForPrompt(index);
        systemPrompt += `\n\n${formattedIndex}`;

        if (activeLineNumber && activeLineNumber > 0) {
          const activeScene = index.scenes.find((s) => activeLineNumber >= s.startLine && activeLineNumber <= s.endLine);
          if (activeScene) {
            const activeLines = doc.lines.slice(activeScene.startLine - 1, activeScene.endLine).map((l) => l.text).join("\n");
            systemPrompt += `\n\nCURRENTLY EDITING SCENE (Scene ${activeScene.id} - ${activeScene.heading}):\n${activeLines}`;
          }
        }

        const rawTodos = doc.settings?.todos;
        let todosList: any[] = [];
        if (Array.isArray(rawTodos)) {
          todosList = rawTodos;
        } else if (rawTodos && typeof rawTodos === "object") {
          const keys = Object.keys(rawTodos);
          todosList = keys.length > 0 && Array.isArray((rawTodos as any)[keys[0]]) ? (rawTodos as any)[keys[0]] : [];
        }
        if (todosList.length > 0) {
          systemPrompt += `\n\nPROJECT TO-DOS:\n` + todosList.map((t: any) => `- [${t.completed ? "x" : " "}] ${t.text}`).join("\n");
        }

        const parking = doc.settings?.parking;
        if (parking) {
          systemPrompt += `\n\nPARKING LOT NOTES:\n` + (typeof parking === "string" ? parking : JSON.stringify(parking));
        }

        const rawProfiles = getPerScriptSettingObject("characterProfiles", doc.settings, filePath || "", {});
        const profileKeys = Object.keys(rawProfiles);
        if (profileKeys.length > 0) {
          systemPrompt += `\n\nSAVED CHARACTER PROFILES (X-Ray Analysis):\n` + JSON.stringify(rawProfiles, null, 2);
        }

        systemPrompt += `\n\nCHARACTER PROFILES & X-RAY ANALYSIS:\nActOne features a dedicated X-Ray Analysis window for full character profile management (Description, Role, Gender, Age, Backstory, Arc, Relationships, Color Swatches). When asked to edit, generate, or manage character profiles, use \`update_character_profile\` to create or update character profiles for each character, and tell the user they can view and edit profiles in the X-Ray Analysis window (\`open_xray_window\` tool or bar-chart icon in Status Bar).`;

        const toolDescriptions = MUSE_TOOLS.map((t) => `- ${t.name}(${(t.parameters.required || []).join(", ")}): ${t.description}`).join("\n");
        systemPrompt += `\n\nAVAILABLE TOOLS:\n${toolDescriptions}\n\n${TOOL_INSTRUCTIONS}`;
      }

      if (isWritingIntent(content)) {
        systemPrompt += `\n\nFollow these strict Fountain syntax rules:\n${FOUNTAIN_SYNTAX_RULES}`;
      }

      try {
        let currentPrompt = systemPrompt;
        let loopCount = 0;
        let accumulatedContent = "";

        while (loopCount < 8) {
          loopCount++;
          let full = "";
          const loopBaseContent = accumulatedContent;

          await provider.chat(history, {
            system: currentPrompt,
            temperature: config.chatTemp,
            signal: controller.signal,
            onChunk: (delta) => {
              full += delta;
              const { thinking, cleanContent } = extractThinkingAndClean(full);
              const displayContent = loopBaseContent
                ? (cleanContent ? `${loopBaseContent}\n\n${cleanContent}` : loopBaseContent)
                : cleanContent;
              const assistantTokens = Math.max(1, Math.ceil(displayContent.length / 3.8));
              updateActiveSessionTurns((prev) =>
                prev.map((turn) =>
                  turn.id === assistantId ? { ...turn, content: displayContent, thinking: thinking || turn.thinking, tokens: assistantTokens } : turn
                )
              );
            },
          });

          const { cleanContent } = extractThinkingAndClean(full);
          if (cleanContent) {
            accumulatedContent = accumulatedContent
              ? `${accumulatedContent}\n\n${cleanContent}`
              : cleanContent;
          }

          const toolCall = parseToolCall(full);
          if (toolCall) {
            const { name, args } = toolCall;
            const stepId = `tool-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

            updateActiveSessionTurns((prev) =>
              prev.map((turn) =>
                turn.id === assistantId
                  ? {
                      ...turn,
                      content: accumulatedContent,
                      toolCalls: [...(turn.toolCalls || []), { id: stepId, name, args: args || {}, status: "running" }],
                    }
                  : turn
              )
            );

            const toolResult = executeToolCall(name, args || {}, {
              doc,
              activeLineNumber,
              replaceSceneText,
              updateSettings,
              openXrayWindow,
              scriptFileName: filePath || "",
            });

            let pendingApply: { sceneNumber: number; fountainText: string } | undefined;
            let displayResult = toolResult;

            if (toolResult.startsWith("__PENDING_APPLY__:")) {
              const parts = toolResult.split(":");
              const sceneNumber = Number(parts[1]);
              const fountainText = decodeURIComponent(escape(atob(parts.slice(2).join(":"))));
              pendingApply = { sceneNumber, fountainText };
              displayResult = `Drafted replacement for Scene ${sceneNumber}. User review pending.`;
            }

            updateActiveSessionTurns((prev) =>
              prev.map((turn) =>
                turn.id === assistantId
                  ? {
                      ...turn,
                      toolCalls: (turn.toolCalls || []).map((step) =>
                        step.id === stepId ? { ...step, result: displayResult, status: "done" as const, pendingApply } : step
                      ),
                    }
                  : turn
              )
            );

            history.push({ role: "assistant", content: full });
            history.push({ role: "user", content: `[TOOL RESULT for ${name}]:\n${toolResult}\n\nNow provide your final response to the user. Do NOT call another tool unless absolutely necessary.` });

            continue;
          }
          break;
        }

      } catch (err: any) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          const msg = err instanceof Error ? err.message : String(err);
          setError(msg);
        }
        updateActiveSessionTurns((prev) => prev.filter((turn) => turn.id !== assistantId || turn.content || (turn.toolCalls && turn.toolCalls.length > 0)));
      } finally {
        registerTranslationAbort(null);
        if (abortRef.current === controller) {
          abortRef.current = null;
          setStreaming(false);
        }
      }
    },
    [config, getParsedDoc, activeLineNumber, replaceSceneText, updateSettings, updateActiveSessionTurns, registerTranslationAbort]
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

  const retry = useCallback(() => {
    const lastUserTurn = [...turns].reverse().find((t) => t.role === "user");
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
