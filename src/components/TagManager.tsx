import React, { useState, useMemo, useEffect, useRef } from "react";
import { useFile, useEditor, useUI } from "../context";
import { LineType } from "../parser";
import { EditorView } from "@codemirror/view";
import { SearchIcon, CloseIcon, DownloadIcon, LocalOfferIcon, TuneIcon, EditIcon, DeleteIcon } from "./Icons";
import { invoke } from "@tauri-apps/api/core";
import { logger } from "../utils/logger";
import { CATEGORIES } from "../constants";
import { getPerScriptSetting, updatePerScriptSetting } from "../utils/perScriptSettings";

import {
  Box,
  Typography,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  Menu,
  MenuItem,
  Checkbox,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  useMediaQuery,
  useTheme,
} from "@mui/material";

interface TagManagerProps {
  onClose: () => void;
}

interface ProdTag {
  range?: [number, number];
  type?: string;
  definitionId?: string;
  sceneId?: string;
}

interface ProdDefinition {
  id: string;
  name: string;
  type: string;
  colorOverride: string | null;
}

interface SceneTag {
  name: string;
  pos: number;
}

interface SceneInfo {
  index: number;
  sceneNumber: string;
  name: string;
  setting?: string;
  location?: string;
  timeOfDay?: string;
  startPos: number;
  endPos: number;
  tags: { [categoryKey: string]: SceneTag[] };
}

export const TagManager: React.FC<TagManagerProps> = ({ onClose }) => {
  const { parsedDoc, filePath, activeScriptName, scriptFileName } = useFile();
  const { editorView, updateSettings } = useEditor();
  const { appScale } = useUI();
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("md"));
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilters, setCategoryFilters] = useState<Set<string>>(new Set());
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<HTMLElement | null>(null);
  const [tabIndex, setTabIndex] = useState(1);
  const [reportType, setReportType] = useState(0);

  const [selectedDefId, setSelectedDefId] = useState<string | null>(null);
  const [editingDefId, setEditingDefId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState<string | null>(null);
  const [confirmRemoveAllOpen, setConfirmRemoveAllOpen] = useState(false);

  const prodTags = getPerScriptSetting("productionTags", parsedDoc.settings, scriptFileName) || { tags: [], definitions: [] };

  const toggleCategoryFilter = (key: string) => {
    setCategoryFilters(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
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

  const { finalScenes, activeHeaders, tagDefMap, catDefGroups, tagGroupsByCategory } = useMemo(() => {
    const scenes: SceneInfo[] = [];
    const lines = parsedDoc.lines;
    const activeCategories = new Set<string>();

    let accum = 0;
    let currentScene: SceneInfo | null = null;
    let headingCount = 0;

    const preambleScene: SceneInfo = {
      index: 0,
      sceneNumber: "-",
      name: "Preamble",
      startPos: 0,
      endPos: 0,
      tags: {}
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineLen = line.text.length + 1;

      if (line.type === LineType.heading) {
        headingCount++;
        const sceneName = line.text
          .replace(/^[.#= ]+/, "")
          .replace(/\[\[.*?\]\]/g, "")
          .replace(/#[^#\s]+#\s*/g, "")
          .trim();

        if (currentScene) {
          currentScene.endPos = accum;
        } else {
          preambleScene.endPos = accum;
        }

        currentScene = {
          index: headingCount,
          sceneNumber: line.sceneNumber || String(headingCount),
          name: sceneName,
          setting: line.setting || undefined,
          location: line.location || undefined,
          timeOfDay: line.timeOfDay || undefined,
          startPos: accum,
          endPos: accum + lineLen,
          tags: {}
        };
        scenes.push(currentScene);
      } else {
        if (currentScene) {
          currentScene.endPos = accum + lineLen;
        } else {
          preambleScene.endPos = accum + lineLen;
        }

        if (line.type === LineType.character || line.type === LineType.dualDialogueCharacter) {
          const charName = line.text
            .replace(/^@[ ]*/, "")
            .replace(/[ ]*\^[ ]*$/, "")
            .replace(/\s*\([^)]*\)/g, "")
            .trim()
            .toUpperCase();
          if (charName) {
            const targetScene = currentScene || preambleScene;
            if (!targetScene.tags["cast"]) {
              targetScene.tags["cast"] = [];
            }
            if (!targetScene.tags["cast"].some(t => t.name.toLowerCase() === charName.toLowerCase())) {
              targetScene.tags["cast"].push({ name: charName, pos: accum });
            }
            activeCategories.add("cast");
          }
        }
      }
      accum += lineLen;
    }

    if (currentScene) {
      currentScene.endPos = accum;
    }

    const definitionsMap = new Map<string, ProdDefinition>();
    (prodTags.definitions || []).forEach((def: ProdDefinition) => {
      definitionsMap.set(def.id, def);
    });

    (prodTags.tags || []).forEach((tag: ProdTag) => {
      const [start] = tag.range || [0];
      const def = definitionsMap.get(tag.definitionId || "");
      if (!def) return;

      const categoryKey = def.type;
      const tagName = def.name;
      activeCategories.add(categoryKey);

      let targetScene: SceneInfo | null = null;
      if (start >= preambleScene.startPos && start < preambleScene.endPos) {
        targetScene = preambleScene;
      } else {
        for (const scene of scenes) {
          if (start >= scene.startPos && start < scene.endPos) {
            targetScene = scene;
            break;
          }
        }
      }

      if (targetScene) {
        if (!targetScene.tags[categoryKey]) {
          targetScene.tags[categoryKey] = [];
        }
        if (!targetScene.tags[categoryKey].some(t => t.name.toLowerCase() === tagName.toLowerCase())) {
          targetScene.tags[categoryKey].push({ name: tagName, pos: start });
        }
      }
    });

    const finalScenesList: SceneInfo[] = [];
    const hasPreambleTags = Object.keys(preambleScene.tags).length > 0;
    if (hasPreambleTags) {
      finalScenesList.push(preambleScene);
    }
    finalScenesList.push(...scenes);

    const hasCategoryFilters = categoryFilters.size > 0;

    const filteredScenes = finalScenesList.filter(scene => {
      if (hasCategoryFilters) {
        const matchesCategory = [...categoryFilters].some(key =>
          (scene.tags[key] || []).length > 0
        );
        if (!matchesCategory) return false;
      }

      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      if (scene.name.toLowerCase().includes(query)) return true;
      if (scene.sceneNumber.toLowerCase().includes(query)) return true;

      return Object.values(scene.tags).some(tagsList =>
        tagsList.some(tag => tag.name.toLowerCase().includes(query))
      );
    });

    const headers = CATEGORIES.filter(cat => activeCategories.has(cat.key));

    const catDefGroupsMap = new Map<string, { def: ProdDefinition; count: number }[]>();
    for (const def of (prodTags.definitions || [])) {
      const catKey = def.type;
      if (!catDefGroupsMap.has(catKey)) {
        catDefGroupsMap.set(catKey, []);
      }
      const count = (prodTags.tags || []).filter((t: ProdTag) => t.definitionId === def.id).length;
      catDefGroupsMap.get(catKey)!.push({ def, count });
    }

    const groupsArray = CATEGORIES
      .filter(cat => catDefGroupsMap.has(cat.key))
      .map(cat => ({
        key: cat.key,
        label: cat.label,
        color: cat.color,
        items: catDefGroupsMap.get(cat.key)!.sort((a, b) => a.def.name.localeCompare(b.def.name))
      }));

    const tagGroupsByCategory = CATEGORIES
      .filter(cat => activeCategories.has(cat.key) && (!categoryFilters.size || categoryFilters.has(cat.key)))
      .map(cat => {
        const defs = ((prodTags.definitions || []) as ProdDefinition[]).filter(d => d.type === cat.key);
        const defsWithScenes: { def: ProdDefinition; scenes: SceneInfo[] }[] = [];
        for (const def of defs) {
          const defScenes = finalScenesList.filter(scene =>
            (scene.tags[cat.key] || []).some(t => t.name.toLowerCase() === def.name.toLowerCase())
          );
          if (defScenes.length > 0) {
            defsWithScenes.push({ def, scenes: defScenes });
          }
        }
        defsWithScenes.sort((a, b) => a.def.name.localeCompare(b.def.name));
        return { cat, defs: defsWithScenes };
      }).filter(g => g.defs.length > 0);

    return {
      finalScenes: filteredScenes,
      activeHeaders: headers,
      tagDefMap: definitionsMap,
      catDefGroups: groupsArray,
      tagGroupsByCategory,
    };
  }, [parsedDoc, prodTags, searchQuery, categoryFilters]);

  const initRef = useRef(false);
  useEffect(() => {
    if (!initRef.current && activeHeaders.length > 0) {
      setCategoryFilters(new Set(activeHeaders.map(h => h.key)));
      initRef.current = true;
    }
  }, [activeHeaders]);

  const selectedDef = useMemo(() => {
    if (!selectedDefId) return null;
    return tagDefMap.get(selectedDefId) || null;
  }, [selectedDefId, tagDefMap]);

  const selectedCat = useMemo(() => {
    if (!selectedDef) return null;
    return CATEGORIES.find(c => c.key === selectedDef.type) || null;
  }, [selectedDef]);

  const defTags = useMemo(() => {
    if (!selectedDefId) return [];
    return (prodTags.tags || []).filter((t: ProdTag) => t.definitionId === selectedDefId);
  }, [selectedDefId, prodTags]);

  const handleStartRename = (def: ProdDefinition) => {
    setEditingDefId(def.id);
    setEditName(def.name);
  };

  const handleCancelRename = () => {
    setEditingDefId(null);
    setEditName("");
  };

  const handleSaveRename = () => {
    if (!editingDefId || !editName.trim()) return;
    const newName = editName.trim();
    updateSettings((prev: any) => {
      const prevProdTags = getPerScriptSetting("productionTags", prev, scriptFileName) || { tags: [], definitions: [] };
      const definitions = (prevProdTags.definitions || []).map((d: ProdDefinition) =>
        d.id === editingDefId ? { ...d, name: newName } : d
      );
      return { ...prev, ...updatePerScriptSetting(prev, "productionTags", scriptFileName, { ...prevProdTags, definitions }) };
    });
    setEditingDefId(null);
    setEditName("");
  };

  const handleDeleteDef = (defId: string) => {
    updateSettings((prev: any) => {
      const prevProdTags = getPerScriptSetting("productionTags", prev, scriptFileName) || { tags: [], definitions: [] };
      const definitions = (prevProdTags.definitions || []).filter((d: ProdDefinition) => d.id !== defId);
      const tags = (prevProdTags.tags || []).filter((t: ProdTag) => t.definitionId !== defId);
      return { ...prev, ...updatePerScriptSetting(prev, "productionTags", scriptFileName, { tags, definitions }) };
    });
    setSelectedDefId(null);
    setConfirmDeleteOpen(null);
  };

  const handleRemoveAllTags = () => {
    updateSettings((prev: any) => {
      return { ...prev, ...updatePerScriptSetting(prev, "productionTags", scriptFileName, { tags: [], definitions: [] }) };
    });
    setConfirmRemoveAllOpen(false);
  };

  const escapeCSV = (val: string) => {
    if (!val) return "";
    const str = String(val);
    if (str.includes(",") || str.includes("\"") || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const handleExportCSV = async () => {
    const headers = ["Scene #", "Scene Title", "Setting", "Location", "Time", ...activeHeaders.map(h => h.label)];
    const csvRows = [headers.join(",")];

    finalScenes.forEach(scene => {
      const row = [
        escapeCSV(scene.sceneNumber),
        escapeCSV(scene.name),
        escapeCSV(scene.setting || ""),
        escapeCSV(scene.location || ""),
        escapeCSV(scene.timeOfDay || ""),
        ...activeHeaders.map(cat => {
          const tags = scene.tags[cat.key] || [];
          return escapeCSV(tags.map(t => t.name).join("; "));
        })
      ];
      csvRows.push(row.join(","));
    });

    const csvContent = csvRows.join("\n");
    const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

    if (isTauri) {
      try {
        await invoke("export_csv", { content: csvContent });
      } catch (err) {
        logger.error("breakdown", String(err));
      }
    } else {
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const baseName = filePath
        ? filePath.split(/[/\\]/).pop()?.replace(/\.[^/.]+$/, "") || "tag_report"
        : activeScriptName || "tag_report";
      link.setAttribute("href", url);
      link.setAttribute("download", `${baseName}_breakdown.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      fullWidth
      maxWidth={isSmall ? false : "lg"}
      fullScreen={isSmall}
      disableScrollLock
      transitionDuration={200}
      sx={{ '& .MuiDialog-paper': Object.assign({ borderRadius: '12px' }, isSmall ? {} : { zoom: `${appScale}%` }) }}
    >
      <DialogTitle sx={{ m: 0, px: 2, py: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <LocalOfferIcon sx={{ fontSize: 18 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: 14 }}>Tag Manager</Typography>
        </Box>
        <IconButton aria-label="close" onClick={onClose} sx={{ color: "text.secondary" }}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <Box sx={{ px: 2, py: 1 }}>
        <ToggleButtonGroup value={tabIndex} exclusive fullWidth size="small"
          onChange={(_, val) => val !== null && setTabIndex(val as number)}>
          <ToggleButton value={0} sx={{ fontSize: 12, py: 0.3 }}>Edit Tags</ToggleButton>
          <ToggleButton value={1} sx={{ fontSize: 12, py: 0.3 }}>Tag Reports</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <DialogContent dividers sx={{ px: isSmall ? 1 : 2, py: 1.5, display: "flex", flexDirection: "column", gap: isSmall ? 1 : 1.5, flex: 1 }}>

        {tabIndex === 0 && (
          <Box sx={{ display: "flex", flexDirection: isSmall ? "column" : "row", gap: 1.5, flex: 1, minHeight: 0 }}>
            <Box sx={{
              width: isSmall ? "100%" : 260,
              maxHeight: isSmall ? 140 : "none",
              flexShrink: 0,
              border: "0.5px solid",
              borderColor: "divider",
              borderRadius: "6px",
              overflowY: "auto",
              bgcolor: "action.hover",
            }}>
              <Typography sx={{ px: 1.5, py: 1, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "text.secondary" }}>
                Categories & Tags
              </Typography>
              <Divider />
              {catDefGroups.map(group => (
                <Box key={group.key}>
                  <Box sx={{
                    display: "flex",
                    alignItems: "center",
                    px: 1.5, py: 0.6,
                    cursor: "pointer",
                    gap: 0.75,
                    '&:hover': { bgcolor: "action.selected" }
                  }}>
                    <Box sx={{ width: 7, height: 7, borderRadius: "2px", bgcolor: group.color, flexShrink: 0 }} />
                    <Typography sx={{ flex: 1, fontSize: 10, fontWeight: 500, color: "text.primary" }}>
                      {group.label}
                    </Typography>
                    <Typography sx={{ fontSize: 9, color: "text.disabled", fontWeight: 600 }}>
                      {group.items.length}
                    </Typography>
                  </Box>
                  {group.items.map(({ def, count }) => {
                    const isSelected = selectedDefId === def.id;
                    return (
                      <Box
                        key={def.id}
                        onClick={() => setSelectedDefId(def.id)}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          px: 1.5, py: 0.4,
                          pl: 3.5,
                          cursor: "pointer",
                          gap: 0.5,
                          bgcolor: isSelected ? "primary.main" + "0f" : "transparent",
                          borderLeft: isSelected ? "2px solid" : "2px solid transparent",
                          borderColor: isSelected ? "primary.main" : "transparent",
                          '&:hover': { bgcolor: isSelected ? "primary.main" + "0f" : "action.selected" }
                        }}
                      >
                        <Typography sx={{
                          flex: 1,
                          fontSize: 10,
                          color: isSelected ? "primary.main" : "text.primary",
                          fontWeight: isSelected ? 600 : 400,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}>
                          {def.name}
                        </Typography>
                        <Typography sx={{ fontSize: 9, color: "text.disabled" }}>
                          {count}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              ))}
              {catDefGroups.length === 0 && (
                <Typography sx={{ p: 2, fontSize: 10, color: "text.disabled", textAlign: "center" }}>
                  No tag definitions
                </Typography>
              )}
            </Box>

            <Box sx={{
              flex: 1,
              border: "0.5px solid",
              borderColor: "divider",
              borderRadius: "6px",
              overflowY: "auto",
              minHeight: 0,
            }}>
              {!selectedDef ? (
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "text.disabled", fontSize: 11 }}>
                  Select a tag definition to view details
                </Box>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
                  <Box sx={{ px: 1.5, py: 1, display: "flex", alignItems: "center", gap: 1, borderBottom: "0.5px solid", borderColor: "divider" }}>
                    {selectedCat && (
                      <Box sx={{
                        width: 8, height: 8, borderRadius: "2px",
                        bgcolor: selectedCat.color, flexShrink: 0
                      }} />
                    )}
                    {editingDefId === selectedDef.id ? (
                      <>
                        <TextField
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          size="small"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveRename();
                            if (e.key === "Escape") handleCancelRename();
                          }}
                          slotProps={{
                            input: { sx: { fontSize: 11, py: 0.25 } }
                          }}
                          sx={{ flex: 1 }}
                        />
                        <Button size="small" onClick={handleSaveRename} sx={{ fontSize: 10, textTransform: "none", minWidth: 0, px: 0.75 }}>
                          Save
                        </Button>
                        <Button size="small" onClick={handleCancelRename} sx={{ fontSize: 10, textTransform: "none", minWidth: 0, px: 0.75, color: "text.secondary" }}>
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Typography sx={{ flex: 1, fontSize: 12, fontWeight: 600 }}>
                          {selectedDef.name}
                        </Typography>
                        <Tooltip title="Rename">
                          <IconButton size="small" onClick={() => handleStartRename(selectedDef)} sx={{ color: "text.secondary" }}>
                            <EditIcon sx={{ fontSize: 13 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete definition and all its tags">
                          <IconButton
                            size="small"
                            onClick={() => {
                              if (confirmDeleteOpen === selectedDef.id) {
                                handleDeleteDef(selectedDef.id);
                              } else {
                                setConfirmDeleteOpen(selectedDef.id);
                              }
                            }}
                            onBlur={() => setConfirmDeleteOpen(null)}
                            sx={{
                              color: confirmDeleteOpen === selectedDef.id ? "error.main" : "text.secondary",
                              '&:hover': { color: "error.main" }
                            }}
                          >
                            <DeleteIcon sx={{ fontSize: 13 }} />
                          </IconButton>
                        </Tooltip>
                        {confirmDeleteOpen === selectedDef.id && (
                          <Typography sx={{ fontSize: 9, color: "error.main", whiteSpace: "nowrap" }}>
                            Click again to confirm
                          </Typography>
                        )}
                      </>
                    )}
                  </Box>

                  <Box sx={{ px: 1.5, py: 0.8, display: "flex", alignItems: "center", gap: 1, borderBottom: "0.5px solid", borderColor: "divider" }}>
                    <Typography sx={{ fontSize: 10, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Category:
                    </Typography>
                    {selectedCat && (
                      <Box sx={{
                        fontSize: 9,
                        bgcolor: `${selectedCat.color}12`,
                        color: selectedCat.color,
                        border: `0.5px solid ${selectedCat.color}25`,
                        px: 0.6,
                        py: 0.1,
                        borderRadius: "3px",
                        fontWeight: 500,
                      }}>
                        {selectedCat.label}
                      </Box>
                    )}
                    <Box sx={{ flex: 1 }} />
                    <Typography sx={{ fontSize: 10, color: "text.disabled" }}>
                      Used in {defTags.length} {defTags.length === 1 ? "place" : "places"}
                    </Typography>
                  </Box>

                  <Box sx={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
                    {defTags.length === 0 ? (
                      <Typography sx={{ p: 2, fontSize: 10, color: "text.disabled", textAlign: "center" }}>
                        No tags reference this definition
                      </Typography>
                    ) : (
                      <Table size="small" sx={{ borderCollapse: "collapse", '& .MuiTableCell-root': { border: "0.5px solid", borderColor: "divider", fontSize: 10, px: 1, py: 0.4 } }}>
                        <TableHead>
                          <TableRow sx={(theme) => ({
                            '& .MuiTableCell-root': {
                              bgcolor: theme.palette.mode === 'light' ? theme.palette.grey[900] : theme.palette.grey[100],
                              color: theme.palette.mode === 'light' ? theme.palette.common.white : theme.palette.common.black,
                              fontWeight: 600,
                              fontSize: 10,
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                              py: 0.4,
                              border: "0.5px solid",
                              borderColor: "divider",
                            }
                          })}>
                            <TableCell sx={{ width: 40 }}>#</TableCell>
                            <TableCell>Scene</TableCell>
                            <TableCell sx={{ width: 70 }}>Position</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {defTags.map((tag: ProdTag, idx: number) => {
                            const [start] = tag.range || [0];
                            const scene = finalScenes.find(s => start >= s.startPos && start < s.endPos);
                            return (
                              <TableRow
                                key={idx}
                                hover
                                onClick={() => { scrollToPosition(start); }}
                                sx={{ cursor: "pointer", '&:hover': { bgcolor: "action.hover" } }}
                              >
                                <TableCell sx={{ color: "text.secondary", fontWeight: 500 }}>
                                  {scene ? scene.sceneNumber : "-"}
                                </TableCell>
                                <TableCell sx={{ fontWeight: 500, maxWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {scene ? scene.name : "—"}
                                </TableCell>
                                <TableCell sx={{ color: "text.disabled", fontSize: 9, fontFamily: "monospace" }}>
                                  {start}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        )}

        {tabIndex === 1 && (
          <>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: isSmall ? "wrap" : "nowrap" }}>
              <ToggleButtonGroup value={reportType} exclusive size="small"
                onChange={(_, val) => val !== null && setReportType(val as number)}>
                <ToggleButton value={0} sx={{ fontSize: 9, py: 0.25, px: 1, textTransform: "none" }}>
                  Scene by Scene
                </ToggleButton>
                <ToggleButton value={1} sx={{ fontSize: 9, py: 0.25, px: 1, textTransform: "none" }}>
                  List by Tag
                </ToggleButton>
              </ToggleButtonGroup>

              <TextField
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="small"
                fullWidth
                sx={{ maxWidth: isSmall ? "100%" : 360 }}
                slotProps={{
                  input: {
                    sx: {
                      fontSize: 11,
                      '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                      bgcolor: 'action.hover',
                      borderRadius: '4px',
                      '&:hover': { bgcolor: 'action.selected' },
                      '& .MuiOutlinedInput-input': { py: 0.35, px: 1 },
                    },
                    startAdornment: (
                      <Box sx={{ display: "flex", color: "text.disabled", mr: 0.5 }}>
                        <SearchIcon sx={{ fontSize: 13 }} />
                      </Box>
                    )
                  }
                }}
              />

              {activeHeaders.length > 0 && (
                <>
                  <Button
                    size="small"
                    onClick={(e) => setFilterMenuAnchor(e.currentTarget)}
                    startIcon={<TuneIcon sx={{ fontSize: 13 }} />}
                    sx={{
                      fontSize: 10,
                      textTransform: "none",
                      color: categoryFilters.size > 0 ? "primary.main" : "text.secondary",
                      fontWeight: categoryFilters.size > 0 ? 600 : 400,
                      minHeight: 24,
                      px: 1,
                      py: 0.25,
                      borderRadius: "4px",
                      border: "0.5px solid",
                      borderColor: categoryFilters.size > 0 ? "primary.main" : "divider",
                      bgcolor: categoryFilters.size > 0 ? "primary.main" + "0a" : "transparent",
                      '&:hover': { bgcolor: "action.hover" },
                      flexShrink: 0,
                    }}
                  >
                    Filter{categoryFilters.size > 0 ? ` (${categoryFilters.size})` : ""}
                  </Button>
                  <Menu
                    anchorEl={filterMenuAnchor}
                    open={Boolean(filterMenuAnchor)}
                    onClose={() => setFilterMenuAnchor(null)}
                    slotProps={{ paper: { sx: { minWidth: 160, mt: 0.25 } } }}
                  >
                    {CATEGORIES.filter(c => activeHeaders.some(h => h.key === c.key)).map(cat => {
                      const active = categoryFilters.has(cat.key);
                      return (
                        <MenuItem
                          key={cat.key}
                          dense
                          onClick={() => toggleCategoryFilter(cat.key)}
                        >
                          <Checkbox size="small" checked={active} sx={{ py: 0, '& .MuiSvgIcon-root': { fontSize: 15 } }} />
                          <Box sx={{ width: 8, height: 8, borderRadius: "2px", bgcolor: cat.color, mr: 0.75, flexShrink: 0 }} />
                          {cat.label}
                        </MenuItem>
                      );
                    })}
                    {activeHeaders.length > 1 && (
                      <>
                        <Divider sx={{ my: 0.25 }} />
                        <MenuItem
                          dense
                          onClick={() => { setCategoryFilters(new Set()); setFilterMenuAnchor(null); }}
                          sx={{ color: "text.secondary" }}
                        >
                          Clear all
                        </MenuItem>
                      </>
                    )}
                  </Menu>
                </>
              )}

              {reportType <= 1 && (
                <Button
                  variant="outlined"
                  size="small"
                  color="inherit"
                  onClick={handleExportCSV}
                  startIcon={<DownloadIcon sx={{ fontSize: 12 }} />}
                  sx={{
                    borderRadius: "4px",
                    fontSize: "10px",
                    textTransform: "none",
                    px: 1,
                    py: 0.25,
                    minHeight: 24,
                    borderColor: "divider",
                    color: "text.secondary",
                    flexShrink: 0,
                    '&:hover': {
                      borderColor: "text.primary",
                      bgcolor: "action.hover",
                    }
                  }}
                >
                  Export CSV
                </Button>
              )}
              {(prodTags.tags?.length > 0 || prodTags.definitions?.length > 0) && (
                <Button
                  size="small"
                  onClick={() => setConfirmRemoveAllOpen(true)}
                  startIcon={<DeleteIcon sx={{ fontSize: 12 }} />}
                  sx={{
                    borderRadius: "4px",
                    fontSize: "10px",
                    textTransform: "none",
                    px: 1,
                    py: 0.25,
                    minHeight: 24,
                    color: "error.main",
                    border: "0.5px solid",
                    borderColor: "error.main",
                    flexShrink: 0,
                    '&:hover': {
                      bgcolor: "error.main",
                      color: "#fff",
                    }
                  }}
                >
                  Remove All Tags
                </Button>
              )}
            </Box>

            {reportType === 0 && (
              <TableContainer component={Box} sx={{ flex: 1, minHeight: 0, overflow: "auto", border: "0.5px solid", borderColor: "divider", borderRadius: "6px" }}>
                <Table size="small" stickyHeader sx={{ tableLayout: "fixed", borderCollapse: "collapse", '& .MuiTableCell-root': { border: "0.5px solid", borderColor: "divider", fontSize: 10, px: 1, py: 0.5 } }}>
                  <TableHead>
                    <TableRow sx={(theme) => ({
                      '& .MuiTableCell-root': {
                        bgcolor: theme.palette.mode === 'light' ? theme.palette.grey[900] : theme.palette.grey[100],
                        color: theme.palette.mode === 'light' ? theme.palette.common.white : theme.palette.common.black,
                        fontWeight: 600,
                        fontSize: 10,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        py: 0.5,
                        border: "0.5px solid",
                        borderColor: "divider",
                      }
                    })}>
                      <TableCell sx={{ width: 56 }}>#</TableCell>
                      <TableCell>Scene</TableCell>
                      <TableCell sx={{ width: 56 }}>Setting</TableCell>
                      <TableCell sx={{ width: 100 }}>Location</TableCell>
                      <TableCell sx={{ width: 56 }}>Time</TableCell>
                      {activeHeaders.filter(h => !categoryFilters.size || categoryFilters.has(h.key)).map(h => (
                        <TableCell key={h.key}>{h.label}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {finalScenes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5 + activeHeaders.filter(h => !categoryFilters.size || categoryFilters.has(h.key)).length} align="center" sx={{ py: 4, color: "text.disabled", fontSize: 11 }}>
                          No matching scenes found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      finalScenes.map(scene => (
                        <TableRow
                          key={scene.index === 0 ? "preamble" : `${scene.index}-${scene.name}`}
                          sx={{ '&:hover': { bgcolor: "action.hover" } }}
                        >
                          <TableCell sx={{ color: "text.secondary", fontWeight: 500 }}>{scene.sceneNumber}</TableCell>
                          <TableCell sx={{ fontWeight: 500 }}>{scene.name}</TableCell>
                          <TableCell sx={{ color: "text.secondary", fontSize: 9 }}>{scene.setting || "—"}</TableCell>
                          <TableCell sx={{ color: "text.secondary", fontSize: 9, maxWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{scene.location || "—"}</TableCell>
                          <TableCell sx={{ color: "text.secondary", fontSize: 9 }}>{scene.timeOfDay || "—"}</TableCell>
                          {activeHeaders.filter(h => !categoryFilters.size || categoryFilters.has(h.key)).map(h => {
                            const tags: SceneTag[] = scene.tags[h.key] || [];
                            return (
                              <TableCell key={h.key} sx={{ py: 0.35 }}>
                                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.35 }}>
                                  {tags.map((tag, tIdx) => (
                                    <Box
                                      key={`${tag.name}-${tIdx}`}
                                      onDoubleClick={() => scrollToPosition(tag.pos)}
                                      sx={{
                                        fontSize: "9px",
                                        bgcolor: `${h.color}12`,
                                        color: h.color,
                                        border: `0.5px solid ${h.color}25`,
                                        px: 0.6,
                                        py: 0.15,
                                        borderRadius: "3px",
                                        cursor: "pointer",
                                        fontWeight: 500,
                                        lineHeight: 1.4,
                                        whiteSpace: "nowrap",
                                        '&:hover': { bgcolor: `${h.color}20` },
                                      }}
                                    >
                                      {tag.name}
                                    </Box>
                                  ))}
                                </Box>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {reportType === 1 && (
              <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", border: "0.5px solid", borderColor: "divider", borderRadius: "6px" }}>
                {tagGroupsByCategory.length === 0 ? (
                  <Typography sx={{ p: 4, fontSize: 11, color: "text.disabled", textAlign: "center" }}>
                    No tags match the current filters
                  </Typography>
                ) : (
                  tagGroupsByCategory.map(group => (
                    <Box key={group.cat.key}>
                      <Box sx={{
                        display: "flex", alignItems: "center", gap: 0.75,
                        px: 1.5, py: 0.6,
                        bgcolor: "action.hover",
                        borderBottom: "0.5px solid", borderColor: "divider",
                      }}>
                        <Box sx={{ width: 7, height: 7, borderRadius: "2px", bgcolor: group.cat.color, flexShrink: 0 }} />
                        <Typography sx={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          {group.cat.label}
                        </Typography>
                        <Typography sx={{ fontSize: 9, color: "text.disabled" }}>
                          ({group.defs.length})
                        </Typography>
                      </Box>
                      {group.defs.map(({ def, scenes }) => (
                        <Box key={def.id}>
                          <Box sx={{
                            display: "flex", alignItems: "center", gap: 0.75,
                            px: 1.5, py: 0.4, pl: 3.5,
                            borderBottom: "0.5px solid", borderColor: "divider",
                          }}>
                            <Typography sx={{
                              fontSize: 10, fontWeight: 500, color: "text.primary",
                              minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>
                              {def.name}
                            </Typography>
                            <Typography sx={{ fontSize: 9, color: "text.disabled", ml: "auto" }}>
                              {scenes.length} {scenes.length === 1 ? "scene" : "scenes"}
                            </Typography>
                          </Box>
                          {scenes.map(scene => (
                            <Box
                              key={`${def.id}-${scene.index}`}
                              onDoubleClick={() => scrollToPosition(scene.startPos)}
                              sx={{
                                display: "flex", alignItems: "center", gap: 1,
                                px: 1.5, py: 0.3, pl: 5,
                                cursor: "pointer",
                                borderBottom: "0.5px solid", borderColor: "divider",
                                '&:hover': { bgcolor: "action.hover" }
                              }}
                            >
                              <Typography sx={{ fontSize: 9, color: "text.secondary", fontFamily: "monospace", width: 28, flexShrink: 0 }}>
                                {scene.sceneNumber}
                              </Typography>
                              <Typography sx={{ fontSize: 10, color: "text.primary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {scene.name}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      ))}
                    </Box>
                  ))
                )}
              </Box>
            )}

          </>
        )}

      </DialogContent>

      <Dialog open={confirmRemoveAllOpen} onClose={() => setConfirmRemoveAllOpen(false)} maxWidth="xs">
        <DialogTitle sx={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 1 }}>
          <DeleteIcon sx={{ fontSize: 18, color: "error.main" }} />
          Remove All Production Tags?
        </DialogTitle>
        <DialogContent sx={{ fontSize: 11 }}>
          <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
            This will permanently delete <strong>all production tags and tag definitions</strong> across this script. This action cannot be undone.
          </Typography>
        </DialogContent>
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, px: 3, pb: 2 }}>
          <Button size="small" onClick={() => setConfirmRemoveAllOpen(false)} sx={{ fontSize: 10, textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            size="small"
            variant="contained"
            color="error"
            onClick={handleRemoveAllTags}
            sx={{ fontSize: 10, textTransform: "none" }}
          >
            Remove All
          </Button>
        </Box>
      </Dialog>
    </Dialog>
  );
};
