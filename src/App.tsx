import { useState, useCallback, useEffect, useRef } from "react";
import { AppProviders, useFile, useUI, useEditor, ThemeProvider, SprintProvider, useCustomModal } from "./context";
import { useKeyboardShortcuts, useNativeAppBehavior, useModals } from "./hooks";
import { MainLayout, ModalManager, WelcomeScreenWindow, WindowResizeHandles, ErrorBoundary } from "./components";

const params = new URLSearchParams(window.location.search);
const action = params.get("action");
const isEditorWindow = action === "new" || action === "open" || action === "template";

function AppInner() {
  useNativeAppBehavior();
  const { confirm } = useCustomModal();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const {
    isModalActive, isPaletteOpen, showExportModal, showStructureModal,
    showSettingsModal, showRevisionModal, showTitlePageModal, showHelpModal,
    showBreakdownModal, showThemeManagerModal,
    setIsPaletteOpen, setShowExportModal, setShowStructureModal,
    setShowSettingsModal, setShowRevisionModal, setShowTitlePageModal,
    setShowHelpModal, setShowBreakdownModal, setShowThemeManagerModal,
    togglePalette
  } = useModals();

  const { newFile, openFile, saveFile, saveFileAs, closeFile, selectFile, activeFileId, files, openFilePath } = useFile();
  const { editorView, cleanExtraSpace } = useEditor();
  const {
    zoomLevel,
    setZoomLevel,
    appScale,
    isZenMode,
    setIsZenMode,
    showSearchPanel,
    setShowSearchPanel,
  } = useUI();

  useKeyboardShortcuts({
    newFile,
    openFile,
    saveFile,
    saveFileAs,
    closeFile: useCallback(() => closeFile(activeFileId), [closeFile, activeFileId]),
    togglePalette,
    exportPDF: useCallback(() => setShowExportModal(true), []),
    toggleSidebar: useCallback(() => setIsSidebarOpen(prev => !prev), []),
    toggleZenMode: useCallback(() => setIsZenMode(!isZenMode), [isZenMode, setIsZenMode]),
    getEditorView: useCallback(() => editorView, [editorView]),
    zoomIn: useCallback(() => setZoomLevel(zoomLevel + 10), [zoomLevel, setZoomLevel]),
    zoomOut: useCallback(() => setZoomLevel(zoomLevel - 10), [zoomLevel, setZoomLevel]),
    resetZoom: useCallback(() => setZoomLevel(100), [setZoomLevel]),
    openSettings: useCallback(() => setShowSettingsModal(true), []),
    toggleSearch: useCallback(() => setShowSearchPanel(!showSearchPanel), [showSearchPanel, setShowSearchPanel]),
    cleanExtraSpace,
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

  // Listen for OS file open events (from Rust backend)
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    const setup = async () => {
      try {
        const { listen } = await import("@tauri-apps/api/event");
        unlisten = await listen<string[]>("file-opened", (event) => {
          const paths = event.payload;
          if (!paths || paths.length === 0) return;
          // In editor window, open files directly
          for (const p of paths) {
            openFilePath(p);
          }
        });
      } catch {}
    };
    if (files.length > 0) setup();
    return () => { if (unlisten) unlisten(); };
  }, [openFilePath, files.length]);

  const filesRef = useRef(files);
  const saveFileRef = useRef(saveFile);
  const selectFileRef = useRef(selectFile);
  const confirmRef = useRef(confirm);

  useEffect(() => {
    filesRef.current = files;
    saveFileRef.current = saveFile;
    selectFileRef.current = selectFile;
    confirmRef.current = confirm;
  }, [files, saveFile, selectFile, confirm]);

  const isExitingRef = useRef(false);

  // Listen for window close requests to prevent closing if there are dirty files
  useEffect(() => {
    if (!isEditorWindow) return;
    let unlisten: (() => void) | undefined;
    
    const handleCloseRequest = async () => {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const win = getCurrentWindow();
        const dirtyFiles = filesRef.current.filter(f => f.isDirty);
        if (dirtyFiles.length > 0) {
          // Ask for confirmation
          const confirmClose = await confirmRef.current({
            title: "Unsaved Changes",
            message: `You have unsaved changes in ${dirtyFiles.length} file(s). Do you want to save your changes before exiting?`,
            buttons: [
              { value: "save", label: "Save & Exit", variant: "contained", color: "primary" },
              { value: "discard", label: "Close Anyway", variant: "outlined", color: "error" },
              { value: "cancel", label: "Cancel", variant: "text", color: "inherit" }
            ]
          });
          
          if (confirmClose === "save") {
            let aborted = false;
            for (const f of dirtyFiles) {
              selectFileRef.current(f.id);
              await saveFileRef.current();
              const check = filesRef.current.find(file => file.id === f.id);
              if (check?.isDirty) {
                aborted = true;
                break;
              }
            }
            if (!aborted) {
              isExitingRef.current = true;
              await win.close();
            }
          } else if (confirmClose === "discard") {
            isExitingRef.current = true;
            await win.close();
          }
        } else {
          // No dirty files, close immediately
          isExitingRef.current = true;
          await win.close();
        }
      } catch (e) {
        console.error("Error in close handler:", e);
      }
    };

    const setupCloseListener = async () => {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const win = getCurrentWindow();
        unlisten = await win.onCloseRequested((event) => {
          if (isExitingRef.current) return;
          // Always prevent default close synchronously to prevent the window event loop from crashing
          event.preventDefault();
          handleCloseRequest();
        });
      } catch (e) {
        console.error("Failed to setup close handler:", e);
      }
    };
    setupCloseListener();
    return () => { if (unlisten) unlisten(); };
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
      const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      
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
      
      const win = getCurrentWindow();
      await win.destroy();
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
          onOpenThemeManagerModal={() => setShowThemeManagerModal(true)}
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
        showThemeManagerModal={showThemeManagerModal}
        setShowThemeManagerModal={setShowThemeManagerModal}
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
