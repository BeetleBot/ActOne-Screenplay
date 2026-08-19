import React, { useState, useRef, useCallback, useMemo } from "react";
import { useFile } from "../context";
import {
  AddIcon,
  DownloadIcon,
  DragHandleIcon,
  InfoOutlinedIcon,
  SearchIcon,
  CloseIcon,
  MoreVertIcon,
} from "./Icons";

import {
  Box,
  Typography,
  IconButton,
  List,
  ListItemButton,
  Menu,
  MenuItem,
  Divider,
  TextField,
  Tooltip,
} from "@mui/material";
import { OutlineTag } from "./OutlineView";

export const ScriptsView = React.memo(() => {
  const {
    scripts,
    activeScriptIndex,
    isBundle,
    setActiveScript,
    addScript,
    importScript,
    renameScript,
    duplicateScript,
    deleteScript,
    moveScript,
  } = useFile();

  const [searchQuery, setSearchQuery] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [menuState, setMenuState] = useState<{ anchorEl: HTMLElement; index: number } | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [addMenuAnchor, setAddMenuAnchor] = useState<HTMLElement | null>(null);
  const [importMenuAnchor, setImportMenuAnchor] = useState<HTMLElement | null>(null);

  const listRef = useRef<HTMLUListElement>(null);
  const mouseDragRef = useRef<number | null>(null);
  const mouseOverRef = useRef<number | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);

  if (!isBundle) return null;

  const filteredScripts = useMemo(() => {
    if (!searchQuery.trim()) {
      return scripts.map((s, index) => ({ script: s, originalIndex: index }));
    }
    const q = searchQuery.toLowerCase();
    return scripts
      .map((s, index) => ({ script: s, originalIndex: index }))
      .filter(({ script }) => script.name.toLowerCase().includes(q));
  }, [scripts, searchQuery]);

  const handleAddClick = (e: React.MouseEvent<HTMLElement>) => {
    setAddMenuAnchor(e.currentTarget);
  };

  const handleAddClose = () => {
    setAddMenuAnchor(null);
  };

  const handleAddScriptType = async (type: "fountain" | "markdown") => {
    handleAddClose();
    const newIndex = scripts.length;
    const newName = await addScript(undefined, type);
    if (newName) {
      setEditingIndex(newIndex);
      setEditingValue(newName);
    }
  };

  const handleImportClick = (e: React.MouseEvent<HTMLElement>) => {
    setImportMenuAnchor(e.currentTarget);
  };

  const handleImportClose = () => {
    setImportMenuAnchor(null);
  };

  const handleImportScriptType = async (type: "fountain" | "markdown") => {
    handleImportClose();
    await importScript(type);
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
      opacity: "0.9",
      padding: "5px 12px",
      background: "var(--button-color, rgb(25, 118, 210))",
      color: "white",
      borderRadius: "0",
      fontSize: "12px",
      fontWeight: "600",
      fontFamily: "var(--font-ui)",
      left: e.clientX + "px",
      top: e.clientY + "px",
      transform: "translate(-50%, -50%)",
      whiteSpace: "nowrap",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
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
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, height: 40, minHeight: 40, borderBottom: "1px solid", borderColor: "divider" }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, opacity: 0.8, fontSize: "0.7rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          Project
        </Typography>
        <Box sx={{ display: "flex", gap: 0.25, alignItems: "center" }}>
          <Tooltip title="Project displays the list of files in the current bundle. Drag to reorder, add new files, or import files.">
            <span>
              <InfoOutlinedIcon sx={{ fontSize: 14, opacity: 0.6, cursor: "help", mr: 0.5 }} />
            </span>
          </Tooltip>
          <IconButton size="small" onClick={handleImportClick} title="Import File" sx={{ opacity: 0.6, "&:hover": { opacity: 1 } }}>
            <DownloadIcon sx={{ fontSize: 14 }} />
          </IconButton>
          <IconButton size="small" onClick={handleAddClick} title="Add New File" sx={{ opacity: 0.6, "&:hover": { opacity: 1 } }}>
            <AddIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>
      </Box>

      {/* Main Content Area */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Search Bar */}
        {scripts.length > 3 && (
          <Box sx={{ p: 1.5, pb: 0.8 }}>
            <TextField
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="small"
              fullWidth
              slotProps={{
                input: {
                  sx: {
                    bgcolor: "background.paper",
                    fontSize: "0.75rem",
                    "& fieldset": { border: "none" },
                  },
                  startAdornment: (
                    <Box sx={{ display: "flex", color: "text.secondary", mr: 0.8 }}>
                      <SearchIcon />
                    </Box>
                  ),
                  endAdornment: searchQuery && (
                    <IconButton size="small" onClick={() => setSearchQuery("")}>
                      <CloseIcon />
                    </IconButton>
                  ),
                },
              }}
            />
          </Box>
        )}

        {/* File List */}
        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            outline: "none",
            fontSize: "12.5px",
            fontFamily: "var(--font-ui)",
            "&::-webkit-scrollbar": {
              width: 8,
            },
            "&::-webkit-scrollbar-track": {
              bgcolor: "transparent",
            },
            "&::-webkit-scrollbar-thumb": {
              bgcolor: "var(--button-color, rgba(0, 0, 0, 0.35))",
              borderRadius: 0,
              border: "none",
              "&:hover": {
                bgcolor: "primary.main",
              },
            },
          }}
        >
          {scripts.length === 0 ? (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", p: 3, textAlign: "center", height: "60%", opacity: 0.6 }}>
              <InfoOutlinedIcon sx={{ fontSize: 24, mb: 1, opacity: 0.5 }} />
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, fontSize: "0.75rem" }}>
                No files yet
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
                Click + above to add a screenplay or prose document.
              </Typography>
            </Box>
          ) : filteredScripts.length === 0 ? (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", p: 3, textAlign: "center", height: "60%", opacity: 0.6 }}>
              <InfoOutlinedIcon sx={{ fontSize: 24, mb: 1, opacity: 0.5 }} />
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, fontSize: "0.75rem" }}>
                No matching files
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
                Try a different search query.
              </Typography>
            </Box>
          ) : (
            <List disablePadding ref={listRef} sx={{ display: "flex", flexDirection: "column", px: 1.2, py: 0.8 }}>
              {filteredScripts.map(({ script, originalIndex }) => {
                const isActive = originalIndex === activeScriptIndex;
                const isDragging = dragIndex === originalIndex;
                const isOver = overIndex === originalIndex && !isDragging;
                const isMarkdown = script.type === "markdown" || script.fileName?.endsWith(".md") || script.fileName?.endsWith(".markdown");

                return (
                  <ListItemButton
                    key={script.fileName}
                    dense
                    selected={isActive}
                    disableRipple={dragIndex !== null}
                    onClick={() => {
                      if (dragIndex === null) setActiveScript(originalIndex);
                    }}
                    onDoubleClick={() => {
                      setEditingIndex(originalIndex);
                      setEditingValue(script.name);
                    }}
                    data-script-index={originalIndex}
                    sx={{
                      borderRadius: 0,
                      mb: 0.35,
                      px: 1,
                      py: 0.45,
                      opacity: isDragging ? 0.4 : 1,
                      border: "1px solid",
                      borderColor: isOver
                        ? "var(--button-color, primary.main)"
                        : isActive
                        ? "var(--button-color, primary.main)"
                        : "color-mix(in srgb, var(--text-main) 8%, transparent)",
                      bgcolor: isActive ? "action.selected" : "background.paper",
                      boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.06)" : "0 1px 2px rgba(0,0,0,0.02)",
                      transition: "all var(--duration-fast) ease",
                      "&:hover": {
                        bgcolor: "action.hover",
                        borderColor: "color-mix(in srgb, var(--button-color) 40%, transparent)",
                      },
                    }}
                  >
                    {/* 1. Drag Handle on Left */}
                    <Box
                      onMouseDown={(e) => handleHandleMouseDown(e, originalIndex)}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        cursor: "grab",
                        color: "text.disabled",
                        mr: 0.8,
                        flexShrink: 0,
                        "&:hover": { color: "text.secondary" },
                        "&:active": { cursor: "grabbing" },
                      }}
                      title="Drag to reorder"
                    >
                      <DragHandleIcon sx={{ fontSize: 13 }} />
                    </Box>

                    {/* 2. File Name or Edit Input */}
                    {editingIndex === originalIndex ? (
                      <TextField
                        autoFocus
                        size="small"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={() => handleRenameSave(originalIndex)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleRenameSave(originalIndex);
                          } else if (e.key === "Escape") {
                            setEditingIndex(null);
                            setEditingValue("");
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onDoubleClick={(e) => e.stopPropagation()}
                        slotProps={{
                          input: {
                            sx: { fontSize: "0.8rem", py: 0.2, height: 22 },
                          },
                        }}
                        sx={{ flex: 1, mr: 0.5 }}
                      />
                    ) : (
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: isActive ? 700 : 500,
                          color: "text.primary",
                          fontSize: "0.8rem",
                          fontFamily: "var(--font-ui)",
                          letterSpacing: "0.01em",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        {script.name}
                      </Typography>
                    )}

                    {/* 3. Document Type Badge on Right */}
                    <OutlineTag
                      label={isMarkdown ? "MD" : "FOUNTAIN"}
                      variant={isMarkdown ? "accent" : "default"}
                      size="0.7rem"
                      sx={{ ml: 0.8, mr: 0.5 }}
                    />

                    {/* 4. More Options Context Menu Button */}
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuState({ anchorEl: e.currentTarget, index: originalIndex });
                      }}
                      sx={{
                        p: 0.25,
                        opacity: 0.4,
                        "&:hover": { opacity: 1 },
                        flexShrink: 0,
                      }}
                    >
                      <MoreVertIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </ListItemButton>
                );
              })}
            </List>
          )}
        </Box>
      </Box>

      {/* Import Dropdown Menu */}
      <Menu
        anchorEl={importMenuAnchor}
        open={Boolean(importMenuAnchor)}
        onClose={handleImportClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        sx={{ "& .MuiPaper-root": { width: 170 } }}
      >
        <MenuItem onClick={() => handleImportScriptType("fountain")} sx={{ fontSize: "0.85rem" }}>
          Import Screenplay
        </MenuItem>
        <MenuItem onClick={() => handleImportScriptType("markdown")} sx={{ fontSize: "0.85rem" }}>
          Import Prose
        </MenuItem>
      </Menu>

      {/* Item Context Menu */}
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

      {/* Add New Document Menu */}
      <Menu
        anchorEl={addMenuAnchor}
        open={!!addMenuAnchor}
        onClose={handleAddClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { minWidth: 150 } } }}
      >
        <MenuItem onClick={() => handleAddScriptType("fountain")} dense>
          <Typography variant="body2">Screenplay (.fountain)</Typography>
        </MenuItem>
        <MenuItem onClick={() => handleAddScriptType("markdown")} dense>
          <Typography variant="body2">Prose (.md)</Typography>
        </MenuItem>
      </Menu>
    </Box>
  );
});
