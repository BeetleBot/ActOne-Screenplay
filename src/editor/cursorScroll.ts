export const PENDING_SCROLL_VERTICAL_FACTOR = 0.3;

export function pendingScrollTargetY(
  scrollTop: number,
  cursorClientY: number,
  containerRectTop: number,
  containerHeight: number
): number {
  return scrollTop + (cursorClientY - containerRectTop) - containerHeight * PENDING_SCROLL_VERTICAL_FACTOR;
}