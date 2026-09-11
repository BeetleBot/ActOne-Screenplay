import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useNativeAppBehavior } from "./useNativeAppBehavior";

describe("useNativeAppBehavior", () => {
  it("prevents default context menu on non-editable areas", () => {
    renderHook(() => useNativeAppBehavior());
    const event = new MouseEvent("contextmenu", { cancelable: true });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");
    document.dispatchEvent(event);
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it("prevents F5 key", () => {
    renderHook(() => useNativeAppBehavior());
    const event = new KeyboardEvent("keydown", { key: "F5", cancelable: true, bubbles: true });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");
    window.dispatchEvent(event);
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it("prevents Ctrl+R", () => {
    renderHook(() => useNativeAppBehavior());
    const event = new KeyboardEvent("keydown", { key: "r", ctrlKey: true, cancelable: true, bubbles: true });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");
    window.dispatchEvent(event);
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it("prevents Ctrl+Wheel zoom", () => {
    renderHook(() => useNativeAppBehavior());
    const event = new WheelEvent("wheel", { ctrlKey: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");
    window.dispatchEvent(event);
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it("prevents browser navigation on window drop (external file drops)", () => {
    renderHook(() => useNativeAppBehavior());
    const drop = new MouseEvent("drop", { cancelable: true });
    const preventSpy = vi.spyOn(drop, "preventDefault");
    window.dispatchEvent(drop);
    expect(preventSpy).toHaveBeenCalled();
  });

  it("handles Tauri drag drop events for accepted extensions with position", async () => {
    let capturedCb: ((event: { payload: any }) => void) | undefined;
    vi.doMock("@tauri-apps/api/webview", () => ({
      getCurrentWebview: () => ({
        onDragDropEvent: (cb: (event: { payload: any }) => void) => {
          capturedCb = cb;
          return () => {};
        },
      }),
    }));

    const onDropFiles = vi.fn();
    const onDragStateChange = vi.fn();

    renderHook(() => useNativeAppBehavior(onDropFiles, onDragStateChange));

    // Wait for dynamic import
    await new Promise((r) => setTimeout(r, 20));

    if (capturedCb) {
      capturedCb({
        payload: {
          type: "drop",
          paths: ["/path/test.pdf", "/path/test.fdx", "/path/test.fadein", "/path/test.md", "/path/ignored.exe"],
          position: { x: 200, y: 300 },
        },
      });

      expect(onDropFiles).toHaveBeenCalledWith(
        ["/path/test.pdf", "/path/test.fdx", "/path/test.fadein", "/path/test.md"],
        { clientX: 200, clientY: 300 }
      );
    }
  });
});
