import React, { useState, useMemo } from "react";
import { useFile, useEditor, useUI } from "../context";
import { LineType } from "../parser";
import { EditorView } from "@codemirror/view";
import { SearchIcon, CloseIcon, DownloadIcon } from "./Icons";
import { invoke } from "@tauri-apps/api/core";
import { logger } from "../utils/logger";
import { CATEGORIES } from "../constants";

import {
  Box,
  Typography,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
} from "@mui/material";

interface ProductionBreakdownModalProps {
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
  startPos: number;
  endPos: number;
  tags: { [categoryKey: string]: SceneTag[] };
}

export const ProductionBreakdownModal: React.FC<ProductionBreakdownModalProps> = ({ onClose }) => {
  const { parsedDoc, filePath, activeScriptName } = useFile();
  const { editorView } = useEditor();
  const { appScale } = useUI();
  const [searchQuery, setSearchQuery] = useState("");

  const prodTags = parsedDoc.settings?.productionTags || { tags: [], definitions: [] };

  const scrollToPosition = (pos: number) => {
    if (editorView) {
      editorView.dispatch({
        selection: { anchor: pos },
        effects: EditorView.scrollIntoView(pos, { y: "center" }),
      });
      editorView.focus();
    }
  };

  const { finalScenes, activeHeaders } = useMemo(() => {
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
            if (!targetScene.tags["cast"].some(t => t.name === charName)) {
              targetScene.tags["cast"].push({ name: charName, pos: accum });
            }
            activeCategories.add("cast");
          }
        }
      }
      accum += lineLen;
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
        if (!targetScene.tags[categoryKey].some(t => t.name === tagName)) {
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

    const filteredScenes = finalScenesList.filter(scene => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      if (scene.name.toLowerCase().includes(query)) return true;
      if (scene.sceneNumber.toLowerCase().includes(query)) return true;

      return Object.values(scene.tags).some(tagsList =>
        tagsList.some(tag => tag.name.toLowerCase().includes(query))
      );
    });

    const headers = CATEGORIES.filter(cat => activeCategories.has(cat.key));

    return {
      finalScenes: filteredScenes,
      activeHeaders: headers
    };
  }, [parsedDoc, prodTags, searchQuery]);

  const escapeCSV = (val: string) => {
    if (!val) return "";
    const str = String(val);
    if (str.includes(",") || str.includes("\"") || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const handleExportCSV = async () => {
    const headers = ["Scene #", "Scene Title", ...activeHeaders.map(h => h.label)];
    const csvRows = [headers.join(",")];

    finalScenes.forEach(scene => {
      const row = [
        escapeCSV(scene.sceneNumber),
        escapeCSV(scene.name),
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
        ? filePath.split(/[/\\]/).pop()?.replace(/\.[^/.]+$/, "") || "production_breakdown"
        : activeScriptName || "production_breakdown";
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
      maxWidth="lg"
      disableScrollLock
      sx={{ '& .MuiDialog-paper': { zoom: `${appScale}%`, borderRadius: '10px' } }}
    >
      <DialogTitle sx={{ m: 0, px: 2.5, py: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: 16 }}>Production Breakdown Matrix</Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={handleExportCSV}
            startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
            sx={{
              borderRadius: "6px",
              fontSize: "0.75rem",
              textTransform: "none",
              px: 1.5,
              py: 0.5,
              borderColor: "divider",
              color: "text.primary",
              '&:hover': {
                borderColor: "text.secondary",
                bgcolor: "action.hover",
              }
            }}
          >
            Export CSV
          </Button>
          <IconButton aria-label="close" onClick={onClose} sx={{ color: "text.secondary", p: 0.5 }}>
            <CloseIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ px: 2.5, py: 2, display: "flex", flexDirection: "column", gap: 2, maxHeight: "80vh" }}>
        <TextField
          placeholder="Search by scene name, number, or tag content..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          fullWidth
          slotProps={{
            input: {
              sx: {
                bgcolor: "action.hover",
                fontSize: "0.8rem",
                "& fieldset": { border: "none" },
                "&:hover fieldset": { border: "none" },
                "&.Mui-focused fieldset": { border: "none" },
                borderRadius: "8px",
              },
              startAdornment: (
                <Box sx={{ display: "flex", color: "text.secondary", mr: 1 }}>
                  <SearchIcon sx={{ fontSize: 16 }} />
                </Box>
              )
            }
          }}
        />

        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: "8px", overflow: "auto", flex: 1 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, bgcolor: "background.paper", width: 80 }}>Scene #</TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: "background.paper", minWidth: 200 }}>Scene Title</TableCell>
                {activeHeaders.map(header => (
                  <TableCell key={header.key} sx={{ fontWeight: 700, bgcolor: "background.paper", minWidth: 150 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: header.color }} />
                      {header.label}
                    </Box>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {finalScenes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={activeHeaders.length + 2} align="center" sx={{ py: 4, color: "text.secondary", fontStyle: "italic" }}>
                    No matching scenes or tags found.
                  </TableCell>
                </TableRow>
              ) : (
                finalScenes.map((scene) => (
                  <TableRow key={scene.index === 0 ? "preamble" : scene.name} hover>
                    <TableCell sx={{ fontSize: "0.8rem", color: "text.secondary", fontWeight: 600 }}>
                      {scene.sceneNumber}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.8rem", fontWeight: 600 }}>
                      {scene.name}
                    </TableCell>
                    {activeHeaders.map(header => {
                      const tags = scene.tags[header.key] || [];
                      return (
                        <TableCell key={header.key}>
                          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                            {tags.map((tag, tIdx) => (
                              <Box
                                key={`${tag.name}-${tIdx}`}
                                onClick={() => {
                                  scrollToPosition(tag.pos);
                                  onClose();
                                }}
                                sx={{
                                  fontSize: "0.7rem",
                                  bgcolor: `${header.color}15`,
                                  color: header.color,
                                  border: `1px solid ${header.color}30`,
                                  px: 1,
                                  py: 0.25,
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  fontWeight: 500,
                                  transition: "all 0.15s",
                                  '&:hover': {
                                    bgcolor: `${header.color}25`,
                                    transform: "translateY(-1px)",
                                    boxShadow: `0 2px 4px ${header.color}15`
                                  }
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
      </DialogContent>
    </Dialog>
  );
};
