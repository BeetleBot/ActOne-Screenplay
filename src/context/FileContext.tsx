import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { parseScreenplay, serializeScreenplay, FountainDocument } from "../parser/FountainParser";
import { invoke } from "@tauri-apps/api/core";
import { useUI } from "./UIContext";

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
  saveFileAs: () => Promise<void>;
  selectFile: (id: string) => void;
  newFile: (initialContent?: string) => void;
  closeFile: (id: string) => void;
  recentFiles: RecentFile[];
  openFilePath: (path: string) => Promise<void>;
  removeFromRecent: (path: string) => void;
}

const FileContext = createContext<FileContextProps | undefined>(undefined);

export const useFile = () => {
  const context = useContext(FileContext);
  if (!context) throw new Error("useFile must be used within a FileProvider");
  return context;
};

export const FileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { paperSize, triggerTemporaryTabBar } = useUI();

  const generateUUID = () => "file-" + Math.random().toString(36).substring(2, 15);

  const initialFileId = useRef(generateUUID());
  const defaultText = "";

  const [files, setFiles] = useState<ScreenplayFile[]>(() => [
    {
      id: initialFileId.current,
      filePath: null,
      rawText: defaultText,
      parsedDoc: parseScreenplay(defaultText, paperSize),
      isSaving: false,
      isDirty: false,
      savedText: defaultText,
    }
  ]);
  const [activeFileId, setActiveFileIdState] = useState<string>(initialFileId.current);
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
  
  const workerRef = useRef<Worker | null>(null);
  const activeFileIdRef = useRef(activeFileId);

  useEffect(() => {
    activeFileIdRef.current = activeFileId;
  }, [activeFileId]);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL("../parser/FountainParser.worker.ts", import.meta.url),
      { type: "module" }
    );

    workerRef.current.onmessage = (e: MessageEvent<FountainDocument & { fileId?: string }>) => {
      const data = e.data;
      const targetId = data.fileId;
      if (targetId) {
        setFiles(prev => prev.map(f => f.id === targetId ? { ...f, parsedDoc: data } : f));
        if (targetId === activeFileIdRef.current) {
          setParsedDoc(data);
        }
      } else {
        setParsedDoc(data);
      }
    };

    workerRef.current.postMessage({ text: rawText, paperSize, fileId: activeFileIdRef.current });

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  useEffect(() => {
    files.forEach(f => {
      if (workerRef.current) {
        workerRef.current.postMessage({ text: f.rawText, paperSize, fileId: f.id });
      } else {
        const doc = parseScreenplay(f.rawText, paperSize);
        setFiles(prev => prev.map(file => file.id === f.id ? { ...file, parsedDoc: doc } : file));
        if (f.id === activeFileId) {
          setParsedDoc(doc);
        }
      }
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
    if (workerRef.current) {
      workerRef.current.postMessage({ text: file.rawText, paperSize, fileId: id });
    }
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
    if (workerRef.current) {
      workerRef.current.postMessage({ text: initialContent, paperSize, fileId: newId });
    }
  };

  const closeFile = (id: string) => {
    const fileToClose = files.find(f => f.id === id);
    if (!fileToClose) return;

    if (fileToClose.isDirty) {
      const confirmClose = window.confirm(`"${fileToClose.filePath ? fileToClose.filePath.split(/[/\\]/).pop() : 'Untitled'}" has unsaved changes. Are you sure you want to close it?`);
      if (!confirmClose) return;
    }

    const index = files.findIndex(f => f.id === id);
    const newFiles = files.filter(f => f.id !== id);

    if (newFiles.length === 0) {
      const newId = generateUUID();
      const newFileObj: ScreenplayFile = {
        id: newId,
        filePath: null,
        rawText: defaultText,
        parsedDoc: parseScreenplay(defaultText, paperSize),
        isSaving: false,
        isDirty: false,
        savedText: defaultText,
      };
      setFiles([newFileObj]);
      setActiveFileIdState(newId);
      setRawTextState(defaultText);
      setFilePath(null);
      setParsedDoc(newFileObj.parsedDoc);
      if (workerRef.current) {
        workerRef.current.postMessage({ text: defaultText, paperSize, fileId: newId });
      }
    } else {
      setFiles(newFiles);
      if (activeFileId === id) {
        const nextActiveIndex = index >= newFiles.length ? newFiles.length - 1 : index;
        const nextFile = newFiles[nextActiveIndex];
        setActiveFileIdState(nextFile.id);
        setRawTextState(nextFile.rawText);
        setFilePath(nextFile.filePath);
        setParsedDoc(nextFile.parsedDoc);
        if (workerRef.current) {
          workerRef.current.postMessage({ text: nextFile.rawText, paperSize, fileId: nextFile.id });
        }
      }
    }
  };

  const setRawText = (text: string) => {
    const normalized = text.replace(/\r\n/g, "\n");
    setRawTextState(normalized);
    
    setFiles(prev => prev.map(f => {
      if (f.id === activeFileId) {
        const isDirty = normalized !== f.savedText;
        return { ...f, rawText: normalized, isDirty };
      }
      return f;
    }));

    if (workerRef.current) {
      workerRef.current.postMessage({ text: normalized, paperSize, fileId: activeFileId });
    } else {
      const doc = parseScreenplay(normalized, paperSize);
      setParsedDoc(doc);
      setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, parsedDoc: doc } : f));
    }
  };

  const isTauri = typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__;

  const openFilePath = async (path: string) => {
    const existing = files.find(f => f.filePath === path);
    if (existing) {
      selectFile(existing.id);
      return;
    }

    let content: string;
    try {
      if (isTauri) {
        content = await invoke<string>("read_file_content", { path });
      } else {
        throw new Error("Cannot open direct path in web mode");
      }
    } catch (e) {
      console.error(e);
      removeFromRecent(path);
      alert("Could not open file: " + path);
      return;
    }

    const parsed = parseScreenplay(content, paperSize);
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
      if (workerRef.current) {
        workerRef.current.postMessage({ text: cleanText, paperSize, fileId: activeFileId });
      }
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
      if (workerRef.current) {
        workerRef.current.postMessage({ text: cleanText, paperSize, fileId: newId });
      }
    }
  };

  const openFile = async () => {
    let res: { path: string; content: string } | null = null;
    if (isTauri) {
      try {
        res = await invoke<{ path: string; content: string } | null>("open_file_dialog");
      } catch (e) {
        console.error(e);
      }
    } else {
      res = await new Promise<{ path: string; content: string } | null>((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".fountain,.txt,.fdx";
        input.onchange = async () => {
          const file = input.files?.[0];
          if (!file) {
            resolve(null);
            return;
          }
          const content = await file.text();
          resolve({ path: file.name, content });
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

      const parsed = parseScreenplay(res.content, paperSize);
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
        if (workerRef.current) {
          workerRef.current.postMessage({ text: cleanText, paperSize, fileId: activeFileId });
        }
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
        if (workerRef.current) {
          workerRef.current.postMessage({ text: cleanText, paperSize, fileId: newId });
        }
      }
    }
  };

  const saveFile = async () => {
    const currentActive = files.find(f => f.id === activeFileId);
    if (!currentActive) return;
    if (!currentActive.filePath) {
      await saveFileAs();
      return;
    }
    const fullSerializedContent = serializeScreenplay(currentActive.parsedDoc.lines, currentActive.parsedDoc.settings);
    if (isTauri) {
      setIsSaving(true);
      setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, isSaving: true } : f));
      try {
        await invoke("save_file_content", { path: currentActive.filePath, content: fullSerializedContent });
        setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, isDirty: false, savedText: rawText } : f));
      } catch (e) {
        console.error(e);
      } finally {
        setIsSaving(false);
        setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, isSaving: false } : f));
      }
    } else {
      const blob = new Blob([fullSerializedContent], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = currentActive.filePath.endsWith(".fountain") ? currentActive.filePath : `${currentActive.filePath}.fountain`;
      link.click();
      URL.revokeObjectURL(url);
      setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, isDirty: false, savedText: rawText } : f));
    }
  };

  const saveFileAs = async () => {
    const currentActive = files.find(f => f.id === activeFileId);
    if (!currentActive) return;
    const fullSerializedContent = serializeScreenplay(currentActive.parsedDoc.lines, currentActive.parsedDoc.settings);
    if (isTauri) {
      try {
        const path = await invoke<string | null>("save_file_dialog", { content: fullSerializedContent });
        if (path) {
          setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, filePath: path, isDirty: false, savedText: rawText } : f));
          setFilePath(path);
          addToRecent(path);
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      const filename = window.prompt("Enter filename to save:", filePath || "Untitled.fountain");
      if (filename) {
        const finalName = filename.endsWith(".fountain") ? filename : `${filename}.fountain`;
        const blob = new Blob([fullSerializedContent], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = finalName;
        link.click();
        URL.revokeObjectURL(url);
        
        setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, filePath: finalName, isDirty: false, savedText: rawText } : f));
        setFilePath(finalName);
      }
    }
  };

  const filesRef = useRef(files);
  const selectFileRef = useRef(selectFile);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    selectFileRef.current = selectFile;
  }, [selectFile]);

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
        triggerTemporaryTabBar();
      }
    };
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [triggerTemporaryTabBar]);

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
        recentFiles,
        openFilePath,
        removeFromRecent,
      }}
    >
      {children}
    </FileContext.Provider>
  );
};
