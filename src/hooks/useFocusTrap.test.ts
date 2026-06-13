import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFocusTrap } from "./useFocusTrap";

describe("useFocusTrap", () => {
  it("returns containerRef and handleKeyDown", () => {
    const { result } = renderHook(() => useFocusTrap(false));
    expect(result.current.containerRef).toBeDefined();
    expect(result.current.containerRef.current).toBeNull();
    expect(typeof result.current.handleKeyDown).toBe("function");
  });

  it("calls onEscape when Escape is pressed and active", () => {
    const onEscape = vi.fn();
    const { result } = renderHook(() => useFocusTrap(true, onEscape));
    result.current.containerRef.current = document.createElement("div");
    const preventDefault = vi.fn();
    const stopPropagation = vi.fn();
    const event = { key: "Escape", preventDefault, stopPropagation } as any;
    result.current.handleKeyDown(event);
    expect(onEscape).toHaveBeenCalled();
  });

  it("does not call onEscape when not active", () => {
    const onEscape = vi.fn();
    const { result } = renderHook(() => useFocusTrap(false, onEscape));
    const event = { key: "Escape", preventDefault: vi.fn(), stopPropagation: vi.fn() } as any;
    act(() => result.current.handleKeyDown(event));
    expect(onEscape).not.toHaveBeenCalled();
  });
});
