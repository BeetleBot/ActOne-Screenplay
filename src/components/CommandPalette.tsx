import React, { useState, useEffect, useRef } from "react";
import { useFile, useEditor, useUI } from "../context";

import { NoteAddIcon, FolderOpenIcon, SaveIcon, FileDownloadIcon, DeleteIcon, AutoAwesomeIcon, ViewSidebarIcon, SettingsIcon, ContentCutIcon, ContentCopyIcon, AssignmentIcon, SearchIcon, FindReplaceIcon, FullscreenIcon, ZoomInIcon, ZoomOutIcon, RestartAltIcon, HelpOutlinedIcon, MenuBookIcon, BugReportIcon, LocalOfferIcon, ColorLensIcon } from "./Icons";



import {
  Dialog,
  DialogContent,
  TextField,
  List,
  ListSubheader,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Chip,
  Box,
  Typography,
  Divider,
} from "@mui/material";

interface CommandItem {
  id: string;
  name: string;
  category: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onExportPDF: () => void;
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
  onOpenStructureModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenTitlePageModal: () => void;
  onOpenHelpModal: () => void;
  onOpenBreakdownModal: () => void;
  onOpenThemeManagerModal: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onExportPDF,
  toggleSidebar,
  isSidebarOpen,
  onOpenStructureModal,
  onOpenSettingsModal,
  onOpenTitlePageModal,
  onOpenHelpModal,
  onOpenBreakdownModal,
  onOpenThemeManagerModal,
}) => {
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollPosRef = useRef(0);
  const {
    newFile,
    openFile,
    saveFile,
    saveFileAs,
    closeFile,
    activeFileId,
  } = useFile();

  const {
    autoAddSceneNumbers,
    clearSceneNumbers,
    cleanExtraSpace,
    editorView,
  } = useEditor();

  const {
    typewriterMode,
    setTypewriterMode,
    setActiveTab,
    setFontFamily,
    setPaperSize,
    setShowSearchPanel,
    setShowReplacePanel,
    isZenMode,
    setIsZenMode,
    zoomLevel,
    setZoomLevel,
    appScale,
    hideSyntaxEnabled,
    setHideSyntaxEnabled,
    mainView,
    setMainView,
  } = useUI();

  const openUrl = (url: string) => {
    try {
      import("@tauri-apps/plugin-opener").then(({ openUrl }) => openUrl(url));
    } catch (e) {
      console.warn("Failed to open URL via Tauri opener, falling back to window.open", e);
      window.open(url, "_blank");
    }
  };

  const prevOpen = useRef(isOpen);
  const scrollAreaRef = useRef<HTMLElement | null>(null);

  if (isOpen && !prevOpen.current) {
    scrollAreaRef.current = document.querySelector('.editor-scroll-area');
    const el = scrollAreaRef.current;
    if (el) {
      scrollPosRef.current = el.scrollTop;
      el.style.overflow = 'hidden';
    }
  }

  if (!isOpen && prevOpen.current) {
    const el = scrollAreaRef.current || document.querySelector('.editor-scroll-area');
    if (el) {
      el.style.overflow = 'hidden';
    }
  }

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setSelectedIndex(0);
      const el = scrollAreaRef.current || document.querySelector('.editor-scroll-area');
      if (el) {
        el.style.overflow = '';
        el.scrollTop = scrollPosRef.current;
      }
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (prevOpen.current && !isOpen) {
      const el = scrollAreaRef.current || document.querySelector('.editor-scroll-area');
      if (el) {
        el.style.overflow = 'hidden';
      }
      editorView?.dom.focus({ preventScroll: true });
      if (el) {
        el.style.overflow = '';
        el.scrollTop = scrollPosRef.current;
      }
    }
    prevOpen.current = isOpen;
  }, [isOpen, editorView]);

  const handleEditorAction = (cmd: string) => {
    if (!editorView) return;
    editorView.dom.focus({ preventScroll: true });
    document.execCommand(cmd);
    onClose();
  };

  const handleUndo = () => {
    if (!editorView) return;
    try {
      const undoBtn = document.querySelector(".cm-content") as HTMLElement;
      if (undoBtn) {
        undoBtn.dispatchEvent(new KeyboardEvent("keydown", { key: "z", code: "KeyZ", ctrlKey: true, bubbles: true }));
      }
    } catch (e) { console.warn("Undo failed", e); }
    onClose();
  };

  const handleRedo = () => {
    if (!editorView) return;
    try {
      const redoBtn = document.querySelector(".cm-content") as HTMLElement;
      if (redoBtn) {
        redoBtn.dispatchEvent(new KeyboardEvent("keydown", { key: "y", code: "KeyY", ctrlKey: true, bubbles: true }));
      }
    } catch (e) { console.warn("Redo failed", e); }
    onClose();
  };

  const commands: CommandItem[] = [
    // File
    { id: "file-new", name: "New Screenplay", category: "File", icon: <NoteAddIcon sx={{ fontSize: 16 }} />, shortcut: "Ctrl+N", action: () => { newFile(); onClose(); } },
    { id: "file-open", name: "Open Screenplay...", category: "File", icon: <FolderOpenIcon sx={{ fontSize: 16 }} />, shortcut: "Ctrl+O", action: () => { openFile(); onClose(); } },
    { id: "file-save", name: "Save Screenplay", category: "File", icon: <SaveIcon sx={{ fontSize: 16 }} />, shortcut: "Ctrl+S", action: () => { saveFile(); onClose(); } },
    { id: "file-save-as", name: "Save Screenplay As...", category: "File", icon: <FileDownloadIcon sx={{ fontSize: 16 }} />, shortcut: "Ctrl+Shift+S", action: () => { saveFileAs(); onClose(); } },
    { id: "file-close", name: "Close Active File", category: "File", icon: <DeleteIcon sx={{ fontSize: 16 }} />, shortcut: "Alt+Q", action: () => { closeFile(activeFileId); onClose(); } },
    { id: "file-export", name: "Export...", category: "File", icon: <FileDownloadIcon sx={{ fontSize: 16 }} />, shortcut: "Ctrl+P", action: () => { onExportPDF(); onClose(); } },

    // Edit
    { id: "edit-undo", name: "Undo", category: "Edit", icon: <ContentCutIcon sx={{ fontSize: 16 }} />, shortcut: "Ctrl+Z", action: handleUndo },
    { id: "edit-redo", name: "Redo", category: "Edit", icon: <ContentCutIcon sx={{ fontSize: 16 }} />, shortcut: "Ctrl+Y", action: handleRedo },
    { id: "edit-cut", name: "Cut Selected", category: "Edit", icon: <ContentCutIcon sx={{ fontSize: 16 }} />, shortcut: "Ctrl+X", action: () => handleEditorAction("cut") },
    { id: "edit-copy", name: "Copy Selected", category: "Edit", icon: <ContentCopyIcon sx={{ fontSize: 16 }} />, shortcut: "Ctrl+C", action: () => handleEditorAction("copy") },
    { id: "edit-paste", name: "Paste", category: "Edit", icon: <AssignmentIcon sx={{ fontSize: 16 }} />, shortcut: "Ctrl+V", action: () => handleEditorAction("paste") },
    { id: "edit-search", name: "Find / Search Screenplay...", category: "Edit", icon: <SearchIcon sx={{ fontSize: 16 }} />, shortcut: "Ctrl+F", action: () => { setShowSearchPanel(true); setShowReplacePanel(false); onClose(); } },
    { id: "edit-replace", name: "Replace Text...", category: "Edit", icon: <FindReplaceIcon sx={{ fontSize: 16 }} />, action: () => { setShowSearchPanel(true); setShowReplacePanel(true); onClose(); } },

    // View
    { id: "view-sidebar", name: isSidebarOpen ? "Hide Sidebar Outline" : "Show Sidebar Outline", category: "View", icon: <ViewSidebarIcon sx={{ fontSize: 16 }} />, shortcut: "Ctrl+\\", action: () => { toggleSidebar(); onClose(); } },
    { id: "view-tab-outline", name: "Switch Sidebar Tab: Outline", category: "View", icon: <ViewSidebarIcon sx={{ fontSize: 16 }} />, action: () => { setActiveTab("outline"); if (!isSidebarOpen) toggleSidebar(); onClose(); } },
    { id: "view-tab-notepad", name: "Switch Sidebar Tab: Notepad", category: "View", icon: <ViewSidebarIcon sx={{ fontSize: 16 }} />, action: () => { setActiveTab("notepad"); if (!isSidebarOpen) toggleSidebar(); onClose(); } },
    { id: "view-tab-characters", name: "Switch Sidebar Tab: Characters", category: "View", icon: <ViewSidebarIcon sx={{ fontSize: 16 }} />, action: () => { setActiveTab("characters"); if (!isSidebarOpen) toggleSidebar(); onClose(); } },
    { id: "view-tab-stats", name: "Switch Sidebar Tab: Statistics", category: "View", icon: <ViewSidebarIcon sx={{ fontSize: 16 }} />, action: () => { setActiveTab("stats"); if (!isSidebarOpen) toggleSidebar(); onClose(); } },
    { id: "view-typewriter", name: typewriterMode ? "Disable Typewriter Mode" : "Enable Typewriter Mode", category: "View", icon: <SettingsIcon sx={{ fontSize: 16 }} />, action: () => { setTypewriterMode(!typewriterMode); onClose(); } },
    { id: "view-zen-mode", name: isZenMode ? "Disable Zen Mode" : "Enable Zen Mode", category: "View", icon: <FullscreenIcon sx={{ fontSize: 16 }} />, shortcut: "Ctrl+Alt+Enter", action: () => { setIsZenMode(!isZenMode); onClose(); } },
    { id: "view-zoom-in", name: "Zoom In", category: "View", icon: <ZoomInIcon sx={{ fontSize: 16 }} />, shortcut: "Ctrl+=", action: () => { setZoomLevel(zoomLevel + 10); onClose(); } },
    { id: "view-zoom-out", name: "Zoom Out", category: "View", icon: <ZoomOutIcon sx={{ fontSize: 16 }} />, shortcut: "Ctrl+-", action: () => { setZoomLevel(zoomLevel - 10); onClose(); } },
    { id: "view-zoom-reset", name: `Reset Zoom (${zoomLevel}%)`, category: "View", icon: <RestartAltIcon sx={{ fontSize: 16 }} />, shortcut: "Ctrl+0", action: () => { setZoomLevel(100); onClose(); } },
    { id: "view-hide-syntax", name: hideSyntaxEnabled ? "Show Fountain Markup" : "Hide Fountain Markup", category: "View", icon: <SettingsIcon sx={{ fontSize: 16 }} />, action: () => { setHideSyntaxEnabled(!hideSyntaxEnabled); onClose(); } },
    { id: "view-mode-toggle", name: mainView === 'board' ? "Switch to Editor Mode" : "Switch to Planning Mode", category: "View", icon: <SettingsIcon sx={{ fontSize: 16 }} />, shortcut: "Ctrl+Shift+P", action: () => { setMainView(mainView === 'board' ? 'editor' : 'board'); onClose(); } },

    // Format
    { id: "format-breakdown", name: "Show Production Breakdown...", category: "Format", icon: <LocalOfferIcon sx={{ fontSize: 16 }} />, action: () => { onOpenBreakdownModal(); onClose(); } },
    { id: "format-title-page", name: "Edit Title Page...", category: "Format", icon: <SettingsIcon sx={{ fontSize: 16 }} />, action: () => { onOpenTitlePageModal(); onClose(); } },
    { id: "format-import-structure", name: "Import Structure Template...", category: "Format", icon: <AutoAwesomeIcon sx={{ fontSize: 16 }} />, action: () => { onOpenStructureModal(); onClose(); } },
    { id: "format-renumber", name: "Renumber Scene Headings", category: "Format", icon: <AutoAwesomeIcon sx={{ fontSize: 16 }} />, action: () => { if (window.confirm("Renumber all scenes?")) autoAddSceneNumbers(); onClose(); } },
    { id: "format-clear", name: "Clear Scene Numbers", category: "Format", icon: <DeleteIcon sx={{ fontSize: 16 }} />, action: () => { if (window.confirm("Clear all scene numbers?")) clearSceneNumbers(); onClose(); } },
    { id: "format-clean-space", name: "Clean Screenplay Spaces", category: "Format", icon: <AutoAwesomeIcon sx={{ fontSize: 16 }} />, action: () => { cleanExtraSpace(); onClose(); } },

    // Settings

    { id: "settings-modal", name: "Open Settings...", category: "Settings", icon: <SettingsIcon sx={{ fontSize: 16 }} />, shortcut: "Ctrl+,", action: () => { onOpenSettingsModal(); onClose(); } },
    { id: "settings-font-prime", name: "Set Font: Courier Prime", category: "Settings", icon: <SettingsIcon sx={{ fontSize: 16 }} />, action: () => { setFontFamily("courier-prime"); onClose(); } },
    { id: "settings-font-sans", name: "Set Font: Courier Prime Sans", category: "Settings", icon: <SettingsIcon sx={{ fontSize: 16 }} />, action: () => { setFontFamily("courier-prime-sans"); onClose(); } },
    { id: "settings-paper-letter", name: "Set Paper Size: US Letter", category: "Settings", icon: <SettingsIcon sx={{ fontSize: 16 }} />, action: () => { setPaperSize("letter"); onClose(); } },
    { id: "settings-paper-a4", name: "Set Paper Size: A4", category: "Settings", icon: <SettingsIcon sx={{ fontSize: 16 }} />, action: () => { setPaperSize("a4"); onClose(); } },
    { id: "settings-theme-manager", name: "Open Theme Manager...", category: "Settings", icon: <ColorLensIcon sx={{ fontSize: 16 }} />, action: () => { onOpenThemeManagerModal(); onClose(); } },



    // Help
    { id: "help-guide", name: "Help Guide", category: "Help", icon: <HelpOutlinedIcon sx={{ fontSize: 16 }} />, action: () => { onOpenHelpModal(); onClose(); } },
    { id: "help-fountain", name: "Fountain Syntax Guide", category: "Help", icon: <MenuBookIcon sx={{ fontSize: 16 }} />, action: () => { openUrl("https://fountain.io"); onClose(); } },
    { id: "help-bug", name: "Report a Bug", category: "Help", icon: <BugReportIcon sx={{ fontSize: 16 }} />, action: () => { openUrl("https://github.com/BeetleBot/ActOne/issues"); onClose(); } },
  ];

  const filteredCommands = commands.filter((cmd) =>
    cmd.name.toLowerCase().includes(search.toLowerCase()) ||
    cmd.category.toLowerCase().includes(search.toLowerCase())
  );

  const groupedCommands: { [category: string]: CommandItem[] } = {};
  filteredCommands.forEach((cmd) => {
    if (!groupedCommands[cmd.category]) {
      groupedCommands[cmd.category] = [];
    }
    groupedCommands[cmd.category].push(cmd);
  });

  const flatGroupedList = Object.keys(groupedCommands).flatMap(
    (cat) => groupedCommands[cat]
  );

  useEffect(() => {
    if (selectedIndex >= flatGroupedList.length) {
      setSelectedIndex(Math.max(0, flatGroupedList.length - 1));
    }
  }, [flatGroupedList.length, selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % flatGroupedList.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + flatGroupedList.length) % flatGroupedList.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flatGroupedList[selectedIndex]) {
        flatGroupedList[selectedIndex].action();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  useEffect(() => {
    const selectedElement = containerRef.current?.querySelector(
      `[data-index="${selectedIndex}"]`
    );
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  let currentFlatIndex = 0;

  return (
    <Dialog 
      open 
      onClose={onClose} 
      fullWidth 
      maxWidth="xs" 
      scroll="paper"
      disableScrollLock
      sx={{ '& .MuiDialog-paper': { zoom: `${appScale}%`, borderRadius: '10px' } }}
    >
      <Box sx={{ px: 2, py: 1 }}>
        <TextField
          inputRef={inputRef}
          placeholder="Type a command or search..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setSelectedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          fullWidth
          size="small"
          slotProps={{
            input: {
              sx: {
                fontSize: "0.85rem",
                "& fieldset": { border: "none" },
                "&:hover fieldset": { border: "none" },
                "&.Mui-focused fieldset": { border: "none" },
                bgcolor: "action.hover",
                borderRadius: "8px",
                px: 1.5,
              },
              startAdornment: (
                <Box sx={{ display: "flex", color: "text.secondary", mr: 1 }}>
                  <SearchIcon sx={{ fontSize: 18 }} />
                </Box>
              ),
            },
          }}
        />
      </Box>

      <DialogContent dividers sx={{ p: 0, maxHeight: `${(50 * 100) / appScale}vh` }} ref={containerRef}>
        {flatGroupedList.length === 0 ? (
          <Typography color="text.secondary" sx={{ p: 3, textAlign: "center", fontSize: 13 }}>
            No results found for "{search}"
          </Typography>
        ) : (
          <List disablePadding>
            {Object.keys(groupedCommands).map((cat) => (
              <Box key={cat}>
                <ListSubheader sx={{ bgcolor: "background.paper", fontSize: 10, fontWeight: 700, textTransform: "uppercase", py: 0.5, lineHeight: "24px" }}>
                  {cat}
                </ListSubheader>
                {groupedCommands[cat].map((cmd) => {
                  const index = currentFlatIndex++;
                  const isSelected = index === selectedIndex;
                  return (
                    <ListItemButton
                      key={cmd.id}
                      data-index={index}
                      selected={isSelected}
                      onClick={cmd.action}
                      onMouseEnter={() => setSelectedIndex(index)}
                      sx={{ py: 1, px: 2, gap: 1 }}
                    >
                      <ListItemIcon sx={{ minWidth: "auto", color: isSelected ? "var(--button-color)" : "text.secondary" }}>
                        {cmd.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={<Typography variant="body2" sx={{ fontWeight: isSelected ? 600 : 400 }}>{cmd.name}</Typography>}
                      />
                      {cmd.shortcut && (
                        <Chip
                          label={cmd.shortcut}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: 9, height: 16, fontFamily: "monospace", opacity: 0.7 }}
                        />
                      )}
                    </ListItemButton>
                  );
                })}
              </Box>
            ))}
          </List>
        )}
      </DialogContent>

      <Divider />

      <Box sx={{ px: 2, py: 1, display: "flex", justifyContent: "space-between", alignItems: "center", bgcolor: "action.hover" }}>
        <Box sx={{ display: "flex", gap: 1.5 }}>
          <Typography variant="caption" color="text.secondary">
            <Typography variant="caption" component="span" sx={{ fontFamily: "monospace", fontWeight: 700, bgcolor: "action.selected", px: 0.5, py: 0.2, borderRadius: 0.5 }}>↑↓</Typography> navigate
          </Typography>
          <Typography variant="caption" color="text.secondary">
            <Typography variant="caption" component="span" sx={{ fontFamily: "monospace", fontWeight: 700, bgcolor: "action.selected", px: 0.5, py: 0.2, borderRadius: 0.5 }}>Enter</Typography> run
          </Typography>
          <Typography variant="caption" color="text.secondary">
            <Typography variant="caption" component="span" sx={{ fontFamily: "monospace", fontWeight: 700, bgcolor: "action.selected", px: 0.5, py: 0.2, borderRadius: 0.5 }}>Esc</Typography> close
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ fontWeight: 600, opacity: 0.7 }}>ActOne Palette</Typography>
      </Box>
    </Dialog>
  );
};
