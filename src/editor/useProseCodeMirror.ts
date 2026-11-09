import type { ProseImageRegistry } from "../utils/proseAssets";
import { proseMedia, proseImagesField, setProseImages } from "./markdown/prose-media";
import { useMemo, useRef, useEffect } from "react";
import { EditorView } from "@codemirror/view";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { useCoreCodeMirror } from "./useCoreCodeMirror";
import { inlinePreview } from "./markdown/inline-preview";
import { tables } from "./markdown/table-widget";

export interface ProseCodeMirrorProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  images?: ProseImageRegistry;
}

export function useProseCodeMirror({ containerRef, images }: ProseCodeMirrorProps) {
  const imagesRef = useRef(images);
  imagesRef.current = images;
  const extraExtensions = useMemo(
    () => [
      markdown({ base: markdownLanguage }),
      proseImagesField,
      proseMedia,
      inlinePreview({
        onLinkClick: (url) => {
          window.open(url, "_blank", "noopener,noreferrer");
        },
      }),
      tables({
        onLinkClick: (url) => {
          window.open(url, "_blank", "noopener,noreferrer");
        },
      }),
    ],
    [],
  );

  const handleInit = (view: EditorView) => {
    view.dispatch({ effects: setProseImages.of(imagesRef.current || {}) });
  };

  const handleScriptSwitch = (view: EditorView) => {
    view.dispatch({ effects: setProseImages.of(imagesRef.current || {}) });
  };

  const viewRef = useCoreCodeMirror({
    containerRef,
    extraExtensions,
    onInit: handleInit,
    onScriptSwitch: handleScriptSwitch,
  });

  useEffect(() => {
    viewRef.current?.dispatch({ effects: setProseImages.of(images || {}) });
  }, [images, viewRef]);
  return viewRef;
}
