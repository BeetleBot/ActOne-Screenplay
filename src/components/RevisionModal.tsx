import React, { useMemo } from "react";
import { X, Check, Undo, CheckSquare, AlertCircle } from "lucide-react";
import { useAppContext } from "../context/AppContext";
import { useFile } from "../context/FileContext";
import { computeDetailedDiff, getInlineDiff, filterDiffs } from "../utils/diff";
import { useFocusTrap } from "../hooks/useFocusTrap";

interface RevisionModalProps {
  onClose: () => void;
}

interface GroupedEdit {
  type: "added" | "removed" | "modified";
  indices: number[];
  text: string;
  oldText?: string;
  currentLineNum?: number;
  originalLineNum?: number;
}

export const RevisionModal: React.FC<RevisionModalProps> = ({ onClose }) => {
  const { rawText, setRawText, parsedDoc } = useAppContext();
  const { updateSettings } = useFile();
  const { containerRef, handleKeyDown: trapKeyDown } = useFocusTrap(true, onClose);

  const revisionBaseText = parsedDoc?.settings?.revisionBaseText || "";

  // Compute detailed diff
  const diffs = useMemo(() => {
    return computeDetailedDiff(revisionBaseText, rawText);
  }, [revisionBaseText, rawText]);

  // Filter single empty lines and group adjacent deleted/added lines as modified
  const changedLines = useMemo(() => {
    const keep = filterDiffs(diffs);
    const groups: GroupedEdit[] = [];

    let i = 0;
    while (i < diffs.length) {
      if (!keep[i]) {
        i++;
        continue;
      }

      const currentEdit = diffs[i];

      // If we have a removed line immediately followed by an added line, group them as a modification
      if (
        i + 1 < diffs.length &&
        keep[i + 1] &&
        currentEdit.type === "removed" &&
        diffs[i + 1].type === "added"
      ) {
        groups.push({
          type: "modified",
          indices: [i, i + 1],
          text: diffs[i + 1].text,
          oldText: currentEdit.text,
          currentLineNum: diffs[i + 1].currentLineNum,
          originalLineNum: currentEdit.originalLineNum,
        });
        i += 2;
      } else if (currentEdit.type === "added" || currentEdit.type === "removed") {
        groups.push({
          type: currentEdit.type,
          indices: [i],
          text: currentEdit.text,
          currentLineNum: currentEdit.currentLineNum,
          originalLineNum: currentEdit.originalLineNum,
        });
        i++;
      } else {
        i++;
      }
    }

    return groups;
  }, [diffs]);

  const handleAction = (group: GroupedEdit, action: "accept" | "reject") => {
    const baseLines = revisionBaseText.split("\n");
    const currentLines = rawText.split("\n");

    const firstIndex = group.indices[0];
    let countB = 0; // index in baseLines
    let countC = 0; // index in currentLines

    for (let k = 0; k < firstIndex; k++) {
      const e = diffs[k];
      if (e.type === "unchanged") {
        countB++;
        countC++;
      } else if (e.type === "added") {
        countC++;
      } else if (e.type === "removed") {
        countB++;
      }
    }

    if (group.type === "added") {
      if (action === "accept") {
        baseLines.splice(countB, 0, group.text);
      } else {
        currentLines.splice(countC, 1);
      }
    } else if (group.type === "removed") {
      if (action === "accept") {
        baseLines.splice(countB, 1);
      } else {
        currentLines.splice(countC, 0, group.text);
      }
    } else if (group.type === "modified") {
      if (action === "accept") {
        baseLines.splice(countB, 1, group.text);
      } else {
        currentLines.splice(countC, 1, group.oldText || "");
      }
    }

    const nextBase = baseLines.join("\n");
    const nextCurrent = currentLines.join("\n");

    setRawText(nextCurrent);
    updateSettings((prev: any) => ({
      ...prev,
      revisionBaseText: nextBase,
    }));
  };

  const handleMergeAll = () => {
    if (window.confirm("Are you sure you want to approve and merge all remaining revisions? This will exit Revision Mode.")) {
      updateSettings((prev: any) => ({
        ...prev,
        revisionModeEnabled: false,
        revisionBaseText: undefined,
      }));
      onClose();
    }
  };

  const handleRejectAll = () => {
    if (window.confirm("Are you sure you want to reject all revisions and revert the screenplay to the base draft?")) {
      setRawText(revisionBaseText);
      updateSettings((prev: any) => ({
        ...prev,
        revisionModeEnabled: false,
        revisionBaseText: undefined,
      }));
      onClose();
    }
  };

  const getSceneInfo = (currentLineNum?: number) => {
    if (!currentLineNum || !parsedDoc || !parsedDoc.lines) return null;
    const lines = parsedDoc.lines;
    const idx = Math.min(currentLineNum - 1, lines.length - 1);
    
    let sceneNum = "";
    let sceneHeading = "";
    
    for (let k = idx; k >= 0; k--) {
      const line = lines[k];
      if (line.type === 10) { // LineType.heading
        sceneHeading = line.text.trim();
        if (sceneHeading.startsWith(".")) {
          sceneHeading = sceneHeading.substring(1).trim();
        }
        if (line.sceneNumber) {
          sceneNum = line.sceneNumber;
        } else {
          const matchNum = sceneHeading.match(/#([^#]+)#$/);
          if (matchNum) {
            sceneNum = matchNum[1];
            sceneHeading = sceneHeading.replace(/#([^#]+)#$/, "").trim();
          }
        }
        break;
      }
    }
    
    if (sceneHeading) {
      return {
        number: sceneNum || undefined,
        heading: sceneHeading
      };
    }
    return null;
  };

  return (
    <div 
      className="struct-modal-overlay" 
      onClick={onClose}
      ref={containerRef}
      onKeyDown={trapKeyDown}
      tabIndex={-1}
      style={{ outline: "none" }}
      role="dialog"
      aria-modal="true"
    >
      <div className="struct-modal" style={{ maxWidth: "700px" }} onClick={(e) => e.stopPropagation()}>
        <div className="struct-modal-header">
          <h2 className="struct-modal-title">Review Revisions</h2>
          <button className="struct-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="struct-modal-body" style={{ flexDirection: "column", height: "450px" }}>
          {changedLines.length === 0 ? (
            <div style={{ display: "flex", flex: 1, flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", color: "var(--text-muted)" }}>
              <AlertCircle size={48} style={{ color: "var(--accent-color)" }} />
              <h3>All Revisions Reviewed</h3>
              <p>No remaining additions or deletions found in this draft.</p>
              <button 
                className="struct-btn primary" 
                onClick={() => {
                  updateSettings((prev: any) => ({
                    ...prev,
                    revisionModeEnabled: false,
                    revisionBaseText: undefined,
                  }));
                  onClose();
                }}
              >
                Exit Revision Mode
              </button>
            </div>
          ) : (
            <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px", padding: "4px" }}>
              {changedLines.map((group, index) => {
                const sceneInfo = getSceneInfo(group.currentLineNum || group.originalLineNum);
                return (
                  <div 
                    key={index}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px",
                      borderRadius: "8px",
                      border: "1px solid var(--border-color)",
                      background: group.type === "added" 
                        ? "rgba(46, 213, 115, 0.08)" 
                        : group.type === "removed" 
                          ? "rgba(255, 71, 87, 0.08)" 
                          : "rgba(255, 170, 0, 0.08)",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1, marginRight: "16px" }}>
                      <div style={{ 
                        fontSize: "11px", 
                        fontWeight: "bold", 
                        textTransform: "uppercase", 
                        color: group.type === "added" 
                          ? "var(--accent-color)" 
                          : group.type === "removed" 
                            ? "#ff4757" 
                            : "#ffa500" 
                      }}>
                        {group.type === "added" && `Added Line (Current: ${group.currentLineNum})`}
                        {group.type === "removed" && `Deleted Line (Base: ${group.originalLineNum})`}
                        {group.type === "modified" && `Modified Line (Line: ${group.currentLineNum})`}
                      </div>
                      {sceneInfo && (
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", display: "flex", gap: "6px", alignItems: "center" }}>
                          <span>🎬</span>
                          <span style={{ fontStyle: "italic", opacity: 0.85 }}>
                            {sceneInfo.number ? `Scene ${sceneInfo.number}: ` : ""}
                            {sceneInfo.heading}
                          </span>
                        </div>
                      )}
                      <div style={{ fontFamily: "var(--font-editor)", fontSize: "13px", whiteSpace: "pre-wrap" }}>

                      {group.type === "modified" ? (
                        getInlineDiff(group.oldText || "", group.text).map((seg, sIdx) => {
                          if (seg.type === "removed") {
                            return (
                              <span 
                                key={sIdx} 
                                style={{ 
                                  textDecoration: "line-through", 
                                  color: "#ff4757", 
                                  backgroundColor: "rgba(255, 71, 87, 0.12)",
                                  padding: "1px 3px",
                                  borderRadius: "3px",
                                  margin: "0 1px"
                                }}
                              >
                                {seg.text}
                              </span>
                            );
                          } else if (seg.type === "added") {
                            return (
                              <span 
                                key={sIdx} 
                                style={{ 
                                  color: "var(--accent-color)", 
                                  backgroundColor: "rgba(46, 213, 115, 0.12)",
                                  padding: "1px 3px",
                                  borderRadius: "3px",
                                  margin: "0 1px"
                                }}
                              >
                                {seg.text}
                              </span>
                            );
                          } else {
                            return <span key={sIdx}>{seg.text}</span>;
                          }
                        })
                      ) : (
                        <span style={{ textDecoration: group.type === "removed" ? "line-through" : "none" }}>
                          {group.text || " "}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {group.type === "added" && (
                      <>
                        <button 
                          className="struct-btn secondary" 
                          style={{ padding: "6px 12px", gap: "4px" }}
                          onClick={() => handleAction(group, "accept")}
                          title="Accept Addition"
                        >
                          <Check size={14} /> Accept
                        </button>
                        <button 
                          className="struct-btn cancel" 
                          style={{ padding: "6px 12px", gap: "4px" }}
                          onClick={() => handleAction(group, "reject")}
                          title="Reject Addition"
                        >
                          <X size={14} /> Reject
                        </button>
                      </>
                    )}
                    {group.type === "removed" && (
                      <>
                        <button 
                          className="struct-btn secondary" 
                          style={{ padding: "6px 12px", gap: "4px" }}
                          onClick={() => handleAction(group, "accept")}
                          title="Confirm Deletion"
                        >
                          <Check size={14} /> Delete
                        </button>
                        <button 
                          className="struct-btn primary" 
                          style={{ padding: "6px 12px", gap: "4px" }}
                          onClick={() => handleAction(group, "reject")}
                          title="Restore Line"
                        >
                          <Undo size={14} /> Restore
                        </button>
                      </>
                    )}
                    {group.type === "modified" && (
                      <>
                        <button 
                          className="struct-btn secondary" 
                          style={{ padding: "6px 12px", gap: "4px" }}
                          onClick={() => handleAction(group, "accept")}
                          title="Accept Modification"
                        >
                          <Check size={14} /> Accept
                        </button>
                        <button 
                          className="struct-btn cancel" 
                          style={{ padding: "6px 12px", gap: "4px" }}
                          onClick={() => handleAction(group, "reject")}
                          title="Reject Modification"
                        >
                          <X size={14} /> Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </div>

        <div className="struct-modal-footer" style={{ justifyContent: "space-between" }}>
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            {changedLines.length} revision {changedLines.length === 1 ? "item" : "items"} remaining.
          </div>
          <div className="struct-footer-actions">
            <button className="struct-btn cancel" onClick={onClose}>
              Close
            </button>
            <button 
              className="struct-btn secondary" 
              onClick={handleRejectAll}
              disabled={changedLines.length === 0}
            >
              <Undo size={16} /> Discard All
            </button>
            <button 
              className="struct-btn primary" 
              onClick={handleMergeAll}
              disabled={changedLines.length === 0}
            >
              <CheckSquare size={16} /> Merge All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
