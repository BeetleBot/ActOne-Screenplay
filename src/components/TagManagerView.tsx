import React, { useState, useMemo } from "react";
import { useAppContext } from "../context/AppContext";
import { LineType } from "../parser/FountainParser";
import { EditorView } from "@codemirror/view";
import SearchIcon from "@mui/icons-material/Search";
import DeleteIcon from "@mui/icons-material/Delete";
import MergeTypeIcon from "@mui/icons-material/MergeType";
import CloseIcon from "@mui/icons-material/Close";
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  Dialog,
  DialogTitle,
  DialogContent,
} from "@mui/material";

const CATEGORIES = [
  { key: "cast", label: "Cast", color: "#00bcd4" },
  { key: "prop", label: "Prop", color: "#ff9800" },
  { key: "vfx", label: "VFX", color: "#9c27b0" },
  { key: "sfx", label: "SFX", color: "#795548" },
  { key: "camera", label: "Camera", color: "#00ffcc" },
  { key: "animal", label: "Animal", color: "#ffeb3b" },
  { key: "extras", label: "Extras", color: "#e91e63" },
  { key: "vehicle", label: "Vehicle", color: "#008080" },
  { key: "costume", label: "Costume", color: "#ffc0cb" },
  { key: "makeup", label: "Makeup", color: "#4caf50" },
  { key: "music", label: "Music", color: "#808000" },
  { key: "sound", label: "Sound", color: "#ff6666" },
  { key: "stunt", label: "Stunt", color: "#2196f3" },
  { key: "setDesign", label: "Set Design", color: "#daa520" },
  { key: "other", label: "Other", color: "#9e9e9e" }
];

interface TagManagerViewProps {
  onClose: () => void;
}

export const TagManagerView: React.FC<TagManagerViewProps> = ({ onClose }) => {
  const { parsedDoc, updateSettings, editorView } = useAppContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [mergeTargets, setMergeTargets] = useState<{ [defId: string]: string }>({});

  const prodTags = parsedDoc.settings?.productionTags || { tags: [], definitions: [] };

  const getSceneForPosition = (pos: number) => {
    const lines = parsedDoc.lines;
    let accum = 0;
    let lastHeading = "Introduction";
    for (let i = 0; i < lines.length; i++) {
      const lineLen = lines[i].text.length + 1;
      if (lines[i].type === LineType.heading) {
        lastHeading = lines[i].text.replace(/^[.#= ]+/, "").replace(/\[\[.*?\]\]/g, "").replace(/#[^#]+#\s*$/, "").trim();
      }
      if (accum <= pos && pos <= accum + lineLen) {
        return lastHeading;
      }
      accum += lineLen;
    }
    return lastHeading;
  };

  const scrollToPosition = (pos: number) => {
    if (editorView) {
      editorView.dispatch({
        selection: { anchor: pos },
        effects: EditorView.scrollIntoView(pos, { y: "center" }),
      });
      editorView.focus();
    }
  };

  const handleDeleteDefinition = (defId: string) => {
    updateSettings((prev: any) => {
      const prevProd = prev.productionTags || { tags: [], definitions: [] };
      const tags = (prevProd.tags || []).filter((t: any) => t.definitionId !== defId);
      const definitions = (prevProd.definitions || []).filter((d: any) => d.id !== defId);
      return {
        ...prev,
        productionTags: {
          tags,
          definitions
        }
      };
    });
  };

  const handleMerge = (sourceId: string) => {
    const targetId = mergeTargets[sourceId];
    if (!targetId) return;

    updateSettings((prev: any) => {
      const prevProd = prev.productionTags || { tags: [], definitions: [] };
      const tags = (prevProd.tags || []).map((t: any) => {
        if (t.definitionId === sourceId) {
          return { ...t, definitionId: targetId };
        }
        return t;
      });
      const definitions = (prevProd.definitions || []).filter((d: any) => d.id !== sourceId);
      return {
        ...prev,
        productionTags: {
          tags,
          definitions
        }
      };
    });

    setMergeTargets((prev) => {
      const copy = { ...prev };
      delete copy[sourceId];
      return copy;
    });
  };

  const categoriesWithDefinitions = useMemo(() => {
    return CATEGORIES.map((cat) => {
      const defs = (prodTags.definitions || []).filter((d: any) => {
        if (d.type !== cat.key) return false;
        if (searchQuery) {
          return d.name.toLowerCase().includes(searchQuery.toLowerCase());
        }
        return true;
      });

      const defsWithOccurrences = defs.map((def: any) => {
        const occurrences = (prodTags.tags || []).filter((t: any) => t.definitionId === def.id).map((t: any) => {
          const [start] = t.range;
          return {
            pos: start,
            sceneName: getSceneForPosition(start)
          };
        });
        return { ...def, occurrences };
      });

      return {
        ...cat,
        definitions: defsWithOccurrences
      };
    }).filter((cat) => cat.definitions.length > 0);
  }, [prodTags, searchQuery, parsedDoc.lines]);

  return (
    <Dialog 
      open 
      onClose={onClose} 
      fullWidth 
      maxWidth="sm" 
      slotProps={{ 
        paper: { 
          sx: { 
            borderRadius: '16px',
            bgcolor: 'background.paper',
            boxShadow: 'var(--shadow-xl)'
          } 
        } 
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, pb: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: "0.95rem" }}>Production Breakdown</Typography>
        <IconButton aria-label="close" onClick={onClose} sx={{ color: "text.secondary", p: 0.5 }}>
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2, pt: 0, display: "flex", flexDirection: "column", gap: 1.5, minHeight: 350, maxHeight: 500 }}>
        <TextField
          placeholder="Filter tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          fullWidth
          slotProps={{
            input: {
              sx: {
                bgcolor: "action.hover",
                fontSize: "0.75rem",
                "& fieldset": { border: "none" },
                "&:hover fieldset": { border: "none" },
                "&.Mui-focused fieldset": { border: "none" },
                borderRadius: "8px",
              },
              startAdornment: (
                <Box sx={{ display: "flex", color: "text.secondary", mr: 0.8 }}>
                  <SearchIcon sx={{ fontSize: 14 }} />
                </Box>
              )
            }
          }}
        />

        <Box sx={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1.5, pr: 0.5 }}>
          {categoriesWithDefinitions.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: "center", fontStyle: "italic", fontSize: "0.8rem" }}>
              No production tags defined yet.
            </Typography>
          ) : (
            categoriesWithDefinitions.map((cat) => (
              <Box key={cat.key} sx={{ mb: 0.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, pb: 0.5, borderBottom: "1px solid", borderColor: "divider", mb: 0.8 }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: cat.color }} />
                  <Typography variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase", fontSize: "0.7rem", color: "text.secondary", letterSpacing: "0.05em" }}>
                    {cat.label}
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                  {cat.definitions.map((def: any) => {
                    const siblingDefs = cat.definitions.filter((d: any) => d.id !== def.id);
                    const selectedTarget = mergeTargets[def.id] || "";
                    return (
                      <Box 
                        key={def.id} 
                        sx={{ 
                          display: "flex", 
                          flexDirection: "column", 
                          p: 1, 
                          borderRadius: "6px", 
                          bgcolor: "background.paper", 
                          border: "1px solid", 
                          borderColor: "divider",
                        }}
                      >
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2 }}>
                          <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.8rem" }}>
                              {def.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
                              ({def.occurrences.length} instances)
                            </Typography>
                          </Box>

                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            {siblingDefs.length > 0 && (
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                <FormControl size="small">
                                  <Select
                                    value={selectedTarget}
                                    onChange={(e) => setMergeTargets(prev => ({ ...prev, [def.id]: e.target.value }))}
                                    displayEmpty
                                    sx={{ height: 22, fontSize: "0.7rem", borderRadius: '4px', minWidth: 80 }}
                                  >
                                    <MenuItem value="" sx={{ fontSize: "0.7rem" }}>Merge...</MenuItem>
                                    {siblingDefs.map((sibling: any) => (
                                      <MenuItem key={sibling.id} value={sibling.id} sx={{ fontSize: "0.7rem" }}>
                                        {sibling.name}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleMerge(def.id)} 
                                  disabled={!selectedTarget}
                                  sx={{ p: 0.25, color: "primary.main" }}
                                >
                                  <MergeTypeIcon sx={{ fontSize: 13 }} />
                                </IconButton>
                              </Box>
                            )}

                            <IconButton size="small" onClick={() => handleDeleteDefinition(def.id)} sx={{ p: 0.25, color: "text.secondary" }}>
                              <DeleteIcon sx={{ fontSize: 13 }} />
                            </IconButton>
                          </Box>
                        </Box>

                        {def.occurrences.length > 0 && (
                          <Box sx={{ mt: 0.5, display: "flex", flexWrap: "wrap", gap: 0.5, alignItems: "center" }}>
                            <Typography variant="caption" sx={{ fontSize: "0.65rem", fontWeight: 700, color: "text.secondary" }}>
                              SCENES:
                            </Typography>
                            {def.occurrences.map((occ: any, oIdx: number) => (
                              <Typography
                                key={oIdx}
                                variant="caption"
                                onClick={() => {
                                  scrollToPosition(occ.pos);
                                  onClose();
                                }}
                                sx={{
                                  fontSize: "0.65rem",
                                  bgcolor: "action.hover",
                                  px: 0.5,
                                  py: 0.1,
                                  borderRadius: "3px",
                                  cursor: "pointer",
                                  color: "text.primary",
                                  "&:hover": {
                                    color: "primary.main",
                                    bgcolor: "action.selected"
                                  }
                                }}
                              >
                                {occ.sceneName}
                              </Typography>
                            ))}
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            ))
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};
