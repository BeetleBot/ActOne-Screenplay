import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useFile, useEditor, useScriptEditor, useCursor } from "../context";
import { LineType, ParsedLine } from "../parser";
import { getSceneTitle } from "../utils/text";
import { MoreVertIcon, SearchIcon, CloseIcon, KeyboardArrowDownIcon, DragHandleIcon, TuneIcon, InfoOutlinedIcon } from "./Icons";

import { isProseScript } from "../utils/scriptMode";

import {
  Box,
  Typography,
  IconButton,
  TextField,
  Chip,
  Menu,
  MenuItem,
  List,
  ListItemButton,
  ListItemText,
  Popover,
  Grid,
  Badge,
  Tooltip,
} from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";

export interface OutlineTagProps {
  label: React.ReactNode;
  variant?: "default" | "accent";
  size?: string;
  sx?: SxProps<Theme>;
}

export const OutlineTag: React.FC<OutlineTagProps> = ({
  label,
  variant = "default",
  size = "0.7rem",
  sx,
}) => {
  const isAccent = variant === "accent";
  return (
    <Typography
      variant="caption"
      component="span"
      sx={{
        bgcolor: isAccent
          ? "color-mix(in srgb, var(--button-color) 12%, transparent)"
          : "color-mix(in srgb, var(--text-main) 10%, transparent)",
        border: "1px solid",
        borderColor: isAccent
          ? "color-mix(in srgb, var(--button-color) 25%, transparent)"
          : "color-mix(in srgb, var(--text-main) 20%, transparent)",
        color: isAccent ? "var(--button-color)" : "text.primary",
        px: 0.6,
        py: 0.15,
        borderRadius: 0,
        fontSize: size,
        fontWeight: 700,
        fontFamily: "var(--font-ui)",
        letterSpacing: "0.03em",
        lineHeight: 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 18,
        textAlign: "center",
        whiteSpace: "nowrap",
        flexShrink: 0,
        ...sx,
      }}
    >
      {label}
    </Typography>
  );
};

export interface ProseHeadingItem {
  id: string;
  level: number;
  title: string;
  lineNumber: number;
}

export function parseProseHeadings(text: string): ProseHeadingItem[] {
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const headings: ProseHeadingItem[] = [];
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      headings.push({
        id: `prose-heading-${i}`,
        level: match[1].length,
        title: match[2].trim(),
        lineNumber: i,
      });
    }
  }
  return headings;
}

export function getSceneColor(line: ParsedLine): string | undefined {
  if (line.color) {
    return line.color.startsWith("#") ? line.color : `var(--scene-color-${line.color})`;
  }
  return undefined;
}

export { getSceneTitle };

export interface OutlineItem {
  line: ParsedLine;
  index: number;
}

export interface TreeNode {
  item: OutlineItem;
  depth: number;
  children: TreeNode[];
  synopses: OutlineItem[];
}

export function buildTree(items: OutlineItem[], collapsed: { [id: string]: boolean }): TreeNode[] {
  const root: TreeNode[] = [];
  const stack: { node: TreeNode; sectionDepth: number }[] = [];
  let lastNonSynopsisNode: TreeNode | null = null;

  for (const item of items) {
    const isSection = item.line.type === LineType.section;
    const sDepth = item.line.sectionDepth || 0;

    if (isSection) {
      while (stack.length > 0 && stack[stack.length - 1].sectionDepth >= sDepth) {
        stack.pop();
      }
      const node: TreeNode = {
        item,
        depth: stack.length,
        children: [],
        synopses: [],
      };
      if (stack.length > 0) {
        stack[stack.length - 1].node.children.push(node);
      } else {
        root.push(node);
      }
      if (!collapsed[item.line.id]) {
        stack.push({ node, sectionDepth: sDepth });
      }
      lastNonSynopsisNode = node;
    } else if (item.line.type === LineType.synopse) {
      if (lastNonSynopsisNode) {
        lastNonSynopsisNode.synopses.push(item);
      } else {
        root.push({ item, depth: 0, children: [], synopses: [] });
      }
    } else {
      const node: TreeNode = {
        item,
        depth: stack.length,
        children: [],
        synopses: [],
      };
      if (stack.length > 0) {
        stack[stack.length - 1].node.children.push(node);
      } else {
        root.push(node);
      }
      lastNonSynopsisNode = node;
    }
  }
  return root;
}

export function flattenSelectable(tree: TreeNode[]): TreeNode[] {
  const result: TreeNode[] = [];
  const walk = (nodes: TreeNode[]) => {
    for (const node of nodes) {
      result.push(node);
      walk(node.children);
    }
  };
  walk(tree);
  return result;
}

export const OutlineView = React.memo(() => {
  const { parsedDoc, rawText, files, activeFileId, activeScriptIndex, filePath } = useFile();
  const { scrollToLine } = useEditor();
  const { reorderScenes } = useScriptEditor();
  const { activeLineNumber, setSelectedSceneId } = useCursor();

  const activeFile = files?.find((f) => f.id === activeFileId);
  const activeScript = activeFile?.scripts?.[activeFile.activeScriptIndex ?? activeScriptIndex ?? 0];
  const isProse = isProseScript(activeScript, filePath || activeFile?.filePath);
  const proseText = activeScript?.content ?? rawText ?? "";

  const [collapsedSections, setCollapsedSections] = useState<{ [id: string]: boolean }>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [showSections, setShowSections] = useState(true);
  const [showScenes, setShowScenes] = useState(true);
  const [showSynopses, setShowSynopses] = useState(false);
  const [showStorylines, setShowStorylines] = useState(true);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedStoryline, setSelectedStoryline] = useState<string | null>(null);
  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLButtonElement | null>(null);
  const activeFilterCount = (selectedColor ? 1 : 0) + (selectedStoryline ? 1 : 0);
  const [outlineFontSize, setOutlineFontSizeState] = useState<"small" | "normal" | "large">(
    () => (localStorage.getItem("actone-outline-font-size") as 'small' | 'normal' | 'large' | null) ?? "normal"
  );
  const [draggedItemIdx, setDraggedItemIdx] = useState<number | null>(null);
  const [dragOverItemIdx, setDragOverItemIdx] = useState<number | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLDivElement>(null);
  const mouseDragRef = useRef<number | null>(null);
  const mouseOverRef = useRef<number | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);

  const proseHeadings = useMemo(() => {
    if (!isProse) return [];
    return parseProseHeadings(proseText);
  }, [isProse, proseText]);

  const filteredProseHeadings = useMemo(() => {
    if (!searchQuery.trim()) return proseHeadings;
    const q = searchQuery.toLowerCase();
    return proseHeadings.filter((h) => h.title.toLowerCase().includes(q));
  }, [proseHeadings, searchQuery]);

  const activeProseHeadingIdx = useMemo(() => {
    if (filteredProseHeadings.length === 0) return -1;
    let found = -1;
    for (let i = 0; i < filteredProseHeadings.length; i++) {
      if (filteredProseHeadings[i].lineNumber <= activeLineNumber) {
        found = i;
      } else {
        break;
      }
    }
    return found;
  }, [filteredProseHeadings, activeLineNumber]);

  const setOutlineFontSize = (size: "small" | "normal" | "large") => {
    setOutlineFontSizeState(size);
    localStorage.setItem("actone-outline-font-size", size);
  };

  const toggleSection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Signature key that only changes when structural outline elements (Headings, Sections, Synopses, Storylines, Colors) change
  const outlineSignature = useMemo(() => {
    if (isProse) return "";
    let sig = "";
    const lines = parsedDoc.lines;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (l.isOutlineElement || l.type === LineType.synopse) {
        sig += `${i}:${l.id}:${l.type}:${l.sectionDepth || 0}:${l.color || ""}:${l.storylines ? l.storylines.join(",") : ""}:${l.text};`;
      }
    }
    return sig;
  }, [isProse, parsedDoc.lines]);

  // Build raw items based on outlineSignature so standard dialogue/action typing does not recreate this array
  const rawOutlineItems: OutlineItem[] = useMemo(
    () => parsedDoc.lines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => line.isOutlineElement || line.type === LineType.synopse),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [outlineSignature]
  );

  // Scenes-only list for drag-and-drop indexing
  const scenesItems = useMemo(
    () => rawOutlineItems.filter(
      (item) => item.line.type === LineType.heading ||
        (item.line.isOutlineElement && item.line.type !== LineType.section && item.line.type !== LineType.synopse)
    ),
    [rawOutlineItems]
  );

  const colorStats = useMemo(() => {
    const stats: { [color: string]: number } = {};
    rawOutlineItems.forEach(({ line }) => {
      const isSection = line.type === LineType.section;
      const isSynopsis = line.type === LineType.synopse;
      const isScene = !isSection && !isSynopsis;
      if (isScene && line.color) {
        stats[line.color] = (stats[line.color] || 0) + 1;
      }
    });
    return stats;
  }, [rawOutlineItems]);

  const storylineStats = useMemo(() => {
    const stats: { [storyline: string]: number } = {};
    rawOutlineItems.forEach(({ line }) => {
      if (line.storylines) {
        line.storylines.forEach((sl) => {
          stats[sl] = (stats[sl] || 0) + 1;
        });
      }
    });
    return stats;
  }, [rawOutlineItems]);

  // Filter + collapse
  const visibleItems: OutlineItem[] = useMemo(() => {
    const getSynopsisPrecedingScene = (rawIdx: number) => {
      for (let j = rawIdx - 1; j >= 0; j--) {
        const l = rawOutlineItems[j].line;
        if (l.type === LineType.heading) return l;
        if (l.type === LineType.section) return null;
      }
      return null;
    };

    const filtered = rawOutlineItems.filter((item, rawIdx) => {
      const isSection = item.line.type === LineType.section;
      const isSynopsis = item.line.type === LineType.synopse;
      const isScene = !isSection && !isSynopsis;
      if (!showSections && isSection) return false;
      if (!showScenes && isScene) return false;
      if (!showSynopses && isSynopsis) return false;

      let itemColor = isScene ? item.line.color : undefined;
      let itemStorylines = isScene ? item.line.storylines : undefined;

      if (isSynopsis) {
        const parentScene = getSynopsisPrecedingScene(rawIdx);
        if (parentScene) {
          itemColor = parentScene.color;
          itemStorylines = parentScene.storylines;
        }
      }

      if (selectedColor && (isScene || isSynopsis) && itemColor !== selectedColor) {
        return false;
      }

      if (selectedStoryline && (isScene || isSynopsis) && (!itemStorylines || !itemStorylines.includes(selectedStoryline))) {
        return false;
      }

      if (searchQuery) {
        const textToSearch = item.line.text.replace(/^[.#= ]+/, "").trim().toLowerCase();
        if (!textToSearch.includes(searchQuery.toLowerCase())) return false;
      }
      return true;
    });

    const result: OutlineItem[] = [];
    let isCollapsed = false;
    let collapseDepth = 0;
    for (const item of filtered) {
      const isSection = item.line.type === LineType.section;
      const depth = item.line.sectionDepth || 0;
      if (isCollapsed) {
        if (isSection && depth <= collapseDepth) {
          isCollapsed = false;
        } else {
          continue;
        }
      }
      result.push(item);
      if (isSection && collapsedSections[item.line.id]) {
        isCollapsed = true;
        collapseDepth = depth;
      }
    }
    return result;
  }, [rawOutlineItems, showSections, showScenes, showSynopses, searchQuery, collapsedSections, selectedColor, selectedStoryline]);

  const tree = useMemo(() => buildTree(visibleItems, collapsedSections), [visibleItems, collapsedSections]);
  const selectable = useMemo(() => flattenSelectable(tree), [tree]);

  const selectableMap = useMemo(() => {
    const map = new Map<string, number>();
    selectable.forEach((node, idx) => {
      if (node?.item?.line?.id) {
        map.set(node.item.line.id, idx);
      }
    });
    return map;
  }, [selectable]);

  let activeSelectableIdx = -1;
  if (activeLineNumber >= 0 && activeLineNumber < parsedDoc.lines.length) {
    if (parsedDoc.lineToSceneMap) {
      const activeSceneId = parsedDoc.lineToSceneMap[activeLineNumber];
      if (activeSceneId) {
        const found = selectableMap.get(activeSceneId);
        if (found !== undefined) activeSelectableIdx = found;
      }
    }
    if (activeSelectableIdx === -1) {
      for (let i = activeLineNumber; i >= 0; i--) {
        const line = parsedDoc.lines[i];
        if (line.isOutlineElement && line.type !== LineType.synopse) {
          const found = selectableMap.get(line.id);
          if (found !== undefined) { activeSelectableIdx = found; break; }
        }
      }
    }
  }
  if (activeSelectableIdx === -1 && selectable.length > 0) activeSelectableIdx = 0;

  // Scroll active into view
  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ behavior: "auto", block: "nearest" });
    }
  }, [activeSelectableIdx]);

  // Auto-focus on mount
  useEffect(() => {
    if (listRef.current) {
      listRef.current.focus();
    }
  }, []);

  const dragCleanupRef = useRef<{ onMove?: (e: MouseEvent) => void; onUp?: () => void }>({});

  // Cleanup drag listeners on unmount
  useEffect(() => {
    return () => {
      if (dragCleanupRef.current.onMove) {
        document.removeEventListener("mousemove", dragCleanupRef.current.onMove);
      }
      if (dragCleanupRef.current.onUp) {
        document.removeEventListener("mouseup", dragCleanupRef.current.onUp);
      }
      if (ghostRef.current) {
        document.body.removeChild(ghostRef.current);
        ghostRef.current = null;
      }
      mouseDragRef.current = null;
      mouseOverRef.current = null;
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isProse) {
      if (filteredProseHeadings.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const nextIdx = Math.min(filteredProseHeadings.length - 1, activeProseHeadingIdx + 1);
        const target = filteredProseHeadings[nextIdx];
        scrollToLine(target.lineNumber, true);
        requestAnimationFrame(() => {
          const el = listRef.current?.querySelector(`[data-prose-heading-id="${target.id}"]`) as HTMLElement;
          el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const nextIdx = Math.max(0, activeProseHeadingIdx - 1);
        const target = filteredProseHeadings[nextIdx];
        scrollToLine(target.lineNumber, true);
        requestAnimationFrame(() => {
          const el = listRef.current?.querySelector(`[data-prose-heading-id="${target.id}"]`) as HTMLElement;
          el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        });
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (activeProseHeadingIdx >= 0 && activeProseHeadingIdx < filteredProseHeadings.length) {
          scrollToLine(filteredProseHeadings[activeProseHeadingIdx].lineNumber, true);
        }
      }
      return;
    }

    if (selectable.length === 0) return;

    const move = (dir: -1 | 1) => {
      e.preventDefault();
      const nextIdx = dir === 1
        ? Math.min(selectable.length - 1, activeSelectableIdx + 1)
        : Math.max(0, activeSelectableIdx - 1);
      const target = selectable[nextIdx].item;
      if (setSelectedSceneId) setSelectedSceneId(target.line.id);
      scrollToLine(target.index, true);
      requestAnimationFrame(() => {
        const el = listRef.current?.querySelector(`[data-scene-id="${target.line.id}"]`) as HTMLElement;
        el?.scrollIntoView({ block: "center", behavior: "smooth" });
      });
    };

    if (e.key === "ArrowDown") move(1);
    else if (e.key === "ArrowUp") move(-1);
    else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      const active = selectable[activeSelectableIdx];
      if (active && active.item.line.type === LineType.section) {
        e.preventDefault();
        const id = active.item.line.id;
        const isCollapsed = collapsedSections[id];
        if ((e.key === "ArrowRight" && isCollapsed) || (e.key === "ArrowLeft" && !isCollapsed)) {
          setCollapsedSections((prev) => ({ ...prev, [id]: !isCollapsed }));
        }
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeSelectableIdx >= 0 && activeSelectableIdx < selectable.length) {
        scrollToLine(selectable[activeSelectableIdx].item.index);
      }
    }
  };

  const handleHandleMouseDown = useCallback((e: React.MouseEvent, index: number) => {
    e.preventDefault();
    if (!listRef.current) return;

    mouseDragRef.current = index;
    setDraggedItemIdx(index);

    const ghost = document.createElement("div");
    ghost.textContent = scenesItems[index] ? getSceneTitle(scenesItems[index].line) : "";
    Object.assign(ghost.style, {
      position: "fixed",
      pointerEvents: "none",
      zIndex: "10000",
      opacity: "0.85",
      padding: "4px 10px",
      background: "rgb(25, 118, 210)",
      color: "white",
      borderRadius: "0",
      fontSize: "13px",
      left: e.clientX + "px",
      top: e.clientY + "px",
      transform: "translate(-50%, -50%)",
      whiteSpace: "nowrap",
      textTransform: "uppercase",
    });
    document.body.appendChild(ghost);
    ghostRef.current = ghost;

    const getTargetIndex = (clientY: number): number | null => {
      if (!listRef.current) return null;
      const items = listRef.current.querySelectorAll("[data-scene-index]");
      for (const item of items) {
        const rect = item.getBoundingClientRect();
        const idx = parseInt(item.getAttribute("data-scene-index") || "", 10);
        if (idx === mouseDragRef.current) continue;
        if (clientY <= rect.bottom) return clientY < rect.top + rect.height / 2 ? idx : idx + 1;
      }
      return scenesItems.length;
    };

    const onMove = (ev: MouseEvent) => {
      if (ghostRef.current) {
        ghostRef.current.style.left = ev.clientX + "px";
        ghostRef.current.style.top = ev.clientY + "px";
      }
      const target = getTargetIndex(ev.clientY);
      if (target !== mouseOverRef.current) {
        mouseOverRef.current = target;
        setDragOverItemIdx(target);
      }
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      dragCleanupRef.current = {};
      if (ghostRef.current) {
        document.body.removeChild(ghostRef.current);
        ghostRef.current = null;
      }
      const fromIdx = mouseDragRef.current;
      const toIdx = mouseOverRef.current;
      mouseDragRef.current = null;
      mouseOverRef.current = null;
      setDraggedItemIdx(null);
      setDragOverItemIdx(null);
      if (fromIdx !== null && toIdx !== null && fromIdx !== toIdx) {
        const clampedTo = Math.min(toIdx, scenesItems.length - 1);
        reorderScenes(fromIdx, clampedTo);
      }
    };

    dragCleanupRef.current = { onMove, onUp };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [scenesItems, reorderScenes]);

  const handleItemClick = (item: OutlineItem, isSelectable: boolean, e: React.MouseEvent) => {
    scrollToLine(item.index, true);
    if (setSelectedSceneId && isSelectable) setSelectedSceneId(item.line.id);
    const container = e.currentTarget.closest('[tabIndex="0"]') as HTMLElement;
    if (container) container.focus();
  };

  const fontSizes = useMemo(() => {
    return {
      small: {
        section: "0.68rem",
        scene: "0.65rem",
        synopsis: "0.7rem",
        number: "0.65rem",
        chip: "6.5px",
      },
      normal: {
        section: "0.74rem",
        scene: "0.72rem",
        synopsis: "0.75rem",
        number: "0.7rem",
        chip: "7px",
      },
      large: {
        section: "0.8rem",
        scene: "0.78rem",
        synopsis: "0.825rem",
        number: "0.75rem",
        chip: "7.5px",
      },
    }[outlineFontSize];
  }, [outlineFontSize]);

  const renderOutlineSynopses = (synopses: OutlineItem[]) => {
    if (synopses.length === 0) return null;

    if (synopses.length === 1) {
      const syn = synopses[0];
      return (
        <Box
          sx={{
            mt: 0.5,
            mb: 0.3,
            px: 1,
            py: 0.4,
            borderRadius: "2px",
            bgcolor: "color-mix(in srgb, var(--text-main) 4%, transparent)",
            transition: "all var(--duration-fast) ease",
            "&:hover": {
              bgcolor: "color-mix(in srgb, var(--button-color) 8%, transparent)",
            },
          }}
        >
          <Typography
            variant="body2"
            color="text.secondary"
            onClick={(e) => {
              e.stopPropagation();
              scrollToLine(syn.index, true);
              const container = e.currentTarget.closest('[tabIndex="0"]') as HTMLElement;
              if (container) container.focus();
            }}
            sx={{
              display: "block",
              cursor: "pointer",
              fontStyle: "italic",
              fontSize: fontSizes.synopsis,
              fontFamily: "var(--font-ui)",
              lineHeight: 1.4,
              letterSpacing: "0.01em",
              "&:hover": { color: "text.primary" },
            }}
          >
            {syn.line.text.replace(/^=[ ]*/, "").trim()}
          </Typography>
        </Box>
      );
    }

    return (
      <Box
        sx={{
          mt: 0.5,
          mb: 0.3,
          px: 1,
          py: 0.4,
          borderRadius: "2px",
          bgcolor: "color-mix(in srgb, var(--text-main) 4%, transparent)",
          display: "flex",
          flexDirection: "column",
          gap: 0.3,
          transition: "all var(--duration-fast) ease",
          "&:hover": {
            bgcolor: "color-mix(in srgb, var(--button-color) 8%, transparent)",
          },
        }}
      >
        {synopses.map((syn) => (
          <Typography
            key={syn.line.id}
            variant="body2"
            color="text.secondary"
            onClick={(e) => {
              e.stopPropagation();
              scrollToLine(syn.index, true);
              const container = e.currentTarget.closest('[tabIndex="0"]') as HTMLElement;
              if (container) container.focus();
            }}
            sx={{
              cursor: "pointer",
              fontStyle: "italic",
              fontSize: fontSizes.synopsis,
              fontFamily: "var(--font-ui)",
              lineHeight: 1.4,
              letterSpacing: "0.01em",
              "&:hover": { color: "text.primary" },
              display: "flex",
              alignItems: "flex-start",
              gap: 0.5,
            }}
          >
            • {syn.line.text.replace(/^=[ ]*/, "").trim()}
          </Typography>
        ))}
      </Box>
    );
  };

  const renderTreeNode = (node: TreeNode, renderChildren = true) => {
    const { item, children, synopses } = node;
    const { line } = item;
    const isSection = line.type === LineType.section;
    const isSynopsis = line.type === LineType.synopse;
    const isScene = line.type === LineType.heading;
    const isCollapsed = collapsedSections[line.id];
    const isDragging = draggedItemIdx === item.index;
    const isDragOver = dragOverItemIdx === item.index;
    const isActive = line.id === selectable[activeSelectableIdx]?.item.line.id;
    const sceneColor = getSceneColor(line);
    const sceneIndex = isScene ? scenesItems.findIndex((s) => s.line.id === line.id) : -1;
    const depth = node.depth || 0;

    if (isSection) {
      const sDepth = line.sectionDepth || 1;
      const isLevel1 = sDepth === 1;

      return (
        <Box key={line.id} sx={{ display: "flex", flexDirection: "column" }}>
          <ListItemButton
            data-scene-id={line.id}
            ref={isActive ? activeItemRef : null}
            onClick={(e) => handleItemClick(item, true, e)}
            onDoubleClick={(e) => toggleSection(line.id, e)}
            selected={isActive}
            sx={{
              pl: `${Math.min(depth * 8, 16)}px`,
              py: isLevel1 ? 0.4 : 0.25,
              mt: isLevel1 ? 1.2 : 0.4,
              mb: 0.2,
              borderRadius: 0,
              borderTop: isLevel1 ? "1px solid" : "none",
              borderColor: "color-mix(in srgb, var(--button-color) 25%, transparent)",
              bgcolor: "transparent",
              transition: "background-color var(--duration-fast) ease",
              "&:hover": {
                bgcolor: "action.hover",
              },
            }}
          >
            <IconButton
              size="small"
              onClick={(e) => toggleSection(line.id, e)}
              sx={{
                p: 0.1,
                mr: 0.3,
                transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                transition: "transform var(--duration-normal) ease",
              }}
            >
              <KeyboardArrowDownIcon sx={{ fontSize: 13 }} />
            </IconButton>
            <ListItemText
              slotProps={{ secondary: { component: 'span' as const } }}
              primary={
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: isLevel1 ? 700 : 600,
                    color: isLevel1 ? "var(--button-color)" : "text.primary",
                    fontSize: fontSizes.section,
                    fontFamily: "var(--font-ui)",
                    letterSpacing: isLevel1 ? "0.04em" : "0.01em",
                    textTransform: isLevel1 ? "uppercase" : "none",
                  }}
                >
                  {line.text.replace(/^[.#= ]+/, "").trim()}
                </Typography>
              }
              secondary={showSynopses && renderOutlineSynopses(synopses)}
            />
          </ListItemButton>
          {!isCollapsed && renderChildren && children.length > 0 && (
            <Box sx={{
              display: "flex",
              flexDirection: "column",
              ml: 1.1,
              pl: 0,
            }}>
              {children.map((c) => renderTreeNode(c))}
            </Box>
          )}
        </Box>
      );
    }

    if (isSynopsis) {
      const isActive = line.id === selectable[activeSelectableIdx]?.item.line.id;
      return (
        <ListItemButton
          key={line.id}
          data-scene-id={line.id}
          ref={isActive ? activeItemRef : null}
          selected={isActive}
          onClick={(e) => { handleItemClick(item, true, e); }}
          sx={{ pl: `${12 + Math.min(depth * 8, 16)}px`, py: 0.15, borderRadius: 0, mb: 0.1 }}
        >
          <Box component="span" sx={{ mr: 0.8, fontSize: 10, color: "text.secondary" }}>•</Box>
          <ListItemText
            primary={
              <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic", fontSize: fontSizes.synopsis, fontFamily: "var(--font-ui)", letterSpacing: "0.01em" }}>
                {line.text.replace(/^=[ ]*/, "").trim()}
              </Typography>
            }
          />
        </ListItemButton>
      );
    }

    const showDragOver = isDragOver && !isDragging;
    const sceneIndent = Math.min(depth * 8, 16);
    const hasSubCardContent = (showStorylines && line.storylines && line.storylines.length > 0) || (showSynopses && synopses.length > 0);

    return (
      <Box key={line.id} sx={{ display: "flex", flexDirection: "column" }}>
        <ListItemButton
          data-scene-id={line.id}
          data-scene-index={isScene ? sceneIndex : undefined}
          ref={isActive ? activeItemRef : null}
          selected={isActive}
          onClick={(e) => handleItemClick(item, true, e)}
          sx={{
            ml: `${sceneIndent}px`,
            py: 0.4,
            px: 0.8,
            borderRadius: 0,
            mb: hasSubCardContent ? 0 : 0.4,
            opacity: isDragging ? 0.4 : 1,
            border: "1px solid",
            borderColor: isActive
              ? "var(--button-color, primary.main)"
              : "color-mix(in srgb, var(--text-main) 10%, transparent)",
            bgcolor: showDragOver
              ? "action.hover"
              : isActive
                ? (sceneColor
                    ? (sceneColor.startsWith("var")
                        ? `color-mix(in srgb, ${sceneColor} 22%, transparent)`
                        : `${sceneColor}30`)
                    : "action.selected")
                : (sceneColor
                    ? (sceneColor.startsWith("var")
                        ? `color-mix(in srgb, ${sceneColor} 12%, transparent)`
                        : `${sceneColor}1A`)
                    : "background.paper"),
            boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.06)" : "0 1px 2px rgba(0,0,0,0.02)",
            transition: "all var(--duration-fast) ease",
            position: "relative",
            "&:hover": {
              borderColor: "color-mix(in srgb, var(--button-color) 40%, transparent)",
              bgcolor: sceneColor
                ? (sceneColor.startsWith("var")
                    ? `color-mix(in srgb, ${sceneColor} 20%, transparent)`
                    : `${sceneColor}28`)
                : "action.hover",
            },
            "&.Mui-selected": {
              bgcolor: sceneColor
                ? (sceneColor.startsWith("var")
                    ? `color-mix(in srgb, ${sceneColor} 24%, transparent)`
                    : `${sceneColor}35`)
                : "action.selected",
              "&:hover": {
                bgcolor: sceneColor
                  ? (sceneColor.startsWith("var")
                      ? `color-mix(in srgb, ${sceneColor} 28%, transparent)`
                      : `${sceneColor}40`)
                  : "action.selected",
              }
            },
            "&::after": showDragOver ? {
              content: '""',
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "2px",
              bgcolor: "primary.main",
            } : undefined,
          }}
        >
          {isScene && (
            <Box
              onMouseDown={(e) => handleHandleMouseDown(e, sceneIndex)}
              sx={{
                display: "flex",
                alignItems: "center",
                cursor: "grab",
                color: "text.disabled",
                mr: 0.4,
                flexShrink: 0,
                "&:hover": { color: "text.secondary" },
                "&:active": { cursor: "grabbing" },
              }}
            >
              <DragHandleIcon sx={{ fontSize: 13 }} />
            </Box>
          )}
          {!isScene && <Box sx={{ width: 18, flexShrink: 0 }} />}
          <ListItemText
            primary={
              <Box sx={{ display: "flex", gap: 0.6, alignItems: "center", width: "100%" }}>
                {line.sceneNumber && (
                  <OutlineTag label={line.sceneNumber} size={fontSizes.number} />
                )}
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    color: "text.primary",
                    fontSize: fontSizes.scene,
                    fontFamily: "var(--font-ui)",
                    letterSpacing: "0.01em",
                    textTransform: "uppercase",
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {getSceneTitle(line)}
                </Typography>
              </Box>
            }
          />
        </ListItemButton>

        {/* Separate Attached Sub-Card for Storylines & Synopsis */}
        {hasSubCardContent && (
          <Box
            sx={{
              ml: `${sceneIndent}px`,
              mb: 0.4,
              p: "6px 8px",
              border: "1px solid",
              borderColor: "color-mix(in srgb, var(--text-main) 10%, transparent)",
              borderTop: "none",
              bgcolor: "color-mix(in srgb, var(--text-main) 3%, transparent)",
              display: "flex",
              flexDirection: "column",
              gap: 0.4,
            }}
          >
            {showStorylines && line.storylines && line.storylines.length > 0 && (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.6 }}>
                {line.storylines.map((sl) => (
                  <Box
                    key={sl}
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      px: 0.6,
                      py: 0.2,
                      borderRadius: 0,
                      border: "1px solid",
                      borderColor: "color-mix(in srgb, var(--text-main) 10%, transparent)",
                      bgcolor: "action.hover",
                      color: "text.secondary",
                      fontSize: "9px",
                      fontWeight: 600,
                      letterSpacing: "0.03em",
                      textTransform: "uppercase",
                      fontFamily: "var(--font-ui)",
                    }}
                  >
                    {sl}
                  </Box>
                ))}
              </Box>
            )}
            {showSynopses && renderOutlineSynopses(synopses)}
          </Box>
        )}
      </Box>
    );
  };

  const fontSizeMap = {
    small: "11px",
    normal: "12.5px",
    large: "14px",
  };
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(500);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  useEffect(() => {
    if (!listRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    observer.observe(listRef.current);
    return () => observer.disconnect();
  }, []);

  const flatNodes = useMemo(() => flattenSelectable(tree), [tree]);

  // For screenplays with up to 500 outline items (99.9% of screenplays), render DOM nodes directly
  // to give 100% accurate heights for sections, synopses, and storylines, eliminating scroll jumping & rubber-banding.
  const useVirtualization = flatNodes.length > 500;
  const defaultItemHeight = outlineFontSize === "small" ? 28 : outlineFontSize === "large" ? 38 : 32;
  const overscan = 20;

  const startIndex = useVirtualization ? Math.max(0, Math.floor(scrollTop / defaultItemHeight) - overscan) : 0;
  const endIndex = useVirtualization ? Math.min(flatNodes.length, Math.ceil((scrollTop + containerHeight) / defaultItemHeight) + overscan) : flatNodes.length;

  const visibleNodes = useVirtualization ? flatNodes.slice(startIndex, endIndex) : flatNodes;
  const paddingTop = useVirtualization ? startIndex * defaultItemHeight : 0;
  const paddingBottom = useVirtualization ? Math.max(0, (flatNodes.length - endIndex) * defaultItemHeight) : 0;

  if (isProse) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, height: 40, minHeight: 40, borderBottom: "1px solid", borderColor: "divider" }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, opacity: 0.8, fontSize: "0.7rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Outline
          </Typography>
          <Box sx={{ display: "flex", gap: 0.25, alignItems: "center" }}>
            <Tooltip title="Outline displays all headings and sub-headings in your prose document. Click any heading to jump to it.">
              <span>
                <InfoOutlinedIcon sx={{ fontSize: 14, opacity: 0.6, cursor: "help" }} />
              </span>
            </Tooltip>
            <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)} sx={{ opacity: 0.6, "&:hover": { opacity: 1 } }}>
              <MoreVertIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Box>
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={() => setMenuAnchor(null)}
          >
            <Box sx={{ px: 1.5, py: 0.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", fontWeight: 700 }}>
                Outline Size
              </Typography>
            </Box>
            {["small", "normal", "large"].map((size) => (
              <MenuItem
                key={size}
                selected={outlineFontSize === size}
                onClick={() => {
                  setOutlineFontSize(size as 'small' | 'normal' | 'large');
                  setMenuAnchor(null);
                }}
                sx={{ textTransform: "capitalize" }}
              >
                {size}
              </MenuItem>
            ))}
          </Menu>
        </Box>

        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <Box sx={{ p: 1.5, pb: 1 }}>
            <TextField
              placeholder="Search headings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="small"
              fullWidth
              slotProps={{
                input: {
                  sx: {
                    bgcolor: "background.paper",
                    fontSize: "0.75rem",
                    "& fieldset": { border: "none" },
                  },
                  startAdornment: (
                    <Box sx={{ display: "flex", color: "text.secondary", mr: 0.8 }}>
                      <SearchIcon />
                    </Box>
                  ),
                  endAdornment: searchQuery && (
                    <IconButton size="small" onClick={() => setSearchQuery("")}>
                      <CloseIcon />
                    </IconButton>
                  )
                }
              }}
            />
          </Box>

          <Box
            ref={listRef}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            role="listbox"
            aria-label="Prose document headings"
            sx={{
              flex: 1,
              overflowY: "auto",
              outline: "none",
              fontSize: fontSizeMap[outlineFontSize],
              fontFamily: "var(--font-ui)",
              "&::-webkit-scrollbar": {
                width: 8,
              },
              "&::-webkit-scrollbar-track": {
                bgcolor: "transparent",
              },
              "&::-webkit-scrollbar-thumb": {
                bgcolor: "var(--button-color, rgba(0, 0, 0, 0.35))",
                borderRadius: 0,
                border: "none",
                "&:hover": {
                  bgcolor: "primary.main",
                },
              },
            }}
          >
            {filteredProseHeadings.length === 0 ? (
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", p: 3, textAlign: "center", height: "60%", opacity: 0.6 }}>
                <InfoOutlinedIcon sx={{ fontSize: 24, mb: 1, opacity: 0.5 }} />
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, fontSize: "0.75rem" }}>
                  {searchQuery ? "No matching headings" : "No headings found"}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
                  {searchQuery ? "Try a different search query." : "Add headings using #, ##, or ### to structure your document."}
                </Typography>
              </Box>
            ) : (
              <List disablePadding sx={{ display: "flex", flexDirection: "column", px: 1.2, py: 0.5 }}>
                {filteredProseHeadings.map((heading, idx) => {
                  const isActive = idx === activeProseHeadingIdx;
                  const indent = Math.min((heading.level - 1) * 12, 48);
                  return (
                    <ListItemButton
                      key={heading.id}
                      data-prose-heading-id={heading.id}
                      ref={isActive ? activeItemRef : null}
                      selected={isActive}
                      onClick={() => {
                        scrollToLine(heading.lineNumber, true);
                      }}
                      sx={{
                        pl: `${8 + indent}px`,
                        pr: 1,
                        py: heading.level === 1 ? 0.45 : 0.25,
                        borderRadius: 0,
                        mb: 0.3,
                        border: "1px solid",
                        borderColor: isActive
                          ? "var(--button-color, primary.main)"
                          : "color-mix(in srgb, var(--text-main) 8%, transparent)",
                        bgcolor: isActive ? "action.selected" : "background.paper",
                        boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.06)" : "0 1px 2px rgba(0,0,0,0.02)",
                        transition: "all var(--duration-fast) ease",
                        "&:hover": {
                          bgcolor: "action.hover",
                          borderColor: "color-mix(in srgb, var(--button-color) 40%, transparent)",
                        },
                      }}
                    >
                      <OutlineTag
                        label={`H${heading.level}`}
                        variant={heading.level === 1 ? "accent" : "default"}
                        size={fontSizes.number}
                        sx={{ mr: 0.8 }}
                      />
                      <ListItemText
                        primary={
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: heading.level === 1 ? 700 : heading.level === 2 ? 600 : 500,
                              color: heading.level === 1 && !isActive ? "var(--button-color)" : "text.primary",
                              fontSize: heading.level === 1 ? fontSizes.section : heading.level === 2 ? fontSizes.scene : fontSizes.synopsis,
                              fontFamily: "var(--font-ui)",
                              letterSpacing: "0.01em",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {heading.title}
                          </Typography>
                        }
                      />
                    </ListItemButton>
                  );
                })}
              </List>
            )}
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, height: 40, minHeight: 40, borderBottom: "1px solid", borderColor: "divider" }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, opacity: 0.8, fontSize: "0.7rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          Navigator
        </Typography>
        <Box sx={{ display: "flex", gap: 0.25, alignItems: "center" }}>
          <Tooltip title="Outline displays the headings and synopses of your screenplay. Drag scenes to reorder them.">
            <span>
              <InfoOutlinedIcon sx={{ fontSize: 14, opacity: 0.6, cursor: "help" }} />
            </span>
          </Tooltip>
          <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)} sx={{ opacity: 0.6, "&:hover": { opacity: 1 } }}>
            <MoreVertIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={() => setMenuAnchor(null)}
        >
          <Box sx={{ px: 1.5, py: 0.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", fontWeight: 700 }}>
              Show
            </Typography>
          </Box>
          <MenuItem
            onClick={() => { setShowSections(p => !p); }}
            
          >
            <Box component="span" sx={{ mr: 1, fontSize: 10, color: showSections ? "primary.main" : "text.disabled" }}>
              {showSections ? "✓" : "○"}
            </Box>
            Sections
          </MenuItem>
          <MenuItem
            onClick={() => { setShowScenes(p => !p); }}
            
          >
            <Box component="span" sx={{ mr: 1, fontSize: 10, color: showScenes ? "primary.main" : "text.disabled" }}>
              {showScenes ? "✓" : "○"}
            </Box>
            Scenes
          </MenuItem>
          <MenuItem
            onClick={() => { setShowSynopses(p => !p); }}
            
          >
            <Box component="span" sx={{ mr: 1, fontSize: 10, color: showSynopses ? "primary.main" : "text.disabled" }}>
              {showSynopses ? "✓" : "○"}
            </Box>
            Synopses
          </MenuItem>
          <MenuItem
            onClick={() => { setShowStorylines(p => !p); }}
            
          >
            <Box component="span" sx={{ mr: 1, fontSize: 10, color: showStorylines ? "primary.main" : "text.disabled" }}>
              {showStorylines ? "✓" : "○"}
            </Box>
            Storylines
          </MenuItem>
          <Box sx={{ borderTop: "1px solid", borderColor: "divider", my: 0.5 }} />
          <Box sx={{ px: 1.5, py: 0.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", fontWeight: 700 }}>
              Outline Size
            </Typography>
          </Box>
          {["small", "normal", "large"].map((size) => (
            <MenuItem
              key={size}
              selected={outlineFontSize === size}
              onClick={() => {
                setOutlineFontSize(size as 'small' | 'normal' | 'large');
                setMenuAnchor(null);
              }}
              sx={{ textTransform: "capitalize" }}
            >
              {size}
            </MenuItem>
          ))}
        </Menu>
      </Box>

      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Box sx={{ p: 1.5, pb: 1, display: "flex", gap: 0, alignItems: "stretch" }}>
          <TextField
            placeholder="Search outline..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            fullWidth
            slotProps={{
              input: {
                sx: {
                  bgcolor: "background.paper",
                  fontSize: "0.75rem",
                  "& fieldset": { border: "none" },
                },
                startAdornment: (
                  <Box sx={{ display: "flex", color: "text.secondary", mr: 0.8 }}>
                    <SearchIcon />
                  </Box>
                ),
                endAdornment: searchQuery && (
                  <IconButton size="small" onClick={() => setSearchQuery("")}>
                    <CloseIcon />
                  </IconButton>
                )
              }
            }}
          />
          <IconButton
            size="small"
            onClick={(e) => setFilterAnchorEl(e.currentTarget)}
            sx={{
              border: "1px solid",
              borderColor: activeFilterCount > 0 ? "primary.main" : "divider",
              bgcolor: activeFilterCount > 0 ? "action.selected" : "action.hover",
              borderRadius: 0,
              height: "auto",
              minHeight: 0,
              minWidth: 0,
              alignSelf: "stretch",
              width: 32,
              p: 0.3,
            }}
          >
            <Badge badgeContent={activeFilterCount} color="primary" sx={{ "& .MuiBadge-badge": { fontSize: 8, height: 14, minWidth: 14, top: -2, right: -2 } }}>
              <TuneIcon sx={{ fontSize: 14 }} />
            </Badge>
          </IconButton>
        </Box>
        <Popover
        open={Boolean(filterAnchorEl)}
        anchorEl={filterAnchorEl}
        onClose={() => setFilterAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { p: 1.5, width: 260, borderRadius: 0 } } }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: "uppercase", display: "block", mb: 1 }}>
          Filter Outline
        </Typography>

        <Box sx={{ mb: 1.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: "block", mb: 0.8 }}>
            Scene Color
          </Typography>
          <Grid container spacing={0.5}>
            {[
              { id: null, label: "All Colors" },
              { id: "orange", label: "Orange" },
              { id: "blue", label: "Blue" },
              { id: "green", label: "Green" },
              { id: "yellow", label: "Yellow" },
              { id: "purple", label: "Purple" },
              { id: "pink", label: "Pink" },
              { id: "brown", label: "Brown" },
              { id: "red", label: "Red" },
            ].map(({ id, label }) => {
              const count = id === null ? Object.values(colorStats).reduce((a, b) => a + b, 0) : (colorStats[id] || 0);
              if (id !== null && count === 0) return null;
              const isSelected = selectedColor === id;
              const hex = id ? getSceneColor({ color: id } as any) : undefined;
              return (
                <Grid key={id ?? "all"}>
                  <Chip
                    label={`${label} (${count})`}
                    size="small"
                    onClick={() => setSelectedColor(isSelected ? null : id)}
                    sx={{
                      fontSize: 9.5,
                      height: 20,
                      borderRadius: 0,
                      fontWeight: isSelected ? 700 : 500,
                      border: "1px solid",
                      borderColor: isSelected ? (hex || "primary.main") : "divider",
                      bgcolor: isSelected ? (hex || "primary.main") : "transparent",
                      color: isSelected ? "#fff" : "text.secondary",
                      cursor: "pointer",
                      "&:hover": {
                        bgcolor: isSelected ? (hex || "primary.main") : "action.hover",
                      },
                    }}
                  />
                </Grid>
              );
            })}
          </Grid>
        </Box>

        {Object.keys(storylineStats).length > 0 && (
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: "block", mb: 0.8 }}>
              Storyline
            </Typography>
            <Grid container spacing={0.5}>
              {Object.entries(storylineStats).map(([sl, count]) => {
                const isSelected = selectedStoryline === sl;
                return (
                  <Grid key={sl}>
                    <Chip
                      label={`${sl} (${count})`}
                      size="small"
                      onClick={() => setSelectedStoryline(isSelected ? null : sl)}
                      sx={{
                        fontSize: 9.5,
                        height: 20,
                        borderRadius: 0,
                        fontWeight: isSelected ? 700 : 500,
                        border: "1px solid",
                        borderColor: isSelected ? "primary.main" : "divider",
                        bgcolor: isSelected ? "primary.main" : "transparent",
                        color: isSelected ? "primary.contrastText" : "text.secondary",
                        cursor: "pointer",
                        "&:hover": {
                          bgcolor: isSelected ? "primary.main" : "action.hover",
                        },
                      }}
                    />
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        )}
      </Popover>

      <Box
        ref={listRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onScroll={handleScroll}
        role="listbox"
        aria-label="Scene navigator"
        sx={{
          flex: 1,
          overflowY: "auto",
          outline: "none",
          fontSize: fontSizeMap[outlineFontSize],
          fontFamily: "var(--font-ui)",
          "&::-webkit-scrollbar": {
            width: 8,
          },
          "&::-webkit-scrollbar-track": {
            bgcolor: "transparent",
          },
          "&::-webkit-scrollbar-thumb": {
            bgcolor: "var(--button-color, rgba(0, 0, 0, 0.35))",
            borderRadius: 0,
            border: "none",
            "&:hover": {
              bgcolor: "primary.main",
            },
          },
        }}
      >
        {flatNodes.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: "center", fontStyle: "italic" }}>
            No outline elements match your criteria.
          </Typography>
        ) : (
          <List disablePadding sx={{ display: "flex", flexDirection: "column", pl: 1.2, pr: 1.2, pt: `${paddingTop}px`, pb: `${paddingBottom}px` }}>
            {visibleNodes.map((node) => renderTreeNode(node, false))}
          </List>
        )}
      </Box>
      </Box>
    </Box>
  );
});
