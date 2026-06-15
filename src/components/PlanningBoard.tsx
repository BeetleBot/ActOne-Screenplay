import React, { useState, useMemo, useCallback, useEffect, createContext, useContext } from "react";
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
import { AddIcon, DeleteIcon, DragHandleIcon } from "./Icons";
import {
  DndContext,
  useSensor,
  useSensors,
  PointerSensor,
  useDroppable,
  DragOverlay,
  pointerWithin,
  type DragStartEvent,
  type DragEndEvent,
  type DragCancelEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { snapCenterToCursor } from "@dnd-kit/modifiers";

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
  variant?: "h6" | "subtitle1" | "subtitle2" | "body2" | "caption";
  multiline?: boolean;
  style?: React.CSSProperties;
  placeholder?: string;
}

type DragItemType = "scene" | "subsection" | "section";

interface BoardActions {
  updateLineText: (lineId: string, text: string) => void;
  updateBlockSynopsis: (blockId: string, text: string) => void;
  updateAllBlocks: (blocks: ScriptBlock[]) => void;
  deleteBlock: (blockId: string) => void;
  addScene: (parentId: string, parentType: "section" | "subsection") => void;
  addSubsection: (sectionId: string) => void;
}

const BoardActionsContext = createContext<BoardActions | null>(null);

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

  const typographyVariant = variant === "h6" ? "h6" : variant === "subtitle1" ? "subtitle1" : variant === "subtitle2" ? "subtitle2" : variant === "caption" ? "caption" : "body2";

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

function EmptyZone({ containerId }: { containerId: string }) {
  const { setNodeRef, isOver } = useDroppable({ id: `drop-${containerId}-empty`, data: { type: "section-container", containerId } });
  return (
    <Box
      ref={setNodeRef}
      sx={{
        height: isOver ? 130 : 0,
        border: isOver ? "2px dashed var(--accent-color)" : "none",
        borderRadius: "8px",
        bgcolor: isOver ? "rgba(0, 0, 0, 0.03)" : "transparent",
        transition: "all 0.12s ease",
        flexShrink: 0,
        pointerEvents: "none",
      }}
    />
  );
}

const springEasing = "250ms cubic-bezier(0.34, 1.56, 0.64, 1)";

function SortableSceneCard({ scene, containerId, singleCol }: { scene: BoardScene; containerId: string; singleCol: boolean }) {
  const actions = useContext(BoardActionsContext);
  const { setNodeRef, setActivatorNodeRef, listeners, attributes, transform, isDragging } = useSortable({
    id: scene.id,
    data: { type: "scene", containerId, title: scene.title, synopsis: scene.synopsis, color: scene.color },
  });

  const style = { transform: CSS.Transform.toString(transform), transition: springEasing, opacity: isDragging ? 0.3 : 1 };
  const width = singleCol ? "calc(33.33% - 11px)" : "100%";

  const handleSaveTitle = (val: string) => {
    if (!actions) return;
    const lineId = scene.block.titleLine.id;
    const isForced = scene.block.titleLine.text.startsWith(".");
    const colorMatch = scene.block.titleLine.text.match(/\[\[(.*?)\]\]/);
    const colorSuffix = colorMatch ? ` ${colorMatch[0]}` : "";
    actions.updateLineText(lineId, (isForced ? "." : "") + val + colorSuffix);
  };

  const handleSaveSynopsis = (val: string) => {
    if (!actions) return;
    actions.updateBlockSynopsis(scene.id, val);
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      sx={{
        border: scene.color ? `1px solid ${scene.color}` : "1px solid",
        borderLeft: scene.color ? `5px solid ${scene.color}` : "1px solid",
        borderColor: scene.color ? scene.color : "divider",
        bgcolor: scene.color
          ? (theme: any) => `color-mix(in srgb, ${scene.color} 12%, ${theme.palette.background.default})`
          : "background.default",
        height: 130,
        width,
        minWidth: singleCol ? 280 : "auto",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      <CardContent sx={{ p: 1, "&:last-child": { pb: 1 }, display: "flex", flexDirection: "column", height: "100%", boxSizing: "border-box" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <span ref={setActivatorNodeRef} {...listeners} {...attributes} style={{ display: "inline-flex", cursor: "grab", marginRight: 4, flexShrink: 0 }}>
            <DragHandleIcon sx={{ fontSize: 16, opacity: 0.35, "&:hover": { opacity: 0.8 } }} />
          </span>
          <Box sx={{ flex: 1, mr: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center" }}>
            {scene.block.titleLine.sceneNumber && (
              <Typography variant="caption" sx={{ mr: 1, color: "text.secondary", fontWeight: 700, bgcolor: "action.selected", px: 0.5, borderRadius: "3px" }}>
                {scene.block.titleLine.sceneNumber}
              </Typography>
            )}
            <InlineEdit
              variant="body2"
              value={scene.title}
              onSave={handleSaveTitle}
              placeholder="Untitled Scene"
            />
          </Box>
          <IconButton size="small" onClick={() => actions?.deleteBlock(scene.id)} sx={{ flexShrink: 0 }}>
            <DeleteIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>
        <Box sx={{ mt: 0.5, flex: 1, overflowY: "auto", pr: 0.5 }}>
          <InlineEdit
            variant="caption"
            multiline
            value={scene.synopsis}
            onSave={handleSaveSynopsis}
            placeholder="Double click to edit synopsis..."
          />
        </Box>
      </CardContent>
    </Card>
  );
}

function SortableSubsection({ sub, containerId, singleCol }: { sub: BoardSubsection; containerId: string; singleCol: boolean }) {
  const actions = useContext(BoardActionsContext);
  const { setNodeRef, setActivatorNodeRef, listeners, attributes, transform, isDragging } = useSortable({
    id: sub.id,
    data: { type: "subsection", containerId, title: sub.title, synopsis: sub.synopsis },
  });

  const { setNodeRef: subDropRef, isOver: subDropOver } = useDroppable({
    id: `sub-${sub.id}-drop`,
    data: { type: "subsection-container", containerId: sub.id },
  });

  const style = { transform: CSS.Transform.toString(transform), transition: springEasing, opacity: isDragging ? 0.3 : 1 };
  const subSceneIds = useMemo(() => sub.scenes.map(s => s.id), [sub.scenes]);

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        p: 1,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: "6px",
        flexShrink: 0,
        width: "100%",
        bgcolor: (theme: any) =>
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
          <span ref={setActivatorNodeRef} {...listeners} {...attributes} style={{ display: "inline-flex", cursor: "grab", marginRight: 4, flexShrink: 0 }}>
            <DragHandleIcon sx={{ fontSize: 16, opacity: 0.35, "&:hover": { opacity: 0.8 } }} />
          </span>
          <Box sx={{ flex: 1, mr: 1 }}>
            <InlineEdit
              variant="subtitle2"
              value={sub.title}
              onSave={(val) => actions?.updateLineText(sub.block.titleLine.id, "## " + val)}
              placeholder="New Subsection"
            />
          </Box>
          <IconButton size="small" onClick={() => actions?.deleteBlock(sub.id)}>
            <DeleteIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>
        <InlineEdit
          variant="body2"
          multiline
          value={sub.synopsis}
          onSave={(val) => actions?.updateBlockSynopsis(sub.id, val)}
          placeholder="Double click to edit synopsis..."
        />
      </Box>

      <Box
        ref={subDropRef}
        sx={{
          border: subDropOver ? 2 : 0,
          borderColor: "primary.main",
          borderRadius: "4px",
          transition: "border 150ms ease",
          minHeight: sub.scenes.length === 0 ? 80 : 0,
        }}
      >
        <SortableContext items={subSceneIds} strategy={singleCol ? rectSortingStrategy : verticalListSortingStrategy}>
          <Box
            sx={{
              display: "flex",
              flexDirection: singleCol ? "row" : "column",
              flexWrap: singleCol ? "wrap" : "nowrap",
              gap: 0.75,
            }}
          >
            {sub.scenes.length === 0 && <EmptyZone containerId={sub.id} />}
            {sub.scenes.map((scene) => (
              <SortableSceneCard key={scene.id} scene={scene} containerId={sub.id} singleCol={singleCol} />
            ))}
            <Button
              size="small"
              startIcon={<AddIcon sx={{ fontSize: 12 }} />}
              onClick={() => actions?.addScene(sub.id, "subsection")}
              sx={{ alignSelf: "flex-start", mt: 1, fontSize: "0.7rem" }}
            >
              Add Scene
            </Button>
          </Box>
        </SortableContext>
      </Box>
    </Box>
  );
}

function SectionColumn({ section, itemIds, singleCol }: { section: BoardSection; itemIds: string[]; singleCol: boolean }) {
  const actions = useContext(BoardActionsContext);
  const { setNodeRef, isOver } = useDroppable({
    id: section.id,
    data: { type: "section-container", containerId: section.id },
  });

  return (
    <Paper
      elevation={2}
      sx={{
        width: singleCol ? "100%" : 320,
        minWidth: singleCol ? "100%" : 320,
        height: singleCol ? "auto" : "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: isOver ? "primary.main" : "divider",
        borderRadius: "8px",
        flexShrink: 0,
      }}
    >
      <Box
        sx={{
          p: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: (theme: any) =>
            theme.palette.mode === "light"
              ? "rgba(0,0,0,0.02)"
              : "rgba(255,255,255,0.02)",
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Box sx={{ flex: 1, mr: 1 }}>
            <InlineEdit
              variant="subtitle1"
              value={section.title}
              onSave={(val) => actions?.updateLineText(section.block.titleLine.id, "# " + val)}
              placeholder="Untitled Section"
            />
          </Box>
          {section.id !== "virtual-section-default" && (
            <IconButton size="small" onClick={() => actions?.deleteBlock(section.id)}>
              <DeleteIcon sx={{ fontSize: 16 }} />
            </IconButton>
          )}
        </Box>
        <Box sx={{ mt: 1 }}>
          <InlineEdit
            variant="body2"
            multiline
            value={section.synopsis}
            onSave={(val) => actions?.updateBlockSynopsis(section.id, val)}
            placeholder="Double click to edit synopsis..."
          />
        </Box>
      </Box>

      <Box
        ref={setNodeRef}
        sx={{
          flex: 1,
          overflowY: singleCol ? "visible" : "auto",
          p: 1.5,
          display: "flex",
          flexDirection: singleCol ? "row" : "column",
          flexWrap: singleCol ? "wrap" : "nowrap",
          gap: 1.5,
        }}
      >
        <SortableContext items={itemIds} strategy={singleCol ? rectSortingStrategy : verticalListSortingStrategy}>
          {itemIds.length === 0 && <EmptyZone containerId={section.id} />}
          {section.orphanScenes.map((scene) => (
            <SortableSceneCard key={scene.id} scene={scene} containerId={section.id} singleCol={singleCol} />
          ))}
          {section.subsections.map((sub) => (
            <SortableSubsection key={sub.id} sub={sub} containerId={section.id} singleCol={singleCol} />
          ))}
        </SortableContext>
        {section.id !== "virtual-section-default" && (
          <Button
            size="small"
            startIcon={<AddIcon sx={{ fontSize: 12 }} />}
            onClick={() => actions?.addScene(section.id, "section")}
            sx={{ alignSelf: "flex-start", mt: -0.5, mb: 1, fontSize: "0.7rem" }}
          >
            Add Scene
          </Button>
        )}
      </Box>

      <Box sx={{ p: 1.5, borderTop: "1px solid", borderColor: "divider" }}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => actions?.addSubsection(section.id)}
          sx={{ fontSize: "0.75rem", py: 0.8 }}
        >
          Add Subsection
        </Button>
      </Box>
    </Paper>
  );
}

export const PlanningBoard: React.FC = () => {
  const { parsedDoc } = useFile();
  const { updateLineText, updateBlockSynopsis, updateAllBlocks } = useEditor();
  const [activeItem, setActiveItem] = useState<{ type: DragItemType; title: string; synopsis: string; color?: string } | null>(null);
  const [dragBlocks, setDragBlocks] = useState<ScriptBlock[] | null>(null);

  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 5 } });
  const sensors = useSensors(pointerSensor);

  const actions: BoardActions = useMemo(() => ({
    updateLineText,
    updateBlockSynopsis,
    updateAllBlocks,
    deleteBlock: (blockId: string) => {
      const blocks = parseBlocks(parsedDoc.lines);
      updateAllBlocks(blocks.filter((b) => b.id !== blockId));
    },
    addScene: (parentId, parentType) => {
      const blocks = parseBlocks(parsedDoc.lines);
      const parentIdx = blocks.findIndex((b) => b.id === parentId);
      if (parentIdx === -1) return;
      let insertIdx = parentIdx;
      for (let i = parentIdx + 1; i < blocks.length; i++) {
        if (parentType === "subsection" && (blocks[i].type === "subsection" || blocks[i].type === "section")) break;
        if (parentType === "section" && (blocks[i].type === "subsection" || blocks[i].type === "section")) break;
        insertIdx = i;
      }
      const newBlock: ScriptBlock = {
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
      newBlocks.splice(insertIdx + 1, 0, newBlock);
      updateAllBlocks(newBlocks);
    },
    addSubsection: (sectionId) => {
      const blocks = parseBlocks(parsedDoc.lines);
      const sectionIdx = blocks.findIndex((b) => b.id === sectionId);
      if (sectionIdx === -1) return;
      let insertIdx = sectionIdx;
      for (let i = sectionIdx + 1; i < blocks.length; i++) {
        if (blocks[i].type === "section") break;
        insertIdx = i;
      }
      const newBlock: ScriptBlock = {
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
      newBlocks.splice(insertIdx + 1, 0, newBlock);
      updateAllBlocks(newBlocks);
    },
  }), [updateLineText, updateBlockSynopsis, updateAllBlocks, parsedDoc.lines]);

  const activeBlocks = useMemo(() => {
    return dragBlocks || parseBlocks(parsedDoc.lines);
  }, [dragBlocks, parsedDoc.lines]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as { type?: DragItemType; title?: string; synopsis?: string; color?: string } | undefined;
    if (data?.type) {
      setActiveItem({ type: data.type, title: data.title || "", synopsis: data.synopsis || "", color: data.color });
    }
    setDragBlocks(parseBlocks(parsedDoc.lines));
  }, [parsedDoc.lines]);

  const handleDragOver = useCallback((event: any) => {
    const { active, over } = event;
    if (!over) return;
    if (active.id === over.id) return;

    const activeData = active.data.current as { type?: DragItemType } | undefined;
    if (!activeData?.type) return;

    setDragBlocks((prev) => {
      const current = prev || parseBlocks(parsedDoc.lines);
      const activeIdStr = active.id as string;
      const overId = over.id as string;

      const draggedIdx = current.findIndex((b) => b.id === activeIdStr);
      if (draggedIdx === -1) return current;

      const overData = over.data.current as { type?: string; containerId?: string } | undefined;
      const overType = overData?.type;

      let targetIdx = current.findIndex((b) => b.id === overId);
      if (overType === "section-container" || overType === "subsection-container") {
        const containerId = overData?.containerId || overId;
        const containerBlockIdx = current.findIndex((b) => b.id === containerId);
        if (containerBlockIdx !== -1) {
          targetIdx = containerBlockIdx + 1;
        }
      }

      if (targetIdx !== -1) {
        return arrayMove(current, draggedIdx, targetIdx);
      }
      return current;
    });
  }, [parsedDoc.lines]);

  const handleDragEnd = useCallback((_event: DragEndEvent) => {
    setActiveItem(null);
    if (dragBlocks) {
      updateAllBlocks(dragBlocks);
    }
    setDragBlocks(null);
  }, [dragBlocks, updateAllBlocks]);

  const handleDragCancel = useCallback((_event: DragCancelEvent) => {
    setActiveItem(null);
    setDragBlocks(null);
  }, []);

  const { sections } = useMemo(() => {
    const blocks = activeBlocks;
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
  }, [activeBlocks]);

  const singleCol = sections.length <= 1;

  const sectionSceneIds = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const section of sections) {
      map[section.id] = [
        ...section.orphanScenes.map(s => s.id),
        ...section.subsections.map(s => s.id),
      ];
    }
    return map;
  }, [sections]);

  return (
    <BoardActionsContext.Provider value={actions}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          bgcolor: "background.default",
          overflow: "hidden",
        }}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: singleCol ? "column" : "row",
              p: 2,
              gap: 2,
              overflowX: singleCol ? "hidden" : "auto",
              overflowY: singleCol ? "auto" : "hidden",
              alignItems: "stretch",
            }}
          >
            {sections.map((section) => (
              <SectionColumn
                key={section.id}
                section={section}
                itemIds={sectionSceneIds[section.id] || []}
                singleCol={singleCol}
              />
            ))}
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
                "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
              }}
              onClick={() => {
                const blocks = parseBlocks(parsedDoc.lines);
                const newBlock: ScriptBlock = {
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
                updateAllBlocks([...blocks, newBlock]);
              }}
            >
              <Button startIcon={<AddIcon />}>Add Section</Button>
            </Box>
          </Box>
          <DragOverlay modifiers={[snapCenterToCursor]}>
            {activeItem && (
              <Paper
                elevation={8}
                sx={{
                  width: 280,
                  height: 130,
                  display: "flex",
                  flexDirection: "column",
                  p: 1,
                  border: 2,
                  borderColor: "primary.main",
                  boxSizing: "border-box",
                  pointerEvents: "none",
                }}
              >
                <Typography variant="body2" noWrap sx={{ fontWeight: 600, mb: 0.5 }}>
                  {activeItem.title}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    lineHeight: 1.4,
                  }}
                >
                  {activeItem.synopsis || "Double click to edit synopsis..."}
                </Typography>
              </Paper>
            )}
          </DragOverlay>
        </DndContext>
      </Box>
    </BoardActionsContext.Provider>
  );
};
