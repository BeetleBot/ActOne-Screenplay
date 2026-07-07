import React, { useState, useRef, useCallback } from "react";
import { useFile } from "../context";
import { AddIcon, DownloadIcon, DragHandleIcon, SaveIcon, InfoOutlinedIcon } from "./Icons";
import { ExportModal } from "./ExportModal";

import {
  Box,
  Typography,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  Divider,
  TextField,
  Tooltip,
} from "@mui/material";

export const ScriptsView = React.memo(() => {
  const {
    scripts, activeScriptIndex, isBundle,
    setActiveScript, addScript, importScript, renameScript, duplicateScript, deleteScript, moveScript,
  } = useFile();

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [menuState, setMenuState] = useState<{ anchorEl: HTMLElement; index: number } | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [showExportAll, setShowExportAll] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const mouseDragRef = useRef<number | null>(null);
  const mouseOverRef = useRef<number | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);

  if (!isBundle) return null;

  const handleAdd = async () => {
    const newIndex = scripts.length;
    const newName = await addScript("Untitled");
    if (newName) {
      setEditingIndex(newIndex);
      setEditingValue(newName);
    }
  };

  const handleRenameOpen = () => {
    if (!menuState) return;
    setEditingIndex(menuState.index);
    setEditingValue(scripts[menuState.index]?.name || "");
    setMenuState(null);
  };

  const handleRenameSave = async (index: number) => {
    if (editingValue.trim()) {
      await renameScript(index, editingValue.trim());
    }
    setEditingIndex(null);
    setEditingValue("");
  };

  const handleDelete = async () => {
    if (!menuState) return;
    await deleteScript(menuState.index);
    setMenuState(null);
  };

  const handleDuplicate = async () => {
    if (!menuState) return;
    const newName = await duplicateScript(menuState.index);
    if (newName) {
      setEditingIndex(menuState.index + 1);
      setEditingValue(newName);
    }
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
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, height: 40, minHeight: 40, borderBottom: "1px solid", borderColor: "divider" }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, opacity: 0.8, fontSize: "0.7rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          Scripts
        </Typography>
        <Box sx={{ display: "flex", gap: 0.25, alignItems: "center" }}>
          <Tooltip title="Scripts displays the list of files in the current bundle. Drag to reorder, add new scripts, or import fountain files.">
            <span>
              <InfoOutlinedIcon sx={{ fontSize: 16, opacity: 0.6, cursor: "help", mr: 0.5 }} />
            </span>
          </Tooltip>
          <IconButton size="small" onClick={importScript} title="Import Fountain File" sx={{ opacity: 0.6, "&:hover": { opacity: 1 } }}>
            <DownloadIcon sx={{ fontSize: 16 }} />
          </IconButton>
          <IconButton size="small" onClick={handleAdd} title="Add Script">
            <AddIcon sx={{ fontSize: 16 }} />
          </IconButton>
          <IconButton size="small" onClick={() => setShowExportAll(true)} title="Export All Scripts" sx={{ opacity: 0.6, "&:hover": { opacity: 1 } }}>
            <SaveIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", minHeight: 0, p: 1.5 }}>
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
                  key={script.fileName}
                  dense
                  selected={isActive}
                  disableRipple={dragIndex !== null}
                  onClick={() => { if (dragIndex === null) setActiveScript(index); }}
                  onDoubleClick={() => {
                    setEditingIndex(index);
                    setEditingValue(script.name);
                  }}
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
                  {editingIndex === index ? (
                    <TextField
                      autoFocus
                      size="small"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={() => handleRenameSave(index)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleRenameSave(index);
                        } else if (e.key === "Escape") {
                          setEditingIndex(null);
                          setEditingValue("");
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => e.stopPropagation()}
                      slotProps={{
                        input: {
                          sx: { fontSize: "0.8rem", py: 0.25, height: 24 }
                        }
                      }}
                      sx={{ flex: 1, mr: 1 }}
                    />
                  ) : (
                    <ListItemText
                      primary={script.name}
                      secondary={isActive && dragIndex === null ? "active" : undefined}
                      slotProps={{
                        primary: { sx: { fontWeight: isActive ? 700 : 500, fontSize: "0.8rem" } },
                        secondary: { sx: { fontSize: "0.6rem", color: "primary.main" } },
                      }}
                      sx={{ minWidth: 0 }}
                    />
                  )}
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

      <Menu
        anchorEl={menuState?.anchorEl}
        open={!!menuState}
        onClose={() => setMenuState(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { minWidth: 130 } } }}
      >
        <MenuItem onClick={handleRenameOpen} dense>Rename</MenuItem>
        <Divider />
        <MenuItem onClick={handleMoveUp} dense disabled={!menuState || menuState.index <= 0}>Move Up</MenuItem>
        <MenuItem onClick={handleMoveDown} dense disabled={!menuState || menuState.index >= scripts.length - 1}>Move Down</MenuItem>
        <MenuItem onClick={handleDuplicate} dense>Duplicate</MenuItem>
        <Divider />
        <MenuItem onClick={handleDelete} dense sx={{ color: "error.main" }}>Delete</MenuItem>
      </Menu>

      {showExportAll && <ExportModal batchExport onClose={() => setShowExportAll(false)} />}

    </Box>
  );
});
