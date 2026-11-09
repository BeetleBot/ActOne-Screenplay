import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useStoreUpdateCheck } from "./useStoreUpdateCheck";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockImplementation((cmd) => {
    if (cmd === "get_target_os") return Promise.resolve("windows");
    if (cmd === "check_for_store_update") return Promise.resolve({ update_available: true });
    return Promise.resolve(null);
  }),
}));

describe("useStoreUpdateCheck hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("initializes with checking false and no update available in browser mode", () => {
    const { result } = renderHook(() => useStoreUpdateCheck());
    expect(result.current.checking).toBe(false);
    expect(result.current.updateAvailable).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("respects debug_store_update override in localStorage", async () => {
    (window as any).__TAURI_INTERNALS__ = {};
    localStorage.setItem("debug_store_update", "true");

    const { result } = renderHook(() => useStoreUpdateCheck());

    await act(async () => {
      await result.current.checkForUpdates();
    });

    expect(result.current.updateAvailable).toBe(true);
    expect(result.current.checking).toBe(false);
    delete (window as any).__TAURI_INTERNALS__;
  });
});
