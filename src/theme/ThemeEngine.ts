import type { CustomTheme } from "./themeUtils";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { DEFAULTS } from "../constants/defaults";
import { STORAGE_KEYS } from "../constants";

export interface ThemeState { themeId: string; appScale: number; customThemes: string }
interface NativeThemeState { theme_id: string; app_scale: number; custom_themes: string }
type ThemeChangeCallback = (state: ThemeState) => void;
let currentState: ThemeState | null = null;
let initializing: Promise<ThemeState> | null = null;
let unlisten: (() => void) | null = null;
let revision = 0;
const listeners = new Set<ThemeChangeCallback>();
const isNative = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
function fallback(): ThemeState { return { themeId: String(DEFAULTS[STORAGE_KEYS.THEME_ID]), appScale: Number(DEFAULTS[STORAGE_KEYS.APP_SCALE]), customThemes: "[]" }; }
function cached(): ThemeState {
  const state = fallback();
  try {
    state.themeId = localStorage.getItem("actone-theme-id") || state.themeId;
    const scale = Number(localStorage.getItem("actone-app-scale"));
    if (Number.isFinite(scale) && scale > 0) state.appScale = scale;
    state.customThemes = localStorage.getItem("actone-custom-themes") || "[]";
  } catch { /* Storage may be disabled. */ }
  return state;
}
function publish(state: ThemeState): void {
  const changed = !currentState || JSON.stringify(currentState) !== JSON.stringify(state);
  currentState = state;
  try {
    localStorage.setItem("actone-theme-id", state.themeId);
    localStorage.setItem("actone-app-scale", String(state.appScale));
    localStorage.setItem("actone-custom-themes", state.customThemes);
  } catch { /* The in-memory theme remains usable. */ }
  if (changed) listeners.forEach(callback => callback(state));
}
function fromNative(state: NativeThemeState): ThemeState { return { themeId: state.theme_id, appScale: state.app_scale, customThemes: state.custom_themes }; }

export function initThemeEngine(): Promise<ThemeState> {
  if (initializing) return initializing;
  if (currentState) return Promise.resolve(currentState);
  currentState = cached();
  const startedAt = revision;
  initializing = (async () => {
    if (isNative()) {
      try {
        unlisten = await listen<NativeThemeState>("theme:state-changed", event => { revision++; publish(fromNative(event.payload)); });
        const native = await invoke<NativeThemeState>("get_theme_state");
        // A theme chosen while startup is in flight always wins over stale startup data.
        if (startedAt === revision) publish(fromNative(native));
      } catch { /* Cached theme supports offline/browser startup. */ }
    }
    listeners.forEach(callback => callback(currentState!));
    return currentState!;
  })().finally(() => { initializing = null; });
  return initializing;
}
export function getThemeState(): ThemeState { return currentState ?? fallback(); }
export function resetThemeEngine(): void { unlisten?.(); unlisten = null; currentState = null; initializing = null; revision++; }

export async function setThemeState(partial: Partial<ThemeState>): Promise<void> {
  revision++;
  publish({ ...(currentState ?? cached()), ...partial });
  if (!isNative()) return;
  const payload: Record<string, unknown> = {};
  if (partial.themeId !== undefined) payload.themeId = partial.themeId;
  if (partial.appScale !== undefined) payload.appScale = partial.appScale;
  if (partial.customThemes !== undefined) payload.customThemes = partial.customThemes;
  try { await invoke("set_theme_state", payload); } catch { /* Keep the local selection available. */ }
}
export function onThemeChanged(callback: ThemeChangeCallback): () => void {
  listeners.add(callback);
  if (currentState) callback(currentState);
  return () => { listeners.delete(callback); };
}
export function getInitialThemeId(): string { return cached().themeId; }
export function getInitialCustomThemes(): CustomTheme[] {
  try { const parsed: unknown = JSON.parse(cached().customThemes); return Array.isArray(parsed) ? parsed as CustomTheme[] : []; } catch { return []; }
}
