import React, { createContext, useContext, useMemo, useRef } from "react";
import { useEditor } from "./EditorContext";
import { useFileActions, useParsedScreenplay } from "./FileSubscriptions";
import { ParsedLine, LineType, parseScreenplay } from "../parser";
import { logger } from "../utils/logger";
import { EditorSelection, EditorState, Text, Transaction } from "@codemirror/state";
import { moveOutlineBlock, type OutlineDropTarget } from "../editor/moveOutlineBlock";

export interface ScriptEditorContextProps {
  scrollToScene: (direction: "next" | "prev") => void;
  reorderScenes: (startIndex: number, endIndex: number) => void;
  moveOutline: (sourceLine: number, target: OutlineDropTarget) => void;
  autoAddSceneNumbers: () => void;
  clearSceneNumbers: () => void;
  replaceSceneText: (sceneNumber: number, newFountainText: string) => boolean;
}

const ScriptEditorContext = createContext<ScriptEditorContextProps | undefined>(undefined);

export const useScriptEditor = () => {
  const context = useContext(ScriptEditorContext);
  if (!context) throw new Error("useScriptEditor must be used within a ScriptEditorProvider");
  return context;
};

export const ScriptEditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { editorView, scrollToLine } = useEditor();
  const parsedDoc = useParsedScreenplay();
  const { setRawText } = useFileActions();

  const updateDocumentText = (newFullText: string, selection?: EditorSelection) => {
    if (editorView) {
      editorView.dispatch({
        changes: { from: 0, to: editorView.state.doc.length, insert: newFullText },
        ...(selection ? { selection, annotations: Transaction.userEvent.of("move.scene") } : {}),
      });
    }
    setRawText(newFullText);
  };

  const scrollToScene = (direction: "next" | "prev") => {
    if (!editorView) return;
    try {
      const docLines = parsedDoc.lines || [];
      const sceneHeadings: number[] = [];
      for (let i = 0; i < docLines.length; i++) {
        if (docLines[i].type === LineType.heading) {
          sceneHeadings.push(i + 1);
        }
      }

      if (sceneHeadings.length === 0) return;

      const currentPos = editorView.state.selection.main.head;
      const currentLineNum = editorView.state.doc.lineAt(currentPos).number;

      let targetLine: number | null = null;
      if (direction === "next") {
        targetLine = sceneHeadings.find((l) => l > currentLineNum) ?? null;
      } else {
        const prevHeadings = sceneHeadings.filter((l) => l < currentLineNum);
        targetLine = prevHeadings.length > 0 ? prevHeadings[prevHeadings.length - 1] : null;
      }

      if (targetLine !== null) {
        scrollToLine(targetLine - 1);
      }
    } catch (e) {
      logger.warn("editor", `scrollToScene(${direction}) failed`, e);
    }
  };

  const replaceSceneText = (sceneNumber: number, newFountainText: string): boolean => {
    try {
      const lines = parsedDoc.lines || [];
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

      const before = lines.slice(0, startLine - 1).map((l) => l.text);
      const after = lines.slice(endLine).map((l) => l.text);
      const serialized = [...before, newFountainText, ...after].join("\n");
      setRawText(serialized);
      return true;
    } catch (e) {
      logger.warn("editor", `replaceSceneText(${sceneNumber}) failed`, e);
      return false;
    }
  };

  const reorderScenes = (startIndex: number, endIndex: number) => {
    const lines = editorView ? parseScreenplay(editorView.state.doc.toString()).lines : parsedDoc.lines;
    const scenes: { lineIndex: number; lines: ParsedLine[] }[] = [];
    const beforeFirstScene: ParsedLine[] = [];
    let currentScene: ParsedLine[] = [];
    let currentStart = -1;

    const isSceneStart = (line: ParsedLine) =>
      line.type === LineType.heading ||
      (line.isOutlineElement && line.type !== LineType.section && line.type !== LineType.synopse);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
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
    if (startIndex === endIndex) return;

    const [moved] = scenes.splice(startIndex, 1);
    scenes.splice(endIndex, 0, moved);

    const newLineTexts = beforeFirstScene.map((line) => line.text);
    const starts = new Map<(typeof scenes)[number], number>();
    for (const scene of scenes) {
      // The former final scene may have no trailing blank line. Its new neighbour
      // still needs a Fountain separator to remain a scene heading after parsing.
      if (newLineTexts.length > 0 && newLineTexts[newLineTexts.length - 1].trim()) newLineTexts.push("");
      starts.set(scene, newLineTexts.length);
      newLineTexts.push(...scene.lines.map((line) => line.text));
    }

    const serialized = newLineTexts.join("\n");
    let selection: EditorSelection | undefined;
    if (editorView) {
      const doc = editorView.state.doc;
      const reorderedDoc = Text.of(newLineTexts);
      const mapPosition = (position: number) => {
        const line = doc.lineAt(position);
        const scene = scenes.find((candidate) =>
          line.number - 1 >= candidate.lineIndex && line.number - 1 < candidate.lineIndex + candidate.lines.length,
        );
        if (!scene) return position; // Title page / preamble stays in place.
        const targetLine = reorderedDoc.line(starts.get(scene)! + line.number - scene.lineIndex);
        return targetLine.from + Math.min(position - line.from, targetLine.length);
      };
      selection = EditorSelection.create(
        editorView.state.selection.ranges.map((range) => EditorSelection.range(mapPosition(range.anchor), mapPosition(range.head))),
        editorView.state.selection.mainIndex,
      );
    }
    updateDocumentText(serialized, selection);
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

  const moveOutline = (sourceLine: number, target: OutlineDropTarget) => {
    const state = editorView?.state ?? EditorState.create({ doc: parsedDoc.screenplayText });
    const spec = moveOutlineBlock(state, sourceLine, target);
    if (!spec) return;
    const transaction = state.update(spec);
    editorView?.dispatch(transaction);
    setRawText(transaction.newDoc.toString());
  };
  const actionsRef = useRef({ scrollToScene, reorderScenes, moveOutline, autoAddSceneNumbers, clearSceneNumbers, replaceSceneText });
  actionsRef.current = { scrollToScene, reorderScenes, moveOutline, autoAddSceneNumbers, clearSceneNumbers, replaceSceneText };
  const value = useMemo<ScriptEditorContextProps>(
    () => ({
      scrollToScene: (direction) => actionsRef.current.scrollToScene(direction),
      reorderScenes: (start, end) => actionsRef.current.reorderScenes(start, end),
      moveOutline: (source, target) => actionsRef.current.moveOutline(source, target),
      autoAddSceneNumbers: () => actionsRef.current.autoAddSceneNumbers(),
      clearSceneNumbers: () => actionsRef.current.clearSceneNumbers(),
      replaceSceneText: (sceneNumber, text) => actionsRef.current.replaceSceneText(sceneNumber, text),
    }),
    [],
  );

  return <ScriptEditorContext.Provider value={value}>{children}</ScriptEditorContext.Provider>;
};
