import { useCallback, useRef } from "react";
import { logger } from "../utils/logger";

interface ModalWindowsHook {
  openSettingsWindow: (tab?: string) => void;
  openHelpWindow: () => void;
  openTagManagerWindow: () => void;
  openThemeManagerWindow: () => void;
  openXrayWindow: () => void;
  closeAllWindows: () => Promise<void>;
}

async function createTauriWindow(
  label: string,
  url: string,
  title: string,
  width: number,
  height: number,
  resizable: boolean,
  onClose: () => void,
): Promise<boolean> {
  const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
  if (!isTauri) {
    logger.warn("modalWindows", `createTauriWindow not supported on web: ${label}`);
    return false;
  }
  try {
    const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
    const webview = new WebviewWindow(label, {
      url,
      title,
      width,
      height,
      resizable,
      decorations: false,
    });
    webview.once("tauri://created", () => {
      logger.info("modalWindows", `Created window: ${label}`);
    });
    webview.once("tauri://error", (e) => {
      logger.error("modalWindows", `Error creating window: ${label}`, e);
      onClose();
    });
    webview.once("tauri://destroyed", () => {
      logger.info("modalWindows", `Destroyed window: ${label}`);
      onClose();
    });
    return true;
  } catch (e) {
    logger.error("modalWindows", "Failed to load Tauri WebviewWindow", e);
    onClose();
    return false;
  }
}

export function useModalWindows(): ModalWindowsHook {
  const windowsRef = useRef<Map<string, boolean>>(new Map());

  const openSettingsWindow = useCallback(async (tab?: string) => {
    if (windowsRef.current.get("settings")) return;
    windowsRef.current.set("settings", true);
    const path = tab ? `/?modal=settings&tab=${tab}` : "/?modal=settings";
    const ok = await createTauriWindow("settings", path, "ActOne – Settings", 420, 500, false, () => windowsRef.current.delete("settings"));
    if (!ok) {
      windowsRef.current.delete("settings");
    }
  }, []);

  const openHelpWindow = useCallback(async () => {
    if (windowsRef.current.get("help")) return;
    windowsRef.current.set("help", true);
    const ok = await createTauriWindow("help", "/?modal=help", "ActOne – Help", 900, 600, true, () => windowsRef.current.delete("help"));
    if (!ok) {
      windowsRef.current.delete("help");
    }
  }, []);

  const openTagManagerWindow = useCallback(async () => {
    if (windowsRef.current.get("tag-manager")) return;
    windowsRef.current.set("tag-manager", true);
    const ok = await createTauriWindow("tag-manager", "/?modal=tag-manager", "ActOne – Tag Manager", 1100, 700, true, () => windowsRef.current.delete("tag-manager"));
    if (!ok) {
      windowsRef.current.delete("tag-manager");
    }
  }, []);

  const openThemeManagerWindow = useCallback(async () => {
    if (windowsRef.current.get("theme-manager")) return;
    windowsRef.current.set("theme-manager", true);
    const ok = await createTauriWindow("theme-manager", "/?modal=theme-manager", "ActOne – Theme Manager", 700, 580, true, () => windowsRef.current.delete("theme-manager"));
    if (!ok) {
      windowsRef.current.delete("theme-manager");
    }
  }, []);

  const openXrayWindow = useCallback(async () => {
    if (windowsRef.current.get("xray")) return;
    windowsRef.current.set("xray", true);
    const ok = await createTauriWindow("xray", "/?modal=xray", "ActOne – X-Ray", 700, 580, true, () => windowsRef.current.delete("xray"));
    if (!ok) {
      windowsRef.current.delete("xray");
    }
  }, []);

  const closeAllWindows = useCallback(async () => {
    const labels = ["settings", "help", "tag-manager", "theme-manager", "xray"];
    for (const label of labels) {
      windowsRef.current.delete(label);
      try {
        const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
        const win = await WebviewWindow.getByLabel(label);
        if (win) await win.close();
      } catch (e) {
        logger.warn("modalWindows", `Failed to close ${label}:`, e);
      }
    }
  }, []);

  return { openSettingsWindow, openHelpWindow, openTagManagerWindow, openThemeManagerWindow, openXrayWindow, closeAllWindows };
}
