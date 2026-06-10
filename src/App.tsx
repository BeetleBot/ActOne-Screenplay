import { useState, useCallback, useEffect, useRef } from "react";
import { AppProviders } from "./context/AppProviders";
import { useFile } from "./context/FileContext";
import { useUI } from "./context/UIContext";
import { useEditor } from "./context/EditorContext";
import { ThemeProvider } from "./context/ThemeContext";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useNativeAppBehavior } from "./hooks/useNativeAppBehavior";
import { MainLayout } from "./components/layout/MainLayout";
import { ModalManager } from "./components/ModalManager";
import { WelcomeScreenWindow } from "./components/WelcomeScreen";
import { WindowResizeHandles } from "./components/WindowResizeHandles";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { SprintProvider } from "./context/SprintContext";

const params = new URLSearchParams(window.location.search);
const action = params.get("action");
const isEditorWindow = action === "new" || action === "open" || action === "template";

function AppInner() {
  useNativeAppBehavior();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showStructureModal, setShowStructureModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showTitlePageModal, setShowTitlePageModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);

  const { newFile, openFile, saveFile, saveFileAs, closeFile, activeFileId, files, openFilePath } = useFile();
  const { editorView } = useEditor();
  const {
    zoomLevel,
    setZoomLevel,
    appScale,
    isZenMode,
    setIsZenMode,
    showSearchPanel,
    setShowSearchPanel,
    hideFountainMarkupEnabled,
    setHideFountainMarkupEnabled
  } = useUI();

  const isModalActive = isPaletteOpen || showExportModal || showStructureModal || showSettingsModal || showRevisionModal || showTitlePageModal || showHelpModal || showBreakdownModal;

  useKeyboardShortcuts({
    newFile,
    openFile,
    saveFile,
    saveFileAs,
    closeFile: useCallback(() => closeFile(activeFileId), [closeFile, activeFileId]),
    togglePalette: useCallback(() => setIsPaletteOpen(prev => !prev), []),
    exportPDF: useCallback(() => setShowExportModal(true), []),
    toggleSidebar: useCallback(() => setIsSidebarOpen(prev => !prev), []),
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

  // Editor window: handle the action param on mount (once only)
  const initialActionHandled = useRef(false);
  useEffect(() => {
    if (!isEditorWindow || initialActionHandled.current) return;
    initialActionHandled.current = true;

    if (action === "new") {
      newFile();
      localStorage.removeItem("pending-action");
    } else if (action === "open") {
      const path = localStorage.getItem("pending-open-path");
      localStorage.removeItem("pending-open-path");
      localStorage.removeItem("pending-action");
      if (path) openFilePath(path);
    } else if (action === "template") {
      newFile();
      setShowStructureModal(true);
      localStorage.removeItem("pending-action");
    }
  }, []);

  // Editor window: detect transition from >0 files to 0 files → reopen welcome
  const prevFilesLength = useRef(0);
  useEffect(() => {
    if (!isEditorWindow) return;
    const prev = prevFilesLength.current;
    prevFilesLength.current = files.length;
    if (prev > 0 && files.length === 0) {
      reopenWelcomeWindow();
    }
  }, [files.length]);

  const reopenWelcomeWindow = async () => {
    try {
      const webview = new WebviewWindow("welcome", {
        url: "/",
        width: 600,
        height: 540,
        center: true,
        decorations: false,
        resizable: false,
      });
      await Promise.race([
        new Promise<void>((resolve) => webview.once("tauri://created", () => resolve())),
        new Promise<void>((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
      ]);
      await getCurrentWindow().close();
    } catch (e) {
      console.error("Failed to reopen welcome window:", e);
    }
  };

  // Standalone welcome window
  if (!isEditorWindow && files.length === 0) {
    return (
      <>
        <WindowResizeHandles resizeEnabled={false} showDragHandle />
        <WelcomeScreenWindow standalone />
      </>
    );
  }

  // Editor window — will close and reopen welcome via useEffect when files hit 0
  if (files.length === 0) {
    return null;
  }

  return (
    <>
      <WindowResizeHandles />
      <div style={{ height: "100%", display: "flex", flexDirection: "column", zoom: `${appScale}%` }}>
        <MainLayout
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          onOpenSettingsModal={() => setShowSettingsModal(true)}
          onOpenPalette={() => setIsPaletteOpen(true)}
          onOpenBreakdownModal={() => setShowBreakdownModal(true)}
        />
      <ModalManager
        isPaletteOpen={isPaletteOpen}
        setIsPaletteOpen={setIsPaletteOpen}
        showExportModal={showExportModal}
        setShowExportModal={setShowExportModal}
        showStructureModal={showStructureModal}
        setShowStructureModal={setShowStructureModal}
        showSettingsModal={showSettingsModal}
        setShowSettingsModal={setShowSettingsModal}
        showRevisionModal={showRevisionModal}
        setShowRevisionModal={setShowRevisionModal}
        showTitlePageModal={showTitlePageModal}
        setShowTitlePageModal={setShowTitlePageModal}
        showHelpModal={showHelpModal}
        setShowHelpModal={setShowHelpModal}
        showBreakdownModal={showBreakdownModal}
        setShowBreakdownModal={setShowBreakdownModal}
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />
    </div>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppProviders>
          <SprintProvider>
            <AppInner />
          </SprintProvider>
        </AppProviders>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
