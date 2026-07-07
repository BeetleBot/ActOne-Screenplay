import React, { useRef, useState, useMemo } from "react";
import { useFile, useUI, useEditor, useParking, useCustomModal } from "../context";
import { useCodeMirror } from "../editor";
import { Menu, MenuItem, Divider, ListItemIcon, ListItemText, Typography, Box } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { Theme } from "@mui/material/styles";
import { ContentCutIcon, ContentCopyIcon, AssignmentIcon, LocalOfferIcon, BookmarkIcon, ColorLensIcon, TextFieldsIcon, SearchIcon, TaskAltIcon, ArchiveIcon, FormatBoldIcon, FormatItalicIcon, FormatUnderlinedIcon, DeleteIcon, ChevronRightIcon } from "./Icons";
import { logger } from "../utils/logger";
import { readText } from "@tauri-apps/plugin-clipboard-manager";
import { CATEGORIES } from "../constants";
import { getPerScriptSettingObject } from "../utils/perScriptSettings";
import { updateTagsEffect, tagStateField } from "../editor/tagState";

const HIGHLIGHT_COLORS = [
  { key: "red", label: "Red", color: "var(--scene-color-red)" },
  { key: "orange", label: "Orange", color: "var(--scene-color-orange)" },
  { key: "yellow", label: "Yellow", color: "var(--scene-color-yellow)" },
  { key: "green", label: "Green", color: "var(--scene-color-green)" },
  { key: "blue", label: "Blue", color: "var(--scene-color-blue)" },
  { key: "purple", label: "Purple", color: "var(--scene-color-purple)" },
  { key: "pink", label: "Pink", color: "var(--scene-color-pink)" },
  { key: "none", label: "Clear Highlight", color: "var(--cat-other)" }
];

const MARKER_COLORS = [
  { key: "blue", label: "Blue", color: "var(--scene-color-blue)" },
  { key: "brown", label: "Brown", color: "var(--scene-color-brown)" },
  { key: "cyan", label: "Cyan", color: "var(--scene-color-cyan)" },
  { key: "green", label: "Green", color: "var(--scene-color-green)" },
  { key: "magenta", label: "Magenta", color: "var(--scene-color-magenta)" },
  { key: "orange", label: "Orange", color: "var(--scene-color-orange)" },
  { key: "pink", label: "Pink", color: "var(--scene-color-pink)" },
  { key: "purple", label: "Purple", color: "var(--scene-color-purple)" },
  { key: "red", label: "Red", color: "var(--scene-color-red)" },
  { key: "yellow", label: "Yellow", color: "var(--scene-color-yellow)" },
  { key: "none", label: "Default (Orange)", color: "var(--cat-other)" }
];

interface ProdTagItem {
  range?: [number, number];
  definitionId: string;
  type?: string;
  sceneId?: string;
}

interface ProdDef {
  id: string;
  name: string;
  type: string;
  colorOverride: string | null;
}

export const FountainEditor = React.memo(() => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { fontFamily } = useUI();
  const { parsedDoc, scriptFileName } = useFile();
  const { updateSettings } = useEditor();
  const parking = useParking();
  const { prompt: showPrompt } = useCustomModal();
  
  const viewRef = useCodeMirror(containerRef);

  const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number } | null>(null);
  const [quickTagMode, setQuickTagMode] = useState(false);
  const [subMenuAnchorEl, setSubMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [formatMenuAnchorEl, setFormatMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [highlightMenuAnchorEl, setHighlightMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [markerMenuAnchorEl, setMarkerMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [transformMenuAnchorEl, setTransformMenuAnchorEl] = useState<null | HTMLElement>(null);

  // Snapshot of selection captured at mousedown time (button=2 / right-click),
  // BEFORE CodeMirror's own mousedown handler collapses the selection.
  // Always set — includes cursor position even when there is no text selection.
  const menuSelectionRef = useRef<{ from: number; to: number; text: string } | null>(null);

  const view = viewRef.current;
  const selection = view ? view.state.selection.main : null;
  const hasSelection = selection ? selection.from !== selection.to : false;
  const selectedText = (view && selection && hasSelection) ? view.state.sliceDoc(selection.from, selection.to) : "";

  // These are derived from the snapshotted selection so they remain stable while the menu is open.
  const menuHasSelection = menuSelectionRef.current !== null && menuSelectionRef.current.from !== menuSelectionRef.current.to;
  const menuSelectedText = menuSelectionRef.current?.text ?? "";

  const wordCount = useMemo(() => {
    const text = contextMenu ? menuSelectedText : selectedText;
    if (!text) return 0;
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  }, [selectedText, menuSelectedText, contextMenu]);

  const charCount = contextMenu ? menuSelectedText.length : selectedText.length;

  const currentSceneLine = useMemo(() => {
    if (!view || !selection || !parsedDoc?.lines) return null;
    try {
      const lineObj = view.state.doc.lineAt(selection.from);
      const lineIndex = lineObj.number - 1;
      for (let i = lineIndex; i >= 0; i--) {
        const line = parsedDoc.lines[i];
        if (line && line.type === 10) {
          return { index: i, line };
        }
      }
    } catch (e) { logger.warn("editor", "Failed to find current scene line", e); }
    return null;
  }, [parsedDoc?.lines, view, selection]);

  const existingTag = useMemo(() => {
    if (!view) return null;
    // When context menu is open, use the snapshot cursor (captured before CodeMirror collapsed selection).
    // When menu is closed, fall back to the live cursor for any passive checks.
    const cursor = contextMenu
      ? (menuSelectionRef.current?.from ?? selection?.from)
      : selection?.from;
    if (cursor == null) return null;

    const prodTags = getPerScriptSettingObject<{ tags: ProdTagItem[]; definitions: ProdDef[] }>("productionTags", parsedDoc.settings, scriptFileName, { tags: [], definitions: [] });
    if (!prodTags || !prodTags.tags) return null;

    const tag = prodTags.tags.find((t) => {
      if (!t.range) return false;
      const [start, len] = t.range;
      return cursor >= start && cursor <= start + len;
    });

    if (tag) {
      const def = prodTags.definitions?.find((d) => d.id === tag.definitionId);
      if (!def) return null;
      const catLabel = CATEGORIES.find(c => c.key === def.type)?.label || def.type;
      return { tag, def, catLabel };
    }
    return null;
  }, [contextMenu, parsedDoc.settings?.productionTags, view, selection, scriptFileName]);

  // Capture selection on right-click mousedown — this fires BEFORE CodeMirror's mousedown
  // handler, so the selection is still intact at this point.
  const handleMouseDown = (event: React.MouseEvent) => {
    if (event.button !== 2) return; // only care about right-click
    const v = viewRef.current;
    if (!v) { menuSelectionRef.current = null; return; }
    const sel = v.state.selection.main;
    menuSelectionRef.current = {
      from: sel.from,
      to: sel.to,
      text: sel.from !== sel.to ? v.state.sliceDoc(sel.from, sel.to) : "",
    };
  };

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    // menuSelectionRef was already set in handleMouseDown (before CodeMirror collapsed it).
    // Nothing to re-read here — just open the menu.
    setQuickTagMode(event.ctrlKey || event.metaKey);
    setContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY,
    });
  };

  const handleClose = () => {
    setContextMenu(null);
    setQuickTagMode(false);
    setSubMenuAnchorEl(null);
    setFormatMenuAnchorEl(null);
    setHighlightMenuAnchorEl(null);
    setMarkerMenuAnchorEl(null);
    setTransformMenuAnchorEl(null);
    menuSelectionRef.current = null;
    // Restore editor focus after the menu is fully closed.
    setTimeout(() => viewRef.current?.focus(), 0);
  };

  const handleRemoveTag = () => {
    if (!existingTag || !view) return;
    const currentTags = view.state.field(tagStateField, false);
    if (!currentTags) return;
    
    const tags = (currentTags.tags || []).filter((t) => t !== existingTag.tag);
    view.dispatch({
      effects: updateTagsEffect.of({
        ...currentTags,
        tags
      })
    });
    handleClose();
  };

  const handleTagClick = (category: string) => {
    const snap = menuSelectionRef.current;
    if (!view || !snap) return;
    const from = snap.from;
    const to = snap.to;
    const text = snap.text.trim();
    if (!text) return;

    const currentTags = view.state.field(tagStateField, false);
    if (!currentTags) return;
    
    const tags = [...(currentTags.tags || [])];
    const definitions = [...(currentTags.definitions || [])];

    let def = definitions.find((d) => d.name.toLowerCase() === text.toLowerCase() && d.type === category);
    if (!def) {
      def = {
        id: "def-" + Math.random().toString(36).substring(2, 9),
        name: text,
        type: category,
        colorOverride: null
      };
      definitions.push(def);
    }

    const existingTagIdx = tags.findIndex((t) => t.range && t.range[0] === from && t.range[1] === (to - from));
    if (existingTagIdx !== -1) {
      tags[existingTagIdx] = {
        ...tags[existingTagIdx],
        type: category,
        definitionId: def.id
      };
    } else {
      tags.push({
        range: [from, to - from],
        type: category,
        definitionId: def.id,
        sceneId: ""
      });
    }

    view.dispatch({
      effects: updateTagsEffect.of({
        tags,
        definitions
      })
    });

    handleClose();
  };

  const toggleInlineMarker = (marker: string) => {
    const snap = menuSelectionRef.current;
    if (!view || !snap) return;
    const from = snap.from;
    const to = snap.to;
    const snapText = snap.text;

    const isWrapped =
      snapText.startsWith(marker) && snapText.endsWith(marker) && snapText.length > marker.length * 2;

    if (isWrapped) {
      const unwrapped = snapText.slice(marker.length, -marker.length);
      view.dispatch({
        changes: { from, to, insert: unwrapped },
        selection: { anchor: from, head: from + unwrapped.length },
      });
    } else {
      const wrapped = marker + snapText + marker;
      view.dispatch({
        changes: { from, to, insert: wrapped },
        selection: { anchor: from, head: from + wrapped.length },
      });
    }
    handleClose();
  };

  const handleParkSelection = () => {
    const snap = menuSelectionRef.current;
    if (!view || !snap) return;
    const { from, to, text } = snap;
    if (!text.trim()) return;

    parking.addItem(text);
    view.dispatch({
      changes: { from, to, insert: "" },
    });
    handleClose();
    view.focus();
  };

  const handleHighlightScene = (colorName: string) => {
    if (!view || !currentSceneLine) return;
    const { index } = currentSceneLine;
    const lineObj = view.state.doc.line(index + 1);
    const originalText = lineObj.text;
    const supportedColors = ["blue", "brown", "cyan", "green", "magenta", "orange", "pink", "purple", "red", "yellow"];
    let newText = originalText.replace(/\s*\[\[color\s+[#\w]+\]\]/gi, "");
    const colorRegex = new RegExp(`\\s*\\[\\[(${supportedColors.join("|")}|#[0-9a-fA-F]{6})\\]\\]`, "gi");
    newText = newText.replace(colorRegex, "");
    if (colorName !== "none") {
      newText = `${newText.trimEnd()} [[${colorName}]]`;
    }
    view.dispatch({
      changes: { from: lineObj.from, to: lineObj.to, insert: newText }
    });
    handleClose();
  };

  const handleDropMarkerWithColor = async (colorName: string) => {
    const snap = menuSelectionRef.current;
    if (!view) return;
    const from = snap?.from ?? view.state.selection.main.from;
    const to = snap?.to ?? view.state.selection.main.to;
    const defaultDesc = snap?.text ?? "";
    handleClose();
    const desc = await showPrompt({
      title: "Drop Marker",
      message: `Enter ${colorName} marker description:`,
      defaultValue: defaultDesc
    });
    if (desc !== null) {
      const markerText = colorName === "none" ? `[[marker: ${desc.trim()}]]` : `[[marker ${colorName}: ${desc.trim()}]]`;
      view.dispatch({
        changes: { from, to, insert: markerText },
        selection: { anchor: from + markerText.length }
      });
    }
  };

  const handleTransformCase = (mode: "upper" | "title" | "lower") => {
    const snap = menuSelectionRef.current;
    if (!view || !snap) return;
    const { from, to } = snap;
    let newText = snap.text;
    if (mode === "upper") {
      newText = snap.text.toUpperCase();
    } else if (mode === "lower") {
      newText = snap.text.toLowerCase();
    } else if (mode === "title") {
      newText = snap.text.replace(/\b\w+/g, (s) => s.charAt(0).toUpperCase() + s.substring(1).toLowerCase());
    }
    view.dispatch({
      changes: { from, to, insert: newText },
      selection: { anchor: from, head: from + newText.length }
    });
    handleClose();
  };

  const handleCreateTaskFromSelection = () => {
    const text = (menuSelectionRef.current?.text ?? "").trim();
    if (!text) return;
    updateSettings((prev) => {
      const todos = prev.todos || [];
      const newTodo = {
        id: Date.now().toString(),
        text,
        completed: false,
        createdAt: Date.now(),
      };
      return {
        ...prev,
        todos: [...todos, newTodo],
      };
    });
    handleClose();
  };

  const handleLookUpSelection = () => {
    handleClose();
    const text = menuSelectionRef.current?.text ?? "";
    if (!text) return;
    const query = encodeURIComponent(text.trim());
    const url = `https://www.google.com/search?q=${query}`;
    import("@tauri-apps/plugin-opener").then(({ openUrl }) => openUrl(url)).catch(() => window.open(url, "_blank"));
  };

  const handleEditorAction = async (cmd: string) => {
    if (!view) return;
    view.focus();
    if (cmd === "paste") {
      try {
        const text = await readText();
        const sel = view.state.selection.main;
        view.dispatch({
          changes: { from: sel.from, to: sel.to, insert: text },
          selection: { anchor: sel.from + text.length }
        });
      } catch (e) {
        logger.error("editor", "clipboard read failed", e);
      }
    } else {
      document.execCommand(cmd);
    }
    handleClose();
  };

  const menuProps = {
    disableScrollLock: true,
    disableAutoFocus: true,
    disableRestoreFocus: true,
    MenuListProps: {
      autoFocusItem: false,
      dense: true,
    },
    slotProps: {
      backdrop: {
        sx: { backdropFilter: "none", WebkitBackdropFilter: "none" },
        onClick: handleClose
      },
      paper: {
        sx: (theme: Theme) => ({
          borderRadius: "8px",
          boxShadow: `0px 4px 16px ${alpha(theme.palette.common.black, 0.15)}`,
          border: "1px solid",
          borderColor: "divider",
          minWidth: 180,
          py: 0.25,
        })
      }
    }
  };

  return (
    <div 
      className={`editor-font-wrapper ${fontFamily}`} 
      style={{ display: "flex", flex: 1, minHeight: "100%", flexDirection: "column" }}
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenu}
    >
      <div ref={containerRef} style={{ flex: 1, minHeight: "100%", cursor: "text" }} onClick={() => viewRef.current?.focus()} />
      
      <Menu
        open={contextMenu !== null}
        onClose={handleClose}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
        {...menuProps}
      >
        {quickTagMode ? (
          <>
            {menuHasSelection && (
              <Box sx={{ px: 2, py: 1, borderBottom: "1px solid", borderColor: "divider", mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: "block" }}>
                  QUICK TAG
                </Typography>
              </Box>
            )}
            {CATEGORIES.map((cat) => (
              <MenuItem key={cat.key} onClick={() => handleTagClick(cat.key)} disabled={!menuHasSelection}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: cat.color,
                    mr: 1.5,
                    flexShrink: 0
                  }}
                />
                <ListItemText primary={cat.label} />
              </MenuItem>
            ))}
            {existingTag && (
              <MenuItem onClick={handleRemoveTag}>
                <ListItemIcon>
                  <DeleteIcon fontSize="small" color="error" />
                </ListItemIcon>
                <ListItemText primary="Remove Tag" secondary={existingTag.def?.name || "unnamed"} />
              </MenuItem>
            )}
          </>
        ) : (
          <>
        {menuHasSelection && (
          <Box sx={{ px: 2, py: 1, borderBottom: "1px solid", borderColor: "divider", mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: "block" }}>
              SELECTION STATS
            </Typography>
            <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
              {wordCount} {wordCount === 1 ? "word" : "words"} • {charCount} {charCount === 1 ? "char" : "chars"}
            </Typography>
          </Box>
        )}

        <MenuItem disabled={!menuHasSelection} onClick={() => handleEditorAction("cut")}>
          <ListItemIcon>
            <ContentCutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Cut" />
        </MenuItem>
        
        <MenuItem disabled={!menuHasSelection} onClick={() => handleEditorAction("copy")}>
          <ListItemIcon>
            <ContentCopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Copy" />
        </MenuItem>
        
        <MenuItem onClick={() => handleEditorAction("paste")}>
          <ListItemIcon>
            <AssignmentIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Paste" />
        </MenuItem>

        <Divider />

        <MenuItem
          disabled={!menuHasSelection}
          onClick={(e) => {
            setSubMenuAnchorEl(e.currentTarget);
            setFormatMenuAnchorEl(null);
            setHighlightMenuAnchorEl(null);
            setMarkerMenuAnchorEl(null);
            setTransformMenuAnchorEl(null);
          }}
          sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <ListItemIcon>
              <LocalOfferIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Tag" />
          </Box>
          <ChevronRightIcon fontSize="small" sx={{ opacity: 0.5 }} />
        </MenuItem>

        {existingTag && (
          <MenuItem onClick={handleRemoveTag}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText 
              primary="Remove Tag" 
              secondary={existingTag.def?.name || "unnamed"}
            />
          </MenuItem>
        )}

        <MenuItem
          disabled={!currentSceneLine}
          onClick={(e) => {
            setHighlightMenuAnchorEl(e.currentTarget);
            setSubMenuAnchorEl(null);
            setFormatMenuAnchorEl(null);
            setMarkerMenuAnchorEl(null);
            setTransformMenuAnchorEl(null);
          }}
          sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <ListItemIcon>
              <ColorLensIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Highlight Scene" />
          </Box>
          <ChevronRightIcon fontSize="small" sx={{ opacity: 0.5 }} />
        </MenuItem>

        <MenuItem
          onClick={(e) => {
            setMarkerMenuAnchorEl(e.currentTarget);
            setSubMenuAnchorEl(null);
            setFormatMenuAnchorEl(null);
            setHighlightMenuAnchorEl(null);
            setTransformMenuAnchorEl(null);
          }}
          sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <ListItemIcon>
              <BookmarkIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Drop Marker" />
          </Box>
          <ChevronRightIcon fontSize="small" sx={{ opacity: 0.5 }} />
        </MenuItem>

        <Divider />

        <MenuItem
          disabled={!menuHasSelection}
          onClick={(e) => {
            setFormatMenuAnchorEl(e.currentTarget);
            setSubMenuAnchorEl(null);
            setHighlightMenuAnchorEl(null);
            setMarkerMenuAnchorEl(null);
            setTransformMenuAnchorEl(null);
          }}
          sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <ListItemIcon>
              <FormatBoldIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Format" />
          </Box>
          <ChevronRightIcon fontSize="small" sx={{ opacity: 0.5 }} />
        </MenuItem>

        <MenuItem
          disabled={!menuHasSelection}
          onClick={(e) => {
            setTransformMenuAnchorEl(e.currentTarget);
            setSubMenuAnchorEl(null);
            setFormatMenuAnchorEl(null);
            setHighlightMenuAnchorEl(null);
            setMarkerMenuAnchorEl(null);
          }}
          sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <ListItemIcon>
              <TextFieldsIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Transform Case" />
          </Box>
          <ChevronRightIcon fontSize="small" sx={{ opacity: 0.5 }} />
        </MenuItem>

        <MenuItem
          disabled={!menuHasSelection}
          onClick={handleLookUpSelection}
        >
          <ListItemIcon>
            <SearchIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Look Up Word" />
        </MenuItem>

        <Divider />

        <MenuItem
          disabled={!menuHasSelection}
          onClick={handleCreateTaskFromSelection}
        >
          <ListItemIcon>
            <TaskAltIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Create Task" />
        </MenuItem>

        <MenuItem
          disabled={!menuHasSelection}
          onClick={handleParkSelection}
        >
          <ListItemIcon>
            <ArchiveIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Park Selection" />
        </MenuItem>
        </>
        )}
      </Menu>

      <Menu
        open={subMenuAnchorEl !== null}
        anchorEl={subMenuAnchorEl}
        onClose={() => setSubMenuAnchorEl(null)}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        {...menuProps}
      >
        {CATEGORIES.map((cat) => (
          <MenuItem key={cat.key} onClick={() => handleTagClick(cat.key)}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: cat.color,
                mr: 1.5,
                flexShrink: 0
              }}
            />
            <ListItemText primary={cat.label} />
          </MenuItem>
        ))}
      </Menu>

      <Menu
        open={highlightMenuAnchorEl !== null}
        anchorEl={highlightMenuAnchorEl}
        onClose={() => setHighlightMenuAnchorEl(null)}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        {...menuProps}
      >
        {HIGHLIGHT_COLORS.map((col) => (
          <MenuItem key={col.key} onClick={() => handleHighlightScene(col.key)}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: col.color,
                mr: 1.5,
                flexShrink: 0
              }}
            />
            <ListItemText primary={col.label} />
          </MenuItem>
        ))}
      </Menu>

      <Menu
        open={markerMenuAnchorEl !== null}
        anchorEl={markerMenuAnchorEl}
        onClose={() => setMarkerMenuAnchorEl(null)}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        {...menuProps}
      >
        {MARKER_COLORS.map((col) => (
          <MenuItem key={col.key} onClick={() => handleDropMarkerWithColor(col.key)}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: col.color,
                mr: 1.5,
                flexShrink: 0
              }}
            />
            <ListItemText primary={col.label} />
          </MenuItem>
        ))}
      </Menu>

      <Menu
        open={formatMenuAnchorEl !== null}
        anchorEl={formatMenuAnchorEl}
        onClose={() => setFormatMenuAnchorEl(null)}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        {...menuProps}
      >
        <MenuItem disabled={!menuHasSelection} onClick={() => toggleInlineMarker("**")}>
          <ListItemIcon>
            <FormatBoldIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Bold" />
        </MenuItem>
        <MenuItem disabled={!menuHasSelection} onClick={() => toggleInlineMarker("*")}>
          <ListItemIcon>
            <FormatItalicIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Italic" />
        </MenuItem>
        <MenuItem disabled={!menuHasSelection} onClick={() => toggleInlineMarker("_")}>
          <ListItemIcon>
            <FormatUnderlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Underline" />
        </MenuItem>
      </Menu>

      <Menu
        open={transformMenuAnchorEl !== null}
        anchorEl={transformMenuAnchorEl}
        onClose={() => setTransformMenuAnchorEl(null)}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        {...menuProps}
      >
        <MenuItem disabled={!menuHasSelection} onClick={() => handleTransformCase("upper")}>
          <ListItemText primary="UPPERCASE" />
        </MenuItem>
        <MenuItem disabled={!menuHasSelection} onClick={() => handleTransformCase("title")}>
          <ListItemText primary="Title Case" />
        </MenuItem>
        <MenuItem disabled={!menuHasSelection} onClick={() => handleTransformCase("lower")}>
          <ListItemText primary="lowercase" />
        </MenuItem>
      </Menu>
    </div>
  );
});
