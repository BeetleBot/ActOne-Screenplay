import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { UIProvider } from "./UIContext";
import { FileProvider } from "./FileContext";
import { EditorProvider } from "./EditorContext";
import { CustomModalProvider } from "./CustomModalContext";
import { SnapshotProvider, useSnapshots } from "./SnapshotContext";
import { STORAGE_KEYS } from "../constants";

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

beforeEach(() => {
  localStorage.clear();
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
});
