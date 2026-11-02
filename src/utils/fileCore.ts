import { invoke } from "@tauri-apps/api/core";
import type { ActoneBundle, ScriptInfo } from "./actone";
import type { StripFountainOptions } from "./fountainExport";

export function hasNativeFileCore(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function requireNativeFileCore(): void {
  if (!hasNativeFileCore()) throw new Error("ActOne's desktop file service is unavailable. Please restart the app and try again.");
}

export async function decodeProject(bytes: Uint8Array, bundleName?: string): Promise<ActoneBundle> {
  requireNativeFileCore();
  return invoke<ActoneBundle>("unpack_actone_bundle", { bytes: Array.from(bytes), bundleName });
}

export async function readProject(path: string, bundleName?: string): Promise<ActoneBundle> {
  requireNativeFileCore();
  return invoke<ActoneBundle>("read_actone_bundle", { path, bundleName });
}

export async function saveProject(path: string, scripts: ScriptInfo[], settings: Record<string, unknown>): Promise<void> {
  requireNativeFileCore();
  await invoke("save_actone_bundle", { path, scripts, settings });
}

export async function encodeProject(scripts: ScriptInfo[], settings: Record<string, unknown>): Promise<Uint8Array> {
  requireNativeFileCore();
  return new Uint8Array(await invoke<number[]>("pack_actone_bundle", { scripts, settings }));
}

export async function prepareFountainExport(rawText: string, options: StripFountainOptions): Promise<string> {
  requireNativeFileCore();
  return invoke<string>("prepare_fountain_export", { rawText, options });
}
