import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { parseScreenplay, FountainDocument } from "../parser";
import { parseScreenplayAsync } from "../utils/asyncParser";
import { invoke } from "@tauri-apps/api/core";
import { useUI } from "./UIContext";
import { unpackActoneBundle, packActoneBundleAsync } from "../utils";
import { parseScriptFileToFountain } from "../utils/text";
import type { ScriptInfo } from "../utils";
import { logger } from "../utils/logger";
import { useCustomModal } from "./CustomModalContext";
import { STORAGE_KEYS, MAX_RECENT_FILES } from "../constants";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SettingsUpdater = (prev: Record<string, any>) => Record<string, any>;

export interface ScreenplayFile {
  id: string;
  filePath: string | null;
  rawText: string;
  parsedDoc: FountainDocument;
  isSaving: boolean;
  isDirty: boolean;
  savedText: string;
  scripts?: ScriptInfo[];
  activeScriptIndex?: number;
}

export interface RecentFile {
  path: string;
  name: string;
  lastOpened: number;
}

export interface FileContextProps {
  files: ScreenplayFile[];
  activeFileId: string;
  filePath: string | null;
  isSaving: boolean;
  rawText: string;
  parsedDoc: FountainDocument;
  setRawText: (text: string) => void;
  openFile: () => Promise<void>;
  saveFile: () => Promise<void>;
  saveFileAs: (targetFileId?: string, suggestedName?: string) => Promise<string | null>;
  selectFile: (id: string) => void;
  newFile: (initialContent?: string) => void;
  importAsActoneProject: (initialContent: string, scriptName?: string, promptSaveImmediate?: boolean) => Promise<void>;
  closeFile: (id: string, force?: boolean) => Promise<void>;
  closeOthers: (id: string) => Promise<void>;
  closeAll: () => Promise<void>;
  recentFiles: RecentFile[];
  openFilePath: (path: string) => Promise<void>;
  removeFromRecent: (path: string) => void;
  updateSettings: (updater: SettingsUpdater) => void;
  updateFileScriptContent: (fileId: string, scriptIndex: number | undefined, text: string) => void;
  scripts: ScriptInfo[];
  activeScriptIndex: number;
  activeScriptName: string;
  scriptFileName: string;
  isBundle: boolean;
  setActiveScript: (index: number) => void;
  addScript: (name?: string, forceType?: "fountain" | "markdown") => Promise<string | null>;
  importScript: (type?: "fountain" | "markdown") => Promise<string | null>;
  renameScript: (index: number, newName: string) => Promise<boolean>;
  duplicateScript: (index: number, name?: string) => Promise<string | null>;
  deleteScript: (index: number) => Promise<boolean>;
  moveScript: (fromIndex: number, toIndex: number) => Promise<void>;
  saveStatus: "idle" | "saving" | "saved";
}

const FileContext = createContext<FileContextProps | undefined>(undefined);

export const useFile = () => {
  const context = useContext(FileContext);
  if (!context) throw new Error("useFile must be used within a FileProvider");
  return context;
};

const sanitizeFileName = (name: string): string => {
  const ctrl = new RegExp("[" + String.fromCharCode(0) + "-" + String.fromCharCode(31) + "]", "g");
  return name.replace(/[<>:"/\\|?*]/g, "").replace(ctrl, "").trim() || "Untitled";
};

const getUniqueName = (base: string, existing: ScriptInfo[]): string => {
  let name = base;
  let counter = 1;
  while (existing.some((s) => s.name === name)) {
    counter++;
    name = `${base} (${counter})`;
  }
  return name;
};

export const FileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { paperSize, fontFamily } = useUI();
  const { confirm, prompt } = useCustomModal();

  const generateUUID = () => "file-" + Math.random().toString(36).substring(2, 15);

  const defaultText = "";

  const [files, setFiles] = useState<ScreenplayFile[]>([]);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerSaveStatusSaved = () => {
    setSaveStatus("saved");
    if (saveStatusTimeoutRef.current) clearTimeout(saveStatusTimeoutRef.current);
    saveStatusTimeoutRef.current = setTimeout(() => {
      setSaveStatus("idle");
    }, 2000);
  };

  const [activeFileId, setActiveFileIdState] = useState<string>("");
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.RECENT_FILES);
    return saved ? JSON.parse(saved) : [];
  });

  const addToRecent = (path: string) => {
    setRecentFiles(prev => {
      const name = path.split(/[/\\]/).pop() || "Untitled";
      const filtered = prev.filter(f => f.path !== path);
      const updated = [{ path, name, lastOpened: Date.now() }, ...filtered].slice(0, MAX_RECENT_FILES);
      localStorage.setItem(STORAGE_KEYS.RECENT_FILES, JSON.stringify(updated));
      return updated;
    });
  };

  const removeFromRecent = (path: string) => {
    setRecentFiles(prev => {
      const updated = prev.filter(f => f.path !== path);
      localStorage.setItem(STORAGE_KEYS.RECENT_FILES, JSON.stringify(updated));
      return updated;
    });
  };


  const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

  const [rawText, setRawTextState] = useState<string>(defaultText);
  const [parsedDoc, setParsedDoc] = useState<FountainDocument>(() => {
    const doc = parseScreenplay(defaultText, paperSize);
    if (isTauri) {
      doc.pageBreaks = undefined;
    }
    return doc;
  });
  const [filePath, setFilePath] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [scriptsState, setScriptsState] = useState<ScriptInfo[]>([]);
  const [activeScriptIndex, setActiveScriptIndexState] = useState<number>(0);
  const parseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeScriptIndexRef = useRef(activeScriptIndex);
  useEffect(() => {
    activeScriptIndexRef.current = activeScriptIndex;
  }, [activeScriptIndex]);

  const filesRef = useRef(files);
  const activeFileIdRef = useRef(activeFileId);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    activeFileIdRef.current = activeFileId;
  }, [activeFileId]);

  const isBundleDirty = useCallback((scripts: ScriptInfo[]): boolean => {
    return scripts.some(s => s.content !== s.savedContent);
  }, []);

  const activeFile = files.find(f => f.id === activeFileId);
  const isBundle = !!activeFile?.scripts;

  useEffect(() => {
    const updateAll = () => {
      setFiles(prev => prev.map(f => {
        const doc = parseScreenplay(f.rawText, paperSize);
        const mergedSettings = (doc.settings && Object.keys(doc.settings).length > 0)
          ? doc.settings
          : f.parsedDoc.settings;
        const pageBreaks = isTauri && f.parsedDoc?.pageBreaks ? f.parsedDoc.pageBreaks : doc.pageBreaks;
        return { ...f, parsedDoc: { ...doc, settings: mergedSettings, pageBreaks } };
      }));
      setParsedDoc(prevDoc => {
        const doc = parseScreenplay(rawText, paperSize);
        const mergedSettings = (doc.settings && Object.keys(doc.settings).length > 0)
          ? doc.settings
          : prevDoc.settings;
        const pageBreaks = isTauri && prevDoc?.pageBreaks ? prevDoc.pageBreaks : doc.pageBreaks;
        return { ...doc, settings: mergedSettings, pageBreaks };
      });
    };
    updateAll();
  }, [paperSize, isTauri]);

  const selectFile = (id: string) => {
    const file = files.find(f => f.id === id);
    if (!file) return;
    setActiveFileIdState(id);
    setRawTextState(file.rawText);
    setFilePath(file.filePath);
    setParsedDoc(file.parsedDoc);
    setIsSaving(file.isSaving);
    setScriptsState(file.scripts || []);
    setActiveScriptIndexState(file.activeScriptIndex ?? 0);
  };

  const newFile = (initialContent: string = "") => {
    const newId = generateUUID();
    const scriptName = "Untitled";
    const scripts: ScriptInfo[] = initialContent ? [{
      name: scriptName,
      fileName: `${scriptName}.fountain`,
      content: initialContent,
      savedContent: initialContent,
    }] : [];
    const newFileObj: ScreenplayFile = {
      id: newId,
      filePath: null,
      rawText: initialContent,
      parsedDoc: parseScreenplay(initialContent, paperSize),
      isSaving: false,
      isDirty: initialContent !== "",
      savedText: "",
      scripts,
      activeScriptIndex: initialContent ? 0 : undefined,
    };
    setFiles(prev => [...prev, newFileObj]);
    setActiveFileIdState(newId);
    setRawTextState(initialContent);
    setFilePath(null);
    setParsedDoc(newFileObj.parsedDoc);
    setScriptsState(scripts);
    setActiveScriptIndexState(0);
  };

  const closeFile = async (id: string, force?: boolean) => {
    const fileToClose = files.find(f => f.id === id);
    if (!fileToClose) return;

    if (fileToClose.isDirty && !force) {
      const confirmClose = await confirm({
        title: "Unsaved Changes",
        message: `"${fileToClose.filePath ? fileToClose.filePath.split(/[/\\]/).pop() : 'Untitled'}" has unsaved changes. Do you want to save your changes before closing?`,
        buttons: [
          { value: "save", label: "Save & Close", variant: "contained", color: "primary" },
          { value: "discard", label: "Discard", variant: "outlined", color: "error" },
          { value: "cancel", label: "Cancel", variant: "text", color: "inherit" }
        ]
      });
      if (confirmClose === "cancel") return;
      if (confirmClose === "save") {
        const originalActiveId = activeFileId;
        if (originalActiveId !== id) {
          selectFile(id);
        }
        await saveFile();
      }
    }

    const index = files.findIndex(f => f.id === id);
    const newFiles = files.filter(f => f.id !== id);

    if (newFiles.length === 0) {
      setFiles([]);
      setActiveFileIdState("");
      setRawTextState("");
      setFilePath(null);
      setParsedDoc(parseScreenplay("", paperSize));
      setScriptsState([]);
      setActiveScriptIndexState(0);
    } else {
      setFiles(newFiles);
      if (activeFileId === id) {
        const nextActiveIndex = index >= newFiles.length ? newFiles.length - 1 : index;
        const nextFile = newFiles[nextActiveIndex];
        selectFile(nextFile.id);
      }
    }
  };

  const closeOthers = async (id: string) => {
    const dirtyOthers = files.filter(f => f.id !== id && f.isDirty);
    for (const f of dirtyOthers) {
      const confirmClose = await confirm({
        title: "Unsaved Changes",
        message: `"${f.filePath ? f.filePath.split(/[/\\]/).pop() : 'Untitled'}" has unsaved changes. Do you want to save your changes before closing?`,
        buttons: [
          { value: "save", label: "Save & Close", variant: "contained", color: "primary" },
          { value: "discard", label: "Discard", variant: "outlined", color: "error" },
          { value: "cancel", label: "Cancel", variant: "text", color: "inherit" }
        ]
      });
      if (confirmClose === "cancel") return;
      if (confirmClose === "save") {
        selectFile(f.id);
        await saveFile();
      }
    }
    const fileToKeep = files.find(f => f.id === id);
    if (fileToKeep) {
      setFiles([fileToKeep]);
      selectFile(id);
    }
  };

  const closeAll = async () => {
    const dirtyFiles = files.filter(f => f.isDirty);
    for (const f of dirtyFiles) {
      const confirmClose = await confirm({
        title: "Unsaved Changes",
        message: `"${f.filePath ? f.filePath.split(/[/\\]/).pop() : 'Untitled'}" has unsaved changes. Do you want to save your changes before closing?`,
        buttons: [
          { value: "save", label: "Save & Close", variant: "contained", color: "primary" },
          { value: "discard", label: "Discard", variant: "outlined", color: "error" },
          { value: "cancel", label: "Cancel", variant: "text", color: "inherit" }
        ]
      });
      if (confirmClose === "cancel") return;
      if (confirmClose === "save") {
        selectFile(f.id);
        await saveFile();
      }
    }
    setFiles([]);
    setActiveFileIdState("");
    setRawTextState("");
    setFilePath(null);
    setParsedDoc(parseScreenplay("", paperSize));
    setScriptsState([]);
    setActiveScriptIndexState(0);
  };

  const setRawText = (text: string) => {
    const normalized = text.replace(/\r\n/g, "\n");
    setRawTextState(normalized);

    if (parseTimeoutRef.current !== null) {
      clearTimeout(parseTimeoutRef.current);
    }
    parseTimeoutRef.current = setTimeout(async () => {
      parseTimeoutRef.current = null;
      const doc = await parseScreenplayAsync(normalized, paperSize);
      setFiles(prev => prev.map(f => {
        if (f.id === activeFileId) {
          const mergedSettings = doc.settings && Object.keys(doc.settings).length > 0
            ? doc.settings
            : f.parsedDoc.settings;

          let updatedScripts = f.scripts;
          if (updatedScripts && updatedScripts.length > 0) {
            const idx = f.activeScriptIndex ?? 0;
            updatedScripts = updatedScripts.map((s, i) =>
              i === idx ? { ...s, content: normalized } : s
            );
          }

          const isDirty = updatedScripts && updatedScripts.length > 0
            ? isBundleDirty(updatedScripts)
            : normalized !== f.savedText;

          const existingBreaks = isTauri && f.parsedDoc?.pageBreaks ? f.parsedDoc.pageBreaks : doc.pageBreaks;
          return {
            ...f,
            rawText: normalized,
            isDirty,
            parsedDoc: { ...doc, settings: mergedSettings, pageBreaks: existingBreaks },
            scripts: updatedScripts,
          };
        }
        return f;
      }));
      setParsedDoc(prevDoc => {
        const mergedSettings = doc.settings && Object.keys(doc.settings).length > 0
          ? doc.settings
          : prevDoc.settings;
        const existingBreaks = isTauri && prevDoc?.pageBreaks ? prevDoc.pageBreaks : doc.pageBreaks;
        return { ...doc, settings: mergedSettings, pageBreaks: existingBreaks };
      });
    }, 100);
  };

  const updateFileScriptContent = useCallback(async (fileId: string, scriptIndex: number | undefined, text: string) => {
    const normalized = text.replace(/\r\n/g, "\n");
    const doc = await parseScreenplayAsync(normalized, paperSize);

    setFiles(prev => prev.map(f => {
      if (f.id === fileId) {
        const mergedSettings = doc.settings && Object.keys(doc.settings).length > 0
          ? doc.settings
          : f.parsedDoc.settings;

        let updatedScripts = f.scripts;
        const targetIdx = scriptIndex ?? f.activeScriptIndex ?? 0;
        if (updatedScripts && updatedScripts.length > 0) {
          updatedScripts = updatedScripts.map((s, i) =>
            i === targetIdx ? { ...s, content: normalized } : s
          );
        }

        const isDirty = updatedScripts && updatedScripts.length > 0
          ? isBundleDirty(updatedScripts)
          : normalized !== f.savedText;

        const isCurrentlyActive = (f.id === activeFileIdRef.current) &&
          (!updatedScripts || targetIdx === activeScriptIndexRef.current);

        const existingBreaks = isTauri && f.parsedDoc?.pageBreaks ? f.parsedDoc.pageBreaks : doc.pageBreaks;

        if (isCurrentlyActive) {
          setRawTextState(normalized);
          setParsedDoc(prevDoc => {
            const activeExistingBreaks = isTauri && prevDoc?.pageBreaks ? prevDoc.pageBreaks : doc.pageBreaks;
            return { ...doc, settings: mergedSettings, pageBreaks: activeExistingBreaks };
          });
        }

        return {
          ...f,
          rawText: normalized,
          isDirty,
          parsedDoc: { ...doc, settings: mergedSettings, pageBreaks: existingBreaks },
          scripts: updatedScripts,
        };
      }
      return f;
    }));
  }, [paperSize, isBundleDirty, isTauri]);

  const updateSettings = (updater: SettingsUpdater) => {
    setFiles(prev => prev.map(f => {
      if (f.id === activeFileId) {
        const nextSettings = updater(f.parsedDoc.settings || {});
        return {
          ...f,
          isDirty: true,
          parsedDoc: {
            ...f.parsedDoc,
            settings: nextSettings
          }
        };
      }
      return f;
    }));
    setParsedDoc(prevDoc => {
      const nextSettings = updater(prevDoc.settings || {});
      return {
        ...prevDoc,
        settings: nextSettings
      };
    });
  };

  // Validate recent files on startup in non-blocking parallel background tasks
  useEffect(() => {
    if (!isTauri || recentFiles.length === 0) return;
    Promise.allSettled(
      recentFiles.map(async (f) => {
        try {
          const exists = await invoke<boolean>("file_exists", { path: f.path });
          if (!exists) removeFromRecent(f.path);
        } catch (e) {
          logger.warn("file", "Failed to check file existence", e);
        }
      })
    );
  }, []); // run once on mount

  useEffect(() => {
    if (!isTauri) return;

    const handler = setTimeout(async () => {
      try {
        const revisedLines: boolean[] = [];

        const breaks = await invoke<number[]>("get_page_breaks", {
          fountainText: rawText,
          paperSize,
          fontFamily,
          elementFormats: JSON.stringify(parsedDoc.settings?.elementFormats || {}),
          mirrorSceneNumbers: "off",
          exportSections: false,
          exportSynopses: false,
          exportTitlePage: true,
          revisedLines,
          scriptFonts: JSON.stringify(parsedDoc.settings?.scriptFonts || {}),
        });

        if (breaks) {
          setParsedDoc(prev => {
            if (prev.screenplayText === rawText) {
              return { ...prev, pageBreaks: breaks };
            }
            return prev;
          });
          setFiles(prev => prev.map(f => {
            if (f.id === activeFileId && f.rawText === rawText) {
              return { ...f, parsedDoc: { ...f.parsedDoc, pageBreaks: breaks } };
            }
            return f;
          }));
        }
      } catch (err) {
        logger.error("file", "Page break calculation failed", err);
      }
    }, 200);

    return () => clearTimeout(handler);
  }, [rawText, paperSize, fontFamily, activeFileId, isTauri, parsedDoc.settings?.elementFormats, parsedDoc.settings?.scriptFonts]);

  useEffect(() => {
    if (isTauri) return;

    const handler = setTimeout(() => {
      const parsed = parseScreenplay(rawText, paperSize);
      if (parsed.pageBreaks) {
        setParsedDoc(prev => {
          if (prev.screenplayText === rawText) {
            return { ...prev, pageBreaks: parsed.pageBreaks };
          }
          return prev;
        });
        setFiles(prev => prev.map(f => {
          if (f.id === activeFileId && f.rawText === rawText) {
            return { ...f, parsedDoc: { ...f.parsedDoc, pageBreaks: parsed.pageBreaks } };
          }
          return f;
        }));
      }
    }, 250);

    return () => clearTimeout(handler);
  }, [rawText, paperSize, activeFileId, isTauri]);

  const isActonePath = (p: string) => {
    const lower = p.toLowerCase();
    return lower.endsWith(".actone") || lower.endsWith(".zip") || lower.endsWith(".actone.zip");
  };

  const openFilePath = async (path: string) => {
    const isActone = isActonePath(path);
    const normalizedPath = isActone && path.toLowerCase().endsWith(".actone") ? path.replace(/\.actone$/i, ".actone") : path;
    const existing = files.find(f => f.filePath?.toLowerCase() === normalizedPath.toLowerCase());
    if (existing) {
      selectFile(existing.id);
      return;
    }

    let settings = {};
    let scripts: ScriptInfo[] = [];
    const bundleName = path.split(/[/\\]/).pop()?.replace(/\.(actone|zip|actone\.zip)$/i, "") || "Untitled";

    try {
      if (isTauri) {
        if (isActone) {
          try {
            const bytes = await invoke<number[]>("read_file_binary", { path });
            const bundle = unpackActoneBundle(new Uint8Array(bytes), bundleName);
            if (bundle && bundle.scripts && bundle.scripts.length > 0) {
              scripts = bundle.scripts;
              settings = bundle.settings;
              if (bundle.isLegacy) {
                // Auto-upgrade legacy bundles on disk immediately
                await saveActoneFile(path, scripts, settings);
                logger.info("file", `Automatically upgraded legacy bundle to Gen 3: ${path}`);
              }
            } else {
              throw new Error("No screenplay content found in archive");
            }
          } catch (err) {
            if (path.toLowerCase().endsWith(".zip")) {
              const content = await invoke<string>("read_file_content", { path });
              scripts = [{
                name: bundleName,
                fileName: `${bundleName}.fountain`,
                content,
                savedContent: content,
              }];
            } else {
              throw err;
            }
          }
        } else {
          const content = await invoke<string>("read_file_content", { path });
          scripts = [{
            name: bundleName,
            fileName: `${bundleName}.fountain`,
            content,
            savedContent: content,
          }];
        }
      } else {
        throw new Error("Cannot open direct path in web mode");
      }
    } catch (e) {
      logger.error("file", "Failed to open file path", e);
      removeFromRecent(path);
      await confirm({
        title: "Error Opening File",
        message: "Could not open file: " + path,
        buttons: [{ value: "ok", label: "OK", variant: "contained" }]
      });
      return;
    }

    const activeScript = scripts[0] || { name: "Untitled", fileName: "Untitled.fountain", content: "", savedContent: "" };
    const content = activeScript.content;
    const parsed = parseScreenplay(content, paperSize);
    if (isActone) {
      parsed.settings = settings;
    }
    const cleanText = parsed.screenplayText;

    const currentActive = files.find(f => f.id === activeFileId);
    const isDefault = currentActive && !currentActive.filePath &&
                      (currentActive.rawText === "" || !currentActive.isDirty);

    if (isDefault && currentActive) {
      setFiles(prev => prev.map(f => f.id === activeFileId ? {
        ...f,
        filePath: normalizedPath,
        rawText: cleanText,
        savedText: cleanText,
        isDirty: false,
        parsedDoc: parsed,
        scripts,
        activeScriptIndex: 0,
      } : f));
      setFilePath(normalizedPath);
      setRawTextState(cleanText);
      setParsedDoc(parsed);
      setScriptsState(scripts);
      setActiveScriptIndexState(0);
      addToRecent(normalizedPath);
    } else {
      const newId = generateUUID();
      const newFileObj: ScreenplayFile = {
        id: newId,
        filePath: normalizedPath,
        rawText: cleanText,
        savedText: cleanText,
        isDirty: false,
        parsedDoc: parsed,
        isSaving: false,
        scripts: isActone ? scripts : undefined,
        activeScriptIndex: 0,
      };
      setFiles(prev => [...prev, newFileObj]);
      setActiveFileIdState(newId);
      setFilePath(normalizedPath);
      setRawTextState(cleanText);
      setParsedDoc(parsed);
      setScriptsState(isActone ? scripts : []);
      setActiveScriptIndexState(0);
      addToRecent(normalizedPath);
    }
  };

  const openFile = async () => {
    let res: { path: string; content: string; settings?: Record<string, unknown> } | null = null;
    if (isTauri) {
      try {
        res = await invoke<{ path: string; content: string } | null>("open_file_dialog");
      } catch (e) {
        logger.error("file", "Open file dialog failed", e);
      }
    } else {
      res = await new Promise<{ path: string; content: string; settings?: Record<string, unknown> } | null>((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".actone,.zip";
        input.onchange = async () => {
          const file = input.files?.[0];
          if (!file) {
            resolve(null);
            return;
          }
          if (isActonePath(file.name)) {
            const arrayBuffer = await file.arrayBuffer();
            const bundleName = file.name.replace(/\.(actone|zip|actone\.zip)$/i, "");
            const bundle = unpackActoneBundle(new Uint8Array(arrayBuffer), bundleName);
            const scripts = bundle.scripts;
            resolve({ path: file.name, content: scripts[0]?.content || "", settings: bundle.settings });
          } else {
            const content = await file.text();
            resolve({ path: file.name, content });
          }
        };
        input.click();
      });
    }

    if (res) {
      const isActone = isActonePath(res.path);
      const normalizedPath = isActone && res.path.toLowerCase().endsWith(".actone") ? res.path.replace(/\.actone$/i, ".actone") : res.path;
      if (isTauri) addToRecent(normalizedPath);
      const existing = files.find(f => f.filePath?.toLowerCase() === normalizedPath.toLowerCase());
      if (existing) {
        selectFile(existing.id);
        return;
      }

      const currentActive = files.find(f => f.id === activeFileId);
      const isDefault = currentActive && !currentActive.filePath &&
                        (currentActive.rawText === "" || !currentActive.isDirty);

      let scripts: ScriptInfo[] = [];
      let settings = res.settings || {};
      let content = res.content;
      const bundleName = res.path.split(/[/\\]/).pop()?.replace(/\.(actone|zip|actone\.zip)$/i, "") || "Untitled";

      if (isActone) {
        if (isTauri) {
          try {
            const bytes = await invoke<number[]>("read_file_binary", { path: res.path });
            const bundle = unpackActoneBundle(new Uint8Array(bytes), bundleName);
            scripts = bundle.scripts;
            content = bundle.scripts[0]?.content || "";
            settings = bundle.settings;
            if (bundle.isLegacy) {
              await saveActoneFile(res.path, scripts, settings);
              logger.info("file", `Automatically upgraded legacy bundle to Gen 3: ${res.path}`);
            }
          } catch (e) {
            logger.error("file", "Failed to read actone bundle", e);
            await confirm({
              title: "Error Reading Bundle",
              message: "Could not read actone bundle binary",
              buttons: [{ value: "ok", label: "OK", variant: "contained" }]
            });
            return;
          }
        } else {
          scripts = [{
            name: bundleName,
            fileName: `${bundleName}.fountain`,
            content,
            savedContent: content,
          }];
        }
      } else {
        scripts = [{
          name: bundleName,
          fileName: `${bundleName}.fountain`,
          content,
          savedContent: content,
        }];
      }

      const parsed = parseScreenplay(content, paperSize);
      if (isActone) {
        parsed.settings = settings;
      }
      const cleanText = parsed.screenplayText.replace(/\r\n/g, "\n");

      if (isDefault && currentActive) {
        const updatedFiles = files.map(f => f.id === activeFileId ? {
          ...f,
          filePath: normalizedPath,
          rawText: cleanText,
          savedText: cleanText,
          isDirty: false,
          parsedDoc: parsed,
          scripts: isActone ? scripts : undefined,
          activeScriptIndex: 0,
        } : f);
        setFiles(updatedFiles);
        setFilePath(normalizedPath);
        setRawTextState(cleanText);
        setParsedDoc(parsed);
        setScriptsState(isActone ? scripts : []);
        setActiveScriptIndexState(0);
      } else {
        const newId = generateUUID();
        const newFileObj: ScreenplayFile = {
          id: newId,
          filePath: normalizedPath,
          rawText: cleanText,
          savedText: cleanText,
          isDirty: false,
          parsedDoc: parsed,
          isSaving: false,
          scripts: isActone ? scripts : undefined,
          activeScriptIndex: 0,
        };
        setFiles(prev => [...prev, newFileObj]);
        setActiveFileIdState(newId);
        setFilePath(normalizedPath);
        setRawTextState(cleanText);
        setParsedDoc(parsed);
        setScriptsState(isActone ? scripts : []);
        setActiveScriptIndexState(0);
      }
    }
  };

  const saveActoneFile = async (path: string, scripts: ScriptInfo[], settings: Record<string, unknown>) => {
    const isActone = path.toLowerCase().endsWith(".actone");
    const normalizedPath = isActone ? path.replace(/\.actone$/i, ".actone") : path;
    const zipped = await packActoneBundleAsync(scripts, settings);
    await invoke("save_file_binary", { path: normalizedPath, bytes: Array.from(zipped) });
  };

  const saveFile = async () => {
    const currentActive = files.find(f => f.id === activeFileId);
    if (!currentActive) return;
    if (!currentActive.filePath) {
      await saveFileAs();
      return;
    }

    const cleanFountainText = currentActive.parsedDoc.lines.map(l => l.text).join("\n");
    const isActone = currentActive.filePath.toLowerCase().endsWith(".actone");
    const normalizedPath = isActone ? currentActive.filePath.replace(/\.actone$/i, ".actone") : currentActive.filePath;

    setSaveStatus("saving");
    if (isActone) {
      let updatedScripts = currentActive.scripts ? [...currentActive.scripts] : [];
      if (updatedScripts.length > 0) {
        const idx = currentActive.activeScriptIndex ?? 0;
        updatedScripts[idx] = { ...updatedScripts[idx], content: cleanFountainText };
        // Mark every script as saved
        updatedScripts = updatedScripts.map(s => ({ ...s, savedContent: s.content }));
      } else {
        updatedScripts = [{
          name: normalizedPath.split(/[/\\]/).pop()?.replace(/\.actone$/i, "") || "Untitled",
          fileName: "document.fountain",
          content: cleanFountainText,
          savedContent: cleanFountainText,
        }];
      }

      if (isTauri) {
        setIsSaving(true);
        setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, isSaving: true } : f));
        try {
          await saveActoneFile(normalizedPath, updatedScripts, currentActive.parsedDoc.settings);
          setFiles(prev => prev.map(f => f.id === activeFileId ? {
            ...f,
            isDirty: false,
            savedText: rawText,
            scripts: updatedScripts,
            filePath: normalizedPath,
          } : f));
          setFilePath(normalizedPath);
          triggerSaveStatusSaved();
        } catch (e) {
          logger.error("file", "Save actone file failed", e);
          setSaveStatus("idle");
          await confirm({
            title: "Save Failed",
            message: `Could not save ActOne bundle to: ${normalizedPath}. Please verify permission and storage space.`,
            buttons: [{ value: "ok", label: "OK", variant: "contained", color: "error" }]
          });
        } finally {
          setIsSaving(false);
          setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, isSaving: false } : f));
        }
      } else {
        try {
          const zipped = await packActoneBundleAsync(updatedScripts, currentActive.parsedDoc.settings);
          const blob = new Blob([zipped], { type: "application/zip" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = normalizedPath;
          link.click();
          URL.revokeObjectURL(url);
          setFiles(prev => prev.map(f => f.id === activeFileId ? {
            ...f,
            isDirty: false,
            savedText: rawText,
            scripts: updatedScripts,
            filePath: normalizedPath,
          } : f));
          triggerSaveStatusSaved();
        } catch (e) {
          logger.error("file", "Save actone file failed (browser)", e);
          setSaveStatus("idle");
          await confirm({
            title: "Save Failed",
            message: "Could not generate or download ActOne bundle.",
            buttons: [{ value: "ok", label: "OK", variant: "contained", color: "error" }]
          });
        }
      }
    } else {
      if (isTauri) {
        setIsSaving(true);
        setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, isSaving: true } : f));
        try {
          await invoke("save_file_content", { path: currentActive.filePath, content: cleanFountainText });
          setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, isDirty: false, savedText: rawText } : f));
          triggerSaveStatusSaved();
        } catch (e) {
          logger.error("file", "Save file content failed", e);
          setSaveStatus("idle");
          await confirm({
            title: "Save Failed",
            message: `Could not save Fountain script to: ${currentActive.filePath}. Please verify permission and storage space.`,
            buttons: [{ value: "ok", label: "OK", variant: "contained", color: "error" }]
          });
        } finally {
          setIsSaving(false);
          setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, isSaving: false } : f));
        }
      } else {
        try {
          const blob = new Blob([cleanFountainText], { type: "text/plain;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          const normalizedPlainPath = currentActive.filePath.toLowerCase().endsWith(".fountain") ? currentActive.filePath.replace(/\.fountain$/i, ".fountain") : `${currentActive.filePath}.fountain`;
          link.download = normalizedPlainPath;
          link.click();
          URL.revokeObjectURL(url);
          setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, isDirty: false, savedText: rawText } : f));
          triggerSaveStatusSaved();
        } catch (e) {
          logger.error("file", "Save file failed (browser)", e);
          setSaveStatus("idle");
          await confirm({
            title: "Save Failed",
            message: "Could not generate or download Fountain script.",
            buttons: [{ value: "ok", label: "OK", variant: "contained", color: "error" }]
          });
        }
      }
    }
  };

  const saveFileAs = useCallback(async (targetFileId?: string, suggestedName?: string): Promise<string | null> => {
    const currentId = targetFileId || activeFileIdRef.current || activeFileId;
    const currentActive = filesRef.current.find(f => f.id === currentId) || files.find(f => f.id === currentId);
    if (!currentActive) {
      logger.warn("file", "saveFileAs: No file found for id:", currentId);
      return null;
    }
    const cleanFountainText = currentActive.parsedDoc.lines.map(l => l.text).join("\n");
    const defaultName = suggestedName || currentActive.scripts?.[currentActive.activeScriptIndex ?? 0]?.name || "Untitled";

    setSaveStatus("saving");
    if (isTauri) {
      try {
        const path = await invoke<string | null>("save_file_dialog", {
          content: cleanFountainText,
          defaultName: defaultName,
        });
        if (path) {
          const isActone = path.toLowerCase().endsWith(".actone");
          const normalizedPath = isActone ? path.replace(/\.actone$/i, ".actone") : path;
          let finalScripts = currentActive.scripts;
          if (isActone) {
            finalScripts = finalScripts || [{
              name: normalizedPath.split(/[/\\]/).pop()?.replace(/\.actone$/i, "") || "Untitled",
              fileName: "document.fountain",
              content: cleanFountainText,
              savedContent: cleanFountainText,
            }];
            await saveActoneFile(normalizedPath, finalScripts, currentActive.parsedDoc.settings);
          }
          setFiles(prev => prev.map(f => f.id === currentId ? {
            ...f,
            filePath: normalizedPath,
            isDirty: false,
            savedText: currentActive.rawText,
            scripts: isActone ? finalScripts : undefined,
            activeScriptIndex: isActone ? (f.activeScriptIndex ?? 0) : undefined,
          } : f));
          setFilePath(normalizedPath);
          setScriptsState(isActone && finalScripts ? finalScripts : []);
          setActiveScriptIndexState(isActone ? (currentActive.activeScriptIndex ?? 0) : 0);
          addToRecent(normalizedPath);
          triggerSaveStatusSaved();
          return normalizedPath;
        } else {
          setSaveStatus("idle");
        }
      } catch (e) {
        logger.error("file", "Save file dialog failed", e);
        setSaveStatus("idle");
        await confirm({
          title: "Save Failed",
          message: "Could not save file as requested. Please verify file path permissions.",
          buttons: [{ value: "ok", label: "OK", variant: "contained", color: "error" }]
        });
      }
    } else {
      const filename = await prompt({
        title: "Save As",
        message: "Enter a name for your project:",
        defaultValue: defaultName.replace(/\.actone$/i, "")
      });
      if (filename) {
        let isActone = filename.toLowerCase().endsWith(".actone");
        let finalName = filename;
        if (!filename.includes(".")) {
          finalName = filename + ".actone";
          isActone = true;
        } else {
          if (isActone) {
            finalName = filename.replace(/\.actone$/i, ".actone");
          } else {
            finalName = filename.toLowerCase().endsWith(".fountain") ? filename.replace(/\.fountain$/i, ".fountain") : `${filename}.fountain`;
          }
        }

        try {
          if (isActone) {
            const finalScripts = currentActive.scripts || [{
              name: finalName.replace(/\.actone$/i, ""),
              fileName: "document.fountain",
              content: cleanFountainText,
              savedContent: cleanFountainText,
            }];
            const zipped = await packActoneBundleAsync(finalScripts, currentActive.parsedDoc.settings);
            const blob = new Blob([zipped], { type: "application/zip" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = finalName;
            link.click();
            URL.revokeObjectURL(url);
            setFiles(prev => prev.map(f => f.id === currentId ? {
              ...f,
              filePath: finalName,
              isDirty: false,
              savedText: currentActive.rawText,
              scripts: finalScripts,
              activeScriptIndex: f.activeScriptIndex ?? 0,
            } : f));
            setScriptsState(finalScripts);
            setActiveScriptIndexState(currentActive.activeScriptIndex ?? 0);
            triggerSaveStatusSaved();
          } else {
            const blob = new Blob([cleanFountainText], { type: "text/plain;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = finalName;
            link.click();
            URL.revokeObjectURL(url);
            setFiles(prev => prev.map(f => f.id === currentId ? {
              ...f,
              filePath: finalName,
              isDirty: false,
              savedText: currentActive.rawText,
              scripts: undefined,
              activeScriptIndex: undefined,
            } : f));
            setScriptsState([]);
            setActiveScriptIndexState(0);
            triggerSaveStatusSaved();
          }

          setFilePath(finalName);
          return finalName;
        } catch (e) {
          logger.error("file", "Save file as failed (browser)", e);
          setSaveStatus("idle");
          await confirm({
            title: "Save Failed",
            message: "Could not generate or download file.",
            buttons: [{ value: "ok", label: "OK", variant: "contained", color: "error" }]
          });
        }
      } else {
        setSaveStatus("idle");
      }
    }
    return null;
  }, [confirm, prompt, isTauri, files, activeFileId]);

  const importAsActoneProject = useCallback(async (
    initialContent: string,
    scriptName: string = "Untitled",
    promptSaveImmediate: boolean = true
  ): Promise<void> => {
    const newId = generateUUID();
    const cleanName = scriptName.trim() || "Untitled";
    const scripts: ScriptInfo[] = [{
      name: cleanName,
      fileName: `${sanitizeFileName(cleanName)}.fountain`,
      content: initialContent,
      savedContent: "",
    }];
    const doc = parseScreenplay(initialContent, paperSize);
    const newFileObj: ScreenplayFile = {
      id: newId,
      filePath: null,
      rawText: initialContent,
      parsedDoc: doc,
      isSaving: false,
      isDirty: true,
      savedText: "",
      scripts,
      activeScriptIndex: 0,
    };

    setFiles(prev => {
      const currentActive = prev.find(f => f.id === activeFileIdRef.current);
      if (currentActive && !currentActive.filePath && (!currentActive.rawText || !currentActive.isDirty)) {
        return prev.map(f => f.id === currentActive.id ? newFileObj : f);
      }
      return [...prev, newFileObj];
    });

    filesRef.current = [...filesRef.current.filter(f => f.id !== activeFileIdRef.current || f.filePath || f.rawText), newFileObj];
    setActiveFileIdState(newId);
    activeFileIdRef.current = newId;
    setRawTextState(initialContent);
    setFilePath(null);
    setParsedDoc(doc);
    setScriptsState(scripts);
    setActiveScriptIndexState(0);

    if (promptSaveImmediate) {
      setTimeout(() => {
        saveFileAs(newId, cleanName);
      }, 350);
    }
  }, [paperSize, saveFileAs]);

  const setActiveScript = useCallback((index: number) => {
    const file = files.find(f => f.id === activeFileId);
    if (!file || !file.scripts || index < 0 || index >= file.scripts.length) return;

    const updatedScripts = file.scripts.map((s, i) =>
      i === (file.activeScriptIndex ?? 0) ? { ...s, content: rawText } : s
    );
    const newScript = updatedScripts[index];
    const doc = parseScreenplay(newScript.content, paperSize);
    if (file.parsedDoc.settings) {
      doc.settings = file.parsedDoc.settings;
    }

    setFiles(prev => prev.map(f => f.id === activeFileId ? {
      ...f,
      rawText: newScript.content,
      savedText: newScript.savedContent,
      parsedDoc: doc,
      isDirty: isBundleDirty(updatedScripts),
      scripts: updatedScripts,
      activeScriptIndex: index,
    } : f));

    setRawTextState(newScript.content);
    setParsedDoc(doc);
    setScriptsState(updatedScripts);
    setActiveScriptIndexState(index);
  }, [files, activeFileId, rawText, paperSize]);

  const addScript = useCallback(async (name?: string, forceType?: "fountain" | "markdown"): Promise<string | null> => {
    const file = files.find(f => f.id === activeFileId);
    if (!file || !file.scripts) return null;

    const isMarkdown = forceType === "markdown" || (forceType !== "fountain" && (name?.trim().toLowerCase().endsWith(".md") ?? false));
    const title = isMarkdown ? "New Prose" : "New Script";
    const message = isMarkdown ? "Enter a name for the prose file:" : "Enter a name for the script:";

    const baseName = name || (await prompt({
      title,
      message,
      defaultValue: "Untitled"
    }));
    if (!baseName) return null;

    const rawName = baseName.trim().toLowerCase().endsWith(".md") ? baseName.trim().slice(0, -3) : baseName.trim();
    const uniqueName = getUniqueName(rawName, file.scripts);
    const fileName = isMarkdown ? `files/${sanitizeFileName(uniqueName)}.md` : `files/${sanitizeFileName(uniqueName)}.fountain`;
    
    const newScript: ScriptInfo = {
      name: uniqueName,
      fileName,
      type: isMarkdown ? "markdown" : "fountain",
      content: "",
      savedContent: "",
    };

    const updatedScripts = [...file.scripts, newScript];
    setFiles(prev => prev.map(f => f.id === activeFileId ? {
      ...f,
      scripts: updatedScripts,
      activeScriptIndex: updatedScripts.length - 1,
      rawText: "",
      savedText: "",
      isDirty: true,
      parsedDoc: parseScreenplay("", paperSize),
    } : f));

    setScriptsState(updatedScripts);
    setActiveScriptIndexState(updatedScripts.length - 1);
    setRawTextState("");
    setParsedDoc(parseScreenplay("", paperSize));

    return uniqueName;
  }, [files, activeFileId, prompt, paperSize]);

  const renameScript = useCallback(async (index: number, newName: string): Promise<boolean> => {
    const file = files.find(f => f.id === activeFileId);
    if (!file || !file.scripts || index < 0 || index >= file.scripts.length) return false;

    const trimmed = newName.trim();
    if (!trimmed) return false;

    const duplicate = file.scripts.some((s, i) => i !== index && s.name.toLowerCase() === trimmed.toLowerCase());
    if (duplicate) {
      await confirm({
        title: "Duplicate Name",
        message: `A script named "${trimmed}" already exists.`,
        buttons: [{ value: "ok", label: "OK", variant: "contained" }]
      });
      return false;
    }

    const updatedScripts = file.scripts.map((s, i) =>
      i === index ? { ...s, name: trimmed, fileName: s.type === "markdown" ? `files/${sanitizeFileName(trimmed)}.md` : `${sanitizeFileName(trimmed)}.fountain` } : s
    );

    setFiles(prev => prev.map(f => f.id === activeFileId ? {
      ...f,
      scripts: updatedScripts,
      isDirty: true,
    } : f));
    setScriptsState(updatedScripts);
    return true;
  }, [files, activeFileId, confirm]);

  const duplicateScript = useCallback(async (index: number, name?: string): Promise<string | null> => {
    const file = files.find(f => f.id === activeFileId);
    if (!file || !file.scripts || index < 0 || index >= file.scripts.length) return null;

    const source = file.scripts[index];
    const newName = getUniqueName(name?.trim() || source.name, file.scripts);
    const isMarkdown = source.type === "markdown";
    const newFileName = isMarkdown ? `files/${sanitizeFileName(newName)}.md` : `${sanitizeFileName(newName)}.fountain`;
    const newScript: ScriptInfo = {
      name: newName,
      fileName: newFileName,
      type: source.type,
      content: source.content,
      savedContent: source.savedContent,
    };

    const insertAt = index + 1;
    const updatedScripts = [...file.scripts.slice(0, insertAt), newScript, ...file.scripts.slice(insertAt)];
    const newActiveIndex = insertAt;

    setFiles(prev => prev.map(f => f.id === activeFileId ? {
      ...f,
      scripts: updatedScripts,
      activeScriptIndex: newActiveIndex,
      rawText: newScript.content,
      savedText: newScript.savedContent,
      isDirty: true,
      parsedDoc: parseScreenplay(newScript.content, paperSize),
    } : f));

    setScriptsState(updatedScripts);
    setActiveScriptIndexState(newActiveIndex);
    setRawTextState(newScript.content);
    setParsedDoc(parseScreenplay(newScript.content, paperSize));

    return newName;
  }, [files, activeFileId, paperSize]);

  const deleteScript = useCallback(async (index: number): Promise<boolean> => {
    const file = files.find(f => f.id === activeFileId);
    if (!file || !file.scripts || index < 0 || index >= file.scripts.length) return false;


    const result = await confirm({
      title: "Delete Script",
      message: `Are you sure you want to delete "${file.scripts[index].name}"? This action cannot be undone.`,
      buttons: [
        { value: "delete", label: "Delete", variant: "contained", color: "error" },
        { value: "cancel", label: "Cancel", variant: "text", color: "inherit" }
      ]
    });
    if (result !== "delete") return false;

    const updatedScripts = file.scripts.filter((_, i) => i !== index);

    if (updatedScripts.length === 0) {
      const emptyDoc = parseScreenplay("", paperSize);
      if (file.parsedDoc.settings) {
        emptyDoc.settings = file.parsedDoc.settings;
      }
      setFiles(prev => prev.map(f => f.id === activeFileId ? {
        ...f,
        scripts: [],
        activeScriptIndex: undefined,
        rawText: "",
        savedText: "",
        isDirty: true,
        parsedDoc: emptyDoc,
      } : f));
      setScriptsState([]);
      setActiveScriptIndexState(0);
      setRawTextState("");
      setParsedDoc(emptyDoc);
      return true;
    }

    const currentIndex = file.activeScriptIndex ?? 0;
    let newActiveIndex = currentIndex;
    if (currentIndex >= updatedScripts.length) {
      newActiveIndex = updatedScripts.length - 1;
    } else if (currentIndex > index) {
      newActiveIndex = currentIndex - 1;
    }

    const newActiveScript = updatedScripts[newActiveIndex];
    const doc = parseScreenplay(newActiveScript.content, paperSize);
    if (file.parsedDoc.settings) {
      doc.settings = file.parsedDoc.settings;
    }

    setFiles(prev => prev.map(f => f.id === activeFileId ? {
      ...f,
      scripts: updatedScripts,
      activeScriptIndex: newActiveIndex,
      rawText: newActiveScript.content,
      savedText: newActiveScript.savedContent,
      isDirty: isBundleDirty(updatedScripts),
      parsedDoc: doc,
    } : f));

    setScriptsState(updatedScripts);
    setActiveScriptIndexState(newActiveIndex);
    setRawTextState(newActiveScript.content);
    setParsedDoc(doc);

    return true;
  }, [files, activeFileId, confirm, paperSize]);

  const importScript = useCallback(async (type?: "fountain" | "markdown"): Promise<string | null> => {
    const file = files.find(f => f.id === activeFileId);
    if (!file || !file.scripts) return null;

    let fileName = "";
    let content: string | null = "";

    if (isTauri) {
      try {
        const result = await invoke<{ path: string; name?: string; extension?: string } | null>("import_script_dialog", { format: type });
        if (!result || !result.path) return null;
        fileName = result.name || result.path.split(/[/\\]/).pop()?.replace(/\.(fountain|txt|fdx|fadein|spmd|md|markdown)$/i, "") || "Imported";
        
        if (result.path.toLowerCase().endsWith(".fadein")) {
          const bytes = await invoke<number[]>("read_file_binary", { path: result.path });
          content = parseScriptFileToFountain(result.path, new Uint8Array(bytes));
        } else {
          const raw = await invoke<string>("read_file_content", { path: result.path });
          content = type === "markdown" ? raw : parseScriptFileToFountain(result.path, raw);
        }
      } catch (e) {
        logger.error("file", "Import script dialog failed", e);
        return null;
      }
    } else {
      content = await new Promise<string | null>((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = type === "markdown" ? ".md,.markdown,.txt" : ".fountain,.txt,.fdx,.fadein,.spmd";
        input.onchange = async () => {
          const f = input.files?.[0];
          if (!f) { resolve(null); return; }
          fileName = f.name.replace(/\.(fountain|txt|fdx|fadein|spmd|md|markdown)$/i, "");
          if (f.name.toLowerCase().endsWith(".fadein")) {
            const buf = await f.arrayBuffer();
            resolve(parseScriptFileToFountain(f.name, new Uint8Array(buf)));
          } else {
            const text = await f.text();
            resolve(type === "markdown" ? text : parseScriptFileToFountain(f.name, text));
          }
        };
        input.click();
      });
      if (content === null) return null;
    }

    const uniqueName = getUniqueName(fileName.trim() || "Imported", file.scripts);
    const ext = type === "markdown" ? "md" : "fountain";
    const safeFileName = `${sanitizeFileName(uniqueName)}.${ext}`;
    const newScript: ScriptInfo = {
      name: uniqueName,
      fileName: safeFileName,
      content,
      savedContent: content,
      type: type || "fountain",
    };

    const updatedScripts = [...file.scripts, newScript];
    setFiles(prev => prev.map(f => f.id === activeFileId ? {
      ...f,
      scripts: updatedScripts,
      activeScriptIndex: updatedScripts.length - 1,
      rawText: content,
      savedText: content,
      isDirty: true,
      parsedDoc: parseScreenplay(content, paperSize),
    } : f));

    setScriptsState(updatedScripts);
    setActiveScriptIndexState(updatedScripts.length - 1);
    setRawTextState(content);
    setParsedDoc(parseScreenplay(content, paperSize));

    return uniqueName;
  }, [files, activeFileId, isTauri, paperSize]);

  const moveScript = useCallback(async (fromIndex: number, toIndex: number) => {
    const file = files.find(f => f.id === activeFileId);
    if (!file || !file.scripts) return;
    if (fromIndex < 0 || fromIndex >= file.scripts.length) return;
    if (toIndex < 0 || toIndex >= file.scripts.length) return;
    if (fromIndex === toIndex) return;

    const updatedScripts = [...file.scripts];
    const [moved] = updatedScripts.splice(fromIndex, 1);
    updatedScripts.splice(toIndex, 0, moved);

    const currentActive = file.activeScriptIndex ?? 0;
    let newActiveIndex = currentActive;
    if (currentActive === fromIndex) {
      newActiveIndex = toIndex;
    } else if (currentActive > fromIndex && currentActive <= toIndex) {
      newActiveIndex = currentActive - 1;
    } else if (currentActive < fromIndex && currentActive >= toIndex) {
      newActiveIndex = currentActive + 1;
    }

    const targetScript = updatedScripts[newActiveIndex];
    setFiles(prev => prev.map(f => f.id === activeFileId ? {
      ...f,
      scripts: updatedScripts,
      activeScriptIndex: newActiveIndex,
      rawText: targetScript.content,
      savedText: targetScript.savedContent,
      isDirty: true,
      parsedDoc: parseScreenplay(targetScript.content, paperSize),
    } : f));

    setScriptsState(updatedScripts);
    setActiveScriptIndexState(newActiveIndex);
    setRawTextState(targetScript.content);
    setParsedDoc(parseScreenplay(targetScript.content, paperSize));
  }, [files, activeFileId, paperSize]);

  const selectFileRef = useRef(selectFile);
  const saveFileRef = useRef(saveFile);

  useEffect(() => {
    selectFileRef.current = selectFile;
  }, [selectFile]);

  useEffect(() => {
    saveFileRef.current = saveFile;
  });

  const { autoSaveEnabled, autoSaveInterval } = useUI();
  const lastTypingTimeRef = useRef(0);

  useEffect(() => {
    const handleTypingActivity = () => {
      lastTypingTimeRef.current = Date.now();
    };
    window.addEventListener("keydown", handleTypingActivity, { passive: true });
    return () => window.removeEventListener("keydown", handleTypingActivity);
  }, []);

  useEffect(() => {
    if (!autoSaveEnabled) return;
    const timer = setInterval(() => {
      const currentFiles = filesRef.current;
      const currentId = activeFileIdRef.current;
      const file = currentFiles.find(f => f.id === currentId);
      if (file && file.isDirty && file.filePath) {
        const idleDuration = Date.now() - lastTypingTimeRef.current;
        // Only trigger auto-save if user has been idle (not typing) for at least 1500ms
        if (idleDuration >= 1500) {
          if (typeof window !== "undefined" && "requestIdleCallback" in window) {
            (window as any).requestIdleCallback(() => {
              saveFileRef.current();
            });
          } else {
            setTimeout(() => {
              saveFileRef.current();
            }, 0);
          }
        }
      }
    }, Math.min(autoSaveInterval, 3000));
    return () => clearInterval(timer);
  }, [autoSaveEnabled, autoSaveInterval]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Tab" && (e.ctrlKey || e.metaKey)) || (e.key === "PageDown" && e.ctrlKey) || (e.key === "PageUp" && e.ctrlKey)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        const currentFiles = filesRef.current;
        const currentActiveId = activeFileIdRef.current;
        if (currentFiles.length <= 1) return;

        const currentIndex = currentFiles.findIndex(f => f.id === currentActiveId);
        let nextIndex;
        if (e.shiftKey || e.key === "PageUp") {
          nextIndex = (currentIndex - 1 + currentFiles.length) % currentFiles.length;
        } else {
          nextIndex = (currentIndex + 1) % currentFiles.length;
        }

        const nextFile = currentFiles[nextIndex];
        selectFileRef.current(nextFile.id);
      }
    };
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    return () => {
      if (parseTimeoutRef.current !== null) {
        clearTimeout(parseTimeoutRef.current);
      }
    };
  }, []);

  const activeScriptName = scriptsState[activeScriptIndex]?.name || "";
  const scriptFileName = scriptsState[activeScriptIndex]?.fileName || "";

  return (
    <FileContext.Provider
      value={{
        files,
        activeFileId,
        filePath,
        isSaving,
        rawText,
        parsedDoc,
        setRawText,
        updateFileScriptContent,
        openFile,
        saveFile,
        saveFileAs,
        selectFile,
        newFile,
        importAsActoneProject,
        closeFile,
        closeOthers,
        closeAll,
        recentFiles,
        openFilePath,
        removeFromRecent,
        updateSettings,
        scripts: scriptsState,
        activeScriptIndex,
        activeScriptName,
        scriptFileName,
        isBundle,
        setActiveScript,
        addScript,
        importScript,
        renameScript,
        duplicateScript,
        deleteScript,
        moveScript,
        saveStatus,
      }}
    >
      {children}
    </FileContext.Provider>
  );
};
