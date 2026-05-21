import React, { useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ScreenplayProvider, useScreenplay } from "./context/ScreenplayContext";
import { FountainEditor } from "./components/FountainEditor";
import { SidebarViews } from "./components/SidebarViews";
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
  Check
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
  const { filePath, isSaving } = useScreenplay();
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
        
        <div className="titlebar-title">
          {displayPath} {isSaving && "(Saving...)"}
        </div>

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
  const { paperSize } = useScreenplay();

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
        <EditorToolbarLeft toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />
        <EditorToolbar />
        <div className="editor-scroll-area">
          <div className={`editor-paper paper-${paperSize}`}>
            <FountainEditor />
          </div>
        </div>
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
  const { fontFamily, setFontFamily, paperSize, setPaperSize } = useScreenplay();
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
      <button className="editor-toolbar-btn" title="Preview">
        <Eye size={18} strokeWidth={1.5} />
      </button>
      <button className="editor-toolbar-btn" title="Index Cards">
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

function App() {
  return (
    <ScreenplayProvider>
      <Titlebar />
      <Workspace />
    </ScreenplayProvider>
  );
}

export default App;
