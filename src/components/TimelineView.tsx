import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { useFile, useEditor, useUI, useCursor } from "../context";
import { LineType, parseSceneHeading } from "../parser";
import { PushPinIcon } from "./Icons";
import { Tooltip } from "@mui/material";

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
  const { scrollToLine } = useEditor();
  const { activeLineId, activeLineNumber, selectedSceneId } = useCursor();
  const { timelineFilter, timelineShowSections, timelineShowSceneNumbers, timelineShowSceneColors } = useUI();

  const totalDocLines = Math.max(1, parsedDoc?.lines?.length || 0);

  // 1. Build Section Segments (depth 1, e.g. "# Act I")
  const sectionSegments = useMemo(() => {
    if (!parsedDoc?.lines) return [];
    const secLines = parsedDoc.lines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => line.type === LineType.section && line.sectionDepth === 1);

    const segments = [];
    if (secLines.length === 0) {
      segments.push({
        id: "sec-default",
        title: "Draft",
        startIndex: 0,
        endIndex: totalDocLines,
        lineCount: totalDocLines,
        color: "",
      });
    } else {
      if (secLines[0].index > 0) {
        segments.push({
          id: "sec-prefix",
          title: "Setup",
          startIndex: 0,
          endIndex: secLines[0].index,
          lineCount: secLines[0].index,
          color: "",
        });
      }

      for (let i = 0; i < secLines.length; i++) {
        const current = secLines[i];
        const next = secLines[i + 1];
        const end = next ? next.index : totalDocLines;
        segments.push({
          id: current.line.id,
          title: current.line.text.replace(/^#+\s*/, "").trim(),
          startIndex: current.index,
          endIndex: end,
          lineCount: Math.max(1, end - current.index),
          color: current.line.color || "",
        });
      }
    }
    return segments;
  }, [parsedDoc?.lines, totalDocLines]);

  // 2. Build Sub-section Segments (depth 2, e.g. "## Sequence A")
  const subsectionSegments = useMemo(() => {
    if (!parsedDoc?.lines) return [];
    const boundaries = parsedDoc.lines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => line.type === LineType.section && (line.sectionDepth === 1 || line.sectionDepth === 2));

    const segments = [];
    if (boundaries.length === 0) {
      segments.push({
        id: "subsec-default",
        title: "",
        startIndex: 0,
        endIndex: totalDocLines,
        lineCount: totalDocLines,
        color: "",
        isDummy: true,
      });
    } else {
      if (boundaries[0].index > 0) {
        segments.push({
          id: "subsec-prefix",
          title: "",
          startIndex: 0,
          endIndex: boundaries[0].index,
          lineCount: boundaries[0].index,
          color: "",
          isDummy: true,
        });
      }

      for (let i = 0; i < boundaries.length; i++) {
        const current = boundaries[i];
        const next = boundaries[i + 1];
        const end = next ? next.index : totalDocLines;

        const title = current.line.sectionDepth === 2
          ? current.line.text.replace(/^#+\s*/, "").trim()
          : "";

        segments.push({
          id: `${current.line.id}-subsec`,
          title,
          startIndex: current.index,
          endIndex: end,
          lineCount: Math.max(1, end - current.index),
          color: current.line.sectionDepth === 2 ? current.line.color || "" : "",
          isDummy: current.line.sectionDepth === 1,
        });
      }
    }
    return segments;
  }, [parsedDoc?.lines, totalDocLines]);

  // 3. Build Scene Segments (aligned from line 0 to totalDocLines)
  const sceneSegments = useMemo(() => {
    if (!parsedDoc?.lines) return [];
    const sceneLines = parsedDoc.lines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => line.type === LineType.heading);

    const segments = [];
    if (sceneLines.length === 0) {
      segments.push({
        id: "scene-default",
        title: "No Scenes",
        startIndex: 0,
        endIndex: totalDocLines,
        lineCount: totalDocLines,
        color: "",
        sceneNumber: "",
        pageNumber: 1,
        isDummy: true,
      });
    } else {
      if (sceneLines[0].index > 0) {
        segments.push({
          id: "scene-prefix",
          title: "Setup",
          startIndex: 0,
          endIndex: sceneLines[0].index,
          lineCount: sceneLines[0].index,
          color: "",
          sceneNumber: "",
          pageNumber: 1,
          isDummy: true,
        });
      }

      for (let i = 0; i < sceneLines.length; i++) {
        const current = sceneLines[i];
        const next = sceneLines[i + 1];
        const end = next ? next.index : totalDocLines;

        const sceneNoMatch = current.line.text.match(/#([^#]+)#\s*$/);
        const sceneNumber = current.line.sceneNumber || (sceneNoMatch ? sceneNoMatch[1].trim() : String(i + 1));
        const titleOnly = current.line.text.replace(/\s*#[^#]+#\s*$/, "").replace(/^[. ]+/, "");
        const pageNumber = getPageNumber(current.index, parsedDoc.pageBreaks);

        segments.push({
          id: current.line.id,
          title: titleOnly,
          startIndex: current.index,
          endIndex: end,
          lineCount: Math.max(1, end - current.index),
          color: current.line.color || "",
          sceneNumber,
          pageNumber,
          isDummy: false,
        });
      }
    }
    return segments;
  }, [parsedDoc?.lines, totalDocLines, parsedDoc?.pageBreaks]);

  // 4. Extract Markers from document
  const markerItems = useMemo(() => {
    if (!parsedDoc?.lines) return [];
    const items = [];
    for (let i = 0; i < parsedDoc.lines.length; i++) {
      const line = parsedDoc.lines[i];
      if (line.marker) {
        items.push({
          id: `marker-${line.id || i}`,
          lineIndex: i,
          color: line.marker.color || "orange",
          description: line.marker.description || "Marker",
        });
      }
    }
    return items;
  }, [parsedDoc?.lines]);

  const hasSections = useMemo(() => {
    return parsedDoc?.lines?.some(l => l.type === LineType.section && l.sectionDepth === 1) ?? false;
  }, [parsedDoc?.lines]);

  const hasSubsections = useMemo(() => {
    return parsedDoc?.lines?.some(l => l.type === LineType.section && l.sectionDepth === 2) ?? false;
  }, [parsedDoc?.lines]);

  const activeLineIndex = useMemo(() => {
    if (!parsedDoc?.lines) return -1;
    if (activeLineNumber >= 0 && activeLineNumber < parsedDoc.lines.length) {
      return activeLineNumber;
    }
    if (activeLineId) {
      const idx = parsedDoc.lines.findIndex(l => l.id === activeLineId);
      if (idx !== -1) return idx;
    }
    return -1;
  }, [parsedDoc?.lines, activeLineNumber, activeLineId]);

  const activeSectionId = useMemo(() => {
    if (activeLineIndex === -1) return null;
    const activeSeg = sectionSegments.find(
      seg => activeLineIndex >= seg.startIndex && activeLineIndex < seg.endIndex
    );
    return activeSeg ? activeSeg.id : null;
  }, [sectionSegments, activeLineIndex]);

  const activeSubsectionId = useMemo(() => {
    if (activeLineIndex === -1) return null;
    const activeSeg = subsectionSegments.find(
      seg => activeLineIndex >= seg.startIndex && activeLineIndex < seg.endIndex
    );
    return activeSeg ? activeSeg.id : null;
  }, [subsectionSegments, activeLineIndex]);

  const activeSceneId = useMemo(() => {
    if (activeLineIndex === -1) return null;
    const activeSeg = sceneSegments.find(
      seg => activeLineIndex >= seg.startIndex && activeLineIndex < seg.endIndex
    );
    return activeSeg ? activeSeg.id : null;
  }, [sceneSegments, activeLineIndex]);

  const matchingFilterIds = useMemo(() => {
    if (timelineFilter.type === 'default' || !parsedDoc?.lines) {
      return new Set<string>();
    }

    const matchingIds = new Set<string>();

    for (const segment of sceneSegments) {
      if (segment.isDummy) continue;
      if (timelineFilter.type === 'marker') {
        for (let i = segment.startIndex; i < segment.endIndex && i < parsedDoc.lines.length; i++) {
          if (parsedDoc.lines[i].marker) {
            matchingIds.add(segment.id);
            break;
          }
        }
      } else if (timelineFilter.type === 'character') {
        if (!timelineFilter.values || timelineFilter.values.length === 0) continue;
        const cleanVals = timelineFilter.values.map(v => v.toUpperCase());
        for (let i = segment.startIndex; i < segment.endIndex && i < parsedDoc.lines.length; i++) {
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
        if (!timelineFilter.values || timelineFilter.values.length === 0) continue;
        const cleanVals = timelineFilter.values.map(v => v.toUpperCase());
        const headingLine = parsedDoc.lines[segment.startIndex];
        if (headingLine) {
          const parsed = parseSceneHeading(headingLine.text);
          const loc = (headingLine.location || parsed.location || "").toUpperCase();
          if (loc && cleanVals.some(val => loc.includes(val))) {
            matchingIds.add(segment.id);
          }
        }
      } else if (timelineFilter.type === 'time') {
        if (!timelineFilter.values || timelineFilter.values.length === 0) continue;
        const cleanVals = timelineFilter.values.map(v => v.toUpperCase());
        const headingLine = parsedDoc.lines[segment.startIndex];
        if (headingLine) {
          const parsed = parseSceneHeading(headingLine.text);
          const tod = (headingLine.timeOfDay || parsed.timeOfDay || "").toUpperCase();
          if (tod && cleanVals.includes(tod)) {
            matchingIds.add(segment.id);
          }
        }
      } else if (timelineFilter.type === 'setting') {
        if (!timelineFilter.values || timelineFilter.values.length === 0) continue;
        const cleanVals = timelineFilter.values.map(v => v.toUpperCase());
        const headingLine = parsedDoc.lines[segment.startIndex];
        if (headingLine) {
          const parsed = parseSceneHeading(headingLine.text);
          const setStr = (headingLine.setting || parsed.setting || "").toUpperCase();

          const isInt = setStr.includes("INT") || setStr === "I/E";
          const isExt = setStr.includes("EXT") || setStr === "I/E";

          const matchesInt = cleanVals.includes('INT') && isInt;
          const matchesExt = cleanVals.includes('EXT') && isExt;

          if (matchesInt || matchesExt) {
            matchingIds.add(segment.id);
          }
        }
      }
    }

    return matchingIds;
  }, [timelineFilter, sceneSegments, parsedDoc?.lines]);

  const scrubbingRef = useRef(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const trackWrapperRef = useRef<HTMLDivElement>(null);

  // Smooth mouse-wheel scrolling & zooming with focal-point tracking
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const trackWrapper = trackWrapperRef.current;
      if (!trackWrapper) return;

      if (e.ctrlKey || e.altKey) {
        const factor = Math.exp(-e.deltaY * 0.003);
        const rect = trackWrapper.getBoundingClientRect();
        const cursorRelX = e.clientX - rect.left;
        const currentScroll = trackWrapper.scrollLeft;

        setZoomScale(prev => {
          const next = Math.max(1, Math.min(15, prev * factor));
          if (Math.abs(next - prev) < 0.001) return prev;

          // Focal-point zoom anchor adjustment
          const ratio = next / prev;
          const newScrollLeft = (currentScroll + cursorRelX) * ratio - cursorRelX;
          requestAnimationFrame(() => {
            if (trackWrapperRef.current) {
              trackWrapperRef.current.scrollLeft = Math.max(0, newScrollLeft);
            }
          });

          return next;
        });
      } else {
        // Fluid horizontal pan scrolling via standard wheel or trackpad
        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        trackWrapper.scrollBy({ left: delta, behavior: "auto" });
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, []);

  const handleScrub = useCallback((clientX: number, trackElement: HTMLDivElement, noFocus: boolean = true) => {
    const rect = trackElement.getBoundingClientRect();
    const clickPercent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const targetLine = Math.min(totalDocLines - 1, Math.floor(clickPercent * totalDocLines));
    scrollToLine(targetLine, noFocus);
  }, [totalDocLines, scrollToLine]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.ctrlKey || e.altKey) && e.button === 1) {
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
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch { void 0; }
      scrubbingRef.current = false;
      setIsScrubbing(false);
      handleScrub(e.clientX, e.currentTarget, false);
    }
  };

  const playheadProgress = useMemo(() => {
    if (activeLineIndex === -1 || totalDocLines <= 0) return 0;
    return (activeLineIndex / totalDocLines) * 100;
  }, [activeLineIndex, totalDocLines]);

  if (!parsedDoc?.lines) return null;

  return (
    <div ref={containerRef} className="timeline-container" id="timeline-view">
      <div 
        ref={trackWrapperRef} 
        className="timeline-track-wrapper"
        style={{ overflowX: zoomScale > 1 ? "auto" : "hidden" }}
      >
        <div 
          className="timeline-tracks-container"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{ 
            cursor: isScrubbing ? "grabbing" : "col-resize", 
            touchAction: "none",
            width: `${zoomScale * 100}%`,
          }}
        >
          {/* Sections Track (Top) - Only rendered if screenplay has sections and user enabled section lines */}
          {timelineShowSections && hasSections && (
            <div className="timeline-track sections-track">
              {sectionSegments.map((segment) => {
                const widthPercent = totalDocLines > 0 ? (segment.lineCount / totalDocLines) * 100 : 0;
                const isActive = segment.id === activeSectionId;
                const isDummy = segment.id === "sec-prefix" || segment.id === "sec-default";
                const showLabel = segment.id !== "sec-prefix" && Boolean(segment.title);
                const tooltip = isDummy ? "Setup / Intro" : `Section: ${segment.title}`;
                const bg = timelineShowSceneColors && segment.color
                  ? segment.color.startsWith("#")
                    ? segment.color
                    : `var(--scene-color-${segment.color})`
                  : "";

                return (
                  <div
                    key={segment.id}
                    className={`timeline-segment section-segment ${isActive ? "active" : ""} ${isDummy ? "dummy" : ""} ${bg ? "colored" : ""}`}
                    style={{
                      width: `${widthPercent}%`,
                      cursor: "inherit",
                      "--seg-color": bg || undefined,
                    } as React.CSSProperties}
                    title={tooltip}
                  >
                    <div className="timeline-track-line" />
                    {showLabel && (
                      <span className="timeline-segment-label section-label">
                        {segment.title}
                      </span>
                    )}
                    {showLabel && <div className="timeline-track-line" />}
                  </div>
                );
              })}
            </div>
          )}

          {/* Sub-sections Track (Middle) - Only rendered if screenplay has subsections and user enabled section lines */}
          {timelineShowSections && hasSubsections && (
            <div className="timeline-track subsections-track">
              {subsectionSegments.map((segment) => {
                const widthPercent = totalDocLines > 0 ? (segment.lineCount / totalDocLines) * 100 : 0;
                const isActive = segment.id === activeSubsectionId;
                const isDummy = segment.isDummy;
                const tooltip = isDummy ? "" : `Sequence: ${segment.title}`;
                const bg = timelineShowSceneColors && segment.color
                  ? segment.color.startsWith("#")
                    ? segment.color
                    : `var(--scene-color-${segment.color})`
                  : "";

                const showLabel = !isDummy && Boolean(segment.title);

                return (
                  <div
                    key={segment.id}
                    className={`timeline-segment subsection-segment ${isActive ? "active" : ""} ${isDummy ? "dummy" : ""} ${bg ? "colored" : ""}`}
                    style={{
                      width: `${widthPercent}%`,
                      cursor: "inherit",
                      "--seg-color": bg || undefined,
                    } as React.CSSProperties}
                    title={tooltip}
                  >
                    <div className="timeline-track-line" />
                    {showLabel && (
                      <span className="timeline-segment-label subsection-label">
                        {segment.title}
                      </span>
                    )}
                    {showLabel && <div className="timeline-track-line" />}
                  </div>
                );
              })}
            </div>
          )}

          {/* Scenes Track (Bottom) */}
          <div className="timeline-track scenes-track">
            {sceneSegments.map((segment) => {
              const widthPercent = totalDocLines > 0 ? (segment.lineCount / totalDocLines) * 100 : 0;
              const isActive = segment.id === activeSceneId || segment.id === selectedSceneId;
              
              const isFilterActive = timelineFilter.type !== 'default';
              const isMatch = !isFilterActive || matchingFilterIds.has(segment.id);
              const isDummy = segment.isDummy;
              
              let bg = "";
              if (timelineShowSceneColors && segment.color) {
                bg = segment.color.startsWith("#")
                  ? segment.color
                  : `var(--scene-color-${segment.color})`;
              }

              if (!bg && (!isFilterActive || isMatch)) {
                bg = "var(--accent-color, #2196f3)";
              }

              const sceneBg = bg
                ? `color-mix(in srgb, ${bg} 18%, transparent)`
                : undefined;

              const tooltip = isDummy 
                ? "Setup" 
                : `Scene ${segment.sceneNumber}: ${segment.title}\nPage ${segment.pageNumber} • ${segment.lineCount} lines`;

              const isColored = Boolean(timelineShowSceneColors && segment.color);

              return (
                <div
                  key={segment.id}
                  className={`timeline-segment scene-segment ${isActive ? "active" : ""} ${isColored ? "colored" : ""} ${isDummy ? "dummy" : ""}`}
                  style={{
                    width: `${widthPercent}%`,
                    "--seg-color": bg || undefined,
                    "--seg-bg": sceneBg,
                    opacity: isMatch ? 1 : 0.12,
                    transition: "opacity 0.25s ease",
                    cursor: "inherit",
                  } as React.CSSProperties}
                  title={tooltip}
                >
                  {!isDummy && timelineShowSceneNumbers && (
                    <span className="timeline-segment-number" style={{ opacity: isMatch ? 1 : 0.35 }}>
                      {segment.sceneNumber}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Marker Pins across Timeline */}
          {timelineFilter.type === "marker" && markerItems.map((marker) => {
            const markerPos = (marker.lineIndex / totalDocLines) * 100;
            const markerBg = marker.color.startsWith("#")
              ? marker.color
              : `var(--marker-color-${marker.color}, var(--scene-color-${marker.color}, #ff9800))`;

            return (
              <Tooltip
                key={marker.id}
                title={`Marker (Line ${marker.lineIndex + 1}): ${marker.description}`}
                arrow
                placement="top"
              >
                <div
                  className="timeline-marker-pin"
                  style={{
                    left: `${markerPos}%`,
                    "--marker-color": markerBg,
                  } as React.CSSProperties}
                  onClick={(e) => {
                    e.stopPropagation();
                    scrollToLine(marker.lineIndex, false);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <PushPinIcon />
                </div>
              </Tooltip>
            );
          })}

          {/* Unified Vertical Playhead Line */}
          {activeLineIndex !== -1 && (
            <div 
              className={`timeline-playhead-line ${isScrubbing ? "scrubbing" : ""}`} 
              style={{ left: `${playheadProgress}%` }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
