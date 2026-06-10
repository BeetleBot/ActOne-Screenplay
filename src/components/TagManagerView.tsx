import React, { useState, useMemo } from "react";
import { useAppContext } from "../context/AppContext";
import { LineType } from "../parser/FountainParser";
import { EditorView } from "@codemirror/view";
import SearchIcon from "@mui/icons-material/Search";
import DeleteIcon from "@mui/icons-material/Delete";
import MergeTypeIcon from "@mui/icons-material/MergeType";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Box,
  Typography,
  TextField,
  Card,
  CardContent,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  List,
  ListItem,
  ListItemText,
  Button,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";

const CATEGORIES = [
  { key: "cast", label: "Cast (Character)", color: "#00bcd4" },
  { key: "prop", label: "Prop", color: "#ff9800" },
  { key: "vfx", label: "VFX", color: "#9c27b0" },
  { key: "sfx", label: "SFX (Special Effect)", color: "#795548" },
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
  { key: "other", label: "Other (Generic)", color: "#9e9e9e" }
];

export const TagManagerView: React.FC = () => {
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
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", p: 2, gap: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, opacity: 0.8, fontSize: "0.7rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          Production Breakdown
        </Typography>
      </Box>

      <TextField
        placeholder="Filter tags..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        size="small"
        fullWidth
        slotProps={{
          input: {
            sx: {
              borderRadius: 0,
              bgcolor: "background.paper",
              fontSize: "0.75rem",
              "& fieldset": { borderColor: "divider" },
              "&:hover fieldset": { borderColor: "text.secondary" },
              "&.Mui-focused fieldset": { borderWidth: "1px", borderColor: "primary.main" },
            },
            startAdornment: (
              <Box sx={{ display: "flex", color: "text.secondary", mr: 0.8 }}>
                <SearchIcon sx={{ fontSize: 14 }} />
              </Box>
            )
          }
        }}
      />

      <Box sx={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1 }}>
        {categoriesWithDefinitions.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: "center", fontStyle: "italic" }}>
            No production tags defined yet.
          </Typography>
        ) : (
          categoriesWithDefinitions.map((cat) => (
            <Accordion
              key={cat.key}
              variant="outlined"
              sx={{
                borderRadius: 0,
                borderLeft: `4px solid ${cat.color}`,
                "&:before": { display: "none" }
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 16 }} />}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {cat.label}
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 1.5, display: "flex", flexDirection: "column", gap: 1.5 }}>
                {cat.definitions.map((def: any) => {
                  const siblingDefs = cat.definitions.filter((d: any) => d.id !== def.id);
                  const selectedTarget = mergeTargets[def.id] || "";
                  return (
                    <Card key={def.id} variant="outlined" sx={{ borderRadius: 0 }}>
                      <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 }, display: "flex", flexDirection: "column", gap: 1 }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {def.name}
                          </Typography>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <Chip
                              label={`${def.occurrences.length} instances`}
                              size="small"
                              sx={{ height: 18, fontSize: 9, borderRadius: 0 }}
                            />
                            <IconButton size="small" onClick={() => handleDeleteDefinition(def.id)}>
                              <DeleteIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Box>
                        </Box>

                        {def.occurrences.length > 0 && (
                          <Box sx={{ mt: 0.5 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                              SCENES:
                            </Typography>
                            <List disablePadding sx={{ display: "flex", flexDirection: "column", gap: 0.5, mt: 0.5 }}>
                              {def.occurrences.map((occ: any, oIdx: number) => (
                                <ListItem
                                  key={oIdx}
                                  disableGutters
                                  sx={{ py: 0.1, px: 1, bgcolor: "action.hover", cursor: "pointer" }}
                                  onClick={() => scrollToPosition(occ.pos)}
                                >
                                  <ListItemText
                                    primary={occ.sceneName}
                                    slotProps={{
                                      primary: {
                                        sx: { fontSize: 11, color: "text.primary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }
                                      }
                                    }}
                                  />
                                </ListItem>
                              ))}
                            </List>
                          </Box>
                        )}

                        {siblingDefs.length > 0 && (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1, pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
                            <FormControl fullWidth size="small">
                              <Select
                                value={selectedTarget}
                                onChange={(e) => setMergeTargets(prev => ({ ...prev, [def.id]: e.target.value }))}
                                displayEmpty
                                sx={{ height: 26, fontSize: 10 }}
                              >
                                <MenuItem value="">Merge into...</MenuItem>
                                {siblingDefs.map((sibling: any) => (
                                  <MenuItem key={sibling.id} value={sibling.id}>
                                    {sibling.name}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => handleMerge(def.id)}
                              disabled={!selectedTarget}
                              startIcon={<MergeTypeIcon sx={{ fontSize: 12 }} />}
                              sx={{ height: 26, fontSize: 10, textTransform: "none", minWidth: 70 }}
                            >
                              Merge
                            </Button>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </AccordionDetails>
            </Accordion>
          ))
        )}
      </Box>
    </Box>
  );
};
