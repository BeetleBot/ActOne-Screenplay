import React, { useState, useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { undo, redo } from "@codemirror/commands";
import { useFile } from "../../context/FileContext";
import { useUI } from "../../context/UIContext";
import { useEditor } from "../../context/EditorContext";
import { FountainEditor } from "../FountainEditor";
import { SidebarViews } from "../SidebarViews";
import { IndexCardsWorkspace } from "../IndexCardsWorkspace";
import { TimelineView } from "../TimelineView";
import { SearchPanel } from "../SearchPanel";
import { startRevisionMode } from "../../utils/revision";

import {
  List,
  FileText,
  User,
  BarChart2,
  Minus,
  Square,
  X,
  LayoutGrid,
  Settings,
  Check,
  Plus,
} from "lucide-react";

const getTauriWindow = () => {
  try {
    return getCurrentWindow();
  } catch (e) {
    return null;
  }
};

const MenuBar: React.FC<{
  onNewFile: () => void;
  onOpenFile: () => void;
  onSaveFile: () => void;
  onSaveFileAs: () => Promise<string | null>;
  onExportPDF: () => void;
  onOpenStructureModal: () => void;
  onOpenThemeModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenPalette: () => void;
  onOpenRevisionModal: () => void;
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
}> = ({
  onNewFile,
  onOpenFile,
  onSaveFile,
  onSaveFileAs,
  onExportPDF,
  onOpenStructureModal,
  onOpenThemeModal,
  onOpenSettingsModal,
  onOpenPalette,
  onOpenRevisionModal,
  toggleSidebar,
  isSidebarOpen,
}) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);
  const {
    typewriterMode,
    setTypewriterMode,
    showTimeline,
    setShowTimeline,
    workspaceMode,
    setWorkspaceMode,
    isZenMode,
    setIsZenMode,
    zoomLevel,
    setZoomLevel,
  } = useUI();
  const { autoAddSceneNumbers, clearSceneNumbers, editorView } = useEditor();
  const { closeFile, activeFileId, files, updateSettings } = useFile();

  const activeFile = files.find(f => f.id === activeFileId);
  const revisionModeEnabled = activeFile?.parsedDoc?.settings?.revisionModeEnabled;
  const filePath = activeFile?.filePath || null;
  const rawText = activeFile?.rawText || "";

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMenuClick = (menu: string) => {
    setOpenMenu(openMenu === menu ? null : menu);
  };

  const runAction = (action: () => void) => {
    action();
    setOpenMenu(null);
  };

  const menuOrder = ["File", "Edit", "View", "Revisions", "Format", "Help"] as const;

  const menus: Record<string, { label: string; shortcut?: string; action: () => void; dividerAfter?: boolean; disabled?: boolean }[]> = {
    File: [
      { label: "New Screenplay", shortcut: "Ctrl+N", action: onNewFile },
      { label: "Open...", shortcut: "Ctrl+O", action: onOpenFile, dividerAfter: true },
      { label: "Save", shortcut: "Ctrl+S", action: onSaveFile },
      { label: "Save As...", shortcut: "Ctrl+Shift+S", action: onSaveFileAs, dividerAfter: true },
      { label: "Export...", shortcut: "Ctrl+P", action: onExportPDF, dividerAfter: true },
      { label: "Close File", shortcut: "Ctrl+W", action: () => closeFile(activeFileId) },
    ],
    Edit: [
      { label: "Undo", shortcut: "Ctrl+Z", action: () => { if (editorView) undo(editorView); } },
      { label: "Redo", shortcut: "Ctrl+Y", action: () => { if (editorView) redo(editorView); }, dividerAfter: true },
      { label: "Command Palette", shortcut: "Ctrl+K", action: onOpenPalette, dividerAfter: true },
      { label: "Bold", shortcut: "Ctrl+B", action: () => {} },
      { label: "Italic", shortcut: "Ctrl+I", action: () => {} },
      { label: "Underline", shortcut: "Ctrl+U", action: () => {}, dividerAfter: true },
      { label: "Settings...", shortcut: "Ctrl+,", action: onOpenSettingsModal },
    ],
    View: [
      { label: isSidebarOpen ? "Hide Sidebar" : "Show Sidebar", shortcut: "Ctrl+\\", action: toggleSidebar },
      { label: showTimeline ? "Hide Timeline" : "Show Timeline", shortcut: "Ctrl+Shift+T", action: () => setShowTimeline(!showTimeline), dividerAfter: true },
      { label: workspaceMode === "cards" ? "Switch to Editor" : "Switch to Index Cards", action: () => setWorkspaceMode(workspaceMode === "cards" ? "editor" : "cards") },
      { label: typewriterMode ? "Disable Typewriter Mode" : "Enable Typewriter Mode", action: () => setTypewriterMode(!typewriterMode), dividerAfter: true },
      { label: "Zen Mode", shortcut: "Ctrl+Alt+Enter", action: () => setIsZenMode(!isZenMode), dividerAfter: true },
      { label: "Zoom In", shortcut: "Ctrl+=", action: () => setZoomLevel(zoomLevel + 10) },
      { label: "Zoom Out", shortcut: "Ctrl+-", action: () => setZoomLevel(zoomLevel - 10) },
      { label: `Reset Zoom (${zoomLevel}%)`, shortcut: "Ctrl+0", action: () => setZoomLevel(100), dividerAfter: true },
      { label: "Change Theme...", action: onOpenThemeModal },
    ],
    Revisions: [
      { label: "Start Revision Mode", action: () => startRevisionMode(filePath, rawText, updateSettings, onSaveFileAs), disabled: !!revisionModeEnabled },
      { label: "Review Revisions...", action: onOpenRevisionModal, disabled: !revisionModeEnabled },
    ],
    Format: [
      { label: "Import Structure Template...", action: onOpenStructureModal, dividerAfter: true },
      { label: "Renumber Scenes", action: () => { if (window.confirm("Renumber all scenes?")) autoAddSceneNumbers(); } },
      { label: "Clear Scene Numbers", action: () => { if (window.confirm("Clear all scene numbers?")) clearSceneNumbers(); } },
    ],
    Help: [
      { label: "Keyboard Shortcuts", action: () => {}, disabled: true },
      { label: "Fountain Syntax Guide", action: () => {}, disabled: true, dividerAfter: true },
      { label: "Report a Bug", action: () => {}, disabled: true },
      { label: "About ActOne", action: () => {}, disabled: true },
    ],
  };

  return (
    <div className="menu-bar" ref={menuBarRef}>
      {menuOrder.map((name) => {
        const items = menus[name];
        return (
          <div key={name} className="menu-bar-item-wrapper">
            <button
              className={`menu-bar-btn ${openMenu === name ? "active" : ""}`}
              onClick={() => handleMenuClick(name)}
              onMouseEnter={() => openMenu && setOpenMenu(name)}
            >
              {name}
            </button>
            {openMenu === name && (
              <div className="menu-dropdown">
                {items.map((item, idx) => (
                  <React.Fragment key={idx}>
                    <div
                      className={`menu-item ${item.disabled ? "disabled" : ""}`}
                      onClick={() => !item.disabled && runAction(item.action)}
                    >
                      <span>{item.label}</span>
                      {item.shortcut && <span className="menu-item-shortcut">{item.shortcut}</span>}
                    </div>
                    {item.dividerAfter && <div className="menu-divider" />}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const HeaderBar: React.FC<{
  isPaletteOpen: boolean;
  setIsPaletteOpen: (open: boolean) => void;
  onOpenThemeModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenStructureModal: () => void;
  onOpenExportModal: () => void;
  onOpenRevisionModal: () => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}> = ({
  isPaletteOpen,
  setIsPaletteOpen,
  onOpenThemeModal,
  onOpenSettingsModal,
  onOpenStructureModal,
  onOpenExportModal,
  onOpenRevisionModal,
  isSidebarOpen,
  toggleSidebar,
}) => {
  const { files, activeFileId, newFile, openFile, saveFile, saveFileAs } = useFile();
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const checkMaximized = async () => {
      const win = getTauriWindow();
      if (win) {
        setIsMaximized(await win.isMaximized());
      }
    };

    checkMaximized();

    let unlisten: any;
    const setupListener = async () => {
      const win = getTauriWindow();
      if (win) {
        unlisten = await win.onResized(() => {
          checkMaximized();
        });
      }
    };
    setupListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const handleClose = () => {
    try {
      const win = getTauriWindow();
      if (win) win.close();
    } catch (e) {
      console.log("Close clicked");
    }
  };

  const handleMinimize = () => {
    try {
      const win = getTauriWindow();
      if (win) win.minimize();
    } catch (e) {
      console.log("Minimize clicked");
    }
  };

  const handleMaximize = async () => {
    try {
      const win = getTauriWindow();
      if (win) {
        if (await win.isMaximized()) {
          await win.unmaximize();
          setIsMaximized(false);
        } else {
          await win.maximize();
          setIsMaximized(true);
        }
      }
    } catch (e) {
      console.log("Maximize clicked");
    }
  };

  const handleStartDrag = async (e: React.MouseEvent) => {
    if (e.button === 0) {
      const target = e.target as HTMLElement;
      if (
        target.tagName !== "BUTTON" &&
        !target.closest("button") &&
        target.tagName !== "INPUT" &&
        !target.closest("input") &&
        !target.closest(".menu-bar") &&
        !target.closest(".menu-dropdown")
      ) {
        try {
          const win = getTauriWindow();
          if (win) await win.startDragging();
        } catch (err) {
          console.error("Failed to start dragging:", err);
        }
      }
    }
  };

  const handleDoubleClick = async (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName !== "BUTTON" &&
      !target.closest("button") &&
      target.tagName !== "INPUT" &&
      !target.closest("input") &&
      !target.closest(".menu-bar") &&
      !target.closest(".menu-dropdown")
    ) {
      handleMaximize();
    }
  };

  const activeFile = files.find(f => f.id === activeFileId);
  const activeFileName = activeFile?.filePath ? activeFile.filePath.split(/[/\\]/).pop() : "Untitled";
  const isRevisionMode = activeFile?.parsedDoc?.settings?.revisionModeEnabled;

  return (
    <div
      className="header-bar"
      data-tauri-drag-region
      onMouseDown={handleStartDrag}
      onDoubleClick={handleDoubleClick}
    >
      <div className="header-left">
        <MenuBar
          onNewFile={newFile}
          onOpenFile={openFile}
          onSaveFile={saveFile}
          onSaveFileAs={saveFileAs}
          onExportPDF={onOpenExportModal}
          onOpenStructureModal={onOpenStructureModal}
          onOpenThemeModal={onOpenThemeModal}
          onOpenSettingsModal={onOpenSettingsModal}
          onOpenPalette={() => setIsPaletteOpen(!isPaletteOpen)}
          onOpenRevisionModal={onOpenRevisionModal}
          toggleSidebar={toggleSidebar}
          isSidebarOpen={isSidebarOpen}
        />
      </div>

      <span className="titlebar-title" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        ActOne - {activeFileName}
        {isRevisionMode && (
          <span style={{
            backgroundColor: "rgba(229, 62, 62, 0.15)",
            border: "1px solid rgba(229, 62, 62, 0.3)",
            color: "#e53e3e",
            padding: "1px 6px",
            borderRadius: "4px",
            fontSize: "9px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            userSelect: "none"
          }}>
            Revision Mode
          </span>
        )}
      </span>

      <div className="header-right window-controls-windows">
        <button className="window-btn-windows minimize" onClick={handleMinimize} title="Minimize">
          <Minus size={10} strokeWidth={2.5} />
        </button>
        <button className="window-btn-windows maximize" onClick={handleMaximize} title={isMaximized ? "Restore" : "Maximize"}>
          {isMaximized ? (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 1H9V7" stroke="currentColor" strokeWidth="1.2" />
              <path d="M1 3H7V9H1V3Z" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          ) : (
            <Square size={8} strokeWidth={2.5} />
          )}
        </button>
        <button className="window-btn-windows close" onClick={handleClose} title="Close">
          <X size={10} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};

const ActivityBar: React.FC<{
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
}> = ({ activeTab, setActiveTab, isSidebarOpen, setIsSidebarOpen }) => {
  const handleClick = (tab: string) => {
    if (isSidebarOpen && activeTab === tab) {
      setIsSidebarOpen(false);
    } else {
      setActiveTab(tab);
      setIsSidebarOpen(true);
    }
  };

  const tabs = [
    { id: "outline", icon: <List size={22} />, title: "Outline" },
    { id: "notepad", icon: <FileText size={22} />, title: "Notepad" },
    { id: "characters", icon: <User size={22} />, title: "Characters" },
    { id: "stats", icon: <BarChart2 size={22} />, title: "Statistics" },
  ];

  return (
    <div className="activity-bar">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`activity-bar-btn ${isSidebarOpen && activeTab === tab.id ? "active" : ""}`}
          onClick={() => handleClick(tab.id)}
          title={tab.title}
        >
          {tab.icon}
        </button>
      ))}
    </div>
  );
};

const EditorTabs: React.FC<{ onOpenThemeModal: () => void }> = ({ onOpenThemeModal }) => {
  const { files, activeFileId, selectFile, newFile, closeFile } = useFile();
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const activeTab = tabsContainerRef.current?.querySelector(".header-tab.active");
    if (activeTab) {
      activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeFileId]);

  return (
    <div className="editor-tabs-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingRight: "8px" }}>
      <div className="header-tabs-container" ref={tabsContainerRef}>
        {files.map((file) => {
          const display = file.filePath ? file.filePath.split(/[/\\]/).pop() : "Untitled";
          const isActive = file.id === activeFileId;
          return (
            <div
              key={file.id}
              className={`header-tab ${isActive ? "active" : ""} ${file.isDirty ? "dirty" : ""}`}
              onClick={() => selectFile(file.id)}
            >
              <span className="tab-name">{display}</span>
              <button
                className="tab-close"
                onClick={(e) => {
                  e.stopPropagation();
                  closeFile(file.id);
                }}
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
        <button
          className="header-new-tab-btn"
          onClick={(e) => {
            e.stopPropagation();
            newFile();
          }}
          title="New File"
        >
          <Plus size={14} />
        </button>
      </div>
      <EditorToolbar onOpenThemeModal={onOpenThemeModal} />
    </div>
  );
};

const Workspace: React.FC<{
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  onOpenThemeModal: () => void;
}> = ({ isSidebarOpen, setIsSidebarOpen, onOpenThemeModal }) => {
  const [sidebarWidth, setSidebarWidth] = useState<number>(260);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const { paperSize, workspaceMode, setWorkspaceMode, showTimeline, activeTab, setActiveTab, zoomLevel, isZenMode } = useUI();
  const { editorView } = useEditor();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (workspaceMode !== "editor") {
          e.preventDefault();
          setWorkspaceMode("editor");
          setTimeout(() => {
            editorView?.focus();
          }, 50);
        } else {
          const activeEl = document.activeElement;
          const isEditorFocused = activeEl && (
            activeEl.classList.contains("cm-content") ||
            activeEl.closest(".cm-editor") !== null
          );
          if (!isEditorFocused) {
            const isModalOpen = document.querySelector(".cp-overlay") || document.querySelector(".export-modal-overlay");
            if (!isModalOpen) {
              e.preventDefault();
              if (activeEl instanceof HTMLElement) {
                activeEl.blur();
              }
              editorView?.focus();
            }
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [workspaceMode, setWorkspaceMode, editorView]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const activityBarWidth = 48;
      const newWidth = Math.max(200, Math.min(e.clientX - activityBarWidth, 800));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = 'default';
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = 'col-resize';
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  return (
    <div className="app-workspace">
      {!isZenMode && (
        <ActivityBar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
        />
      )}

      {isSidebarOpen && !isZenMode && (
        <>
          <div
            className="sidebar"
            tabIndex={-1}
            style={{ width: `${sidebarWidth}px`, flexShrink: 0, outline: 'none' }}
            onMouseDown={(e) => {
              const target = e.target as HTMLElement;
              if (
                target.tagName !== "INPUT" &&
                target.tagName !== "TEXTAREA" &&
                target.tagName !== "SELECT" &&
                target.tagName !== "BUTTON" &&
                !target.closest("button") &&
                !target.closest("input") &&
                !target.closest("textarea") &&
                !target.closest("select") &&
                target.contentEditable !== "true"
              ) {
                e.currentTarget.focus();
              }
            }}
          >
            <div className="sidebar-header" style={{
              height: "36px",
              display: "flex",
              alignItems: "center",
              padding: "0 12px",
              borderBottom: "1px solid var(--border-color)",
              backgroundColor: "var(--bg-sidebar)",
              fontWeight: 600,
              fontSize: "12px",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              flexShrink: 0
            }}>
              {activeTab === "outline" && "Navigator"}
              {activeTab === "notepad" && "Notepad"}
              {activeTab === "characters" && "Characters"}
              {activeTab === "stats" && "Statistics"}
            </div>
            <div className="sidebar-content">
              <SidebarViews activeTab={activeTab} />
            </div>
          </div>
          <div
            className="sidebar-resizer"
            onMouseDown={handleMouseDown}
          />
        </>
      )}

      <div className="editor-container">
        <SearchPanel />
        {!isZenMode && <EditorTabs onOpenThemeModal={onOpenThemeModal} />}
        <div className="editor-scroll-area">
          {workspaceMode === "editor" && (
            <div className={`editor-paper paper-${paperSize}`} style={{ zoom: zoomLevel / 100 }}>
              <FountainEditor />
            </div>
          )}
          {workspaceMode === "cards" && (
            <IndexCardsWorkspace />
          )}
        </div>
        {(showTimeline && !isZenMode) && <TimelineView />}
      </div>
    </div>
  );
};

const EditorToolbar: React.FC<{ onOpenThemeModal: () => void }> = ({ onOpenThemeModal }) => {
  const {
    fontFamily,
    setFontFamily,
    paperSize,
    setPaperSize,
    typewriterMode,
    setTypewriterMode,
    workspaceMode,
    setWorkspaceMode,
    zoomLevel,
    setZoomLevel
  } = useUI();
  const [showSettings, setShowSettings] = React.useState(false);
  const settingsRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="editor-toolbar">
      <button
        className={`editor-toolbar-btn ${workspaceMode === "cards" ? "active" : ""}`}
        title="Index Cards"
        onClick={() => setWorkspaceMode(workspaceMode === "cards" ? "editor" : "cards")}
      >
        <LayoutGrid size={18} strokeWidth={1.5} />
      </button>
      <div className="editor-toolbar-settings-container" ref={settingsRef}>
        <button
          className="editor-toolbar-btn"
          title="Settings"
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings size={18} strokeWidth={1.5} />
        </button>
        {showSettings && (
          <div className="editor-toolbar-dropdown">
            <div className="editor-toolbar-dropdown-section">Editor Mode</div>
            <div
              className={`editor-toolbar-dropdown-option ${typewriterMode ? "active" : ""}`}
              onClick={() => setTypewriterMode(!typewriterMode)}
            >
              <span>Typewriter Mode</span>
              {typewriterMode && <Check size={14} />}
            </div>

            <div className="editor-toolbar-dropdown-divider" />

            <div className="editor-toolbar-dropdown-section">Font Family</div>
            <div
              className={`editor-toolbar-dropdown-option ${fontFamily === "courier-prime" ? "active" : ""}`}
              onClick={() => setFontFamily("courier-prime")}
            >
              <span>Courier Prime</span>
              {fontFamily === "courier-prime" && <Check size={14} />}
            </div>
            <div
              className={`editor-toolbar-dropdown-option ${fontFamily === "courier-prime-sans" ? "active" : ""}`}
              onClick={() => setFontFamily("courier-prime-sans")}
            >
              <span>Courier Prime Sans</span>
              {fontFamily === "courier-prime-sans" && <Check size={14} />}
            </div>

            <div className="editor-toolbar-dropdown-divider" />

            <div className="editor-toolbar-dropdown-section">Paper Size</div>
            <div
              className={`editor-toolbar-dropdown-option ${paperSize === "letter" ? "active" : ""}`}
              onClick={() => setPaperSize("letter")}
            >
              <span>US Letter</span>
              {paperSize === "letter" && <Check size={14} />}
            </div>
            <div
              className={`editor-toolbar-dropdown-option ${paperSize === "a4" ? "active" : ""}`}
              onClick={() => setPaperSize("a4")}
            >
              <span>A4</span>
              {paperSize === "a4" && <Check size={14} />}
            </div>
            <div className="editor-toolbar-dropdown-divider" />

            <div className="editor-toolbar-dropdown-section">Appearance</div>
            <div
              className="editor-toolbar-dropdown-option"
              onClick={() => {
                setShowSettings(false);
                onOpenThemeModal();
              }}
            >
              <span>Theme</span>
            </div>

            <div className="editor-toolbar-dropdown-divider" />

            <div className="editor-toolbar-dropdown-section">Zoom</div>
            <div
              className="editor-toolbar-dropdown-option"
              onClick={() => setZoomLevel(100)}
            >
              <span>Reset Zoom ({zoomLevel}%)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export interface MainLayoutProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  isPaletteOpen: boolean;
  setIsPaletteOpen: (open: boolean) => void;
  onOpenThemeModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenStructureModal: () => void;
  onOpenExportModal: () => void;
  onOpenRevisionModal: () => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  isSidebarOpen,
  setIsSidebarOpen,
  isPaletteOpen,
  setIsPaletteOpen,
  onOpenThemeModal,
  onOpenSettingsModal,
  onOpenStructureModal,
  onOpenExportModal,
  onOpenRevisionModal,
}) => {
  const { isZenMode } = useUI();
 
  return (
    <>
      {!isZenMode && (
        <HeaderBar
          isPaletteOpen={isPaletteOpen}
          setIsPaletteOpen={setIsPaletteOpen}
          onOpenThemeModal={onOpenThemeModal}
          onOpenSettingsModal={onOpenSettingsModal}
          onOpenStructureModal={onOpenStructureModal}
          onOpenExportModal={onOpenExportModal}
          onOpenRevisionModal={onOpenRevisionModal}
          isSidebarOpen={isSidebarOpen}
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />
      )}
      <Workspace
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        onOpenThemeModal={onOpenThemeModal}
      />
    </>
  );
};
