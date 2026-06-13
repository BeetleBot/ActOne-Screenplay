import React, { useState, useEffect } from "react";
import { useFile, useEditor, useUI } from "../context";
import { invoke } from "@tauri-apps/api/core";
import { CloseIcon, SearchIcon, AddCircleIcon, RestartAltIcon, ArrowCircleDownIcon } from "./Icons";

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
  Grid,
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
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" disableScrollLock sx={{ '& .MuiDialog-paper': { zoom: `${appScale}%`, borderRadius: '10px' } }}>
      <DialogTitle sx={{ m: 0, px: 2, py: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: 15 }}>Screenplay Structure Outlines</Typography>
        <IconButton aria-label="close" onClick={onClose} sx={{ color: "text.secondary" }}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0, maxHeight: `${(60 * 100) / appScale}vh`, height: "100%" }}>
        <Grid container sx={{ height: "100%" }}>
          {/* Left Panel: Search & List */}
          <Grid size={{ xs: 5 }} sx={{ borderRight: 1, borderColor: "divider", display: "flex", flexDirection: "column", height: "100%" }}>
            <Box sx={{ p: 2 }}>
              <TextField
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="small"
                fullWidth
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ fontSize: 16 }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>
            <Box sx={{ flex: 1, overflowY: "auto", px: 1 }}>
              {loading ? (
                <Typography sx={{ p: 2, textAlign: "center", color: "text.secondary", fontSize: 13 }}>Loading structures...</Typography>
              ) : filteredStructures.length === 0 ? (
                <Typography sx={{ p: 2, textAlign: "center", color: "text.secondary", fontSize: 13 }}>No structures found</Typography>
              ) : (
                <List disablePadding>
                  {filteredStructures.map((s) => (
                    <ListItemButton
                      key={s.name}
                      onClick={() => setSelectedStructure(s)}
                      selected={selectedStructure?.name === s.name}
                      sx={{ borderRadius: 1, mb: 0.5 }}
                    >
                      <ListItemText
                        primary={<Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{s.name}</Typography>}
                        secondary={<Typography variant="caption" color="text.secondary" sx={{ display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{s.description}</Typography>}
                      />
                    </ListItemButton>
                  ))}
                </List>
              )}
            </Box>
          </Grid>

          {/* Right Panel: Detail Preview */}
          <Grid size={{ xs: 7 }} sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
            {selectedStructure ? (
              <Box sx={{ p: 3, flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2.5 }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{selectedStructure.name}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{selectedStructure.description}</Typography>
                </Box>
                <Divider />
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pl: 1, position: "relative" }}>
                  {selectedStructure.beats.map((beat, idx) => (
                    <Box key={idx} sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
                      <Box sx={{ width: 22, height: 22, borderRadius: "50%", bgcolor: "primary.main", color: "primary.contrastText", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                        {idx + 1}
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: 13.5 }}>{beat.label}</Typography>
                        {beat.description && (
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                            {beat.description}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            ) : (
              <Box sx={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", color: "text.secondary" }}>
                <Typography variant="body2">Select a structure template to view details</Typography>
              </Box>
            )}
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.25, justifyContent: "space-between" }}>
        <Typography variant="caption" color="text.secondary" sx={{ maxWidth: "40%" }}>
          Inserts Section headers (##) and Synopsis (=).
        </Typography>
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Button onClick={onClose} variant="outlined" size="small" color="inherit">Cancel</Button>
          <Button
            variant="outlined"
            onClick={handleOverwrite}
            disabled={!selectedStructure}
            startIcon={<RestartAltIcon sx={{ fontSize: 14 }} />}
            size="small"
            color="error"
          >
            Overwrite
          </Button>
          <Button
            variant="outlined"
            onClick={handleAppendToEnd}
            disabled={!selectedStructure}
            startIcon={<ArrowCircleDownIcon sx={{ fontSize: 14 }} />}
            size="small"
          >
            Append
          </Button>
          <Button
            variant="contained"
            onClick={handleInsertAtCursor}
            disabled={!selectedStructure}
            startIcon={<AddCircleIcon sx={{ fontSize: 14 }} />}
            size="small"
          >
            Insert
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};
