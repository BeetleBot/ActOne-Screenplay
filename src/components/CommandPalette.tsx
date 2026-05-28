import React, { useState, useEffect, useRef } from "react";
import { useFile } from "../context/FileContext";
import { useEditor } from "../context/EditorContext";
import { useUI } from "../context/UIContext";

import {
  FilePlus,
  FolderOpen,
  Save,
  FileDown,
  Trash2,
  Sparkles,
  Sidebar,
  Settings,
  Scissors,
  Copy,
  Clipboard
} from "lucide-react";

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
  onOpenThemeModal: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onExportPDF,
  toggleSidebar,
  isSidebarOpen,
  onOpenStructureModal,
  onOpenThemeModal
}) => {
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
  } = useFile();

  const {
    autoAddSceneNumbers,
    clearSceneNumbers,
    editorView,
  } = useEditor();

  const {
    typewriterMode,
    setTypewriterMode,
    showTimeline,
    setShowTimeline,
    setWorkspaceMode,
    setActiveTab,
    setFontFamily,
    setPaperSize
  } = useUI();



  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const prevOpen = useRef(isOpen);
  useEffect(() => {
    if (prevOpen.current && !isOpen) {
      editorView?.focus();
    }
    prevOpen.current = isOpen;
  }, [isOpen, editorView]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(); // Close first if already open, but here we toggle:
        // Since isOpen is controlled outside, we trigger toggle. We'll handle this in App.tsx.
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isOpen, onClose]);

  const handleEditorAction = (cmd: string) => {
    if (!editorView) return;
    editorView.focus();
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
    } catch (e) {}
    onClose();
  };

  const handleRedo = () => {
    if (!editorView) return;
    try {
      const redoBtn = document.querySelector(".cm-content") as HTMLElement;
      if (redoBtn) {
        redoBtn.dispatchEvent(new KeyboardEvent("keydown", { key: "y", code: "KeyY", ctrlKey: true, bubbles: true }));
      }
    } catch (e) {}
    onClose();
  };

  const commands: CommandItem[] = [
    // File
    { id: "file-new", name: "New Screenplay", category: "File", icon: <FilePlus size={16} />, shortcut: "Ctrl+N", action: () => { newFile(); onClose(); } },
    { id: "file-open", name: "Open Screenplay...", category: "File", icon: <FolderOpen size={16} />, shortcut: "Ctrl+O", action: () => { openFile(); onClose(); } },
    { id: "file-save", name: "Save Screenplay", category: "File", icon: <Save size={16} />, shortcut: "Ctrl+S", action: () => { saveFile(); onClose(); } },
    { id: "file-save-as", name: "Save Screenplay As...", category: "File", icon: <FileDown size={16} />, shortcut: "Ctrl+Shift+S", action: () => { saveFileAs(); onClose(); } },
    { id: "file-close", name: "Close Active File", category: "File", icon: <Trash2 size={16} />, shortcut: "Ctrl+W", action: () => { closeFile(activeFileId); onClose(); } },
    { id: "file-export", name: "Export...", category: "File", icon: <FileDown size={16} />, shortcut: "Ctrl+P", action: () => { onExportPDF(); onClose(); } },

    // Edit
    { id: "edit-undo", name: "Undo", category: "Edit", icon: <Scissors size={16} />, shortcut: "Ctrl+Z", action: handleUndo },
    { id: "edit-redo", name: "Redo", category: "Edit", icon: <Scissors size={16} />, shortcut: "Ctrl+Shift+Z", action: handleRedo },
    { id: "edit-cut", name: "Cut Selected", category: "Edit", icon: <Scissors size={16} />, shortcut: "Ctrl+X", action: () => handleEditorAction("cut") },
    { id: "edit-copy", name: "Copy Selected", category: "Edit", icon: <Copy size={16} />, shortcut: "Ctrl+C", action: () => handleEditorAction("copy") },
    { id: "edit-paste", name: "Paste", category: "Edit", icon: <Clipboard size={16} />, shortcut: "Ctrl+V", action: () => handleEditorAction("paste") },

    // View
    { id: "view-mode-editor", name: "Switch to Editor Mode", category: "View", icon: <Settings size={16} />, action: () => { setWorkspaceMode("editor"); onClose(); } },
    { id: "view-mode-cards", name: "Switch to Index Cards Mode", category: "View", icon: <Settings size={16} />, action: () => { setWorkspaceMode("cards"); onClose(); } },
    { id: "view-sidebar", name: isSidebarOpen ? "Hide Sidebar Outline" : "Show Sidebar Outline", category: "View", icon: <Sidebar size={16} />, shortcut: "Ctrl+\\", action: () => { toggleSidebar(); onClose(); } },
    { id: "view-tab-outline", name: "Switch Sidebar Tab: Outline", category: "View", icon: <Sidebar size={16} />, action: () => { setActiveTab("outline"); if (!isSidebarOpen) toggleSidebar(); onClose(); } },
    { id: "view-tab-notepad", name: "Switch Sidebar Tab: Notepad", category: "View", icon: <Sidebar size={16} />, action: () => { setActiveTab("notepad"); if (!isSidebarOpen) toggleSidebar(); onClose(); } },
    { id: "view-tab-characters", name: "Switch Sidebar Tab: Characters", category: "View", icon: <Sidebar size={16} />, action: () => { setActiveTab("characters"); if (!isSidebarOpen) toggleSidebar(); onClose(); } },
    { id: "view-tab-stats", name: "Switch Sidebar Tab: Statistics", category: "View", icon: <Sidebar size={16} />, action: () => { setActiveTab("stats"); if (!isSidebarOpen) toggleSidebar(); onClose(); } },
    { id: "view-typewriter", name: typewriterMode ? "Disable Typewriter Mode" : "Enable Typewriter Mode", category: "View", icon: <Settings size={16} />, action: () => { setTypewriterMode(!typewriterMode); onClose(); } },
    { id: "view-timeline", name: showTimeline ? "Hide Timeline" : "Show Timeline", category: "View", icon: <Settings size={16} />, shortcut: "Ctrl+Shift+T", action: () => { setShowTimeline(!showTimeline); onClose(); } },

    // Format
    { id: "format-import-structure", name: "Import Structure Template...", category: "Format", icon: <Sparkles size={16} />, action: () => { onOpenStructureModal(); onClose(); } },
    { id: "format-renumber", name: "Renumber Scene Headings", category: "Format", icon: <Sparkles size={16} />, action: () => { if (window.confirm("Renumber all scenes?")) autoAddSceneNumbers(); onClose(); } },
    { id: "format-clear", name: "Clear Scene Numbers", category: "Format", icon: <Trash2 size={16} />, action: () => { if (window.confirm("Clear all scene numbers?")) clearSceneNumbers(); onClose(); } },

    // Theme
    { id: "view-theme-selector", name: "Change Theme...", category: "Theme", icon: <Settings size={16} />, action: () => { onOpenThemeModal(); onClose(); } },

    // Settings
    { id: "settings-font-prime", name: "Set Font: Courier Prime", category: "Settings", icon: <Settings size={16} />, action: () => { setFontFamily("courier-prime"); onClose(); } },
    { id: "settings-font-sans", name: "Set Font: Courier Prime Sans", category: "Settings", icon: <Settings size={16} />, action: () => { setFontFamily("courier-prime-sans"); onClose(); } },
    { id: "settings-paper-letter", name: "Set Paper Size: US Letter", category: "Settings", icon: <Settings size={16} />, action: () => { setPaperSize("letter"); onClose(); } },
    { id: "settings-paper-a4", name: "Set Paper Size: A4", category: "Settings", icon: <Settings size={16} />, action: () => { setPaperSize("a4"); onClose(); } },
  ];

  // Filter commands by search string
  const filteredCommands = commands.filter((cmd) =>
    cmd.name.toLowerCase().includes(search.toLowerCase()) ||
    cmd.category.toLowerCase().includes(search.toLowerCase())
  );

  // Group commands by category for display
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

  // Keep selectedIndex in bounds
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
    // Scroll selected item into view automatically
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
    <div className="cp-overlay" onClick={onClose}>
      <div
        className="cp-container"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="cp-search-wrapper">
          <input
            ref={inputRef}
            type="text"
            className="cp-search-input"
            placeholder="Type a command or search..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
          />
        </div>

        <div className="cp-list" ref={containerRef}>
          {flatGroupedList.length === 0 ? (
            <div className="cp-empty">No results found for "{search}"</div>
          ) : (
            Object.keys(groupedCommands).map((cat) => (
              <div key={cat}>
                <div className="cp-category-header">{cat}</div>
                {groupedCommands[cat].map((cmd) => {
                  const index = currentFlatIndex++;
                  const isSelected = index === selectedIndex;
                  return (
                    <div
                      key={cmd.id}
                      data-index={index}
                      className={`cp-item ${isSelected ? "selected" : ""}`}
                      onMouseEnter={() => setSelectedIndex(index)}
                      onClick={cmd.action}
                    >
                      <div className="cp-item-left">
                        <span className="cp-item-icon">{cmd.icon}</span>
                        <span>{cmd.name}</span>
                      </div>
                      {cmd.shortcut && (
                        <span className="cp-item-shortcut">{cmd.shortcut}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="cp-footer">
          <div className="cp-kbd-guide">
            <span>
              <span className="cp-kbd">↑↓</span> to navigate
            </span>
            <span>
              <span className="cp-kbd">Enter</span> to run
            </span>
            <span>
              <span className="cp-kbd">Esc</span> to close
            </span>
          </div>
          <div>Drafter Palette</div>
        </div>
      </div>
    </div>
  );
};
