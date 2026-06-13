import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useFile, useEditor } from "../context";
import { LineType, ParsedLine } from "../parser";
import { MoreVertIcon, SearchIcon, CloseIcon, KeyboardArrowDownIcon, DragHandleIcon } from "./Icons";

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
} from "@mui/material";

export function getSceneColor(line: ParsedLine): string | undefined {
  if (line.color) {
    return line.color.startsWith("#") ? line.color : `var(--scene-color-${line.color})`;
  }
  return undefined;
}

export function getSceneTitle(line: ParsedLine): string {
  return line.text
    .replace(/^[.#= ]+/, "")
    .replace(/\[\[.*?\]\]/g, "")
    .replace(/#[^#]+#\s*$/, "")
    .trim();
}

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

export const OutlineView: React.FC = () => {
  const { parsedDoc } = useFile();
  const { scrollToLine, selectedSceneId, setSelectedSceneId, reorderScenes } = useEditor();

  const [collapsedSections, setCollapsedSections] = useState<{ [id: string]: boolean }>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [showSections, setShowSections] = useState(true);
  const [showScenes, setShowScenes] = useState(true);
  const [showSynopses, setShowSynopses] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [outlineFontSize, setOutlineFontSizeState] = useState<"small" | "normal" | "large">(
    () => (localStorage.getItem("actone-outline-font-size") as any) || "normal"
  );
  const [draggedItemIdx, setDraggedItemIdx] = useState<number | null>(null);
  const [dragOverItemIdx, setDragOverItemIdx] = useState<number | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLDivElement>(null);
  const mouseDragRef = useRef<number | null>(null);
  const mouseOverRef = useRef<number | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);

  const setOutlineFontSize = (size: "small" | "normal" | "large") => {
    setOutlineFontSizeState(size);
    localStorage.setItem("actone-outline-font-size", size);
  };

  const toggleSection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Build raw items
  const rawOutlineItems: OutlineItem[] = useMemo(
    () => parsedDoc.lines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => line.isOutlineElement || line.type === LineType.synopse),
    [parsedDoc.lines]
  );

  // Scenes-only list for drag-and-drop indexing
  const scenesItems = useMemo(
    () => rawOutlineItems.filter(
      (item) => item.line.type === LineType.heading ||
        (item.line.isOutlineElement && item.line.type !== LineType.section && item.line.type !== LineType.synopse)
    ),
    [rawOutlineItems]
  );

  // Filter + collapse
  const visibleItems: OutlineItem[] = useMemo(() => {
    const filtered = rawOutlineItems.filter((item) => {
      const isSection = item.line.type === LineType.section;
      const isSynopsis = item.line.type === LineType.synopse;
      const isScene = !isSection && !isSynopsis;
      if (!showSections && isSection) return false;
      if (!showScenes && isScene) return false;
      if (!showSynopses && isSynopsis) return false;
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
  }, [rawOutlineItems, showSections, showScenes, showSynopses, searchQuery, collapsedSections]);

  const tree = useMemo(() => buildTree(visibleItems, collapsedSections), [visibleItems, collapsedSections]);
  const selectable = useMemo(() => flattenSelectable(tree), [tree]);

  let activeSelectableIdx = -1;
  if (selectedSceneId) {
    activeSelectableIdx = selectable.findIndex((g) => g.item.line.id === selectedSceneId);
  }
  if (activeSelectableIdx === -1 && selectable.length > 0) activeSelectableIdx = 0;

  // Scroll active into view
  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [selectedSceneId]);

  // Auto-focus on mount
  useEffect(() => {
    if (listRef.current) {
      listRef.current.focus();
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
      borderRadius: "6px",
      fontSize: "13px",
      left: e.clientX + "px",
      top: e.clientY + "px",
      transform: "translate(-50%, -50%)",
      whiteSpace: "nowrap",
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
        section: "0.75rem",
        scene: "0.725rem",
        synopsis: "0.675rem",
        number: "8px",
        chip: "7px",
      },
      normal: {
        section: "0.825rem",
        scene: "0.8rem",
        synopsis: "0.75rem",
        number: "8.5px",
        chip: "7.5px",
      },
      large: {
        section: "0.9rem",
        scene: "0.875rem",
        synopsis: "0.825rem",
        number: "9px",
        chip: "8px",
      },
    }[outlineFontSize];
  }, [outlineFontSize]);

  const renderOutlineSynopses = (synopses: OutlineItem[]) => {
    if (synopses.length === 0) return null;

    if (synopses.length === 1) {
      const syn = synopses[0];
      return (
        <Box sx={{ mt: 0.5, pl: 0.5 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            onClick={(e) => {
              e.stopPropagation();
              scrollToLine(syn.index, true);
              const container = e.currentTarget.closest('[tabIndex="0"]') as HTMLElement;
              if (container) container.focus();
            }}
            sx={{ display: "block", cursor: "pointer", fontStyle: "italic", fontSize: fontSizes.synopsis, fontFamily: "var(--font-ui)", letterSpacing: "0.01em", "&:hover": { color: "var(--button-color)" } }}
          >
            {syn.line.text.replace(/^=[ ]*/, "").trim()}
          </Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ mt: 0.5, pl: 0.5, display: "flex", flexDirection: "column", gap: 0.2 }}>
        {synopses.map((syn) => (
          <Typography
            key={syn.line.id}
            variant="caption"
            color="text.secondary"
            onClick={(e) => {
              e.stopPropagation();
              scrollToLine(syn.index, true);
              const container = e.currentTarget.closest('[tabIndex="0"]') as HTMLElement;
              if (container) container.focus();
            }}
            sx={{ cursor: "pointer", fontStyle: "italic", fontSize: fontSizes.synopsis, fontFamily: "var(--font-ui)", letterSpacing: "0.01em", "&:hover": { color: "var(--button-color)" }, display: "flex", alignItems: "center", gap: 0.5 }}
          >
            • {syn.line.text.replace(/^=[ ]*/, "").trim()}
          </Typography>
        ))}
      </Box>
    );
  };

  const renderTreeNode = (node: TreeNode): React.ReactNode => {
    const { item, children, synopses } = node;
    const { line } = item;
    const isSection = line.type === LineType.section;
    const isSynopsis = line.type === LineType.synopse;
    const isScene = !isSection && !isSynopsis;
    const isSelectable = isSection || isScene;
    const isActive = isSelectable && (
      line.id === selectable[activeSelectableIdx]?.item.line.id || line.id === selectedSceneId
    );
    const sceneColor = getSceneColor(line);
    const sceneIndex = isScene ? scenesItems.findIndex((s) => s.line.id === line.id) : -1;
    const isDragging = isScene && draggedItemIdx === sceneIndex;
    const isDragOver = isScene && dragOverItemIdx === sceneIndex;
    const isCollapsed = !!collapsedSections[line.id];

    if (isSection) {
      return (
        <Box key={line.id} sx={{ display: "flex", flexDirection: "column" }}>
          <ListItemButton
            data-scene-id={line.id}
            ref={isActive ? activeItemRef : null}
            onClick={(e) => handleItemClick(item, true, e)}
            onDoubleClick={(e) => toggleSection(line.id, e)}
            selected={isActive}
            sx={{
              pl: 0,
              py: 0.25,
              borderRadius: '6px',
              mb: 0.1,
              transition: "background-color 0.12s ease",
            }}
          >
            <IconButton
              size="small"
              onClick={(e) => toggleSection(line.id, e)}
              sx={{
                p: 0.1,
                mr: 0.4,
                transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                transition: "transform 0.15s ease",
              }}
            >
              <KeyboardArrowDownIcon sx={{ fontSize: 12 }} />
            </IconButton>
            <ListItemText
              primary={
                  <Typography variant="body2" sx={{ fontWeight: 700, color: "var(--button-color)", fontSize: fontSizes.section, fontFamily: "var(--font-ui)", letterSpacing: "0.02em" }}>
                  {line.text.replace(/^[.#= ]+/, "").trim()}
                </Typography>
              }
              secondary={showSynopses && renderOutlineSynopses(synopses)}
            />
          </ListItemButton>
          {!isCollapsed && children.length > 0 && (
            <Box sx={{
              display: "flex",
              flexDirection: "column",
              borderLeft: "1px solid",
              borderColor: "divider",
              ml: 1.1,
              pl: 0,
            }}>
              {children.map(renderTreeNode)}
            </Box>
          )}
        </Box>
      );
    }

    if (isSynopsis) {
      const isActive = line.id === selectable[activeSelectableIdx]?.item.line.id || line.id === selectedSceneId;
      return (
        <ListItemButton
          key={line.id}
          data-scene-id={line.id}
          ref={isActive ? activeItemRef : null}
          selected={isActive}
          onClick={(e) => { handleItemClick(item, true, e); }}
          sx={{ pl: 1.5, py: 0.25, borderRadius: '6px', mb: 0.1 }}
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
    return (
      <ListItemButton
        key={line.id}
        data-scene-id={line.id}
        data-scene-index={isScene ? sceneIndex : undefined}
        ref={isActive ? activeItemRef : null}
        selected={isActive}
        onClick={(e) => handleItemClick(item, true, e)}
        sx={{
          pl: 0.5,
          py: 0.25,
          borderRadius: '6px',
          mb: 0.1,
          opacity: isDragging ? 0.4 : 1,
          bgcolor: showDragOver
            ? "action.hover"
            : sceneColor
              ? (sceneColor.startsWith("var")
                  ? `color-mix(in srgb, ${sceneColor} 8%, transparent)`
                  : `${sceneColor}12`)
              : "transparent",
          transition: "background-color 0.12s ease",
          position: "relative",
          "&:hover": {
            bgcolor: sceneColor
              ? (sceneColor.startsWith("var")
                  ? `color-mix(in srgb, ${sceneColor} 15%, transparent)`
                  : `${sceneColor}22`)
              : "action.hover",
          },
          "&.Mui-selected": {
            bgcolor: sceneColor
              ? (sceneColor.startsWith("var")
                  ? `color-mix(in srgb, ${sceneColor} 20%, transparent)`
                  : `${sceneColor}30`)
              : "action.selected",
            "&:hover": {
              bgcolor: sceneColor
                ? (sceneColor.startsWith("var")
                    ? `color-mix(in srgb, ${sceneColor} 25%, transparent)`
                    : `${sceneColor}38`)
                : "action.hover",
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
              mr: 0.3,
              flexShrink: 0,
              "&:hover": { color: "text.secondary" },
              "&:active": { cursor: "grabbing" },
            }}
          >
            <DragHandleIcon sx={{ fontSize: 14 }} />
          </Box>
        )}
        {!isScene && <Box sx={{ width: 20, flexShrink: 0 }} />}
        <ListItemText
          primary={
            <Box sx={{ display: "flex", gap: 0.8, alignItems: "center" }}>
              <Box
                sx={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  bgcolor: sceneColor || "transparent",
                  flexShrink: 0,
                }}
              />
              {line.sceneNumber && (
                <Typography
                  variant="caption"
                  sx={{
                    bgcolor: "action.selected",
                    px: 0.4,
                    borderRadius: '4px',
                    fontSize: fontSizes.number,
                    fontWeight: 700,
                    color: "text.secondary",
                  }}
                >
                  {line.sceneNumber}
                </Typography>
              )}
              <Typography
                variant="body2"
                sx={{
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? "primary.main" : "text.primary",
                  fontSize: fontSizes.scene,
                  fontFamily: "var(--font-ui)",
                  letterSpacing: "0.01em",
                }}
              >
                {getSceneTitle(line)}
              </Typography>
              {line.storylines && line.storylines.length > 0 && (
                <Box sx={{ display: "flex", gap: 0.4 }}>
                  {line.storylines.map((sl) => (
                    <Chip
                      key={sl}
                      label={sl}
                      size="small"
                      variant="outlined"
                      sx={{
                        height: 12,
                        fontSize: fontSizes.chip,
                        p: 0,
                        borderRadius: '9999px',
                        textTransform: "lowercase",
                      }}
                    />
                  ))}
                </Box>
              )}
            </Box>
          }
          secondary={showSynopses && renderOutlineSynopses(synopses)}
        />
      </ListItemButton>
    );
  };

  const renderTree = (nodes: TreeNode[]): React.ReactNode[] =>
    nodes.map(renderTreeNode);

  const fontSizeMap = {
    small: "11px",
    normal: "12.5px",
    large: "14px",
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", p: 1, gap: 1 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, opacity: 0.8, fontSize: "0.7rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          Navigator
        </Typography>
        <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)} sx={{ opacity: 0.6, "&:hover": { opacity: 1 } }}>
          <MoreVertIcon sx={{ fontSize: 14 }} />
        </IconButton>
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
            sx={{ fontSize: 12 }}
          >
            <Box component="span" sx={{ mr: 1, fontSize: 10, color: showSections ? "primary.main" : "text.disabled" }}>
              {showSections ? "✓" : "○"}
            </Box>
            Sections
          </MenuItem>
          <MenuItem
            onClick={() => { setShowScenes(p => !p); }}
            sx={{ fontSize: 12 }}
          >
            <Box component="span" sx={{ mr: 1, fontSize: 10, color: showScenes ? "primary.main" : "text.disabled" }}>
              {showScenes ? "✓" : "○"}
            </Box>
            Scenes
          </MenuItem>
          <MenuItem
            onClick={() => { setShowSynopses(p => !p); }}
            sx={{ fontSize: 12 }}
          >
            <Box component="span" sx={{ mr: 1, fontSize: 10, color: showSynopses ? "primary.main" : "text.disabled" }}>
              {showSynopses ? "✓" : "○"}
            </Box>
            Synopses
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
                setOutlineFontSize(size as any);
                setMenuAnchor(null);
              }}
              sx={{ textTransform: "capitalize", fontSize: 12 }}
            >
              {size}
            </MenuItem>
          ))}
        </Menu>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.8 }}>
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
                "& fieldset": { borderColor: "divider" },
                "&:hover fieldset": { borderColor: "text.secondary" },
                "&.Mui-focused fieldset": { borderWidth: "1px", borderColor: "primary.main" },
              },
              startAdornment: (
                <Box sx={{ display: "flex", color: "text.secondary", mr: 0.8 }}>
                  <SearchIcon sx={{ fontSize: 12 }} />
                </Box>
              ),
              endAdornment: searchQuery && (
                <IconButton size="small" onClick={() => setSearchQuery("")}>
                  <CloseIcon sx={{ fontSize: 12 }} />
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
        aria-label="Scene navigator"
        sx={{
          flex: 1,
          overflowY: "auto",
          outline: "none",
          fontSize: fontSizeMap[outlineFontSize],
        }}
      >
        {tree.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: "center", fontStyle: "italic" }}>
            No outline elements match your criteria.
          </Typography>
        ) : (
          <List disablePadding sx={{ display: "flex", flexDirection: "column" }}>
            {renderTree(tree)}
          </List>
        )}
      </Box>
    </Box>
  );
};

