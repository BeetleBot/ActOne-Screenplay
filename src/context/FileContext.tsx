import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { parseScreenplay, FountainDocument } from "../parser";
import { invoke } from "@tauri-apps/api/core";
import { useUI } from "./UIContext";
import { unpackActoneBundle, packActoneBundle } from "../utils";
import type { ScriptInfo } from "../utils";
import { logger } from "../utils/logger";
import { useCustomModal } from "./CustomModalContext";
import { STORAGE_KEYS, MAX_RECENT_FILES } from "../constants";

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
  saveFileAs: () => Promise<string | null>;
  selectFile: (id: string) => void;
  newFile: (initialContent?: string) => void;
  closeFile: (id: string) => Promise<void>;
  closeOthers: (id: string) => Promise<void>;
  closeAll: () => Promise<void>;
  recentFiles: RecentFile[];
  openFilePath: (path: string) => Promise<void>;
  removeFromRecent: (path: string) => void;
  updateSettings: (updater: SettingsUpdater) => void;
  scripts: ScriptInfo[];
  activeScriptIndex: number;
  activeScriptName: string;
  isBundle: boolean;
  setActiveScript: (index: number) => void;
  addScript: (name?: string) => Promise<string | null>;
  importScript: () => Promise<string | null>;
  renameScript: (index: number, newName: string) => Promise<boolean>;
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

const sanitizeFileName = (name: string): string =>
  name.replace(/[<>:"/\\|?*\x00-\x1f]/g, "").trim() || "Untitled";

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

  const [rawText, setRawTextState] = useState<string>(defaultText);
  const [parsedDoc, setParsedDoc] = useState<FountainDocument>(() => parseScreenplay(defaultText, paperSize));
  const [filePath, setFilePath] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [scriptsState, setScriptsState] = useState<ScriptInfo[]>([]);
  const [activeScriptIndex, setActiveScriptIndexState] = useState<number>(0);

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
        return { ...f, parsedDoc: { ...doc, pageBreaks: undefined, settings: mergedSettings } };
      }));
      setParsedDoc(prevDoc => {
        const doc = parseScreenplay(rawText, paperSize);
        const mergedSettings = (doc.settings && Object.keys(doc.settings).length > 0)
          ? doc.settings
          : prevDoc.settings;
        return { ...doc, pageBreaks: undefined, settings: mergedSettings };
      });
    };
    updateAll();
  }, [paperSize]);

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
    const scripts: ScriptInfo[] = [{
      name: scriptName,
      fileName: `${scriptName}.fountain`,
      content: initialContent,
      savedContent: initialContent,
    }];
    const newFileObj: ScreenplayFile = {
      id: newId,
      filePath: null,
      rawText: initialContent,
      parsedDoc: parseScreenplay(initialContent, paperSize),
      isSaving: false,
      isDirty: initialContent !== "",
      savedText: "",
      scripts,
      activeScriptIndex: 0,
    };
    setFiles(prev => [...prev, newFileObj]);
    setActiveFileIdState(newId);
    setRawTextState(initialContent);
    setFilePath(null);
    setParsedDoc(newFileObj.parsedDoc);
    setScriptsState(scripts);
    setActiveScriptIndexState(0);
  };

  const closeFile = async (id: string) => {
    const fileToClose = files.find(f => f.id === id);
    if (!fileToClose) return;

    if (fileToClose.isDirty) {
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
        const updated = files.find(f => f.id === id);
        if (updated && updated.isDirty) return;
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
        const updated = files.find(file => file.id === f.id);
        if (updated && updated.isDirty) return;
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
        const updated = files.find(file => file.id === f.id);
        if (updated && updated.isDirty) return;
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

    const doc = parseScreenplay(normalized, paperSize);
    setFiles(prev => prev.map(f => {
      if (f.id === activeFileId) {
        const mergedSettings = (doc.settings && Object.keys(doc.settings).length > 0)
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

        return {
          ...f,
          rawText: normalized,
          isDirty,
          parsedDoc: { ...doc, pageBreaks: undefined, settings: mergedSettings },
          scripts: updatedScripts,
        };
      }
      return f;
    }));
    setParsedDoc(prevDoc => {
      const mergedSettings = (doc.settings && Object.keys(doc.settings).length > 0)
        ? doc.settings
        : prevDoc.settings;
      return { ...doc, pageBreaks: undefined, settings: mergedSettings };
    });
  };

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

  const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

  // Validate recent files on startup — remove any that no longer exist
  useEffect(() => {
    if (!isTauri || recentFiles.length === 0) return;
    (async () => {
      for (const f of recentFiles) {
        try {
          const exists = await invoke<boolean>("file_exists", { path: f.path });
          if (!exists) removeFromRecent(f.path);
        } catch (e) { logger.warn("file", "Failed to check file existence", e); }
      }
    })();
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
    }, 1000);

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
    }, 1000);

    return () => clearTimeout(handler);
  }, [rawText, paperSize, activeFileId, isTauri]);

  const openFilePath = async (path: string) => {
    const isActone = path.toLowerCase().endsWith(".actone");
    const normalizedPath = isActone ? path.replace(/\.actone$/i, ".actone") : path;
    const existing = files.find(f => f.filePath?.toLowerCase() === normalizedPath.toLowerCase());
    if (existing) {
      selectFile(existing.id);
      return;
    }

    let settings = {};
    let scripts: ScriptInfo[] = [];
    const bundleName = path.split(/[/\\]/).pop()?.replace(/\.actone$/i, "") || "Untitled";

    try {
      if (isTauri) {
        if (isActone) {
          const bytes = await invoke<number[]>("read_file_binary", { path });
          const bundle = unpackActoneBundle(new Uint8Array(bytes), bundleName);
          scripts = bundle.scripts;
          settings = bundle.settings;
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
    let res: { path: string; content: string; settings?: any } | null = null;
    if (isTauri) {
      try {
        res = await invoke<{ path: string; content: string } | null>("open_file_dialog");
      } catch (e) {
        logger.error("file", "Open file dialog failed", e);
      }
    } else {
      res = await new Promise<{ path: string; content: string; settings?: any } | null>((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".fountain,.txt,.actone";
        input.onchange = async () => {
          const file = input.files?.[0];
          if (!file) {
            resolve(null);
            return;
          }
          if (file.name.toLowerCase().endsWith(".actone")) {
            const arrayBuffer = await file.arrayBuffer();
            const bundle = unpackActoneBundle(new Uint8Array(arrayBuffer), file.name.replace(/\.actone$/i, ""));
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
      const isActone = res.path.toLowerCase().endsWith(".actone");
      const normalizedPath = isActone ? res.path.replace(/\.actone$/i, ".actone") : res.path;
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
      const bundleName = res.path.split(/[/\\]/).pop()?.replace(/\.actone$/i, "") || "Untitled";

      if (isActone) {
        if (isTauri) {
          try {
            const bytes = await invoke<number[]>("read_file_binary", { path: res.path });
            const bundle = unpackActoneBundle(new Uint8Array(bytes), bundleName);
            scripts = bundle.scripts;
            content = bundle.scripts[0]?.content || "";
            settings = bundle.settings;
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

  const saveActoneFile = async (path: string, scripts: ScriptInfo[], settings: any) => {
    const isActone = path.toLowerCase().endsWith(".actone");
    const normalizedPath = isActone ? path.replace(/\.actone$/i, ".actone") : path;
    const zipped = packActoneBundle(scripts, settings);
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
        } finally {
          setIsSaving(false);
          setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, isSaving: false } : f));
        }
      } else {
        try {
          const zipped = packActoneBundle(updatedScripts, currentActive.parsedDoc.settings);
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
        }
      }
    }
  };

  const saveFileAs = async (): Promise<string | null> => {
    const currentActive = files.find(f => f.id === activeFileId);
    if (!currentActive) return null;
    const cleanFountainText = currentActive.parsedDoc.lines.map(l => l.text).join("\n");

    setSaveStatus("saving");
    if (isTauri) {
      try {
        const path = await invoke<string | null>("save_file_dialog", { content: cleanFountainText });
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
          setFiles(prev => prev.map(f => f.id === activeFileId ? {
            ...f,
            filePath: normalizedPath,
            isDirty: false,
            savedText: rawText,
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
      }
    } else {
      const filename = await prompt({
        title: "Save As",
        message: "Enter filename to save:",
        defaultValue: filePath || "Untitled.actone"
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
            const zipped = packActoneBundle(finalScripts, currentActive.parsedDoc.settings);
            const blob = new Blob([zipped], { type: "application/zip" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = finalName;
            link.click();
            URL.revokeObjectURL(url);
            setFiles(prev => prev.map(f => f.id === activeFileId ? {
              ...f,
              filePath: finalName,
              isDirty: false,
              savedText: rawText,
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
            setFiles(prev => prev.map(f => f.id === activeFileId ? {
              ...f,
              filePath: finalName,
              isDirty: false,
              savedText: rawText,
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
        }
      } else {
        setSaveStatus("idle");
      }
    }
    return null;
  };

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

  const addScript = useCallback(async (name?: string): Promise<string | null> => {
    const file = files.find(f => f.id === activeFileId);
    if (!file || !file.scripts) return null;

    const baseName = name || (await prompt({
      title: "New Script",
      message: "Enter a name for the new script:",
      defaultValue: "Untitled"
    }));
    if (!baseName) return null;

    const uniqueName = getUniqueName(baseName.trim(), file.scripts);
    const fileName = `${sanitizeFileName(uniqueName)}.fountain`;
    const newScript: ScriptInfo = {
      name: uniqueName,
      fileName,
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
      i === index ? { ...s, name: trimmed, fileName: `${sanitizeFileName(trimmed)}.fountain` } : s
    );

    setFiles(prev => prev.map(f => f.id === activeFileId ? {
      ...f,
      scripts: updatedScripts,
      isDirty: true,
    } : f));
    setScriptsState(updatedScripts);
    return true;
  }, [files, activeFileId, confirm]);

  const deleteScript = useCallback(async (index: number): Promise<boolean> => {
    const file = files.find(f => f.id === activeFileId);
    if (!file || !file.scripts || index < 0 || index >= file.scripts.length) return false;

    if (file.scripts.length <= 1) {
      await confirm({
        title: "Cannot Delete",
        message: "A bundle must have at least one script.",
        buttons: [{ value: "ok", label: "OK", variant: "contained" }]
      });
      return false;
    }

    const result = await confirm({
      title: "Delete Script",
      message: `Are you sure you want to delete "${file.scripts[index].name}"? This action cannot be undone.`,
      buttons: [
        { value: "yes", label: "Delete", variant: "contained", color: "error" },
        { value: "no", label: "Cancel", variant: "text", color: "inherit" }
      ]
    });
    if (result !== "yes") return false;

    const updatedScripts = file.scripts.filter((_, i) => i !== index);
    let newActiveIndex = file.activeScriptIndex ?? 0;
    if (newActiveIndex >= updatedScripts.length) {
      newActiveIndex = updatedScripts.length - 1;
    }

    const targetScript = updatedScripts[newActiveIndex];
    const doc = parseScreenplay(targetScript.content, paperSize);
    if (file.parsedDoc.settings) {
      doc.settings = file.parsedDoc.settings;
    }

    const targetIdx = newActiveIndex;

    setFiles(prev => prev.map(f => f.id === activeFileId ? {
      ...f,
      scripts: updatedScripts,
      activeScriptIndex: targetIdx,
      rawText: targetScript.content,
      savedText: targetScript.savedContent,
      isDirty: true,
      parsedDoc: doc,
    } : f));

    setScriptsState(updatedScripts);
    setActiveScriptIndexState(targetIdx);
    setRawTextState(targetScript.content);
    setParsedDoc(doc);

    return true;
  }, [files, activeFileId, confirm, paperSize]);

  const importScript = useCallback(async (): Promise<string | null> => {
    const file = files.find(f => f.id === activeFileId);
    if (!file || !file.scripts) return null;

    let fileName = "";
    let content: string | null = "";

    if (isTauri) {
      try {
        const result = await invoke<{ path: string; content: string } | null>("import_fountain_dialog");
        if (!result) return null;
        fileName = result.path.split(/[/\\]/).pop()?.replace(/\.(fountain|txt)$/i, "") || "Imported";
        content = result.content;
      } catch (e) {
        logger.error("file", "Import script dialog failed", e);
        return null;
      }
    } else {
      content = await new Promise<string | null>((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".fountain,.txt";
        input.onchange = async () => {
          const f = input.files?.[0];
          if (!f) { resolve(null); return; }
          fileName = f.name.replace(/\.(fountain|txt)$/i, "");
          resolve(await f.text());
        };
        input.click();
      });
      if (content === null) return null;
    }

    const uniqueName = getUniqueName(fileName.trim() || "Imported", file.scripts);
    const safeFileName = `${sanitizeFileName(uniqueName)}.fountain`;
    const newScript: ScriptInfo = {
      name: uniqueName,
      fileName: safeFileName,
      content,
      savedContent: content,
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

  const filesRef = useRef(files);
  const activeFileIdRef = useRef(activeFileId);
  const selectFileRef = useRef(selectFile);
  const saveFileRef = useRef(saveFile);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    activeFileIdRef.current = activeFileId;
  }, [activeFileId]);

  useEffect(() => {
    selectFileRef.current = selectFile;
  }, [selectFile]);

  useEffect(() => {
    saveFileRef.current = saveFile;
  });

  const { autoSaveEnabled, autoSaveInterval } = useUI();

  useEffect(() => {
    if (!autoSaveEnabled) return;
    const timer = setInterval(() => {
      const currentFiles = filesRef.current;
      const currentId = activeFileIdRef.current;
      const file = currentFiles.find(f => f.id === currentId);
      if (file && file.isDirty && file.filePath) {
        saveFileRef.current();
      }
    }, autoSaveInterval);
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

  const activeScriptName = scriptsState[activeScriptIndex]?.name || "";

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
        openFile,
        saveFile,
        saveFileAs,
        selectFile,
        newFile,
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
        isBundle,
        setActiveScript,
        addScript,
        importScript,
        renameScript,
        deleteScript,
        moveScript,
        saveStatus,
      }}
    >
      {children}
    </FileContext.Provider>
  );
};
