import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { UIProvider, useUI } from "./UIContext";

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(UIProvider, null, children);
}

describe("UIContext", () => {
  beforeEach(() => {
    localStorage.clear();
    document.fullscreenElement = null;
  });

  it("provides default values", () => {
    const { result } = renderHook(() => useUI(), { wrapper });
    expect(result.current.fontFamily).toBe("courier-prime-sans");
    expect(result.current.paperSize).toBe("a4");
    expect(result.current.isZenMode).toBe(false);
    expect(result.current.typewriterMode).toBe(true);
    expect(result.current.activeTab).toBe("outline");
    expect(result.current.zoomLevel).toBe(100);
    expect(result.current.appScale).toBe(100);
    expect(result.current.autocompleteEnabled).toBe(true);
    expect(result.current.smartQuotesEnabled).toBe(false);
    expect(result.current.matchParenthesesEnabled).toBe(true);

    expect(result.current.autoSaveEnabled).toBe(true);
    expect(result.current.autoSaveInterval).toBe(300000);
    expect(result.current.activeRightPane).toBe(null);
    expect(result.current.rightPaneWidth).toBe(360);
  });

  it("sets font family", () => {
    const { result } = renderHook(() => useUI(), { wrapper });
    act(() => result.current.setFontFamily("courier-prime"));
    expect(result.current.fontFamily).toBe("courier-prime");
    expect(localStorage.getItem("actone-font-family")).toBe("courier-prime");
  });

  it("sets paper size", () => {
    const { result } = renderHook(() => useUI(), { wrapper });
    act(() => result.current.setPaperSize("letter"));
    expect(result.current.paperSize).toBe("letter");
    expect(localStorage.getItem("actone-paper-size")).toBe("letter");
  });

  it("toggles typewriter mode", () => {
    const { result } = renderHook(() => useUI(), { wrapper });
    act(() => result.current.setTypewriterMode(true));
    expect(result.current.typewriterMode).toBe(true);
    expect(localStorage.getItem("actone-typewriter-mode")).toBe("true");
  });

  it("sets zoom level clamped between 50-400", () => {
    const { result } = renderHook(() => useUI(), { wrapper });
    act(() => result.current.setZoomLevel(25));
    expect(result.current.zoomLevel).toBe(50);
    act(() => result.current.setZoomLevel(450));
    expect(result.current.zoomLevel).toBe(400);
    act(() => result.current.setZoomLevel(150));
    expect(result.current.zoomLevel).toBe(150);
  });

  it("sets app scale clamped between 50-300", () => {
    const { result } = renderHook(() => useUI(), { wrapper });
    act(() => result.current.setAppScale(25));
    expect(result.current.appScale).toBe(50);
    act(() => result.current.setAppScale(350));
    expect(result.current.appScale).toBe(300);
  });

  it("toggles settings and persists them", () => {
    const { result } = renderHook(() => useUI(), { wrapper });
    act(() => result.current.setAutocompleteEnabled(false));
    expect(result.current.autocompleteEnabled).toBe(false);
    expect(localStorage.getItem("actone-autocomplete-enabled")).toBe("false");

    act(() => result.current.setSmartQuotesEnabled(false));
    expect(result.current.smartQuotesEnabled).toBe(false);



    act(() => result.current.setAutoSaveInterval(120000));
    expect(result.current.autoSaveInterval).toBe(120000);
  });

  it("manages right pane state", () => {
    const { result } = renderHook(() => useUI(), { wrapper });
    act(() => result.current.setActiveRightPane("search"));
    expect(result.current.activeRightPane).toBe("search");
    act(() => result.current.setActiveRightPane(null));
    expect(result.current.activeRightPane).toBe(null);
  });

  it("clamps rightPaneWidth between 240 and 700", () => {
    const { result } = renderHook(() => useUI(), { wrapper });
    act(() => result.current.setRightPaneWidth(100));
    expect(result.current.rightPaneWidth).toBe(240);
    act(() => result.current.setRightPaneWidth(1000));
    expect(result.current.rightPaneWidth).toBe(700);
  });

  it("cancelTranslation marks state cancelled and aborts the registered controller", () => {
    const { result } = renderHook(() => useUI(), { wrapper });

    const controller = new AbortController();
    const abortSpy = vi.fn();
    controller.abort = abortSpy;

    act(() => {
      result.current.registerTranslationAbort(controller);
      result.current.cancelTranslation();
    });

    expect(result.current.translationState).toBe("cancelled");
    expect(abortSpy).toHaveBeenCalledTimes(1);
  });

  it("cancelTranslation does not throw when no controller is registered", () => {
    const { result } = renderHook(() => useUI(), { wrapper });

    act(() => {
      result.current.cancelTranslation();
    });

    expect(result.current.translationState).toBe("cancelled");
  });

  it("sets and persists sidebar width clamped between 180 and 800", () => {
    const { result } = renderHook(() => useUI(), { wrapper });
    expect(result.current.sidebarWidth).toBe(260);

    act(() => result.current.setSidebarWidth(320));
    expect(result.current.sidebarWidth).toBe(320);
    expect(localStorage.getItem("actone-sidebar-width")).toBe("320");

    act(() => result.current.setSidebarWidth(100));
    expect(result.current.sidebarWidth).toBe(180);

    act(() => result.current.setSidebarWidth(1200));
    expect(result.current.sidebarWidth).toBe(800);
  });
});

