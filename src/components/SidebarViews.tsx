import React, { useState, useEffect, useRef } from "react";
import { useAppContext } from "../context/AppContext";
import { LineType } from "../parser/FountainParser";
import { Settings } from "lucide-react";
import { TodoView } from "./TodoView";

interface SidebarViewProps {
  activeTab: string;
}

export const SidebarViews: React.FC<SidebarViewProps> = ({ activeTab }) => {
  const { parsedDoc, scrollToLine, updateSettings, selectedSceneId, activeLineId, setSelectedSceneId, reorderScenes, filePath, saveFileAs } = useAppContext();
  const [collapsedSections, setCollapsedSections] = useState<{ [id: string]: boolean }>({});
  const [characterFilter, setCharacterFilter] = useState("");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [showSections, setShowSections] = useState(true);
  const [showScenes, setShowScenes] = useState(true);
  const [showSynopses, setShowSynopses] = useState(true);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isGearPanelOpen, setIsGearPanelOpen] = useState(false);
  const [outlineFontSize, setOutlineFontSizeState] = useState<"small" | "normal" | "large">(
    () => (localStorage.getItem("actone-outline-font-size") as any) || "normal"
  );

  const setOutlineFontSize = (size: "small" | "normal" | "large") => {
    setOutlineFontSizeState(size);
    localStorage.setItem("actone-outline-font-size", size);
  };

  const [draggedItemIdx, setDraggedItemIdx] = useState<number | null>(null);
  const [dragOverItemIdx, setDragOverItemIdx] = useState<number | null>(null);
  
  const activeItemRef = useRef<HTMLDivElement>(null);
  const outlineListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === "outline" && activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [selectedSceneId, activeLineId, activeTab]);

  useEffect(() => {
    if (activeTab === "outline" && outlineListRef.current) {
      outlineListRef.current.focus();
    }
  }, [activeTab]);

  const toggleSection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  if (activeTab === "outline") {
    const sectionFontSize = outlineFontSize === "small" ? "11px" : outlineFontSize === "large" ? "14px" : "12px";
    const itemFontSize = outlineFontSize === "small" ? "10px" : outlineFontSize === "large" ? "13px" : "11px";
    const badgeFontSize = outlineFontSize === "small" ? "8px" : outlineFontSize === "large" ? "11px" : "9px";

    const rawOutlineItems = parsedDoc.lines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => line.isOutlineElement || line.type === LineType.synopse);

    // Identify scene index among all scenes for drag and drop
    const scenesItems = rawOutlineItems.filter(item => item.line.type === LineType.heading || (item.line.isOutlineElement && item.line.type !== LineType.section && item.line.type !== LineType.synopse));

    const outlineItems = rawOutlineItems.filter((item) => {
      const isSection = item.line.type === LineType.section;
      const isSynopsis = item.line.type === LineType.synopse;
      const isScene = !isSection && !isSynopsis;

      if (!showSections && isSection) return false;
      if (!showScenes && isScene) return false;
      if (!showSynopses && isSynopsis) return false;

      if (searchQuery) {
        const textToSearch = item.line.text.replace(/^[.#= ]+/, "").trim().toLowerCase();
        if (!textToSearch.includes(searchQuery.toLowerCase())) {
          return false;
        }
      }

      return true;
    });

    const visibleItems: typeof outlineItems = [];
    let isCollapsed = false;
    let collapseDepth = 0;

    outlineItems.forEach((item) => {
      const isSection = item.line.type === LineType.section;
      const depth = item.line.sectionDepth || 0;

      if (isCollapsed) {
        if (isSection && depth <= collapseDepth) {
          isCollapsed = false;
        } else {
          return;
        }
      }

      visibleItems.push(item);

      if (isSection && collapsedSections[item.line.id]) {
        isCollapsed = true;
        collapseDepth = depth;
      }
    });


    
    interface GroupedItem {
      main: { line: typeof parsedDoc.lines[0], index: number };
      synopses: { line: typeof parsedDoc.lines[0], index: number }[];
    }

    const groupedItems: GroupedItem[] = [];
    visibleItems.forEach((item) => {
      if (item.line.type === LineType.synopse) {
        if (groupedItems.length > 0 && groupedItems[groupedItems.length - 1].main.line.type !== LineType.synopse) {
          groupedItems[groupedItems.length - 1].synopses.push(item);
        } else {
          groupedItems.push({ main: item, synopses: [] });
        }
      } else {
        groupedItems.push({ main: item, synopses: [] });
      }
    });

    const selectableGroups = groupedItems.filter(g => g.main.line.type !== LineType.synopse);

    let activeSelectableIdx = -1;
    if (selectedSceneId) {
      activeSelectableIdx = selectableGroups.findIndex(g => g.main.line.id === selectedSceneId);
    }
    if (activeSelectableIdx === -1 && selectableGroups.length > 0) activeSelectableIdx = 0;

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (selectableGroups.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const nextIdx = Math.min(selectableGroups.length - 1, activeSelectableIdx + 1);
        const targetItem = selectableGroups[nextIdx].main;
        if (setSelectedSceneId) setSelectedSceneId(targetItem.line.id);
        scrollToLine(targetItem.index, true);
        requestAnimationFrame(() => {
          const el = outlineListRef.current?.querySelector(`[data-scene-id="${targetItem.line.id}"]`) as HTMLElement;
          el?.scrollIntoView({ block: "center", behavior: "smooth" });
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const nextIdx = Math.max(0, activeSelectableIdx - 1);
        const targetItem = selectableGroups[nextIdx].main;
        if (setSelectedSceneId) setSelectedSceneId(targetItem.line.id);
        scrollToLine(targetItem.index, true);
        requestAnimationFrame(() => {
          const el = outlineListRef.current?.querySelector(`[data-scene-id="${targetItem.line.id}"]`) as HTMLElement;
          el?.scrollIntoView({ block: "center", behavior: "smooth" });
        });
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (activeSelectableIdx >= 0 && activeSelectableIdx < selectableGroups.length) {
          const targetItem = selectableGroups[activeSelectableIdx].main;
          scrollToLine(targetItem.index);
        }
      }
    };

    const handleDragStart = (e: React.DragEvent, id: string) => {
      const sceneIndex = scenesItems.findIndex(s => s.line.id === id);
      if (sceneIndex !== -1) {
        e.dataTransfer.setData("text/plain", sceneIndex.toString());
        setDraggedItemIdx(sceneIndex);
      }
    };

    const handleDragOver = (e: React.DragEvent, id: string) => {
      e.preventDefault();
      const sceneIndex = scenesItems.findIndex(s => s.line.id === id);
      if (sceneIndex !== -1) {
        setDragOverItemIdx(sceneIndex);
      }
    };

    const handleDrop = (e: React.DragEvent, id: string) => {
      e.preventDefault();
      const targetSceneIndex = scenesItems.findIndex(s => s.line.id === id);
      const sourceSceneIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
      
      if (sourceSceneIndex !== targetSceneIndex && !isNaN(sourceSceneIndex) && targetSceneIndex !== -1) {
        reorderScenes(sourceSceneIndex, targetSceneIndex);
      }
      
      setDraggedItemIdx(null);
      setDragOverItemIdx(null);
    };

    return (
      <div className="outline-view" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ marginBottom: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 600, opacity: 0.8, margin: 0 }}>
              Navigator
            </h3>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", position: "relative" }}>
              <button 
                onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  fontSize: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                {isFilterPanelOpen ? "Hide Search" : "Search"}
              </button>
              <button
                onClick={() => setIsGearPanelOpen(!isGearPanelOpen)}
                tabIndex={0}
                aria-label="Outline options"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  padding: "4px"
                }}
              >
                <Settings size={14} />
              </button>

              {isGearPanelOpen && (
                <>
                  <div
                    style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9 }}
                    onClick={() => setIsGearPanelOpen(false)}
                  />
                  <div
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsGearPanelOpen(false);
                      }
                    }}
                    ref={(el) => { if (el && isGearPanelOpen) setTimeout(() => el.focus(), 30); }}
                    style={{
                      position: "absolute",
                      top: "24px",
                      right: 0,
                      width: "180px",
                      background: "var(--bg-sidebar)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "6px",
                      padding: "8px",
                      zIndex: 10,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      outline: "none"
                    }}>
                    <div style={{ fontSize: "11px", fontWeight: 600, borderBottom: "1px solid var(--border-color)", paddingBottom: "4px" }}>
                      Outline Options
                    </div>
                    <label tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setShowSections(!showSections); }}} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", cursor: "pointer", outline: "none", borderRadius: "4px" }}>
                      <input type="checkbox" className="native-checkbox" checked={showSections} onChange={e => setShowSections(e.target.checked)} tabIndex={-1} />
                      Show Sections
                    </label>
                    <label tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setShowScenes(!showScenes); }}} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", cursor: "pointer", outline: "none", borderRadius: "4px" }}>
                      <input type="checkbox" className="native-checkbox" checked={showScenes} onChange={e => setShowScenes(e.target.checked)} tabIndex={-1} />
                      Show Scenes
                    </label>
                    <label tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setShowSynopses(!showSynopses); }}} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", cursor: "pointer", outline: "none", borderRadius: "4px" }}>
                      <input type="checkbox" className="native-checkbox" checked={showSynopses} onChange={e => setShowSynopses(e.target.checked)} tabIndex={-1} />
                      Show Synopses
                    </label>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 600 }}>Outline Size</span>
                      <select
                        value={outlineFontSize}
                        onChange={e => setOutlineFontSize(e.target.value as any)}
                        tabIndex={0}
                        className="outline-size-select"
                      >
                        <option value="small">Small</option>
                        <option value="normal">Normal</option>
                        <option value="large">Large</option>
                      </select>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {isFilterPanelOpen && (
            <div className="outline-filters" style={{
              background: "var(--bg-editor)",
              padding: "8px",
              borderRadius: "6px",
              border: "1px solid var(--border-color)",
              display: "flex",
              flexDirection: "column",
              gap: "8px"
            }}>
              <input
                type="text"
                placeholder="Search outline..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "4px 8px",
                  fontSize: "12px",
                  border: "1px solid var(--border-color)",
                  borderRadius: "4px",
                  background: "var(--bg-app)",
                  color: "var(--text-main)",
                  outline: "none"
                }}
              />
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", minHeight: 0 }}>
          {groupedItems.length === 0 ? (
            <p style={{ fontSize: "13px", color: "var(--text-muted)", fontStyle: "italic" }}>
              No outline elements match your criteria.
            </p>
          ) : (
            <div
              ref={outlineListRef}
              tabIndex={0}
              onKeyDown={handleKeyDown}
              role="listbox"
              aria-label="Scene navigator"
              style={{ display: "flex", flexDirection: "column", gap: "0", outline: "none", paddingBottom: "20px" }}
            >
              {groupedItems.map((group) => {
                const { main, synopses } = group;
                const { line, index } = main;
                const isSection = line.type === LineType.section;
                const isSynopsis = line.type === LineType.synopse;
                const isScene = !isSection && !isSynopsis;
                
                const isSelectable = isSection || isScene;
                const isActive = isSelectable && (line.id === selectableGroups[activeSelectableIdx]?.main.line.id || line.id === selectedSceneId);

                const hasMarker = !!line.marker;
                const rawMarkerColor = hasMarker ? (line.marker!.color.startsWith("#") ? line.marker!.color : `var(--scene-color-${line.marker!.color})`) : undefined;
                
                let bgStyle = isActive ? "var(--bg-editor)" : "transparent";
                let markerTextColor = "inherit";
                if (isScene) {
                  if (rawMarkerColor) {
                    markerTextColor = rawMarkerColor;
                  } else if (line.color) {
                     markerTextColor = line.color.startsWith("#") ? line.color : `var(--scene-color-${line.color})`;
                  }
                }
                
                const sceneIndex = isScene ? scenesItems.findIndex(s => s.line.id === line.id) : -1;
                const isDragging = isScene && draggedItemIdx === sceneIndex;
                const isDragOver = isScene && dragOverItemIdx === sceneIndex;

                const baseStyle: React.CSSProperties = {
                  cursor: isScene ? "grab" : "pointer",
                  transition: "all 0.15s ease",
                  marginLeft: "0px",
                  backgroundColor: bgStyle,
                  opacity: isDragging ? 0.5 : 1,
                  borderRadius: "6px",
                  boxShadow: isActive && !isDragOver ? "0 2px 8px rgba(0, 0, 0, 0.15), inset 0 0 0 1px var(--accent-color)" : "none",
                };

                const handleItemClick = (e: React.MouseEvent) => {
                  scrollToLine(index, true);
                  if (setSelectedSceneId && isSelectable) {
                    setSelectedSceneId(line.id);
                  }
                  const container = e.currentTarget.closest('[tabIndex="0"]') as HTMLElement;
                  if (container) container.focus();
                };

                if (isSection) {
                  return (
                    <div
                      key={line.id}
                      data-scene-id={line.id}
                      ref={isActive ? activeItemRef : null}
                      style={{ 
                        ...baseStyle, 
                        padding: "6px 8px", 
                        display: "flex", 
                        alignItems: "center", 
                        color: isActive ? "var(--text-main)" : "var(--accent-color)", 
                        fontWeight: 700, 
                        fontSize: sectionFontSize,
                        marginTop: "4px",
                      }}
                      onClick={handleItemClick}
                    >
                      <div style={{ width: "20px", textAlign: "right", marginRight: "6px", flexShrink: 0 }}>
                        <span
                          onClick={(e) => toggleSection(line.id, e)}
                          style={{
                            fontSize: "10px",
                            opacity: 0.8,
                            cursor: "pointer",
                            display: "inline-block",
                            transform: collapsedSections[line.id] ? "rotate(-90deg)" : "none",
                            transition: "transform 0.15s",
                          }}
                        >
                          ▽
                        </span>
                      </div>
                      <span>{line.text.replace(/^[.#= ]+/, "").trim()}</span>
                    </div>
                  );
                }

                return (
                  <div
                    key={line.id}
                    data-scene-id={line.id}
                    ref={isActive ? activeItemRef : null}
                    style={{
                      ...baseStyle,
                      padding: "4px 8px",
                      display: "flex",
                      alignItems: "flex-start",
                      color: "var(--text-main)",
                      borderTop: isDragOver ? "2px solid var(--accent-color)" : "1px solid transparent",
                    }}
                    onClick={handleItemClick}
                    draggable={isScene}
                    onDragStart={isScene ? (e) => handleDragStart(e, line.id) : undefined}
                    onDragOver={isScene ? (e) => handleDragOver(e, line.id) : undefined}
                    onDragLeave={isScene ? () => setDragOverItemIdx(null) : undefined}
                    onDrop={isScene ? (e) => handleDrop(e, line.id) : undefined}
                    className={`sidebar-item`}
                  >
                      <div style={{ 
                        width: "20px", 
                        textAlign: "right", 
                        marginRight: "6px", 
                        flexShrink: 0,
                        fontSize: itemFontSize,
                        fontWeight: 600,
                        color: "var(--text-muted)"
                      }}>
                        {line.sceneNumber || ""}
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "0px", flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", width: "100%" }}>
                          <span style={{ 
                            fontSize: itemFontSize, 
                            fontWeight: isActive ? 700 : 600, 
                            whiteSpace: "nowrap", 
                            overflow: "hidden", 
                            textOverflow: "ellipsis",
                            textTransform: "uppercase",
                            color: markerTextColor !== "inherit" ? markerTextColor : undefined,
                            opacity: isActive ? 1 : 0.85
                          }}>
                            {hasMarker && line.type !== LineType.heading
                              ? (line.marker!.description || "Marker")
                              : line.text.replace(/^[.#= ]+/, "").replace(/\[\[.*?\]\]/g, "").replace(/#[^#]+#\s*$/, "").trim()}
                          </span>
                          {line.storylines && line.storylines.length > 0 && (
                            <span style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                              {line.storylines.map((sl) => (
                                <span key={sl} className="storyline-badge" style={{ fontSize: badgeFontSize, padding: "1px 3px" }}>
                                  {sl}
                                </span>
                              ))}
                            </span>
                          )}
                        </div>
                        
                        {synopses.length > 0 && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "0px", marginTop: "2px", width: "100%" }}>
                            {synopses.map((syn) => (
                              <div
                                key={syn.line.id}
                                style={{ 
                                  fontSize: itemFontSize, 
                                  color: "var(--text-muted)", 
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  opacity: isActive ? 0.9 : 0.7
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  scrollToLine(syn.index, true);
                                  const container = e.currentTarget.closest('[tabIndex="0"]') as HTMLElement;
                                  if (container) container.focus();
                                }}
                              >
                                {syn.line.text.replace(/^=[ ]*/, "").trim()}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (activeTab === "notepad") {
    const notepadText = parsedDoc.settings.notepad || "";

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      updateSettings((prev: any) => ({
        ...prev,
        notepad: val,
      }));
    };

    return (
      <div className="notepad-view" style={{ display: "flex", flexDirection: "column", height: "100%", gap: "8px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 600, opacity: 0.8 }}>Document Notepad</h3>
        <textarea
          value={notepadText}
          onChange={handleChange}
          style={{
            flex: 1,
            width: "100%",
            minHeight: "300px",
            resize: "none",
            backgroundColor: "var(--bg-editor)",
            color: "var(--text-main)",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            padding: "10px",
            fontFamily: "var(--font-ui)",
            fontSize: "13px",
            outline: "none",
          }}
          placeholder="Type your outline notes, beats, or draft goals here..."
        />
      </div>
    );
  }

  if (activeTab === "characters") {
    const characterMap: { [name: string]: number } = {};
    parsedDoc.lines.forEach((line) => {
      if (line.type === LineType.character || line.type === LineType.dualDialogueCharacter) {
        const name = line.text
          .replace(/^@[ ]*/, "")
          .replace(/[ ]*\^[ ]*$/, "")
          .replace(/\s*\([^)]*\)/g, "")
          .trim()
          .toUpperCase();
        if (name) {
          characterMap[name] = (characterMap[name] || 0) + 1;
        }
      }
    });

    const rawCharacters = Object.entries(characterMap).sort((a, b) => b[1] - a[1]);
    const filteredCharacters = rawCharacters.filter(([name]) =>
      name.toLowerCase().includes(characterFilter.toLowerCase())
    );

    const genders = parsedDoc.settings.genders || {};

    const handleGenderChange = (name: string, gender: string) => {
      updateSettings((prev: any) => ({
        ...prev,
        genders: {
          ...(prev.genders || {}),
          [name]: gender,
        },
      }));
    };

    const getGenderColor = (gender: string) => {
      switch (gender) {
        case "male":
          return "#0081ef";
        case "female":
          return "#fa6fc1";
        case "nonbinary":
          return "#b520da";
        default:
          return "#969696";
      }
    };

    const isLegacy = filePath !== null && !filePath.toLowerCase().endsWith(".actone");

    return (
      <div className="characters-view" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "4px", opacity: 0.8 }}>
          Character Tracking
        </h3>
        
        {isLegacy && (
          <div style={{
            padding: "10px",
            backgroundColor: "rgba(229, 62, 62, 0.08)",
            border: "1px solid rgba(229, 62, 62, 0.3)",
            borderRadius: "8px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            fontSize: "12px",
            color: "var(--text-main)",
            marginBottom: "8px"
          }}>
            <p style={{ margin: 0, fontWeight: 500, color: "#e53e3e" }}>
              Only available on .actone
            </p>
            <p style={{ margin: 0, fontSize: "11px", opacity: 0.8 }}>
              Workspace settings and character tracking require saving the screenplay as an ActOne Bundle (.actone).
            </p>
            <button
              onClick={() => saveFileAs()}
              style={{
                backgroundColor: "#e53e3e",
                color: "#ffffff",
                border: "none",
                borderRadius: "4px",
                padding: "6px 12px",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
                alignSelf: "flex-start",
                transition: "background-color 0.2s"
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#c53030"}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#e53e3e"}
            >
              Save as .actone
            </button>
          </div>
        )}

        <input
          type="text"
          className="character-search-input"
          value={characterFilter}
          disabled={isLegacy}
          onChange={(e) => setCharacterFilter(e.target.value)}
          placeholder={isLegacy ? "Tracking disabled..." : "Filter characters..."}
          style={{
            width: "100%",
            padding: "6px 10px",
            fontSize: "12px",
            border: "1px solid var(--border-color)",
            borderRadius: "6px",
            backgroundColor: "var(--bg-editor)",
            color: "var(--text-main)",
            outline: "none",
            opacity: isLegacy ? 0.5 : 1,
            cursor: isLegacy ? "not-allowed" : "text",
          }}
        />
        {filteredCharacters.length === 0 ? (
          <p style={{ fontSize: "13px", color: "var(--text-muted)", fontStyle: "italic" }}>
            No characters found matching search.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", opacity: isLegacy ? 0.6 : 1 }}>
            {filteredCharacters.map(([name, count]) => {
              const gender = genders[name] || "unknown";
              return (
                <div
                  key={name}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    padding: "8px",
                    border: `1px solid var(--border-color)`,
                    borderLeft: isLegacy ? `4px solid var(--border-color)` : `4px solid ${getGenderColor(gender)}`,
                    borderRadius: "8px",
                    backgroundColor: "var(--bg-editor)",
                    gap: "4px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", fontWeight: 700 }}>{name}</span>
                    <span
                      style={{
                        fontSize: "11px",
                        backgroundColor: "var(--border-color)",
                        padding: "2px 6px",
                        borderRadius: "10px",
                        fontWeight: 500,
                      }}
                    >
                      {count} lines
                    </span>
                  </div>
                  <select
                    value={gender}
                    disabled={isLegacy}
                    onChange={(e) => handleGenderChange(name, e.target.value)}
                    className={`character-gender-select gender-${gender}`}
                    style={isLegacy ? { opacity: 0.5, cursor: "not-allowed" } : {}}
                  >
                    <option value="unknown">Gender: Unknown</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="nonbinary">Non-Binary</option>
                  </select>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (activeTab === "stats") {
    const totalLines = parsedDoc.lines.length;
    const pageEstimate = Math.max(1, Math.round(totalLines / 54));

    let totalWords = 0;
    let dialogueWords = 0;
    let actionWords = 0;
    let headingCount = 0;

    const locationCounts: { [loc: string]: number } = {};
    const genderDialogueLines: { [gender: string]: number } = { male: 0, female: 0, nonbinary: 0, unknown: 0 };
    const genders = parsedDoc.settings.genders || {};

    let currentSpeaker = "";

    parsedDoc.lines.forEach((line) => {
      const words = line.text.trim().split(/\s+/).filter((w) => w !== "").length;
      totalWords += words;

      if (line.type === LineType.heading) {
        headingCount++;
        const text = line.text.replace(/^[. ]+/, "").toUpperCase();
        let loc = text;
        const dashIdx = text.indexOf(" -");
        if (dashIdx !== -1) {
          loc = text.substring(0, dashIdx).trim();
        }
        locationCounts[loc] = (locationCounts[loc] || 0) + 1;
      } else if (line.type === LineType.character || line.type === LineType.dualDialogueCharacter) {
        currentSpeaker = line.text
          .replace(/^@[ ]*/, "")
          .replace(/[ ]*\^[ ]*$/, "")
          .replace(/\s*\([^)]*\)/g, "")
          .trim()
          .toUpperCase();
      } else if (line.type === LineType.dialogue || line.type === LineType.dualDialogue) {
        dialogueWords += words;
        const gender = genders[currentSpeaker] || "unknown";
        genderDialogueLines[gender] = (genderDialogueLines[gender] || 0) + 1;
      } else if (line.type === LineType.action) {
        actionWords += words;
      }
    });

    const dialoguePct = totalWords > 0 ? Math.round((dialogueWords / totalWords) * 100) : 0;
    const actionPct = totalWords > 0 ? Math.round((actionWords / totalWords) * 100) : 0;

    const locations = Object.entries(locationCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const totalDialogueLines = Object.values(genderDialogueLines).reduce((a, b) => a + b, 0);

    return (
      <div className="stats-view" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 600, opacity: 0.8 }}>Screenplay Stats</h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <div
            style={{
              padding: "10px",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              backgroundColor: "var(--bg-editor)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
              Est. Pages
            </span>
            <span style={{ fontSize: "20px", fontWeight: 700, marginTop: "4px" }}>{pageEstimate}</span>
          </div>
          <div
            style={{
              padding: "10px",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              backgroundColor: "var(--bg-editor)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
              Total Words
            </span>
            <span style={{ fontSize: "20px", fontWeight: 700, marginTop: "4px" }}>{totalWords}</span>
          </div>
          <div
            style={{
              padding: "10px",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              backgroundColor: "var(--bg-editor)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
              Total Scenes
            </span>
            <span style={{ fontSize: "20px", fontWeight: 700, marginTop: "4px" }}>{headingCount}</span>
          </div>
          <div
            style={{
              padding: "10px",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              backgroundColor: "var(--bg-editor)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
              Total Lines
            </span>
            <span style={{ fontSize: "20px", fontWeight: 700, marginTop: "4px" }}>{totalLines}</span>
          </div>
        </div>

        <div
          style={{
            padding: "12px",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            backgroundColor: "var(--bg-editor)",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
            Dialogue vs Action Balance
          </span>

          <div style={{ display: "flex", height: "16px", borderRadius: "8px", overflow: "hidden", marginTop: "4px" }}>
            <div style={{ width: `${dialoguePct}%`, backgroundColor: "var(--accent-color)" }} />
            <div style={{ width: `${actionPct}%`, backgroundColor: "var(--text-muted)", opacity: 0.3 }} />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "11px",
              fontWeight: 500,
              marginTop: "2px",
            }}
          >
            <span style={{ color: "var(--accent-color)" }}>Dialogue: {dialoguePct}%</span>
            <span style={{ color: "var(--text-muted)" }}>Action: {actionPct}%</span>
          </div>
        </div>

        <div
          style={{
            padding: "12px",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            backgroundColor: "var(--bg-editor)",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
            Dialogue Gender Split
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
            {["male", "female", "nonbinary", "unknown"].map((g) => {
              const count = genderDialogueLines[g];
              const pct = totalDialogueLines > 0 ? Math.round((count / totalDialogueLines) * 100) : 0;
              const color = g === "male" ? "#0081ef" : g === "female" ? "#fa6fc1" : g === "nonbinary" ? "#b520da" : "#969696";
              return (
                <div key={g} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
                    <span style={{ textTransform: "capitalize" }}>{g}</span>
                    <span>{pct}%</span>
                  </div>
                  <div style={{ height: "6px", backgroundColor: "rgba(128,128,128,0.15)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", backgroundColor: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div
          style={{
            padding: "12px",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            backgroundColor: "var(--bg-editor)",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
            Top Locations
          </span>
          {locations.length === 0 ? (
            <p style={{ fontSize: "12px", fontStyle: "italic", color: "var(--text-muted)" }}>No locations parsed.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {locations.map(([loc, count]) => (
                <div key={loc} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{loc}</span>
                  <span style={{ fontWeight: 600, color: "var(--accent-color)" }}>{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (activeTab === "todo") {
    return <TodoView />;
  }

  return null;
};
