import { createSharedRequests } from "../document/documentDataStore";
import { resolveProseImages } from "../utils/proseAssets";
import { useEffect, useRef, useState, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { logger } from "../utils/logger";

const sharedLayoutRequest = createSharedRequests("native-layout");

export interface DocumentPaginationOptions {
  fileId: string;
  scriptIndex: number;
  scriptFileName?: string;
  text: string;
  enabled: boolean;
  paperSize: "letter" | "a4";
  fontFamily: string;
  elementFormats: string;
  scriptFonts: string;
  autoContd: boolean;
  onResult?: (breaks: number[]) => void;
}

/** Layout results belong to one document revision, including its layout settings. */
export function useDocumentPagination(options: DocumentPaginationOptions): number[] | null {
  const { fileId, scriptIndex, scriptFileName, text, enabled, paperSize, fontFamily, elementFormats, scriptFonts, autoContd } = options;
  const key = useMemo(() => ({ fileId, scriptIndex, scriptFileName, text, enabled, paperSize, fontFamily, elementFormats, scriptFonts, autoContd }),
    [fileId, scriptIndex, scriptFileName, text, enabled, paperSize, fontFamily, elementFormats, scriptFonts, autoContd]);
  const keyRef = useRef(key);
  keyRef.current = key;
  const onResultRef = useRef(options.onResult);
  onResultRef.current = options.onResult;
  const [result, setResult] = useState<{ key: typeof key; breaks: number[] } | null>(null);
  const inFlightRef = useRef(false);
  const queuedRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    if (!enabled || !fileId || typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) return;
    let cancelled = false;
    const run = async () => {
      if (cancelled || keyRef.current !== key) return;
      if (inFlightRef.current) {
        queuedRef.current = run;
        return;
      }
      inFlightRef.current = true;
      try {
        const requestKey = JSON.stringify(["screenplay", fileId, scriptIndex, scriptFileName, text, paperSize, fontFamily, elementFormats, scriptFonts, autoContd]);
        const breaks = await sharedLayoutRequest(requestKey, () => invoke<number[] | null>("get_page_breaks", {
          fountainText: text, paperSize, fontFamily, elementFormats, scriptFonts,
          mirrorSceneNumbers: "off", exportSections: false, exportSynopses: false,
          exportTitlePage: true, autoContd, revisedLines: [],
        }));
        const valid = Array.isArray(breaks) && breaks.every((line, index) =>
          Number.isSafeInteger(line) && line >= 0 && (index === 0 || line >= breaks[index - 1]));
        if (!cancelled && keyRef.current === key && valid) {
          setResult({ key, breaks });
          onResultRef.current?.(breaks);
        }
      } catch (error) {
        if (!cancelled && keyRef.current === key) logger.error("file", "Page break calculation failed", error);
      } finally {
        inFlightRef.current = false;
        const queued = queuedRef.current;
        queuedRef.current = null;
        if (queued) void queued();
      }
    };
    const timer = setTimeout(() => { void run(); }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (queuedRef.current === run) queuedRef.current = null;
    };
  }, [key, fileId, scriptIndex, scriptFileName, text, enabled, paperSize, fontFamily, elementFormats, scriptFonts, autoContd]);

  return enabled && result?.key === key ? result.breaks : null;
}

export function equalPageBreaks(previous: number[] | undefined, next: number[]): boolean {
  return previous !== undefined && previous.length === next.length && previous.every((line, index) => line === next[index]);
}

/** Prose page counts come from the same Classic renderer used for export. */
export function useProsePagination(text: string, paperSize: "letter" | "a4", documentKey: string, enabled: boolean, imageSettings?: Record<string, unknown>): number[] | null {
  const registry = imageSettings?.proseImages;
  const key = useMemo(() => ({ documentKey, text, paperSize, registry }), [documentKey, text, paperSize, registry]);
  const [result, setResult] = useState<{ key: typeof key; breaks: number[] } | null>(null);
  useEffect(() => {
    if (!enabled || typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const markdownText = resolveProseImages(text, imageSettings);
        const requestKey = JSON.stringify(["prose", documentKey, markdownText, paperSize]);
        const breaks = await sharedLayoutRequest(requestKey, () => invoke<number[]>("get_prose_page_breaks", { markdownText, paperSize }));
        if (!cancelled && Array.isArray(breaks)) setResult({ key, breaks });
      } catch (error) {
        if (!cancelled) logger.error("file", "Prose page calculation failed", error);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [key, text, paperSize, enabled, registry]);
  return enabled && result?.key === key ? result.breaks : null;
}
