import React, { createContext, useContext, useState } from "react";
import { EditorView } from "@codemirror/view";
import { useFile, type SettingsUpdater } from "./FileContext";
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
  const { parsedDoc, setRawText, updateSettings } = useFile();
  const [editorView, setEditorViewState] = useState<EditorView | null>(null);

  const setEditorView = (view: EditorView | null) => {
    setEditorViewState(view);
  };

  const scrollToLine = (lineIndex: number, noFocus?: boolean) => {
    if (!editorView) return;
    try {
      const line = editorView.state.doc.line(lineIndex + 1);
      editorView.dispatch({
        selection: { anchor: line.from },
        effects: EditorView.scrollIntoView(line.from, { y: "center" }),
      });
      if (!noFocus) editorView.focus();
    } catch (e) {
      logger.warn("editor", `scrollToLine(${lineIndex}) failed`, e);
    }
  };

  const updateLineText = (lineIndex: number, newText: string) => {
    if (lineIndex < 0 || lineIndex >= parsedDoc.lines.length) return;
    if (editorView) {
      const line = editorView.state.doc.line(lineIndex + 1);
      editorView.dispatch({
        changes: { from: line.from, to: line.to, insert: newText },
      });
    } else {
      const updatedLines = parsedDoc.lines.map((line, i) =>
        i === lineIndex ? { ...line, text: newText } : line
      );
      setRawText(updatedLines.map((l) => l.text).join("\n"));
    }
  };

  return (
    <EditorContext.Provider
      value={{
        editorView,
        updateLineText,
        updateSettings,
        setEditorView,
        scrollToLine,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
};
