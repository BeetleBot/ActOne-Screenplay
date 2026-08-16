import React, { useState, useEffect, useRef } from "react";
import { useFile, useEditor, useUI } from "../context";
import { readText } from "@tauri-apps/plugin-clipboard-manager";

import { NoteAddIcon, FolderOpenIcon, SaveIcon, FileDownloadIcon, DeleteIcon, AutoAwesomeIcon, SettingsIcon, ContentCutIcon, ContentCopyIcon, AssignmentIcon, SearchIcon, FullscreenIcon, ZoomInIcon, ZoomOutIcon, RestartAltIcon, HelpOutlinedIcon, MenuBookIcon, BugReportIcon, ColorLensIcon, BarChartIcon, CameraIcon, DescriptionIcon } from "./Icons";
import { invoke } from "@tauri-apps/api/core";
import { logger } from "../utils/logger";
import { parseScriptFileToFountain } from "../utils/text";
import { fixFormatting, type FixFormattingReport } from "../utils/fixFormatting";
import { useModalWindows } from "../hooks/useModalWindows";



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
  useTheme,
} from "@mui/material";

const RECENT_COMMANDS_KEY = "recentCommands";

const fuzzyScore = (query: string, target: string): number => {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (t === q) return 100;
  if (t.startsWith(q)) return 90;
  if (t.includes(q)) return 70;

  let score = 0;
  let qIdx = 0;
  let prevMatchIdx = -1;
  for (let i = 0; i < t.length && qIdx < q.length; i++) {
    if (t[i] === q[qIdx]) {
      score += 10;
      if (prevMatchIdx === i - 1) score += 5;
      prevMatchIdx = i;
      qIdx++;
    }
  }
  if (qIdx < q.length) return 0;
  return score;
};

const getRecentCommands = (): string[] => {
  try {
    const stored = localStorage.getItem(RECENT_COMMANDS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
};

const addRecentCommand = (cmdId: string) => {
  try {
    const recent = getRecentCommands().filter(id => id !== cmdId);
    recent.unshift(cmdId);
    localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(recent.slice(0, 10)));
  } catch { void 0; }
};

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
  toggleSidebar?: () => void;
  isSidebarOpen?: boolean;
  onOpenStructureModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenTitlePageModal: () => void;
  onOpenHelpModal: () => void;
  onOpenThemeManagerModal: () => void;
  onOpenXrayModal?: () => void;
  onToggleSnapshotsPanel?: () => void;
  onOpenMuseSettings?: () => void;
  openTutorialsWindow?: () => void;
  onOpenAboutModal?: () => void;
  onFixFormattingResult?: (report: FixFormattingReport) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = React.memo(({
  isOpen,
  onClose,
  onExportPDF,
  onOpenStructureModal,
  onOpenSettingsModal,
  onOpenTitlePageModal,
  onOpenHelpModal,
  onOpenThemeManagerModal,
  onOpenXrayModal,
  onToggleSnapshotsPanel,
  openTutorialsWindow,
  onOpenAboutModal,
  onFixFormattingResult,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    newFile,
    openFile,
    saveFile,
    saveFileAs,
    closeFile,
    activeFileId,
    importAsActoneProject,
  } = useFile();

  const {
    autoAddSceneNumbers,
    clearSceneNumbers,
    editorView,
  } = useEditor();

  const {
    typewriterMode,
    setTypewriterMode,
    setFontFamily,
    setPaperSize,
    isZenMode,
    setIsZenMode,
    zoomLevel,
    setZoomLevel,
    appScale,
    setAppScale,
    hideSyntaxEnabled,
    setHideSyntaxEnabled,
    lineFocusEnabled,
    setLineFocusEnabled,
    spellcheckEnabled,
    setSpellcheckEnabled,
  } = useUI();

  const { openSettingsWindow } = useModalWindows();

  const openUrl = (url: string) => {
    try {
      import("@tauri-apps/plugin-opener").then(({ openUrl }) => openUrl(url));
    } catch (e) {
      logger.warn("palette", "Failed to open URL via Tauri opener, falling back to window.open", e);
      window.open(url, "_blank");
    }
  };

  const handleImport = async () => {
    onClose();
    if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
      try {
        const result = await invoke<{ path: string; name: string; extension: string } | null>("import_script_dialog");
        if (result && result.path) {
          let fountainText = "";
          if (result.path.toLowerCase().endsWith(".fadein")) {
            const bytes = await invoke<number[]>("read_file_binary", { path: result.path });
            fountainText = parseScriptFileToFountain(result.path, new Uint8Array(bytes));
          } else {
            const raw = await invoke<string>("read_file_content", { path: result.path });
            fountainText = parseScriptFileToFountain(result.path, raw);
          }
          const scriptName = result.name || result.path.split(/[/\\]/).pop()?.replace(/\.(fountain|txt|fdx|fadein|spmd)$/i, "") || "Untitled";
          await importAsActoneProject(fountainText, scriptName, true);
        }
      } catch (e) {
        logger.error("palette", "Import script dialog failed", e);
      }
    } else {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".fdx,.fadein,.fountain,.txt,.spmd";
      input.onchange = async () => {
        const f = input.files?.[0];
        if (!f) return;
        const name = f.name.replace(/\.(fountain|txt|fdx|fadein|spmd)$/i, "");
        let fountainText = "";
        if (f.name.toLowerCase().endsWith(".fadein")) {
          const buf = await f.arrayBuffer();
          fountainText = parseScriptFileToFountain(f.name, new Uint8Array(buf));
        } else {
          const text = await f.text();
          fountainText = parseScriptFileToFountain(f.name, text);
        }
        await importAsActoneProject(fountainText, name, true);
      };
      input.click();
    }
  };

  const prevOpen = useRef(isOpen);

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (prevOpen.current && !isOpen) {
      if (editorView) {
        setTimeout(() => {
          // Only refocus editor if focus hasn't already been claimed by a newly opened window/modal/input
          if (!document.activeElement || document.activeElement === document.body) {
            editorView.contentDOM.focus({ preventScroll: true });
          }
        }, 50);
      }
    }
    prevOpen.current = isOpen;
  }, [isOpen, editorView]);

  const handleEditorAction = async (cmd: string) => {
    if (!editorView) return;
    editorView.dom.focus({ preventScroll: true });
    if (cmd === "paste") {
      try {
        const text = await readText();
        const sel = editorView.state.selection.main;
        editorView.dispatch({
          changes: { from: sel.from, to: sel.to, insert: text },
          selection: { anchor: sel.from + text.length }
        });
      } catch {
        void 0;
      }
    } else {
      document.execCommand(cmd);
    }
    onClose();
  };

  const handleUndo = () => {
    if (!editorView) return;
    try {
      const undoBtn = document.querySelector(".cm-content") as HTMLElement;
      if (undoBtn) {
        undoBtn.dispatchEvent(new KeyboardEvent("keydown", { key: "z", code: "KeyZ", ctrlKey: true, bubbles: true }));
      }
    } catch (e) { logger.warn("palette", "Undo failed", e); }
    onClose();
  };

  const handleRedo = () => {
    if (!editorView) return;
    try {
      const redoBtn = document.querySelector(".cm-content") as HTMLElement;
      if (redoBtn) {
        redoBtn.dispatchEvent(new KeyboardEvent("keydown", { key: "y", code: "KeyY", ctrlKey: true, bubbles: true }));
      }
    } catch (e) { logger.warn("palette", "Redo failed", e); }
    onClose();
  };

  const commands: CommandItem[] = [
    // File
    { id: "file-new", name: "New Screenplay", category: "File", icon: <NoteAddIcon sx={{ fontSize: 16 }} />, shortcut: "Ctrl+N", action: () => { newFile(); onClose(); } },
    { id: "file-open", name: "Open Screenplay...", category: "File", icon: <FolderOpenIcon sx={{ fontSize: 16 }} />, shortcut: "Ctrl+O", action: () => { openFile(); onClose(); } },
    { id: "file-import", name: "Import Screenplay...", category: "File", icon: <DescriptionIcon sx={{ fontSize: 16 }} />, action: handleImport },
    { id: "file-save", name: "Save Screenplay", category: "File", icon: <SaveIcon sx={{ fontSize: 16 }} />, shortcut: "Ctrl+S", action: () => { saveFile(); onClose(); } },
    { id: "file-save-as", name: "Save Screenplay As...", category: "File", icon: <FileDownloadIcon sx={{ fontSize: 16 }} />, shortcut: "Ctrl+Shift+S", action: () => { saveFileAs(); onClose(); } },
    { id: "file-close", name: "Close Active File", category: "File", icon: <DeleteIcon sx={{ fontSize: 16 }} />, shortcut: "Alt+Q", action: () => { closeFile(activeFileId); onClose(); } },
    { id: "file-export", name: "Export...", category: "File", icon: <FileDownloadIcon sx={{ fontSize: 16 }} />, shortcut: "Ctrl+P", action: () => { onExportPDF(); onClose(); } },

    // Edit
    { id: "edit-undo", name: "Undo", category: "Edit", icon: <ContentCutIcon sx={{ fontSize: 16 }} />, shortcut: "Ctrl+Z", action: handleUndo },
    { id: "edit-redo", name: "Redo", category: "Edit", icon: <ContentCutIcon sx={{ fontSize: 16 }} />, shortcut: "Ctrl+Y", action: handleRedo },
    { id: "edit-cut", name: "Cut Selected", category: "Edit", icon: <ContentCutIcon sx={{ fontSize: 16 }} />, shortcut: "Ctrl+X", action: () => handleEditorAction("cut") },
    { id: "edit-copy", name: "Copy Selected", category: "Edit", icon: <ContentCopyIcon sx={{ fontSize: 16 }} />, shortcut: "Ctrl+C", action: () => handleEditorAction("copy") },
    { id: "edit-paste", name: "Paste Clipboard", category: "Edit", icon: <AssignmentIcon sx={{ fontSize: 16 }} />, shortcut: "Ctrl+V", action: () => handleEditorAction("paste") },
    { id: "edit-find", name: "Find in Screenplay", category: "Edit", icon: <SearchIcon sx={{ fontSize: 16 }} />, shortcut: "Ctrl+F", action: () => handleEditorAction("find") },
    { id: "edit-spellcheck", name: spellcheckEnabled ? "Disable Spellcheck" : "Enable Spellcheck", category: "Edit", icon: <SettingsIcon sx={{ fontSize: 16 }} />, action: () => { setSpellcheckEnabled(!spellcheckEnabled); onClose(); } },

    // View
    { id: "view-typewriter", name: typewriterMode ? "Disable Typewriter Mode" : "Enable Typewriter Mode", category: "View", icon: <SettingsIcon sx={{ fontSize: 16 }} />, action: () => { setTypewriterMode(!typewriterMode); onClose(); } },
    { id: "view-zen-mode", name: isZenMode ? "Disable Zen Mode" : "Enable Zen Mode", category: "View", icon: <FullscreenIcon sx={{ fontSize: 16 }} />, shortcut: "Ctrl+Alt+Enter", action: () => { setIsZenMode(!isZenMode); onClose(); } },
    { id: "view-focus-mode", name: lineFocusEnabled ? "Disable Focus Mode" : "Enable Focus Mode", category: "View", icon: <SettingsIcon sx={{ fontSize: 16 }} />, action: () => { setLineFocusEnabled(!lineFocusEnabled); onClose(); } },
    { id: "view-zoom-in", name: "Zoom In", category: "View", icon: <ZoomInIcon sx={{ fontSize: 16 }} />, shortcut: "Ctrl+=", action: () => { setZoomLevel(zoomLevel + 10); onClose(); } },
    { id: "view-zoom-out", name: "Zoom Out", category: "View", icon: <ZoomOutIcon sx={{ fontSize: 16 }} />, shortcut: "Ctrl+-", action: () => { setZoomLevel(zoomLevel - 10); onClose(); } },
    { id: "view-zoom-reset", name: `Reset Editor Scale (${zoomLevel}%)`, category: "View", icon: <RestartAltIcon sx={{ fontSize: 16 }} />, shortcut: "Ctrl+0", action: () => { setZoomLevel(100); onClose(); } },
    { id: "view-interface-scale-reset", name: `Reset Interface Scale (${appScale}%)`, category: "View", icon: <RestartAltIcon sx={{ fontSize: 16 }} />, action: () => { setAppScale(100); onClose(); } },
    { id: "view-hide-syntax", name: hideSyntaxEnabled ? "Show Fountain Markup" : "Hide Fountain Markup", category: "View", icon: <SettingsIcon sx={{ fontSize: 16 }} />, action: () => { setHideSyntaxEnabled(!hideSyntaxEnabled); onClose(); } },
    { id: "view-xray", name: "Open X-Ray Analysis...", category: "View", icon: <BarChartIcon sx={{ fontSize: 16 }} />, action: () => { onOpenXrayModal?.(); onClose(); } },
    { id: "view-snapshots", name: "Show Snapshots", category: "View", icon: <CameraIcon sx={{ fontSize: 16 }} />, shortcut: "Alt+S", action: () => { onToggleSnapshotsPanel?.(); onClose(); } },
    // Format
    { id: "format-fix-formatting", name: "Fix Formatting", category: "Format", icon: <AutoAwesomeIcon sx={{ fontSize: 16 }} />, action: () => {
      if (editorView) {
        const fullText = editorView.state.doc.toString();
        const report = fixFormatting(fullText);
        if (report.formattedText !== fullText) {
          editorView.dispatch({
            changes: { from: 0, to: fullText.length, insert: report.formattedText }
          });
        }
        onFixFormattingResult?.(report);
      }
      onClose();
    } },
    { id: "format-title-page", name: "Edit Title Page...", category: "Format", icon: <SettingsIcon sx={{ fontSize: 16 }} />, action: () => { onOpenTitlePageModal(); onClose(); } },
    { id: "format-import-structure", name: "Import Structure Template...", category: "Format", icon: <AutoAwesomeIcon sx={{ fontSize: 16 }} />, action: () => { onOpenStructureModal(); onClose(); } },
    { id: "format-renumber", name: "Renumber Scene Headings", category: "Format", icon: <AutoAwesomeIcon sx={{ fontSize: 16 }} />, action: () => { autoAddSceneNumbers(); onClose(); } },
    { id: "format-clear", name: "Clear Scene Numbers", category: "Format", icon: <DeleteIcon sx={{ fontSize: 16 }} />, action: () => { clearSceneNumbers(); onClose(); } },

    // Settings
    { id: "settings-modal", name: "Open Settings...", category: "Settings", icon: <SettingsIcon sx={{ fontSize: 16 }} />, shortcut: "Ctrl+,", action: () => { onOpenSettingsModal(); onClose(); } },
    { id: "settings-spellcheck", name: "Open Spellcheck Settings...", category: "Settings", icon: <SettingsIcon sx={{ fontSize: 16 }} />, action: () => { openSettingsWindow("spellcheck"); onClose(); } },
    { id: "settings-font-prime", name: "Set Font: Courier Prime", category: "Settings", icon: <SettingsIcon sx={{ fontSize: 16 }} />, action: () => { setFontFamily("courier-prime"); onClose(); } },
    { id: "settings-font-sans", name: "Set Font: Courier Prime Sans", category: "Settings", icon: <SettingsIcon sx={{ fontSize: 16 }} />, action: () => { setFontFamily("courier-prime-sans"); onClose(); } },
    { id: "settings-paper-letter", name: "Set Paper Size: US Letter", category: "Settings", icon: <SettingsIcon sx={{ fontSize: 16 }} />, action: () => { setPaperSize("letter"); onClose(); } },
    { id: "settings-paper-a4", name: "Set Paper Size: A4", category: "Settings", icon: <SettingsIcon sx={{ fontSize: 16 }} />, action: () => { setPaperSize("a4"); onClose(); } },
    { id: "settings-theme-manager", name: "Open Theme Manager...", category: "Settings", icon: <ColorLensIcon sx={{ fontSize: 16 }} />, action: () => { onOpenThemeManagerModal(); onClose(); } },

    // Help
    { id: "help-about", name: "About ActOne", category: "Help", icon: <HelpOutlinedIcon sx={{ fontSize: 16 }} />, action: () => { onOpenAboutModal?.(); onClose(); } },
    { id: "help-guide", name: "Help Guide", category: "Help", icon: <HelpOutlinedIcon sx={{ fontSize: 16 }} />, shortcut: "F1", action: () => { onOpenHelpModal(); onClose(); } },
    { id: "help-tutorial", name: "Interactive Tutorial...", category: "Help", icon: <AutoAwesomeIcon sx={{ fontSize: 16 }} />, action: () => { openTutorialsWindow?.(); onClose(); } },
    { id: "help-fountain", name: "Fountain Syntax Guide", category: "Help", icon: <MenuBookIcon sx={{ fontSize: 16 }} />, action: () => { openUrl("https://fountain.io"); onClose(); } },
    { id: "help-bug", name: "Report a Bug", category: "Help", icon: <BugReportIcon sx={{ fontSize: 16 }} />, action: () => { openUrl("https://discord.gg/zpFPpdAxnW"); onClose(); } },
  ];

  const recentIds = getRecentCommands();

  const filteredCommands = commands
    .map((cmd) => ({
      cmd,
      score: fuzzyScore(search, cmd.name) + fuzzyScore(search, cmd.category),
      recentIndex: recentIds.indexOf(cmd.id),
    }))
    .filter(({ score }) => search === "" || score > 0)
    .sort((a, b) => {
      if (a.recentIndex !== -1 && b.recentIndex !== -1) return a.recentIndex - b.recentIndex;
      if (a.recentIndex !== -1) return -1;
      if (b.recentIndex !== -1) return 1;
      return b.score - a.score;
    })
    .map(({ cmd }) => cmd);

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
        addRecentCommand(flatGroupedList[selectedIndex].id);
        flatGroupedList[selectedIndex].action();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const selectedElement = container.querySelector(
      `[data-index="${selectedIndex}"]`
    ) as HTMLElement | null;
    if (selectedElement) {
      const elemTop = selectedElement.offsetTop;
      const elemBottom = elemTop + selectedElement.offsetHeight;
      if (elemTop < container.scrollTop) {
        container.scrollTop = elemTop;
      } else if (elemBottom > container.scrollTop + container.clientHeight) {
        container.scrollTop = elemBottom - container.clientHeight;
      }
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
      hideBackdrop
      sx={{ zIndex: 1000000 }}
      slotProps={{
        paper: {
          sx: {
            zoom: `${appScale}%`,
            borderRadius: 0,
            backgroundColor: theme.palette.background.paper + (isDark ? "d9" : "eb"),
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid",
            borderColor: "divider",
            boxShadow: isDark ? "none" : theme.shadows[8],
            backgroundImage: "none",
            color: theme.palette.text.primary,
            cursor: "none",
          },
        },
      }}
    >
      <Box data-tour-palette sx={{ px: 2, py: 1 }}>
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
              autoComplete: "off",
              sx: {
                fontSize: "0.85rem",
                "& fieldset": { border: "none" },
                "&:hover fieldset": { border: "none" },
                "&.Mui-focused fieldset": { border: "none" },
                bgcolor: isDark ? `${theme.palette.text.primary}14` : `${theme.palette.text.primary}0a`,
                borderRadius: 0,
                px: 1.5,
                color: theme.palette.text.primary,
                "& input": { color: theme.palette.text.primary },
                "& input::placeholder": { color: theme.palette.text.secondary, opacity: 0.5 },
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
                <ListSubheader sx={{ bgcolor: "transparent", color: theme.palette.text.secondary, fontSize: 10, fontWeight: 700, textTransform: "uppercase", py: 0.5, lineHeight: "24px" }}>
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
                      sx={{
                        py: 1,
                        px: 2,
                        gap: 1,
                        "&.Mui-selected": {
                          backgroundColor: `${theme.palette.primary.main}20`,
                        },
                        "&:hover": {
                          backgroundColor: `${theme.palette.primary.main}10`,
                        },
                      }}
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
                           sx={{ fontSize: 9, height: 16, fontFamily: "monospace", opacity: 0.7, borderColor: "divider" }}
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

      <Box sx={{ px: 2, py: 1, display: "flex", justifyContent: "space-between", alignItems: "center", bgcolor: isDark ? `${theme.palette.background.default}66` : "action.hover", color: theme.palette.text.secondary }}>
        <Box sx={{ display: "flex", gap: 1.5 }}>
          <Typography variant="caption" color="text.secondary">
            <Typography variant="caption" component="span" sx={{ fontFamily: "monospace", fontWeight: 700, bgcolor: isDark ? `${theme.palette.text.primary}1a` : "action.selected", color: theme.palette.text.primary, px: 0.5, py: 0.2, borderRadius: 0 }}>↑↓</Typography> navigate
          </Typography>
          <Typography variant="caption" color="text.secondary">
            <Typography variant="caption" component="span" sx={{ fontFamily: "monospace", fontWeight: 700, bgcolor: isDark ? `${theme.palette.text.primary}1a` : "action.selected", color: theme.palette.text.primary, px: 0.5, py: 0.2, borderRadius: 0 }}>Enter</Typography> run
          </Typography>
          <Typography variant="caption" color="text.secondary">
            <Typography variant="caption" component="span" sx={{ fontFamily: "monospace", fontWeight: 700, bgcolor: isDark ? `${theme.palette.text.primary}1a` : "action.selected", color: theme.palette.text.primary, px: 0.5, py: 0.2, borderRadius: 0 }}>Esc</Typography> close
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ fontWeight: 600, opacity: 0.7 }}>ActOne Palette</Typography>
      </Box>
    </Dialog>
  );
});
