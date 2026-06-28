import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

type PrefsChangeCallback = (prefs: Record<string, string>) => void;

let currentPrefs: Record<string, string> = {};
let unlisten: (() => void) | null = null;
const listeners = new Set<PrefsChangeCallback>();

export async function initPrefsEngine(): Promise<Record<string, string>> {
  if (Object.keys(currentPrefs).length > 0) return currentPrefs;

  try {
    const result = await invoke<Record<string, string>>("get_app_prefs");
    currentPrefs = result;
  } catch {
    currentPrefs = {};
  }

  if (!unlisten) {
    try {
      unlisten = await listen<Record<string, string>>("app-prefs:changed", (event) => {
        currentPrefs = event.payload;
        listeners.forEach((cb) => cb(currentPrefs));
      });
    } catch {
      // not in Tauri
    }
  }

  return currentPrefs;
}

export function getPrefs(): Record<string, string> {
  return currentPrefs ?? {};
}

export function resetPrefsEngine(): void {
  currentPrefs = {};
  unlisten = null;
}

export async function setPrefs(prefs: Record<string, string>): Promise<void> {
  try {
    await invoke("set_app_prefs", { prefs });
  } catch {
    Object.assign(currentPrefs, prefs);
  }
}

export function onPrefsChanged(callback: PrefsChangeCallback): () => void {
  listeners.add(callback);
  if (Object.keys(currentPrefs).length > 0) callback(currentPrefs);
  return () => { listeners.delete(callback); };
}
