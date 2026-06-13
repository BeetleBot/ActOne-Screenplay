import React, { useState, useRef, useCallback } from "react";
import { useFile } from "../context";
import { invoke } from "@tauri-apps/api/core";
import { AddIcon, DownloadIcon, FolderOpenIcon, DragHandleIcon, CloseIcon } from "./Icons";

import {
  Box,
  Typography,
  Button,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  Divider,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";

export const ScriptsView: React.FC = () => {
  const {
    scripts, activeScriptIndex, isBundle, filePath,
    setActiveScript, addScript, importScript, renameScript, deleteScript, moveScript,
  } = useFile();

  const [menuState, setMenuState] = useState<{ anchorEl: HTMLElement; index: number } | null>(null);
  const [renameDialog, setRenameDialog] = useState<{ open: boolean; index: number; value: string } | null>(null);
  const [exportDialog, setExportDialog] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const mouseDragRef = useRef<number | null>(null);
  const mouseOverRef = useRef<number | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);

  const [exportFormat, setExportFormat] = useState<"fountain" | "pdf" | "fdx">("pdf");
  const [boldSceneHeadings, setBoldSceneHeadings] = useState(false);
  const [mirrorSceneNumbers, setMirrorSceneNumbers] = useState("off");
  const [exportSections, setExportSections] = useState(false);
  const [exportSynopses, setExportSynopses] = useState(false);
  const [exportTitlePage, setExportTitlePage] = useState(true);
  const [selectedFont, setSelectedFont] = useState("courier-prime");

  if (!isBundle) return null;

  const bundleName = filePath
    ? filePath.split(/[/\\]/).pop()?.replace(/\.(actone|fountain|txt)$/i, "") || "Untitled"
    : "Untitled";

  const handleAdd = async () => {
    await addScript();
  };

  const handleRenameOpen = () => {
    if (!menuState) return;
    setRenameDialog({ open: true, index: menuState.index, value: scripts[menuState.index]?.name || "" });
    setMenuState(null);
  };

  const handleRenameSubmit = async () => {
    if (!renameDialog) return;
    await renameScript(renameDialog.index, renameDialog.value);
    setRenameDialog(null);
  };

  const handleDelete = async () => {
    if (!menuState) return;
    await deleteScript(menuState.index);
    setMenuState(null);
  };

  const handleMoveUp = () => {
    if (!menuState || menuState.index <= 0) return;
    moveScript(menuState.index, menuState.index - 1);
    setMenuState(null);
  };

  const handleMoveDown = () => {
    if (!menuState || menuState.index >= scripts.length - 1) return;
    moveScript(menuState.index, menuState.index + 1);
    setMenuState(null);
  };

  const handleExportAll = async () => {
    if (!scripts.length) return;
    setExportDialog(false);

    const isTauri = typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__;

    if (!isTauri) {
      if (exportFormat === "pdf" || exportFormat === "fdx") {
        alert(exportFormat === "pdf" ? "PDF export is only supported in the desktop app." : "FDX export is only supported in the desktop app.");
        return;
      }
      for (const script of scripts) {
        const fileName = `${bundleName}_${script.name}.fountain`;
        const blob = new Blob([script.content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
      return;
    }

    const dir = await invoke<string | null>("pick_directory");
    if (!dir) return;

    const revisedLines: boolean[] = [];
    const pdfParams = {
      paperSize: "letter",
      fontFamily: selectedFont,
      boldSceneHeadings,
      mirrorSceneNumbers,
      exportSections,
      exportSynopses,
      exportTitlePage,
      revisedLines,
    };

    for (const script of scripts) {
      const safeName = script.name.replace(/[<>:"/\\|?*]/g, "_");
      const sep = dir.includes("\\") ? "\\" : "/";
      if (exportFormat === "fountain") {
        const filePath = `${dir}${sep}${bundleName}_${safeName}.fountain`;
        await invoke("save_file_content", { path: filePath, content: script.content });
      } else if (exportFormat === "fdx") {
        const fdxContent = await invoke<string>("generate_fdx_string", { fountainText: script.content });
        const filePath = `${dir}${sep}${bundleName}_${safeName}.fdx`;
        await invoke("save_file_content", { path: filePath, content: fdxContent });
      } else {
        const bytes = await invoke<number[] | null>("generate_pdf_bytes", {
          fountainText: script.content,
          ...pdfParams,
        });
        if (bytes) {
          const filePath = `${dir}${sep}${bundleName}_${safeName}.pdf`;
          await invoke("save_file_binary", { path: filePath, bytes: Array.from(bytes) });
        }
      }
    }
  };

  const handleHandleMouseDown = useCallback((e: React.MouseEvent, index: number) => {
    e.preventDefault();
    if (!listRef.current) return;

    mouseDragRef.current = index;
    setDragIndex(index);

    const ghost = document.createElement("div");
    ghost.textContent = scripts[index].name;
    Object.assign(ghost.style, {
      position: "fixed",
      pointerEvents: "none",
      zIndex: "10000",
      opacity: "0.85",
      padding: "4px 10px",
      background: "rgb(25, 118, 210)",
      color: "white",
      borderRadius: "6px",
      fontSize: "13px",
      left: e.clientX + "px",
      top: e.clientY + "px",
      transform: "translate(-50%, -50%)",
      whiteSpace: "nowrap",
    });
    document.body.appendChild(ghost);
    ghostRef.current = ghost;

    const getTargetIndex = (clientY: number): number | null => {
      if (!listRef.current) return null;
      const items = listRef.current.querySelectorAll("[data-script-index]");
      for (const item of items) {
        const rect = item.getBoundingClientRect();
        const idx = parseInt(item.getAttribute("data-script-index") || "", 10);
        if (idx === mouseDragRef.current) continue;
        if (clientY <= rect.bottom) return clientY < rect.top + rect.height / 2 ? idx : idx + 1;
      }
      return scripts.length;
    };

    const onMove = (ev: MouseEvent) => {
      if (ghostRef.current) {
        ghostRef.current.style.left = ev.clientX + "px";
        ghostRef.current.style.top = ev.clientY + "px";
      }
      const target = getTargetIndex(ev.clientY);
      if (target !== mouseOverRef.current) {
        mouseOverRef.current = target;
        setOverIndex(target);
      }
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      if (ghostRef.current) {
        document.body.removeChild(ghostRef.current);
        ghostRef.current = null;
      }
      const fromIdx = mouseDragRef.current;
      const toIdx = mouseOverRef.current;
      mouseDragRef.current = null;
      mouseOverRef.current = null;
      setDragIndex(null);
      setOverIndex(null);
      if (fromIdx !== null && toIdx !== null && fromIdx !== toIdx) {
        const clampedTo = Math.min(toIdx, scripts.length - 1);
        moveScript(fromIdx, clampedTo);
      }
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [scripts, moveScript]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 1.5, pt: 1.5, pb: 0.75 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, opacity: 0.8, fontSize: 12 }}>
          Scripts
        </Typography>
        <Box sx={{ display: "flex", gap: 0.25 }}>
          <IconButton size="small" onClick={importScript} title="Import Fountain File" sx={{ opacity: 0.6, "&:hover": { opacity: 1 } }}>
            <FolderOpenIcon sx={{ fontSize: 16 }} />
          </IconButton>
          <IconButton size="small" onClick={handleAdd} title="Add Script">
            <AddIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", minHeight: 0, px: 1 }}>
        {scripts.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic", px: 1, py: 2, fontSize: 12 }}>
            No scripts yet. Add one.
          </Typography>
        ) : (
          <List disablePadding ref={listRef}>
            {scripts.map((script, index) => {
              const isActive = index === activeScriptIndex;
              const isDragging = dragIndex === index;
              const isOver = overIndex === index && !isDragging;
              return (
                <ListItemButton
                  key={`${script.name}-${index}`}
                  dense
                  selected={isActive}
                  disableRipple={dragIndex !== null}
                  onClick={() => { if (dragIndex === null) setActiveScript(index); }}
                  data-script-index={index}
                  sx={{
                    borderRadius: "6px", mb: 0.25, pr: 1, py: 0.5, pl: 0.5,
                    opacity: isDragging ? 0.4 : 1,
                    borderTop: isOver ? "2px solid" : "2px solid transparent",
                    borderTopColor: isOver ? "primary.main" : "transparent",
                    transition: "border-top-color 0.12s ease, opacity 0.12s ease",
                    "&.Mui-selected": {
                      bgcolor: "action.selected",
                      "&:hover": { bgcolor: "action.selected" },
                    },
                  }}
                >
                  <Box
                    onMouseDown={(e) => handleHandleMouseDown(e, index)}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      cursor: "grab",
                      color: "text.disabled",
                      mr: 0.5,
                      flexShrink: 0,
                      "&:hover": { color: "text.secondary" },
                      "&:active": { cursor: "grabbing" },
                    }}
                  >
                    <DragHandleIcon sx={{ fontSize: 16 }} />
                  </Box>
                  <ListItemText
                    primary={script.name}
                    secondary={isActive && dragIndex === null ? "active" : undefined}
                    slotProps={{
                      primary: { sx: { fontWeight: isActive ? 700 : 500, fontSize: "0.8rem" } },
                      secondary: { sx: { fontSize: "0.6rem", color: "primary.main" } },
                    }}
                    sx={{ minWidth: 0 }}
                  />
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuState({ anchorEl: e.currentTarget, index });
                    }}
                    sx={{ opacity: 0.5, "&:hover": { opacity: 1 }, flexShrink: 0 }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                    </svg>
                  </IconButton>
                </ListItemButton>
              );
            })}
          </List>
        )}
      </Box>

      <Divider sx={{ mx: 1.5 }} />

      <Box sx={{ p: 1.5 }}>
        <Button
          variant="outlined"
          size="small"
          fullWidth
          startIcon={<DownloadIcon sx={{ fontSize: 13 }} />}
          onClick={() => setExportDialog(true)}
          disabled={scripts.length === 0}
          sx={{ textTransform: "none", fontSize: 10.5, fontWeight: 600, borderRadius: "6px" }}
        >
          Export All Scripts
        </Button>
      </Box>

      <Menu
        anchorEl={menuState?.anchorEl}
        open={!!menuState}
        onClose={() => setMenuState(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { minWidth: 130 } } }}
      >
        <MenuItem onClick={handleRenameOpen} dense sx={{ fontSize: 13 }}>Rename</MenuItem>
        <Divider />
        <MenuItem onClick={handleMoveUp} dense disabled={!menuState || menuState.index <= 0} sx={{ fontSize: 13 }}>Move Up</MenuItem>
        <MenuItem onClick={handleMoveDown} dense disabled={!menuState || menuState.index >= scripts.length - 1} sx={{ fontSize: 13 }}>Move Down</MenuItem>
        <Divider />
        <MenuItem onClick={handleDelete} dense sx={{ color: "error.main", fontSize: 13 }}>Delete</MenuItem>
      </Menu>

      {renameDialog && (
        <Dialog open onClose={() => setRenameDialog(null)} disableScrollLock maxWidth="xs" fullWidth
          sx={{ '& .MuiDialog-paper': { borderRadius: '10px' } }}>
          <DialogTitle sx={{ m: 0, px: 2, py: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: 15 }}>Rename Script</Typography>
            <IconButton aria-label="close" onClick={() => setRenameDialog(null)} sx={{ color: "text.secondary" }}>
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ px: 2.5, py: 2 }}>
            <TextField
              autoFocus
              fullWidth
              size="small"
              value={renameDialog.value}
              onChange={(e) => setRenameDialog({ ...renameDialog, value: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Enter") handleRenameSubmit(); }}
            />
          </DialogContent>
          <DialogActions sx={{ px: 2.5, py: 1.25 }}>
            <Button onClick={() => setRenameDialog(null)} color="inherit" size="small">Cancel</Button>
            <Button onClick={handleRenameSubmit} variant="contained" size="small">Rename</Button>
          </DialogActions>
        </Dialog>
      )}

      {exportDialog && (
        <Dialog open onClose={() => setExportDialog(false)} fullWidth maxWidth="sm" disableScrollLock
          sx={{ '& .MuiDialog-paper': { borderRadius: '10px' } }}>
          <DialogTitle sx={{ m: 0, px: 2, py: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <DownloadIcon sx={{ fontSize: 18 }} />
              <Typography variant="h6" component="span" sx={{ fontWeight: 600, fontSize: 15 }}>
                Export All Scripts ({scripts.length})
              </Typography>
            </Box>
            <IconButton aria-label="close" onClick={() => setExportDialog(false)} sx={{ color: "text.secondary" }}>
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </DialogTitle>

          <DialogContent dividers sx={{ px: 2.5, py: 2 }}>
            <FormControl fullWidth size="small" sx={{ mb: 2.5 }}>
              <InputLabel id="export-format-label">Export Format</InputLabel>
              <Select
                labelId="export-format-label"
                value={exportFormat}
                label="Export Format"
                onChange={(e) => setExportFormat(e.target.value as "fountain" | "pdf" | "fdx")}
              >
                <MenuItem value="pdf">PDF</MenuItem>
                <MenuItem value="fountain">Fountain</MenuItem>
                <MenuItem value="fdx">FDX (Final Draft)</MenuItem>
              </Select>
            </FormControl>

            {exportFormat === "pdf" && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <FormControlLabel
                  control={<Switch checked={exportTitlePage} onChange={(e) => setExportTitlePage(e.target.checked)} />}
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>Include Title Page</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Export the title page if it is defined</Typography>
                    </Box>
                  }
                />
                <FormControlLabel
                  control={<Switch checked={boldSceneHeadings} onChange={(e) => setBoldSceneHeadings(e.target.checked)} />}
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>Bold Scene Headings</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Make scene headings bold in the PDF</Typography>
                    </Box>
                  }
                />
                <Box sx={{ display: "flex", gap: 2 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="scene-numbers-label">Scene Numbers</InputLabel>
                    <Select
                      labelId="scene-numbers-label"
                      value={mirrorSceneNumbers}
                      label="Scene Numbers"
                      onChange={(e) => setMirrorSceneNumbers(e.target.value)}
                    >
                      <MenuItem value="off">Disabled</MenuItem>
                      <MenuItem value="left_side">Left Side Only</MenuItem>
                      <MenuItem value="mirror">Mirror on Both Sides</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl fullWidth size="small">
                    <InputLabel id="export-font-label">Export Font</InputLabel>
                    <Select
                      labelId="export-font-label"
                      value={selectedFont}
                      label="Export Font"
                      onChange={(e) => setSelectedFont(e.target.value)}
                    >
                      <MenuItem value="courier-prime">Courier Prime</MenuItem>
                      <MenuItem value="courier-prime-sans">Courier Prime Sans</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                <FormControlLabel
                  control={<Switch checked={exportSections} onChange={(e) => setExportSections(e.target.checked)} />}
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>Include Sections</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Render section headings (#) in export</Typography>
                    </Box>
                  }
                />
                <FormControlLabel
                  control={<Switch checked={exportSynopses} onChange={(e) => setExportSynopses(e.target.checked)} />}
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>Include Synopsis</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Render synopses (=) in export</Typography>
                    </Box>
                  }
                />
              </Box>
            )}

            {exportFormat === "fdx" && (
              <Box sx={{ p: 1.5, bgcolor: "action.hover", borderRadius: 1.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5, fontSize: 13 }}>
                  Export {scripts.length} Script{scripts.length !== 1 ? "s" : ""} as FDX Files
                </Typography>
                <Typography variant="caption" color="text.secondary" component="div" sx={{ fontSize: 11.5 }}>
                  Each script is saved as a separate .fdx (Final Draft XML) file.
                  <Box component="ul" sx={{ pl: 2, mt: 0.5, mb: 0 }}>
                    <li>Files are named: <strong>{bundleName}_ScriptName.fdx</strong></li>
                  </Box>
                </Typography>
              </Box>
            )}

            {exportFormat === "fountain" && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box sx={{ p: 1.5, bgcolor: "action.hover", borderRadius: 1.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5, fontSize: 13 }}>
                    Export {scripts.length} Script{scripts.length !== 1 ? "s" : ""} as Clean Fountain Files
                  </Typography>
                  <Typography variant="caption" color="text.secondary" component="div" sx={{ fontSize: 11.5 }}>
                    Each script is saved as a separate .fountain file in your chosen directory.
                    <Box component="ul" sx={{ pl: 2, mt: 0.5, mb: 0 }}>
                      <li>Files are named: <strong>{bundleName}_ScriptName.fountain</strong></li>
                    </Box>
                  </Typography>
                </Box>
                <FormControlLabel
                  control={<Switch checked={exportTitlePage} onChange={(e) => setExportTitlePage(e.target.checked)} />}
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>Include Title Page</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Export the title page if it is defined</Typography>
                    </Box>
                  }
                />
                <FormControlLabel
                  control={<Switch checked={exportSections} onChange={(e) => setExportSections(e.target.checked)} />}
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>Include Sections</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Keep section lines (#) in the exported file</Typography>
                    </Box>
                  }
                />
                <FormControlLabel
                  control={<Switch checked={exportSynopses} onChange={(e) => setExportSynopses(e.target.checked)} />}
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>Include Synopsis</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Keep synopsis lines (=) in the exported file</Typography>
                    </Box>
                  }
                />
              </Box>
            )}
          </DialogContent>

          <DialogActions sx={{ px: 2.5, py: 1.25, justifyContent: "space-between" }}>
            <Button onClick={() => setExportDialog(false)} color="inherit" variant="outlined" size="small">Cancel</Button>
            <Button onClick={handleExportAll} variant="contained" color="primary" size="small">
              Export All
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};
