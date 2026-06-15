import React, { useState, useMemo, useEffect } from "react";
import { useFile, useEditor } from "../context";
import { LineType, ParsedLine } from "../parser";
import { ScriptBlock, parseBlocks } from "../utils/boardUtils";
import {
  Box,
  Typography,
  IconButton,
  Button,
  Paper,
  TextField,
  Card,
  CardContent,
} from "@mui/material";
import { AddIcon, DeleteIcon } from "./Icons";

interface BoardScene {
  block: ScriptBlock;
  id: string;
  title: string;
  synopsis: string;
  color?: string;
}

interface BoardSubsection {
  block: ScriptBlock;
  id: string;
  title: string;
  synopsis: string;
  scenes: BoardScene[];
}

interface BoardSection {
  block: ScriptBlock;
  id: string;
  title: string;
  synopsis: string;
  subsections: BoardSubsection[];
  orphanScenes: BoardScene[];
}

interface InlineEditProps {
  value: string;
  onSave: (newValue: string) => void;
  variant?: "h6" | "subtitle2" | "body2" | "caption";
  multiline?: boolean;
  style?: React.CSSProperties;
  placeholder?: string;
}

const InlineEdit: React.FC<InlineEditProps> = ({
  value,
  onSave,
  variant = "body2",
  multiline = false,
  style,
  placeholder = "Double click to edit...",
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  const handleBlur = () => {
    setIsEditing(false);
    if (currentValue.trim() !== value.trim()) {
      onSave(currentValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline) {
      handleBlur();
    } else if (e.key === "Escape") {
      setCurrentValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <TextField
        variant="standard"
        value={currentValue}
        onChange={(e) => setCurrentValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoFocus
        multiline={multiline}
        minRows={multiline ? 4 : 1}
        fullWidth
        slotProps={{
          input: {
            disableUnderline: true,
            style: {
              fontSize: variant === "caption" ? "0.8rem" : variant === "subtitle2" ? "0.85rem" : "0.9rem",
              padding: multiline ? "6px 8px" : "2px 6px",
              background: "rgba(0, 0, 0, 0.03)",
              borderRadius: "4px",
              outline: "none",
              border: "none",
              lineHeight: 1.4,
              ...style,
            }
          }
        }}
        sx={{
          "& .MuiInput-root": {
            padding: 0,
            border: "none",
            "&:before, &:after": {
              display: "none",
            }
          }
        }}
      />
    );
  }

  const typographyVariant = variant === "h6" ? "h6" : variant === "subtitle2" ? "subtitle2" : variant === "caption" ? "caption" : "body2";

  return (
    <Typography
      variant={typographyVariant}
      onDoubleClick={() => setIsEditing(true)}
      style={{ cursor: "pointer", minHeight: "1.2em", ...style }}
      title="Double click to edit"
    >
      {value || placeholder}
    </Typography>
  );
};

export const PlanningBoard: React.FC = () => {
  const { parsedDoc } = useFile();
  const { updateLineText, updateBlockSynopsis, updateAllBlocks } = useEditor();
  const boardRef = React.useRef<HTMLDivElement | null>(null);

  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<{
    id: string;
    type: "section" | "subsection" | "scene";
  } | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<"before" | "after">("before");

  // Track mouse coordinates globally for continuous auto-scrolling
  const dragScrollState = React.useRef({
    mouseX: 0,
    mouseY: 0,
    active: false,
  });

  useEffect(() => {
    let intervalId: any = null;

    const tick = () => {
      if (!dragScrollState.current.active) return;
      const { mouseX, mouseY } = dragScrollState.current;

      // Smooth Horizontal Board Scroll
      if (boardRef.current) {
        const board = boardRef.current;
        const rect = board.getBoundingClientRect();
        if (mouseX >= rect.left && mouseX <= rect.right && mouseY >= rect.top && mouseY <= rect.bottom) {
          const x = mouseX - rect.left;
          const threshold = 120;
          const maxSpeed = 20;

          if (x < threshold) {
            const speed = Math.round((1 - x / threshold) * maxSpeed);
            board.scrollLeft -= Math.max(2, speed);
          } else if (x > rect.width - threshold) {
            const dist = rect.width - x;
            const speed = Math.round((1 - dist / threshold) * maxSpeed);
            board.scrollLeft += Math.max(2, speed);
          }
        }
      }

      // Smooth Vertical Column Scroll
      const columns = document.querySelectorAll(".column-scroll-container");
      columns.forEach((col) => {
        const rect = col.getBoundingClientRect();
        if (mouseX >= rect.left && mouseX <= rect.right && mouseY >= rect.top && mouseY <= rect.bottom) {
          const y = mouseY - rect.top;
          const threshold = 80;
          const maxSpeed = 15;

          if (y < threshold) {
            const speed = Math.round((1 - y / threshold) * maxSpeed);
            col.scrollTop -= Math.max(2, speed);
          } else if (y > rect.height - threshold) {
            const dist = rect.height - y;
            const speed = Math.round((1 - dist / threshold) * maxSpeed);
            col.scrollTop += Math.max(2, speed);
          }
        }
      });
    };

    intervalId = setInterval(tick, 16);
    return () => clearInterval(intervalId);
  }, []);

  // Reset drag state globally on release/drop failures
  useEffect(() => {
    const handleGlobalDragEnd = () => {
      setDraggedItem(null);
      setDragOverId(null);
      dragScrollState.current.active = false;
    };
    const handleGlobalDragOver = (e: DragEvent) => {
      dragScrollState.current.mouseX = e.clientX;
      dragScrollState.current.mouseY = e.clientY;
    };
    window.addEventListener("dragend", handleGlobalDragEnd);
    window.addEventListener("mouseup", handleGlobalDragEnd);
    window.addEventListener("dragover", handleGlobalDragOver);
    return () => {
      window.removeEventListener("dragend", handleGlobalDragEnd);
      window.removeEventListener("mouseup", handleGlobalDragEnd);
      window.removeEventListener("dragover", handleGlobalDragOver);
    };
  }, []);

  // Group blocks into hierarchical structure
  const { sections } = useMemo(() => {
    const blocks = parseBlocks(parsedDoc.lines);
    const sectionsList: BoardSection[] = [];
    const orphanList: { subsections: BoardSubsection[]; scenes: BoardScene[] } = {
      subsections: [],
      scenes: [],
    };

    let currentSection: BoardSection | null = null;
    let currentSubsection: BoardSubsection | null = null;

    const getSceneColor = (line: ParsedLine): string | undefined => {
      if (line.color) {
        return line.color.startsWith("#") ? line.color : `var(--scene-color-${line.color})`;
      }
      return undefined;
    };

    const getCleanTitle = (text: string): string => {
      return text
        .replace(/^[.#= >^~!]+/, "")
        .replace(/\[\[.*?\]\]/g, "")
        .replace(/#[^#]+#\s*$/, "")
        .trim();
    };

    for (const block of blocks) {
      if (block.type === "section") {
        currentSection = {
          block,
          id: block.id,
          title: getCleanTitle(block.titleLine.text),
          synopsis: block.synopsisLine ? block.synopsisLine.text.replace(/^=[ ]*/, "").trim() : "",
          subsections: [],
          orphanScenes: [],
        };
        sectionsList.push(currentSection);
        currentSubsection = null;
      } else if (block.type === "subsection") {
        currentSubsection = {
          block,
          id: block.id,
          title: getCleanTitle(block.titleLine.text),
          synopsis: block.synopsisLine ? block.synopsisLine.text.replace(/^=[ ]*/, "").trim() : "",
          scenes: [],
        };
        if (currentSection) {
          currentSection.subsections.push(currentSubsection);
        } else {
          orphanList.subsections.push(currentSubsection);
        }
      } else if (block.type === "scene") {
        const scene: BoardScene = {
          block,
          id: block.id,
          title: getCleanTitle(block.titleLine.text),
          synopsis: block.synopsisLine ? block.synopsisLine.text.replace(/^=[ ]*/, "").trim() : "",
          color: getSceneColor(block.titleLine),
        };
        if (currentSubsection) {
          currentSubsection.scenes.push(scene);
        } else if (currentSection) {
          currentSection.orphanScenes.push(scene);
        } else {
          orphanList.scenes.push(scene);
        }
      }
    }

    if (orphanList.subsections.length > 0 || orphanList.scenes.length > 0) {
      sectionsList.unshift({
        block: {
          type: "section",
          id: "virtual-section-default",
          titleLine: {
            id: "virtual-section-line",
            text: "# Unassigned / Preamble",
            type: LineType.section,
            isOutlineElement: true,
            sectionDepth: 1,
          },
          lines: [],
        },
        id: "virtual-section-default",
        title: "Unassigned / Preamble",
        synopsis: "Scenes and subsections before the first Section header.",
        subsections: orphanList.subsections,
        orphanScenes: orphanList.scenes,
      });
    }

    return { sections: sectionsList };
  }, [parsedDoc.lines]);



  // Drag & Drop handlers
  const handleDragStart = (
    e: React.DragEvent,
    id: string,
    type: "section" | "subsection" | "scene"
  ) => {
    e.stopPropagation();
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
    setDraggedItem({ id, type });
    dragScrollState.current.active = true;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleCardDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedItem || draggedItem.id === id) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const position = relativeY < rect.height / 2 ? "before" : "after";
    setDragOverId(id);
    setDropPosition(position);
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverId(null);
  };

  const handleDrop = (
    e: React.DragEvent,
    targetId: string,
    targetType: "section" | "subsection" | "scene" | "board"
  ) => {
    e.stopPropagation();
    if (!draggedItem || draggedItem.id === targetId) {
      setDragOverId(null);
      return;
    }

    const blocks = parseBlocks(parsedDoc.lines);
    const draggedIdx = blocks.findIndex((b) => b.id === draggedItem.id);
    if (draggedIdx === -1) {
      setDragOverId(null);
      return;
    }

    const newBlocks = [...blocks];
    const [draggedBlock] = newBlocks.splice(draggedIdx, 1);

    if (targetType === "board") {
      newBlocks.push(draggedBlock);
    } else {
      let targetIdx = newBlocks.findIndex((b) => b.id === targetId);
      if (targetIdx !== -1) {
        const insertOffset = dropPosition === "before" ? 0 : 1;
        newBlocks.splice(targetIdx + insertOffset, 0, draggedBlock);
      }
    }

    updateAllBlocks(newBlocks);
    setDraggedItem(null);
    setDragOverId(null);
  };

  const renderPlaceholder = (customWidth?: string) => (
    <Box
      sx={{
        height: 150,
        width: customWidth || (sections.length <= 1 ? "calc(33.33% - 11px)" : "100%"),
        border: "2px dashed var(--accent-color)",
        borderRadius: "8px",
        bgcolor: "rgba(0, 0, 0, 0.03)",
        transition: "all 0.15s ease",
        animation: "expand 0.15s ease-out",
        flexShrink: 0,
        pointerEvents: "none",
        "@keyframes expand": {
          from: { transform: "scale(0.95)", opacity: 0 },
          to: { transform: "scale(1)", opacity: 1 }
        }
      }}
    />
  );

  // Add structural elements
  const handleAddSection = () => {
    const blocks = parseBlocks(parsedDoc.lines);
    const newSection: ScriptBlock = {
      type: "section",
      id: "section-" + Date.now(),
      titleLine: {
        id: "line-" + Date.now(),
        text: `# New Section ${sections.length + 1}`,
        type: LineType.section,
        isOutlineElement: true,
        sectionDepth: 1,
      },
      lines: [{ id: "empty-" + Date.now(), text: "", type: LineType.empty, isOutlineElement: false }],
    };
    updateAllBlocks([...blocks, newSection]);
  };

  const handleAddSubsection = (sectionId: string) => {
    const blocks = parseBlocks(parsedDoc.lines);
    const sectionIdx = blocks.findIndex((b) => b.id === sectionId);
    if (sectionIdx === -1) return;

    let insertIdx = sectionIdx;
    for (let i = sectionIdx + 1; i < blocks.length; i++) {
      if (blocks[i].type === "section") break;
      insertIdx = i;
    }

    const newSub: ScriptBlock = {
      type: "subsection",
      id: "sub-" + Date.now(),
      titleLine: {
        id: "line-" + Date.now(),
        text: "## New Subsection",
        type: LineType.section,
        isOutlineElement: true,
        sectionDepth: 2,
      },
      lines: [{ id: "empty-" + Date.now(), text: "", type: LineType.empty, isOutlineElement: false }],
    };

    const newBlocks = [...blocks];
    newBlocks.splice(insertIdx + 1, 0, newSub);
    updateAllBlocks(newBlocks);
  };

  const handleAddScene = (parentId: string, parentType: "section" | "subsection") => {
    const blocks = parseBlocks(parsedDoc.lines);
    const parentIdx = blocks.findIndex((b) => b.id === parentId);
    if (parentIdx === -1) return;

    let insertIdx = parentIdx;
    for (let i = parentIdx + 1; i < blocks.length; i++) {
      if (parentType === "subsection" && (blocks[i].type === "subsection" || blocks[i].type === "section")) break;
      if (parentType === "section" && (blocks[i].type === "subsection" || blocks[i].type === "section")) break;
      insertIdx = i;
    }

    const newScene: ScriptBlock = {
      type: "scene",
      id: "scene-" + Date.now(),
      titleLine: {
        id: "line-" + Date.now(),
        text: "INT. NEW SCENE - DAY",
        type: LineType.heading,
        isOutlineElement: true,
      },
      lines: [{ id: "empty-" + Date.now(), text: "", type: LineType.empty, isOutlineElement: false }],
    };

    const newBlocks = [...blocks];
    newBlocks.splice(insertIdx + 1, 0, newScene);
    updateAllBlocks(newBlocks);
  };

  const handleDeleteBlock = (blockId: string) => {
    const blocks = parseBlocks(parsedDoc.lines);
    const filtered = blocks.filter((b) => b.id !== blockId);
    updateAllBlocks(filtered);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        bgcolor: "background.default",
        overflow: "hidden",
      }}
    >
      {/* Board Scroll Container */}
      <Box
        ref={boardRef}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => handleDrop(e, "board", "board")}
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: sections.length <= 1 ? "column" : "row",
          p: 2,
          gap: 2,
          overflowX: sections.length <= 1 ? "hidden" : "auto",
          overflowY: sections.length <= 1 ? "auto" : "hidden",
          alignItems: "stretch",
        }}
      >
        {sections.map((section) => (
          <Paper
            key={section.id}
            elevation={2}
            draggable
            onDragStart={(e) => handleDragStart(e, section.id, "section")}
            onDragOver={(e) => {
              handleDragOver(e);
              if (draggedItem?.type === "scene" && !section.subsections.length && !section.orphanScenes.length) {
                setDragOverId(section.id);
                setDropPosition("after");
              }
            }}
            onDrop={(e) => handleDrop(e, section.id, "section")}
            sx={{
              width: sections.length <= 1 ? "100%" : 320,
              minWidth: sections.length <= 1 ? "100%" : 320,
              height: sections.length <= 1 ? "auto" : "100%",
              display: "flex",
              flexDirection: "column",
              bgcolor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: "8px",
              flexShrink: 0,
            }}
          >
            {/* Section Header */}
            <Box
              sx={{
                p: 2,
                borderBottom: "1px solid",
                borderColor: "divider",
                bgcolor: (theme) =>
                  theme.palette.mode === "light"
                    ? "rgba(0,0,0,0.02)"
                    : "rgba(255,255,255,0.02)",
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Box sx={{ flex: 1, mr: 1 }}>
                  <InlineEdit
                    variant="h6"
                    value={section.title}
                    onSave={(val) => updateLineText(section.block.titleLine.id, "# " + val)}
                    placeholder="Untitled Section"
                  />
                </Box>
                <IconButton size="small" onClick={() => handleDeleteBlock(section.id)}>
                  <DeleteIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
              <Box sx={{ mt: 1 }}>
                <InlineEdit
                  variant="body2"
                  multiline
                  value={section.synopsis}
                  onSave={(val) => updateBlockSynopsis(section.id, val)}
                  placeholder="Double click to edit synopsis..."
                />
              </Box>
            </Box>

            {/* Subsection List Container */}
            <Box
              className="column-scroll-container"
              onDragOver={(e) => {
                e.preventDefault();
                if (draggedItem?.type === "scene" && !section.subsections.length && !section.orphanScenes.length) {
                  setDragOverId(section.id);
                  setDropPosition("after");
                }
              }}
              sx={{
                flex: 1,
                overflowY: sections.length <= 1 ? "visible" : "auto",
                p: 1.5,
                display: "flex",
                flexDirection: sections.length <= 1 ? "row" : "column",
                flexWrap: sections.length <= 1 ? "wrap" : "nowrap",
                gap: 2,
              }}
            >
              {dragOverId === section.id && draggedItem?.id !== section.id && !section.orphanScenes.length && !section.subsections.length && renderPlaceholder()}
              
              {section.orphanScenes.map((scene) => (
                <React.Fragment key={scene.id}>
                  {dragOverId === scene.id && dropPosition === "before" && draggedItem?.id !== scene.id && renderPlaceholder()}
                  <Card
                    draggable
                    onDragStart={(e) => handleDragStart(e, scene.id, "scene")}
                    onDragOver={(e) => handleCardDragOver(e, scene.id)}
                    onDragLeave={handleDragLeave}
                    onDragEnd={handleDragEnd}
                    onDrop={(e) => handleDrop(e, scene.id, "scene")}
                    sx={{
                      border: scene.color ? `1px solid ${scene.color}` : "1px solid",
                      borderLeft: scene.color ? `5px solid ${scene.color}` : "1px solid",
                      borderColor: scene.color ? scene.color : "divider",
                      bgcolor: scene.color 
                        ? (theme) => `color-mix(in srgb, ${scene.color} 12%, ${theme.palette.background.default})`
                        : "background.default",
                      height: 150,
                      width: sections.length <= 1 ? "calc(33.33% - 11px)" : "100%",
                      minWidth: sections.length <= 1 ? 280 : "auto",
                      display: "flex",
                      flexDirection: "column",
                      flexShrink: 0,
                      opacity: draggedItem?.id === scene.id ? 0.4 : 1,
                      transition: "transform 0.15s ease, opacity 0.15s ease",
                    }}
                  >
                    <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 }, display: "flex", flexDirection: "column", height: "100%", boxSizing: "border-box" }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                        <Box sx={{ flex: 1, mr: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center" }}>
                          {scene.block.titleLine.sceneNumber && (
                            <Typography variant="caption" sx={{ mr: 1, color: "text.secondary", fontWeight: 700, bgcolor: "action.selected", px: 0.5, borderRadius: "3px" }}>
                              {scene.block.titleLine.sceneNumber}
                            </Typography>
                          )}
                          <InlineEdit
                            variant="subtitle2"
                            value={scene.title}
                            onSave={(val) => {
                              const isForced = scene.block.titleLine.text.startsWith(".");
                              const colorMatch = scene.block.titleLine.text.match(/\[\[(.*?)\]\]/);
                              const colorSuffix = colorMatch ? ` ${colorMatch[0]}` : "";
                              updateLineText(scene.block.titleLine.id, (isForced ? "." : "") + val + colorSuffix);
                            }}
                            placeholder="Untitled Scene"
                          />
                        </Box>
                        <IconButton size="small" onClick={() => handleDeleteBlock(scene.id)} sx={{ flexShrink: 0 }}>
                          <DeleteIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Box>
                      <Box sx={{ mt: 0.5, flex: 1, overflowY: "auto", pr: 0.5 }}>
                        <InlineEdit
                          variant="body2"
                          multiline
                          value={scene.synopsis}
                          onSave={(val) => updateBlockSynopsis(scene.id, val)}
                          placeholder="Double click to edit synopsis..."
                        />
                      </Box>
                    </CardContent>
                  </Card>
                  {dragOverId === scene.id && dropPosition === "after" && draggedItem?.id !== scene.id && renderPlaceholder()}
                </React.Fragment>
              ))}
              
              {section.id !== "virtual-section-default" && (
                <Button
                  size="small"
                  startIcon={<AddIcon sx={{ fontSize: 12 }} />}
                  onClick={() => handleAddScene(section.id, "section")}
                  sx={{ alignSelf: "flex-start", mt: -0.5, mb: 1, fontSize: "0.7rem" }}
                >
                  Add Scene
                </Button>
              )}

               {section.subsections.map((sub) => (
                <Box
                  key={sub.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, sub.id, "subsection")}
                  onDragOver={(e) => {
                    if (draggedItem?.type === "scene") {
                      handleCardDragOver(e, sub.id);
                    } else {
                      handleDragOver(e);
                    }
                  }}
                  onDrop={(e) => handleDrop(e, sub.id, "subsection")}
                  sx={{
                    p: 1.5,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: "6px",
                    flexShrink: 0,
                    width: "100%",
                    bgcolor: (theme) =>
                      theme.palette.mode === "light"
                        ? "rgba(0,0,0,0.01)"
                        : "rgba(255,255,255,0.01)",
                  }}
                >
                  <Box
                    sx={{
                      position: "sticky",
                      top: -12,
                      zIndex: 2,
                      bgcolor: "background.paper",
                      mx: -1.5,
                      mt: -1.5,
                      px: 1.5,
                      py: 1,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      mb: 1.5,
                    }}
                  >
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                      <Box sx={{ flex: 1, mr: 1 }}>
                        <InlineEdit
                          variant="subtitle2"
                          value={sub.title}
                          onSave={(val) => updateLineText(sub.block.titleLine.id, "## " + val)}
                          placeholder="New Subsection"
                        />
                      </Box>
                      <IconButton size="small" onClick={() => handleDeleteBlock(sub.id)}>
                        <DeleteIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Box>
                    <InlineEdit
                      variant="body2"
                      multiline
                      value={sub.synopsis}
                      onSave={(val) => updateBlockSynopsis(sub.id, val)}
                      placeholder="Double click to edit synopsis..."
                    />
                  </Box>

                  {/* Scenes under this Subsection */}
                  <Box
                    onDragOver={(e) => {
                      if (draggedItem?.type === "scene" && !sub.scenes.length) {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragOverId(sub.id);
                        setDropPosition("after");
                      }
                    }}
                    onDrop={(e) => {
                      if (draggedItem?.type === "scene" && !sub.scenes.length) {
                        handleDrop(e, sub.id, "subsection");
                      }
                    }}
                    sx={{ 
                      display: "flex", 
                      flexDirection: sections.length <= 1 ? "row" : "column",
                      flexWrap: sections.length <= 1 ? "wrap" : "nowrap",
                      gap: 1,
                      minHeight: draggedItem?.type === "scene" && !sub.scenes.length ? 50 : "auto",
                      border: draggedItem?.type === "scene" && !sub.scenes.length && dragOverId === sub.id ? "2px dashed var(--accent-color)" : "none",
                      borderRadius: "8px",
                      p: draggedItem?.type === "scene" && !sub.scenes.length ? 1 : 0,
                    }}
                  >
                    {dragOverId === sub.id && draggedItem?.id !== sub.id && !sub.scenes.length && renderPlaceholder(sections.length <= 1 ? "calc(33.33% - 8px)" : "100%")}
                    {sub.scenes.map((scene) => (
                      <React.Fragment key={scene.id}>
                        {dragOverId === scene.id && dropPosition === "before" && draggedItem?.id !== scene.id && renderPlaceholder(sections.length <= 1 ? "calc(33.33% - 8px)" : "100%")}
                        <Card
                          draggable
                          onDragStart={(e) => handleDragStart(e, scene.id, "scene")}
                          onDragOver={(e) => handleCardDragOver(e, scene.id)}
                          onDragLeave={handleDragLeave}
                          onDragEnd={handleDragEnd}
                          onDrop={(e) => handleDrop(e, scene.id, "scene")}
                          sx={{
                            border: scene.color ? `1px solid ${scene.color}` : "1px solid",
                            borderLeft: scene.color ? `5px solid ${scene.color}` : "1px solid",
                            borderColor: scene.color ? scene.color : "divider",
                            bgcolor: scene.color 
                              ? (theme) => `color-mix(in srgb, ${scene.color} 12%, ${theme.palette.background.default})`
                              : "background.default",
                            height: 150,
                            width: sections.length <= 1 ? "calc(33.33% - 8px)" : "100%",
                            minWidth: sections.length <= 1 ? 280 : "auto",
                            display: "flex",
                            flexDirection: "column",
                            flexShrink: 0,
                            opacity: draggedItem?.id === scene.id ? 0.4 : 1,
                            transition: "transform 0.15s ease, opacity 0.15s ease",
                            "&:hover": {
                              boxShadow: 2,
                            },
                          }}
                        >
                          <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 }, display: "flex", flexDirection: "column", height: "100%", boxSizing: "border-box" }}>
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                              <Box sx={{ flex: 1, mr: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center" }}>
                                {scene.block.titleLine.sceneNumber && (
                                  <Typography variant="caption" sx={{ mr: 1, color: "text.secondary", fontWeight: 700, bgcolor: "action.selected", px: 0.5, borderRadius: "3px" }}>
                                    {scene.block.titleLine.sceneNumber}
                                  </Typography>
                                )}
                                <InlineEdit
                                  variant="subtitle2"
                                  value={scene.title}
                                  onSave={(val) => {
                                    const isForced = scene.block.titleLine.text.startsWith(".");
                                    const colorMatch = scene.block.titleLine.text.match(/\[\[(.*?)\]\]/);
                                    const colorSuffix = colorMatch ? ` ${colorMatch[0]}` : "";
                                    updateLineText(scene.block.titleLine.id, (isForced ? "." : "") + val + colorSuffix);
                                  }}
                                  placeholder="Untitled Scene"
                                />
                              </Box>
                              <IconButton size="small" onClick={() => handleDeleteBlock(scene.id)} sx={{ flexShrink: 0 }}>
                                <DeleteIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Box>
                            <Box sx={{ mt: 0.5, flex: 1, overflowY: "auto", pr: 0.5 }}>
                              <InlineEdit
                                variant="body2"
                                multiline
                                value={scene.synopsis}
                                onSave={(val) => updateBlockSynopsis(scene.id, val)}
                                placeholder="Double click to edit synopsis..."
                              />
                            </Box>
                          </CardContent>
                        </Card>
                        {dragOverId === scene.id && dropPosition === "after" && draggedItem?.id !== scene.id && renderPlaceholder()}
                      </React.Fragment>
                    ))}

                    <Button
                      size="small"
                      startIcon={<AddIcon sx={{ fontSize: 12 }} />}
                      onClick={() => handleAddScene(sub.id, "subsection")}
                      sx={{ alignSelf: "flex-start", mt: 1, fontSize: "0.7rem" }}
                    >
                      Add Scene
                    </Button>
                  </Box>
                </Box>
              ))}
            </Box>

            {/* Subsection addition at bottom of column */}
            <Box sx={{ p: 1.5, borderTop: "1px solid", borderColor: "divider" }}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => handleAddSubsection(section.id)}
                sx={{ fontSize: "0.75rem", py: 0.8 }}
              >
                Add Subsection
              </Button>
            </Box>
          </Paper>
        ))}

        {/* Add Section Column */}
        <Box
          sx={{
            width: 320,
            minWidth: 320,
            height: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px dashed",
            borderColor: "divider",
            borderRadius: "8px",
            cursor: "pointer",
            flexShrink: 0,
            "&:hover": {
              borderColor: "primary.main",
              bgcolor: "action.hover",
            },
          }}
          onClick={handleAddSection}
        >
          <Button startIcon={<AddIcon />}>Add Section</Button>
        </Box>
      </Box>

    </Box>
  );
};
