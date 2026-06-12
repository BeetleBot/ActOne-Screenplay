import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { parseScreenplay, FountainDocument } from "../parser";
import { invoke } from "@tauri-apps/api/core";
import { useUI } from "./UIContext";
import { computeRevisedLines, unpackActoneBundle, packActoneBundle } from "../utils";
import { useCustomModal } from "./CustomModalContext";

export interface ScreenplayFile {
  id: string;
  filePath: string | null;
  rawText: string;
  parsedDoc: FountainDocument;
  isSaving: boolean;
  isDirty: boolean;
  savedText: string;
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
  updateSettings: (updater: (prev: any) => any) => void;
}

const FileContext = createContext<FileContextProps | undefined>(undefined);

export const useFile = () => {
  const context = useContext(FileContext);
  if (!context) throw new Error("useFile must be used within a FileProvider");
  return context;
};

export const FileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { paperSize, fontFamily } = useUI();
  const { confirm, prompt } = useCustomModal();

  const generateUUID = () => "file-" + Math.random().toString(36).substring(2, 15);

  const defaultText = "";

  const [files, setFiles] = useState<ScreenplayFile[]>([]);
  const [activeFileId, setActiveFileIdState] = useState<string>("");
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>(() => {
    const saved = localStorage.getItem("actone-recent-files");
    return saved ? JSON.parse(saved) : [];
  });

  const addToRecent = (path: string) => {
    setRecentFiles(prev => {
      const name = path.split(/[/\\]/).pop() || "Untitled";
      const filtered = prev.filter(f => f.path !== path);
      const updated = [{ path, name, lastOpened: Date.now() }, ...filtered].slice(0, 10);
      localStorage.setItem("actone-recent-files", JSON.stringify(updated));
      return updated;
    });
  };

  const removeFromRecent = (path: string) => {
    setRecentFiles(prev => {
      const updated = prev.filter(f => f.path !== path);
      localStorage.setItem("actone-recent-files", JSON.stringify(updated));
      return updated;
    });
  };

  const [rawText, setRawTextState] = useState<string>(defaultText);
  const [parsedDoc, setParsedDoc] = useState<FountainDocument>(() => parseScreenplay(defaultText, paperSize));
  const [filePath, setFilePath] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
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
  }, [paperSize]);

  const selectFile = (id: string) => {
    const file = files.find(f => f.id === id);
    if (!file) return;
    setActiveFileIdState(id);
    setRawTextState(file.rawText);
    setFilePath(file.filePath);
    setParsedDoc(file.parsedDoc);
    setIsSaving(file.isSaving);
  };

  const newFile = (initialContent: string = "") => {
    const newId = generateUUID();
    const newFileObj: ScreenplayFile = {
      id: newId,
      filePath: null,
      rawText: initialContent,
      parsedDoc: parseScreenplay(initialContent, paperSize),
      isSaving: false,
      isDirty: initialContent !== "",
      savedText: "",
    };
    setFiles(prev => [...prev, newFileObj]);
    setActiveFileIdState(newId);
    setRawTextState(initialContent);
    setFilePath(null);
    setParsedDoc(newFileObj.parsedDoc);
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
        if (updated && updated.isDirty) return; // aborted or cancelled save
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
    } else {
      setFiles(newFiles);
      if (activeFileId === id) {
        const nextActiveIndex = index >= newFiles.length ? newFiles.length - 1 : index;
        const nextFile = newFiles[nextActiveIndex];
        setActiveFileIdState(nextFile.id);
        setRawTextState(nextFile.rawText);
        setFilePath(nextFile.filePath);
        setParsedDoc(nextFile.parsedDoc);
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
        if (updated && updated.isDirty) return; // aborted or cancelled save
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
        if (updated && updated.isDirty) return; // aborted or cancelled save
      }
    }
    setFiles([]);
    setActiveFileIdState("");
    setRawTextState("");
    setFilePath(null);
    setParsedDoc(parseScreenplay("", paperSize));
  };

  const setRawText = (text: string) => {
    const normalized = text.replace(/\r\n/g, "\n");
    setRawTextState(normalized);
    
    const doc = parseScreenplay(normalized, paperSize);
    setFiles(prev => prev.map(f => {
      if (f.id === activeFileId) {
        const isDirty = normalized !== f.savedText;
        const mergedSettings = (doc.settings && Object.keys(doc.settings).length > 0)
          ? doc.settings
          : f.parsedDoc.settings;
        return { ...f, rawText: normalized, isDirty, parsedDoc: { ...doc, pageBreaks: undefined, settings: mergedSettings } };
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

  const updateSettings = (updater: (prev: any) => any) => {
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

  const isTauri = typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__;

  const revisionModeEnabled = parsedDoc?.settings?.revisionModeEnabled;
  const revisionBaseText = parsedDoc?.settings?.revisionBaseText;

  useEffect(() => {
    if (!isTauri) return;

    const handler = setTimeout(async () => {
      try {
        let revisedLines: boolean[] = [];
        if (revisionModeEnabled && typeof revisionBaseText === "string") {
          revisedLines = computeRevisedLines(revisionBaseText, rawText);
        }

        const breaks = await invoke<number[]>("get_page_breaks", {
          fountainText: rawText,
          paperSize,
          fontFamily,
          boldSceneHeadings: false,
          mirrorSceneNumbers: "off",
          exportSections: false,
          exportSynopses: false,
          exportTitlePage: true,
          revisedLines,
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
        console.error(err);
      }
    }, 1000);

    return () => clearTimeout(handler);
  }, [rawText, paperSize, fontFamily, activeFileId, isTauri, revisionModeEnabled, revisionBaseText]);

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
    const existing = files.find(f => f.filePath === path);
    if (existing) {
      selectFile(existing.id);
      return;
    }

    let content = "";
    let settings = {};
    const isActone = path.toLowerCase().endsWith(".actone");

    try {
      if (isTauri) {
        if (isActone) {
          const bytes = await invoke<number[]>("read_file_binary", { path });
          const bundle = unpackActoneBundle(new Uint8Array(bytes));
          content = bundle.content;
          settings = bundle.settings;
        } else {
          content = await invoke<string>("read_file_content", { path });
        }
      } else {
        throw new Error("Cannot open direct path in web mode");
      }
    } catch (e) {
      console.error(e);
      removeFromRecent(path);
      await confirm({
        title: "Error Opening File",
        message: "Could not open file: " + path,
        buttons: [{ value: "ok", label: "OK", variant: "contained" }]
      });
      return;
    }

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
        filePath: path,
        rawText: cleanText,
        savedText: cleanText,
        isDirty: false,
        parsedDoc: parsed
      } : f));
      setFilePath(path);
      setRawTextState(cleanText);
      setParsedDoc(parsed);
      addToRecent(path);
    } else {
      const newId = generateUUID();
      const newFileObj: ScreenplayFile = {
        id: newId,
        filePath: path,
        rawText: cleanText,
        savedText: cleanText,
        isDirty: false,
        parsedDoc: parsed,
        isSaving: false,
      };
      setFiles(prev => [...prev, newFileObj]);
      setActiveFileIdState(newId);
      setFilePath(path);
      setRawTextState(cleanText);
      setParsedDoc(parsed);
      addToRecent(path);
    }
  };

  const openFile = async () => {
    let res: { path: string; content: string; settings?: any } | null = null;
    if (isTauri) {
      try {
        res = await invoke<{ path: string; content: string } | null>("open_file_dialog");
      } catch (e) {
        console.error(e);
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
            const bundle = unpackActoneBundle(new Uint8Array(arrayBuffer));
            resolve({ path: file.name, content: bundle.content, settings: bundle.settings });
          } else {
            const content = await file.text();
            resolve({ path: file.name, content });
          }
        };
        input.click();
      });
    }

    if (res) {
      if (isTauri) addToRecent(res.path);
      const existing = files.find(f => f.filePath === res.path);
      if (existing) {
        selectFile(existing.id);
        return;
      }

      const currentActive = files.find(f => f.id === activeFileId);
      const isDefault = currentActive && !currentActive.filePath && 
                        (currentActive.rawText === "" || !currentActive.isDirty);

      let content = res.content;
      let settings = res.settings || {};
      const isActone = res.path.toLowerCase().endsWith(".actone");

      if (isActone && isTauri) {
        try {
          const bytes = await invoke<number[]>("read_file_binary", { path: res.path });
          const bundle = unpackActoneBundle(new Uint8Array(bytes));
          content = bundle.content;
          settings = bundle.settings;
        } catch (e) {
          console.error(e);
          await confirm({
            title: "Error Reading Bundle",
            message: "Could not read actone bundle binary",
            buttons: [{ value: "ok", label: "OK", variant: "contained" }]
          });
          return;
        }
      }

      const parsed = parseScreenplay(content, paperSize);
      if (isActone) {
        parsed.settings = settings;
      }
      const cleanText = parsed.screenplayText;

      if (isDefault && currentActive) {
        const updatedFiles = files.map(f => f.id === activeFileId ? {
          ...f,
          filePath: res.path,
          rawText: cleanText,
          savedText: cleanText,
          isDirty: false,
          parsedDoc: parsed
        } : f);
        setFiles(updatedFiles);
        setFilePath(res.path);
        setRawTextState(cleanText);
        setParsedDoc(parsed);
      } else {
        const newId = generateUUID();
        const newFileObj: ScreenplayFile = {
          id: newId,
          filePath: res.path,
          rawText: cleanText,
          savedText: cleanText,
          isDirty: false,
          parsedDoc: parsed,
          isSaving: false,
        };
        setFiles(prev => [...prev, newFileObj]);
        setActiveFileIdState(newId);
        setFilePath(res.path);
        setRawTextState(cleanText);
        setParsedDoc(parsed);
      }
    }
  };

  const saveActoneFile = async (path: string, text: string, settings: any) => {
    const zipped = packActoneBundle(text, settings);
    await invoke("save_file_binary", { path, bytes: Array.from(zipped) });
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

    if (isActone) {
      if (isTauri) {
        setIsSaving(true);
        setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, isSaving: true } : f));
        try {
          await saveActoneFile(currentActive.filePath, cleanFountainText, currentActive.parsedDoc.settings);
          setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, isDirty: false, savedText: rawText } : f));
        } catch (e) {
          console.error(e);
        } finally {
          setIsSaving(false);
          setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, isSaving: false } : f));
        }
      } else {
        const zipped = packActoneBundle(cleanFountainText, currentActive.parsedDoc.settings);
        const blob = new Blob([zipped], { type: "application/zip" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = currentActive.filePath;
        link.click();
        URL.revokeObjectURL(url);
        setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, isDirty: false, savedText: rawText } : f));
      }
    } else {
      if (isTauri) {
        setIsSaving(true);
        setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, isSaving: true } : f));
        try {
          await invoke("save_file_content", { path: currentActive.filePath, content: cleanFountainText });
          setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, isDirty: false, savedText: rawText } : f));
        } catch (e) {
          console.error(e);
        } finally {
          setIsSaving(false);
          setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, isSaving: false } : f));
        }
      } else {
        const blob = new Blob([cleanFountainText], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = currentActive.filePath.endsWith(".fountain") ? currentActive.filePath : `${currentActive.filePath}.fountain`;
        link.click();
        URL.revokeObjectURL(url);
        setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, isDirty: false, savedText: rawText } : f));
      }
    }
  };

  const saveFileAs = async (): Promise<string | null> => {
    const currentActive = files.find(f => f.id === activeFileId);
    if (!currentActive) return null;
    const cleanFountainText = currentActive.parsedDoc.lines.map(l => l.text).join("\n");

    if (isTauri) {
      try {
        const path = await invoke<string | null>("save_file_dialog", { content: cleanFountainText });
        if (path) {
          const isActone = path.toLowerCase().endsWith(".actone");
          if (isActone) {
            await saveActoneFile(path, cleanFountainText, currentActive.parsedDoc.settings);
          }
          setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, filePath: path, isDirty: false, savedText: rawText } : f));
          setFilePath(path);
          addToRecent(path);
          return path;
        }
      } catch (e) {
        console.error(e);
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
          finalName = isActone ? filename : (filename.endsWith(".fountain") ? filename : `${filename}.fountain`);
        }
        let blob: Blob;

        if (isActone) {
          const zipped = packActoneBundle(cleanFountainText, currentActive.parsedDoc.settings);
          blob = new Blob([zipped], { type: "application/zip" });
        } else {
          blob = new Blob([cleanFountainText], { type: "text/plain;charset=utf-8" });
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = finalName;
        link.click();
        URL.revokeObjectURL(url);
        
        setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, filePath: finalName, isDirty: false, savedText: rawText } : f));
        setFilePath(finalName);
        return finalName;
      }
    }
    return null;
  };

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
      if (((e.key === "Tab" || e.keyCode === 9) && e.ctrlKey) || (e.key === "PageDown" && e.ctrlKey) || (e.key === "PageUp" && e.ctrlKey)) {
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
      }}
    >
      {children}
    </FileContext.Provider>
  );
};
