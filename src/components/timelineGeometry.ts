export function timelinePercentAtLine(line: number, totalLines: number): number {
  return (100 * Math.max(0, Math.min(totalLines, line))) / Math.max(1, totalLines);
}

export function timelineLineAtX(
  clientX: number,
  bounds: Pick<DOMRect, "left" | "width">,
  totalLines: number,
): number | null {
  if (bounds.width <= 0 || totalLines <= 0 || !Number.isFinite(clientX)) return null;
  const progress = Math.max(0, Math.min(1, (clientX - bounds.left) / bounds.width));
  return Math.min(totalLines - 1, Math.floor(progress * totalLines));
}

/** Absolute positions share the playhead's axis; no flex sizing or per-item margins. */
export function timelineSpan(start: number, end: number, totalLines: number) {
  return {
    left: `${timelinePercentAtLine(start, totalLines)}%`,
    width: `${timelinePercentAtLine(end - start, totalLines)}%`,
  };
}
