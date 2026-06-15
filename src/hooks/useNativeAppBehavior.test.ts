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

  it("prevents browser navigation on window drop (external file drops)", () => {
    renderHook(() => useNativeAppBehavior());
    const drop = new MouseEvent("drop", { cancelable: true } as any);
    const preventSpy = vi.spyOn(drop, "preventDefault");
    window.dispatchEvent(drop);
    expect(preventSpy).toHaveBeenCalled();
  });
});
