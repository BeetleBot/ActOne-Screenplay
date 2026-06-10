import React, { useState, useMemo } from "react";
import { useAppContext } from "../context/AppContext";
import { LineType } from "../parser/FountainParser";
import { EditorView } from "@codemirror/view";
import { SearchIcon, DeleteIcon, MergeTypeIcon, CloseIcon } from "./Icons";

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
  ListItemButton,
  ListItemText,
} from "@mui/material";

const CATEGORIES = [
  { key: "cast", label: "Cast", color: "var(--cat-cast)" },
  { key: "prop", label: "Prop", color: "var(--cat-prop)" },
  { key: "vfx", label: "VFX", color: "var(--cat-vfx)" },
  { key: "sfx", label: "SFX", color: "var(--cat-sfx)" },
  { key: "camera", label: "Camera", color: "var(--cat-camera)" },
  { key: "animal", label: "Animal", color: "var(--cat-animal)" },
  { key: "extras", label: "Extras", color: "var(--cat-extras)" },
  { key: "vehicle", label: "Vehicle", color: "var(--cat-vehicle)" },
  { key: "costume", label: "Costume", color: "var(--cat-costume)" },
  { key: "makeup", label: "Makeup", color: "var(--cat-makeup)" },
  { key: "music", label: "Music", color: "var(--cat-music)" },
  { key: "sound", label: "Sound", color: "var(--cat-sound)" },
  { key: "stunt", label: "Stunt", color: "var(--cat-stunt)" },
  { key: "setDesign", label: "Set Design", color: "var(--cat-setDesign)" },
  { key: "other", label: "Other", color: "var(--cat-other)" }
];

interface ProductionBreakdownModalProps {
  onClose: () => void;
}

export const ProductionBreakdownModal: React.FC<ProductionBreakdownModalProps> = ({ onClose }) => {
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
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ m: 0, p: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>Production Breakdown</Typography>
        <IconButton aria-label="close" onClick={onClose} sx={{ color: "text.secondary" }}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2, minHeight: 350, maxHeight: 500 }}>
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
              <Box key={cat.key}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, pb: 0.5, borderBottom: "1px solid", borderColor: "divider", mb: 0.5 }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: cat.color }} />
                  <Typography variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase", fontSize: "0.7rem", color: "text.secondary", letterSpacing: "0.05em" }}>
                    {cat.label}
                  </Typography>
                </Box>

                {cat.definitions.map((def: any) => {
                  const siblingDefs = cat.definitions.filter((d: any) => d.id !== def.id);
                  const selectedTarget = mergeTargets[def.id] || "";
                  return (
                    <ListItemButton key={def.id} dense sx={{ borderRadius: "6px", mb: 0.25, px: 1 }}>
                      <ListItemText
                        primary={def.name}
                        secondary={`${def.occurrences.length} instances`}
                        slotProps={{
                          primary: { sx: { fontWeight: 600, fontSize: "0.8rem" } },
                          secondary: { sx: { fontSize: "0.7rem" } },
                        }}
                        sx={{ mr: 1 }}
                      />
                      {siblingDefs.length > 0 && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mr: 0.5 }}>
                          <FormControl size="small">
                            <Select
                              value={selectedTarget}
                              onChange={(e) => setMergeTargets(prev => ({ ...prev, [def.id]: e.target.value }))}
                              displayEmpty
                              sx={{ height: 22, fontSize: "0.7rem", borderRadius: "4px", minWidth: 80 }}
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
                    </ListItemButton>
                  );
                })}

                {cat.definitions.some((def: any) => def.occurrences.length > 0) && (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, alignItems: "center", mt: 0.25, ml: 1 }}>
                    {cat.definitions.map((def: any) =>
                      def.occurrences.map((occ: any, oIdx: number) => (
                        <Typography
                          key={`${def.id}-${oIdx}`}
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
                            "&:hover": { color: "primary.main", bgcolor: "action.selected" }
                          }}
                        >
                          {occ.sceneName}
                        </Typography>
                      ))
                    )}
                  </Box>
                )}
              </Box>
            ))
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};
