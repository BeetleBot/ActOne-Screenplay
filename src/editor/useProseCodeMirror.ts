import { useMemo } from "react";
import { EditorView } from "@codemirror/view";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { useCoreCodeMirror } from "./useCoreCodeMirror";
import { inlinePreview } from "./markdown/inline-preview";
import { tables } from "./markdown/table-widget";

export interface ProseCodeMirrorProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function useProseCodeMirror({ containerRef }: ProseCodeMirrorProps) {
  const extraExtensions = useMemo(() => [
    markdown({ base: markdownLanguage }),
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
  ], []);

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