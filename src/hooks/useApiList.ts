import { useSyncExternalStore } from "react";
import { STORAGE_KEYS } from "../constants";
import type { ApiEntry } from "../constants";
import { notifyConfigChange } from "./usePromptConfig";

let cachedRaw: string | null = null;
let cachedApiList: ApiEntry[] = [];

function getApiList(): ApiEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROMPT_API_LIST);
    if (raw === cachedRaw) {
      return cachedApiList;
    }
    cachedRaw = raw;
    if (!raw) {
      cachedApiList = [];
      return cachedApiList;
    }
    const parsed = JSON.parse(raw);
    cachedApiList = Array.isArray(parsed) ? parsed : [];
    return cachedApiList;
  } catch {
    cachedApiList = [];
    return cachedApiList;
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
