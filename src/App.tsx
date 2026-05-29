import { useState, useCallback } from "react";
import { AppProviders } from "./context/AppProviders";
import { useFile } from "./context/FileContext";
import { useUI } from "./context/UIContext";
import { useEditor } from "./context/EditorContext";
import { ThemeProvider } from "./context/ThemeContext";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { MainLayout } from "./components/layout/MainLayout";
import { ModalManager } from "./components/ModalManager";
import { WelcomeModal } from "./components/WelcomeModal";

function AppInner() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showStructureModal, setShowStructureModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  const { newFile, openFile, saveFile, saveFileAs } = useFile();
  const { editorView } = useEditor();
  const { showTimeline, setShowTimeline, zoomLevel, setZoomLevel, showWelcome, setShowWelcome } = useUI();

  const isModalActive = isPaletteOpen || showExportModal || showStructureModal || showThemeModal || showSettingsModal || showWelcome;

  useKeyboardShortcuts({
    newFile,
    openFile,
    saveFile,
    saveFileAs,
    togglePalette: useCallback(() => setIsPaletteOpen(prev => !prev), []),
    exportPDF: useCallback(() => setShowExportModal(true), []),
    toggleSidebar: useCallback(() => setIsSidebarOpen(prev => !prev), []),
    toggleTimeline: useCallback(() => setShowTimeline(!showTimeline), [showTimeline, setShowTimeline]),
    getEditorView: useCallback(() => editorView, [editorView]),
    zoomIn: useCallback(() => setZoomLevel(zoomLevel + 10), [zoomLevel, setZoomLevel]),
    zoomOut: useCallback(() => setZoomLevel(zoomLevel - 10), [zoomLevel, setZoomLevel]),
    resetZoom: useCallback(() => setZoomLevel(100), [setZoomLevel]),
    openSettings: useCallback(() => setShowSettingsModal(true), []),
    isDisabled: isModalActive,
  });

  if (showWelcome) {
    return (
      <div className="welcome-screen-root" style={{ height: "100vh", width: "100vw", background: "var(--bg-app)" }}>
        <WelcomeModal isOpen={true} onClose={() => setShowWelcome(false)} />
      </div>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <MainLayout 
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        isPaletteOpen={isPaletteOpen}
        setIsPaletteOpen={setIsPaletteOpen}
        onOpenThemeModal={() => setShowThemeModal(true)}
      />
      <ModalManager
        isPaletteOpen={isPaletteOpen}
        setIsPaletteOpen={setIsPaletteOpen}
        showExportModal={showExportModal}
        setShowExportModal={setShowExportModal}
        showStructureModal={showStructureModal}
        setShowStructureModal={setShowStructureModal}
        showThemeModal={showThemeModal}
        setShowThemeModal={setShowThemeModal}
        showSettingsModal={showSettingsModal}
        setShowSettingsModal={setShowSettingsModal}
        showWelcome={showWelcome}
        setShowWelcome={setShowWelcome}
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppProviders>
        <AppInner />
      </AppProviders>
    </ThemeProvider>
  );
}

export default App;
