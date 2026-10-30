import { useUrAITransform } from "./ai/UrAITransform";
import React, { useRef } from "react";
import { useProseCodeMirror } from "../editor/useProseCodeMirror";
import { CoreEditor, type MenuSelectionSnap } from "./editor/CoreEditor";
import { type ContextMenuItem, type ContextMenuItemDef } from "./ContextMenu";
import { useUI } from "../context";
import { usePromptConfig } from "../hooks/usePromptConfig";

export const ProseEditor = React.memo(() => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { setActiveRightPane, setActiveTab } = useUI();
  const promptConfig = usePromptConfig();
  const transform = useUrAITransform(promptConfig);

  const viewRef = useProseCodeMirror({ containerRef });

  const handlePromptAction = (action: "lookup" | "synonyms", snap: MenuSelectionSnap | null, closeMenu: () => void) => {
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

  const handleRephraseClick = (instruction: string, snap: MenuSelectionSnap | null, closeMenu: () => void) => {
    const v = viewRef.current;
    closeMenu();
    if (!v) return;
    const from = snap?.from ?? v.state.selection.main.from;
    const to = snap?.to ?? v.state.selection.main.to;
    if (from !== to) transform.start(v, from, to, "rephrase", instruction);
  };
  const handleTranslateClick = (lang: string, snap: MenuSelectionSnap | null, closeMenu: () => void) => {
    const v = viewRef.current;
    closeMenu();
    if (!v) return;
    const from = snap?.from ?? v.state.selection.main.from;
    const to = snap?.to ?? v.state.selection.main.to;
    if (from !== to) transform.start(v, from, to, "translate", "", lang);
  };

  const extraContextMenuItems = (
    snap: MenuSelectionSnap | null,
    hasSel: boolean,
    closeMenu: () => void,
  ): ContextMenuItem[] => {
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
      : [];

    return [
      ...(uraiItems.length > 0
        ? [{ label: "UrAI", children: uraiItems } satisfies ContextMenuItem, "separator" as const]
        : []),
      {
        label: "Insert Table",
        action: () => {
          closeMenu();
          const v = viewRef.current;
          if (!v) return;
          const from = v.state.selection.main.from;
          const tableTemplate = `\n| Column 1 | Column 2 | Column 3 |\n| --- | --- | --- |\n| Row 1 | Data | Data |\n| Row 2 | Data | Data |\n`;
          v.dispatch({
            changes: { from, insert: tableTemplate },
            selection: { anchor: from + tableTemplate.length },
          });
          v.focus();
        },
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
