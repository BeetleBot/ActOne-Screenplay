import React, { createContext, useContext, useState } from "react";
import { EditorView } from "@codemirror/view";
import { useFile, type SettingsUpdater } from "./FileContext";
import { ParsedLine, LineType, formatScreenplaySpaces } from "../parser";
import { useUI } from "./UIContext";

export interface EditorContextProps {
  activeLineId: string | null;
  selectedSceneId: string | null;
  editorView: EditorView | null;
  setActiveLineId: (id: string | null) => void;
  setSelectedSceneId: (id: string | null) => void;
  updateLineText: (lineId: string, newText: string) => void;
  updateSettings: (updater: SettingsUpdater) => void;
  reorderScenes: (startIndex: number, endIndex: number) => void;
  setEditorView: (view: EditorView | null) => void;
  scrollToLine: (lineIndex: number, noFocus?: boolean) => void;
  autoAddSceneNumbers: () => void;
  clearSceneNumbers: () => void;
  cleanExtraSpace: () => void;
}

const EditorContext = createContext<EditorContextProps | undefined>(undefined);

export const useEditor = () => {
  const context = useContext(EditorContext);
  if (!context) throw new Error("useEditor must be used within an EditorProvider");
  return context;
};

export const EditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { rawText, parsedDoc, setRawText, updateSettings } = useFile();
  const { paperSize } = useUI();
  
  const [activeLineId, setActiveLineId] = useState<string | null>(null);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [editorView, setEditorViewState] = useState<EditorView | null>(null);

  const setEditorView = (view: EditorView | null) => {
    setEditorViewState(view);
  };

  const scrollToLine = (lineIndex: number, noFocus?: boolean) => {
    if (editorView) {
      const line = editorView.state.doc.line(lineIndex + 1);
      editorView.dispatch({
        selection: { anchor: line.from },
        effects: EditorView.scrollIntoView(line.from, { y: "center" }),
      });
      if (!noFocus) editorView.focus();
    }
  };

  const updateLineText = (lineId: string, newText: string) => {
    const updatedLines = parsedDoc.lines.map((line) =>
      line.id === lineId ? { ...line, text: newText } : line
    );
    const serialized = updatedLines.map(l => l.text).join("\n");
    setRawText(serialized);
  };

  const reorderScenes = (startIndex: number, endIndex: number) => {
    const scenes: { lineIndex: number; lines: ParsedLine[] }[] = [];
    const beforeFirstScene: ParsedLine[] = [];
    let currentScene: ParsedLine[] = [];
    let currentStart = -1;

    for (let i = 0; i < parsedDoc.lines.length; i++) {
      const line = parsedDoc.lines[i];
      if (line.type === 10) { // LineType.heading is 10
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
    setRawText(serialized);
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
    const serialized = updatedLines.map(l => l.text).join("\n");
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
    const serialized = updatedLines.map(l => l.text).join("\n");
    setRawText(serialized);
  };

  const cleanExtraSpace = () => {
    const formatted = formatScreenplaySpaces(rawText, paperSize);
    setRawText(formatted);
  };

  return (
    <EditorContext.Provider
      value={{
        activeLineId,
        selectedSceneId,
        editorView,
        setActiveLineId,
        setSelectedSceneId,
        updateLineText,
        updateSettings,
        reorderScenes,
        setEditorView,
        scrollToLine,
        autoAddSceneNumbers,
        clearSceneNumbers,
        cleanExtraSpace,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
};
