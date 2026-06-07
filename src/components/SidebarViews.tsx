import React, { useState } from "react";
import { useAppContext } from "../context/AppContext";
import { useParking } from "../context/ParkingContext";
import { LineType } from "../parser/FountainParser";
import { Plus, X } from "lucide-react";
import { TodoView } from "./TodoView";
import { OutlineView } from "./OutlineView";

const ActoneBanner: React.FC<{ saveFileAs?: () => Promise<string | null> }> = ({ saveFileAs }) => (
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
      Workspace features require saving the screenplay as an ActOne Bundle (.actone).
    </p>
    {saveFileAs && (
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
    )}
  </div>
);

interface SidebarViewProps {
  activeTab: string;
}

export const SidebarViews: React.FC<SidebarViewProps> = ({ activeTab }) => {
  const app = useAppContext();
  const { parsedDoc, updateSettings, filePath, saveFileAs } = app;
  const parking = useParking();
  const supportsExtended = !filePath || filePath.toLowerCase().endsWith(".actone");
  const [characterFilter, setCharacterFilter] = useState("");

  if (activeTab === "outline") {
    return <OutlineView />;
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
        {!supportsExtended && (
          <ActoneBanner saveFileAs={saveFileAs} />
        )}
        <textarea
          value={notepadText}
          onChange={handleChange}
          disabled={!supportsExtended}
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
            opacity: !supportsExtended ? 0.5 : 1,
            cursor: !supportsExtended ? "not-allowed" : "text",
          }}
          placeholder={supportsExtended ? "Type your outline notes, beats, or draft goals here..." : "Save as .actone to use the notepad"}
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

    return (
      <div className="characters-view" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "4px", opacity: 0.8 }}>
          Character Tracking
        </h3>
        
        {!supportsExtended && <ActoneBanner saveFileAs={saveFileAs} />}

        <input
          type="text"
          className="character-search-input"
          value={characterFilter}
          disabled={!supportsExtended}
          onChange={(e) => setCharacterFilter(e.target.value)}
          placeholder={!supportsExtended ? "Tracking disabled..." : "Filter characters..."}
          style={{
            width: "100%",
            padding: "6px 10px",
            fontSize: "12px",
            border: "1px solid var(--border-color)",
            borderRadius: "6px",
            backgroundColor: "var(--bg-editor)",
            color: "var(--text-main)",
            outline: "none",
            opacity: !supportsExtended ? 0.5 : 1,
            cursor: !supportsExtended ? "not-allowed" : "text",
          }}
        />
        {filteredCharacters.length === 0 ? (
          <p style={{ fontSize: "13px", color: "var(--text-muted)", fontStyle: "italic" }}>
            No characters found matching search.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", opacity: !supportsExtended ? 0.6 : 1 }}>
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
                    borderLeft: !supportsExtended ? `4px solid var(--border-color)` : `4px solid ${getGenderColor(gender)}`,
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
                    disabled={!supportsExtended}
                    onChange={(e) => handleGenderChange(name, e.target.value)}
                    className={`character-gender-select gender-${gender}`}
                    style={!supportsExtended ? { opacity: 0.5, cursor: "not-allowed" } : {}}
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
    return <TodoView disabled={!supportsExtended} saveFileAs={saveFileAs} />;
  }

  if (activeTab === "parking") {
    const { items, addItem, removeItem } = parking;
    const { editorView } = app;

    const handleParkSelection = () => {
      const view = editorView;
      if (!view) return;
      const selection = view.state.selection.main;
      if (selection.empty) return;
      const text = view.state.sliceDoc(selection.from, selection.to);
      if (!text.trim()) return;
      addItem(text);
      view.dispatch({
        changes: { from: selection.from, to: selection.to, insert: "" },
      });
      view.focus();
    };

    const handleCardClick = (item: { id: string; text: string }) => {
      const view = editorView;
      if (!view) return;
      const pos = view.state.selection.main.from;
      view.dispatch({
        changes: { from: pos, insert: item.text + "\n" },
        selection: { anchor: pos + item.text.length + 1 },
      });
      removeItem(item.id);
      view.focus();
    };

    if (!supportsExtended) {
      return (
        <div className="parking-view" style={{ display: "flex", flexDirection: "column", height: "100%", gap: "8px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 600, opacity: 0.8, margin: 0 }}>Parking</h3>
          <ActoneBanner saveFileAs={saveFileAs} />
        </div>
      );
    }

    return (
      <div className="parking-view" style={{ display: "flex", flexDirection: "column", height: "100%", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 600, opacity: 0.8, margin: 0 }}>
            Parking
          </h3>
          <button
            onClick={handleParkSelection}
            title="Park selected text"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              background: "var(--accent-color)",
              color: "#fff",
              border: "none",
              borderRadius: "var(--radius-sm)",
              padding: "4px 10px",
              fontSize: "11px",
              fontWeight: 600,
              cursor: "pointer",
              opacity: editorView?.state.selection.main.empty ? 0.5 : 1,
            }}
          >
            <Plus size={12} />
            Park Selection
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px", minHeight: 0 }}>
          {items.length === 0 ? (
            <p style={{ fontSize: "13px", color: "var(--text-muted)", fontStyle: "italic" }}>
              Select text in the editor and click "Park Selection" to store it here.
            </p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                onClick={() => handleCardClick(item)}
                style={{
                  background: "var(--bg-editor)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-sm)",
                  padding: "8px 10px",
                  cursor: "pointer",
                  position: "relative",
                  fontSize: "12px",
                  lineHeight: 1.5,
                  color: "var(--text-main)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  maxHeight: "120px",
                  overflow: "hidden",
                }}
              >
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    removeItem(item.id);
                  }}
                  title="Remove"
                  style={{
                    position: "absolute",
                    top: "4px",
                    right: "4px",
                    width: "18px",
                    height: "18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "var(--radius-xs)",
                    cursor: "pointer",
                    color: "var(--text-muted)",
                    opacity: 0.3,
                  }}
                  className="parking-card-remove"
                >
                  <X size={12} />
                </div>
                {item.text}
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return null;
};
