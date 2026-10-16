import React, { createContext, useContext, useState, useRef, useCallback, useMemo } from "react";
import { EditorView } from "@codemirror/view";
import type { SettingsUpdater } from "./FileContext";
import { useFileActions, useParsedScreenplay } from "./FileSubscriptions";
import { logger } from "../utils/logger";

export interface EditorContextProps {
  editorView: EditorView | null;
  updateLineText: (lineIndex: number, newText: string) => void;
  updateSettings: (updater: SettingsUpdater) => void;
  setEditorView: (view: EditorView | null) => void;
  scrollToLine: (lineIndex: number, noFocus?: boolean) => void;
}

const EditorContext = createContext<EditorContextProps | undefined>(undefined);

export const useEditor = () => {
  const context = useContext(EditorContext);
  if (!context) throw new Error("useEditor must be used within an EditorProvider");
  return context;
};

export const EditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const parsedDoc = useParsedScreenplay();
  const { setRawText, updateSettings } = useFileActions();
  const [editorView, setEditorViewState] = useState<EditorView | null>(null);
  const editorViewRef = useRef(editorView);
  editorViewRef.current = editorView;
  const parsedDocRef = useRef(parsedDoc);
  parsedDocRef.current = parsedDoc;
  const setRawTextRef = useRef(setRawText);
  setRawTextRef.current = setRawText;

  const setEditorView = useCallback((view: EditorView | null) => {
    setEditorViewState(view);
  }, []);

  const scrollToLine = useCallback((lineIndex: number, noFocus?: boolean) => {
    const view = editorViewRef.current;
    if (!view) return;
    try {
      const line = view.state.doc.line(lineIndex + 1);
      view.dispatch({
        selection: { anchor: line.from },
        effects: EditorView.scrollIntoView(line.from, { y: "center" }),
      });
      if (!noFocus) view.focus();
    } catch (e) {
      logger.warn("editor", `scrollToLine(${lineIndex}) failed`, e);
    }
  }, []);

  const updateLineText = useCallback((lineIndex: number, newText: string) => {
    const view = editorViewRef.current;
    if (lineIndex < 0 || lineIndex >= parsedDocRef.current.lines.length) return;
    if (view) {
      const line = view.state.doc.line(lineIndex + 1);
      view.dispatch({
        changes: { from: line.from, to: line.to, insert: newText },
      });
    } else {
      const updatedLines = parsedDocRef.current.lines.map((line, i) =>
        i === lineIndex ? { ...line, text: newText } : line
      );
      setRawTextRef.current(updatedLines.map((l) => l.text).join("\n"));
    }
  }, []);

  const value = useMemo(() => ({
    editorView, updateLineText, updateSettings, setEditorView, scrollToLine,
  }), [editorView, updateLineText, updateSettings, setEditorView, scrollToLine]);

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  );
};
