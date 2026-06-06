import React, { useRef } from "react";
import { useAppContext } from "../context/AppContext";
import { useCodeMirror } from "../editor/useCodeMirror";
import { useUI } from "../context/UIContext";

export const FountainEditor: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { fontFamily } = useAppContext();
  const { hideFountainMarkupEnabled } = useUI();
  
  const viewRef = useCodeMirror(containerRef);

  return (
    <div className={`editor-font-wrapper ${fontFamily} ${hideFountainMarkupEnabled ? "hide-fountain-markup" : ""}`} style={{ display: "flex", flex: 1, minHeight: "100%", flexDirection: "column" }}>
      <div ref={containerRef} style={{ flex: 1, minHeight: "100%", cursor: "text" }} onClick={() => viewRef.current?.focus()} />
    </div>
  );
};
