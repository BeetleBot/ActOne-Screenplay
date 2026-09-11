import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useFile, useUI } from "../context";
import { alpha } from "@mui/material/styles";
import {
  AddIcon,
  DownloadIcon,
  DragHandleIcon,
  InfoOutlinedIcon,
  SearchIcon,
  CloseIcon,
  MoreVertIcon,
  AutoAwesomeIcon,
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
  Button,
  CircularProgress,
  LinearProgress,
} from "@mui/material";

import { OutlineTag } from "./OutlineView";
import { isProseScript } from "../utils/scriptMode";

export const ScriptsView = React.memo(() => {
  const {
    scripts,
    activeScriptIndex,
    activeFileId,
    isBundle,
    setActiveScript,
    addScript,
    importScript,
    importScriptFromPath,
    renameScript,
    duplicateScript,
    deleteScript,
    moveScript,
    importingScriptName,
  } = useFile();

  const {
    translationJob,
    setIsTranslationModalOpen,
    setTranslationSetupTarget,
  } = useUI();

  const [searchQuery, setSearchQuery] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [menuState, setMenuState] = useState<{ anchorEl: HTMLElement; index: number } | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [addMenuAnchor, setAddMenuAnchor] = useState<HTMLElement | null>(null);
  const [importMenuAnchor, setImportMenuAnchor] = useState<HTMLElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const listRef = useRef<HTMLUListElement>(null);
  const mouseDragRef = useRef<number | null>(null);
  const mouseOverRef = useRef<number | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const dragCounterRef = useRef(0);

  useEffect(() => {
    const handleCustomDrag = (e: Event) => {
      const customEvent = e as CustomEvent<{ target: string | null }>;
      if (customEvent.detail?.target === "scripts") {
        setIsDragOver(true);
      } else {
        setIsDragOver(false);
      }
    };
    window.addEventListener("actone-drag-pane", handleCustomDrag);
    return () => window.removeEventListener("actone-drag-pane", handleCustomDrag);
  }, []);

  const handlePanelDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current += 1;
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "copy";
    }
    setIsDragOver(true);
  };

  const handlePanelDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "copy";
    }
    if (!isDragOver) {
      setIsDragOver(true);
    }
  };

  const handlePanelDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragOver(false);
    }
  };

  const handlePanelDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragOver(false);

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];
        const path = (file as unknown as { path?: string }).path;
        if (path) {
          importScriptFromPath(path);
        }
      }
    }
  };

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

  const handleImportScriptType = async (type: "fountain" | "markdown" | "fdx" | "fadein" | "pdf") => {
    handleImportClose();
    await importScript(type);
  };

  const handleRenameOpen = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!menuState) return;
    const targetIdx = menuState.index;
    const currentName = scripts[targetIdx]?.name || "";
    setMenuState(null);
    setTimeout(() => {
      setEditingIndex(targetIdx);
      setEditingValue(currentName);
    }, 50);
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
      borderRadius: "6px",
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


  const handleTranslateWholeScript = async (targetIndex: number) => {
    if (!activeFileId) return;
    setTranslationSetupTarget({ fileId: activeFileId, scriptIndex: targetIndex });
    setIsTranslationModalOpen(true);
  };

  return (
    <Box
      id="scripts-view-panel"
      data-testid="scripts-view"
      onDragEnter={handlePanelDragEnter}
      onDragOver={handlePanelDragOver}
      onDragLeave={handlePanelDragLeave}
      onDrop={handlePanelDrop}
      sx={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}
    >
      {isDragOver && (
        <Box
          sx={{
            position: "absolute",
            inset: 6,
            zIndex: 1000,
            borderRadius: "12px",
            border: "2px dashed",
            borderColor: "primary.main",
            bgcolor: (t) => alpha(t.palette.background.paper, 0.94),
            backdropFilter: "blur(4px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            p: 2,
            textAlign: "center",
            pointerEvents: "none",
            boxShadow: (t) => `0 8px 32px ${alpha(t.palette.primary.main, 0.25)}`,
          }}
        >
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
              color: "primary.main",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mb: 1.5,
              border: "1.5px solid",
              borderColor: "primary.main",
            }}
          >
            <DownloadIcon sx={{ fontSize: 26 }} />
          </Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "0.85rem", color: "text.primary", mb: 0.5 }}>
            Drop files to add to project
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.72rem", maxWidth: 210, lineHeight: 1.4 }}>
            Import .fountain, .pdf, .fdx, .fadein, or .md as a new script
          </Typography>
        </Box>
      )}

      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, height: 40, minHeight: 40, borderBottom: "1px solid", borderColor: "divider" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, opacity: 0.8, fontSize: "0.7rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Project
          </Typography>
          {importingScriptName && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.6,
                bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
                color: "primary.main",
                px: 0.8,
                py: 0.2,
                borderRadius: "10px",
                fontSize: "0.62rem",
                fontWeight: 600,
                animation: "pulse 1.4s infinite ease-in-out",
                "@keyframes pulse": {
                  "0%": { opacity: 0.6 },
                  "50%": { opacity: 1 },
                  "100%": { opacity: 0.6 },
                },
              }}
            >
              <CircularProgress size={8} thickness={6} color="inherit" />
              Importing...
            </Box>
          )}
        </Box>
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
                    borderRadius: "20px",
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
              width: 6,
            },
            "&::-webkit-scrollbar-track": {
              bgcolor: "transparent",
            },
            "&::-webkit-scrollbar-thumb": {
              bgcolor: "var(--button-color, rgba(120, 120, 120, 0.25))",
              borderRadius: "9999px",
              border: "none",
              "&:hover": {
                bgcolor: "primary.main",
              },
            },
          }}
        >
          {scripts.length === 0 && !importingScriptName ? (
            <Box
              onClick={handleImportClick}
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                p: 3,
                m: 2,
                borderRadius: "12px",
                border: "2px dashed",
                borderColor: "divider",
                bgcolor: (t) => alpha(t.palette.text.primary, 0.02),
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.2s ease",
                "&:hover": {
                  borderColor: "primary.main",
                  bgcolor: (t) => alpha(t.palette.primary.main, 0.05),
                },
              }}
            >
              <Box sx={{ color: "primary.main", mb: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <DownloadIcon sx={{ fontSize: 30, opacity: 0.8 }} />
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, fontSize: "0.8rem", color: "text.primary" }}>
                No files yet
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.72rem", maxWidth: 190, lineHeight: 1.4, mb: 0.5 }}>
                Click + above to add a screenplay or prose document.
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem", opacity: 0.8, mb: 1.5 }}>
                Or drag & drop files here (.fountain, .pdf, .fdx, .fadein, .md)
              </Typography>
              <Button
                size="small"
                variant="outlined"
                sx={{
                  borderRadius: "20px",
                  fontSize: "0.7rem",
                  textTransform: "none",
                  py: 0.25,
                  px: 1.5,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleImportClick(e);
                }}
              >
                Browse Files
              </Button>
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
                const isMarkdown = isProseScript(script);

                const isTranslating =
                  Boolean(translationJob) &&
                  (translationJob?.state === "running" || translationJob?.state === "paused" || translationJob?.state === "waiting" || translationJob?.state === "preflight") &&
                  translationJob?.fileId === activeFileId &&
                  translationJob?.scriptIndex === originalIndex;

                return (
                  <Box key={script.fileName} sx={{ mb: 0.6 }}>
                    <ListItemButton
                      dense
                      selected={isActive}
                      disabled={isTranslating}
                      disableRipple={dragIndex !== null || isTranslating}
                      onClick={() => {
                        if (dragIndex === null && !isTranslating) setActiveScript(originalIndex);
                      }}
                      onDoubleClick={() => {
                        if (!isTranslating) {
                          setEditingIndex(originalIndex);
                          setEditingValue(script.name);
                        }
                      }}
                      onContextMenu={(e) => {
                        if (isTranslating) return;
                        e.preventDefault();
                        e.stopPropagation();
                        setMenuState({ anchorEl: e.currentTarget, index: originalIndex });
                      }}
                      data-script-index={originalIndex}
                      sx={{
                        borderRadius: "8px",
                        px: 1.25,
                        py: 0.85,
                        minHeight: 40,
                        opacity: isDragging ? 0.4 : 1,
                        cursor: isTranslating ? "default" : "pointer",
                        border: "1px solid",
                        borderColor: isOver
                          ? "var(--button-color, primary.main)"
                          : isActive
                          ? "var(--button-color, primary.main)"
                          : isTranslating
                          ? "color-mix(in srgb, var(--button-color, #2EAADC) 40%, transparent)"
                          : "color-mix(in srgb, var(--text-main) 8%, transparent)",
                        bgcolor: isActive
                          ? "action.selected"
                          : isTranslating
                          ? "color-mix(in srgb, var(--button-color, #2EAADC) 6%, background.paper)"
                          : "background.paper",
                        boxShadow: isActive ? "0 1px 4px rgba(0,0,0,0.08)" : "0 1px 2px rgba(0,0,0,0.02)",
                        transition: "all var(--duration-fast) ease",
                        "&:hover": {
                          bgcolor: isTranslating ? undefined : "action.hover",
                          borderColor: isTranslating ? undefined : "color-mix(in srgb, var(--button-color) 40%, transparent)",
                          boxShadow: isTranslating ? undefined : "0 2px 6px rgba(0,0,0,0.06)",
                        },
                      }}
                    >
                      {/* 1. Drag Handle on Left */}
                      {!isTranslating && (
                        <Box
                          onMouseDown={(e) => handleHandleMouseDown(e, originalIndex)}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            cursor: "grab",
                            color: "text.disabled",
                            mr: 1,
                            flexShrink: 0,
                            "&:hover": { color: "text.secondary" },
                            "&:active": { cursor: "grabbing" },
                          }}
                          title="Drag to reorder"
                        >
                          <DragHandleIcon sx={{ fontSize: 14 }} />
                        </Box>
                      )}

                      {/* 2. File Name or Edit Input */}
                      {editingIndex === originalIndex ? (
                        <TextField
                          autoFocus
                          size="small"
                          value={editingValue}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={() => handleRenameSave(originalIndex)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              e.stopPropagation();
                              handleRenameSave(originalIndex);
                            } else if (e.key === "Escape") {
                              e.preventDefault();
                              e.stopPropagation();
                              setEditingIndex(null);
                              setEditingValue("");
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onDoubleClick={(e) => e.stopPropagation()}
                          onContextMenu={(e) => e.stopPropagation()}
                          slotProps={{
                            input: {
                              sx: { fontSize: "0.85rem", py: 0.3, height: 26 },
                            },
                          }}
                          sx={{ flex: 1, mr: 0.5 }}
                        />
                      ) : (
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: isActive || isTranslating ? 700 : 500,
                            color: isTranslating ? "var(--button-color, primary.main)" : "text.primary",
                            fontSize: "0.84rem",
                            fontFamily: "var(--font-ui)",
                            letterSpacing: "0.01em",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            flex: 1,
                            minWidth: 0,
                            ...(isTranslating && {
                              color: "var(--button-color, primary.main)",
                              animation: "pulseText 1.8s ease-in-out infinite",
                              "@keyframes pulseText": {
                                "0%, 100%": { opacity: 1 },
                                "50%": { opacity: 0.4 },
                              },
                            }),
                          }}
                        >
                          {script.name}
                        </Typography>
                      )}

                      {/* 3. Document Type Badge on Right */}
                      <OutlineTag
                        label={isMarkdown ? "PROSE" : "SCRIPT"}
                        variant={isMarkdown ? "accent" : "default"}
                        size="0.72rem"
                        sx={{ ml: 1, mr: isTranslating ? 0 : 0.5, py: 0.2, px: 0.8, borderRadius: "5px" }}
                      />

                      {/* 4. More Options Context Menu Button */}
                      {!isTranslating && (
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuState({ anchorEl: e.currentTarget, index: originalIndex });
                          }}
                          sx={{
                            p: 0.3,
                            opacity: 0.5,
                            "&:hover": { opacity: 1 },
                            flexShrink: 0,
                          }}
                        >
                          <MoreVertIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      )}
                    </ListItemButton>

                    {/* 5. Show Progress Button Under Translating Script */}
                    {isTranslating && (
                      <Box sx={{ px: 1, pt: 0.5, pb: 0.2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <Typography variant="caption" sx={{ fontSize: "0.68rem", color: "text.secondary", fontWeight: 500 }}>
                          Translating ({translationJob ? `${Math.round(((translationJob.completedScenes || 0) / (translationJob.totalScenes || 1)) * 100)}%` : "..."})
                        </Typography>
                        <Button
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsTranslationModalOpen(true);
                          }}
                          startIcon={<AutoAwesomeIcon sx={{ fontSize: 12 }} />}
                          sx={{
                            textTransform: "none",
                            fontSize: "0.7rem",
                            py: 0.2,
                            px: 1,
                            minHeight: 22,
                            borderRadius: "5px",
                            bgcolor: "color-mix(in srgb, var(--button-color, #2EAADC) 12%, transparent)",
                            color: "var(--button-color, primary.main)",
                            "&:hover": {
                              bgcolor: "color-mix(in srgb, var(--button-color, #2EAADC) 22%, transparent)",
                            },
                          }}
                        >
                          Show Progress
                        </Button>
                      </Box>
                    )}
                  </Box>
                );
              })}
              {importingScriptName && (
                <Box
                  data-testid="importing-card"
                  sx={{
                    mb: 1,
                    p: 1.2,
                    borderRadius: "8px",
                    border: "1.5px solid",
                    borderColor: "primary.main",
                    bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
                    boxShadow: (t) => `0 2px 14px ${alpha(t.palette.primary.main, 0.18)}`,
                    position: "relative",
                    overflow: "hidden",
                    animation: "fadeInSlide 0.25s ease-out",
                    "@keyframes fadeInSlide": {
                      from: { opacity: 0, transform: "translateY(-6px)" },
                      to: { opacity: 1, transform: "translateY(0)" },
                    },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.8 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                      <CircularProgress size={14} thickness={5} sx={{ color: "primary.main", flexShrink: 0 }} />
                      <Typography
                        noWrap
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.8rem",
                          color: "text.primary",
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {importingScriptName}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        px: 0.8,
                        py: 0.2,
                        borderRadius: "5px",
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                        fontSize: "0.62rem",
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        animation: "pulseTag 1.2s infinite ease-in-out",
                        "@keyframes pulseTag": {
                          "0%": { opacity: 0.7 },
                          "50%": { opacity: 1 },
                          "100%": { opacity: 0.7 },
                        },
                      }}
                    >
                      IMPORTING
                    </Box>
                  </Box>

                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      fontSize: "0.68rem",
                      display: "block",
                      mb: 0.8,
                      fontStyle: "italic",
                    }}
                  >
                    Importing & formatting screenplay...
                  </Typography>

                  <LinearProgress
                    sx={{
                      height: 3,
                      borderRadius: "2px",
                      bgcolor: (t) => alpha(t.palette.primary.main, 0.15),
                      "& .MuiLinearProgress-bar": {
                        borderRadius: "2px",
                      },
                    }}
                  />
                </Box>
              )}
              <Box
                onClick={handleImportClick}
                sx={{
                  mt: 1,
                  mb: 1.5,
                  mx: 0.5,
                  p: 1.2,
                  borderRadius: "8px",
                  border: "1.5px dashed",
                  borderColor: "divider",
                  bgcolor: (t) => alpha(t.palette.text.primary, 0.02),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  "&:hover": {
                    borderColor: "primary.main",
                    bgcolor: (t) => alpha(t.palette.primary.main, 0.05),
                  },
                }}
              >
                <DownloadIcon sx={{ fontSize: 15, color: "text.secondary", opacity: 0.7 }} />
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, fontSize: "0.72rem" }}>
                  Drop files here to add to project
                </Typography>
              </Box>
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
        sx={{ "& .MuiPaper-root": { width: 220 } }}
      >
        <MenuItem onClick={() => handleImportScriptType("fountain")} sx={{ fontSize: "0.85rem" }}>
          Fountain (.fountain, .txt)
        </MenuItem>
        <MenuItem onClick={() => handleImportScriptType("pdf")} sx={{ fontSize: "0.85rem" }}>
          PDF Screenplay (.pdf)
        </MenuItem>
        <MenuItem onClick={() => handleImportScriptType("fdx")} sx={{ fontSize: "0.85rem" }}>
          Final Draft (.fdx)
        </MenuItem>
        <MenuItem onClick={() => handleImportScriptType("fadein")} sx={{ fontSize: "0.85rem" }}>
          Fade In (.fadein)
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handleImportScriptType("markdown")} sx={{ fontSize: "0.85rem" }}>
          Prose (.md)
        </MenuItem>
      </Menu>

      {/* Item Context Menu */}
      <Menu
        anchorEl={menuState?.anchorEl}
        open={!!menuState}
        onClose={() => {
          setMenuState(null);
        }}
        disableRestoreFocus
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { minWidth: 150 } } }}
      >
        <MenuItem onClick={handleRenameOpen} dense>Rename</MenuItem>
        <Divider />
        <MenuItem onClick={handleMoveUp} dense disabled={!menuState || menuState.index <= 0}>Move Up</MenuItem>
        <MenuItem onClick={handleMoveDown} dense disabled={!menuState || menuState.index >= scripts.length - 1}>Move Down</MenuItem>
        <MenuItem onClick={handleDuplicate} dense>Duplicate</MenuItem>
        {menuState && !isProseScript(scripts[menuState.index]) && (
          <>
            <Divider />
            <MenuItem
              dense
              onClick={() => {
                if (menuState) {
                  handleTranslateWholeScript(menuState.index);
                }
                setMenuState(null);
              }}
            >
              Translate Whole Document
            </MenuItem>
          </>
        )}
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
