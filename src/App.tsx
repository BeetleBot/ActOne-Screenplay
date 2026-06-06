import { useState, useCallback } from "react";
import { AppProviders } from "./context/AppProviders";
import { useFile } from "./context/FileContext";
import { useUI } from "./context/UIContext";
import { useEditor } from "./context/EditorContext";
import { ThemeProvider } from "./context/ThemeContext";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useNativeAppBehavior } from "./hooks/useNativeAppBehavior";
import { MainLayout } from "./components/layout/MainLayout";
import { ModalManager } from "./components/ModalManager";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { WindowResizeHandles } from "./components/WindowResizeHandles";

function AppInner() {
  useNativeAppBehavior();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showStructureModal, setShowStructureModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showTitlePageModal, setShowTitlePageModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const { newFile, openFile, saveFile, saveFileAs, closeFile, activeFileId, files } = useFile();
  const { editorView } = useEditor();
  const {
    showTimeline,
    setShowTimeline,
    zoomLevel,
    setZoomLevel,
    isZenMode,
    setIsZenMode,
    showSearchPanel,
    setShowSearchPanel,
    hideFountainMarkupEnabled,
    setHideFountainMarkupEnabled
  } = useUI();

  const isModalActive = isPaletteOpen || showExportModal || showStructureModal || showThemeModal || showSettingsModal || showRevisionModal || showTitlePageModal || showHelpModal;

  useKeyboardShortcuts({
    newFile,
    openFile,
    saveFile,
    saveFileAs,
    closeFile: useCallback(() => closeFile(activeFileId), [closeFile, activeFileId]),
    togglePalette: useCallback(() => setIsPaletteOpen(prev => !prev), []),
    exportPDF: useCallback(() => setShowExportModal(true), []),
    toggleSidebar: useCallback(() => setIsSidebarOpen(prev => !prev), []),
    toggleTimeline: useCallback(() => setShowTimeline(!showTimeline), [showTimeline, setShowTimeline]),
    toggleZenMode: useCallback(() => setIsZenMode(!isZenMode), [isZenMode, setIsZenMode]),
    getEditorView: useCallback(() => editorView, [editorView]),
    zoomIn: useCallback(() => setZoomLevel(zoomLevel + 10), [zoomLevel, setZoomLevel]),
    zoomOut: useCallback(() => setZoomLevel(zoomLevel - 10), [zoomLevel, setZoomLevel]),
    resetZoom: useCallback(() => setZoomLevel(100), [setZoomLevel]),
    openSettings: useCallback(() => setShowSettingsModal(true), []),
    toggleSearch: useCallback(() => setShowSearchPanel(!showSearchPanel), [showSearchPanel, setShowSearchPanel]),
    toggleHideMarkup: useCallback(() => setHideFountainMarkupEnabled(!hideFountainMarkupEnabled), [hideFountainMarkupEnabled, setHideFountainMarkupEnabled]),
    isDisabled: isModalActive,
  });

  if (files.length === 0) {
    return (
      <>
        <WindowResizeHandles showDragHandle />
        <WelcomeScreen />
      </>
    );
  }

  return (
    <>
      <WindowResizeHandles />
      <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <MainLayout
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        isPaletteOpen={isPaletteOpen}
        setIsPaletteOpen={setIsPaletteOpen}
        onOpenThemeModal={() => setShowThemeModal(true)}
        onOpenSettingsModal={() => setShowSettingsModal(true)}
        onOpenStructureModal={() => setShowStructureModal(true)}
        onOpenExportModal={() => setShowExportModal(true)}
        onOpenRevisionModal={() => setShowRevisionModal(true)}
        onOpenTitlePageModal={() => setShowTitlePageModal(true)}
        onOpenHelpModal={() => setShowHelpModal(true)}
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
        showRevisionModal={showRevisionModal}
        setShowRevisionModal={setShowRevisionModal}
        showTitlePageModal={showTitlePageModal}
        setShowTitlePageModal={setShowTitlePageModal}
        showHelpModal={showHelpModal}
        setShowHelpModal={setShowHelpModal}
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />
    </div>
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
