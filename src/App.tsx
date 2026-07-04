import { useState, useCallback, useEffect, useRef } from "react";
import { AppProviders, useFile, useUI, useEditor, ThemeProvider, SprintProvider, useCustomModal } from "./context";
import { useKeyboardShortcuts, useNativeAppBehavior, useModals, useModalWindows } from "./hooks";
import { MainLayout, ModalManager, WelcomeScreenWindow, WindowResizeHandles, ErrorBoundary } from "./components";
import { logger } from "./utils/logger";
import { FolderOpenIcon, DescriptionIcon } from "./components/Icons";
import { STORAGE_KEYS } from "./constants";
import { setPrefs } from "./theme/AppPrefsEngine";
import { getPerScriptSettingObject, updatePerScriptSetting } from "./utils/perScriptSettings";

const params = new URLSearchParams(window.location.search);
const action = params.get("action");
const isEditorWindow = action === "new" || action === "open" || action === "template";
const modalParam = params.get("modal");
const isModalWindow = modalParam === "settings" || modalParam === "help" || modalParam === "tag-manager" || modalParam === "theme-manager" || modalParam === "xray";

function AppInner() {
  const { newFile, openFile, saveFile, saveFileAs, closeFile, selectFile, activeFileId, files, openFilePath, parsedDoc, scriptFileName } = useFile();
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const { confirm } = useCustomModal();

  const isStandalone = !isEditorWindow;

  const handleDropFiles = useCallback((paths: string[]) => {
    if (isStandalone) {
      const path = paths[0];
      if (!path) return;
      localStorage.setItem("pending-open-path", path);
      localStorage.setItem("pending-action", "open");
      (async () => {
        try {
          const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
          const { getCurrentWindow } = await import("@tauri-apps/api/window");
          const webview = new WebviewWindow("main", {
            url: "/?action=open",
            title: "ActOne",
            width: 1000,
            height: 700,
            decorations: false,
          });
          await Promise.race([
            new Promise<void>((resolve) => webview.once("tauri://created", () => resolve())),
            new Promise<void>((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
          ]);
          await getCurrentWindow().close();
        } catch { void 0; }
      })();
    } else {
      paths.forEach((p) => openFilePath(p));
    }
  }, [isStandalone, openFilePath]);

  useNativeAppBehavior(handleDropFiles, setIsDraggingOver);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const {
    isModalActive, isPaletteOpen, showExportModal, showStructureModal,
    showTitlePageModal,
    setIsPaletteOpen, setShowExportModal, setShowStructureModal,
    setShowTitlePageModal,
    togglePalette
  } = useModals();

  const { editorView, cleanExtraSpace, updateSettings } = useEditor();
  const {
    zoomLevel,
    setZoomLevel,
    appScale,
    isZenMode,
    setIsZenMode,
    activeRightPane,
    setActiveRightPane,
    activeTab,
    setActiveTab,
  } = useUI();

  const modalWindows = useModalWindows();
  const closeAllWindowsRef = useRef(modalWindows.closeAllWindows);
  closeAllWindowsRef.current = modalWindows.closeAllWindows;

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
    openSettings: useCallback(() => { modalWindows.openSettingsWindow(); }, [modalWindows]),
    openHelp: useCallback(() => { modalWindows.openHelpWindow(); }, [modalWindows]),
    toggleSearch: useCallback(() => setActiveRightPane(activeRightPane === "search" ? null : "search"), [activeRightPane, setActiveRightPane]),
    toggleSnapshotsPanel: useCallback(() => {
      if (isSidebarOpen && activeTab === "snapshots") {
        setIsSidebarOpen(false);
      } else {
        setActiveTab("snapshots");
        setIsSidebarOpen(true);
      }
    }, [isSidebarOpen, activeTab, setActiveTab, setIsSidebarOpen]),
    cleanExtraSpace,
    isDisabled: isModalActive,
  });

  // Microsoft Store license verification check
  useEffect(() => {
    async function verifyLicense() {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const isLicenseActive = await invoke<boolean>("check_microsoft_store_license");
        if (!isLicenseActive) {
          await confirm({
            title: "License Verification Failed",
            message: "This copy of ActOne did not pass Microsoft Store license validation. Please uninstall this application and download it again from the official Microsoft Store.",
            buttons: [{ value: "exit", label: "Close Application", variant: "contained", color: "error" }]
          });
          try {
            const { getCurrentWindow } = await import("@tauri-apps/api/window");
            await getCurrentWindow().close();
          } catch {
            window.close();
          }
        }
      } catch (error) {
        logger.error("app", "Failed to query Microsoft Store license:", error);
      }
    }
    
    const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
    if (isTauri) {
      verifyLicense();
    }
  }, [confirm]);

  useEffect(() => {
    const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
    if (!isTauri) return;

    let unlisteners: (() => void)[] = [];

    const setup = async () => {
      try {
        const { listen, emit } = await import("@tauri-apps/api/event");
        const { EditorView } = await import("@codemirror/view");

        const u1 = await listen("modal:settings:ready", () => {
          emit("modal:settings:init", {
            themeId: localStorage.getItem(STORAGE_KEYS.THEME_ID) ?? "light",
            fontFamily: localStorage.getItem(STORAGE_KEYS.FONT_FAMILY) ?? "courier-prime-sans",
            paperSize: localStorage.getItem(STORAGE_KEYS.PAPER_SIZE) ?? "a4",
            typewriterMode: localStorage.getItem(STORAGE_KEYS.TYPEWRITER_MODE) === "true",
            zoomLevel: parseInt(localStorage.getItem(STORAGE_KEYS.ZOOM_LEVEL) ?? "100", 10),
            appScale: parseInt(localStorage.getItem(STORAGE_KEYS.APP_SCALE) ?? "100", 10),
            autocompleteEnabled: localStorage.getItem(STORAGE_KEYS.AUTOCOMPLETE_ENABLED) !== "false",
            smartQuotesEnabled: localStorage.getItem(STORAGE_KEYS.SMART_QUOTES_ENABLED) !== "false",
            matchParenthesesEnabled: localStorage.getItem(STORAGE_KEYS.MATCH_PARENTHESES_ENABLED) !== "false",
            autoSaveEnabled: localStorage.getItem(STORAGE_KEYS.AUTO_SAVE_ENABLED) !== "false",
            autoSaveInterval: parseInt(localStorage.getItem(STORAGE_KEYS.AUTO_SAVE_INTERVAL) ?? "60000", 10),
            hideSyntaxEnabled: localStorage.getItem(STORAGE_KEYS.HIDE_SYNTAX_ENABLED) === "true",
            lineFocusEnabled: localStorage.getItem(STORAGE_KEYS.LINE_FOCUS_ENABLED) === "true",
            snapshotsEnabled: localStorage.getItem(STORAGE_KEYS.SNAPSHOTS_ENABLED) === "true",
            snapshotLocation: localStorage.getItem(STORAGE_KEYS.SNAPSHOT_LOCATION) ?? "project",
            snapshotCustomPath: localStorage.getItem(STORAGE_KEYS.SNAPSHOT_CUSTOM_PATH) ?? "",
            snapshotAutoEnabled: localStorage.getItem(STORAGE_KEYS.SNAPSHOT_AUTO_ENABLED) === "true",
            snapshotAutoIntervalMinutes: parseInt(localStorage.getItem(STORAGE_KEYS.SNAPSHOT_AUTO_INTERVAL) ?? "15", 10),
            snapshotOnSave: localStorage.getItem(STORAGE_KEYS.SNAPSHOT_ON_SAVE) === "true",
            fountainColorsEnabled: localStorage.getItem(STORAGE_KEYS.FOUNTAIN_COLORS_ENABLED) !== "false",
            activeFilePath: activeFileIdRef.current || "",
          });
        });

        const u2 = await listen<{ key: string; value: string | boolean | number }>("modal:settings:update", (event) => {
          const { key, value } = event.payload;
          localStorage.setItem(key, String(value));
          window.dispatchEvent(new CustomEvent("settings-changed", { detail: { key, value } }));
          setPrefs({ [key]: String(value) });
        });

        const u3 = await listen("modal:tag-manager:ready", () => {
          const activeFile = filesRef.current.find(f => f.id === activeFileIdRef.current);
          const doc = parsedDocRef.current;
          const resolvedSet = {
            ...(doc?.settings || {}),
            productionTags: getPerScriptSettingObject("productionTags", doc?.settings, scriptFileNameRef.current, { tags: [], definitions: [] }),
          };
          emit("modal:tag-manager:init", {
            parsedDoc: { ...doc, settings: resolvedSet },
            filePath: activeFile?.filePath || "",
            activeScriptName: "",
          });
        });

        const u5 = await listen<{ pos: number }>("modal:tag-manager:scroll-to", (event) => {
          if (editorViewRef.current) {
            const ev = editorViewRef.current;
            ev.dispatch({
              selection: { anchor: event.payload.pos },
              effects: EditorView.scrollIntoView(event.payload.pos, { y: "center" }),
            });
            ev.focus();
          }
        });

        const u6 = await listen<{ action: string; defId?: string; newName?: string }>("modal:tag-manager:update-settings", (event) => {
          const { action, defId, newName } = event.payload;
          const sf = scriptFileNameRef.current;
          if (action === "rename" && newName) {
            updateSettingsRef.current((prev) => {
              const prevProdTags = getPerScriptSettingObject<{ tags: Array<{ range?: [number, number]; definitionId: string; type?: string; sceneId?: string }>; definitions: Array<{ id: string; name: string; type: string; colorOverride: string | null }> }>("productionTags", prev, sf, { tags: [], definitions: [] });
              const definitions = (prevProdTags.definitions || []).map((d) =>
                d.id === defId ? { ...d, name: newName } : d
              );
              return { ...prev, ...updatePerScriptSetting(prev, "productionTags", sf, { ...prevProdTags, definitions }) };
            });
          } else if (action === "delete") {
            updateSettingsRef.current((prev) => {
              const prevProdTags = getPerScriptSettingObject<{ tags: Array<{ range?: [number, number]; definitionId: string; type?: string; sceneId?: string }>; definitions: Array<{ id: string; name: string; type: string; colorOverride: string | null }> }>("productionTags", prev, sf, { tags: [], definitions: [] });
              const definitions = (prevProdTags.definitions || []).filter((d) => d.id !== defId);
              const tags = (prevProdTags.tags || []).filter((t) => t.definitionId !== defId);
              return { ...prev, ...updatePerScriptSetting(prev, "productionTags", sf, { tags, definitions }) };
            });
          } else if (action === "remove-all") {
            updateSettingsRef.current((prev) => {
              return { ...prev, ...updatePerScriptSetting(prev, "productionTags", sf, { tags: [], definitions: [] }) };
            });
          }
        });

        const u7 = await listen("modal:xray:ready", () => {
          emit("modal:xray:init", {
            parsedDoc: parsedDocRef.current,
            scriptFileName: scriptFileNameRef.current,
            settings: parsedDocRef.current?.settings || {},
          });
        });

        const u8 = await listen<{ characterName: string; profile: { gender?: string; [key: string]: unknown } }>("modal:xray:save-profile", (event) => {
          const { characterName, profile } = event.payload;
          const sf = scriptFileNameRef.current;
          updateSettingsRef.current((prev) => {
            const prevProfiles = getPerScriptSettingObject("characterProfiles", prev, sf, {});
            const updatedProfiles = {
              ...prevProfiles,
              [characterName]: profile,
            };

            const prevGenders = getPerScriptSettingObject("genders", prev, sf, {});
            const updatedGenders = {
              ...prevGenders,
              [characterName]: profile.gender || "unknown",
            };

            const updatedSettings = {
              ...prev,
              ...updatePerScriptSetting(prev, "characterProfiles", sf, updatedProfiles),
              ...updatePerScriptSetting(prev, "genders", sf, updatedGenders),
            };

            emit("modal:xray:init", {
              parsedDoc: parsedDocRef.current ? { ...parsedDocRef.current, settings: updatedSettings } : null,
              scriptFileName: sf,
              settings: updatedSettings,
            });

            return updatedSettings;
          });
        });

        const u9 = await listen<{ lineIndex: number }>("modal:xray:scroll-to-line", (event) => {
          if (editorViewRef.current) {
            const ev = editorViewRef.current;
            try {
              const line = ev.state.doc.line(event.payload.lineIndex + 1);
              ev.dispatch({
                selection: { anchor: line.from },
                effects: EditorView.scrollIntoView(line.from, { y: "center" }),
              });
              ev.focus();
            } catch (err) {
              console.error("Failed to scroll to scene line:", err);
            }
          }
        });

        unlisteners = [u1, u2, u3, u5, u6, u7, u8, u9].filter(Boolean) as (() => void)[];
      } catch (e) {
        logger.error("app", "Failed to set up modal event listeners:", e);
      }
    };

    setup();
    return () => { unlisteners.forEach(fn => fn()); };
  }, []);

  // Broadcast updates to the xray modal when parsedDoc or scriptFileName changes
  useEffect(() => {
    const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
    if (!isTauri) return;
    (async () => {
      try {
        const { emit } = await import("@tauri-apps/api/event");
        emit("modal:xray:init", {
          parsedDoc,
          scriptFileName,
          settings: parsedDoc?.settings || {},
        });
      } catch (e) {
        void e;
      }
    })();
  }, [parsedDoc, scriptFileName]);


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

    setTimeout(async () => {
      try {
        const { emit } = await import("@tauri-apps/api/event");
        emit("editor:ready", { action });
      } catch { void 0; }
    }, 100);
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
      } catch (e) { logger.error("app", "Failed to listen for file-opened events", e); }
    };
    if (files.length > 0) setup();
    return () => { if (unlisten) unlisten(); };
  }, [openFilePath, files.length]);

  const filesRef = useRef(files);
  const saveFileRef = useRef(saveFile);
  const selectFileRef = useRef(selectFile);
  const confirmRef = useRef(confirm);
  const editorViewRef = useRef(editorView);
  const parsedDocRef = useRef(parsedDoc);
  const updateSettingsRef = useRef(updateSettings);
  const activeFileIdRef = useRef(activeFileId);
  const scriptFileNameRef = useRef(scriptFileName);

  useEffect(() => {
    filesRef.current = files;
    saveFileRef.current = saveFile;
    selectFileRef.current = selectFile;
    confirmRef.current = confirm;
    editorViewRef.current = editorView;
    parsedDocRef.current = parsedDoc;
    updateSettingsRef.current = updateSettings;
    activeFileIdRef.current = activeFileId;
    scriptFileNameRef.current = scriptFileName;
  }, [files, saveFile, selectFile, confirm, editorView, parsedDoc, updateSettings, activeFileId, scriptFileName]);

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
              await closeAllWindowsRef.current();
              await win.close();
            }
          } else if (confirmClose === "discard") {
            isExitingRef.current = true;
            await closeAllWindowsRef.current();
            await win.close();
          }
        } else {
          // No dirty files, close immediately
          isExitingRef.current = true;
          await closeAllWindowsRef.current();
          await win.close();
        }
      } catch (e) {
        logger.error("app", "Error in close handler:", e);
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
        logger.error("app", "Failed to setup close handler:", e);
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

      await closeAllWindowsRef.current();

      const win = getCurrentWindow();
      await win.destroy();
    } catch (e) {
      logger.error("app", "Failed to reopen welcome window:", e);
    }
  };



  // Standalone welcome window (skip for modal windows)
  if (!isModalWindow && !isEditorWindow && files.length === 0) {
    return (
      <>
        <WindowResizeHandles resizeEnabled={false} showDragHandle />
        <ErrorBoundary name="welcome">
          <WelcomeScreenWindow standalone />
        </ErrorBoundary>
        {isDraggingOver && <DropOverlay />}
      </>
    );
  }

  // Editor window — will close and reopen welcome via useEffect when files hit 0
  if (!isModalWindow && files.length === 0) {
    return null;
  }

  return (
    <>
      <WindowResizeHandles />
      <div style={{ height: "100%", display: "flex", flexDirection: "column", zoom: `${appScale}%` }}>
        {!isModalWindow && (
          <ErrorBoundary name="main-layout">
            <MainLayout
              isSidebarOpen={isSidebarOpen}
              setIsSidebarOpen={setIsSidebarOpen}
              onOpenSettingsModal={() => modalWindows.openSettingsWindow()}
              onOpenPalette={() => setIsPaletteOpen(true)}
              onOpenBreakdownModal={() => modalWindows.openTagManagerWindow()}
              onOpenThemeManagerModal={() => modalWindows.openThemeManagerWindow()}
              onOpenXray={() => modalWindows.openXrayWindow()}
            />
          </ErrorBoundary>
        )}
      <ModalManager
        isPaletteOpen={isPaletteOpen}
        setIsPaletteOpen={setIsPaletteOpen}
        showExportModal={showExportModal}
        setShowExportModal={setShowExportModal}
        showStructureModal={showStructureModal}
        setShowStructureModal={setShowStructureModal}
        showTitlePageModal={showTitlePageModal}
        setShowTitlePageModal={setShowTitlePageModal}
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        toggleSnapshotsPanel={() => {
          if (isSidebarOpen && activeTab === "snapshots") {
            setIsSidebarOpen(false);
          } else {
            setActiveTab("snapshots");
            setIsSidebarOpen(true);
          }
        }}
        openSettingsWindow={isModalWindow ? undefined : modalWindows.openSettingsWindow}
        openHelpWindow={isModalWindow ? undefined : modalWindows.openHelpWindow}
        openTagManagerWindow={isModalWindow ? undefined : modalWindows.openTagManagerWindow}
        openThemeManagerWindow={isModalWindow ? undefined : modalWindows.openThemeManagerWindow}
        openXrayWindow={isModalWindow ? undefined : modalWindows.openXrayWindow}
      />
    </div>
    {isDraggingOver && <DropOverlay />}
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <ThemeProvider>
          <SprintProvider>
            <AppInner />
          </SprintProvider>
        </ThemeProvider>
      </AppProviders>
    </ErrorBoundary>
  );
}

function DropOverlay() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(4px)",
        color: "white",
      }}
    >
      <FolderOpenIcon sx={{ fontSize: 48 }} />
      <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: "0.02em" }}>
        Drop to open
      </span>
      <div style={{ display: "flex", gap: 8, opacity: 0.6, fontSize: 12, fontWeight: 500 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <DescriptionIcon sx={{ fontSize: 14 }} /> .fountain
        </span>
        <span style={{ opacity: 0.35 }}>|</span>
        <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <DescriptionIcon sx={{ fontSize: 14 }} /> .txt
        </span>
        <span style={{ opacity: 0.35 }}>|</span>
        <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <DescriptionIcon sx={{ fontSize: 14 }} /> .actone
        </span>
      </div>
    </div>
  );
}

export default App;
