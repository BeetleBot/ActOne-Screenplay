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
    const event = new KeyboardEvent("keydown", { key: "F5", cancelable: true });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");
    window.dispatchEvent(event);
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it("prevents Ctrl+R", () => {
    renderHook(() => useNativeAppBehavior());
    const event = new KeyboardEvent("keydown", { key: "r", ctrlKey: true, cancelable: true });
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

  it("prevents default drag behavior", () => {
    renderHook(() => useNativeAppBehavior());
    const opts = { cancelable: true } as any;
    const dragover = new MouseEvent("dragover", opts);
    const drop = new MouseEvent("drop", opts);
    const preventSpy1 = vi.spyOn(dragover, "preventDefault");
    const preventSpy2 = vi.spyOn(drop, "preventDefault");
    window.dispatchEvent(dragover);
    window.dispatchEvent(drop);
    expect(preventSpy1).toHaveBeenCalled();
    expect(preventSpy2).toHaveBeenCalled();
  });
});
