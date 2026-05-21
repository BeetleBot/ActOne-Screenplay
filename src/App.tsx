import React, { useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ScreenplayProvider, useScreenplay } from "./context/ScreenplayContext";
import { FountainEditor } from "./components/FountainEditor";
import { SidebarViews } from "./components/SidebarViews";
import { ScreenplayPreview } from "./components/ScreenplayPreview";
import { IndexCardsWorkspace } from "./components/IndexCardsWorkspace";
import { TimelineView } from "./components/TimelineView";
import { PluginManagerProvider } from "./plugins/PluginManager";
import {
  List,
  FileText,
  User,
  BarChart2,
  Minus,
  Square,
  X,
  Eye,
  LayoutGrid,
  Settings,
  PanelLeft,
  Check,
  Plus
} from "lucide-react";
import { MenuBar } from "./components/MenuBar";
import { ExportModal } from "./components/ExportModal";

const getTauriWindow = () => {
  if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
    return getCurrentWindow();
  }
  return null;
};

const Titlebar: React.FC = () => {
  const { filePath, isSaving, showTabBar, setShowTabBar, openTabBarManually } = useScreenplay();
  const [showExportModal, setShowExportModal] = useState(false);

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

  const displayPath = filePath ? filePath.split(/[/\\]/).pop() : "Untitled.fountain";

  return (
    <>
      <div className="titlebar" data-tauri-drag-region>
        <MenuBar onExportPDF={() => setShowExportModal(true)} />
        
        <button 
          className="titlebar-title-button"
          onClick={(e) => {
            e.stopPropagation();
            if (showTabBar) {
              setShowTabBar(false);
            } else {
              openTabBarManually();
            }
          }}
          title="Click to show open files"
        >
          <span className="title-text">{displayPath}</span>
          <span className="title-arrow">▾</span>
          {isSaving && <span className="title-saving">(Saving...)</span>}
        </button>

        <div className="titlebar-actions">
          <div className="window-controls-windows">
            <button className="window-btn-windows minimize" onClick={handleMinimize} title="Minimize">
              <Minus size={16} strokeWidth={2} />
            </button>
            <button className="window-btn-windows maximize" onClick={handleMaximize} title="Maximize">
              <Square size={13} strokeWidth={2} />
            </button>
            <button className="window-btn-windows close" onClick={handleClose} title="Close">
              <X size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
      {showExportModal && <ExportModal onClose={() => setShowExportModal(false)} />}
    </>
  );
};

const Workspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("outline");
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const { paperSize, workspaceMode } = useScreenplay();

  return (
    <div className="app-workspace">
      {isSidebarOpen && (
        <div className="sidebar">
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
      )}

      <div className="editor-container">
        <div className="editor-header-bar">
          <EditorToolbarLeft toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />
          <EditorToolbar />
        </div>
        <div className="editor-scroll-area">
          {workspaceMode === "editor" && (
            <div className={`editor-paper paper-${paperSize}`}>
              <FountainEditor />
            </div>
          )}
          {workspaceMode === "preview" && (
            <ScreenplayPreview />
          )}
          {workspaceMode === "cards" && (
            <IndexCardsWorkspace />
          )}
        </div>
        <TimelineView />
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

const EditorToolbar: React.FC = () => {
  const { fontFamily, setFontFamily, paperSize, setPaperSize, typewriterMode, setTypewriterMode, workspaceMode, setWorkspaceMode } = useScreenplay();
  const [isDark, setIsDark] = React.useState(() => document.body.classList.contains("dark-theme"));
  const [showSettings, setShowSettings] = React.useState(false);
  const settingsRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isDark) {
      document.body.classList.add("dark-theme");
    } else {
      document.body.classList.remove("dark-theme");
    }
  }, [isDark]);

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
        className={`editor-toolbar-btn ${workspaceMode === "preview" ? "active" : ""}`} 
        title="Preview"
        onClick={() => setWorkspaceMode(workspaceMode === "preview" ? "editor" : "preview")}
      >
        <Eye size={18} strokeWidth={1.5} />
      </button>
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
            <div className="editor-toolbar-dropdown-section">Theme</div>
            <div 
              className={`editor-toolbar-dropdown-option ${isDark ? "active" : ""}`}
              onClick={() => setIsDark(!isDark)}
            >
              <span>Dark Mode</span>
              {isDark && <Check size={14} />}
            </div>

            <div className="editor-toolbar-dropdown-divider" />

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
          </div>
        )}
      </div>
    </div>
  );
};

const FloatingTabs: React.FC = () => {
  const { 
    files, 
    activeFileId, 
    selectFile, 
    newFile, 
    closeFile, 
    showTabBar, 
    setShowTabBar
  } = useScreenplay();

  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!showTabBar) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowTabBar(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showTabBar]);

  if (!showTabBar) return null;

  return (
    <div className="floating-tabs-container" ref={containerRef}>
      {files.map((file) => {
        const display = file.filePath ? file.filePath.split(/[/\\]/).pop() : "Untitled.fountain";
        const isActive = file.id === activeFileId;
        return (
          <div
            key={file.id}
            className={`floating-tab ${isActive ? "active" : ""} ${file.isDirty ? "dirty" : ""}`}
            onClick={() => {
              selectFile(file.id);
            }}
          >
            <span className="floating-tab-name">{display}</span>
            <span className="floating-tab-status-dot" />
            <button
              className="floating-tab-close"
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
        className="floating-tab-new"
        onClick={(e) => {
          e.stopPropagation();
          newFile();
        }}
        title="New File"
      >
        <Plus size={14} />
      </button>
    </div>
  );
};

function App() {
  return (
    <ScreenplayProvider>
      <PluginManagerProvider>
        <Titlebar />
        <FloatingTabs />
        <Workspace />
      </PluginManagerProvider>
    </ScreenplayProvider>
  );
}

export default App;
