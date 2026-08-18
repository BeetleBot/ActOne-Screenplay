import React, { useRef, useState } from "react";
import { EditorView } from "@codemirror/view";
import { useUI, useEditor, useParking, useFile } from "../../context";
import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager";
import { setContextMenuHighlightEffect } from "../../editor/contextMenuState";
import { toggleInlineMarker as toggleInlineMarkerShared } from "../../editor/formatUtils";
import { ContextMenu, type ContextMenuItem, type ContextMenuItemDef } from "../ContextMenu";
import { getWordAtPosition } from "../../utils/wordUtils";
import { spellDecoField } from "../../editor/spellcheck";
import { logger } from "../../utils/logger";

export interface MenuSelectionSnap {
  from: number;
  to: number;
  text: string;
}

export interface CoreEditorProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  viewRef: React.MutableRefObject<EditorView | null>;
  extraContextMenuItems?: (snap: MenuSelectionSnap | null, hasSel: boolean, closeMenu: () => void) => ContextMenuItem[];
}

export const CoreEditor = React.memo(({ containerRef, viewRef, extraContextMenuItems }: CoreEditorProps) => {
  const { fontFamily, spellcheckEnabled } = useUI();
  const { updateSettings } = useEditor();
  const { files, activeFileId } = useFile();
  const parking = useParking();

  const activeFile = files?.find(f => f.id === activeFileId);
  const activeScript = activeFile?.scripts?.[activeFile.activeScriptIndex ?? 0];
  const isProse = activeScript?.type === "markdown" ||
    activeScript?.fileName?.endsWith(".md") ||
    activeScript?.fileName?.endsWith(".markdown") ||
    activeFile?.filePath?.endsWith(".md") ||
    activeFile?.filePath?.endsWith(".markdown");

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);
  const menuSelectionRef = useRef<MenuSelectionSnap | null>(null);

  const handleMouseDown = (event: React.MouseEvent) => {
    if (event.button !== 2) return;
    const v = viewRef.current;
    if (!v) {
      menuSelectionRef.current = null;
      return;
    }
    const sel = v.state.selection.main;
    const pos = v.posAtCoords({ x: event.clientX, y: event.clientY });

    if (sel.from !== sel.to && pos !== null && pos >= sel.from && pos <= sel.to) {
      menuSelectionRef.current = {
        from: sel.from,
        to: sel.to,
        text: v.state.sliceDoc(sel.from, sel.to),
      };
    } else {
      menuSelectionRef.current = {
        from: sel.from,
        to: sel.to,
        text: sel.from !== sel.to ? v.state.sliceDoc(sel.from, sel.to) : "",
      };
    }
  };

  const handleContextMenu = async (event: React.MouseEvent) => {
    event.preventDefault();

    const clientX = event.clientX;
    const clientY = event.clientY;

    const v = viewRef.current;
    if (v) {
      const sel = v.state.selection.main;
      const pos = v.posAtCoords({ x: clientX, y: clientY });

      if (pos !== null && !(sel.from !== sel.to && pos >= sel.from && pos <= sel.to)) {
        if (sel.from === sel.to) {
          v.dispatch({ selection: { anchor: pos } });
        }
      }

      const activeSel = v.state.selection.main;
      menuSelectionRef.current = {
        from: activeSel.from,
        to: activeSel.to,
        text: activeSel.from !== activeSel.to ? v.state.sliceDoc(activeSel.from, activeSel.to) : "",
      };
    }

    const snap = menuSelectionRef.current;
    const hasSel = snap !== null && snap.from !== snap.to;

    let spellItems: ContextMenuItem[] = [];

    if (spellcheckEnabled && v) {
      const docText = v.state.doc.toString();
      const pos = v.posAtCoords({ x: clientX, y: clientY }) ?? v.state.selection.main.head;
      const wordInfo = getWordAtPosition(docText, pos);

      if (wordInfo) {
        let isMisspelled = false;
        const decos = v.state.field(spellDecoField, false);
        if (decos) {
          decos.between(wordInfo.from, wordInfo.to, (from, to) => {
            if (from <= wordInfo.from && to >= wordInfo.to) {
              isMisspelled = true;
            }
          });
        }

        if (isMisspelled) {
          const word = wordInfo.word;
          const wordFrom = wordInfo.from;
          const wordTo = wordInfo.to;
          let suggestions: string[] = [];

          try {
            if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
              const { invoke } = await import("@tauri-apps/api/core");
              suggestions = await invoke<string[]>("spellcheck_suggest", { word });
            }
          } catch {
            void 0;
          }

          const handleReplace = (replacement: string) => {
            const cv = viewRef.current;
            if (!cv) return;
            cv.dispatch({
              changes: { from: wordFrom, to: wordTo, insert: replacement },
              selection: { anchor: wordFrom + replacement.length },
            });
            cv.focus();
          };

          const handleAddWord = async () => {
            if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
              const { invoke } = await import("@tauri-apps/api/core");
              await invoke("spellcheck_add_word", { word });
              window.dispatchEvent(new CustomEvent("dictionary-changed"));
            }
          };

          const handleIgnoreWord = async () => {
            if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
              const { invoke } = await import("@tauri-apps/api/core");
              await invoke("spellcheck_ignore_word", { word });
              window.dispatchEvent(new CustomEvent("dictionary-changed"));
            }
          };

          const suggItems: ContextMenuItemDef[] =
            suggestions.length > 0
              ? suggestions.map((s) => ({ label: s, action: () => handleReplace(s) }))
              : [{ label: "No spelling suggestions", enabled: false }];

          spellItems = [
            ...suggItems,
            { label: `Add "${word}" to Dictionary`, action: handleAddWord },
            { label: `Ignore "${word}"`, action: handleIgnoreWord },
            "separator",
          ];
        }
      }
    }

    const customItems = extraContextMenuItems ? extraContextMenuItems(snap, hasSel, closeContextMenu) : [];

    const items: ContextMenuItem[] = [
      ...spellItems,
      ...customItems,
      "separator",
      { label: "Cut", enabled: hasSel, action: () => handleEditorAction("cut") },
      { label: "Copy", enabled: hasSel, action: () => handleEditorAction("copy") },
      { label: "Paste", action: () => handleEditorAction("paste") },
      "separator",
      {
        label: "Format",
        enabled: hasSel,
        children: [
          { label: "Bold", action: () => toggleInlineMarker("**") },
          { label: "Italic", action: () => toggleInlineMarker("*") },
          { label: "Underline", action: () => toggleInlineMarker("_") },
        ],
      },
      {
        label: "Transform Case",
        enabled: hasSel,
        children: [
          { label: "UPPERCASE", action: () => handleTransformCase("upper") },
          { label: "Title Case", action: () => handleTransformCase("title") },
          { label: "lowercase", action: () => handleTransformCase("lower") },
        ],
      },
      { label: "Look Up Word", enabled: hasSel, action: handleLookUpSelection },
      "separator",
      { label: "Create Task", enabled: hasSel, action: handleCreateTaskFromSelection },
      ...(!isProse ? [{ label: "Park Selection", enabled: hasSel, action: handleParkSelection } satisfies ContextMenuItem] : []),
    ];

    if (v && menuSelectionRef.current && menuSelectionRef.current.from !== menuSelectionRef.current.to) {
      v.dispatch({
        effects: setContextMenuHighlightEffect.of({
          from: menuSelectionRef.current.from,
          to: menuSelectionRef.current.to,
        }),
      });
    }

    setContextMenu({ x: event.clientX, y: event.clientY, items });
  };

  const handleClose = () => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: setContextMenuHighlightEffect.of(null),
      });
    }
    const savedSel = menuSelectionRef.current;
    menuSelectionRef.current = null;
    setTimeout(() => {
      if (viewRef.current && savedSel && savedSel.from !== savedSel.to) {
        viewRef.current.dispatch({
          selection: { anchor: savedSel.from, head: savedSel.to },
          scrollIntoView: false,
        });
      }
      viewRef.current?.focus();
    }, 0);
  };

  const closeContextMenu = () => {
    setContextMenu(null);
    handleClose();
  };

  const toggleInlineMarker = (marker: string) => {
    const v = viewRef.current;
    if (!v) return;
    const snap = menuSelectionRef.current;
    toggleInlineMarkerShared(v, marker, snap || undefined);
    handleClose();
  };

  const handleParkSelection = () => {
    const snap = menuSelectionRef.current;
    const v = viewRef.current;
    if (!v || !snap) return;
    const { from, to, text } = snap;
    if (!text.trim()) return;

    parking.addItem(text);
    v.dispatch({
      changes: { from, to, insert: "" },
    });
    handleClose();
    v.focus();
  };

  const handleTransformCase = (mode: "upper" | "title" | "lower") => {
    const snap = menuSelectionRef.current;
    const v = viewRef.current;
    if (!v || !snap) return;
    const { from, to } = snap;
    let newText = snap.text;
    if (mode === "upper") {
      newText = snap.text.toUpperCase();
    } else if (mode === "lower") {
      newText = snap.text.toLowerCase();
    } else if (mode === "title") {
      newText = snap.text.replace(/\b\w+/g, (s) => s.charAt(0).toUpperCase() + s.substring(1).toLowerCase());
    }
    v.dispatch({
      changes: { from, to, insert: newText },
      selection: { anchor: from, head: from + newText.length },
    });
    handleClose();
  };

  const handleCreateTaskFromSelection = () => {
    const text = (menuSelectionRef.current?.text ?? "").trim();
    if (!text) return;
    updateSettings((prev) => {
      const todos = prev.todos || [];
      const newTodo = {
        id: Date.now().toString(),
        text,
        completed: false,
        createdAt: Date.now(),
      };
      return {
        ...prev,
        todos: [...todos, newTodo],
      };
    });
    handleClose();
  };

  const handleLookUpSelection = () => {
    handleClose();
    const text = menuSelectionRef.current?.text ?? "";
    if (!text) return;
    const query = encodeURIComponent(text.trim());
    const url = `https://www.google.com/search?q=${query}`;
    import("@tauri-apps/plugin-opener").then(({ openUrl }) => openUrl(url)).catch(() => window.open(url, "_blank"));
  };

  const handleEditorAction = async (cmd: string) => {
    const v = viewRef.current;
    if (!v) return;
    const snap = menuSelectionRef.current;
    if (cmd === "paste") {
      try {
        const text = await readText();
        const sel = v.state.selection.main;
        v.dispatch({
          changes: { from: sel.from, to: sel.to, insert: text },
          selection: { anchor: sel.from + text.length },
        });
      } catch (e) {
        logger.error("editor", "clipboard read failed", e);
      }
    } else if (snap && snap.from !== snap.to && (cmd === "cut" || cmd === "copy")) {
      try {
        await writeText(snap.text);
        if (cmd === "cut") {
          v.dispatch({
            changes: { from: snap.from, to: snap.to, insert: "" },
            selection: { anchor: snap.from },
          });
        }
      } catch (e) {
        logger.error("editor", "clipboard write failed", e);
      }
    }
    v.focus();
    handleClose();
  };

  return (
    <div
      className={`editor-font-wrapper ${fontFamily}`}
      style={{ display: "flex", flex: 1, minHeight: "100%", flexDirection: "column" }}
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenu}
    >
      <div ref={containerRef} style={{ flex: 1, minHeight: "100%", cursor: "text" }} onClick={() => viewRef.current?.focus()} />
      <ContextMenu
        open={contextMenu !== null}
        x={contextMenu?.x ?? 0}
        y={contextMenu?.y ?? 0}
        items={contextMenu?.items ?? []}
        onClose={closeContextMenu}
      />
    </div>
  );
});
