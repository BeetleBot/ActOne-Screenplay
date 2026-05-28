import React, { useRef } from "react";
import { useAppContext } from "../context/AppContext";
import { useCodeMirror } from "../editor/useCodeMirror";

export const FountainEditor: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { fontFamily } = useAppContext();
  
  const viewRef = useCodeMirror(containerRef);

  return (
    <div className={`editor-font-wrapper ${fontFamily}`} style={{ display: "flex", flex: 1, minHeight: "100%", flexDirection: "column" }}>
      <div ref={containerRef} style={{ flex: 1, minHeight: "100%", cursor: "text" }} onClick={() => viewRef.current?.focus()} />
    </div>
  );
};
