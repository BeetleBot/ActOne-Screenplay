import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { UIProvider } from "./UIContext";
import { FileProvider, useFile } from "./FileContext";
import { EditorProvider } from "./EditorContext";
import { CustomModalProvider } from "./CustomModalContext";
import { SnapshotProvider, useSnapshots } from "./SnapshotContext";
import { STORAGE_KEYS } from "../constants";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));

import { invoke } from "@tauri-apps/api/core";

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(UIProvider, null,
    React.createElement(CustomModalProvider, null,
      React.createElement(FileProvider, null,
        React.createElement(SnapshotProvider, null,
          React.createElement(EditorProvider, null, children)
        )
      )
    )
  );
}

function useCombinedHook() {
  const file = useFile();
  const snapshot = useSnapshots();
  return { file, snapshot };
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  vi.mocked(invoke).mockResolvedValue(undefined);
  (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
});

describe("SnapshotContext", () => {
  it("starts with empty snapshots and panel closed", () => {
    const { result } = renderHook(() => useSnapshots(), { wrapper });
    expect(result.current.snapshots).toEqual([]);
    expect(result.current.isPanelOpen).toBe(false);
    expect(result.current.settings.enabled).toBe(true);
  });

  it("defaults to project location", () => {
    const { result } = renderHook(() => useSnapshots(), { wrapper });
    expect(result.current.settings.location).toBe("project");
  });

  it("updates settings via updateSettings", () => {
    const { result } = renderHook(() => useSnapshots(), { wrapper });
    act(() => result.current.updateSettings({ enabled: true, auto_enabled: true, auto_interval_minutes: 30 }));
    expect(result.current.settings.enabled).toBe(true);
    expect(result.current.settings.auto_enabled).toBe(true);
    expect(result.current.settings.auto_interval_minutes).toBe(30);
  });

  it("persists settings to localStorage", () => {
    const { result } = renderHook(() => useSnapshots(), { wrapper });
    act(() => result.current.updateSettings({ enabled: true, location: "app_data" }));
    expect(localStorage.getItem(STORAGE_KEYS.SNAPSHOTS_ENABLED)).toBe("true");
    expect(localStorage.getItem(STORAGE_KEYS.SNAPSHOT_LOCATION)).toBe("app_data");
  });

  it("loads saved settings from localStorage", () => {
    localStorage.setItem(STORAGE_KEYS.SNAPSHOTS_ENABLED, "true");
    localStorage.setItem(STORAGE_KEYS.SNAPSHOT_LOCATION, "custom");
    localStorage.setItem(STORAGE_KEYS.SNAPSHOT_CUSTOM_PATH, "/my/snapshots");
    localStorage.setItem(STORAGE_KEYS.SNAPSHOT_AUTO_ENABLED, "true");
    localStorage.setItem(STORAGE_KEYS.SNAPSHOT_AUTO_INTERVAL, "10");
    localStorage.setItem(STORAGE_KEYS.SNAPSHOT_ON_SAVE, "true");

    const { result } = renderHook(() => useSnapshots(), { wrapper });
    expect(result.current.settings.enabled).toBe(true);
    expect(result.current.settings.location).toBe("custom");
    expect(result.current.settings.custom_path).toBe("/my/snapshots");
    expect(result.current.settings.auto_enabled).toBe(true);
    expect(result.current.settings.auto_interval_minutes).toBe(10);
    expect(result.current.settings.on_save).toBe(true);
  });

  it("toggles panel state", () => {
    const { result } = renderHook(() => useSnapshots(), { wrapper });
    expect(result.current.isPanelOpen).toBe(false);
    act(() => result.current.setPanelOpen(true));
    expect(result.current.isPanelOpen).toBe(true);
    act(() => result.current.setPanelOpen(false));
    expect(result.current.isPanelOpen).toBe(false);
  });

  it("handles settings with partial updates", () => {
    const { result } = renderHook(() => useSnapshots(), { wrapper });
    act(() => result.current.updateSettings({
      enabled: true,
      auto_enabled: true,
      on_save: true,
    }));
    expect(result.current.settings.enabled).toBe(true);
    expect(result.current.settings.auto_enabled).toBe(true);
    expect(result.current.settings.on_save).toBe(true);
    expect(result.current.settings.location).toBe("project");
    expect(result.current.settings.auto_interval_minutes).toBe(5);
  });

  it("captures unsaved live editor content when taking a snapshot (Auto-Save OFF)", async () => {
    vi.mocked(invoke).mockImplementation(async (cmd: string, args: any) => {
      if (cmd === "open_file_dialog") {
        return { path: "C:/scripts/test.fountain", content: "INT. ORIGINAL SAVED ON DISK - DAY\nOld disk text." };
      }
      if (cmd === "get_snapshots") {
        return [];
      }
      if (cmd === "create_snapshot") {
        return {
          id: "20261101_120000",
          filename: "20261101_120000.fountain",
          snapshot_path: "/project/.snapshots/20261101_120000.fountain",
          created_at: new Date().toISOString(),
          snapshot_type: args.snapshotType,
          comment: args.comment || "",
          file_size: 100,
          custom_tag: args.customTag || "",
        };
      }
      return undefined;
    });

    const { result } = renderHook(() => useCombinedHook(), { wrapper });

    // Open file from disk via openFile
    await act(async () => {
      await result.current.file.openFile();
    });

    expect(result.current.file.filePath).toBe("C:/scripts/test.fountain");
    expect(result.current.file.rawText).toContain("Old disk text");

    // Modify editor text without saving (Auto-save is OFF)
    await act(async () => {
      result.current.file.setRawText("INT. NEW UNSAVED SCENE - NIGHT\nBrand new unsaved words.");
    });

    expect(result.current.file.rawText).toContain("Brand new unsaved words");

    // Trigger snapshot creation
    await act(async () => {
      await result.current.snapshot.createSnapshot("Testing unsaved snapshot", "manual");
    });

    // Verify create_snapshot was called with the live unsaved text
    const createCall = vi.mocked(invoke).mock.calls.find(([cmd]) => cmd === "create_snapshot");
    expect(createCall).toBeDefined();
    const createArgs = createCall![1] as any;
    expect(createArgs.filePath).toBe("C:/scripts/test.fountain");
    expect(createArgs.comment).toBe("Testing unsaved snapshot");
    expect(createArgs.snapshotType).toBe("manual");
    expect(createArgs.content).toBe("INT. NEW UNSAVED SCENE - NIGHT\nBrand new unsaved words.");
    expect(createArgs.bytes).toBeNull();
  });

  it("captures live unsaved bundle bytes for .actone projects", async () => {
    // Open an actone file so FileContext sets active filePath properly
    const { packActoneBundle, unpackActoneBundle } = await import("../utils");
    const testBundle = packActoneBundle(
      [{ name: "Screenplay", fileName: "document.fountain", content: "INT. ORIGINAL - DAY", savedContent: "INT. ORIGINAL - DAY" }],
      {}
    );

    vi.mocked(invoke).mockImplementation(async (cmd: string, args: any) => {
      if (cmd === "read_actone_bundle") {
        return unpackActoneBundle(testBundle);
      }
      if (cmd === "get_snapshots") {
        return [];
      }
      if (cmd === "create_snapshot") {
        return {
          id: "20261101_120000",
          filename: "20261101_120000.actone",
          snapshot_path: "/project/.snapshots/20261101_120000.actone",
          created_at: new Date().toISOString(),
          snapshot_type: args.snapshotType,
          comment: args.comment || "",
          file_size: 200,
          custom_tag: args.customTag || "",
        };
      }
      return undefined;
    });

    const { result } = renderHook(() => useCombinedHook(), { wrapper });

    await act(async () => {
      await result.current.file.openFilePath("C:/projects/MyActOneProject.actone");
    });

    expect(result.current.file.filePath).toBe("C:/projects/MyActOneProject.actone");

    // Update with unsaved edits
    await act(async () => {
      result.current.file.setRawText("INT. BUNDLE - NIGHT\nUnsaved bundle modifications.");
    });

    // Create auto snapshot
    await act(async () => {
      await result.current.snapshot.createSnapshot(undefined, "auto");
    });

    const createCall = vi.mocked(invoke).mock.calls.find(([cmd]) => cmd === "create_snapshot");
    expect(createCall).toBeDefined();
    const createArgs = createCall![1] as any;
    expect(createArgs.filePath).toBe("C:/projects/MyActOneProject.actone");
    expect(createArgs.snapshotType).toBe("auto");
    expect(createArgs.bytes).toBeNull();
    expect(createArgs.project.scripts[0].content).toBe("INT. BUNDLE - NIGHT\nUnsaved bundle modifications.");
    expect(createArgs.project.settings).toBeDefined();
    expect(createArgs.content).toBeNull();
  });
});
