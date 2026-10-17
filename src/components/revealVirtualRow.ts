import type { ListImperativeAPI } from "react-window";

/** Estimated offsets change as wrapped rows are measured. Retry until visible. */
export function revealVirtualRow(
  list: () => ListImperativeAPI | null,
  index: number,
  find: (element: HTMLElement) => HTMLElement | null,
): () => void {
  let frame = 0;
  let attempts = 0;
  let stableFrames = 0;
  let previousTop = Number.NaN;
  let cancelled = false;
  const cancel = () => {
    cancelled = true;
    cancelAnimationFrame(frame);
  };
  const element = list()?.element;
  element?.addEventListener("wheel", cancel, { passive: true });
  const reveal = () => {
    if (cancelled) return;
    const api = list();
    if (!api?.element) return;
    const currentRow = find(api.element);
    const currentBounds = api.element.getBoundingClientRect();
    const currentRect = currentRow?.getBoundingClientRect();
    if (currentRect) {
      // Once mounted, use measured DOM coordinates rather than another estimate.
      if (currentRect.top < currentBounds.top - 1 || currentRect.bottom > currentBounds.bottom + 1) {
        api.element.scrollTop +=
          currentRect.top < currentBounds.top
            ? currentRect.top - currentBounds.top
            : currentRect.bottom - currentBounds.bottom;
      }
    } else api.scrollToRow({ index, align: "center" });
    frame = requestAnimationFrame(() => {
      if (cancelled || !api.element) return;
      const row = find(api.element!);
      const bounds = api.element!.getBoundingClientRect();
      const rect = row?.getBoundingClientRect();
      const visible = rect && rect.top >= bounds.top - 1 && rect.bottom <= bounds.bottom + 1;
      stableFrames = visible && Math.abs(rect.top - previousTop) < 0.5 ? stableFrames + 1 : 0;
      previousTop = rect?.top ?? Number.NaN;
      // ResizeObserver and React can apply new offsets after the first visible
      // frame. Keep observing briefly so that does not undo the reveal.
      if (stableFrames >= 4) return;
      if (++attempts < 60) reveal();
    });
  };
  reveal();
  return () => {
    cancel();
    element?.removeEventListener("wheel", cancel);
  };
}
