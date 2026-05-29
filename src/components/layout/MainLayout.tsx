import React, { useState, useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useFile } from "../../context/FileContext";
import { useUI } from "../../context/UIContext";
import { useEditor } from "../../context/EditorContext";
import { FountainEditor } from "../FountainEditor";
import { SidebarViews } from "../SidebarViews";
import { IndexCardsWorkspace } from "../IndexCardsWorkspace";
import { TimelineView } from "../TimelineView";

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
  PanelLeft,
  Check,
  Plus,
  Search
} from "lucide-react";

const getTauriWindow = () => {
  if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
    return getCurrentWindow();
  }
  return null;
};

const HeaderBar: React.FC<{
  isPaletteOpen: boolean;
  setIsPaletteOpen: (open: boolean) => void;
}> = ({
  isPaletteOpen,
  setIsPaletteOpen,
}) => {
  const { files, activeFileId, selectFile, newFile, closeFile } = useFile();
  const { useNativeTitleBar } = useUI();
  const tabsContainerRef = useRef<HTMLDivElement>(null);

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
          win.unmaximize();
        } else {
          win.maximize();
        }
      }
    } catch (e) {
      console.log("Maximize clicked");
    }
  };

  // Scroll active tab into view
  useEffect(() => {
    const activeTab = tabsContainerRef.current?.querySelector(".header-tab.active");
    if (activeTab) {
      activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeFileId]);

  return (
    <div className={`header-bar ${useNativeTitleBar ? 'native-decorations' : ''}`} data-tauri-drag-region>
      <div className="header-left">
        <button 
          className="header-icon-btn" 
          onClick={() => setIsPaletteOpen(!isPaletteOpen)}
          title="Command Palette (Ctrl+K)"
        >
          <Search size={18} strokeWidth={2} />
        </button>
      </div>

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

      {!useNativeTitleBar && (
        <div className="header-right window-controls-windows">
          <button className="window-btn-windows minimize" onClick={handleMinimize} title="Minimize">
            <Minus size={10} strokeWidth={2.5} />
          </button>
          <button className="window-btn-windows maximize" onClick={handleMaximize} title="Maximize">
            <Square size={8} strokeWidth={2.5} />
          </button>
          <button className="window-btn-windows close" onClick={handleClose} title="Close">
            <X size={10} strokeWidth={2.5} />
          </button>
        </div>
      )}
    </div>
  );
};

const Workspace: React.FC<{ isSidebarOpen: boolean; setIsSidebarOpen: (open: boolean) => void; onOpenThemeModal: () => void }> = ({ isSidebarOpen, setIsSidebarOpen, onOpenThemeModal }) => {
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
      const newWidth = Math.max(200, Math.min(e.clientX, 800));
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
      {isSidebarOpen && (
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
            <div className="sidebar-tabs">
              <button
                className={`sidebar-tab-btn ${activeTab === "outline" ? "active" : ""}`}
                onClick={() => setActiveTab("outline")}
                title="Outline"
              >
                <List size={16} />
              </button>
              <button
                className={`sidebar-tab-btn ${activeTab === "notepad" ? "active" : ""}`}
                onClick={() => setActiveTab("notepad")}
                title="Notepad"
              >
                <FileText size={16} />
              </button>
              <button
                className={`sidebar-tab-btn ${activeTab === "characters" ? "active" : ""}`}
                onClick={() => setActiveTab("characters")}
                title="Characters"
              >
                <User size={16} />
              </button>
              <button
                className={`sidebar-tab-btn ${activeTab === "stats" ? "active" : ""}`}
                onClick={() => setActiveTab("stats")}
                title="Statistics"
              >
                <BarChart2 size={16} />
              </button>
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
        {!isZenMode && (
          <div className="editor-header-bar">
            <EditorToolbarLeft toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />
            <EditorToolbar onOpenThemeModal={onOpenThemeModal} />
          </div>
        )}
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

const EditorToolbarLeft: React.FC<{ toggleSidebar: () => void, isSidebarOpen: boolean }> = ({ toggleSidebar, isSidebarOpen }) => {
  return (
    <div className="editor-toolbar-left">
      <button 
        className={`editor-toolbar-btn ${isSidebarOpen ? 'active' : ''}`} 
        title="Toggle Sidebar"
        onClick={toggleSidebar}
      >
        <PanelLeft size={18} strokeWidth={1.5} />
      </button>
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
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  isSidebarOpen,
  setIsSidebarOpen,
  isPaletteOpen,
  setIsPaletteOpen,
  onOpenThemeModal,
}) => {
  const { isZenMode } = useUI();

  return (
    <>
      {!isZenMode && (
        <HeaderBar 
          isPaletteOpen={isPaletteOpen}
          setIsPaletteOpen={setIsPaletteOpen}
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
