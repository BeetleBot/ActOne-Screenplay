import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useModals } from "./useModals";

describe("useModals", () => {
  it("starts with all modals closed", () => {
    const { result } = renderHook(() => useModals());
    expect(result.current.isPaletteOpen).toBe(false);
    expect(result.current.showExportModal).toBe(false);
    expect(result.current.showStructureModal).toBe(false);
    expect(result.current.showTitlePageModal).toBe(false);
    expect(result.current.isModalActive).toBe(false);
  });

  it("toggles palette", () => {
    const { result } = renderHook(() => useModals());
    act(() => result.current.togglePalette());
    expect(result.current.isPaletteOpen).toBe(true);
    act(() => result.current.togglePalette());
    expect(result.current.isPaletteOpen).toBe(false);
  });

  it("isModalActive is true when any modal is open", () => {
    const { result } = renderHook(() => useModals());
    expect(result.current.isModalActive).toBe(false);
    act(() => result.current.setShowExportModal(true));
    expect(result.current.isModalActive).toBe(true);
  });

  it("sets each modal open/close correctly", () => {
    const { result } = renderHook(() => useModals());
    act(() => result.current.setShowExportModal(true));
    expect(result.current.showExportModal).toBe(true);
    act(() => result.current.setShowExportModal(false));
    expect(result.current.showExportModal).toBe(false);
  });
});
