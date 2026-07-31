import { useEffect, useRef } from "react";
import type { EditorView } from "@codemirror/view";

interface ShortcutActions {
  newFile: () => void;
  openFile: () => void;
  saveFile: () => void;
  saveFileAs: () => void;
  togglePalette: () => void;
  exportPDF: () => void;
  toggleSidebar: () => void;
  toggleZenMode: () => void;
  getEditorView: () => EditorView | null;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  interfaceScaleIn?: () => void;
  interfaceScaleOut?: () => void;
  resetInterfaceScale?: () => void;
  closeFile: () => void;
  openSettings?: () => void;
  toggleSearch: () => void;
  togglePrompt?: () => void;
  openHelp?: () => void;
  toggleSnapshotsPanel?: () => void;
  isDisabled?: boolean;
}
import { toggleInlineMarker } from "../editor/formatUtils";

export function useKeyboardShortcuts(actions: ShortcutActions) {
  const actionsRef = useRef(actions);
  useEffect(() => {
    actionsRef.current = actions;
  }, [actions]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.altKey && e.key.toLowerCase() === "q") {
        e.preventDefault();
        actionsRef.current.closeFile();
        return;
      }

      if (e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        actionsRef.current.toggleSnapshotsPanel?.();
        return;
      }

      if (e.altKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === "m") {
        e.preventDefault();
        actionsRef.current.togglePrompt?.();
        return;
      }

      if (e.key === "F1") {
        e.preventDefault();
        actionsRef.current.openHelp?.();
        return;
      }

      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;

      if (actionsRef.current.isDisabled) {
        const key = e.key.toLowerCase();
        if (key === "k") {
          e.preventDefault();
          actionsRef.current.togglePalette();
        }
        if (key === ",") {
          e.preventDefault();
          actionsRef.current.openSettings?.();
        }
        return;
      }

      const key = e.key.toLowerCase();
      const shift = e.shiftKey;
      const alt = e.altKey;

      if (key === "enter" && alt) {
        e.preventDefault();
        actionsRef.current.toggleZenMode();
        return;
      }

      if (key === "k") {
        e.preventDefault();
        actionsRef.current.togglePalette();
        return;
      }

      if (key === "," && !shift) {
        e.preventDefault();
        actionsRef.current.openSettings?.();
        return;
      }

      if (key === "n" && !shift) {
        e.preventDefault();
        actionsRef.current.newFile();
        return;
      }

      if (key === "o" && !shift) {
        e.preventDefault();
        actionsRef.current.openFile();
        return;
      }

      if (key === "s" && shift) {
        e.preventDefault();
        actionsRef.current.saveFileAs();
        return;
      }

      if (key === "s" && !shift) {
        e.preventDefault();
        actionsRef.current.saveFile();
        return;
      }

      if (key === "p" && !shift) {
        e.preventDefault();
        actionsRef.current.exportPDF();
        return;
      }

      if (key === "f" && !shift) {
        e.preventDefault();
        actionsRef.current.toggleSearch();
        return;
      }

      if ((key === "\\" || e.code === "Backslash") && !shift) {
        e.preventDefault();
        actionsRef.current.toggleSidebar();
        return;
      }

      if (key === "b" && !shift) {
        e.preventDefault();
        toggleInlineMarker(actionsRef.current.getEditorView(), "**");
        return;
      }

      if (key === "i" && !shift) {
        e.preventDefault();
        toggleInlineMarker(actionsRef.current.getEditorView(), "*");
        return;
      }

      if (key === "u" && !shift) {
        e.preventDefault();
        toggleInlineMarker(actionsRef.current.getEditorView(), "_");
        return;
      }

      if (key === "=" || key === "+" || e.code === "Equal") {
        e.preventDefault();
        if (alt) {
          actionsRef.current.interfaceScaleIn?.();
        } else {
          actionsRef.current.zoomIn();
        }
        return;
      }

      if (key === "-" || key === "_" || e.code === "Minus") {
        e.preventDefault();
        if (alt) {
          actionsRef.current.interfaceScaleOut?.();
        } else {
          actionsRef.current.zoomOut();
        }
        return;
      }

      if (key === "0" || key === ")" || e.code === "Digit0") {
        e.preventDefault();
        if (alt) {
          actionsRef.current.resetInterfaceScale?.();
        } else {
          actionsRef.current.resetZoom();
        }
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, []);
}
