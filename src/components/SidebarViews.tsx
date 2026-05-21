import React, { useState } from "react";
import { useScreenplay } from "../context/ScreenplayContext";
import { LineType } from "../parser/FountainParser";

interface SidebarViewProps {
  activeTab: string;
}

export const SidebarViews: React.FC<SidebarViewProps> = ({ activeTab }) => {
  const { parsedDoc, scrollToLine, updateSettings, selectedSceneId, activeLineId, setSelectedSceneId } = useScreenplay();
  const [collapsedSections, setCollapsedSections] = useState<{ [id: string]: boolean }>({});
  const [characterFilter, setCharacterFilter] = useState("");

  const toggleSection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  if (activeTab === "outline") {
    const outlineItems = parsedDoc.lines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => line.isOutlineElement || line.type === LineType.synopse);

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

    const currentDocLineIndex = parsedDoc.lines.findIndex((l) => l.id === activeLineId);
    let closestOutlineItemIndex = -1;
    for (let i = 0; i < visibleItems.length; i++) {
      if (visibleItems[i].index <= currentDocLineIndex) {
        closestOutlineItemIndex = i;
      } else {
        break;
      }
    }
    const activeIdx = closestOutlineItemIndex !== -1 ? closestOutlineItemIndex : 0;

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (visibleItems.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const nextIdx = Math.min(visibleItems.length - 1, activeIdx + 1);
        scrollToLine(visibleItems[nextIdx].index);
        if (setSelectedSceneId) {
          setSelectedSceneId(visibleItems[nextIdx].line.id);
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const nextIdx = Math.max(0, activeIdx - 1);
        scrollToLine(visibleItems[nextIdx].index);
        if (setSelectedSceneId) {
          setSelectedSceneId(visibleItems[nextIdx].line.id);
        }
      }
    };

    return (
      <div className="outline-view">
        <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "12px", opacity: 0.8 }}>
          Screenplay Outline
        </h3>
        {visibleItems.length === 0 ? (
          <p style={{ fontSize: "13px", color: "var(--text-muted)", fontStyle: "italic" }}>
            No outline elements. Use # for sections and INT./EXT. for scenes.
          </p>
        ) : (
          <div
            tabIndex={0}
            onKeyDown={handleKeyDown}
            style={{ display: "flex", flexDirection: "column", gap: "4px", outline: "none" }}
          >
            {visibleItems.map(({ line, index }) => {
              const depth = line.sectionDepth || 0;
              const isSection = line.type === LineType.section;
              const isSynopsis = line.type === LineType.synopse;
              const isActive = index === visibleItems[activeIdx]?.index || line.id === selectedSceneId;

              const style: React.CSSProperties = {
                padding: "6px 8px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "background 0.15s, color 0.15s",
                paddingLeft: `${Math.max(8, depth * 12)}px`,
                color: isActive
                  ? "var(--text-main)"
                  : isSection
                  ? "var(--accent-color)"
                  : isSynopsis
                  ? "var(--text-muted)"
                  : "var(--text-main)",
                fontWeight: isActive ? 600 : isSection ? 600 : isSynopsis ? 400 : 500,
                fontStyle: isSynopsis ? "italic" : "normal",
                textTransform: isSection || isSynopsis ? "none" : "uppercase",
                backgroundColor: isActive ? "rgba(128, 128, 128, 0.15)" : "transparent",
              };

              return (
                <div
                  key={line.id}
                  style={style}
                  onClick={() => {
                    scrollToLine(index);
                    if (setSelectedSceneId) {
                      setSelectedSceneId(line.id);
                    }
                  }}
                  className="sidebar-item"
                >
                  {isSection && (
                    <span
                      onClick={(e) => toggleSection(line.id, e)}
                      style={{
                        marginRight: "4px",
                        fontSize: "10px",
                        opacity: 0.7,
                        cursor: "pointer",
                        display: "inline-block",
                        transform: collapsedSections[line.id] ? "rotate(-90deg)" : "none",
                        transition: "transform 0.15s",
                      }}
                    >
                      ▼
                    </span>
                  )}
                  {line.color && !isSection && (
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: line.color.startsWith("#")
                          ? line.color
                          : `var(--scene-color-${line.color})`,
                        display: "inline-block",
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {line.text.replace(/^[.#= ]+/, "")}
                  </span>
                  {line.sceneNumber && (
                    <span style={{ marginLeft: "auto", fontSize: "11px", opacity: 0.5, fontWeight: "bold" }}>
                      {line.sceneNumber}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (activeTab === "cards") {
    return (
      <div className="cards-view" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "4px", opacity: 0.8 }}>
          Index Cards View
        </h3>
        <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
          Switch to "Index Cards" workspace in the toolbar for drag-and-drop.
        </p>
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

    return (
      <div className="characters-view" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "4px", opacity: 0.8 }}>
          Character Tracking
        </h3>
        <input
          type="text"
          className="character-search-input"
          value={characterFilter}
          onChange={(e) => setCharacterFilter(e.target.value)}
          placeholder="Filter characters..."
          style={{
            width: "100%",
            padding: "6px 10px",
            fontSize: "12px",
            border: "1px solid var(--border-color)",
            borderRadius: "6px",
            backgroundColor: "var(--bg-editor)",
            color: "var(--text-main)",
            outline: "none",
          }}
        />
        {filteredCharacters.length === 0 ? (
          <p style={{ fontSize: "13px", color: "var(--text-muted)", fontStyle: "italic" }}>
            No characters found matching search.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
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
                    borderLeft: `4px solid ${getGenderColor(gender)}`,
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
                    onChange={(e) => handleGenderChange(name, e.target.value)}
                    style={{
                      fontSize: "11px",
                      padding: "4px",
                      borderRadius: "4px",
                      border: "1px solid var(--border-color)",
                      backgroundColor: "var(--bg-app)",
                      color: "var(--text-main)",
                      outline: "none",
                    }}
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

  return null;
};
