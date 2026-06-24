import React, { useState, useEffect } from "react";
import { useFile, useEditor, useUI } from "../context";
import { invoke } from "@tauri-apps/api/core";
import { CloseIcon, SearchIcon, AddCircleIcon, RestartAltIcon, ArrowCircleDownIcon, LibraryBooksIcon } from "./Icons";
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
  TextField,
  List,
  ListItemButton,
  ListItemText,
  InputAdornment,
  Divider,
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
        logger.error("structure", "Failed to load structures:", err);
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
    <Dialog open onClose={onClose} fullWidth maxWidth="md" disableScrollLock transitionDuration={200} sx={{ '& .MuiDialog-paper': { zoom: `${appScale}%`, borderRadius: '12px' } }}>
      <DialogTitle sx={{ m: 0, px: 2, py: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <LibraryBooksIcon sx={{ fontSize: 18 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: 14 }}>Screenplay Structure Outlines</Typography>
        </Box>
        <IconButton aria-label="close" onClick={onClose} sx={{ color: "text.secondary" }}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ px: 2, py: 1.5, maxHeight: `${(60 * 100) / appScale}vh`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Box sx={{ display: "flex", flex: 1, minHeight: 0, gap: 1.5 }}>
          {/* Left Panel: Search & List */}
          <Box sx={{
            width: "42%",
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            p: 1.5,
            display: "flex",
            flexDirection: "column",
            minHeight: 0
          }}>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10, color: 'text.secondary', letterSpacing: 0.5, mb: 1.25, display: 'block' }}>
              TEMPLATES
            </Typography>
            <Box sx={{ mb: 1.5 }}>
              <TextField
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="small"
                fullWidth
                slotProps={{
                  input: {
                    sx: {
                      fontSize: 12,
                      '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                      bgcolor: 'action.hover',
                      borderRadius: '6px',
                      '&:hover': { bgcolor: 'action.selected' },
                      '& .MuiOutlinedInput-input': { py: 0.6, px: 1.25 },
                    },
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>
            <Box sx={{ flex: 1, overflowY: "auto", minHeight: 0, px: 0.5 }}>
              {loading ? (
                <Typography sx={{ p: 2, textAlign: "center", color: "text.secondary", fontSize: 12 }}>Loading structures...</Typography>
              ) : filteredStructures.length === 0 ? (
                <Typography sx={{ p: 2, textAlign: "center", color: "text.secondary", fontSize: 12 }}>No structures found</Typography>
              ) : (
                <List disablePadding>
                  {filteredStructures.map((s) => (
                    <ListItemButton
                      key={s.name}
                      onClick={() => setSelectedStructure(s)}
                      selected={selectedStructure?.name === s.name}
                      sx={{ borderRadius: 1, mb: 0.5, py: 0.5, px: 1 }}
                    >
                      <ListItemText
                        primary={<Typography variant="body2" sx={{ fontWeight: 600, fontSize: 12 }}>{s.name}</Typography>}
                        secondary={<Typography variant="caption" color="text.secondary" sx={{ display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden", fontSize: 10.5 }}>{s.description}</Typography>}
                      />
                    </ListItemButton>
                  ))}
                </List>
              )}
            </Box>
          </Box>

          {/* Right Panel: Detail Preview */}
          <Box sx={{
            width: "58%",
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            p: 1.5,
            display: "flex",
            flexDirection: "column",
            minHeight: 0
          }}>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10, color: 'text.secondary', letterSpacing: 0.5, mb: 1.25, display: 'block' }}>
              PREVIEW
            </Typography>
            {selectedStructure ? (
              <Box sx={{ flex: 1, overflowY: "auto", minHeight: 0, display: "flex", flexDirection: "column", gap: 1.5, pr: 0.5 }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: 13 }}>{selectedStructure.name}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: "block" }}>{selectedStructure.description}</Typography>
                </Box>
                <Divider />
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, pl: 0.5, position: "relative" }}>
                  {selectedStructure.beats.map((beat, idx) => (
                    <Box key={idx} sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
                      <Box sx={{ width: 18, height: 18, borderRadius: "50%", bgcolor: "primary.main", color: "primary.contrastText", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                        {idx + 1}
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 12 }}>{beat.label}</Typography>
                        {beat.description && (
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: "block", fontSize: 10.5 }}>
                            {beat.description}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            ) : (
              <Box sx={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", color: "text.secondary" }}>
                <Typography variant="caption" sx={{ fontSize: 11 }}>Select a structure template to view details</Typography>
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1, justifyContent: "space-between" }}>
        <Typography variant="caption" color="text.secondary" sx={{ maxWidth: "40%", fontSize: 10 }}>
          Inserts Section headers (##) and Synopsis (=).
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button onClick={onClose} variant="outlined" size="small" color="inherit" sx={{ fontSize: 11 }}>Cancel</Button>
          <Button
            variant="outlined"
            onClick={handleOverwrite}
            disabled={!selectedStructure}
            startIcon={<RestartAltIcon sx={{ fontSize: 13 }} />}
            size="small"
            color="error"
            sx={{ fontSize: 11 }}
          >
            Overwrite
          </Button>
          <Button
            variant="outlined"
            onClick={handleAppendToEnd}
            disabled={!selectedStructure}
            startIcon={<ArrowCircleDownIcon sx={{ fontSize: 13 }} />}
            size="small"
            sx={{ fontSize: 11 }}
          >
            Append
          </Button>
          <Button
            variant="contained"
            onClick={handleInsertAtCursor}
            disabled={!selectedStructure}
            startIcon={<AddCircleIcon sx={{ fontSize: 13 }} />}
            size="small"
            sx={{ fontSize: 11 }}
          >
            Insert
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};
