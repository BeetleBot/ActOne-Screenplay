import { useCallback, useMemo, useRef, useState } from "react";
import type { DynamicRowHeight } from "react-window";

/** Keep measurements with rendered content, rather than its filtered list index. */
export function useKeyedRowHeights(keys: string[], defaultHeight = 40): DynamicRowHeight {
  const heights = useRef(new Map<string, number>());
  const elementKeys = useRef(new WeakMap<Element, string>());
  const observer = useRef<ResizeObserver | null>(null);
  const [revision, setRevision] = useState(0);

  const recordHeight = useCallback((key: string, height: number) => {
    if (height <= 0 || heights.current.get(key) === height) return false;
    heights.current.delete(key);
    heights.current.set(key, height);
    // Bound history while retaining measurements across filtering and view toggles.
    if (heights.current.size > 5000) heights.current.delete(heights.current.keys().next().value!);
    return true;
  }, []);

  const observeRowElements = useCallback(
    (elements: Element[] | NodeListOf<Element>) => {
      if (typeof ResizeObserver === "undefined") return () => {};
      observer.current ??= new ResizeObserver((entries) => {
        let changed = false;
        for (const entry of entries) {
          const key = elementKeys.current.get(entry.target);
          if (key === undefined) continue;
          const height = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
          changed = recordHeight(key, height) || changed;
        }
        // One update per observer batch, regardless of how many rows changed.
        if (changed) setRevision((value) => value + 1);
      });
      const observed = Array.from(elements);
      for (const element of observed) {
        const index = Number(element.getAttribute("data-react-window-index"));
        const key = keys[index];
        if (key === undefined) continue;
        elementKeys.current.set(element, key);
        observer.current.observe(element, { box: "border-box" });
      }
      return () => {
        for (const element of observed) {
          observer.current?.unobserve(element);
          elementKeys.current.delete(element);
        }
      };
    },
    [keys, recordHeight],
  );

  return useMemo(() => {
    // A new API object makes react-window recompute offsets after measurements.
    void revision;
    return {
      getAverageRowHeight: () => defaultHeight,
      getRowHeight: (index) => heights.current.get(keys[index]) ?? defaultHeight,
      setRowHeight: (index, height) => {
        const key = keys[index];
        if (key !== undefined && recordHeight(key, height)) setRevision((value) => value + 1);
      },
      observeRowElements,
    };
  }, [keys, defaultHeight, observeRowElements, recordHeight, revision]);
}
