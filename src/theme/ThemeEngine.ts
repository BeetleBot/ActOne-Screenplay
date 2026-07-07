import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export interface ThemeState {
  themeId: string;
  appScale: number;
  customThemes: string;
}

type ThemeChangeCallback = (state: ThemeState) => void;

let currentState: ThemeState | null = null;
let unlisten: (() => void) | null = null;
const listeners = new Set<ThemeChangeCallback>();

function getFallbackState(): ThemeState {
  return { themeId: "light", appScale: 100, customThemes: "[]" };
}

export async function initThemeEngine(): Promise<ThemeState> {
  if (currentState) return currentState;

  try {
    const result = await invoke<{ theme_id: string; app_scale: number; custom_themes: string }>("get_theme_state");
    currentState = {
      themeId: result.theme_id,
      appScale: result.app_scale,
      customThemes: result.custom_themes,
    };
    // Sync to localStorage immediately to prevent FOUC on future window loads
    try {
      localStorage.setItem("actone-theme-id", result.theme_id);
      localStorage.setItem("actone-custom-themes", result.custom_themes);
      localStorage.setItem("actone-app-scale", String(result.app_scale));
    } catch {}
  } catch {
    currentState = getFallbackState();
  }

  if (!unlisten) {
    try {
      unlisten = await listen<{ theme_id: string; app_scale: number; custom_themes: string }>("theme:state-changed", (event) => {
        currentState = {
          themeId: event.payload.theme_id,
          appScale: event.payload.app_scale,
          customThemes: event.payload.custom_themes,
        };
        try {
          localStorage.setItem("actone-theme-id", event.payload.theme_id);
          localStorage.setItem("actone-custom-themes", event.payload.custom_themes);
          localStorage.setItem("actone-app-scale", String(event.payload.app_scale));
        } catch {}
        listeners.forEach((cb) => cb(currentState!));
      });
    } catch {
      // not in Tauri
    }
  }

  return currentState;
}

export function getThemeState(): ThemeState {
  return currentState ?? getFallbackState();
}

/** Reset cached state — used in tests to avoid cross-test leakage */
export function resetThemeEngine(): void {
  currentState = null;
  unlisten = null;
}

export async function setThemeState(partial: { themeId?: string; appScale?: number; customThemes?: string }): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (partial.themeId !== undefined) {
    payload.themeId = partial.themeId;
    try { localStorage.setItem("actone-theme-id", partial.themeId); } catch {}
  }
  if (partial.appScale !== undefined) {
    payload.appScale = partial.appScale;
    try { localStorage.setItem("actone-app-scale", String(partial.appScale)); } catch {}
  }
  if (partial.customThemes !== undefined) {
    payload.customThemes = partial.customThemes;
    try { localStorage.setItem("actone-custom-themes", partial.customThemes); } catch {}
  }
  try {
    await invoke("set_theme_state", payload);
  } catch {
    // not in Tauri — update local state directly
    if (currentState) {
      if (partial.themeId !== undefined) currentState.themeId = partial.themeId;
      if (partial.appScale !== undefined) currentState.appScale = partial.appScale;
      if (partial.customThemes !== undefined) currentState.customThemes = partial.customThemes;
    }
  }
}

export function onThemeChanged(callback: ThemeChangeCallback): () => void {
  listeners.add(callback);
  if (currentState) callback(currentState);
  return () => { listeners.delete(callback); };
}

export function getInitialThemeId(): string {
  try {
    return localStorage.getItem("actone-theme-id") || "adaptive";
  } catch {
    return "adaptive";
  }
}

export function getInitialCustomThemes(): any[] {
  try {
    const raw = localStorage.getItem("actone-custom-themes");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
