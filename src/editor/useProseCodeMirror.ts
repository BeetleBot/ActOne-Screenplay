import { useMemo, useRef, useCallback } from "react";
import { EditorView } from "@codemirror/view";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { useCoreCodeMirror } from "./useCoreCodeMirror";
import { useFile } from "../context";
import { inlinePreview } from "./markdown/inline-preview";
import { tables } from "./markdown/table-widget";
import { imageBlocks } from "./markdown/image-blocks";
import { treeProgressPlugin } from "./markdown/tree-progress";

const globalAssetUrlCache = new Map<string, string>();

export function registerAssetBlob(key: string, data: Uint8Array | Blob): string {
  const existing = globalAssetUrlCache.get(key);
  if (existing) {
    URL.revokeObjectURL(existing);
  }
  const blob = data instanceof Blob ? data : new Blob([data as Uint8Array]);
  const url = URL.createObjectURL(blob);
  globalAssetUrlCache.set(key, url);
  return url;
}

export function getAssetBlobUrl(key: string, assets?: Record<string, Uint8Array>): string | null {
  if (globalAssetUrlCache.has(key)) {
    return globalAssetUrlCache.get(key)!;
  }
  if (assets && assets[key]) {
    return registerAssetBlob(key, assets[key]);
  }
  return null;
}

export interface ProseCodeMirrorProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onInsertImage?: (file: File, view: EditorView) => void;
}

export function useProseCodeMirror({ containerRef, onInsertImage }: ProseCodeMirrorProps) {
  const { parsedDoc } = useFile();
  const assets = parsedDoc?.settings?.assets as Record<string, Uint8Array> | undefined;
  const assetsRef = useRef(assets);
  assetsRef.current = assets;

  const urlResolver = useCallback((url: string) => {
    if (url.startsWith("asset://")) {
      const key = url.slice(8); // e.g. files/assets/foo.png
      const blobUrl = getAssetBlobUrl(key, assetsRef.current);
      if (blobUrl) {
        return blobUrl;
      }
    }
    return url;
  }, []);

  const extraExtensions = useMemo(() => [
    markdown({ base: markdownLanguage }),
    treeProgressPlugin,
    inlinePreview({
      onLinkClick: (url) => {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    }),
    tables({
      onLinkClick: (url) => {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    }),
    imageBlocks({ urlResolver }),
    EditorView.domEventHandlers({
      paste(event, view) {
        if (!onInsertImage) return false;
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.startsWith("image/")) {
            const file = items[i].getAsFile();
            if (file) {
              onInsertImage(file, view);
              return true;
            }
          }
        }
        return false;
      },
      drop(event, view) {
        if (!onInsertImage) return false;
        const items = event.dataTransfer?.items;
        if (!items) return false;
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.startsWith("image/")) {
            const file = items[i].getAsFile();
            if (file) {
              event.preventDefault();
              onInsertImage(file, view);
              return true;
            }
          }
        }
        return false;
      }
    }),
  ], [urlResolver, onInsertImage]);

  const handleInit = (_view: EditorView) => {
    // Add initialization logic if necessary
  };

  const handleScriptSwitch = (_view: EditorView) => {
    // Handle script switch logic if necessary
  };

  const viewRef = useCoreCodeMirror({
    containerRef,
    extraExtensions,
    onInit: handleInit,
    onScriptSwitch: handleScriptSwitch
  });

  return viewRef;
}
