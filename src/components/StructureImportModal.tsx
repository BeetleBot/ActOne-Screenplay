import React, { useState, useEffect } from "react";
import { useFile, useEditor, useUI } from "../context";
import { invoke } from "@tauri-apps/api/core";
import { CloseIcon, AddCircleIcon, RestartAltIcon, ArrowCircleDownIcon, LibraryBooksIcon } from "./Icons";
import { logger } from "../utils/logger";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Box,
  Typography,
  Button,
} from "@mui/material";

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
  const { rawText, setRawText } = useFile();
  const { editorView } = useEditor();
  const { appScale } = useUI();
  const [structures, setStructures] = useState<Structure[]>([]);
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
        logger.error("structure", "Failed to load structures:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStructures();
  }, []);



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
      text += `# ${beat.label}\n`;
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
    <Dialog open onClose={onClose} fullWidth maxWidth="xs" disableScrollLock transitionDuration={200} sx={{ '& .MuiDialog-paper': { zoom: `${appScale}%`, borderRadius: 0 } }}>
      <DialogTitle sx={{ m: 0, px: 2.5, py: 1.75, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <LibraryBooksIcon sx={{ fontSize: 16, color: "primary.main" }} />
          <Typography sx={{ fontWeight: 700, fontSize: 13 }}>Screenplay Structures</Typography>
        </Box>
        <IconButton aria-label="close" onClick={onClose} sx={{ color: "text.secondary", p: 0.5 }}>
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5, overflow: "hidden" }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: 11 }}>
          Select a screenplay structure template to insert into your script:
        </Typography>

        {/* Single column templates list */}
        <Box
          sx={{
            flex: 1,
            maxHeight: 280,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 0.75,
            pr: 0.5,
            "&::-webkit-scrollbar": { width: 4 },
            "&::-webkit-scrollbar-thumb": { bgcolor: "divider", borderRadius: 0 },
          }}
        >
          {loading ? (
            <Typography sx={{ p: 2, textAlign: "center", color: "text.secondary", fontSize: 12 }}>Loading...</Typography>
          ) : (
            structures.map((s) => {
              const isSelected = selectedStructure?.name === s.name;
              return (
                <Box
                  key={s.name}
                  onClick={() => setSelectedStructure(s)}
                  sx={{
                    p: 1.5,
                    borderRadius: 0,
                    border: "1px solid",
                    borderColor: isSelected ? "primary.main" : "divider",
                    bgcolor: isSelected ? "action.selected" : "background.paper",
                    cursor: "pointer",
                    transition: "all var(--duration-normal) ease",
                    "&:hover": {
                      borderColor: isSelected ? "primary.main" : "text.secondary",
                      bgcolor: isSelected ? "action.selected" : "action.hover",
                    },
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 12, color: isSelected ? "primary.main" : "text.primary" }}>
                    {s.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25, fontSize: 10.5, lineHeight: 1.3 }}>
                    {s.description}
                  </Typography>
                </Box>
              );
            })
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 2, flexDirection: "column", gap: 1, alignItems: "stretch" }}>
        {selectedStructure ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
              <Button
                variant="contained"
                onClick={handleInsertAtCursor}
                startIcon={<AddCircleIcon sx={{ fontSize: 13 }} />}
                size="small"
                sx={{ fontSize: 11, borderRadius: 0, py: 0.75, textTransform: "none", fontWeight: 600 }}
              >
                Insert at Cursor
              </Button>
              <Button
                variant="outlined"
                onClick={handleAppendToEnd}
                startIcon={<ArrowCircleDownIcon sx={{ fontSize: 13 }} />}
                size="small"
                sx={{ fontSize: 11, borderRadius: 0, py: 0.75, textTransform: "none", fontWeight: 600 }}
              >
                Append to End
              </Button>
            </Box>
            <Button
              variant="outlined"
              onClick={handleOverwrite}
              startIcon={<RestartAltIcon sx={{ fontSize: 13 }} />}
              size="small"
              color="error"
              sx={{ fontSize: 11, borderRadius: 0, py: 0.75, textTransform: "none", fontWeight: 600 }}
            >
              Overwrite Screenplay
            </Button>
          </Box>
        ) : (
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center", fontSize: 10.5, py: 1 }}>
            Select a template above to see import options.
          </Typography>
        )}
      </DialogActions>
    </Dialog>
  );
};
