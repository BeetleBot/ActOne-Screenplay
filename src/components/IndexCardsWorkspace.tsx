import React, { useState, useEffect } from "react";
import { useAppContext } from "../context/AppContext";
import { LineType, serializeScreenplay } from "../parser/FountainParser";

interface CardItemProps {
  line: any;
  sceneIndex: number;
  synopsis: string;
  updateSynopsis: (lineId: string, text: string) => void;
  draggedIdx: number | null;
  dragOverIdx: number | null;
  handleDragStart: (e: React.DragEvent, index: number) => void;
  handleDragOver: (e: React.DragEvent, index: number) => void;
  handleDrop: (e: React.DragEvent, targetIndex: number) => void;
  setDragOverIdx: (idx: number | null) => void;
  scrollToLine: (index: number) => void;
  index: number;
}

const IndexCardItem: React.FC<CardItemProps> = ({
  line,
  sceneIndex,
  synopsis: initialSynopsis,
  updateSynopsis,
  draggedIdx,
  dragOverIdx,
  handleDragStart,
  handleDragOver,
  handleDrop,
  setDragOverIdx,
  scrollToLine,
  index,
}) => {
  const [localSynopsis, setLocalSynopsis] = useState(initialSynopsis);

  useEffect(() => {
    setLocalSynopsis(initialSynopsis);
  }, [initialSynopsis]);

  const bg = line.color
    ? line.color.startsWith("#")
      ? line.color
      : `var(--scene-color-${line.color})`
    : "";

  return (
    <div
      draggable
      onDragStart={(e) => handleDragStart(e, sceneIndex)}
      onDragOver={(e) => handleDragOver(e, sceneIndex)}
      onDragLeave={() => setDragOverIdx(null)}
      onDrop={(e) => handleDrop(e, sceneIndex)}
      onDoubleClick={() => scrollToLine(index)}
      className={`index-card-item ${dragOverIdx === sceneIndex ? "drag-over" : ""} ${draggedIdx === sceneIndex ? "dragging" : ""}`}
      style={{
        borderTop: bg ? `6px solid ${bg}` : "6px solid var(--border-color)",
      }}
    >
      <div className="index-card-header">
        <span className="index-card-scene-number">
          {line.sceneNumber || (sceneIndex + 1)}
        </span>
        <h3 className="index-card-title">
          {line.text.replace(/^[. ]+/, "")}
        </h3>
      </div>
      <textarea
        className="index-card-synopsis-textarea"
        value={localSynopsis}
        onChange={(e) => setLocalSynopsis(e.target.value)}
        onBlur={() => {
          if (localSynopsis !== initialSynopsis) {
            updateSynopsis(line.id, localSynopsis);
          }
        }}
        placeholder="Add scene synopsis here..."
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
};

export const IndexCardsWorkspace: React.FC = () => {
  const { parsedDoc, setRawText, reorderScenes, scrollToLine } = useAppContext();
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const scenes = parsedDoc.lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => line.type === LineType.heading);

  const updateSynopsis = (lineId: string, newSynopsis: string) => {
    const lines = [...parsedDoc.lines];
    const index = lines.findIndex((l) => l.id === lineId);
    if (index === -1) return;

    let synopseIndex = -1;
    for (let i = index + 1; i < lines.length; i++) {
      if (lines[i].type === LineType.heading || lines[i].type === LineType.section) {
        break;
      }
      if (lines[i].type === LineType.synopse) {
        synopseIndex = i;
        break;
      }
    }

    if (synopseIndex !== -1) {
      lines[synopseIndex] = {
        ...lines[synopseIndex],
        text: `= ${newSynopsis}`,
      };
    } else {
      const newLine = {
        id: "line-" + Math.random().toString(36).substring(2, 9),
        text: `= ${newSynopsis}`,
        type: LineType.synopse,
        isOutlineElement: true,
      };
      lines.splice(index + 1, 0, newLine);
    }

    const serialized = serializeScreenplay(lines, parsedDoc.settings);
    setRawText(serialized);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIdx !== index) {
      setDragOverIdx(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (sourceIndex !== targetIndex) {
      reorderScenes(sourceIndex, targetIndex);
    }
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  return (
    <div className="cards-workspace-container">
      {scenes.length === 0 ? (
        <div className="no-cards-placeholder">
          <h2>No scenes found</h2>
          <p>Create a scene using INT. or EXT. in the editor to see index cards.</p>
        </div>
      ) : (
        <div className="cards-grid">
          {scenes.map(({ line, index }, sceneIndex) => {
            const nextScene = scenes[sceneIndex + 1];
            const endIdx = nextScene ? nextScene.index : parsedDoc.lines.length;
            const sceneLines = parsedDoc.lines.slice(index + 1, endIdx);

            const synopsisLine = sceneLines.find((l) => l.type === LineType.synopse);
            const synopsis = synopsisLine ? synopsisLine.text.replace(/^=[ ]*/, "") : "";

            return (
              <IndexCardItem
                key={line.id}
                line={line}
                sceneIndex={sceneIndex}
                synopsis={synopsis}
                updateSynopsis={updateSynopsis}
                draggedIdx={draggedIdx}
                dragOverIdx={dragOverIdx}
                handleDragStart={handleDragStart}
                handleDragOver={handleDragOver}
                handleDrop={handleDrop}
                setDragOverIdx={setDragOverIdx}
                scrollToLine={scrollToLine}
                index={index}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
