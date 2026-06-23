import { describe, it, expect, vi, beforeEach } from "vitest";

describe("getTauriWindow", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns null when not in Tauri environment", async () => {
    (window as any).__TAURI_INTERNALS__ = undefined;
    const { getTauriWindow } = await import("./window");
    expect(getTauriWindow()).toBeNull();
  });

  it("returns a window object when Tauri APIs are available", async () => {
    const mockWindow = { label: "main" };
    vi.doMock("@tauri-apps/api/window", () => ({
      getCurrentWindow: () => mockWindow,
    }));
    (window as any).__TAURI_INTERNALS__ = {};
    const { getTauriWindow } = await import("./window");
    expect(getTauriWindow()).toBe(mockWindow);
  });

  it("returns null when getCurrentWindow throws", async () => {
    vi.doMock("@tauri-apps/api/window", () => ({
      getCurrentWindow: () => { throw new Error("not in tauri"); },
    }));
    (window as any).__TAURI_INTERNALS__ = {};
    const { getTauriWindow } = await import("./window");
    expect(getTauriWindow()).toBeNull();
  });
});
