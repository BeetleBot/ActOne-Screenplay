import { useSyncExternalStore } from "react";
import { STORAGE_KEYS } from "../constants";
import type { ApiEntry } from "../constants";
import { notifyConfigChange } from "./usePromptConfig";
import { decryptApiList } from "../utils/cryptoStorage";

let cachedRaw: string | null = null;
let cachedApiList: ApiEntry[] = [];
let isDecrypting = false;

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
    const parsed: ApiEntry[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      cachedApiList = [];
      return cachedApiList;
    }

    cachedApiList = parsed;

    if (!isDecrypting) {
      isDecrypting = true;
      decryptApiList(parsed).then((decrypted) => {
        cachedApiList = decrypted;
        isDecrypting = false;
        notifyApiListChangeOnly();
      }).catch(() => {
        isDecrypting = false;
      });
    }

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

function notifyApiListChangeOnly() {
  listeners.forEach((cb) => cb());
}

export function notifyApiListChange() {
  cachedRaw = null;
  listeners.forEach((cb) => cb());
  try {
    window.dispatchEvent(new Event("prompt-config-changed"));
  } catch {}
  notifyConfigChange();
}

export function useApiList(): ApiEntry[] {
  return useSyncExternalStore(subscribe, getApiList);
}
