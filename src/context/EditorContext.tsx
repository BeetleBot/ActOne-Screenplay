import React, { createContext, useContext, useState } from "react";
import { EditorView } from "@codemirror/view";
import { useFile, type SettingsUpdater } from "./FileContext";
import { ParsedLine, LineType } from "../parser";
import { logger } from "../utils/logger";

export interface EditorContextProps {
  editorView: EditorView | null;
  updateLineText: (lineIndex: number, newText: string) => void;
  updateSettings: (updater: SettingsUpdater) => void;
  reorderScenes: (startIndex: number, endIndex: number) => void;
  setEditorView: (view: EditorView | null) => void;
  scrollToLine: (lineIndex: number, noFocus?: boolean) => void;
  autoAddSceneNumbers: () => void;
  clearSceneNumbers: () => void;
  replaceSceneText: (sceneNumber: number, newFountainText: string) => boolean;
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

  const replaceSceneText = (sceneNumber: number, newFountainText: string): boolean => {
    try {
      const lines = parsedDoc.lines || [];
      // Build scene list
      let sceneCount = 0;
      let startLine = -1;
      let endLine = lines.length;

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].type === LineType.heading) {
          sceneCount++;
          if (sceneCount === sceneNumber) {
            startLine = i + 1;
          } else if (sceneCount === sceneNumber + 1) {
            endLine = i;
            break;
          }
        }
      }

      if (startLine === -1) return false;

      if (editorView) {
        const doc = editorView.state.doc;
        const startPos = doc.line(startLine).from;
        const endPos = doc.line(endLine).to;
        editorView.dispatch({
          changes: { from: startPos, to: endPos, insert: newFountainText },
        });
        return true;
      }

      // Fallback
      const before = lines.slice(0, startLine - 1).map(l => l.text);
      const after = lines.slice(endLine).map(l => l.text);
      const serialized = [...before, newFountainText, ...after].join("\n");
      setRawText(serialized);
      return true;
    } catch (e) {
      logger.warn("editor", `replaceSceneText(${sceneNumber}) failed`, e);
      return false;
    }
  };

  const updateDocumentText = (newFullText: string) => {
    if (editorView) {
      editorView.dispatch({
        changes: { from: 0, to: editorView.state.doc.length, insert: newFullText },
      });
    }
    setRawText(newFullText);
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
      setRawText(updatedLines.map(l => l.text).join("\n"));
    }
  };

  const reorderScenes = (startIndex: number, endIndex: number) => {
    const scenes: { lineIndex: number; lines: ParsedLine[] }[] = [];
    const beforeFirstScene: ParsedLine[] = [];
    let currentScene: ParsedLine[] = [];
    let currentStart = -1;

    const isSceneStart = (line: ParsedLine) =>
      line.type === LineType.heading || (line.isOutlineElement && line.type !== LineType.section && line.type !== LineType.synopse);

    for (let i = 0; i < parsedDoc.lines.length; i++) {
      const line = parsedDoc.lines[i];
      if (isSceneStart(line)) {
        if (currentScene.length > 0) {
          scenes.push({ lineIndex: currentStart, lines: currentScene });
        }
        currentScene = [line];
        currentStart = i;
      } else if (currentStart !== -1) {
        currentScene.push(line);
      } else {
        beforeFirstScene.push(line);
      }
    }
    if (currentScene.length > 0) {
      scenes.push({ lineIndex: currentStart, lines: currentScene });
    }

    if (startIndex < 0 || startIndex >= scenes.length || endIndex < 0 || endIndex >= scenes.length) return;

    const [moved] = scenes.splice(startIndex, 1);
    scenes.splice(endIndex, 0, moved);

    const newLines: ParsedLine[] = [...beforeFirstScene];
    for (const scene of scenes) {
      newLines.push(...scene.lines);
    }

    const serialized = newLines.map(l => l.text).join("\n");
    updateDocumentText(serialized);
  };

  const autoAddSceneNumbers = () => {
    let sceneIndex = 1;
    const updatedLineTexts = parsedDoc.lines.map((line) => {
      if (line.type === LineType.heading) {
        const cleanedText = line.text.replace(/\s*#[^#]+#\s*/g, "").trim();
        return `${cleanedText} #${sceneIndex++}#`;
      }
      return line.text;
    });
    const serialized = updatedLineTexts.join("\n");
    updateDocumentText(serialized);
  };

  const clearSceneNumbers = () => {
    const updatedLineTexts = parsedDoc.lines.map((line) => {
      if (line.type === LineType.heading) {
        const cleanedText = line.text.replace(/\s*#[^#]+#\s*/g, "").trim();
        return cleanedText;
      }
      return line.text;
    });
    const serialized = updatedLineTexts.join("\n");
    updateDocumentText(serialized);
  };

  return (
    <EditorContext.Provider
      value={{
        editorView,
        updateLineText,
        updateSettings,
        reorderScenes,
        setEditorView,
        scrollToLine,
        autoAddSceneNumbers,
        clearSceneNumbers,
        replaceSceneText,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
};
