import { LineType, type ParsedLine } from "../parser";
import type { OutlineItem } from "./OutlineView";

let nextKey = 0;
export function reconcileOutline(
  previous: OutlineItem[],
  lines: ParsedLine[],
  mapPreviousIndex?: (index: number) => number,
): OutlineItem[] {
  const byContent = new Map<string, OutlineItem[]>();
  const contentKey = (line: ParsedLine) => `${line.type}:${line.text}`;
  for (const item of previous) {
    const key = contentKey(item.line);
    const bucket = byContent.get(key) ?? [];
    bucket.push(item);
    byContent.set(key, bucket);
  }
  const byPosition = new Map<number, OutlineItem[]>();
  for (const item of previous) {
    const index = mapPreviousIndex ? mapPreviousIndex(item.index) : item.index;
    const bucket = byPosition.get(index) ?? [];
    bucket.push(item);
    byPosition.set(index, bucket);
  }
  const used = new Set<OutlineItem>();
  const next: OutlineItem[] = [];
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (!line.isOutlineElement && line.type !== LineType.synopse) continue;
    const bucket = byContent.get(contentKey(line));
    const positioned = mapPreviousIndex
      ? byPosition.get(index)?.find((item) => !used.has(item) && item.line.type === line.type)
      : undefined;
    const match = mapPreviousIndex ? positioned : bucket?.find((item) => !used.has(item));
    // Keep a renamed entry's identity when its original position/type survives.
    const old = match ?? byPosition.get(index)?.find((item) => !used.has(item) && item.line.type === line.type);
    if (old) used.add(old);
    next.push(
      old && old.index === index && JSON.stringify(old.line) === JSON.stringify(line)
        ? old
        : { line, index, key: old?.key ?? `outline-${++nextKey}` },
    );
  }
  return next.length === previous.length && next.every((item, index) => item === previous[index]) ? previous : next;
}
