import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  initPrefsEngine,
  getPrefs,
  setPrefs,
  onPrefsChanged,
  resetPrefsEngine,
} from "./AppPrefsEngine";
import * as tauriCore from "@tauri-apps/api/core";
import * as tauriEvent from "@tauri-apps/api/event";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(),
}));

describe("AppPrefsEngine", () => {
  let eventCallback: ((event: { payload: Record<string, string> }) => void) | null = null;
  const mockUnlisten = vi.fn();

  beforeEach(() => {
    resetPrefsEngine();
    vi.clearAllMocks();
    eventCallback = null;

    vi.mocked(tauriEvent.listen).mockImplementation(async (_eventName, cb) => {
      eventCallback = cb as unknown as (event: { payload: Record<string, string> }) => void;
      return mockUnlisten;
    });
  });

  afterEach(() => {
    resetPrefsEngine();
  });

  it("initializes and fetches preferences from Tauri invoke", async () => {
    vi.mocked(tauriCore.invoke).mockResolvedValueOnce({
      "actone-theme": "dark",
      "actone-font-size": "16",
    });

    const prefs = await initPrefsEngine();
    expect(prefs).toEqual({
      "actone-theme": "dark",
      "actone-font-size": "16",
    });
    expect(getPrefs()).toEqual(prefs);
    expect(tauriCore.invoke).toHaveBeenCalledWith("get_app_prefs");
  });

  it("handles invoke failure gracefully and returns empty prefs", async () => {
    vi.mocked(tauriCore.invoke).mockRejectedValueOnce(new Error("IPC failed"));

    const prefs = await initPrefsEngine();
    expect(prefs).toEqual({});
    expect(getPrefs()).toEqual({});
  });

  it("does not re-invoke get_app_prefs if currentPrefs are already populated", async () => {
    vi.mocked(tauriCore.invoke).mockResolvedValueOnce({ key: "val" });
    await initPrefsEngine();
    expect(tauriCore.invoke).toHaveBeenCalledTimes(1);

    const second = await initPrefsEngine();
    expect(second).toEqual({ key: "val" });
    expect(tauriCore.invoke).toHaveBeenCalledTimes(1);
  });

  it("notifies listeners on prefs changed via Tauri event", async () => {
    vi.mocked(tauriCore.invoke).mockResolvedValueOnce({});
    await initPrefsEngine();

    const listener = vi.fn();
    const unsub = onPrefsChanged(listener);

    expect(eventCallback).toBeTruthy();
    eventCallback!({ payload: { "actone-theme": "light" } });

    expect(listener).toHaveBeenCalledWith({ "actone-theme": "light" });
    expect(getPrefs()).toEqual({ "actone-theme": "light" });

    unsub();
    eventCallback!({ payload: { "actone-theme": "sepia" } });
    expect(listener).toHaveBeenCalledTimes(1); // not called again after unsubscribe
  });

  it("immediately notifies a new listener if currentPrefs is non-empty", async () => {
    vi.mocked(tauriCore.invoke).mockResolvedValueOnce({ cached: "true" });
    await initPrefsEngine();

    const listener = vi.fn();
    onPrefsChanged(listener);
    expect(listener).toHaveBeenCalledWith({ cached: "true" });
  });

  it("setPrefs delegates to invoke('set_app_prefs')", async () => {
    vi.mocked(tauriCore.invoke).mockResolvedValueOnce(undefined);
    await setPrefs({ "actone-theme": "high-contrast" });

    expect(tauriCore.invoke).toHaveBeenCalledWith("set_app_prefs", {
      prefs: { "actone-theme": "high-contrast" },
    });
  });

  it("setPrefs falls back to local state and notifies listeners if invoke fails", async () => {
    vi.mocked(tauriCore.invoke).mockRejectedValueOnce(new Error("No Tauri environment"));
    const listener = vi.fn();
    onPrefsChanged(listener);

    await setPrefs({ fallback: "applied" });
    expect(getPrefs().fallback).toBe("applied");
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ fallback: "applied" }));
  });

  it("resetPrefsEngine cleans up unlisten callback and clears current prefs", async () => {
    vi.mocked(tauriCore.invoke).mockResolvedValueOnce({ key: "v1" });
    await initPrefsEngine();
    expect(getPrefs()).toEqual({ key: "v1" });

    resetPrefsEngine();
    expect(mockUnlisten).toHaveBeenCalledTimes(1);
    expect(getPrefs()).toEqual({});
  });
});
