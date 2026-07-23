import { useSyncExternalStore } from "react";
import { STORAGE_KEYS } from "../constants";
import { DEFAULTS } from "../constants/defaults";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { invoke } from "@tauri-apps/api/core";

function isTauriEnv(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function platformFetch(url: string, init?: RequestInit) {
  if (isTauriEnv()) {
    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(url);
    const headers = new Headers(init?.headers);
    if (isLocalhost) headers.set("Origin", "http://localhost");
    return tauriFetch(url, { ...init, headers });
  }
  return fetch(url, init);
}

export type PromptProvider = "none" | "ollama" | "openai-compatible";

export interface PromptConfig {
  provider: PromptProvider;
  model: string;
  systemPrompt: string;
  rephrasePrompt: string;
  chatTemp: number;
  rephraseTemp: number;
  translateLanguages: string[];
  translatePrompt: string;
  translateTemp: number;
  apiEndpoint: string;
  apiKey: string;
  apiModel: string;
  ollamaUrl: string;
  writeSceneInstructions: string;
  qInstructions: string;
  synonymsInstructions: string;
  lookupInstructions: string;
}

let cachedConfig: PromptConfig | null = null;

function getConfig(): PromptConfig {
  let newConfig: PromptConfig;
  try {
    const rawChat = localStorage.getItem(STORAGE_KEYS.PROMPT_CHAT_TEMP);
    const rawRep = localStorage.getItem(STORAGE_KEYS.PROMPT_REPHRASE_TEMP);
    const rawTransTemp = localStorage.getItem(STORAGE_KEYS.PROMPT_TRANSLATE_TEMP);
    let translateLangs: string[];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PROMPT_TRANSLATE_LANGUAGES);
      translateLangs = raw ? JSON.parse(raw) : [...(DEFAULTS[STORAGE_KEYS.PROMPT_TRANSLATE_LANGUAGES] as unknown as string[])];
    } catch { translateLangs = [...(DEFAULTS[STORAGE_KEYS.PROMPT_TRANSLATE_LANGUAGES] as unknown as string[])]; }
      newConfig = {
        provider: (localStorage.getItem(STORAGE_KEYS.PROMPT_PROVIDER) as PromptProvider | null) ?? String(DEFAULTS[STORAGE_KEYS.PROMPT_PROVIDER]) as PromptProvider,
        model: localStorage.getItem(STORAGE_KEYS.PROMPT_MODEL) ?? String(DEFAULTS[STORAGE_KEYS.PROMPT_MODEL]),
        systemPrompt: localStorage.getItem(STORAGE_KEYS.PROMPT_SYSTEM_PROMPT) ?? String(DEFAULTS[STORAGE_KEYS.PROMPT_SYSTEM_PROMPT]),
        rephrasePrompt: localStorage.getItem(STORAGE_KEYS.PROMPT_REPHRASE_PROMPT) ?? String(DEFAULTS[STORAGE_KEYS.PROMPT_REPHRASE_PROMPT]),
        chatTemp: rawChat !== null ? parseFloat(rawChat) : Number(DEFAULTS[STORAGE_KEYS.PROMPT_CHAT_TEMP]),
        rephraseTemp: rawRep !== null ? parseFloat(rawRep) : Number(DEFAULTS[STORAGE_KEYS.PROMPT_REPHRASE_TEMP]),
        translateLanguages: translateLangs,
        translatePrompt: localStorage.getItem(STORAGE_KEYS.PROMPT_TRANSLATE_PROMPT) ?? String(DEFAULTS[STORAGE_KEYS.PROMPT_TRANSLATE_PROMPT]),
        translateTemp: rawTransTemp !== null ? parseFloat(rawTransTemp) : Number(DEFAULTS[STORAGE_KEYS.PROMPT_TRANSLATE_TEMP]),
        apiEndpoint: localStorage.getItem(STORAGE_KEYS.PROMPT_API_ENDPOINT) ?? String(DEFAULTS[STORAGE_KEYS.PROMPT_API_ENDPOINT]),
        apiKey: localStorage.getItem(STORAGE_KEYS.PROMPT_API_KEY) ?? String(DEFAULTS[STORAGE_KEYS.PROMPT_API_KEY]),
        apiModel: localStorage.getItem(STORAGE_KEYS.PROMPT_API_MODEL) ?? String(DEFAULTS[STORAGE_KEYS.PROMPT_API_MODEL]),
        ollamaUrl: localStorage.getItem(STORAGE_KEYS.PROMPT_OLLAMA_URL) ?? String(DEFAULTS[STORAGE_KEYS.PROMPT_OLLAMA_URL]),
        writeSceneInstructions: localStorage.getItem(STORAGE_KEYS.PROMPT_WRITESCENE_INSTRUCTIONS) ?? String(DEFAULTS[STORAGE_KEYS.PROMPT_WRITESCENE_INSTRUCTIONS]),
        qInstructions: localStorage.getItem(STORAGE_KEYS.PROMPT_Q_INSTRUCTIONS) ?? String(DEFAULTS[STORAGE_KEYS.PROMPT_Q_INSTRUCTIONS]),
        synonymsInstructions: localStorage.getItem(STORAGE_KEYS.PROMPT_SYNONYMS_INSTRUCTIONS) ?? String(DEFAULTS[STORAGE_KEYS.PROMPT_SYNONYMS_INSTRUCTIONS]),
        lookupInstructions: localStorage.getItem(STORAGE_KEYS.PROMPT_LOOKUP_INSTRUCTIONS) ?? String(DEFAULTS[STORAGE_KEYS.PROMPT_LOOKUP_INSTRUCTIONS]),
      };
  } catch {
    newConfig = {
      provider: "none",
      model: String(DEFAULTS[STORAGE_KEYS.PROMPT_MODEL]),
      systemPrompt: String(DEFAULTS[STORAGE_KEYS.PROMPT_SYSTEM_PROMPT]),
      rephrasePrompt: String(DEFAULTS[STORAGE_KEYS.PROMPT_REPHRASE_PROMPT]),
      chatTemp: Number(DEFAULTS[STORAGE_KEYS.PROMPT_CHAT_TEMP]),
      rephraseTemp: Number(DEFAULTS[STORAGE_KEYS.PROMPT_REPHRASE_TEMP]),
      translateLanguages: [...(DEFAULTS[STORAGE_KEYS.PROMPT_TRANSLATE_LANGUAGES] as unknown as string[])],
      translatePrompt: String(DEFAULTS[STORAGE_KEYS.PROMPT_TRANSLATE_PROMPT]),
      translateTemp: Number(DEFAULTS[STORAGE_KEYS.PROMPT_TRANSLATE_TEMP]),
      apiEndpoint: "",
      apiKey: "",
      apiModel: "",
      ollamaUrl: "http://localhost:11434",
      writeSceneInstructions: "",
      qInstructions: "",
      synonymsInstructions: "",
      lookupInstructions: "",
    };
  }

  if (
    cachedConfig &&
    cachedConfig.provider === newConfig.provider &&
    cachedConfig.model === newConfig.model &&
    cachedConfig.systemPrompt === newConfig.systemPrompt &&
    cachedConfig.rephrasePrompt === newConfig.rephrasePrompt &&
    cachedConfig.chatTemp === newConfig.chatTemp &&
    cachedConfig.rephraseTemp === newConfig.rephraseTemp &&
    JSON.stringify(cachedConfig.translateLanguages) === JSON.stringify(newConfig.translateLanguages) &&
    cachedConfig.translatePrompt === newConfig.translatePrompt &&
    cachedConfig.translateTemp === newConfig.translateTemp &&
    cachedConfig.apiEndpoint === newConfig.apiEndpoint &&
    cachedConfig.apiKey === newConfig.apiKey &&
    cachedConfig.apiModel === newConfig.apiModel &&
    cachedConfig.ollamaUrl === newConfig.ollamaUrl &&
    cachedConfig.writeSceneInstructions === newConfig.writeSceneInstructions &&
    cachedConfig.qInstructions === newConfig.qInstructions &&
    cachedConfig.synonymsInstructions === newConfig.synonymsInstructions &&
    cachedConfig.lookupInstructions === newConfig.lookupInstructions
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
    rephrasePrompt: STORAGE_KEYS.PROMPT_REPHRASE_PROMPT,
    chatTemp: STORAGE_KEYS.PROMPT_CHAT_TEMP,
    rephraseTemp: STORAGE_KEYS.PROMPT_REPHRASE_TEMP,
    translateLanguages: STORAGE_KEYS.PROMPT_TRANSLATE_LANGUAGES,
    translatePrompt: STORAGE_KEYS.PROMPT_TRANSLATE_PROMPT,
    translateTemp: STORAGE_KEYS.PROMPT_TRANSLATE_TEMP,
    apiEndpoint: STORAGE_KEYS.PROMPT_API_ENDPOINT,
    apiKey: STORAGE_KEYS.PROMPT_API_KEY,
    apiModel: STORAGE_KEYS.PROMPT_API_MODEL,
    ollamaUrl: STORAGE_KEYS.PROMPT_OLLAMA_URL,
    writeSceneInstructions: STORAGE_KEYS.PROMPT_WRITESCENE_INSTRUCTIONS,
    qInstructions: STORAGE_KEYS.PROMPT_Q_INSTRUCTIONS,
    synonymsInstructions: STORAGE_KEYS.PROMPT_SYNONYMS_INSTRUCTIONS,
    lookupInstructions: STORAGE_KEYS.PROMPT_LOOKUP_INSTRUCTIONS,
  };
  try {
    const stored = key === "translateLanguages" ? JSON.stringify(value) : String(value);
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
