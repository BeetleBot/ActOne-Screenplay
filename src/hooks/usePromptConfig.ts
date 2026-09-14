import { useSyncExternalStore } from "react";
import { STORAGE_KEYS } from "../constants";
import { DEFAULTS } from "../constants/defaults";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { invoke } from "@tauri-apps/api/core";

function isTauriEnv(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function platformFetch(url: string, init?: RequestInit): Promise<Response> {
  if (isTauriEnv()) {
    try {
      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(url);
      const headers = new Headers(init?.headers);
      if (isLocalhost) headers.set("Origin", "http://localhost");
      return await tauriFetch(url, { ...init, headers });
    } catch (tauriErr) {
      if ((init?.signal as AbortSignal)?.aborted) {
        throw tauriErr;
      }
      try {
        return await fetch(url, init);
      } catch {
        throw tauriErr;
      }
    }
  }
  return fetch(url, init);
}

export type PromptProvider = "none" | "ollama" | "openai-compatible";

export interface PromptConfig {
  provider: PromptProvider;
  model: string;
  systemPrompt: string;
  rephrasePresets: { name: string; prompt: string }[];
  chatTemp: number;
  rephraseTemp: number;
  translateLanguages: string[];
  translatePrompt: string;
  translateTemp: number;
  apiEndpoint: string;
  apiKey: string;
  apiModel: string;
  ollamaUrl: string;
}

let cachedConfig: PromptConfig | null = null;

function getConfig(): PromptConfig {
  let newConfig: PromptConfig;
  try {
    const rawChat = localStorage.getItem(STORAGE_KEYS.PROMPT_CHAT_TEMP);
    const rawRep = localStorage.getItem(STORAGE_KEYS.PROMPT_REPHRASE_TEMP);
    const rawTransTemp = localStorage.getItem(STORAGE_KEYS.PROMPT_TRANSLATE_TEMP);
    let translateLangs: string[];
    let rephrasePresets: { name: string; prompt: string }[];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PROMPT_TRANSLATE_LANGUAGES);
      translateLangs = raw ? JSON.parse(raw) : [...(DEFAULTS[STORAGE_KEYS.PROMPT_TRANSLATE_LANGUAGES] as unknown as string[])];
    } catch { translateLangs = [...(DEFAULTS[STORAGE_KEYS.PROMPT_TRANSLATE_LANGUAGES] as unknown as string[])]; }
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PROMPT_REPHRASE_PRESETS);
      rephrasePresets = raw ? JSON.parse(raw) : JSON.parse(String(DEFAULTS[STORAGE_KEYS.PROMPT_REPHRASE_PRESETS]));
    } catch { rephrasePresets = []; }
    const standardPreset = { name: "Standard", prompt: "You are a professional screenwriting rephrasing tool. Rephrase the user's text. Never use dashes or hyphens (- or -- or —) unless part of a necessary compound word like 'co-working' or 'ten-year-old'. Use commas, full stops, or conjunctions (and, but, so) instead." };
    if (!rephrasePresets.some(p => p.name === "Standard")) {
      rephrasePresets = [standardPreset, ...rephrasePresets];
    }
      newConfig = {
        provider: (localStorage.getItem(STORAGE_KEYS.PROMPT_PROVIDER) as PromptProvider | null) ?? String(DEFAULTS[STORAGE_KEYS.PROMPT_PROVIDER]) as PromptProvider,
        model: localStorage.getItem(STORAGE_KEYS.PROMPT_MODEL) ?? String(DEFAULTS[STORAGE_KEYS.PROMPT_MODEL]),
        systemPrompt: localStorage.getItem(STORAGE_KEYS.PROMPT_SYSTEM_PROMPT) ?? String(DEFAULTS[STORAGE_KEYS.PROMPT_SYSTEM_PROMPT]),
        rephrasePresets,
        chatTemp: rawChat !== null ? parseFloat(rawChat) : Number(DEFAULTS[STORAGE_KEYS.PROMPT_CHAT_TEMP]),
        rephraseTemp: rawRep !== null ? parseFloat(rawRep) : Number(DEFAULTS[STORAGE_KEYS.PROMPT_REPHRASE_TEMP]),
        translateLanguages: translateLangs,
        translatePrompt: localStorage.getItem(STORAGE_KEYS.PROMPT_TRANSLATE_PROMPT) ?? String(DEFAULTS[STORAGE_KEYS.PROMPT_TRANSLATE_PROMPT]),
        translateTemp: rawTransTemp !== null ? parseFloat(rawTransTemp) : Number(DEFAULTS[STORAGE_KEYS.PROMPT_TRANSLATE_TEMP]),
        apiEndpoint: localStorage.getItem(STORAGE_KEYS.PROMPT_API_ENDPOINT) ?? String(DEFAULTS[STORAGE_KEYS.PROMPT_API_ENDPOINT]),
        apiKey: localStorage.getItem(STORAGE_KEYS.PROMPT_API_KEY) ?? String(DEFAULTS[STORAGE_KEYS.PROMPT_API_KEY]),
        apiModel: localStorage.getItem(STORAGE_KEYS.PROMPT_API_MODEL) ?? String(DEFAULTS[STORAGE_KEYS.PROMPT_API_MODEL]),
        ollamaUrl: localStorage.getItem(STORAGE_KEYS.PROMPT_OLLAMA_URL) ?? String(DEFAULTS[STORAGE_KEYS.PROMPT_OLLAMA_URL]),
      };
  } catch {
    newConfig = {
      provider: "none",
      model: String(DEFAULTS[STORAGE_KEYS.PROMPT_MODEL]),
      systemPrompt: String(DEFAULTS[STORAGE_KEYS.PROMPT_SYSTEM_PROMPT]),
      rephrasePresets: [],
      chatTemp: Number(DEFAULTS[STORAGE_KEYS.PROMPT_CHAT_TEMP]),
      rephraseTemp: Number(DEFAULTS[STORAGE_KEYS.PROMPT_REPHRASE_TEMP]),
      translateLanguages: [...(DEFAULTS[STORAGE_KEYS.PROMPT_TRANSLATE_LANGUAGES] as unknown as string[])],
      translatePrompt: String(DEFAULTS[STORAGE_KEYS.PROMPT_TRANSLATE_PROMPT]),
      translateTemp: Number(DEFAULTS[STORAGE_KEYS.PROMPT_TRANSLATE_TEMP]),
      apiEndpoint: "",
      apiKey: "",
      apiModel: "",
      ollamaUrl: "http://localhost:11434",
    };
  }

  if (
    cachedConfig &&
    cachedConfig.provider === newConfig.provider &&
    cachedConfig.model === newConfig.model &&
    cachedConfig.systemPrompt === newConfig.systemPrompt &&
    JSON.stringify(cachedConfig.rephrasePresets) === JSON.stringify(newConfig.rephrasePresets) &&
    cachedConfig.chatTemp === newConfig.chatTemp &&
    cachedConfig.rephraseTemp === newConfig.rephraseTemp &&
    JSON.stringify(cachedConfig.translateLanguages) === JSON.stringify(newConfig.translateLanguages) &&
    cachedConfig.translatePrompt === newConfig.translatePrompt &&
    cachedConfig.translateTemp === newConfig.translateTemp &&
    cachedConfig.apiEndpoint === newConfig.apiEndpoint &&
    cachedConfig.apiKey === newConfig.apiKey &&
    cachedConfig.apiModel === newConfig.apiModel &&
    cachedConfig.ollamaUrl === newConfig.ollamaUrl
  ) {
    return cachedConfig;
  }

  cachedConfig = newConfig;
  return newConfig;
}

const listeners = new Set<() => void>();

function subscribeToConfig(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function notifyConfigChange() {
  listeners.forEach((cb) => cb());
}

export function usePromptConfig(): PromptConfig {
  return useSyncExternalStore(subscribeToConfig, getConfig);
}

export function setPromptConfigField(key: keyof PromptConfig, value: string | number | string[]) {
  const storageMap: Record<keyof PromptConfig, string> = {
    provider: STORAGE_KEYS.PROMPT_PROVIDER,
    model: STORAGE_KEYS.PROMPT_MODEL,
    systemPrompt: STORAGE_KEYS.PROMPT_SYSTEM_PROMPT,
    rephrasePresets: STORAGE_KEYS.PROMPT_REPHRASE_PRESETS,
    chatTemp: STORAGE_KEYS.PROMPT_CHAT_TEMP,
    rephraseTemp: STORAGE_KEYS.PROMPT_REPHRASE_TEMP,
    translateLanguages: STORAGE_KEYS.PROMPT_TRANSLATE_LANGUAGES,
    translatePrompt: STORAGE_KEYS.PROMPT_TRANSLATE_PROMPT,
    translateTemp: STORAGE_KEYS.PROMPT_TRANSLATE_TEMP,
    apiEndpoint: STORAGE_KEYS.PROMPT_API_ENDPOINT,
    apiKey: STORAGE_KEYS.PROMPT_API_KEY,
    apiModel: STORAGE_KEYS.PROMPT_API_MODEL,
    ollamaUrl: STORAGE_KEYS.PROMPT_OLLAMA_URL,
  };
  try {
    const stored = key === "translateLanguages" || key === "rephrasePresets" ? JSON.stringify(value) : String(value);
    localStorage.setItem(storageMap[key], stored);
  } catch { /* ignore */ }
  notifyConfigChange();
}

export function getEndpointForProvider(provider: PromptProvider, config?: PromptConfig): string {
  if (provider === "ollama") {
    const base = config?.ollamaUrl || "http://localhost:11434";
    return `${base.replace(/\/+$/, "")}/v1`;
  }
  if (provider === "openai-compatible") {
    return config?.apiEndpoint || "";
  }
  return "";
}

export async function fetchModels(provider: PromptProvider): Promise<string[]> {
  try {
    if (provider === "ollama") {
      const base = localStorage.getItem(STORAGE_KEYS.PROMPT_OLLAMA_URL) || "http://localhost:11434";
      if (isTauriEnv()) {
        return await invoke<string[]>("ollama_list_models", { url: base });
      }
      const res = await platformFetch(`${base.replace(/\/+$/, "")}/api/tags`, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) return [];
      const data = await res.json() as { models?: { name: string }[] };
      return (data.models ?? []).map((m) => m.name.replace(/:latest$/, ""));
    }
    return [];
  } catch {
    return [];
  }
}

export async function checkProviderAvailability(): Promise<boolean> {
  const ollamaUrl = localStorage.getItem(STORAGE_KEYS.PROMPT_OLLAMA_URL) || "http://localhost:11434";
  try {
    if (isTauriEnv()) {
      return await invoke<boolean>("ollama_check", { url: ollamaUrl });
    }
    const res = await platformFetch(`${ollamaUrl.replace(/\/+$/, "")}/`, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

export function getActiveModelName(config: PromptConfig): string {
  if (config.provider === "none") return "Disabled";
  if (config.provider === "openai-compatible") {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PROMPT_API_LIST);
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          const entry = list.find((a: any) => a.model === config.apiModel);
          if (entry?.name) return entry.name;
        }
      }
    } catch { void 0; }
    return config.apiModel || "OpenAI API";
  }
  return config.model || "Ollama";
}
