import { useCallback, useRef } from "react";
import { logger } from "../utils/logger";

interface ModalWindowsCallbacks {
  openSettingsDialog: () => void;
  openHelpDialog: () => void;
  openTagManagerDialog: () => void;
  openThemeManagerDialog: () => void;
}

interface ModalWindowsHook {
  openSettingsWindow: () => void;
  openHelpWindow: () => void;
  openTagManagerWindow: () => void;
  openThemeManagerWindow: () => void;
}

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

async function createTauriWindow(
  label: string,
  url: string,
  title: string,
  width: number,
  height: number,
  resizable: boolean,
  onDestroy: () => void,
): Promise<boolean> {
  try {
    const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
    const webview = new WebviewWindow(label, {
      url,
      title,
      width,
      height,
      decorations: false,
      resizable,
      center: true,
    });

    webview.once("tauri://destroyed", onDestroy);

    await Promise.race([
      new Promise<void>((resolve) => webview.once("tauri://created", () => resolve())),
      new Promise<void>((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
    ]);
    return true;
  } catch (e) {
    logger.error("modalWindows", `Failed to create ${label} window:`, e);
    return false;
  }
}

export function useModalWindows(callbacks: ModalWindowsCallbacks): ModalWindowsHook {
  const windowsRef = useRef<Map<string, boolean>>(new Map());

  const openSettingsWindow = useCallback(async () => {
    if (!isTauri) {
      callbacks.openSettingsDialog();
      return;
    }
    if (windowsRef.current.get("settings")) return;
    windowsRef.current.set("settings", true);
    const ok = await createTauriWindow("settings", "/?modal=settings", "ActOne – Settings", 420, 500, false, () => windowsRef.current.delete("settings"));
    if (!ok) {
      windowsRef.current.delete("settings");
      callbacks.openSettingsDialog();
    }
  }, [callbacks]);

  const openHelpWindow = useCallback(async () => {
    if (!isTauri) {
      callbacks.openHelpDialog();
      return;
    }
    if (windowsRef.current.get("help")) return;
    windowsRef.current.set("help", true);
    const ok = await createTauriWindow("help", "/?modal=help", "ActOne – Help", 900, 600, true, () => windowsRef.current.delete("help"));
    if (!ok) {
      windowsRef.current.delete("help");
      callbacks.openHelpDialog();
    }
  }, [callbacks]);

  const openTagManagerWindow = useCallback(async () => {
    if (!isTauri) {
      callbacks.openTagManagerDialog();
      return;
    }
    if (windowsRef.current.get("tag-manager")) return;
    windowsRef.current.set("tag-manager", true);
    const ok = await createTauriWindow("tag-manager", "/?modal=tag-manager", "ActOne – Tag Manager", 1100, 700, true, () => windowsRef.current.delete("tag-manager"));
    if (!ok) {
      windowsRef.current.delete("tag-manager");
      callbacks.openTagManagerDialog();
    }
  }, [callbacks]);

  const openThemeManagerWindow = useCallback(async () => {
    if (!isTauri) {
      callbacks.openThemeManagerDialog();
      return;
    }
    if (windowsRef.current.get("theme-manager")) return;
    windowsRef.current.set("theme-manager", true);
    const ok = await createTauriWindow("theme-manager", "/?modal=theme-manager", "ActOne – Theme Manager", 700, 580, true, () => windowsRef.current.delete("theme-manager"));
    if (!ok) {
      windowsRef.current.delete("theme-manager");
      callbacks.openThemeManagerDialog();
    }
  }, [callbacks]);

  return { openSettingsWindow, openHelpWindow, openTagManagerWindow, openThemeManagerWindow };
}
