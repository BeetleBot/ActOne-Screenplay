import type { EditorView } from "@codemirror/view";

export interface EditorPosition {
  anchor: number;
  head: number;
  scrollTop: number;
  scrollLeft: number;
}

function projectKey(path: string): string {
  // Windows paths are case insensitive; retain case on Linux.
  const normalized = path.replace(/\\/g, "/");
  return `actone-editor-position:v1:${JSON.stringify(/^[a-z]:\//i.test(normalized) || normalized.startsWith("//") ? normalized.toLowerCase() : normalized)}`;
}

function read(key: string): unknown {
  try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; }
}

function write(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Storage may be unavailable or full. */ }
}

export function rememberActiveDocument(path: string | null, fileName: string): void {
  if (path && fileName) write(`${projectKey(path)}:active`, fileName);
}

export function rememberedDocumentIndex(path: string, scripts: { fileName: string }[]): number {
  const name = read(`${projectKey(path)}:active`);
  return Math.max(0, scripts.findIndex(script => script.fileName === name));
}

export function readEditorPosition(path: string | null, fileName: string): EditorPosition | null {
  if (!path) return null;
  const value = read(`${projectKey(path)}:doc:${JSON.stringify(fileName)}`);
  if (!value || typeof value !== "object") return null;
  const position = value as EditorPosition;
  return [position.anchor, position.head, position.scrollTop, position.scrollLeft]
    .every(number => typeof number === "number" && Number.isFinite(number) && number >= 0)
    && Number.isInteger(position.anchor) && Number.isInteger(position.head) ? position : null;
}

export interface EditorPositionSession {
  schedule: () => void;
  flush: () => void;
  destroy: () => void;
  isRestoring: () => boolean;
}

/** Owns one document identity, including its final synchronous close/switch save. */
export function trackEditorPosition(
  view: EditorView, area: HTMLElement | null, path: string | null, fileName: string,
  pendingScroll: Pick<EditorPosition, "scrollTop" | "scrollLeft"> | null = null,
): EditorPositionSession {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let destroyed = false;
  // Pagination, fonts, and CodeMirror height estimates can settle well after two
  // frames. Keep the requested offsets authoritative during initial layout.
  // User navigation always takes over immediately.
  let restoreFrame: number | undefined;
  let restoreTimeout: ReturnType<typeof setTimeout> | undefined;
  const measureKey = {};
  const applyScroll = (target: Pick<EditorPosition, "scrollTop" | "scrollLeft">) => {
    if (destroyed || !pendingScroll || !area) return;
    area.scrollTop = target.scrollTop;
    area.scrollLeft = target.scrollLeft;
  };
  const cancelRestore = () => {
    pendingScroll = null;
    if (restoreFrame !== undefined) cancelAnimationFrame(restoreFrame);
    clearTimeout(restoreTimeout);
  };
  const restore = () => {
    if (destroyed || !pendingScroll) return;
    applyScroll(pendingScroll);
    view.requestMeasure({
      key: measureKey,
      read: () => pendingScroll,
      write: target => { if (target) applyScroll(target); },
    });
    restoreFrame = requestAnimationFrame(restore);
  };
  if (pendingScroll && area) {
    restoreFrame = requestAnimationFrame(restore);
    restoreTimeout = setTimeout(() => {
      if (pendingScroll) applyScroll(pendingScroll);
      cancelRestore();
    }, 1500);
  } else {
    pendingScroll = null;
  }
  const flush = () => {
    clearTimeout(timer);
    timer = undefined;
    if (destroyed || !path) return;
    const { anchor, head } = view.state.selection.main;
    write(`${projectKey(path)}:doc:${JSON.stringify(fileName)}`, {
      anchor, head,
      scrollTop: pendingScroll?.scrollTop ?? area?.scrollTop ?? 0,
      scrollLeft: pendingScroll?.scrollLeft ?? area?.scrollLeft ?? 0,
    });
  };
  const schedule = () => {
    if (destroyed || timer !== undefined) return;
    timer = setTimeout(flush, 200);
  };
  const onVisibility = () => { if (document.visibilityState === "hidden") flush(); };
  area?.addEventListener("scroll", schedule, { passive: true });
  document.addEventListener("wheel", cancelRestore, { passive: true, capture: true });
  document.addEventListener("pointerdown", cancelRestore, true);
  document.addEventListener("touchstart", cancelRestore, { passive: true, capture: true });
  document.addEventListener("keydown", cancelRestore, true);
  window.addEventListener("pagehide", flush);
  window.addEventListener("beforeunload", flush);
  document.addEventListener("visibilitychange", onVisibility);
  return {
    schedule, flush,
    isRestoring: () => pendingScroll !== null,
    destroy() {
      if (destroyed) return;
      flush();
      destroyed = true;
      cancelRestore();
      document.removeEventListener("wheel", cancelRestore, true);
      document.removeEventListener("pointerdown", cancelRestore, true);
      document.removeEventListener("touchstart", cancelRestore, true);
      document.removeEventListener("keydown", cancelRestore, true);
      area?.removeEventListener("scroll", schedule);
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
}
