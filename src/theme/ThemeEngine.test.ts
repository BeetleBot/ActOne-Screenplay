import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  initThemeEngine,
  getThemeState,
  resetThemeEngine,
  setThemeState,
  onThemeChanged,
  getInitialThemeId,
  getInitialCustomThemes,
} from "./ThemeEngine";
import * as tauriCore from "@tauri-apps/api/core";
import * as tauriEvent from "@tauri-apps/api/event";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(),
}));

describe("ThemeEngine", () => {
  beforeEach(() => {
    localStorage.clear();
    resetThemeEngine();
    vi.clearAllMocks();
  });

  describe("getThemeState & getFallbackState", () => {
    it("returns default fallback state when not initialized", () => {
      const state = getThemeState();
      expect(state).toBeDefined();
      expect(state.themeId).toBe("adaptive");
      expect(state.appScale).toBe(100);
      expect(state.customThemes).toBe("[]");
    });
  });

  describe("getInitialThemeId", () => {
    it("returns adaptive by default if localStorage is empty", () => {
      expect(getInitialThemeId()).toBe("adaptive");
    });

    it("returns cached themeId from localStorage", () => {
      localStorage.setItem("actone-theme-id", "pitch-black");
      expect(getInitialThemeId()).toBe("pitch-black");
    });
  });

  describe("getInitialCustomThemes", () => {
    it("returns empty array by default", () => {
      expect(getInitialCustomThemes()).toEqual([]);
    });

    it("returns parsed custom themes from localStorage", () => {
      const mockCustom = [{ id: "custom-1", name: "Custom 1" }];
      localStorage.setItem("actone-custom-themes", JSON.stringify(mockCustom));
      expect(getInitialCustomThemes()).toEqual(mockCustom);
    });

    it("handles invalid JSON gracefully", () => {
      localStorage.setItem("actone-custom-themes", "invalid-json{");
      expect(getInitialCustomThemes()).toEqual([]);
    });
  });

  describe("initThemeEngine", () => {
    it("reads from localStorage cache initially", async () => {
      localStorage.setItem("actone-theme-id", "catppuccin-latte");
      localStorage.setItem("actone-app-scale", "125");
      localStorage.setItem("actone-custom-themes", JSON.stringify([{ id: "c1", name: "C1" }]));

      vi.mocked(tauriCore.invoke).mockRejectedValueOnce(new Error("No tauri"));

      const state = await initThemeEngine();
      expect(state.themeId).toBe("catppuccin-latte");
      expect(state.appScale).toBe(125);
      expect(state.customThemes).toContain("c1");
    });

    it("invokes get_theme_state from Tauri when available", async () => {
      vi.mocked(tauriCore.invoke).mockResolvedValueOnce({
        theme_id: "sunset",
        app_scale: 110,
        custom_themes: "[]",
      });

      const state = await initThemeEngine();
      expect(tauriCore.invoke).toHaveBeenCalledWith("get_theme_state");
      expect(state.themeId).toBe("sunset");
      expect(state.appScale).toBe(110);
      expect(localStorage.getItem("actone-theme-id")).toBe("sunset");
      expect(localStorage.getItem("actone-app-scale")).toBe("110");
    });

    it("returns existing currentState on second call without re-invoking", async () => {
      vi.mocked(tauriCore.invoke).mockResolvedValueOnce({
        theme_id: "rose",
        app_scale: 100,
        custom_themes: "[]",
      });

      const firstState = await initThemeEngine();
      const secondState = await initThemeEngine();
      expect(firstState).toBe(secondState);
      expect(tauriCore.invoke).toHaveBeenCalledTimes(1);
    });

    it("listens to theme:state-changed Tauri event", async () => {
      let eventCallback: (event: { payload: any }) => void = () => {};
      vi.mocked(tauriEvent.listen).mockImplementationOnce(async (eventName, cb) => {
        eventCallback = cb as any;
        return () => {};
      });

      vi.mocked(tauriCore.invoke).mockResolvedValueOnce({
        theme_id: "light",
        app_scale: 100,
        custom_themes: "[]",
      });

      await initThemeEngine();
      expect(tauriEvent.listen).toHaveBeenCalledWith("theme:state-changed", expect.any(Function));

      const listenerFn = vi.fn();
      onThemeChanged(listenerFn);

      // Simulate Tauri event
      eventCallback({
        payload: {
          theme_id: "dark",
          app_scale: 120,
          custom_themes: "[{\"id\":\"custom\"}]",
        },
      });

      expect(getThemeState().themeId).toBe("dark");
      expect(getThemeState().appScale).toBe(120);
      expect(localStorage.getItem("actone-theme-id")).toBe("dark");
      expect(listenerFn).toHaveBeenCalledWith(expect.objectContaining({ themeId: "dark", appScale: 120 }));
    });
  });

  describe("setThemeState", () => {
    it("updates local state and invokes set_theme_state", async () => {
      vi.mocked(tauriCore.invoke).mockResolvedValueOnce({
        theme_id: "light",
        app_scale: 100,
        custom_themes: "[]",
      });
      await initThemeEngine();

      vi.mocked(tauriCore.invoke).mockResolvedValueOnce(undefined);

      await setThemeState({ themeId: "mint", appScale: 105 });
      expect(tauriCore.invoke).toHaveBeenCalledWith("set_theme_state", {
        themeId: "mint",
        appScale: 105,
      });
      expect(localStorage.getItem("actone-theme-id")).toBe("mint");
      expect(localStorage.getItem("actone-app-scale")).toBe("105");
    });

    it("updates local state directly if Tauri invoke fails", async () => {
      vi.mocked(tauriCore.invoke).mockRejectedValueOnce(new Error("No tauri"));
      await initThemeEngine();

      vi.mocked(tauriCore.invoke).mockRejectedValueOnce(new Error("Failed invoke"));
      await setThemeState({ themeId: "forest", customThemes: "[{\"id\":\"1\"}]" });

      expect(getThemeState().themeId).toBe("forest");
      expect(getThemeState().customThemes).toBe("[{\"id\":\"1\"}]");
      expect(localStorage.getItem("actone-theme-id")).toBe("forest");
      expect(localStorage.getItem("actone-custom-themes")).toBe("[{\"id\":\"1\"}]");
    });
  });

  describe("onThemeChanged", () => {
    it("calls callback immediately with currentState if present", async () => {
      vi.mocked(tauriCore.invoke).mockResolvedValueOnce({
        theme_id: "dracula",
        app_scale: 100,
        custom_themes: "[]",
      });
      await initThemeEngine();

      const cb = vi.fn();
      const unsubscribe = onThemeChanged(cb);
      expect(cb).toHaveBeenCalledWith(expect.objectContaining({ themeId: "dracula" }));

      unsubscribe();
    });

    it("unsubscribes callback properly", async () => {
      vi.mocked(tauriCore.invoke).mockResolvedValueOnce({
        theme_id: "dracula",
        app_scale: 100,
        custom_themes: "[]",
      });
      await initThemeEngine();

      const cb = vi.fn();
      const unsubscribe = onThemeChanged(cb);
      cb.mockClear();

      unsubscribe();
      // Notify listeners again by re-init or set
      await setThemeState({ themeId: "mint" });
      // Since cb was unsubscribed, it shouldn't be called after unsubscription
      expect(cb).not.toHaveBeenCalled();
    });
  });
});
