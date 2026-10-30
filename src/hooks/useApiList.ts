import { useSyncExternalStore } from "react";
import { STORAGE_KEYS } from "../constants";
import type { ApiEntry } from "../constants";
import { notifyConfigChange } from "./usePromptConfig";
import { decryptApiList, encryptApiList } from "../utils/cryptoStorage";

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
    const parsed: ApiEntry[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      cachedApiList = [];
      return cachedApiList;
    }

    cachedApiList = parsed.map((entry) => ({
      ...entry,
      apiKey: entry.apiKey?.startsWith("secure:v1:") || entry.apiKey?.startsWith("enc:v1:") ? "" : entry.apiKey,
    }));

    {
      decryptApiList(parsed)
        .then((decrypted) => {
          if (cachedRaw !== raw) return;
          cachedApiList = decrypted;
          notifyApiListChangeOnly();
          if (
            typeof window !== "undefined" &&
            "__TAURI_INTERNALS__" in window &&
            parsed.some((e) => e.apiKey && !e.apiKey.startsWith("secure:v1:"))
          ) {
            void encryptApiList(decrypted)
              .then((secured) => {
                if (localStorage.getItem(STORAGE_KEYS.PROMPT_API_LIST) === raw) {
                  const migrated = JSON.stringify(secured);
                  localStorage.setItem(STORAGE_KEYS.PROMPT_API_LIST, migrated);
                  cachedRaw = migrated;
                }
              })
              .catch(() => {
                /* Retain recoverable original credentials when the native store is locked. */
              });
          }
        })
        .catch(() => {
          /* Show entries without unavailable credentials; keep saved references intact. */
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
