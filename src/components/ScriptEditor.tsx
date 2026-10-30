import { useUrAITransform } from "./ai/UrAITransform";
import React, { useRef, useMemo } from "react";
import { useFile, useUI, useCustomModal } from "../context";
import { usePromptConfig } from "../hooks/usePromptConfig";
import { useScriptCodeMirror } from "../editor";
import { logger } from "../utils/logger";
import { CoreEditor, type MenuSelectionSnap } from "./editor/CoreEditor";
import { type ContextMenuItem, type ContextMenuItemDef } from "./ContextMenu";

const HIGHLIGHT_COLORS = [
  { key: "red", label: "Red", color: "var(--scene-color-red)" },
  { key: "orange", label: "Orange", color: "var(--scene-color-orange)" },
  { key: "yellow", label: "Yellow", color: "var(--scene-color-yellow)" },
  { key: "green", label: "Green", color: "var(--scene-color-green)" },
  { key: "blue", label: "Blue", color: "var(--scene-color-blue)" },
  { key: "purple", label: "Purple", color: "var(--scene-color-purple)" },
  { key: "pink", label: "Pink", color: "var(--scene-color-pink)" },
  { key: "none", label: "Clear Highlight", color: "var(--cat-other)" },
];

const MARKER_COLORS = [
  { key: "blue", label: "Blue", color: "var(--scene-color-blue)" },
  { key: "brown", label: "Brown", color: "var(--scene-color-brown)" },
  { key: "cyan", label: "Cyan", color: "var(--scene-color-cyan)" },
  { key: "green", label: "Green", color: "var(--scene-color-green)" },
  { key: "magenta", label: "Magenta", color: "var(--scene-color-magenta)" },
  { key: "orange", label: "Orange", color: "var(--scene-color-orange)" },
  { key: "pink", label: "Pink", color: "var(--scene-color-pink)" },
  { key: "purple", label: "Purple", color: "var(--scene-color-purple)" },
  { key: "red", label: "Red", color: "var(--scene-color-red)" },
  { key: "yellow", label: "Yellow", color: "var(--scene-color-yellow)" },
  { key: "none", label: "Default (Orange)", color: "var(--cat-other)" },
];

export const ScriptEditor = React.memo(() => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { setActiveRightPane, setActiveTab, setIsTranslationModalOpen, setTranslationSetupTarget } = useUI();
  const { parsedDoc, activeScriptIndex, activeFileId } = useFile();
  const { prompt: showPrompt } = useCustomModal();

  const viewRef = useScriptCodeMirror(containerRef);

  const promptConfig = usePromptConfig();
  const transform = useUrAITransform(promptConfig);

  const currentSceneLine = useMemo(() => {
    const v = viewRef.current;
    if (!v || !parsedDoc?.lines) return null;
    const selection = v.state.selection.main;
    try {
      const lineObj = v.state.doc.lineAt(selection.from);
      const lineIndex = lineObj.number - 1;
      for (let i = lineIndex; i >= 0; i--) {
        const line = parsedDoc.lines[i];
        if (line && line.type === 10) {
          return { index: i, line };
        }
      }
    } catch (e) {
      logger.warn("editor", "Failed to find current scene line", e);
    }
    return null;
  }, [parsedDoc?.lines, viewRef.current?.state.selection.main]);

  const handlePromptAction = async (
    action: "lookup" | "synonyms",
    snap: MenuSelectionSnap | null,
    closeMenu: () => void,
  ) => {
    const v = viewRef.current;
    const text =
      snap && snap.from !== snap.to
        ? snap.text
        : v
          ? v.state.sliceDoc(v.state.selection.main.from, v.state.selection.main.to)
          : "";
    closeMenu();
    if (!text || !text.trim()) return;

    if (action === "lookup") {
      setActiveRightPane("prompt");
      setActiveTab("urai");
      (window as any).pendingPromptAction = { action: "lookup", text };
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("prompt-lookup", { detail: text }));
      }, 100);
    } else if (action === "synonyms") {
      setActiveRightPane("prompt");
      setActiveTab("urai");
      (window as any).pendingPromptAction = { action: "synonyms", text };
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("prompt-synonyms", { detail: text }));
      }, 100);
    }
  };

  const handleRephraseClick = async (userPrompt: string, snap: MenuSelectionSnap | null, closeMenu: () => void) => {
    const v = viewRef.current;
    const text =
      snap && snap.from !== snap.to
        ? snap.text
        : v
          ? v.state.sliceDoc(v.state.selection.main.from, v.state.selection.main.to)
          : "";
    closeMenu();
    if (!text || !text.trim()) return;

    if (v)
      transform.start(
        v,
        snap?.from ?? v.state.selection.main.from,
        snap?.to ?? v.state.selection.main.to,
        "rephrase",
        userPrompt,
      );
  };

  const handleTranslateClick = async (lang: string, snap: MenuSelectionSnap | null, closeMenu: () => void) => {
    const v = viewRef.current;
    closeMenu();
    if (!v) return;
    const from = snap?.from ?? v.state.selection.main.from;
    const to = snap?.to ?? v.state.selection.main.to;
    if (from !== to) transform.start(v, from, to, "translate", "", lang);
  };

  const handleTranslateWholeDocument = async (closeMenu: () => void) => {
    closeMenu();
    if (!activeFileId) return;
    setTranslationSetupTarget({ fileId: activeFileId, scriptIndex: activeScriptIndex });
    setIsTranslationModalOpen(true);
  };

  const handleHighlightScene = (colorName: string, closeMenu: () => void) => {
    const v = viewRef.current;
    if (!v || !currentSceneLine) return;
    const { index } = currentSceneLine;
    const lineObj = v.state.doc.line(index + 1);
    const originalText = lineObj.text;
    const supportedColors = ["blue", "brown", "cyan", "green", "magenta", "orange", "pink", "purple", "red", "yellow"];
    let newText = originalText.replace(/\s*\[\[color\s+[#\w]+\]\]/gi, "");
    const colorRegex = new RegExp(`\\s*\\[\\[(${supportedColors.join("|")}|#[0-9a-fA-F]{6})\\]\\]`, "gi");
    newText = newText.replace(colorRegex, "");
    if (colorName !== "none") {
      newText = `${newText.trimEnd()} [[${colorName}]]`;
    }
    v.dispatch({
      changes: { from: lineObj.from, to: lineObj.to, insert: newText },
    });
    closeMenu();
  };

  const handleDropMarkerWithColor = async (
    colorName: string,
    snap: MenuSelectionSnap | null,
    closeMenu: () => void,
  ) => {
    const v = viewRef.current;
    if (!v) return;
    const from = snap ? snap.from : v.state.selection.main.from;
    const to = snap ? snap.to : v.state.selection.main.to;
    const defaultDesc = snap ? snap.text : "";
    closeMenu();
    const desc = await showPrompt({
      title: "Drop Marker",
      message: `Enter ${colorName} marker description:`,
      defaultValue: defaultDesc,
    });
    if (desc !== null) {
      const markerText =
        colorName === "none" ? `[[marker: ${desc.trim()}]]` : `[[marker ${colorName}: ${desc.trim()}]]`;
      v.dispatch({
        changes: { from, to, insert: markerText },
        selection: { anchor: from + markerText.length },
      });
    }
  };

  const extraContextMenuItems = (
    snap: MenuSelectionSnap | null,
    hasSel: boolean,
    closeMenu: () => void,
  ): ContextMenuItem[] => {
    const isSceneLine = currentSceneLine !== null;

    const uraiItems: ContextMenuItemDef[] = hasSel
      ? [
          { label: "Look up", action: () => handlePromptAction("lookup", snap, closeMenu) },
          { label: "Synonyms", action: () => handlePromptAction("synonyms", snap, closeMenu) },
          {
            label: "Rephrase",
            children: promptConfig.rephrasePresets.map((preset) => ({
              label: preset.name || "Untitled",
              enabled: !!preset.prompt.trim(),
              action: () => handleRephraseClick(preset.prompt, snap, closeMenu),
            })),
          },
          {
            label: "Translate",
            children: promptConfig.translateLanguages.map((lang) => ({
              label: lang,
              action: () => handleTranslateClick(lang, snap, closeMenu),
            })),
          },
        ]
      : [
          {
            label: "Translate Whole Document",
            action: () => handleTranslateWholeDocument(closeMenu),
          },
        ];

    return [
      { label: "UrAI", children: uraiItems },
      "separator",
      {
        label: "Highlight Scene",
        enabled: isSceneLine,
        children: HIGHLIGHT_COLORS.map((col) => ({
          label: col.label,
          action: () => handleHighlightScene(col.key, closeMenu),
        })),
      },
      {
        label: "Drop Marker",
        children: MARKER_COLORS.map((col) => ({
          label: col.label,
          action: () => handleDropMarkerWithColor(col.key, snap, closeMenu),
        })),
      },
    ];
  };

  return (
    <>
      {transform.dialog}
      <CoreEditor containerRef={containerRef} viewRef={viewRef} extraContextMenuItems={extraContextMenuItems} />
    </>
  );
});
