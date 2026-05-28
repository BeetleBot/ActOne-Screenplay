import React from "react";
import { useScreenplay } from "../context/ScreenplayContext";
import { LineType } from "../parser/FountainParser";

const getPageNumber = (lineIndex: number, pageBreaks: number[] = []) => {
  let page = 1;
  for (const breakIndex of pageBreaks) {
    if (lineIndex >= breakIndex) {
      page++;
    } else {
      break;
    }
  }
  return page;
};

export const TimelineView: React.FC = () => {
  const { parsedDoc, scrollToLine, selectedSceneId, activeLineId } = useScreenplay();

  const scenes = parsedDoc.lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => line.type === LineType.heading);

  if (scenes.length === 0) return null;

  const totalDocLines = Math.max(1, parsedDoc.lines.length);

  // Parse segments
  const sceneSegments = scenes.map(({ line, index }, idx) => {
    const nextScene = scenes[idx + 1];
    const endIdx = nextScene ? nextScene.index : totalDocLines;
    const lineCount = Math.max(1, endIdx - index);
    const pageNumber = getPageNumber(index, parsedDoc.pageBreaks);

    const sceneNoMatch = line.text.match(/#([^#]+)#\s*$/);
    const sceneNumber = sceneNoMatch ? sceneNoMatch[1].trim() : String(idx + 1);

    const titleOnly = line.text.replace(/\s*#[^#]+#\s*$/, "").replace(/^[. ]+/, "");

    return {
      id: line.id,
      title: titleOnly,
      index,
      lineCount,
      color: line.color || "",
      pageNumber,
      sceneNumber,
      startIndex: index,
      endIndex: endIdx,
    };
  });

  const totalSceneLines = sceneSegments.reduce((sum, seg) => sum + seg.lineCount, 0);

  const activeLineIndex = parsedDoc.lines.findIndex(l => l.id === activeLineId);
  
  const currentSceneIdx = scenes.findIndex(({ index }, idx) => {
    const nextScene = scenes[idx + 1];
    const nextIndex = nextScene ? nextScene.index : totalDocLines;
    return activeLineIndex >= index && activeLineIndex < nextIndex;
  });
  const currentSceneId = currentSceneIdx !== -1 ? scenes[currentSceneIdx].line.id : null;

  return (
    <div className="timeline-container proposal-a">
      <div className="timeline-track-wrapper">
        <div className="timeline-track">
          {sceneSegments.map((segment) => {
            const widthPercent = totalSceneLines > 0 ? (segment.lineCount / totalSceneLines) * 100 : 0;
            const isActive = segment.id === selectedSceneId || segment.id === currentSceneId;
            const bg = segment.color
              ? segment.color.startsWith("#")
                ? segment.color
                : `var(--scene-color-${segment.color})`
              : "";

            const tooltip = `Scene ${segment.sceneNumber}: ${segment.title}\nPage ${segment.pageNumber} • ${segment.lineCount} lines`;

            const isReallyActive = segment.id === currentSceneId;
            const progress = isReallyActive && activeLineIndex !== -1 && segment.lineCount > 1
              ? Math.max(0, Math.min(100, ((activeLineIndex - segment.startIndex) / segment.lineCount) * 100))
              : 0;

            return (
              <div
                key={segment.id}
                className={`timeline-segment ${isActive ? "active" : ""} ${segment.color ? "colored" : ""}`}
                style={{
                  width: `${widthPercent}%`,
                  backgroundColor: bg || undefined,
                }}
                title={tooltip}
                onClick={() => scrollToLine(segment.index)}
              >
                <span className="timeline-segment-number">{segment.sceneNumber}</span>
                
                {isReallyActive && (
                  <div 
                    className="timeline-playhead-line" 
                    style={{ left: `${progress}%` }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
