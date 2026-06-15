import React, { useMemo } from "react";
import { useFile, useEditor, useUI } from "../context";
import { LineType, parseSceneHeading } from "../parser";

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
  const { parsedDoc } = useFile();
  const { scrollToLine, selectedSceneId, activeLineId } = useEditor();
  const { timelineFilter } = useUI();

  if (!parsedDoc?.lines) return null;

  const scenes = parsedDoc.lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => line.type === LineType.heading);

  if (scenes.length === 0) return null;

  const totalDocLines = Math.max(1, parsedDoc.lines.length);

  // Parse segments
  const sceneSegments = useMemo(() => {
    return scenes.map(({ line, index }, idx) => {
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
  }, [scenes, totalDocLines, parsedDoc.pageBreaks]);

  const totalSceneLines = useMemo(() => {
    return sceneSegments.reduce((sum, seg) => sum + seg.lineCount, 0);
  }, [sceneSegments]);

  const activeLineIndex = parsedDoc.lines.findIndex(l => l.id === activeLineId);
  
  const currentSceneIdx = scenes.findIndex(({ index }, idx) => {
    const nextScene = scenes[idx + 1];
    const nextIndex = nextScene ? nextScene.index : totalDocLines;
    return activeLineIndex >= index && activeLineIndex < nextIndex;
  });
  const currentSceneId = currentSceneIdx !== -1 ? scenes[currentSceneIdx].line.id : null;

  const matchingFilterIds = useMemo(() => {
    if (timelineFilter.type === 'default' || !timelineFilter.values || timelineFilter.values.length === 0) return new Set<string>();

    const matchingIds = new Set<string>();

    for (const segment of sceneSegments) {
      if (timelineFilter.type === 'character') {
        const cleanVals = timelineFilter.values.map(v => v.toUpperCase());
        for (let i = segment.startIndex; i < segment.endIndex; i++) {
          const line = parsedDoc.lines[i];
          if (line.type === LineType.character || line.type === LineType.dualDialogueCharacter) {
            const charName = line.text
              .replace(/\(.*\)/g, "")
              .replace(/\[\[.*\]\]/g, "")
              .replace(/#.*#/g, "")
              .trim()
              .toUpperCase();
            if (cleanVals.includes(charName)) {
              matchingIds.add(segment.id);
              break;
            }
          }
        }
      } else if (timelineFilter.type === 'location') {
        const cleanVals = timelineFilter.values.map(v => v.toUpperCase());
        const headingText = parsedDoc.lines[segment.startIndex].text;
        const parsed = parseSceneHeading(headingText);
        if (parsed.location && cleanVals.some(val => parsed.location!.includes(val))) {
          matchingIds.add(segment.id);
        }
      } else if (timelineFilter.type === 'time') {
        const cleanVals = timelineFilter.values.map(v => v.toUpperCase());
        const headingText = parsedDoc.lines[segment.startIndex].text;
        const parsed = parseSceneHeading(headingText);
        if (parsed.timeOfDay && cleanVals.includes(parsed.timeOfDay)) {
          matchingIds.add(segment.id);
        }
      } else if (timelineFilter.type === 'setting') {
        const cleanVals = timelineFilter.values.map(v => v.toUpperCase());
        const headingText = parsedDoc.lines[segment.startIndex].text;
        const parsed = parseSceneHeading(headingText);
        
        const isInt = parsed.setting && (parsed.setting.includes("INT") || parsed.setting === "I/E");
        const isExt = parsed.setting && (parsed.setting.includes("EXT") || parsed.setting === "I/E");
        
        const matchesInt = cleanVals.includes('INT') && isInt;
        const matchesExt = cleanVals.includes('EXT') && isExt;
        
        if (matchesInt || matchesExt) {
          matchingIds.add(segment.id);
        }
      }
    }

    return matchingIds;
  }, [timelineFilter, sceneSegments, parsedDoc.lines]);



  const scrubbingRef = React.useRef(false);
  const [isScrubbing, setIsScrubbing] = React.useState(false);
  const [zoomScale, setZoomScale] = React.useState(1);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const trackWrapperRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.15 : 0.85;
        setZoomScale(prev => {
          const next = Math.max(1, Math.min(15, prev * factor));
          if (next === prev) return prev;
          return next;
        });
      } else if (zoomScale > 1) {
        const trackWrapper = trackWrapperRef.current;
        if (trackWrapper) {
          e.preventDefault();
          trackWrapper.scrollLeft += e.deltaY;
        }
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [zoomScale]);

  const handleScrub = (clientX: number, trackElement: HTMLDivElement, noFocus: boolean = true) => {
    const rect = trackElement.getBoundingClientRect();
    const clickPercent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    
    let accumulatedPercent = 0;
    let targetSegment = sceneSegments[0];
    for (const seg of sceneSegments) {
      const segWidthPercent = totalSceneLines > 0 ? (seg.lineCount / totalSceneLines) : 0;
      accumulatedPercent += segWidthPercent;
      if (clickPercent <= accumulatedPercent) {
        targetSegment = seg;
        break;
      }
    }
    if (targetSegment) {
      scrollToLine(targetSegment.index, noFocus);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.ctrlKey && e.button === 1) {
      e.preventDefault();
      setZoomScale(1);
      if (trackWrapperRef.current) {
        trackWrapperRef.current.scrollLeft = 0;
      }
      return;
    }
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    scrubbingRef.current = true;
    setIsScrubbing(true);
    handleScrub(e.clientX, e.currentTarget, true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (scrubbingRef.current) {
      handleScrub(e.clientX, e.currentTarget, true);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (scrubbingRef.current) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      scrubbingRef.current = false;
      setIsScrubbing(false);
      handleScrub(e.clientX, e.currentTarget, false);
    }
  };

  return (
    <div ref={containerRef} className="timeline-container proposal-a">
      <div 
        ref={trackWrapperRef} 
        className="timeline-track-wrapper"
        style={{ overflowX: zoomScale > 1 ? "auto" : "hidden" }}
      >
        <div 
          className="timeline-track"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{ 
            cursor: isScrubbing ? "grabbing" : "col-resize", 
            touchAction: "none",
            width: `${zoomScale * 100}%`,
          }}
        >
          {sceneSegments.map((segment) => {
            const widthPercent = totalSceneLines > 0 ? (segment.lineCount / totalSceneLines) * 100 : 0;
            const isActive = segment.id === selectedSceneId || segment.id === currentSceneId;
            
            const isFilterActive = timelineFilter.type !== 'default';
            const isMatch = !isFilterActive || matchingFilterIds.has(segment.id);
            
            let bg = segment.color
              ? segment.color.startsWith("#")
                ? segment.color
                : `var(--scene-color-${segment.color})`
              : "";

            if (isFilterActive && isMatch && !bg) {
              bg = "var(--accent-color, #2196f3)";
            }

            const tooltip = `Scene ${segment.sceneNumber}: ${segment.title}\nPage ${segment.pageNumber} • ${segment.lineCount} lines`;

            const isReallyActive = segment.id === currentSceneId;
            const progress = isReallyActive && activeLineIndex !== -1 && segment.lineCount > 1
              ? Math.max(0, Math.min(100, ((activeLineIndex - segment.startIndex) / segment.lineCount) * 100))
              : 0;

            return (
              <div
                key={segment.id}
                className={`timeline-segment ${isActive ? "active" : ""} ${bg ? "colored" : ""}`}
                style={{
                  width: `${widthPercent}%`,
                  "--seg-color": bg || undefined,
                  opacity: isMatch ? 1 : 0.12,
                  transition: "opacity 0.25s ease, transform 0.1s",
                  cursor: "inherit",
                } as React.CSSProperties}
                title={tooltip}
              >
                <span className="timeline-segment-number" style={{ opacity: isMatch ? 1 : 0.3 }}>
                  {segment.sceneNumber}
                </span>

                {isReallyActive && (
                  <div 
                    className={`timeline-playhead-line ${isScrubbing ? "scrubbing" : ""}`} 
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
