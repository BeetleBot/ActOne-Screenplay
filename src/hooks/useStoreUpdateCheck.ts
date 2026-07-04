import { useState, useEffect, useCallback } from "react";

const isTauri =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export interface StoreUpdateState {
  updateAvailable: boolean;
  checking: boolean;
  error: string | null;
}

export function useStoreUpdateCheck() {
  const debugOverride =
    typeof window !== "undefined" &&
    localStorage.getItem("debug_store_update") === "true";
  const [state, setState] = useState<StoreUpdateState>({
    updateAvailable: debugOverride,
    checking: false,
    error: null,
  });

  const checkForUpdates = useCallback(async () => {
    if (!isTauri) return;
    setState((prev) => ({ ...prev, checking: true, error: null }));
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const result = await invoke<{ update_available: boolean }>(
        "check_for_store_update"
      );
      setState({
        updateAvailable: result.update_available,
        checking: false,
        error: null,
      });
    } catch (e) {
      setState({ updateAvailable: false, checking: false, error: String(e) });
    }
  }, []);

  const installUpdate = useCallback(async () => {
    if (!isTauri) return;
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("install_store_update");
    } catch (e) {
      console.error("Failed to install store update:", e);
    }
  }, []);

  useEffect(() => {
    checkForUpdates();
  }, [checkForUpdates]);

  return { ...state, checkForUpdates, installUpdate };
}
