import { useEffect, useRef } from "react";

interface ShortcutActions {
  newFile: () => void;
  openFile: () => void;
  saveFile: () => void;
  saveFileAs: () => void;
  togglePalette: () => void;
  exportPDF: () => void;
  toggleSidebar: () => void;
  toggleZenMode: () => void;
  getEditorView: () => any | null;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  closeFile: () => void;
  openSettings?: () => void;
  toggleSearch: () => void;
  cleanExtraSpace: () => void;
  isDisabled?: boolean;
}

function toggleInlineMarker(view: any, marker: string) {
  if (!view) return;

  const { from, to } = view.state.selection.main;

  if (from === to) return;

  const selectedText = view.state.sliceDoc(from, to);

  const isWrapped =
    selectedText.startsWith(marker) && selectedText.endsWith(marker) && selectedText.length > marker.length * 2;

  if (isWrapped) {
    const unwrapped = selectedText.slice(marker.length, -marker.length);
    view.dispatch({
      changes: { from, to, insert: unwrapped },
      selection: { anchor: from, head: from + unwrapped.length },
    });
  } else {
    const wrapped = marker + selectedText + marker;
    view.dispatch({
      changes: { from, to, insert: wrapped },
      selection: { anchor: from, head: from + wrapped.length },
    });
  }
}

export function useKeyboardShortcuts(actions: ShortcutActions) {
  const actionsRef = useRef(actions);
  useEffect(() => {
    actionsRef.current = actions;
  }, [actions]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "q") {
        e.preventDefault();
        actionsRef.current.closeFile();
        return;
      }

      if (e.shiftKey && e.altKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        actionsRef.current.cleanExtraSpace();
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

      if (key === "=" || key === "+") {
        e.preventDefault();
        actionsRef.current.zoomIn();
        return;
      }

      if (key === "-") {
        e.preventDefault();
        actionsRef.current.zoomOut();
        return;
      }

      if (key === "0") {
        e.preventDefault();
        actionsRef.current.resetZoom();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, []);
}
