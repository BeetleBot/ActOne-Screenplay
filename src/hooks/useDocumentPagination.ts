import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { logger } from "../utils/logger";

export interface DocumentPaginationOptions {
  fileId: string;
  scriptIndex: number;
  text: string;
  enabled: boolean;
  paperSize: "letter" | "a4";
  fontFamily: string;
  elementFormats: string;
  scriptFonts: string;
  autoContd: boolean;
  onResult: (breaks: number[]) => void;
}

/** Layout results belong to one document revision, including its layout settings. */
export function useDocumentPagination(options: DocumentPaginationOptions) {
  const { fileId, scriptIndex, text, enabled, paperSize, fontFamily, elementFormats, scriptFonts, autoContd } = options;
  const onResultRef = useRef(options.onResult);
  onResultRef.current = options.onResult;

  useEffect(() => {
    if (!enabled || !fileId || typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const breaks = await invoke<number[] | null>("get_page_breaks", {
          fountainText: text, paperSize, fontFamily, elementFormats, scriptFonts,
          mirrorSceneNumbers: "off", exportSections: false, exportSynopses: false,
          exportTitlePage: true, autoContd, revisedLines: [],
        });
        if (!cancelled && breaks) onResultRef.current(breaks);
      } catch (error) {
        if (!cancelled) logger.error("file", "Page break calculation failed", error);
      }
    }, 200);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [fileId, scriptIndex, text, enabled, paperSize, fontFamily, elementFormats, scriptFonts, autoContd]);
}

export function equalPageBreaks(previous: number[] | undefined, next: number[]): boolean {
  return previous !== undefined && previous.length === next.length && previous.every((line, index) => line === next[index]);
}
