import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFontManager, FALLBACK_FONTS } from "./useFontManager";
import * as tauriCore from "@tauri-apps/api/core";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("useFontManager", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("initializes with fallback fonts and default selected font", () => {
    const { result } = renderHook(() => useFontManager("Courier Prime"));
    expect(result.current.selectedFont).toBe("Courier Prime");
    expect(result.current.fonts.length).toBeGreaterThanOrEqual(FALLBACK_FONTS.length);
    expect(result.current.filteredFonts).toEqual(result.current.fonts);
    expect(result.current.searchQuery).toBe("");
  });

  it("updates selected font", () => {
    const { result } = renderHook(() => useFontManager("Courier Prime"));
    act(() => {
      result.current.setSelectedFont("Inter");
    });
    expect(result.current.selectedFont).toBe("Inter");
  });

  it("filters fonts based on search query", () => {
    const { result } = renderHook(() => useFontManager());
    act(() => {
      result.current.setSearchQuery("courier");
    });

    expect(result.current.filteredFonts.length).toBeGreaterThan(0);
    expect(result.current.filteredFonts.every((f) => f.toLowerCase().includes("courier"))).toBe(true);

    act(() => {
      result.current.setSearchQuery("non-existent-font-12345");
    });
    expect(result.current.filteredFonts).toEqual([]);
  });

  it("checks font availability case-insensitively", () => {
    const { result } = renderHook(() => useFontManager());
    expect(result.current.isFontAvailable("courier prime")).toBe(true);
    expect(result.current.isFontAvailable("COURIER PRIME")).toBe(true);
    expect(result.current.isFontAvailable("Unknown Font XYZ")).toBe(false);
  });

  it("loads cached fonts from localStorage on initialization", () => {
    const cached = ["Custom Script Font", "Courier Prime"];
    localStorage.setItem("actone-system-fonts-cache", JSON.stringify(cached));

    const { result } = renderHook(() => useFontManager());
    expect(result.current.fonts).toContain("Custom Script Font");
  });

  it("refreshes fonts via Tauri backend and caches results", async () => {
    vi.mocked(tauriCore.invoke).mockResolvedValueOnce(["Helvetica Neue", "SF Pro Display"]);

    // Temporarily mock window.__TAURI_INTERNALS__
    (window as any).__TAURI_INTERNALS__ = {};

    const { result } = renderHook(() => useFontManager());

    await act(async () => {
      await result.current.refreshFonts();
    });

    expect(result.current.fonts).toContain("Helvetica Neue");
    expect(result.current.fonts).toContain("SF Pro Display");
    expect(result.current.isFontAvailable("Helvetica Neue")).toBe(true);

    const cached = JSON.parse(localStorage.getItem("actone-system-fonts-cache") || "[]");
    expect(cached).toContain("Helvetica Neue");

    delete (window as any).__TAURI_INTERNALS__;
  });

  it("handles font refresh error gracefully", async () => {
    (window as any).__TAURI_INTERNALS__ = {};
    vi.mocked(tauriCore.invoke).mockRejectedValueOnce(new Error("Permission denied"));

    const { result } = renderHook(() => useFontManager());

    await act(async () => {
      await result.current.refreshFonts();
    });

    expect(result.current.error).toBe("Permission denied");
    expect(result.current.isLoading).toBe(false);

    delete (window as any).__TAURI_INTERNALS__;
  });
});
