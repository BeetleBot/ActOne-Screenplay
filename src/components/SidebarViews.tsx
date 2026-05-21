import React from "react";
import { useScreenplay } from "../context/ScreenplayContext";
import { LineType } from "../parser/FountainParser";

interface SidebarViewProps {
  activeTab: string;
}

export const SidebarViews: React.FC<SidebarViewProps> = ({ activeTab }) => {
  const { parsedDoc, scrollToLine, reorderScenes, updateSettings, selectedSceneId, activeLineId, setSelectedSceneId } = useScreenplay();

  if (activeTab === "outline") {
    const outlineItems = parsedDoc.lines.map((line, index) => ({ line, index })).filter(
      ({ line }) => line.isOutlineElement || line.type === LineType.synopse
    );

    const currentDocLineIndex = parsedDoc.lines.findIndex(l => l.id === activeLineId);
    let closestOutlineItemIndex = -1;
    for (let i = 0; i < outlineItems.length; i++) {
      if (outlineItems[i].index <= currentDocLineIndex) {
        closestOutlineItemIndex = i;
      } else {
        break;
      }
    }
    const activeIdx = closestOutlineItemIndex !== -1 ? closestOutlineItemIndex : 0;

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (outlineItems.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const nextIdx = Math.min(outlineItems.length - 1, activeIdx + 1);
        scrollToLine(outlineItems[nextIdx].index);
        if (setSelectedSceneId) {
          setSelectedSceneId(outlineItems[nextIdx].line.id);
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const nextIdx = Math.max(0, activeIdx - 1);
        scrollToLine(outlineItems[nextIdx].index);
        if (setSelectedSceneId) {
          setSelectedSceneId(outlineItems[nextIdx].line.id);
        }
      }
    };

    return (
      <div className="outline-view">
        <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "12px", opacity: 0.8 }}>Screenplay Outline</h3>
        {outlineItems.length === 0 ? (
          <p style={{ fontSize: "13px", color: "var(--text-muted)", fontStyle: "italic" }}>No outline elements. Use # for sections and INT./EXT. for scenes.</p>
        ) : (
          <div 
            tabIndex={0} 
            onKeyDown={handleKeyDown}
            style={{ display: "flex", flexDirection: "column", gap: "4px", outline: "none" }}
          >
            {outlineItems.map(({ line, index }) => {
              const depth = line.sectionDepth || 0;
              const isSection = line.type === LineType.section;
              const isSynopsis = line.type === LineType.synopse;
              const isActive = index === outlineItems[activeIdx]?.index || line.id === selectedSceneId;

              let style: React.CSSProperties = {
                padding: "6px 8px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "background 0.15s, color 0.15s",
                paddingLeft: `${Math.max(8, depth * 12)}px`,
                color: isActive ? "var(--text-main)" : isSection ? "var(--accent-color)" : isSynopsis ? "var(--text-muted)" : "var(--text-main)",
                fontWeight: isActive ? 600 : isSection ? 600 : isSynopsis ? 400 : 500,
                fontStyle: isSynopsis ? "italic" : "normal",
                textTransform: isSection || isSynopsis ? "none" : "uppercase",
                backgroundColor: isActive ? "rgba(128, 128, 128, 0.15)" : "transparent"
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
                  {line.color && (
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: line.color.startsWith("#") ? line.color : `var(--scene-color-${line.color})`,
                        display: "inline-block",
                        flexShrink: 0
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
    const scenes = parsedDoc.lines.map((line, index) => ({ line, index })).filter(
      ({ line }) => line.type === LineType.heading
    );

    return (
      <div className="cards-view" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "4px", opacity: 0.8 }}>Index Cards</h3>
        {scenes.length === 0 ? (
          <p style={{ fontSize: "13px", color: "var(--text-muted)", fontStyle: "italic" }}>No scenes found.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {scenes.map(({ line, index }, sceneIndex) => {
              const nextSceneIndex = parsedDoc.lines.slice(index + 1).findIndex(l => l.type === LineType.heading);
              const sceneLines = nextSceneIndex === -1 
                ? parsedDoc.lines.slice(index + 1)
                : parsedDoc.lines.slice(index + 1, index + 1 + nextSceneIndex);

              const synopsisLine = sceneLines.find(l => l.type === LineType.synopse);
              const synopsis = synopsisLine ? synopsisLine.text.replace(/^=[ ]*/, "") : "No synopsis.";

              return (
                <div
                  key={line.id}
                  style={{
                    backgroundColor: line.color ? (line.color.startsWith("#") ? line.color + "15" : `var(--scene-color-${line.color})`) : "var(--bg-editor)",
                    border: `1px solid ${line.color ? (line.color.startsWith("#") ? line.color : `var(--scene-color-${line.color})`) : "var(--border-color)"}`,
                    borderRadius: "8px",
                    padding: "10px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    cursor: "pointer"
                  }}
                  onClick={() => scrollToLine(index)}
                >
                  <div style={{ display: "flex", justifyContent: "between", alignItems: "center", width: "100%" }}>
                    <span style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                      {line.text.replace(/^[. ]+/, "")}
                    </span>
                    <div style={{ display: "flex", gap: "4px" }} onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => sceneIndex > 0 && reorderScenes(sceneIndex, sceneIndex - 1)}
                        style={{ border: "none", background: "none", cursor: "pointer", fontSize: "12px", opacity: sceneIndex === 0 ? 0.3 : 0.7 }}
                        disabled={sceneIndex === 0}
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => sceneIndex < scenes.length - 1 && reorderScenes(sceneIndex, sceneIndex + 1)}
                        style={{ border: "none", background: "none", cursor: "pointer", fontSize: "12px", opacity: sceneIndex === scenes.length - 1 ? 0.3 : 0.7 }}
                        disabled={sceneIndex === scenes.length - 1}
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", userSelect: "none" }}>
                    {synopsis}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (activeTab === "notepad") {
    const notepadText = parsedDoc.settings.notepad || "";

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      updateSettings((prev: any) => ({
        ...prev,
        notepad: val
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
            outline: "none"
          }}
          placeholder="Type your outline notes, beats, or draft goals here..."
        />
      </div>
    );
  }

  if (activeTab === "characters") {
    const characterMap: { [name: string]: number } = {};
    parsedDoc.lines.forEach(line => {
      if (line.type === LineType.character || line.type === LineType.dualDialogueCharacter) {
        const name = line.text.replace(/^@[ ]*/, "").replace(/[ ]*\^[ ]*$/, "").trim().toUpperCase();
        if (name) {
          characterMap[name] = (characterMap[name] || 0) + 1;
        }
      }
    });

    const characters = Object.entries(characterMap).sort((a, b) => b[1] - a[1]);
    const genders = parsedDoc.settings.genders || {};

    const handleGenderChange = (name: string, gender: string) => {
      updateSettings((prev: any) => ({
        ...prev,
        genders: {
          ...(prev.genders || {}),
          [name]: gender
        }
      }));
    };

    return (
      <div className="characters-view" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "4px", opacity: 0.8 }}>Character Tracking</h3>
        {characters.length === 0 ? (
          <p style={{ fontSize: "13px", color: "var(--text-muted)", fontStyle: "italic" }}>No characters found in the screenplay.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {characters.map(([name, count]) => (
              <div
                key={name}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "8px",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  backgroundColor: "var(--bg-editor)",
                  gap: "4px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700 }}>{name}</span>
                  <span style={{ fontSize: "11px", backgroundColor: "var(--border-color)", padding: "2px 6px", borderRadius: "10px", fontWeight: 500 }}>
                    {count} lines
                  </span>
                </div>
                <select
                  value={genders[name] || "unknown"}
                  onChange={(e) => handleGenderChange(name, e.target.value)}
                  style={{
                    fontSize: "11px",
                    padding: "4px",
                    borderRadius: "4px",
                    border: "1px solid var(--border-color)",
                    backgroundColor: "var(--bg-app)",
                    color: "var(--text-main)",
                    outline: "none"
                  }}
                >
                  <option value="unknown">Gender: Unknown</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="nonbinary">Non-Binary</option>
                </select>
              </div>
            ))}
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

    parsedDoc.lines.forEach(line => {
      const words = line.text.trim().split(/\s+/).filter(w => w !== "").length;
      totalWords += words;

      if (line.type === LineType.dialogue || line.type === LineType.dualDialogue) {
        dialogueWords += words;
      } else if (line.type === LineType.action) {
        actionWords += words;
      } else if (line.type === LineType.heading) {
        headingCount++;
      }
    });

    const dialoguePct = totalWords > 0 ? Math.round((dialogueWords / totalWords) * 100) : 0;
    const actionPct = totalWords > 0 ? Math.round((actionWords / totalWords) * 100) : 0;

    return (
      <div className="stats-view" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 600, opacity: 0.8 }}>Screenplay Stats</h3>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <div style={{ padding: "10px", border: "1px solid var(--border-color)", borderRadius: "8px", backgroundColor: "var(--bg-editor)", display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Est. Pages</span>
            <span style={{ fontSize: "20px", fontWeight: 700, marginTop: "4px" }}>{pageEstimate}</span>
          </div>
          <div style={{ padding: "10px", border: "1px solid var(--border-color)", borderRadius: "8px", backgroundColor: "var(--bg-editor)", display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Total Words</span>
            <span style={{ fontSize: "20px", fontWeight: 700, marginTop: "4px" }}>{totalWords}</span>
          </div>
          <div style={{ padding: "10px", border: "1px solid var(--border-color)", borderRadius: "8px", backgroundColor: "var(--bg-editor)", display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Total Scenes</span>
            <span style={{ fontSize: "20px", fontWeight: 700, marginTop: "4px" }}>{headingCount}</span>
          </div>
          <div style={{ padding: "10px", border: "1px solid var(--border-color)", borderRadius: "8px", backgroundColor: "var(--bg-editor)", display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Total Lines</span>
            <span style={{ fontSize: "20px", fontWeight: 700, marginTop: "4px" }}>{totalLines}</span>
          </div>
        </div>

        <div style={{ padding: "12px", border: "1px solid var(--border-color)", borderRadius: "8px", backgroundColor: "var(--bg-editor)", display: "flex", flexDirection: "column", gap: "8px" }}>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Dialogue vs Action Balance</span>
          
          <div style={{ display: "flex", height: "16px", borderRadius: "8px", overflow: "hidden", marginTop: "4px" }}>
            <div style={{ width: `${dialoguePct}%`, backgroundColor: "var(--accent-color)" }} />
            <div style={{ width: `${actionPct}%`, backgroundColor: "var(--text-muted)", opacity: 0.3 }} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: 500, marginTop: "2px" }}>
            <span style={{ color: "var(--accent-color)" }}>Dialogue: {dialoguePct}%</span>
            <span style={{ color: "var(--text-muted)" }}>Action: {actionPct}%</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
