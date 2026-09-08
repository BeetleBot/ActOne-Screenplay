import { useSyncExternalStore } from "react";
import { STORAGE_KEYS } from "../constants";
import type { ApiEntry } from "../constants";
import { notifyConfigChange } from "./usePromptConfig";

function getApiList(): ApiEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROMPT_API_LIST);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEYS.PROMPT_API_LIST) cb();
  };
  const onCustom = () => cb();
  window.addEventListener("storage", onStorage);
  window.addEventListener("prompt-config-changed" as unknown as string, onCustom);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("prompt-config-changed" as unknown as string, onCustom);
  };
}

export function notifyApiListChange() {
  listeners.forEach((cb) => cb());
  try {
    window.dispatchEvent(new Event("prompt-config-changed"));
  } catch {}
  notifyConfigChange();
}

export function useApiList(): ApiEntry[] {
  return useSyncExternalStore(subscribe, getApiList);
}
