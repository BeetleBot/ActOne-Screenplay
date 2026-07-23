import { useCallback, useRef } from "react";
import { logger } from "../utils/logger";

interface ModalWindowsHook {
  openSettingsWindow: (tab?: string) => void;
  openHelpWindow: (articleId?: string) => void;
  openTagManagerWindow: (maximize?: boolean) => void;
  openThemeManagerWindow: () => void;
  openXrayWindow: () => void;
  openTutorialsWindow: () => void;
  closeAllWindows: () => Promise<void>;
}

function resolveUrl(path: string): string {
  const origin = window.location.origin;
  if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
    return `${origin}${path}`;
  }
  return path;
}

async function createTauriWindow(
  label: string,
  url: string,
  title: string,
  width: number,
  height: number,
  resizable: boolean,
  onClose: () => void,
  maximize = false,
): Promise<boolean> {
  const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
  if (!isTauri) {
    logger.warn("modalWindows", `createTauriWindow not supported on web: ${label}`);
    return false;
  }
  try {
    const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
    const webview = new WebviewWindow(label, {
      url: resolveUrl(url),
      title,
      width,
      height,
      resizable,
      decorations: false,
    });
    webview.once("tauri://created", () => {
      logger.info("modalWindows", `Created window: ${label}`);
      if (maximize) {
        webview.maximize().catch(() => {});
      }
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
    const ok = await createTauriWindow("settings", path, "ActOne – Settings", 500, 600, false, () => windowsRef.current.delete("settings"));
    if (!ok) {
      windowsRef.current.delete("settings");
    }
  }, []);

  const openHelpWindow = useCallback(async (articleId?: string) => {
    if (windowsRef.current.get("help")) return;
    windowsRef.current.set("help", true);
    const path = articleId ? `/?modal=help&article=${articleId}` : "/?modal=help";
    const ok = await createTauriWindow("help", path, "ActOne – Help", 900, 600, true, () => windowsRef.current.delete("help"));
    if (!ok) {
      windowsRef.current.delete("help");
    }
  }, []);

  const openTagManagerWindow = useCallback(async (maximize?: boolean) => {
    if (windowsRef.current.get("tag-manager")) return;
    windowsRef.current.set("tag-manager", true);
    const ok = await createTauriWindow("tag-manager", "/?modal=tag-manager", "ActOne – Tag Manager", 1100, 700, true, () => windowsRef.current.delete("tag-manager"), maximize);
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

  const openTutorialsWindow = useCallback(async () => {
    if (windowsRef.current.get("tutorials")) return;
    windowsRef.current.set("tutorials", true);
    const ok = await createTauriWindow("tutorials", "/?modal=tutorials", "ActOne – Tutorials", 500, 400, false, () => windowsRef.current.delete("tutorials"));
    if (!ok) {
      windowsRef.current.delete("tutorials");
    }
  }, []);

  const closeAllWindows = useCallback(async () => {
    const labels = ["settings", "help", "tag-manager", "theme-manager", "xray", "tutorials"];
    const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
    for (const label of labels) {
      windowsRef.current.delete(label);
      try {
        const win = await WebviewWindow.getByLabel(label);
        if (win) {
          win.close().catch((e: unknown) => {
            logger.warn("modalWindows", `Failed to close ${label}:`, e);
          });
        }
      } catch (e) {
        logger.warn("modalWindows", `Failed to get window ${label}:`, e);
      }
    }
  }, []);

  return { openSettingsWindow, openHelpWindow, openTagManagerWindow, openThemeManagerWindow, openXrayWindow, openTutorialsWindow, closeAllWindows };
}
