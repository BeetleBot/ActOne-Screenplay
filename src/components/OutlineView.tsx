import React, { useState, useEffect, useRef, useMemo } from "react";
import { useAppContext } from "../context/AppContext";
import { LineType, ParsedLine } from "../parser/FountainParser";
import { MoreVertical, Search, X } from "lucide-react";

interface OutlineItem {
  line: ParsedLine;
  index: number;
}

interface TreeNode {
  item: OutlineItem;
  depth: number;
  children: TreeNode[];
  synopses: OutlineItem[];
}

function getSceneColor(line: ParsedLine): string | undefined {
  if (line.marker) {
    return line.marker.color.startsWith("#")
      ? line.marker.color
      : `var(--scene-color-${line.marker.color})`;
  }
  if (line.color) {
    return line.color.startsWith("#") ? line.color : `var(--scene-color-${line.color})`;
  }
  return undefined;
}

function getSceneTitle(line: ParsedLine): string {
  if (line.marker && line.type !== LineType.heading) {
    return line.marker.description || "Marker";
  }
  return line.text
    .replace(/^[.#= ]+/, "")
    .replace(/\[\[.*?\]\]/g, "")
    .replace(/#[^#]+#\s*$/, "")
    .trim();
}

function buildTree(items: OutlineItem[], collapsed: { [id: string]: boolean }): TreeNode[] {
  const root: TreeNode[] = [];
  const stack: { node: TreeNode; sectionDepth: number }[] = [];

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
    } else if (item.line.type === LineType.synopse) {
      const parent = stack.length > 0
        ? stack[stack.length - 1].node
        : (root.length > 0 ? root[root.length - 1] : null);
      if (parent) {
        parent.synopses.push(item);
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
    }
  }
  return root;
}

function flattenSelectable(tree: TreeNode[]): TreeNode[] {
  const result: TreeNode[] = [];
  const walk = (nodes: TreeNode[]) => {
    for (const node of nodes) {
      if (node.item.line.type !== LineType.synopse) {
        result.push(node);
      }
      walk(node.children);
    }
  };
  walk(tree);
  return result;
}

export const OutlineView: React.FC = () => {
  const app = useAppContext();
  const {
    parsedDoc, scrollToLine, selectedSceneId,
    setSelectedSceneId, reorderScenes,
  } = app;

  const [collapsedSections, setCollapsedSections] = useState<{ [id: string]: boolean }>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [showSections, setShowSections] = useState(true);
  const [showScenes, setShowScenes] = useState(true);
  const [showSynopses, setShowSynopses] = useState(true);
  const [isGearPanelOpen, setIsGearPanelOpen] = useState(false);
  const [outlineFontSize, setOutlineFontSizeState] = useState<"small" | "normal" | "large">(
    () => (localStorage.getItem("actone-outline-font-size") as any) || "normal"
  );
  const [draggedItemIdx, setDraggedItemIdx] = useState<number | null>(null);
  const [dragOverItemIdx, setDragOverItemIdx] = useState<number | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLDivElement>(null);

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

  const handleDragStart = (e: React.DragEvent, id: string) => {
    const sceneIndex = scenesItems.findIndex((s) => s.line.id === id);
    if (sceneIndex !== -1) {
      e.dataTransfer.setData("text/plain", sceneIndex.toString());
      setDraggedItemIdx(sceneIndex);
    }
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    const sceneIndex = scenesItems.findIndex((s) => s.line.id === id);
    if (sceneIndex !== -1) setDragOverItemIdx(sceneIndex);
  };

  const handleDrop = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    const targetSceneIndex = scenesItems.findIndex((s) => s.line.id === id);
    const sourceSceneIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (sourceSceneIndex !== targetSceneIndex && !isNaN(sourceSceneIndex) && targetSceneIndex !== -1) {
      reorderScenes(sourceSceneIndex, targetSceneIndex);
    }
    setDraggedItemIdx(null);
    setDragOverItemIdx(null);
  };

  const handleItemClick = (item: OutlineItem, isSelectable: boolean, e: React.MouseEvent) => {
    scrollToLine(item.index, true);
    if (setSelectedSceneId && isSelectable) setSelectedSceneId(item.line.id);
    const container = e.currentTarget.closest('[tabIndex="0"]') as HTMLElement;
    if (container) container.focus();
  };

  const renderOutlineSynopses = (synopses: OutlineItem[]) => {
    if (synopses.length === 0) return null;

    if (synopses.length === 1) {
      const syn = synopses[0];
      return (
        <div className="outline-synopses-list">
          <span
            className="outline-synopsis-single"
            onClick={(e) => {
              e.stopPropagation();
              scrollToLine(syn.index, true);
              const container = e.currentTarget.closest('[tabIndex="0"]') as HTMLElement;
              if (container) container.focus();
            }}
          >
            {syn.line.text.replace(/^=[ ]*/, "").trim()}
          </span>
        </div>
      );
    }

    return (
      <div className="outline-synopses-list multiple">
        {synopses.map((syn) => (
          <span
            key={syn.line.id}
            className="outline-synopsis-bullet-item"
            onClick={(e) => {
              e.stopPropagation();
              scrollToLine(syn.index, true);
              const container = e.currentTarget.closest('[tabIndex="0"]') as HTMLElement;
              if (container) container.focus();
            }}
          >
            <span className="bullet-dot">•</span>
            <span className="bullet-text">
              {syn.line.text.replace(/^=[ ]*/, "").trim()}
            </span>
          </span>
        ))}
      </div>
    );
  };

  const renderTreeNode = (node: TreeNode): React.ReactNode => {
    const { item, depth, children, synopses } = node;
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
        <div
          key={line.id}
          className={`outline-section${isCollapsed ? " collapsed" : ""}`}
        >
          <div
            className={`outline-scene-card outline-section-card${isActive ? " active" : ""}`}
            data-scene-id={line.id}
            ref={isActive ? activeItemRef : null}
            onClick={(e) => handleItemClick(item, true, e)}
          >
            <div className="outline-scene-body">
              <div className="outline-scene-top">
                <span
                  className="outline-section-chevron"
                  onClick={(e) => toggleSection(line.id, e)}
                  data-collapsed={isCollapsed}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M3 2L7 5L3 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className={`outline-section-title depth-${line.sectionDepth || 1}`}>
                  {line.text.replace(/^[.#= ]+/, "").trim()}
                </span>
              </div>
              {showSynopses && renderOutlineSynopses(synopses)}
            </div>
          </div>
          {children.length > 0 && (
            <div className="outline-section-children" data-collapsed={isCollapsed}>
              {isCollapsed ? null : children.map(renderTreeNode)}
            </div>
          )}
        </div>
      );
    }

    if (isSynopsis) {
      return (
        <div
          key={line.id}
          className="outline-synopsis"
          style={{ "--depth": depth } as React.CSSProperties}
        >
          <span className="outline-synopsis-text">
            {line.text.replace(/^=[ ]*/, "").trim()}
          </span>
        </div>
      );
    }

    // Scene card
    const showDragOver = isDragOver && !isDragging;
    return (
      <div
        key={line.id}
        className={`outline-scene-card${isActive ? " active" : ""}${isDragging ? " dragging" : ""}${showDragOver ? " drag-over" : ""}`}
        data-scene-id={line.id}
        ref={isActive ? activeItemRef : null}
        style={{ "--depth": depth } as React.CSSProperties}
        onClick={(e) => handleItemClick(item, true, e)}
        draggable={isScene}
        onDragStart={isScene ? (e) => handleDragStart(e, line.id) : undefined}
        onDragOver={isScene ? (e) => handleDragOver(e, line.id) : undefined}
        onDragLeave={isScene ? () => setDragOverItemIdx(null) : undefined}
        onDrop={isScene ? (e) => handleDrop(e, line.id) : undefined}
      >
        {sceneColor && <div className="outline-scene-accent" style={{ backgroundColor: sceneColor }} />}
        <div className="outline-scene-body">
          <div className="outline-scene-top">
            {line.sceneNumber && (
              <span className="outline-scene-number">{line.sceneNumber}</span>
            )}
            <span
              className="outline-scene-title"
              style={sceneColor ? { color: sceneColor } : undefined}
            >
              {getSceneTitle(line)}
            </span>
            {line.storylines && line.storylines.length > 0 && (
              <span className="outline-scene-tags">
                {line.storylines.map((sl) => (
                  <span key={sl} className="storyline-badge">{sl}</span>
                ))}
              </span>
            )}
          </div>
          {showSynopses && renderOutlineSynopses(synopses)}
        </div>
      </div>
    );
  };

  const renderTree = (nodes: TreeNode[]): React.ReactNode[] =>
    nodes.map(renderTreeNode);

  return (
    <div className={`outline-view outline-size-${outlineFontSize}`}>
      <div className="outline-header">
        <h3 className="outline-title">Navigator</h3>
        <button
          className="outline-gear-btn"
          onClick={() => setIsGearPanelOpen((p) => !p)}
          tabIndex={0}
          aria-label="Outline options"
        >
          <MoreVertical size={14} />
        </button>
        {isGearPanelOpen && (
          <>
            <div className="outline-backdrop" onClick={() => setIsGearPanelOpen(false)} />
            <div
              className="outline-gear-panel"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setIsGearPanelOpen(false); }
              }}
              ref={(el) => { if (el) setTimeout(() => el.focus(), 30); }}
            >
              <div className="outline-gear-header">Outline Size</div>
              <select
                value={outlineFontSize}
                onChange={(e) => setOutlineFontSize(e.target.value as any)}
                tabIndex={0}
                className="outline-size-select"
              >
                <option value="small">Small</option>
                <option value="normal">Normal</option>
                <option value="large">Large</option>
              </select>
            </div>
          </>
        )}
      </div>

      <div className="outline-search-row">
        <div className="outline-search-input-wrap">
          <Search size={12} className="outline-search-icon" />
          <input
            type="text"
            className="outline-search-input"
            placeholder="Search outline..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="outline-search-clear" onClick={() => setSearchQuery("")} tabIndex={-1}>
              <X size={12} />
            </button>
          )}
        </div>
        <div className="outline-chips">
          <button
            className={`outline-chip${showSections ? " active" : ""}`}
            onClick={() => setShowSections((p) => !p)}
          >
            Sections
          </button>
          <button
            className={`outline-chip${showScenes ? " active" : ""}`}
            onClick={() => setShowScenes((p) => !p)}
          >
            Scenes
          </button>
          <button
            className={`outline-chip${showSynopses ? " active" : ""}`}
            onClick={() => setShowSynopses((p) => !p)}
          >
            Synopses
          </button>
        </div>
      </div>

      <div
        className="outline-tree"
        ref={listRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        role="listbox"
        aria-label="Scene navigator"
      >
        {tree.length === 0 ? (
          <p className="outline-empty">No outline elements match your criteria.</p>
        ) : (
          renderTree(tree)
        )}
      </div>
    </div>
  );
};
