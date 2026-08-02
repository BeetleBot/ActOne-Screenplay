import { useState, useCallback, useEffect, useRef } from "react";
import { Dialog } from "@mui/material";
import { AppProviders, useFile, useUI, useEditor, ThemeProvider, SprintProvider, useCustomModal } from "./context";
import { useKeyboardShortcuts, useNativeAppBehavior, useModals, useModalWindows } from "./hooks";
import { MainLayout, ModalManager, WelcomeScreenWindow, WindowResizeHandles, ErrorBoundary, OnboardingTour, TutorialsWindow } from "./components";
import { logger } from "./utils/logger";
import { FolderOpenIcon, DescriptionIcon } from "./components/Icons";
import { STORAGE_KEYS } from "./constants";
import { clearResetSettings, DEFAULTS } from "./constants/defaults";
import { setPrefs } from "./theme/AppPrefsEngine";
import { getPerScriptSettingObject, updatePerScriptSetting } from "./utils/perScriptSettings";
import { unpackActoneBundle } from "./utils";

const params = new URLSearchParams(window.location.search);
const action = params.get("action");
const isEditorWindow = action === "new" || action === "open" || action === "import" || action === "template" || action === "tutorial";
const modalParam = params.get("modal");
const isModalWindow = modalParam === "settings" || modalParam === "help" || modalParam === "tag-manager" || modalParam === "theme-manager" || modalParam === "xray" || modalParam === "tutorials";

function AppInner() {
  const { newFile, openFile, saveFile, saveFileAs, closeFile, selectFile, activeFileId, files, openFilePath, parsedDoc, scriptFileName } = useFile();
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [showTutorialsModal, setShowTutorialsModal] = useState(false);
  const { confirm } = useCustomModal();
  const [activeTour, setActiveTourState] = useState<"ui" | "fountain" | "tagging" | "advanced" | "theming" | null>(() => {
    return (localStorage.getItem("actone-active-tour") as "ui" | "fountain" | "tagging" | "advanced" | "theming" | null) || null;
  });

  const setActiveTour = useCallback((tour: "ui" | "fountain" | "tagging" | "advanced" | "theming" | null) => {
    setActiveTourState(tour);
    if (tour) {
      localStorage.setItem("actone-active-tour", tour);
    } else {
      localStorage.removeItem("actone-active-tour");
    }
  }, []);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "actone-active-tour") {
        setActiveTourState((e.newValue as "ui" | "fountain" | "tagging" | "advanced" | "theming" | null) || null);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const handleTutorialStart = useCallback(async (type: "ui" | "fountain" | "tagging" | "advanced" | "theming") => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().maximize();
    } catch { /* not in Tauri */ }

    if (type === "fountain" || type === "advanced") {
      newFile("=== TUTORIAL SANDBOX ===\n\n");
      setActiveTour(type);
    } else if (type === "theming") {
      if (!activeFileId) {
        try {
          const isTauriEnv = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
          if (isTauriEnv) {
            const { invoke } = await import("@tauri-apps/api/core");
            const bytes = await invoke<number[]>("get_sample_bundle");
            const bundle = unpackActoneBundle(new Uint8Array(bytes), "Bee Detective v2");
            newFile(bundle.scripts[0]?.content || "");
          } else {
            const res = await fetch("/samples/BeeDetectiveTour.actone");
            const buf = await res.arrayBuffer();
            const bundle = unpackActoneBundle(new Uint8Array(buf), "Bee Detective v2");
            newFile(bundle.scripts[0]?.content || "");
          }
        } catch {
          newFile();
        }
      }
      setTimeout(async () => {
        try {
          const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
          const existing = await WebviewWindow.getByLabel("theme-manager");
          if (existing) { existing.close().catch(() => {}); }
          const win = new WebviewWindow("theme-manager", {
            url: "/?modal=theme-manager&tour=theming",
            title: "ActOne – Theme Manager",
            width: 700,
            height: 580,
            resizable: true,
            decorations: false,
          });
          win.once("tauri://created", () => {});
          win.once("tauri://error", () => {});
        } catch { /* not in Tauri */ }
      }, 500);
    } else {
      if (!activeFileId) {
        try {
          const isTauriEnv = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
          if (isTauriEnv) {
            const { invoke } = await import("@tauri-apps/api/core");
            const bytes = await invoke<number[]>("get_sample_bundle");
            const bundle = unpackActoneBundle(new Uint8Array(bytes), "Bee Detective v2");
            newFile(bundle.scripts[0]?.content || "");
          } else {
            const res = await fetch("/samples/BeeDetectiveTour.actone");
            const buf = await res.arrayBuffer();
            const bundle = unpackActoneBundle(new Uint8Array(buf), "Bee Detective v2");
            newFile(bundle.scripts[0]?.content || "");
          }
        } catch {
          newFile();
        }
      }
      setActiveTour(type);
    }
  }, [newFile, activeFileId, openFilePath, setActiveTour]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    const setup = async () => {
      try {
        const { listen } = await import("@tauri-apps/api/event");
        unlisten = await listen<{ type: "ui" | "fountain" | "tagging" | "advanced" | "theming" }>("tutorial:start", (event) => {
          handleTutorialStart(event.payload.type);
        });
      } catch { /* not in Tauri */ }
    };
    setup();
    return () => { if (unlisten) unlisten(); };
  }, [handleTutorialStart]);

  // Polling fallback to guarantee communication between Tauri windows for tutorial launch
  useEffect(() => {
    const timer = setInterval(() => {
      const pendingAction = localStorage.getItem("pending-action");
      if (pendingAction === "tutorial") {
        const type = localStorage.getItem("pending-tutorial-type") as "ui" | "fountain" | "tagging" | "advanced" | "theming" | null;
        if (type) {
          localStorage.removeItem("pending-action");
          localStorage.removeItem("pending-tutorial-type");
          handleTutorialStart(type);
        }
      }
    }, 200);
    return () => clearInterval(timer);
  }, [handleTutorialStart]);

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

  const { editorView, updateSettings } = useEditor();
  const {
    zoomLevel,
    setZoomLevel,
    appScale,
    setAppScale,
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
    interfaceScaleIn: useCallback(() => setAppScale(appScale + 10), [appScale, setAppScale]),
    interfaceScaleOut: useCallback(() => setAppScale(appScale - 10), [appScale, setAppScale]),
    resetInterfaceScale: useCallback(() => setAppScale(100), [setAppScale]),
    openSettings: useCallback(() => { modalWindows.openSettingsWindow(); }, [modalWindows]),
    openHelp: useCallback(() => { modalWindows.openHelpWindow(); }, [modalWindows]),
    toggleSearch: useCallback(() => setActiveRightPane(activeRightPane === "search" ? null : "search"), [activeRightPane, setActiveRightPane]),
    openMusePane: useCallback(() => setActiveRightPane("prompt"), [setActiveRightPane]),
    toggleSnapshotsPanel: useCallback(() => {
      if (isSidebarOpen && activeTab === "snapshots") {
        setIsSidebarOpen(false);
      } else {
        setActiveTab("snapshots");
        setIsSidebarOpen(true);
      }
    }, [isSidebarOpen, activeTab, setActiveTab, setIsSidebarOpen]),
    isDisabled: isModalActive,
  });

  // Auto-close left sidebar when right pane opens
  useEffect(() => {
    if (activeRightPane) {
      setIsSidebarOpen(false);
    }
  }, [activeRightPane]);

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
    clearResetSettings();
  }, []);

  useEffect(() => {
    const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
    if (!isTauri) return;

    let unlisteners: (() => void)[] = [];

    const setup = async () => {
      try {
        const { listen, emit } = await import("@tauri-apps/api/event");
        const { EditorView } = await import("@codemirror/view");

        const u1 = await listen("modal:settings:ready", () => {
          const readLS = (key: string) => localStorage.getItem(key);
          const readBool = (key: string) => {
            const v = localStorage.getItem(key);
            return v !== null ? v === "true" : Boolean(DEFAULTS[key]);
          };
          emit("modal:settings:init", {
            themeId: readLS(STORAGE_KEYS.THEME_ID) ?? DEFAULTS[STORAGE_KEYS.THEME_ID] as string,
            fontFamily: readLS(STORAGE_KEYS.FONT_FAMILY) ?? DEFAULTS[STORAGE_KEYS.FONT_FAMILY] as string,
            paperSize: readLS(STORAGE_KEYS.PAPER_SIZE) ?? DEFAULTS[STORAGE_KEYS.PAPER_SIZE] as string,
            typewriterMode: readBool(STORAGE_KEYS.TYPEWRITER_MODE),
            zoomLevel: parseInt(readLS(STORAGE_KEYS.ZOOM_LEVEL) ?? String(DEFAULTS[STORAGE_KEYS.ZOOM_LEVEL]), 10),
            appScale: parseInt(readLS(STORAGE_KEYS.APP_SCALE) ?? String(DEFAULTS[STORAGE_KEYS.APP_SCALE]), 10),
            autocompleteEnabled: readBool(STORAGE_KEYS.AUTOCOMPLETE_ENABLED),
            smartQuotesEnabled: readBool(STORAGE_KEYS.SMART_QUOTES_ENABLED),
            matchParenthesesEnabled: readBool(STORAGE_KEYS.MATCH_PARENTHESES_ENABLED),
            autoSaveEnabled: readBool(STORAGE_KEYS.AUTO_SAVE_ENABLED),
            autoSaveInterval: parseInt(readLS(STORAGE_KEYS.AUTO_SAVE_INTERVAL) ?? String(DEFAULTS[STORAGE_KEYS.AUTO_SAVE_INTERVAL]), 10),
            hideSyntaxEnabled: readBool(STORAGE_KEYS.HIDE_SYNTAX_ENABLED),
            lineFocusEnabled: readBool(STORAGE_KEYS.LINE_FOCUS_ENABLED),
            snapshotsEnabled: readBool(STORAGE_KEYS.SNAPSHOTS_ENABLED),
            snapshotLocation: readLS(STORAGE_KEYS.SNAPSHOT_LOCATION) ?? DEFAULTS[STORAGE_KEYS.SNAPSHOT_LOCATION] as string,
            snapshotCustomPath: readLS(STORAGE_KEYS.SNAPSHOT_CUSTOM_PATH) ?? DEFAULTS[STORAGE_KEYS.SNAPSHOT_CUSTOM_PATH] as string,
            snapshotAutoEnabled: readBool(STORAGE_KEYS.SNAPSHOT_AUTO_ENABLED),
            snapshotAutoIntervalMinutes: parseInt(readLS(STORAGE_KEYS.SNAPSHOT_AUTO_INTERVAL) ?? String(DEFAULTS[STORAGE_KEYS.SNAPSHOT_AUTO_INTERVAL]), 10),
            snapshotOnSave: readBool(STORAGE_KEYS.SNAPSHOT_ON_SAVE),
            fountainColorsEnabled: readBool(STORAGE_KEYS.FOUNTAIN_COLORS_ENABLED),
            iconStyle: readLS(STORAGE_KEYS.ICON_STYLE) ?? DEFAULTS[STORAGE_KEYS.ICON_STYLE] as string,
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
    } else if (action === "import") {
      const content = localStorage.getItem("pending-import-content") || "";
      localStorage.removeItem("pending-import-content");
      localStorage.removeItem("pending-action");
      newFile(content);
    } else if (action === "template") {
      newFile();
      setShowStructureModal(true);
      localStorage.removeItem("pending-action");
    } else if (action === "tutorial") {
      const rawType = params.get("type") || localStorage.getItem("pending-tutorial-type");
      const type = (rawType === "fountain" ? "fountain" : rawType === "tagging" ? "tagging" : rawType === "advanced" ? "advanced" : rawType === "theming" ? "theming" : "ui") as "ui" | "fountain" | "tagging" | "advanced" | "theming";
      localStorage.removeItem("pending-tutorial-type");
      localStorage.removeItem("pending-action");
      if (type === "ui" || type === "tagging" || type === "theming") {
        (async () => {
          try {
            const isTauriEnv = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
            if (isTauriEnv) {
              const { invoke } = await import("@tauri-apps/api/core");
              const bytes = await invoke<number[]>("get_sample_bundle");
              const bundle = unpackActoneBundle(new Uint8Array(bytes), "Bee Detective v2");
              newFile(bundle.scripts[0]?.content || "");
            } else {
              const res = await fetch("/samples/BeeDetectiveTour.actone");
              const buf = await res.arrayBuffer();
              const bundle = unpackActoneBundle(new Uint8Array(buf), "Bee Detective v2");
              newFile(bundle.scripts[0]?.content || "");
            }
          } catch {
            newFile();
          }
        })();
      } else {
        newFile("=== TUTORIAL SANDBOX ===\n\n");
      }

      (async () => {
        try {
          const { getCurrentWindow } = await import("@tauri-apps/api/window");
          await getCurrentWindow().maximize();
        } catch { /* not in Tauri */ }
      })();

      if (type === "theming") {
        setTimeout(async () => {
          try {
          const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
          const existing = await WebviewWindow.getByLabel("theme-manager");
          if (existing) { existing.close().catch(() => {}); }
          const win = new WebviewWindow("theme-manager", {
            url: "/?modal=theme-manager&tour=theming",
              title: "ActOne – Theme Manager",
              width: 700,
              height: 580,
              resizable: true,
              decorations: false,
            });
            win.once("tauri://created", () => {});
            win.once("tauri://error", () => {});
          } catch { /* not in Tauri */ }
        }, 500);
      } else {
        setActiveTour(type);
      }
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
          <WelcomeScreenWindow standalone onOpenTutorials={() => setShowTutorialsModal(true)} />
        </ErrorBoundary>
        {isDraggingOver && <DropOverlay />}
        {showTutorialsModal && (
          <Dialog
            open={showTutorialsModal}
            onClose={() => setShowTutorialsModal(false)}
            maxWidth="md"
            fullWidth
            slotProps={{
              paper: {
                sx: {
                  height: 600,
                  bgcolor: "background.paper",
                  color: "text.primary",
                  border: "1px solid",
                  borderColor: "divider",
                  backgroundImage: "none",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  borderRadius: 0,
                }
              }
            }}
          >
            <TutorialsWindow isModal onClose={() => setShowTutorialsModal(false)} />
          </Dialog>
        )}
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
        openTutorialsWindow={isModalWindow ? undefined : () => setShowTutorialsModal(true)}
      />
    </div>
    {activeTour !== "theming" && (
    <OnboardingTour
      activeTour={activeTour}
      onCloseTour={() => setActiveTour(null)}
    />
    )}

    {showTutorialsModal && (
      <Dialog
        open={showTutorialsModal}
        onClose={() => setShowTutorialsModal(false)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              height: 600,
              bgcolor: "background.paper",
              color: "text.primary",
              border: "1px solid",
              borderColor: "divider",
              backgroundImage: "none",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              borderRadius: 0,
            }
          }
        }}
      >
        <TutorialsWindow isModal onClose={() => setShowTutorialsModal(false)} />
      </Dialog>
    )}

    {isDraggingOver && <DropOverlay />}
    </>
  );
}

function App() {
  return (
    <ErrorBoundary fullScreen name="app-root">
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
