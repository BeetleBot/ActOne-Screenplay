import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useFile } from "./FileContext";
import { STORAGE_KEYS } from "../constants";
import { logger } from "../utils/logger";

export interface SnapshotInfo {
  id: string;
  filename: string;
  snapshot_path: string;
  created_at: string;
  snapshot_type: string;
  comment: string;
  file_size: number;
  custom_tag: string;
}

export interface SnapshotSettings {
  enabled: boolean;
  location: "project" | "app_data" | "custom";
  custom_path: string;
  auto_enabled: boolean;
  auto_interval_minutes: number;
  on_save: boolean;
  max_retention: number;
}

function loadSettings(): SnapshotSettings {
  return {
    enabled: localStorage.getItem(STORAGE_KEYS.SNAPSHOTS_ENABLED) === "true",
    location: (localStorage.getItem(STORAGE_KEYS.SNAPSHOT_LOCATION) as SnapshotSettings["location"]) || "project",
    custom_path: localStorage.getItem(STORAGE_KEYS.SNAPSHOT_CUSTOM_PATH) || "",
    auto_enabled: localStorage.getItem(STORAGE_KEYS.SNAPSHOT_AUTO_ENABLED) === "true",
    auto_interval_minutes: parseInt(localStorage.getItem(STORAGE_KEYS.SNAPSHOT_AUTO_INTERVAL) || "15", 10),
    on_save: localStorage.getItem(STORAGE_KEYS.SNAPSHOT_ON_SAVE) === "true",
    max_retention: parseInt(localStorage.getItem(STORAGE_KEYS.SNAPSHOT_MAX_RETENTION) || "20", 10),
  };
}

function saveSettings(settings: SnapshotSettings) {
  localStorage.setItem(STORAGE_KEYS.SNAPSHOTS_ENABLED, String(settings.enabled));
  localStorage.setItem(STORAGE_KEYS.SNAPSHOT_LOCATION, settings.location);
  localStorage.setItem(STORAGE_KEYS.SNAPSHOT_CUSTOM_PATH, settings.custom_path);
  localStorage.setItem(STORAGE_KEYS.SNAPSHOT_AUTO_ENABLED, String(settings.auto_enabled));
  localStorage.setItem(STORAGE_KEYS.SNAPSHOT_AUTO_INTERVAL, String(settings.auto_interval_minutes));
  localStorage.setItem(STORAGE_KEYS.SNAPSHOT_ON_SAVE, String(settings.on_save));
  localStorage.setItem(STORAGE_KEYS.SNAPSHOT_MAX_RETENTION, String(settings.max_retention));

  const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
  if (isTauri) {
    invoke("set_app_prefs", {
      prefs: {
        [STORAGE_KEYS.SNAPSHOTS_ENABLED]: String(settings.enabled),
        [STORAGE_KEYS.SNAPSHOT_LOCATION]: settings.location,
        [STORAGE_KEYS.SNAPSHOT_CUSTOM_PATH]: settings.custom_path,
        [STORAGE_KEYS.SNAPSHOT_AUTO_ENABLED]: String(settings.auto_enabled),
        [STORAGE_KEYS.SNAPSHOT_AUTO_INTERVAL]: String(settings.auto_interval_minutes),
        [STORAGE_KEYS.SNAPSHOT_ON_SAVE]: String(settings.on_save),
        [STORAGE_KEYS.SNAPSHOT_MAX_RETENTION]: String(settings.max_retention),
      },
    }).catch((e) => logger.warn("snapshots", "Failed to sync settings", e));
  }
}

export interface SnapshotContextProps {
  snapshots: SnapshotInfo[];
  isPanelOpen: boolean;
  setPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  settings: SnapshotSettings;
  updateSettings: (partial: Partial<SnapshotSettings>) => void;
  createSnapshot: (comment?: string, type?: "manual" | "auto" | "on_save", customTag?: string) => Promise<void>;
  refreshSnapshots: () => Promise<void>;
  deleteSnapshot: (info: SnapshotInfo) => Promise<void>;
  restoreSnapshot: (info: SnapshotInfo) => Promise<void>;
  openSnapshotAsFile: (info: SnapshotInfo) => Promise<void>;
}

const SnapshotContext = createContext<SnapshotContextProps | undefined>(undefined);

export const useSnapshots = () => {
  const context = useContext(SnapshotContext);
  if (!context) throw new Error("useSnapshots must be used within a SnapshotProvider");
  return context;
};

export const SnapshotProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { filePath, saveStatus, openFilePath } = useFile();
  const [snapshots, setSnapshots] = useState<SnapshotInfo[]>([]);
  const [isPanelOpen, setPanelOpen] = useState(false);
  const [settings, setSettings] = useState<SnapshotSettings>(loadSettings);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevSaveStatusRef = useRef<"idle" | "saving" | "saved">("idle");

  const refreshSnapshots = useCallback(async () => {
    if (!settings.enabled || !filePath) {
      setSnapshots([]);
      return;
    }
    try {
      const list = await invoke<SnapshotInfo[]>("get_snapshots", { filePath });
      setSnapshots(list.reverse());
    } catch (e) {
      logger.warn("snapshots", "Failed to load snapshots", e);
    }
  }, [settings.enabled, filePath]);

  useEffect(() => {
    refreshSnapshots();
  }, [filePath, refreshSnapshots]);

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ key: string; value: string | boolean | number }>;
      const { key, value } = customEvent.detail;
      setSettings((prev) => {
        let updated = false;
        const next = { ...prev };
        if (key === STORAGE_KEYS.SNAPSHOTS_ENABLED) {
          next.enabled = value === "true" || value === true;
          updated = true;
        } else if (key === STORAGE_KEYS.SNAPSHOT_LOCATION) {
          next.location = value as any;
          updated = true;
        } else if (key === STORAGE_KEYS.SNAPSHOT_CUSTOM_PATH) {
          next.custom_path = value as string;
          updated = true;
        } else if (key === STORAGE_KEYS.SNAPSHOT_AUTO_ENABLED) {
          next.auto_enabled = value === "true" || value === true;
          updated = true;
        } else if (key === STORAGE_KEYS.SNAPSHOT_AUTO_INTERVAL) {
          next.auto_interval_minutes = typeof value === "number" ? value : parseInt(value as string, 10) || 15;
          updated = true;
        } else if (key === STORAGE_KEYS.SNAPSHOT_ON_SAVE) {
          next.on_save = value === "true" || value === true;
          updated = true;
        } else if (key === STORAGE_KEYS.SNAPSHOT_MAX_RETENTION) {
          next.max_retention = typeof value === "number" ? value : parseInt(value as string, 10) || 20;
          updated = true;
        }
        if (updated) {
          saveSettings(next);
          return next;
        }
        return prev;
      });
    };
    window.addEventListener("settings-changed", handler as EventListener);
    return () => window.removeEventListener("settings-changed", handler as EventListener);
  }, []);

  const createSnapshot = useCallback(async (comment?: string, type?: "manual" | "auto" | "on_save", customTag?: string) => {
    if (!filePath || !settings.enabled) return;

    // Optimistic update: instantly add temporary item to list
    const tempId = `temp-${Date.now()}`;
    const tempItem: SnapshotInfo = {
      id: tempId,
      filename: "",
      snapshot_path: "",
      created_at: new Date().toISOString(),
      snapshot_type: type || "manual",
      comment: comment || "",
      file_size: 0,
      custom_tag: customTag || "",
    };
    setSnapshots((prev) => [tempItem, ...prev]);

    try {
      await invoke("create_snapshot", {
        filePath,
        comment: comment || null,
        snapshotType: type || "manual",
        customTag: customTag || null,
      });
      await refreshSnapshots();
    } catch (e) {
      logger.warn("snapshots", "Failed to create snapshot", e);
      await refreshSnapshots(); // Revert to backend state on error
    }
  }, [filePath, settings.enabled, refreshSnapshots]);

  // On-save trigger: watch saveStatus transition "saving" -> "saved"
  useEffect(() => {
    if (prevSaveStatusRef.current === "saving" && saveStatus === "saved" && settings.enabled && settings.on_save && filePath) {
      invoke("create_snapshot", {
        filePath,
        comment: null,
        snapshotType: "on_save",
        customTag: null,
      }).then(() => refreshSnapshots()).catch((e) =>
        logger.warn("snapshots", "on-save snapshot failed", e)
      );
    }
    prevSaveStatusRef.current = saveStatus;
  }, [saveStatus, settings.enabled, settings.on_save, filePath, refreshSnapshots]);

  const deleteSnapshot = useCallback(async (info: SnapshotInfo) => {
    if (!filePath) return;

    // Optimistic update: instantly remove item from list
    setSnapshots((prev) => prev.filter((s) => s.id !== info.id));

    try {
      await invoke("delete_snapshot", { filePath, snapshotId: info.id });
      await refreshSnapshots();
    } catch (e) {
      logger.warn("snapshots", "Failed to delete snapshot", e);
      await refreshSnapshots(); // Revert to backend state on error
    }
  }, [filePath, refreshSnapshots]);

  const restoreSnapshot = useCallback(async (info: SnapshotInfo) => {
    if (!filePath) return;
    try {
      await invoke("restore_snapshot", { filePath, snapshotPath: info.snapshot_path });
    } catch (e) {
      logger.warn("snapshots", "Failed to restore snapshot", e);
    }
  }, [filePath]);

  const openSnapshotAsFile = useCallback(async (info: SnapshotInfo) => {
    try {
      await openFilePath(info.snapshot_path);
    } catch (e) {
      logger.warn("snapshots", "Failed to open snapshot as file", e);
    }
  }, [openFilePath]);

  // Auto-snapshot timer
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (settings.enabled && settings.auto_enabled && settings.auto_interval_minutes > 0) {
      const ms = settings.auto_interval_minutes * 60 * 1000;
      timerRef.current = setInterval(() => {
        createSnapshot(undefined, "auto");
      }, ms);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [settings.enabled, settings.auto_enabled, settings.auto_interval_minutes, createSnapshot]);

  const updateSettings = useCallback((partial: Partial<SnapshotSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      saveSettings(next);
      return next;
    });
  }, []);

  return (
    <SnapshotContext.Provider
      value={{
        snapshots,
        isPanelOpen,
        setPanelOpen,
        settings,
        updateSettings,
        createSnapshot,
        refreshSnapshots,
        deleteSnapshot,
        restoreSnapshot,
        openSnapshotAsFile,
      }}
    >
      {children}
    </SnapshotContext.Provider>
  );
};
