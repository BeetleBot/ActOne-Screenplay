import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { PromptConfig } from "../hooks/usePromptConfig";
import type { FountainDocument } from "../parser";
import { buildScreenplayIndex } from "../utils/sceneIndexer";

export type SharingScope = "none" | "selection" | "scene" | "scenes" | "full";
export interface UrAIContext {
  scope: SharingScope;
  scenes: { id: number; heading: string; text: string }[];
  sceneIds: number[];
  selection: string;
}
export interface UrAIUsage {
  text: string;
  inputTokens: number | null;
  outputTokens: number | null;
  finishReason: string;
}
export interface UrAIElement {
  id: string;
  text: string;
  kind: string;
  speaker: string;
}
export interface UrAIReplacement {
  id: string;
  text: string;
}
export const EMPTY_CONTEXT: UrAIContext = { scope: "none", scenes: [], sceneIds: [], selection: "" };
export function isUrAIDesktop() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
export function providerConfig(config: PromptConfig, contextTokens?: number) {
  return {
    provider: config.provider,
    endpoint: config.provider === "ollama" ? config.ollamaUrl : config.apiEndpoint,
    model: config.provider === "ollama" ? config.model : config.apiModel,
    apiKey: config.apiKey,
    contextTokens: contextTokens ?? (config.provider === "ollama" ? 8192 : 32768),
  };
}
export function screenplayContext(
  doc: FountainDocument | null,
  scope: SharingScope,
  sceneIds: number[],
  selection = "",
): UrAIContext {
  if (!doc || scope === "none" || scope === "selection") return { ...EMPTY_CONTEXT, scope, selection };
  const scenes = buildScreenplayIndex(doc)
    .scenes.filter((s) => scope === "full" || sceneIds.includes(s.id))
    .map((s) => ({
      id: s.id,
      heading: s.heading,
      text: doc.lines
        .slice(s.startLine - 1, s.endLine)
        .map((l) => l.text)
        .join("\n"),
    }));
  return { scope, scenes, sceneIds, selection: "" };
}
export function destination(config: PromptConfig) {
  return `${config.provider}:${config.provider === "ollama" ? config.ollamaUrl : config.apiEndpoint}`;
}
export function estimateUrAITokens(text: string) {
  return Math.ceil(new TextEncoder().encode(text).length / 3) + [...text].filter((c) => !/[\x00-\x7f]/.test(c)).length;
}

export async function nativeChat(
  config: PromptConfig,
  messages: { role: string; content: string }[],
  options: {
    instructions: string;
    context?: UrAIContext;
    signal?: AbortSignal;
    onChunk?: (text: string) => void;
    temperature?: number;
    maxTokens?: number;
    contextTokens?: number;
    onTool?: (tool: { name: string; result: string }) => void;
  },
): Promise<UrAIUsage> {
  const requestId = crypto.randomUUID();
  if (options.signal?.aborted) throw new DOMException("Aborted", "AbortError");
  const unlisten = await listen<{ requestId: string; text: string }>("urai-delta", (e) => {
    if (e.payload.requestId === requestId && !options.signal?.aborted) options.onChunk?.(e.payload.text);
  });
  const unlistenTool = await listen<{ requestId: string; name: string; result: string }>("urai-tool", (e) => {
    if (e.payload.requestId === requestId && !options.signal?.aborted) options.onTool?.(e.payload);
  });
  const abort = () => {
    void invoke("urai_cancel", { requestId });
  };
  options.signal?.addEventListener("abort", abort, { once: true });
  try {
    if (options.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const promise = invoke<UrAIUsage>("urai_chat", {
      request: {
        requestId,
        config: providerConfig(config, options.contextTokens),
        messages,
        instructions: options.instructions,
        context: options.context ?? EMPTY_CONTEXT,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
      },
    });
    const result = await promise;
    if (options.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    return result;
  } finally {
    unlisten();
    unlistenTool();
    options.signal?.removeEventListener("abort", abort);
  }
}
export async function nativeTransform(
  config: PromptConfig,
  operation: "translate" | "rephrase",
  elements: UrAIElement[],
  options: {
    language?: string;
    instructions?: string;
    context?: UrAIContext;
    signal?: AbortSignal;
  } = {},
): Promise<UrAIReplacement[]> {
  const requestId = crypto.randomUUID();
  if (options.signal?.aborted) throw new DOMException("Aborted", "AbortError");
  const abort = () => {
    void invoke("urai_cancel", { requestId });
  };
  options.signal?.addEventListener("abort", abort, { once: true });
  try {
    const result = await invoke<{ replacements: UrAIReplacement[] }>("urai_transform", {
      request: {
        requestId,
        config: providerConfig(config),
        operation,
        elements,
        language: options.language ?? "",
        instructions: options.instructions ?? "",
        context: options.context ?? EMPTY_CONTEXT,
        temperature: operation === "translate" ? config.translateTemp : config.rephraseTemp,
      },
    });
    if (options.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    return result.replacements;
  } finally {
    options.signal?.removeEventListener("abort", abort);
  }
}

export async function loadNativeSessions(key: string): Promise<unknown> {
  return isUrAIDesktop() ? invoke("urai_load_sessions", { key }) : null;
}
export async function saveNativeSessions(key: string, sessions: unknown): Promise<void> {
  if (isUrAIDesktop()) await invoke("urai_save_sessions", { key, sessions });
}

export async function contextFingerprint(config: PromptConfig, context: UrAIContext): Promise<string> {
  return textFingerprint(destination(config) + JSON.stringify(context));
}
export async function textFingerprint(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
