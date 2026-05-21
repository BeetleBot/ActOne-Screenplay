import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { parseScreenplay, serializeScreenplay, FountainDocument, ParsedLine } from "../parser/FountainParser";
import { invoke } from "@tauri-apps/api/core";

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
}

const ScreenplayContext = createContext<ScreenplayContextProps | undefined>(undefined);

export const useScreenplay = () => {
  const context = useContext(ScreenplayContext);
  if (!context) throw new Error("useScreenplay must be used within a ScreenplayProvider");
  return context;
};

export const ScreenplayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fontFamily, setFontFamilyState] = useState<'courier-prime' | 'courier-prime-sans'>(() => {
    return (localStorage.getItem("drafter-font-family") as any) || "courier-prime";
  });
  const [paperSize, setPaperSizeState] = useState<'letter' | 'a4'>(() => {
    return (localStorage.getItem("drafter-paper-size") as any) || "letter";
  });
  const [rawText, setRawTextState] = useState<string>("TITLE: Drafter\nAUTHOR: Writer\n\nINT. HOME - DAY\n\nThis is a sample screenplay.");
  const [parsedDoc, setParsedDoc] = useState<FountainDocument>(() => parseScreenplay(rawText, paperSize));
  const [filePath, setFilePath] = useState<string | null>(null);
  const [activeLineId, setActiveLineId] = useState<string | null>(null);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editorView, setEditorViewState] = useState<any | null>(null);
  
  const workerRef = useRef<Worker | null>(null);

  const setFontFamily = (font: 'courier-prime' | 'courier-prime-sans') => {
    setFontFamilyState(font);
    localStorage.setItem("drafter-font-family", font);
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

    workerRef.current.onmessage = (e: MessageEvent<FountainDocument>) => {
      setParsedDoc(e.data);
    };

    workerRef.current.postMessage({ text: rawText, paperSize });

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  useEffect(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ text: rawText, paperSize });
    } else {
      setParsedDoc(parseScreenplay(rawText, paperSize));
    }
  }, [paperSize]);

  const setRawText = (text: string) => {
    setRawTextState(text);
    if (workerRef.current) {
      workerRef.current.postMessage({ text, paperSize });
    } else {
      setParsedDoc(parseScreenplay(text, paperSize));
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
    if (isTauri) {
      try {
        const res = await invoke<{ path: string; content: string } | null>("open_file_dialog");
        if (res) {
          setFilePath(res.path);
          setRawText(res.content);
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".fountain,.txt,.fdx";
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        const content = await file.text();
        setFilePath(file.name);
        setRawText(content);
      };
      input.click();
    }
  };

  const saveFile = async () => {
    if (!filePath) {
      await saveFileAs();
      return;
    }
    setIsSaving(true);
    try {
      await invoke("save_file_content", { path: filePath, content: rawText });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const saveFileAs = async () => {
    try {
      const path = await invoke<string | null>("save_file_dialog", { content: rawText });
      if (path) {
        setFilePath(path);
      }
    } catch (e) {
      console.error(e);
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
      }}
    >
      {children}
    </ScreenplayContext.Provider>
  );
};
