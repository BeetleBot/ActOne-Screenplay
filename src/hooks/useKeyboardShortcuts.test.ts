import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";

describe("useKeyboardShortcuts", () => {
  function createActions() {
    return {
      newFile: vi.fn(),
      openFile: vi.fn(),
      saveFile: vi.fn(),
      saveFileAs: vi.fn(),
      togglePalette: vi.fn(),
      exportPDF: vi.fn(),
      toggleSidebar: vi.fn(),
      toggleZenMode: vi.fn(),
      getEditorView: vi.fn(() => null),
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      resetZoom: vi.fn(),
      interfaceScaleIn: vi.fn(),
      interfaceScaleOut: vi.fn(),
      resetInterfaceScale: vi.fn(),
      closeFile: vi.fn(),
      openSettings: vi.fn(),
      toggleSearch: vi.fn(),
      togglePrompt: vi.fn(),
    };
  }

  function fireKey(key: string, mods: { ctrl?: boolean; meta?: boolean; shift?: boolean; alt?: boolean } = {}) {
    const event = new KeyboardEvent("keydown", {
      key,
      ctrlKey: mods.ctrl || false,
      metaKey: mods.meta || false,
      shiftKey: mods.shift || false,
      altKey: mods.alt || false,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(event);
    return event;
  }

  it("calls newFile on Ctrl+N", () => {
    const actions = createActions();
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey("n", { ctrl: true });
    expect(actions.newFile).toHaveBeenCalled();
  });

  it("calls saveFile on Ctrl+S", () => {
    const actions = createActions();
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey("s", { ctrl: true });
    expect(actions.saveFile).toHaveBeenCalled();
  });

  it("calls saveFileAs on Ctrl+Shift+S", () => {
    const actions = createActions();
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey("s", { ctrl: true, shift: true });
    expect(actions.saveFileAs).toHaveBeenCalled();
  });

  it("calls openFile on Ctrl+O", () => {
    const actions = createActions();
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey("o", { ctrl: true });
    expect(actions.openFile).toHaveBeenCalled();
  });

  it("calls togglePalette on Ctrl+K", () => {
    const actions = createActions();
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey("k", { ctrl: true });
    expect(actions.togglePalette).toHaveBeenCalled();
  });

  it("calls openSettings on Ctrl+,", () => {
    const actions = createActions();
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey(",", { ctrl: true });
    expect(actions.openSettings).toHaveBeenCalled();
  });

  it("calls exportPDF on Ctrl+P", () => {
    const actions = createActions();
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey("p", { ctrl: true });
    expect(actions.exportPDF).toHaveBeenCalled();
  });

  it("calls toggleSearch on Ctrl+F", () => {
    const actions = createActions();
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey("f", { ctrl: true });
    expect(actions.toggleSearch).toHaveBeenCalled();
  });

  it("calls closeFile on Alt+Q", () => {
    const actions = createActions();
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey("q", { alt: true });
    expect(actions.closeFile).toHaveBeenCalled();
  });

  it("calls zoomIn on Ctrl+=", () => {
    const actions = createActions();
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey("=", { ctrl: true });
    expect(actions.zoomIn).toHaveBeenCalled();
  });

  it("calls zoomOut on Ctrl+-", () => {
    const actions = createActions();
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey("-", { ctrl: true });
    expect(actions.zoomOut).toHaveBeenCalled();
  });

  it("calls resetZoom on Ctrl+0", () => {
    const actions = createActions();
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey("0", { ctrl: true });
    expect(actions.resetZoom).toHaveBeenCalled();
  });

  it("calls toggleSidebar on Ctrl+\\", () => {
    const actions = createActions();
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey("\\", { ctrl: true });
    expect(actions.toggleSidebar).toHaveBeenCalled();
  });

  it("calls interfaceScaleIn on Ctrl+Alt+=", () => {
    const actions = createActions();
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey("=", { ctrl: true, alt: true });
    expect(actions.interfaceScaleIn).toHaveBeenCalled();
  });

  it("calls interfaceScaleOut on Ctrl+Alt+-", () => {
    const actions = createActions();
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey("-", { ctrl: true, alt: true });
    expect(actions.interfaceScaleOut).toHaveBeenCalled();
  });

  it("calls resetInterfaceScale on Ctrl+Alt+0", () => {
    const actions = createActions();
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey("0", { ctrl: true, alt: true });
    expect(actions.resetInterfaceScale).toHaveBeenCalled();
  });

  it("calls toggleZenMode on Ctrl+Alt+Enter", () => {
    const actions = createActions();
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey("Enter", { ctrl: true, alt: true });
    expect(actions.toggleZenMode).toHaveBeenCalled();
  });

  it("calls togglePrompt on Alt+M", () => {
    const actions = createActions();
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey("m", { alt: true });
    expect(actions.togglePrompt).toHaveBeenCalled();
  });

  it("does NOT call togglePrompt on Alt+P", () => {
    const actions = createActions();
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey("p", { alt: true });
    expect(actions.togglePrompt).not.toHaveBeenCalled();
  });

  it("does NOT call togglePrompt on Ctrl+P (should call exportPDF)", () => {
    const actions = createActions();
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey("p", { ctrl: true });
    expect(actions.togglePrompt).not.toHaveBeenCalled();
    expect(actions.exportPDF).toHaveBeenCalled();
  });

});
