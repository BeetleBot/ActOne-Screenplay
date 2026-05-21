import React from "react";
import { useScreenplay } from "../context/ScreenplayContext";
import { LineType } from "../parser/FountainParser";

export const TimelineView: React.FC = () => {
  const { parsedDoc, scrollToLine, selectedSceneId, activeLineId } = useScreenplay();

  const scenes = parsedDoc.lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => line.type === LineType.heading);

  if (scenes.length === 0) return null;

  const totalDocLines = parsedDoc.lines.length;

  const sceneSegments = scenes.map(({ line, index }, idx) => {
    const nextScene = scenes[idx + 1];
    const endIdx = nextScene ? nextScene.index : parsedDoc.lines.length;
    const lineCount = Math.max(1, endIdx - index);
    return {
      id: line.id,
      title: line.text.replace(/^[. ]+/, ""),
      index,
      lineCount,
      color: line.color || "",
    };
  });

  const activeLineIndex = parsedDoc.lines.findIndex(l => l.id === activeLineId);
  const currentSceneIdx = scenes.findIndex(({ index }, idx) => {
    const nextScene = scenes[idx + 1];
    const nextIndex = nextScene ? nextScene.index : parsedDoc.lines.length;
    return activeLineIndex >= index && activeLineIndex < nextIndex;
  });
  const currentSceneId = currentSceneIdx !== -1 ? scenes[currentSceneIdx].line.id : null;

  return (
    <div className="timeline-container">
      <div className="timeline-track">
        {sceneSegments.map((segment) => {
          const widthPercent = (segment.lineCount / totalDocLines) * 100;
          const isActive = segment.id === selectedSceneId || segment.id === currentSceneId;
          const bg = segment.color
            ? segment.color.startsWith("#")
              ? segment.color
              : `var(--scene-color-${segment.color})`
            : "rgba(128, 128, 128, 0.3)";

          return (
            <div
              key={segment.id}
              className={`timeline-segment ${isActive ? "active" : ""}`}
              style={{
                width: `${widthPercent}%`,
                backgroundColor: bg,
              }}
              title={segment.title}
              onClick={() => scrollToLine(segment.index)}
            />
          );
        })}
      </div>
    </div>
  );
};
