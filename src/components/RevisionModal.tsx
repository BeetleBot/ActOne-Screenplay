import React, { useMemo, useCallback } from "react";
import { useAppContext } from "../context/AppContext";
import { useFile } from "../context/FileContext";
import { computeDetailedDiff, getInlineDiff, filterDiffs } from "../utils/diff";
import { CloseIcon, CheckIcon, UndoIcon, CheckBoxIcon, ErrorOutlinedIcon } from "./Icons";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Box,
  Typography,
  Button,
  Paper,
  Divider,
} from "@mui/material";

interface RevisionModalProps {
  onClose: () => void;
}

interface GroupedEdit {
  type: "added" | "removed" | "modified" | "unchanged";
  indices: number[];
  text: string;
  oldText?: string;
  currentLineNum?: number;
  originalLineNum?: number;
}

export const RevisionModal: React.FC<RevisionModalProps> = ({ onClose }) => {
  const { rawText, setRawText, parsedDoc } = useAppContext();
  const { updateSettings } = useFile();

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

      // Group removed + added as modified
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
    let countB = 0; 
    let countC = 0; 

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

    let nextBaseText = revisionBaseText;
    let nextCurrentText = rawText;

    if (group.type === "added") {
      if (action === "accept") {
        baseLines.splice(countB, 0, group.text);
        nextBaseText = baseLines.join("\n");
      } else {
        currentLines.splice(countC, 1);
        nextCurrentText = currentLines.join("\n");
      }
    } else if (group.type === "removed") {
      if (action === "accept") {
        baseLines.splice(countB, 1);
        nextBaseText = baseLines.join("\n");
      } else {
        currentLines.splice(countC, 0, group.text);
        nextCurrentText = currentLines.join("\n");
      }
    } else if (group.type === "modified") {
      if (action === "accept") {
        baseLines.splice(countB, 1, group.text);
        nextBaseText = baseLines.join("\n");
      } else {
        currentLines.splice(countC, 1, group.oldText || "");
        nextCurrentText = currentLines.join("\n");
      }
    }

    updateSettings((prev: any) => ({
      ...prev,
      revisionBaseText: nextBaseText,
    }));
    if (nextCurrentText !== rawText) {
      setRawText(nextCurrentText);
    }
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

  const getSceneInfo = useCallback((currentLineNum?: number) => {
    if (!currentLineNum || !parsedDoc || !parsedDoc.lines) return null;
    const lines = parsedDoc.lines;
    const idx = Math.min(currentLineNum - 1, lines.length - 1);
    
    let sceneNum = "";
    let sceneHeading = "";
    
    for (let k = idx; k >= 0; k--) {
      const line = lines[k];
      if (line && line.type === 10) { 
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
  }, [parsedDoc]);

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ m: 0, p: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>Review Revisions</Typography>
        <IconButton aria-label="close" onClick={onClose} sx={{ color: "text.secondary" }}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3, height: 480, overflowY: "auto" }}>
        {changedLines.length === 0 ? (
          <Box sx={{ display: "flex", height: "100%", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, textAlign: "center" }}>
            <ErrorOutlinedIcon sx={{ fontSize: 48, color: "primary.main" }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>All Revisions Reviewed</Typography>
            <Typography variant="body2" color="text.secondary">No remaining additions or deletions found in this draft.</Typography>
            <Button 
              variant="contained" 
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
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {changedLines.map((group, index) => {
              const sceneInfo = getSceneInfo(group.currentLineNum || group.originalLineNum);
              const isAdded = group.type === "added";
              const isRemoved = group.type === "removed";
              const colorTheme = isAdded ? "success" : isRemoved ? "error" : "warning";

              return (
                <Paper 
                  key={index}
                  variant="outlined"
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    p: 2.5,
                    borderRadius: 2,
                    borderColor: `${colorTheme}.light`,
                    bgcolor: isAdded ? "success.lighter" : isRemoved ? "error.lighter" : "warning.lighter",
                  }}
                >
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1, flex: 1, mr: 3 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          fontWeight: 700, 
                          textTransform: "uppercase", 
                          color: isAdded ? "success.main" : isRemoved ? "error.main" : "warning.main" 
                        }}
                      >
                        {group.type === "added" && `Added Line (Current: ${group.currentLineNum})`}
                        {group.type === "removed" && `Deleted Line (Base: ${group.originalLineNum})`}
                        {group.type === "modified" && `Modified Line (Line: ${group.currentLineNum})`}
                      </Typography>
                      {sceneInfo && (
                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
                          {sceneInfo.number ? `Scene ${sceneInfo.number}: ` : ""}
                          {sceneInfo.heading}
                        </Typography>
                      )}
                    </Box>
                    
                    <Typography 
                      component="div" 
                      sx={{ 
                        fontFamily: "monospace", 
                        fontSize: 14, 
                        lineHeight: 1.5,
                        whiteSpace: "pre-wrap",
                        color: "text.primary"
                      }}
                    >
                      {group.type === "modified" ? (
                        getInlineDiff(group.oldText || "", group.text).map((seg, sIdx) => {
                          if (seg.type === "removed") {
                            return (
                              <Box 
                                key={sIdx} 
                                component="span"
                                sx={{ 
                                  textDecoration: "line-through", 
                                  color: "error.main", 
                                  bgcolor: "error.lighter",
                                  px: 0.5,
                                  borderRadius: 0.5,
                                  mx: 0.2,
                                }}
                              >
                                {seg.text}
                              </Box>
                            );
                          } else if (seg.type === "added") {
                            return (
                              <Box 
                                key={sIdx} 
                                component="span"
                                sx={{ 
                                  color: "success.main", 
                                  bgcolor: "success.lighter",
                                  px: 0.5,
                                  borderRadius: 0.5,
                                  mx: 0.2,
                                }}
                              >
                                {seg.text}
                              </Box>
                            );
                          } else {
                            return <span key={sIdx}>{seg.text}</span>;
                          }
                        })
                      ) : (
                        <Box 
                          component="span"
                          sx={{ 
                            textDecoration: group.type === "removed" ? "line-through" : "none",
                            color: group.type === "removed" ? "error.main" : (group.type === "added" ? "success.main" : "inherit"),
                            bgcolor: group.type === "removed" ? "error.lighter" : (group.type === "added" ? "success.lighter" : "transparent"),
                            px: group.type !== "unchanged" ? 0.5 : 0,
                            borderRadius: 0.5
                          }}
                        >
                          {group.text || " "}
                        </Box>
                      )}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: "flex", gap: 1, flexShrink: 0 }}>
                    {group.type === "added" && (
                      <>
                        <Button 
                          variant="outlined" 
                          color="success"
                          size="small"
                          onClick={() => handleAction(group, "accept")}
                          startIcon={<CheckIcon sx={{ fontSize: 14 }} />}
                        >
                          Accept
                        </Button>
                        <Button 
                          variant="outlined" 
                          color="error"
                          size="small"
                          onClick={() => handleAction(group, "reject")}
                          startIcon={<CloseIcon sx={{ fontSize: 14 }} />}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    {group.type === "removed" && (
                      <>
                        <Button 
                          variant="outlined" 
                          color="error"
                          size="small"
                          onClick={() => handleAction(group, "accept")}
                          startIcon={<CheckIcon sx={{ fontSize: 14 }} />}
                        >
                          Delete
                        </Button>
                        <Button 
                          variant="outlined" 
                          color="primary"
                          size="small"
                          onClick={() => handleAction(group, "reject")}
                          startIcon={<UndoIcon sx={{ fontSize: 14 }} />}
                        >
                          Restore
                        </Button>
                      </>
                    )}
                    {group.type === "modified" && (
                      <>
                        <Button 
                          variant="outlined" 
                          color="warning"
                          size="small"
                          onClick={() => handleAction(group, "accept")}
                          startIcon={<CheckIcon sx={{ fontSize: 14 }} />}
                        >
                          Accept
                        </Button>
                        <Button 
                          variant="outlined" 
                          color="error"
                          size="small"
                          onClick={() => handleAction(group, "reject")}
                          startIcon={<CloseIcon sx={{ fontSize: 14 }} />}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                  </Box>
                </Paper>
              );
            })}
          </Box>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2, px: 3, justifyContent: "space-between" }}>
        <Typography variant="caption" color="text.secondary">
          {changedLines.length} revision {changedLines.length === 1 ? "item" : "items"} remaining.
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button variant="outlined" onClick={onClose} size="small">
            Close
          </Button>
          <Button 
            variant="outlined" 
            color="error"
            onClick={handleRejectAll}
            disabled={changedLines.length === 0}
            startIcon={<UndoIcon sx={{ fontSize: 14 }} />}
            size="small"
          >
            Discard All
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleMergeAll}
            disabled={changedLines.length === 0}
            startIcon={<CheckBoxIcon sx={{ fontSize: 14 }} />}
            size="small"
          >
            Merge All
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};
