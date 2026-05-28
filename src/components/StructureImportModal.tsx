import React, { useState, useEffect } from "react";
import { X, Search, PlusCircle, RotateCcw, ArrowDownCircle } from "lucide-react";
import { useScreenplay } from "../context/ScreenplayContext";
import { invoke } from "@tauri-apps/api/core";

interface StructureBeat {
  label: string;
  description: string;
}

interface Structure {
  name: string;
  description: string;
  beats: StructureBeat[];
}

interface StructureImportModalProps {
  onClose: () => void;
}

export const StructureImportModal: React.FC<StructureImportModalProps> = ({ onClose }) => {
  const { rawText, setRawText, editorView } = useScreenplay();
  const [structures, setStructures] = useState<Structure[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStructure, setSelectedStructure] = useState<Structure | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStructures = async () => {
      try {
        const data = await invoke<Structure[]>("get_structures");
        setStructures(data);
        if (data.length > 0) {
          setSelectedStructure(data[0]);
        }
      } catch (err) {
        console.error("Failed to load structures:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStructures();
  }, []);

  const filteredStructures = structures.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const buildFountainText = (s: Structure, includeHeader = true) => {
    let text = "";
    if (includeHeader) {
      text += `# ${s.name}\n`;
      if (s.description) {
        text += `= ${s.description}\n`;
      }
      text += "\n";
    }
    s.beats.forEach((beat) => {
      text += `## ${beat.label}\n`;
      if (beat.description) {
        text += `= ${beat.description}\n`;
      }
      text += "\n\n\n";
    });
    return text.trimEnd() + "\n";
  };

  const handleInsertAtCursor = () => {
    if (!selectedStructure) return;
    const insertText = "\n\n" + buildFountainText(selectedStructure, false);
    
    if (editorView) {
      const { from, to } = editorView.state.selection.main;
      const transaction = editorView.state.update({
        changes: { from, to, insert: insertText },
        selection: { anchor: from + insertText.length }
      });
      editorView.dispatch(transaction);
      editorView.focus();
    } else {
      setRawText(rawText + insertText);
    }
    onClose();
  };

  const handleAppendToEnd = () => {
    if (!selectedStructure) return;
    const insertText = (rawText.trim() ? rawText + "\n\n" : "") + buildFountainText(selectedStructure, true);
    setRawText(insertText);
    onClose();
  };

  const handleOverwrite = () => {
    if (!selectedStructure) return;
    if (window.confirm("Are you sure you want to overwrite your entire screenplay with this structure outline? This cannot be undone.")) {
      setRawText(buildFountainText(selectedStructure, true));
      onClose();
    }
  };

  return (
    <div className="struct-modal-overlay" onClick={onClose}>
      <div className="struct-modal" onClick={(e) => e.stopPropagation()}>
        <div className="struct-modal-header">
          <h2 className="struct-modal-title">Screenplay Structure Outlines</h2>
          <button className="struct-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="struct-modal-body">
          {/* Left Panel: List & Search */}
          <div className="struct-modal-left">
            <div className="struct-search-wrapper">
              <Search size={16} className="struct-search-icon" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="struct-search-input"
              />
            </div>

            <div className="struct-list">
              {loading ? (
                <div className="struct-status-msg">Loading structures...</div>
              ) : filteredStructures.length === 0 ? (
                <div className="struct-status-msg">No structures found</div>
              ) : (
                filteredStructures.map((s) => (
                  <button
                    key={s.name}
                    onClick={() => setSelectedStructure(s)}
                    className={`struct-list-item ${selectedStructure?.name === s.name ? "active" : ""}`}
                  >
                    <div className="struct-item-name">{s.name}</div>
                    <div className="struct-item-desc">{s.description}</div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right Panel: Detail Preview */}
          <div className="struct-modal-right">
            {selectedStructure ? (
              <div className="struct-preview-container">
                <div className="struct-preview-header">
                  <h3>{selectedStructure.name}</h3>
                  <p className="struct-preview-desc">{selectedStructure.description}</p>
                </div>
                <div className="struct-beats-timeline">
                  <div className="struct-timeline-line" />
                  {selectedStructure.beats.map((beat, idx) => (
                    <div key={idx} className="struct-beat-card">
                      <div className="struct-beat-badge">
                        <span>{idx + 1}</span>
                      </div>
                      <div className="struct-beat-content">
                        <h4 className="struct-beat-label">{beat.label}</h4>
                        {beat.description && <p className="struct-beat-desc">{beat.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="struct-no-selection">
                Select a structure template to view details
              </div>
            )}
          </div>
        </div>

        <div className="struct-modal-footer">
          <div className="struct-footer-info">
            Importing inserts Section headers <code>##</code> and Synopsis <code>=</code>.
          </div>
          <div className="struct-footer-actions">
            <button className="struct-btn cancel" onClick={onClose}>
              Cancel
            </button>
            <button
              className="struct-btn secondary"
              onClick={handleOverwrite}
              disabled={!selectedStructure}
            >
              <RotateCcw size={16} />
              Overwrite Screenplay
            </button>
            <button
              className="struct-btn secondary"
              onClick={handleAppendToEnd}
              disabled={!selectedStructure}
            >
              <ArrowDownCircle size={16} />
              Append to End
            </button>
            <button
              className="struct-btn primary"
              onClick={handleInsertAtCursor}
              disabled={!selectedStructure}
            >
              <PlusCircle size={16} />
              Insert at Cursor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
