import { useState, useCallback } from "react";
import { AppProviders } from "./context/AppProviders";
import { useFile } from "./context/FileContext";
import { useUI } from "./context/UIContext";
import { useEditor } from "./context/EditorContext";
import { ThemeProvider } from "./context/ThemeContext";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { MainLayout } from "./components/layout/MainLayout";
import { ModalManager } from "./components/ModalManager";

function AppInner() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showStructureModal, setShowStructureModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  
  const { newFile, openFile, saveFile, saveFileAs } = useFile();
  const { editorView } = useEditor();
  const { showTimeline, setShowTimeline, zoomLevel, setZoomLevel } = useUI();

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
  });

  return (
    <>
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
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />
    </>
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
