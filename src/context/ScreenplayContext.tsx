import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { parseScreenplay, serializeScreenplay, FountainDocument, ParsedLine, LineType } from "../parser/FountainParser";
import { invoke } from "@tauri-apps/api/core";

export interface ScreenplayFile {
  id: string;
  filePath: string | null;
  rawText: string;
  parsedDoc: FountainDocument;
  isSaving: boolean;
  isDirty: boolean;
  savedText: string;
}

interface ScreenplayContextProps {
  rawText: string;
  parsedDoc: FountainDocument;
  filePath: string | null;
  activeLineId: string | null;
  selectedSceneId: string | null;
  fontFamily: 'courier-prime' | 'courier-prime-sans';
  paperSize: 'letter' | 'a4';
  setFontFamily: (font: 'courier-prime' | 'courier-prime-sans') => void;
  setPaperSize: (size: 'letter' | 'a4') => void;
  setRawText: (text: string) => void;
  openFile: () => Promise<void>;
  saveFile: () => Promise<void>;
  saveFileAs: () => Promise<void>;
  updateLineText: (lineId: string, newText: string) => void;
  setActiveLineId: (id: string | null) => void;
  setSelectedSceneId: (id: string | null) => void;
  updateSettings: (updater: (prev: any) => any) => void;
  reorderScenes: (startIndex: number, endIndex: number) => void;
  isSaving: boolean;
  editorView: any | null;
  setEditorView: (view: any | null) => void;
  scrollToLine: (lineIndex: number) => void;
  autoAddSceneNumbers: () => void;
  clearSceneNumbers: () => void;
  files: ScreenplayFile[];
  activeFileId: string;
  selectFile: (id: string) => void;
  newFile: () => void;
  closeFile: (id: string) => void;
  showTabBar: boolean;
  setShowTabBar: (show: boolean) => void;
  openTabBarManually: () => void;
  triggerTemporaryTabBar: () => void;
  typewriterMode: boolean;
  setTypewriterMode: (enabled: boolean) => void;
}

const ScreenplayContext = createContext<ScreenplayContextProps | undefined>(undefined);

export const useScreenplay = () => {
  const context = useContext(ScreenplayContext);
  if (!context) throw new Error("useScreenplay must be used within a ScreenplayProvider");
  return context;
};

export const ScreenplayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const generateUUID = () => "file-" + Math.random().toString(36).substring(2, 15);

  const [fontFamily, setFontFamilyState] = useState<'courier-prime' | 'courier-prime-sans'>(() => {
    return (localStorage.getItem("drafter-font-family") as any) || "courier-prime";
  });
  const [typewriterMode, setTypewriterModeState] = useState<boolean>(() => {
    return localStorage.getItem("drafter-typewriter-mode") === "true";
  });
  const [paperSize, setPaperSizeState] = useState<'letter' | 'a4'>(() => {
    return (localStorage.getItem("drafter-paper-size") as any) || "letter";
  });

  const initialFileId = useRef(generateUUID());
  const defaultText = "TITLE: Drafter\nAUTHOR: Writer\n\nINT. HOME - DAY\n\nThis is a sample screenplay.";

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

  const [rawText, setRawTextState] = useState<string>(defaultText);
  const [parsedDoc, setParsedDoc] = useState<FountainDocument>(() => parseScreenplay(defaultText, paperSize));
  const [filePath, setFilePath] = useState<string | null>(null);
  const [activeLineId, setActiveLineId] = useState<string | null>(null);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editorView, setEditorViewState] = useState<any | null>(null);
  
  const workerRef = useRef<Worker | null>(null);
  const activeFileIdRef = useRef(activeFileId);

  const [showTabBar, setShowTabBar] = useState(false);
  const hideTimerRef = useRef<any>(null);

  const triggerTemporaryTabBar = () => {
    setShowTabBar(true);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = setTimeout(() => {
      setShowTabBar(false);
    }, 1500);
  };

  const openTabBarManually = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setShowTabBar(true);
  };

  useEffect(() => {
    activeFileIdRef.current = activeFileId;
  }, [activeFileId]);

  const setFontFamily = (font: 'courier-prime' | 'courier-prime-sans') => {
    setFontFamilyState(font);
    localStorage.setItem("drafter-font-family", font);
  };

  const setTypewriterMode = (enabled: boolean) => {
    setTypewriterModeState(enabled);
    localStorage.setItem("drafter-typewriter-mode", String(enabled));
  };

  const setPaperSize = (size: 'letter' | 'a4') => {
    setPaperSizeState(size);
    localStorage.setItem("drafter-paper-size", size);
  };

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
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const newFile = () => {
    const newId = generateUUID();
    const newDefaultText = "TITLE: Untitled\nAUTHOR: Writer\n\nINT. HOME - DAY\n\nStart typing your screenplay here.";
    const newFileObj: ScreenplayFile = {
      id: newId,
      filePath: null,
      rawText: newDefaultText,
      parsedDoc: parseScreenplay(newDefaultText, paperSize),
      isSaving: false,
      isDirty: false,
      savedText: newDefaultText,
    };
    setFiles(prev => [...prev, newFileObj]);
    setActiveFileIdState(newId);
    setRawTextState(newDefaultText);
    setFilePath(null);
    setParsedDoc(newFileObj.parsedDoc);
    if (workerRef.current) {
      workerRef.current.postMessage({ text: newDefaultText, paperSize, fileId: newId });
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

  const updateLineText = (lineId: string, newText: string) => {
    const updatedLines = parsedDoc.lines.map((line) =>
      line.id === lineId ? { ...line, text: newText } : line
    );
    const serialized = serializeScreenplay(updatedLines, parsedDoc.settings);
    setRawText(serialized);
  };

  const updateSettings = (updater: (prev: any) => any) => {
    const newSettings = updater(parsedDoc.settings);
    const serialized = serializeScreenplay(parsedDoc.lines, newSettings);
    setRawText(serialized);
  };

  const reorderScenes = (startIndex: number, endIndex: number) => {
    const scenes: { lineIndex: number; lines: ParsedLine[] }[] = [];
    let currentScene: ParsedLine[] = [];
    let currentStart = -1;

    for (let i = 0; i < parsedDoc.lines.length; i++) {
      const line = parsedDoc.lines[i];
      if (line.type === 10) {
        if (currentScene.length > 0) {
          scenes.push({ lineIndex: currentStart, lines: currentScene });
        }
        currentScene = [line];
        currentStart = i;
      } else if (currentStart !== -1) {
        currentScene.push(line);
      } else {
        parsedLinesBeforeFirstScene.push(line);
      }
    }
    if (currentScene.length > 0) {
      scenes.push({ lineIndex: currentStart, lines: currentScene });
    }

    const [moved] = scenes.splice(startIndex, 1);
    scenes.splice(endIndex, 0, moved);

    const newLines: ParsedLine[] = [...parsedLinesBeforeFirstScene];
    for (const scene of scenes) {
      newLines.push(...scene.lines);
    }

    const serialized = serializeScreenplay(newLines, parsedDoc.settings);
    setRawText(serialized);
  };

  const parsedLinesBeforeFirstScene: ParsedLine[] = [];
  for (let i = 0; i < parsedDoc.lines.length; i++) {
    const line = parsedDoc.lines[i];
    if (line.type === 10) break;
    parsedLinesBeforeFirstScene.push(line);
  }

  const isTauri = typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__;

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
      const existing = files.find(f => f.filePath === res.path);
      if (existing) {
        selectFile(existing.id);
        return;
      }

      const currentActive = files.find(f => f.id === activeFileId);
      const isDefault = currentActive && !currentActive.filePath && 
                        (currentActive.rawText === "" || currentActive.rawText === defaultText);

      if (isDefault && currentActive) {
        const updatedFiles = files.map(f => f.id === activeFileId ? {
          ...f,
          filePath: res.path,
          rawText: res.content,
          savedText: res.content,
          isDirty: false,
          parsedDoc: parseScreenplay(res.content, paperSize)
        } : f);
        setFiles(updatedFiles);
        setFilePath(res.path);
        setRawTextState(res.content);
        setParsedDoc(parseScreenplay(res.content, paperSize));
        if (workerRef.current) {
          workerRef.current.postMessage({ text: res.content, paperSize, fileId: activeFileId });
        }
      } else {
        const newId = generateUUID();
        const newFileObj: ScreenplayFile = {
          id: newId,
          filePath: res.path,
          rawText: res.content,
          savedText: res.content,
          isDirty: false,
          parsedDoc: parseScreenplay(res.content, paperSize),
          isSaving: false,
        };
        setFiles(prev => [...prev, newFileObj]);
        setActiveFileIdState(newId);
        setFilePath(res.path);
        setRawTextState(res.content);
        setParsedDoc(newFileObj.parsedDoc);
        if (workerRef.current) {
          workerRef.current.postMessage({ text: res.content, paperSize, fileId: newId });
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
    if (isTauri) {
      setIsSaving(true);
      setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, isSaving: true } : f));
      try {
        await invoke("save_file_content", { path: currentActive.filePath, content: rawText });
        setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, isDirty: false, savedText: rawText } : f));
      } catch (e) {
        console.error(e);
      } finally {
        setIsSaving(false);
        setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, isSaving: false } : f));
      }
    } else {
      const blob = new Blob([rawText], { type: "text/plain;charset=utf-8" });
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
    if (isTauri) {
      try {
        const path = await invoke<string | null>("save_file_dialog", { content: rawText });
        if (path) {
          setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, filePath: path, isDirty: false, savedText: rawText } : f));
          setFilePath(path);
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      const filename = window.prompt("Enter filename to save:", filePath || "Untitled.fountain");
      if (filename) {
        const finalName = filename.endsWith(".fountain") ? filename : `${filename}.fountain`;
        const blob = new Blob([rawText], { type: "text/plain;charset=utf-8" });
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

  const setEditorView = (view: any | null) => {
    setEditorViewState(view);
  };

  const scrollToLine = (lineIndex: number) => {
    if (editorView) {
      const line = editorView.state.doc.line(lineIndex + 1);
      editorView.dispatch({
        selection: { anchor: line.from },
        scrollIntoView: true,
      });
      editorView.focus();
    }
  };

  const autoAddSceneNumbers = () => {
    let sceneIndex = 1;
    const updatedLines = parsedDoc.lines.map((line) => {
      if (line.type === LineType.heading) {
        const cleanedText = line.text.replace(/\s*#([^#]+)#\s*$/, "");
        return {
          ...line,
          text: `${cleanedText} #${sceneIndex++}#`
        };
      }
      return line;
    });
    const serialized = serializeScreenplay(updatedLines, parsedDoc.settings);
    setRawText(serialized);
  };

  const clearSceneNumbers = () => {
    const updatedLines = parsedDoc.lines.map((line) => {
      if (line.type === LineType.heading) {
        const cleanedText = line.text.replace(/\s*#([^#]+)#\s*$/, "");
        return {
          ...line,
          text: cleanedText
        };
      }
      return line;
    });
    const serialized = serializeScreenplay(updatedLines, parsedDoc.settings);
    setRawText(serialized);
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
      if ((e.key === "Tab" && e.ctrlKey) || (e.key === "PageDown" && e.ctrlKey) || (e.key === "PageUp" && e.ctrlKey)) {
        e.preventDefault();
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
  }, []);

  return (
    <ScreenplayContext.Provider
      value={{
        rawText,
        parsedDoc,
        filePath,
        activeLineId,
        selectedSceneId,
        fontFamily,
        paperSize,
        setFontFamily,
        setPaperSize,
        setRawText,
        openFile,
        saveFile,
        saveFileAs,
        updateLineText,
        setActiveLineId,
        setSelectedSceneId,
        updateSettings,
        reorderScenes,
        isSaving,
        editorView,
        setEditorView,
        scrollToLine,
        autoAddSceneNumbers,
        clearSceneNumbers,
        files,
        activeFileId,
        selectFile,
        newFile,
        closeFile,
        showTabBar,
        setShowTabBar,
        openTabBarManually,
        triggerTemporaryTabBar,
        typewriterMode,
        setTypewriterMode,
      }}
    >
      {children}
    </ScreenplayContext.Provider>
  );
};
