import { useState, useEffect, useCallback } from "react";

const isTauri =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

let cachedOs: string | null = null;

async function getOs(): Promise<string> {
  if (cachedOs) return cachedOs;
  if (!isTauri) {
    cachedOs = "browser";
    return cachedOs;
  }
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    cachedOs = await invoke<string>("get_target_os");
  } catch {
    cachedOs = "unknown";
  }
  return cachedOs;
}

export interface StoreUpdateState {
  updateAvailable: boolean;
  checking: boolean;
  error: string | null;
}

export function useStoreUpdateCheck() {
  const [state, setState] = useState<StoreUpdateState>({
    updateAvailable: false,
    checking: false,
    error: null,
  });
  const [os, setOs] = useState<string | null>(null);

  useEffect(() => {
    getOs().then(setOs);
  }, []);

  const isLinux = os === "linux";

  const checkForUpdates = useCallback(async () => {
    if (!isTauri || isLinux) return;
    setState((prev) => ({ ...prev, checking: true, error: null }));
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const result = await invoke<{ update_available: boolean }>(
        "check_for_store_update"
      );
      const next =
        typeof window !== "undefined" &&
        localStorage.getItem("debug_store_update") === "true"
          ? true
          : result.update_available;
      setState({
        updateAvailable: next,
        checking: false,
        error: null,
      });
    } catch (e) {
      setState({ updateAvailable: false, checking: false, error: String(e) });
    }
  }, [isLinux]);

  const installUpdate = useCallback(async () => {
    if (isLinux) return;
    if (!isTauri) {
      window.open("https://apps.microsoft.com/detail/9PJMKR0937KK", "_blank");
      return;
    }
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("install_store_update");
    } catch (e) {
      console.warn("Tauri Store installer failed, falling back to browser:", e);
      window.open("https://apps.microsoft.com/detail/9PJMKR0937KK", "_blank");
    }
  }, [isLinux]);

  useEffect(() => {
    if (os && !isLinux) {
      checkForUpdates();
    }
  }, [os, isLinux, checkForUpdates]);

  return {
    ...state,
    updateAvailable: state.updateAvailable && !isLinux,
    checkForUpdates,
    installUpdate,
    isLinux,
  };
}
