import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useKeyedRowHeights } from "./useKeyedRowHeights";

afterEach(() => vi.unstubAllGlobals());

describe("content-keyed navigator measurements", () => {
  it("retains measured heights when filtering, reordering and restoring the list", () => {
    const { result, rerender } = renderHook(({ keys }) => useKeyedRowHeights(keys), {
      initialProps: { keys: ["first", "long-synopsis", "last"] },
    });
    act(() => {
      result.current.setRowHeight(0, 36);
      result.current.setRowHeight(1, 180);
      result.current.setRowHeight(2, 52);
    });
    rerender({ keys: ["long-synopsis"] });
    expect(result.current.getRowHeight(0)).toBe(180);
    rerender({ keys: ["last", "first", "long-synopsis"] });
    expect([0, 1, 2].map(result.current.getRowHeight)).toEqual([52, 36, 180]);
  });

  it("measures changed layouts separately and reuses earlier display settings", () => {
    const { result, rerender } = renderHook(({ keys }) => useKeyedRowHeights(keys), {
      initialProps: { keys: ["scene:normal:no-synopsis"] },
    });
    act(() => result.current.setRowHeight(0, 36));
    rerender({ keys: ["scene:normal:synopsis"] });
    expect(result.current.getRowHeight(0)).toBe(40);
    act(() => result.current.setRowHeight(0, 180));
    rerender({ keys: ["scene:normal:no-synopsis"] });
    expect(result.current.getRowHeight(0)).toBe(36);
  });

  it("batches observer measurements and ignores detached rows", () => {
    let notify: ResizeObserverCallback = () => {};
    const observe = vi.fn();
    const unobserve = vi.fn();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: ResizeObserverCallback) {
          notify = callback;
        }
        observe = observe;
        unobserve = unobserve;
      },
    );
    let renders = 0;
    const keys = ["first", "second"];
    const { result } = renderHook(() => {
      renders++;
      return useKeyedRowHeights(keys);
    });
    const elements = keys.map((_, index) => {
      const element = document.createElement("div");
      element.setAttribute("data-react-window-index", String(index));
      return element;
    });
    const detach = result.current.observeRowElements(elements);
    const entries = elements.map((target, index) => ({
      target,
      borderBoxSize: [{ blockSize: 80 + index * 50 }],
    })) as ResizeObserverEntry[];
    const before = renders;
    act(() => notify(entries, {} as ResizeObserver));
    expect(renders).toBe(before + 1);
    expect([0, 1].map(result.current.getRowHeight)).toEqual([80, 130]);
    act(() => notify(entries, {} as ResizeObserver));
    expect(renders).toBe(before + 1);
    detach();
    act(() =>
      notify(
        [{ target: elements[0], borderBoxSize: [{ blockSize: 500 }] }] as ResizeObserverEntry[],
        {} as ResizeObserver,
      ),
    );
    expect(result.current.getRowHeight(0)).toBe(80);
    expect(unobserve).toHaveBeenCalledTimes(2);
  });
});
