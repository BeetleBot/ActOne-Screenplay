import { revealVirtualRow } from "./revealVirtualRow";
import { Compartment, StateEffect } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { DocumentPositions } from "../editor/documentPositions";
import { outlineMoveMapping, type OutlineDropTarget } from "../editor/moveOutlineBlock";
import React, { useState, useEffect, useRef, useMemo, useCallback, useDeferredValue } from "react";
import {
  useDocumentText,
  useParsedScreenplay,
  useWorkspaceMetadata,
  useEditor,
  useScriptEditor,
  useCursor,
} from "../context";
import { LineType, ParsedLine } from "../parser";
import { getSceneTitle } from "../utils/text";
import { copyToClipboard } from "../utils";
import { getSceneBlockAtLine } from "../editor/sceneBlock";
import { ContextMenu, type ContextMenuItem } from "./ContextMenu";
import { MoreHorizIcon, SearchIcon, CloseIcon, TuneIcon, InfoOutlinedIcon } from "./Icons";

import { OutlineRow } from "./OutlineRow";
import { reconcileOutline } from "./outlineModel";
import { List as VirtualList, type ListImperativeAPI, type RowComponentProps } from "react-window";
import { useKeyedRowHeights } from "./useKeyedRowHeights";

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

export const OutlineTag: React.FC<OutlineTagProps> = ({ label, variant = "default", size = "0.7rem", sx }) => {
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
        borderRadius: "4px",
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

export function getSceneColor(line: Pick<ParsedLine, "color">): string | undefined {
  if (line.color) {
    return line.color.startsWith("#") ? line.color : `var(--scene-color-${line.color})`;
  }
  return undefined;
}

export { getSceneTitle };

export interface OutlineItem {
  line: ParsedLine;
  index: number;
  key?: string;
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
      stack.push({ node, sectionDepth: sDepth });
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
  const hideChildren = (nodes: TreeNode[]) => {
    for (const node of nodes) {
      if (collapsed[node.item.key ?? node.item.line.id]) node.children = [];
      else hideChildren(node.children);
    }
  };
  hideChildren(root);
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
  const metadata = useWorkspaceMetadata();
  return metadata.isProse ? (
    <ProseOutlineView />
  ) : (
    <OutlineContent key={`${metadata.activeFileId}:${metadata.activeScriptIndex}`} />
  );
});

function ProseOutlineView() {
  const rawText = useDocumentText();
  return <OutlineContent proseText={rawText} />;
}

const OutlineContent = React.memo(function OutlineContent({ proseText = "" }: { proseText?: string }) {
  const parsedDoc = useParsedScreenplay();
  const { isProse } = useWorkspaceMetadata();
  const { scrollToLine, editorView } = useEditor();
  const { moveOutline } = useScriptEditor();
  const pendingMove = useRef<{ before: string; after: string; mapping: Map<number, number> } | null>(null);
  const lastFollowedLine = useRef<number | null>(null);
  const cancelReveal = useRef<(() => void) | undefined>(undefined);
  const positions = useMemo(() => (editorView ? new DocumentPositions(editorView.state.doc) : null), [editorView]);
  useEffect(() => {
    if (!editorView || !positions) return;
    const compartment = new Compartment();
    editorView.dispatch({
      effects: StateEffect.appendConfig.of(
        compartment.of(
          EditorView.updateListener.of((update) => {
            if (update.docChanged) positions.record(update.startState.doc, update.state.doc, update.changes);
            const mapping =
              update.transactions.length === 1 ? update.transactions[0].annotation(outlineMoveMapping) : undefined;
            if (mapping) {
              const before = update.startState.doc.toString();
              const pending = pendingMove.current;
              pendingMove.current = {
                before: pending?.after === before ? pending.before : before,
                after: update.state.doc.toString(),
                mapping:
                  pending?.after === before
                    ? new Map([...pending.mapping].map(([from, to]) => [from, mapping.get(to) ?? to]))
                    : mapping,
              };
            }
            if (update.transactions.some((transaction) => transaction.isUserEvent("move.scene"))) {
              // A scene move changes cursor coordinates without requesting navigation.
              lastFollowedLine.current = update.state.doc.lineAt(update.state.selection.main.head).number - 1;
              cancelReveal.current?.();
            }
          }),
        ),
      ),
    });
    return () => {
      editorView.dispatch({ effects: compartment.reconfigure([]) });
    };
  }, [editorView, positions]);
  const parsedTextRef = useRef(parsedDoc.screenplayText ?? "");
  parsedTextRef.current = parsedDoc.screenplayText ?? "";
  const resolveIndex = useCallback(
    (index: number) => (positions ? positions.mapper(parsedTextRef.current)(index) : index),
    [positions],
  );
  const { activeLineNumber, setSelectedSceneId } = useCursor();

  const [collapsedSections, setCollapsedSections] = useState<{ [id: string]: boolean }>({});
  const [searchQuery, setSearchQuery] = useState("");
  const outlineQuery = useDeferredValue(searchQuery);
  const [showSections, setShowSections] = useState(true);
  const [showScenes, setShowScenes] = useState(true);
  const [showSynopses, setShowSynopses] = useState(false);
  const [showStorylines, setShowStorylines] = useState(true);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedStoryline, setSelectedStoryline] = useState<string | null>(null);
  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [sceneContextMenu, setSceneContextMenu] = useState<{
    x: number;
    y: number;
    lineNumber: number;
    source: string;
  } | null>(null);
  const activeFilterCount = (selectedColor ? 1 : 0) + (selectedStoryline ? 1 : 0);
  const [outlineFontSize, setOutlineFontSizeState] = useState<"small" | "normal" | "large">(
    () => (localStorage.getItem("actone-outline-font-size") as "small" | "normal" | "large" | null) ?? "normal",
  );
  const [draggedItemIdx, setDraggedItemIdx] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<OutlineDropTarget | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const virtualListRef = useRef<ListImperativeAPI | null>(null);
  const mouseDragRef = useRef<number | null>(null);
  const mouseOverRef = useRef<OutlineDropTarget | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);

  const proseHeadings = useMemo(() => {
    if (!isProse) return [];
    return parseProseHeadings(proseText);
  }, [isProse, proseText]);

  const filteredProseHeadings = useMemo(() => {
    if (!outlineQuery.trim()) return proseHeadings;
    const q = outlineQuery.toLowerCase();
    return proseHeadings.filter((h) => h.title.toLowerCase().includes(q));
  }, [proseHeadings, outlineQuery]);

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

  const toggleSection = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const previousOutline = useRef<OutlineItem[]>([]);
  const previousText = useRef(parsedDoc.screenplayText);
  const rawOutlineItems = useMemo(() => {
    const mapping =
      pendingMove.current?.before === previousText.current && pendingMove.current?.after === parsedDoc.screenplayText
        ? (index: number) => pendingMove.current!.mapping.get(index) ?? index
        : positions && previousText.current !== undefined && parsedDoc.screenplayText !== undefined
          ? positions.mapper(previousText.current, parsedDoc.screenplayText)
          : undefined;
    const next = reconcileOutline(previousOutline.current, parsedDoc.lines, mapping);
    previousText.current = parsedDoc.screenplayText;
    previousOutline.current = next;
    return next;
  }, [parsedDoc.lines, parsedDoc.screenplayText, positions]);

  // Include sections so groups can move with their complete subtree.
  const scenesItems = useMemo(
    () => rawOutlineItems.filter((item) => item.line.isOutlineElement && item.line.type !== LineType.synopse),
    [rawOutlineItems],
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
    let parentScene: ParsedLine | null = null;
    let hiddenDepth: number | null = null;
    const query = outlineQuery.toLowerCase();
    const filtered = rawOutlineItems.filter((item) => {
      const isSection = item.line.type === LineType.section;
      const isSynopsis = item.line.type === LineType.synopse;
      const isScene = !isSection && !isSynopsis;
      if (hiddenDepth !== null) {
        if (isSection && (item.line.sectionDepth ?? 1) <= hiddenDepth) hiddenDepth = null;
        else return false;
      }
      if (showSections && isSection && collapsedSections[item.key ?? item.line.id])
        hiddenDepth = item.line.sectionDepth ?? 1;
      if (isSection) parentScene = null;
      else if (item.line.type === LineType.heading) parentScene = item.line;
      if (!showSections && isSection) return false;
      if (!showScenes && isScene) return false;
      if (!showSynopses && isSynopsis) return false;

      let itemColor = isScene ? item.line.color : undefined;
      let itemStorylines = isScene ? item.line.storylines : undefined;

      if (isSynopsis) {
        if (parentScene) {
          itemColor = parentScene.color;
          itemStorylines = parentScene.storylines;
        }
      }

      if (selectedColor && (isScene || isSynopsis) && itemColor !== selectedColor) {
        return false;
      }

      if (
        selectedStoryline &&
        (isScene || isSynopsis) &&
        (!itemStorylines || !itemStorylines.includes(selectedStoryline))
      ) {
        return false;
      }

      if (query) {
        const textToSearch = item.line.text
          .replace(/^[.#= ]+/, "")
          .trim()
          .toLowerCase();
        if (!textToSearch.includes(query)) return false;
      }
      return true;
    });

    return filtered;
  }, [
    rawOutlineItems,
    showSections,
    showScenes,
    showSynopses,
    outlineQuery,
    collapsedSections,
    selectedColor,
    selectedStoryline,
  ]);

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
          if (found !== undefined) {
            activeSelectableIdx = found;
            break;
          }
        }
      }
    }
  }
  if (activeSelectableIdx === -1 && selectable.length > 0) activeSelectableIdx = 0;

  // Virtual rows must be mounted before DOM focus/selection is attempted.
  useEffect(() => {
    // Filtering, resizing and reparsing must not initiate cursor-follow scrolling.
    if (lastFollowedLine.current === activeLineNumber) return;
    lastFollowedLine.current = activeLineNumber;
    if (activeSelectableIdx < 0) return;
    const id = selectable[activeSelectableIdx]?.item.line.id;
    cancelReveal.current = revealVirtualRow(
      () => virtualListRef.current,
      activeSelectableIdx,
      (element) => element.querySelector(`[data-scene-id="${id}"]`),
    );
    return () => cancelReveal.current?.();
  }, [activeLineNumber, activeSelectableIdx, selectable]);

  // Auto-focus on mount
  useEffect(() => {
    if (listRef.current) {
      listRef.current.focus();
    }
  }, []);

  const dragCleanupRef = useRef<{ onMove?: (e: MouseEvent) => void; onUp?: () => void; cancel?: () => void }>({});

  // Cleanup drag listeners on unmount
  useEffect(() => {
    return () => {
      if (dragCleanupRef.current.onMove) {
        document.removeEventListener("mousemove", dragCleanupRef.current.onMove);
      }
      if (dragCleanupRef.current.onUp) {
        document.removeEventListener("mouseup", dragCleanupRef.current.onUp);
      }
      dragCleanupRef.current.cancel?.();
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
      const nextIdx =
        dir === 1 ? Math.min(selectable.length - 1, activeSelectableIdx + 1) : Math.max(0, activeSelectableIdx - 1);
      const target = selectable[nextIdx].item;
      if (setSelectedSceneId) setSelectedSceneId(target.line.id);
      scrollToLine(resolveIndex(target.index), true);
      virtualListRef.current?.scrollToRow({ index: nextIdx, align: "auto" });
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
        const id = active.item.key ?? active.item.line.id;
        const isCollapsed = collapsedSections[id];
        if ((e.key === "ArrowRight" && isCollapsed) || (e.key === "ArrowLeft" && !isCollapsed)) {
          setCollapsedSections((prev) => ({ ...prev, [id]: !isCollapsed }));
        }
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeSelectableIdx >= 0 && activeSelectableIdx < selectable.length) {
        scrollToLine(resolveIndex(selectable[activeSelectableIdx].item.index));
      }
    }
  };

  const handleHandleMouseDown = useCallback(
    (e: React.MouseEvent, index: number) => {
      e.preventDefault();
      const source = scenesItems[index];
      if (!listRef.current || !source) return;
      cancelReveal.current?.();
      mouseDragRef.current = index;
      const dragDoc = editorView?.state.doc;
      const sourceText = parsedTextRef.current;
      const sourceEnd =
        source.line.type === LineType.section
          ? (scenesItems.find(
              (item) =>
                item.index > source.index &&
                item.line.type === LineType.section &&
                (item.line.sectionDepth ?? 1) <= (source.line.sectionDepth ?? 1),
            )?.index ?? parsedDoc.lines.length)
          : source.index + 1;
      const ghost = document.createElement("div");
      ghost.textContent = getSceneTitle(source.line);
      Object.assign(ghost.style, {
        position: "fixed",
        pointerEvents: "none",
        zIndex: "10000",
        display: "none",
        opacity: "0.95",
        padding: "6px 10px",
        background: "var(--bg-sidebar)",
        color: "var(--text-main)",
        border: "1px solid var(--border-color)",
        borderRadius: "6px",
        font: "12px var(--font-ui)",
        maxWidth: "300px",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      });
      document.body.appendChild(ghost);
      ghostRef.current = ghost;
      let dragY = e.clientY;
      let dragX = e.clientX;
      let activated = false;
      let animation = 0;
      let expandTimer: ReturnType<typeof setTimeout> | undefined;
      const getTarget = (): OutlineDropTarget | null => {
        const root = listRef.current?.parentElement?.querySelector("[data-outline-root]");
        if (root) {
          const bounds = root.getBoundingClientRect();
          if (dragY >= bounds.top && dragY <= bounds.bottom) return { line: null, placement: "root" };
        }
        const scroller = virtualListRef.current?.element;
        if (!scroller) return null;
        const bounds = scroller.getBoundingClientRect();
        if (dragX < bounds.left || dragX > bounds.right || dragY < bounds.top || dragY > bounds.bottom) return null;
        const rows = listRef.current?.querySelectorAll<HTMLElement>("[data-outline-index]") ?? [];
        let last: HTMLElement | undefined;
        for (const row of rows) {
          const rect = row.getBoundingClientRect();
          last = row;
          if (dragY > rect.bottom) continue;
          const line = Number(row.dataset.outlineLine);
          if (line >= source.index && line < sourceEnd) return null;
          const section = row.dataset.outlineSection === "true";
          const fraction = rect.height ? (dragY - rect.top) / rect.height : 0;
          return {
            line,
            placement: section && fraction >= 0.25 && fraction <= 0.8 ? "inside" : fraction < 0.5 ? "before" : "after",
          };
        }
        if (last) {
          const line = Number(last.dataset.outlineLine);
          if (line < source.index || line >= sourceEnd) return { line, placement: "after" };
        }
        return null;
      };
      const updateTarget = () => {
        const next = getTarget();
        if (next?.line !== mouseOverRef.current?.line || next?.placement !== mouseOverRef.current?.placement) {
          clearTimeout(expandTimer);
          mouseOverRef.current = next;
          setDropTarget(next);
          if (next?.placement === "inside") {
            const section = rawOutlineItems.find((item) => item.index === next.line);
            if (section)
              expandTimer = setTimeout(() => {
                setCollapsedSections((previous) => ({ ...previous, [section.key ?? section.line.id]: false }));
              }, 500);
          }
        }
      };
      const autoscroll = () => {
        const scroller = virtualListRef.current?.element;
        if (activated && scroller) {
          const bounds = scroller.getBoundingClientRect();
          const distance =
            dragY < bounds.top + 36
              ? dragY - bounds.top - 36
              : dragY > bounds.bottom - 36
                ? dragY - bounds.bottom + 36
                : 0;
          if (distance && dragX >= bounds.left && dragX <= bounds.right) {
            scroller.scrollTop += Math.sign(distance) * Math.min(18, Math.abs(distance) / 3);
            updateTarget();
          }
        }
        animation = requestAnimationFrame(autoscroll);
      };
      animation = requestAnimationFrame(autoscroll);
      const onMove = (event: MouseEvent) => {
        dragX = event.clientX;
        dragY = event.clientY;
        if (!activated && Math.hypot(dragX - e.clientX, dragY - e.clientY) < 5) return;
        if (!activated) {
          activated = true;
          setDraggedItemIdx(index);
          ghost.style.display = "block";
        }
        ghost.style.left = `${dragX + 12}px`;
        ghost.style.top = `${dragY + 12}px`;
        updateTarget();
      };
      const finish = (commit: boolean) => {
        clearTimeout(expandTimer);
        cancelAnimationFrame(animation);
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.removeEventListener("keydown", onKey);
        ghost.remove();
        ghostRef.current = null;
        const target = mouseOverRef.current;
        mouseDragRef.current = null;
        mouseOverRef.current = null;
        dragCleanupRef.current = {};
        setDraggedItemIdx(null);
        setDropTarget(null);
        if (!commit || !activated || !target || editorView?.state.doc !== dragDoc) return;
        const map = positions ? positions.mapper(sourceText) : (line: number) => line;
        moveOutline(map(source.index), { ...target, line: target.line === null ? null : map(target.line) });
        if (target.placement === "inside") {
          const section = rawOutlineItems.find((item) => item.index === target.line);
          if (section) setCollapsedSections((previous) => ({ ...previous, [section.key ?? section.line.id]: false }));
        }
      };
      const onUp = () => finish(true);
      const onKey = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          finish(false);
        }
      };
      dragCleanupRef.current = {
        onMove,
        onUp,
        cancel: () => {
          cancelAnimationFrame(animation);
          clearTimeout(expandTimer);
          document.removeEventListener("keydown", onKey);
        },
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
      document.addEventListener("keydown", onKey);
    },
    [scenesItems, moveOutline, editorView, positions, parsedDoc.lines.length, rawOutlineItems],
  );

  const handleItemClick = useCallback(
    (item: OutlineItem, isSelectable: boolean, e: React.MouseEvent) => {
      scrollToLine(resolveIndex(item.index), true);
      if (setSelectedSceneId && isSelectable) setSelectedSceneId(item.line.id);
      const container = e.currentTarget.closest('[tabIndex="0"]') as HTMLElement;
      if (container) container.focus();
    },
    [scrollToLine, setSelectedSceneId, resolveIndex],
  );

  const scrollOutlineToLine = useCallback(
    (index: number, noFocus?: boolean) => scrollToLine(resolveIndex(index), noFocus),
    [scrollToLine, resolveIndex],
  );

  const fontSizes = useMemo(() => {
    return {
      small: {
        section: "0.6875rem",
        scene: "0.6875rem",
        synopsis: "0.7rem",
        number: "0.6875rem",
        chip: "0.6875rem",
      },
      normal: {
        section: "0.75rem",
        scene: "0.75rem",
        synopsis: "0.75rem",
        number: "0.7rem",
        chip: "0.6875rem",
      },
      large: {
        section: "0.8rem",
        scene: "0.78rem",
        synopsis: "0.825rem",
        number: "0.75rem",
        chip: "0.75rem",
      },
    }[outlineFontSize];
  }, [outlineFontSize]);

  const fontSizeMap = {
    small: "11px",
    normal: "12.5px",
    large: "14px",
  };
  const flatNodes = selectable;
  const sceneIndexMap = useMemo(() => new Map(scenesItems.map((item, index) => [item.line.id, index])), [scenesItems]);
  const [listWidth, setListWidth] = useState(0);
  const rowHeightKeys = useMemo(
    () =>
      flatNodes.map((node) =>
        JSON.stringify([
          listWidth,
          outlineFontSize,
          node.depth,
          node.item.line.type,
          node.item.line.sectionDepth,
          node.item.line.text,
          node.item.line.sceneNumber,
          showStorylines ? node.item.line.storylines : undefined,
          showSynopses ? node.synopses.map((synopsis) => synopsis.line.text) : [],
        ]),
      ),
    [flatNodes, listWidth, outlineFontSize, showSynopses, showStorylines],
  );
  const rowHeight = useKeyedRowHeights(rowHeightKeys);
  const handleContextMenu = useCallback((event: React.MouseEvent, item: OutlineItem) => {
    setSceneContextMenu({
      x: event.clientX,
      y: event.clientY,
      lineNumber: item.index + 1,
      source: parsedTextRef.current,
    });
  }, []);
  const rowProps = useMemo(
    () => ({
      nodes: flatNodes,
      activeId: selectable[activeSelectableIdx]?.item.line.id,
      collapsedSections,
      draggedItemIdx,
      dropTarget,
      showStorylines,
      showSynopses,
      sceneIndexMap,
      fontSizes,
      scrollToLine: scrollOutlineToLine,
      handleItemClick,
      toggleSection,
      handleHandleMouseDown,
      onContextMenu: handleContextMenu,
    }),
    [
      flatNodes,
      selectable,
      activeSelectableIdx,
      collapsedSections,
      draggedItemIdx,
      dropTarget,
      showStorylines,
      showSynopses,
      sceneIndexMap,
      fontSizes,
      scrollOutlineToLine,
      handleItemClick,
      toggleSection,
      handleHandleMouseDown,
      handleContextMenu,
    ],
  );

  if (isProse) {
    return (
      <Box
        id="outline-view"
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          bgcolor: "background.paper",
          overflow: "hidden",
          userSelect: "none",
        }}
      >
        <Box
          sx={{
            p: 1.5,
            pb: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}
          >
            Table of Contents
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Tooltip title="Outline font size">
              <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)} sx={{ p: 0.4 }}>
                <MoreHorizIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>
          <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
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
                  setOutlineFontSize(size as "small" | "normal" | "large");
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
                    borderRadius: "6px",
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
                  ),
                },
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
                width: 6,
              },
              "&::-webkit-scrollbar-track": {
                bgcolor: "transparent",
              },
              "&::-webkit-scrollbar-thumb": {
                bgcolor: "var(--button-color, rgba(120, 120, 120, 0.25))",
                borderRadius: "9999px",
                border: "none",
                "&:hover": {
                  bgcolor: "primary.main",
                },
              },
            }}
          >
            {filteredProseHeadings.length === 0 ? (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  p: 3,
                  textAlign: "center",
                  height: "60%",
                  opacity: 0.6,
                }}
              >
                <InfoOutlinedIcon sx={{ fontSize: 24, mb: 1, opacity: 0.5 }} />
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, fontSize: "0.75rem" }}>
                  {searchQuery ? "No matching headings" : "No headings found"}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
                  {searchQuery
                    ? "Try a different search query."
                    : "Add headings using #, ##, or ### to structure your document."}
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
                      selected={isActive}
                      onClick={() => {
                        scrollToLine(heading.lineNumber, true);
                      }}
                      sx={{
                        pl: `${8 + indent}px`,
                        pr: 1,
                        py: heading.level === 1 ? 0.45 : 0.25,
                        borderRadius: "6px",
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
                              fontSize:
                                heading.level === 1
                                  ? fontSizes.section
                                  : heading.level === 2
                                    ? fontSizes.scene
                                    : fontSizes.synopsis,
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
    <Box
      id="outline-view"
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.paper",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      <Box
        sx={{
          p: 1.5,
          pb: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}
        >
          Scene Navigator
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Tooltip title="Outline font size">
            <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)} sx={{ p: 0.4 }}>
              <MoreHorizIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>
        <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
          <Box sx={{ px: 1.5, py: 0.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", fontWeight: 700 }}>
              Show
            </Typography>
          </Box>
          <MenuItem onClick={() => setShowSections((p) => !p)}>
            <Box component="span" sx={{ mr: 1, fontSize: 10, color: showSections ? "primary.main" : "text.disabled" }}>
              {showSections ? "✓" : "○"}
            </Box>
            Sections
          </MenuItem>
          <MenuItem onClick={() => setShowScenes((p) => !p)}>
            <Box component="span" sx={{ mr: 1, fontSize: 10, color: showScenes ? "primary.main" : "text.disabled" }}>
              {showScenes ? "✓" : "○"}
            </Box>
            Scenes
          </MenuItem>
          <MenuItem onClick={() => setShowSynopses((p) => !p)}>
            <Box component="span" sx={{ mr: 1, fontSize: 10, color: showSynopses ? "primary.main" : "text.disabled" }}>
              {showSynopses ? "✓" : "○"}
            </Box>
            Synopses
          </MenuItem>
          <MenuItem onClick={() => setShowStorylines((p) => !p)}>
            <Box
              component="span"
              sx={{ mr: 1, fontSize: 10, color: showStorylines ? "primary.main" : "text.disabled" }}
            >
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
                setOutlineFontSize(size as "small" | "normal" | "large");
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
        <Box sx={{ p: 1.5, pb: 1, display: "flex", gap: 0.8 }}>
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
                  borderRadius: "6px",
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
                ),
              },
            }}
          />
          <IconButton
            size="small"
            onClick={(e) => setFilterAnchorEl(e.currentTarget)}
            sx={{
              border: "1px solid",
              borderColor: activeFilterCount > 0 ? "primary.main" : "divider",
              bgcolor: activeFilterCount > 0 ? "action.selected" : "action.hover",
              borderRadius: "6px",
              height: "auto",
              minHeight: 0,
              minWidth: 0,
              alignSelf: "stretch",
              width: 32,
              p: 0.3,
            }}
          >
            <Badge
              badgeContent={activeFilterCount}
              color="primary"
              sx={{ "& .MuiBadge-badge": { fontSize: 8, height: 14, minWidth: 14, top: -2, right: -2 } }}
            >
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
          slotProps={{ paper: { sx: { p: 1.5, width: 260, borderRadius: "8px" } } }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 700, textTransform: "uppercase", display: "block", mb: 1 }}
          >
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
                const count = id === null ? Object.values(colorStats).reduce((a, b) => a + b, 0) : colorStats[id] || 0;
                if (id !== null && count === 0) return null;
                const isSelected = selectedColor === id;
                const hex = id ? getSceneColor({ color: id }) : undefined;
                return (
                  <Grid key={id ?? "all"}>
                    <Chip
                      label={`${label} (${count})`}
                      size="small"
                      onClick={() => setSelectedColor(isSelected ? null : id)}
                      sx={{
                        fontSize: 9.5,
                        height: 20,
                        borderRadius: "4px",
                        fontWeight: isSelected ? 700 : 500,
                        border: "1px solid",
                        borderColor: isSelected ? hex || "primary.main" : "divider",
                        bgcolor: isSelected ? hex || "primary.main" : "transparent",
                        color: isSelected ? "#fff" : "text.secondary",
                        cursor: "pointer",
                        "&:hover": {
                          bgcolor: isSelected ? hex || "primary.main" : "action.hover",
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
                          borderRadius: "4px",
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
          role="listbox"
          aria-label="Scene navigator"
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
            outline: "none",
            fontSize: fontSizeMap[outlineFontSize],
            fontFamily: "var(--font-ui)",
          }}
        >
          {flatNodes.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: "center", fontStyle: "italic" }}>
              No outline elements match your criteria.
            </Typography>
          ) : (
            <VirtualList
              listRef={virtualListRef}
              rowCount={flatNodes.length}
              rowHeight={rowHeight}
              rowComponent={NavigatorVirtualRow}
              rowProps={rowProps}
              overscanCount={6}
              defaultHeight={500}
              onResize={({ width }) => setListWidth(width)}
              style={{ height: "100%", width: "100%", outline: "none", scrollbarGutter: "stable" }}
            />
          )}
        </Box>
        {draggedItemIdx !== null && (
          <Box
            data-outline-root="true"
            role="status"
            sx={{
              mx: 1.5,
              my: 0.75,
              p: 1,
              fontSize: "0.75rem",
              textAlign: "center",
              borderRadius: "6px",
              border: "1px dashed var(--border-color)",
              bgcolor: dropTarget?.placement === "root" ? "action.selected" : "transparent",
            }}
          >
            Move outside all sections
          </Box>
        )}
        <ContextMenu
          open={Boolean(sceneContextMenu)}
          x={sceneContextMenu?.x ?? 0}
          y={sceneContextMenu?.y ?? 0}
          items={
            [
              {
                label: "Copy Scene",
                enabled: Boolean(editorView && sceneContextMenu),
                action: () => {
                  if (!editorView || !sceneContextMenu) return;
                  const scene = getSceneBlockAtLine(
                    editorView.state,
                    (positions
                      ? positions.mapper(sceneContextMenu.source)(sceneContextMenu.lineNumber - 1)
                      : sceneContextMenu.lineNumber - 1) + 1,
                  );
                  if (scene) void copyToClipboard(scene.text);
                },
              },
            ] satisfies ContextMenuItem[]
          }
          onClose={() => setSceneContextMenu(null)}
        />
      </Box>
    </Box>
  );
});

interface NavigatorRows {
  nodes: TreeNode[];
  activeId?: string;
  collapsedSections: Record<string, boolean>;
  draggedItemIdx: number | null;
  dropTarget: OutlineDropTarget | null;
  showStorylines: boolean;
  showSynopses: boolean;
  sceneIndexMap: Map<string, number>;
  fontSizes: React.ComponentProps<typeof OutlineRow>["fontSizes"];
  scrollToLine: React.ComponentProps<typeof OutlineRow>["scrollToLine"];
  handleItemClick: React.ComponentProps<typeof OutlineRow>["handleItemClick"];
  toggleSection: React.ComponentProps<typeof OutlineRow>["toggleSection"];
  handleHandleMouseDown: React.ComponentProps<typeof OutlineRow>["handleHandleMouseDown"];
  onContextMenu: React.ComponentProps<typeof OutlineRow>["onContextMenu"];
}
function NavigatorVirtualRow({
  index,
  style,
  ariaAttributes,
  nodes,
  activeId,
  collapsedSections,
  draggedItemIdx,
  dropTarget,
  sceneIndexMap,
  ...props
}: RowComponentProps<NavigatorRows>) {
  const node = nodes[index];
  const sceneIndex = sceneIndexMap.get(node.item.line.id) ?? -1;
  return (
    <div {...ariaAttributes} style={{ ...style, padding: "0 9.6px", boxSizing: "border-box", display: "flow-root" }}>
      <OutlineRow
        key={node.item.key ?? node.item.line.id}
        node={node}
        isActive={node.item.line.id === activeId}
        isCollapsed={Boolean(collapsedSections[node.item.key ?? node.item.line.id])}
        isDragging={sceneIndex >= 0 && draggedItemIdx === sceneIndex}
        dropPlacement={dropTarget?.line === node.item.index ? dropTarget.placement : undefined}
        sceneIndex={sceneIndex}
        {...props}
      />
    </div>
  );
}
