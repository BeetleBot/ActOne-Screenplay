import React, { useRef, useState, useMemo } from "react";
import { useAppContext } from "../context/AppContext";
import { useCodeMirror } from "../editor/useCodeMirror";
import { useUI } from "../context/UIContext";
import { useParking } from "../context/ParkingContext";
import { Menu, MenuItem, Divider, ListItemIcon, ListItemText, Typography, Box } from "@mui/material";

import ContentCutIcon from "@mui/icons-material/ContentCut";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import AssignmentIcon from "@mui/icons-material/Assignment";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import ColorLensIcon from "@mui/icons-material/ColorLens";
import TextFieldsIcon from "@mui/icons-material/TextFields";
import SearchIcon from "@mui/icons-material/Search";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import ArchiveIcon from "@mui/icons-material/Archive";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatUnderlinedIcon from "@mui/icons-material/FormatUnderlined";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import DeleteIcon from "@mui/icons-material/Delete";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

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

const HIGHLIGHT_COLORS = [
  { key: "red", label: "Red", color: "#e81123" },
  { key: "orange", label: "Orange", color: "#ff9800" },
  { key: "yellow", label: "Yellow", color: "#daa520" },
  { key: "green", label: "Green", color: "#4caf50" },
  { key: "blue", label: "Blue", color: "#0081ef" },
  { key: "purple", label: "Purple", color: "#b520da" },
  { key: "pink", label: "Pink", color: "#fa6fc1" },
  { key: "none", label: "Clear Highlight", color: "#9e9e9e" }
];

const MARKER_COLORS = [
  { key: "blue", label: "Blue", color: "#0081ef" },
  { key: "brown", label: "Brown", color: "#795548" },
  { key: "cyan", label: "Cyan", color: "#00bcd4" },
  { key: "green", label: "Green", color: "#4caf50" },
  { key: "magenta", label: "Magenta", color: "#e91e63" },
  { key: "orange", label: "Orange", color: "#ff9800" },
  { key: "pink", label: "Pink", color: "#fa6fc1" },
  { key: "purple", label: "Purple", color: "#b520da" },
  { key: "red", label: "Red", color: "#e81123" },
  { key: "yellow", label: "Yellow", color: "#daa520" },
  { key: "none", label: "Default (Orange)", color: "#9e9e9e" }
];

export const FountainEditor: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const app = useAppContext();
  const { fontFamily, parsedDoc, updateSettings, cleanExtraSpace } = app;
  const { hideFountainMarkupEnabled, setShowSearchPanel, setShowReplacePanel } = useUI();
  const parking = useParking();
  
  const viewRef = useCodeMirror(containerRef);

  const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number } | null>(null);
  const [subMenuAnchorEl, setSubMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [formatMenuAnchorEl, setFormatMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [highlightMenuAnchorEl, setHighlightMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [markerMenuAnchorEl, setMarkerMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [transformMenuAnchorEl, setTransformMenuAnchorEl] = useState<null | HTMLElement>(null);

  const view = viewRef.current;
  const selection = view ? view.state.selection.main : null;
  const hasSelection = selection ? selection.from !== selection.to : false;
  const selectedText = (view && selection && hasSelection) ? view.state.sliceDoc(selection.from, selection.to) : "";

  const wordCount = useMemo(() => {
    if (!selectedText) return 0;
    const trimmed = selectedText.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  }, [selectedText]);

  const charCount = selectedText.length;

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
    } catch (e) {}
    return null;
  }, [parsedDoc?.lines, view, selection]);

  const existingTag = useMemo(() => {
    if (!view || !selection) return null;
    const prodTags = parsedDoc.settings?.productionTags;
    if (!prodTags || !prodTags.tags) return null;
    
    const cursor = selection.from;
    const tag = prodTags.tags.find((t: any) => {
      if (!t.range) return false;
      const [start, len] = t.range;
      return cursor >= start && cursor <= start + len;
    });
    
    if (tag) {
      const def = prodTags.definitions?.find((d: any) => d.id === tag.definitionId);
      const catLabel = CATEGORIES.find(c => c.key === tag.type)?.label || tag.type;
      return { tag, def, catLabel };
    }
    return null;
  }, [parsedDoc.settings?.productionTags, view, selection]);

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY,
    });
  };

  const handleClose = () => {
    setContextMenu(null);
    setSubMenuAnchorEl(null);
    setFormatMenuAnchorEl(null);
    setHighlightMenuAnchorEl(null);
    setMarkerMenuAnchorEl(null);
    setTransformMenuAnchorEl(null);
  };

  const handleRemoveTag = () => {
    if (!existingTag) return;
    updateSettings((prev: any) => {
      const prodTags = prev.productionTags || { tags: [], definitions: [] };
      const tags = (prodTags.tags || []).filter((t: any) => t !== existingTag.tag);
      return {
        ...prev,
        productionTags: {
          ...prodTags,
          tags
        }
      };
    });
    handleClose();
  };

  const handleTagClick = (category: string) => {
    if (!view || !selection || !hasSelection) return;
    const from = selection.from;
    const to = selection.to;
    const text = selectedText.trim();
    if (!text) return;

    updateSettings((prev: any) => {
      const prodTags = prev.productionTags || { tags: [], definitions: [] };
      const tags = [...(prodTags.tags || [])];
      const definitions = [...(prodTags.definitions || [])];

      let def = definitions.find((d: any) => d.name.toLowerCase() === text.toLowerCase() && d.type === category);
      if (!def) {
        def = {
          id: "def-" + Math.random().toString(36).substring(2, 9),
          name: text,
          type: category,
          colorOverride: null
        };
        definitions.push(def);
      }

      const existingTagIdx = tags.findIndex((t: any) => t.range && t.range[0] === from && t.range[1] === (to - from));
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

      return {
        ...prev,
        productionTags: {
          tags,
          definitions
        }
      };
    });

    handleClose();
  };

  const toggleInlineMarker = (marker: string) => {
    if (!view || !selection || !hasSelection) return;
    const from = selection.from;
    const to = selection.to;
    
    const isWrapped =
      selectedText.startsWith(marker) && selectedText.endsWith(marker) && selectedText.length > marker.length * 2;

    if (isWrapped) {
      const unwrapped = selectedText.slice(marker.length, -marker.length);
      view.dispatch({
        changes: { from, to, insert: unwrapped },
        selection: { anchor: from, head: from + unwrapped.length },
      });
    } else {
      const wrapped = marker + selectedText + marker;
      view.dispatch({
        changes: { from, to, insert: wrapped },
        selection: { anchor: from, head: from + wrapped.length },
      });
    }
    handleClose();
  };

  const handleParkSelection = () => {
    if (!view || !selection || !hasSelection) return;
    const from = selection.from;
    const to = selection.to;
    const text = view.state.sliceDoc(from, to);
    if (!text.trim()) return;

    parking.addItem(text);
    view.dispatch({
      changes: { from, to, insert: "" },
    });
    handleClose();
    view.focus();
  };

  const handleCleanSpaces = () => {
    cleanExtraSpace();
    handleClose();
  };

  const handleHighlightScene = (colorName: string) => {
    if (!view || !currentSceneLine) return;
    const { index } = currentSceneLine;
    const lineObj = view.state.doc.line(index + 1);
    const originalText = lineObj.text;
    let newText = originalText.replace(/\s*\[\[color\s+\w+\]\]/gi, "");
    if (colorName !== "none") {
      newText = `${newText.trimEnd()} [[color ${colorName}]]`;
    }
    view.dispatch({
      changes: { from: lineObj.from, to: lineObj.to, insert: newText }
    });
    handleClose();
  };

  const handleDropMarkerWithColor = (colorName: string) => {
    if (!view || !selection) return;
    const from = selection.from;
    const to = selection.to;
    const defaultDesc = selectedText || "";
    const desc = prompt(`Enter ${colorName} marker description:`, defaultDesc);
    if (desc !== null) {
      const markerText = colorName === "none" ? `[[marker: ${desc.trim()}]]` : `[[marker ${colorName}: ${desc.trim()}]]`;
      view.dispatch({
        changes: { from, to, insert: markerText },
        selection: { anchor: from + markerText.length }
      });
    }
    handleClose();
  };

  const handleTransformCase = (mode: "upper" | "title" | "lower") => {
    if (!view || !selection || !hasSelection) return;
    const from = selection.from;
    const to = selection.to;
    let newText = selectedText;
    if (mode === "upper") {
      newText = selectedText.toUpperCase();
    } else if (mode === "lower") {
      newText = selectedText.toLowerCase();
    } else if (mode === "title") {
      newText = selectedText.replace(/\b\w+/g, (s) => s.charAt(0).toUpperCase() + s.substring(1).toLowerCase());
    }
    view.dispatch({
      changes: { from, to, insert: newText },
      selection: { anchor: from, head: from + newText.length }
    });
    handleClose();
  };

  const handleCreateTaskFromSelection = () => {
    if (!selectedText.trim()) return;
    const text = selectedText.trim();
    updateSettings((prev: any) => {
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
    setShowSearchPanel(true);
    setShowReplacePanel(false);
    handleClose();
  };

  const handleEditorAction = (cmd: string) => {
    if (!view) return;
    view.focus();
    document.execCommand(cmd);
    handleClose();
  };

  const menuProps = {
    disableScrollLock: true,
    disableAutoFocus: true,
    disableRestoreFocus: true,
    MenuListProps: {
      autoFocusItem: false,
    },
    slotProps: {
      paper: {
        sx: {
          borderRadius: "12px",
          boxShadow: "0px 8px 32px rgba(0, 0, 0, 0.15)",
          border: "1px solid",
          borderColor: "divider",
          minWidth: 220,
          py: 0.5,
        }
      }
    }
  };

  return (
    <div 
      className={`editor-font-wrapper ${fontFamily} ${hideFountainMarkupEnabled ? "hide-fountain-markup" : ""}`} 
      style={{ display: "flex", flex: 1, minHeight: "100%", flexDirection: "column" }}
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
        {hasSelection && (
          <Box sx={{ px: 2, py: 1, borderBottom: "1px solid", borderColor: "divider", mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: "block" }}>
              SELECTION STATS
            </Typography>
            <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
              {wordCount} {wordCount === 1 ? "word" : "words"} • {charCount} {charCount === 1 ? "char" : "chars"}
            </Typography>
          </Box>
        )}

        <MenuItem disabled={!hasSelection} onClick={() => handleEditorAction("cut")}>
          <ListItemIcon>
            <ContentCutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Cut" secondary="Ctrl+X" />
        </MenuItem>
        
        <MenuItem disabled={!hasSelection} onClick={() => handleEditorAction("copy")}>
          <ListItemIcon>
            <ContentCopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Copy" secondary="Ctrl+C" />
        </MenuItem>
        
        <MenuItem onClick={() => handleEditorAction("paste")}>
          <ListItemIcon>
            <AssignmentIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Paste" secondary="Ctrl+V" />
        </MenuItem>

        <Divider />

        <MenuItem
          disabled={!hasSelection}
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
          disabled={!hasSelection}
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
          disabled={!hasSelection}
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
          disabled={!hasSelection}
          onClick={handleLookUpSelection}
        >
          <ListItemIcon>
            <SearchIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Look Up Word" />
        </MenuItem>

        <Divider />

        <MenuItem
          disabled={!hasSelection}
          onClick={handleCreateTaskFromSelection}
        >
          <ListItemIcon>
            <TaskAltIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Create Task" />
        </MenuItem>

        <MenuItem
          disabled={!hasSelection}
          onClick={handleParkSelection}
        >
          <ListItemIcon>
            <ArchiveIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Park Selection" />
        </MenuItem>
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
        <MenuItem disabled={!hasSelection} onClick={() => toggleInlineMarker("**")}>
          <ListItemIcon>
            <FormatBoldIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Bold" secondary="**" />
        </MenuItem>
        <MenuItem disabled={!hasSelection} onClick={() => toggleInlineMarker("*")}>
          <ListItemIcon>
            <FormatItalicIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Italic" secondary="*" />
        </MenuItem>
        <MenuItem disabled={!hasSelection} onClick={() => toggleInlineMarker("_")}>
          <ListItemIcon>
            <FormatUnderlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Underline" secondary="_" />
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleCleanSpaces}>
          <ListItemIcon>
            <AutoAwesomeIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Clean Spaces" />
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
        <MenuItem disabled={!hasSelection} onClick={() => handleTransformCase("upper")}>
          <ListItemText primary="UPPERCASE" />
        </MenuItem>
        <MenuItem disabled={!hasSelection} onClick={() => handleTransformCase("title")}>
          <ListItemText primary="Title Case" />
        </MenuItem>
        <MenuItem disabled={!hasSelection} onClick={() => handleTransformCase("lower")}>
          <ListItemText primary="lowercase" />
        </MenuItem>
      </Menu>
    </div>
  );
};
