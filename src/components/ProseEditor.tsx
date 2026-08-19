import React, { useRef, useCallback } from "react";
import { useProseCodeMirror, registerAssetBlob } from "../editor/useProseCodeMirror";
import { CoreEditor, type MenuSelectionSnap } from "./editor/CoreEditor";
import { type ContextMenuItem, type ContextMenuItemDef } from "./ContextMenu";
import { useFile, useUI } from "../context";
import { usePromptConfig } from "../hooks/usePromptConfig";
import { getLanguageDetails } from "../constants/languages";
import { createAIProvider } from "../lib/aiProviders";
import { EditorView } from "@codemirror/view";
import { logger } from "../utils/logger";

export const ProseEditor = React.memo(() => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { updateSettings } = useFile();
  const { setActiveRightPane, setActiveTab, setAiStatus } = useUI();
  const promptConfig = usePromptConfig();

  const handleInsertImage = useCallback(async (file: File, view: EditorView) => {
    const bytes = await file.arrayBuffer();
    const uint8Array = new Uint8Array(bytes);
    const newAssetKey = `files/assets/${file.name}`;
    
    registerAssetBlob(newAssetKey, uint8Array);
    registerAssetBlob(file.name, uint8Array);

    updateSettings((prev) => ({
      ...prev,
      assets: {
        ...(prev.assets || {}),
        [newAssetKey]: uint8Array,
        [file.name]: uint8Array,
      }
    }));
    const from = view.state.selection.main.from;
    const insertText = `\n![${file.name}](asset://${newAssetKey})\n`;
    view.dispatch({
      changes: { from, insert: insertText },
      selection: { anchor: from + insertText.length }
    });
  }, [updateSettings]);
  
  const viewRef = useProseCodeMirror({ containerRef, onInsertImage: handleInsertImage });

  const handlePromptAction = (action: "lookup" | "synonyms", snap: MenuSelectionSnap | null, closeMenu: () => void) => {
    const v = viewRef.current;
    const text = (snap && snap.from !== snap.to) ? snap.text : (v ? v.state.sliceDoc(v.state.selection.main.from, v.state.selection.main.to) : "");
    closeMenu();
    if (!text || !text.trim()) return;

    setActiveRightPane("prompt");
    setActiveTab("muse");
    (window as any).pendingPromptAction = { action, text };
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent(`prompt-${action}`, { detail: text }));
    }, 100);
  };

  const handleRephraseClick = async (userPrompt: string, snap: MenuSelectionSnap | null, closeMenu: () => void) => {
    const v = viewRef.current;
    const text = (snap && snap.from !== snap.to) ? snap.text : (v ? v.state.sliceDoc(v.state.selection.main.from, v.state.selection.main.to) : "");
    closeMenu();
    if (!text || !text.trim() || !v) return;

    const from = snap ? snap.from : v.state.selection.main.from;
    const to = snap ? snap.to : v.state.selection.main.to;

    try {
      const provider = createAIProvider(promptConfig);
      if (!provider) return;

      const systemPrompt = "You are a professional writing assistant. Rewrite the user's text according to instructions. Output ONLY the rephrased text.";
      const rephrased = await provider.chat(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Instruction: ${userPrompt}\n\nText:\n${text}` }
        ],
        { temperature: promptConfig.rephraseTemp }
      );

      if (rephrased) {
        v.dispatch({
          changes: { from, to, insert: rephrased },
          selection: { anchor: from + rephrased.length }
        });
      }
    } catch (err) {
      logger.error("editor", "Prose inline rephrase failed", err);
    }
  };

  const handleTranslateClick = async (lang: string, snap: MenuSelectionSnap | null, closeMenu: () => void) => {
    const v = viewRef.current;
    const text = (snap && snap.from !== snap.to) ? snap.text : (v ? v.state.sliceDoc(v.state.selection.main.from, v.state.selection.main.to) : "");
    closeMenu();
    if (!text || !text.trim() || !v) return;

    const from = snap ? snap.from : v.state.selection.main.from;
    const to = snap ? snap.to : v.state.selection.main.to;

    try {
      setAiStatus(`Translating to ${lang}...`);
      const provider = createAIProvider(promptConfig);
      if (!provider) throw new Error("No AI provider configured");

      const ld = getLanguageDetails(lang);
      const systemPrompt = `You are a professional translation assistant. Translate the following markdown text into ${lang} (${ld.native}). Preserve markdown structure. Return ONLY translated text.`;

      const translated = await provider.chat(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ],
        { temperature: promptConfig.translateTemp }
      );

      if (translated) {
        v.dispatch({
          changes: { from, to, insert: translated },
          selection: { anchor: from + translated.length }
        });
      }
      setAiStatus(null);
    } catch (err: any) {
      logger.error("editor", "Prose inline translate failed", err);
      setAiStatus(`AI Error: ${err?.message || String(err)}`);
      setTimeout(() => setAiStatus(null), 5000);
    }
  };

  const extraContextMenuItems = (snap: MenuSelectionSnap | null, hasSel: boolean, closeMenu: () => void): ContextMenuItem[] => {
    const museItems: ContextMenuItemDef[] = hasSel
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
      ...(museItems.length > 0 ? [{ label: "Muse", children: museItems } satisfies ContextMenuItem, "separator" as const] : []),
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
            selection: { anchor: from + tableTemplate.length }
          });
          v.focus();
        }
      },
      {
        label: "Insert Image",
        action: () => {
          closeMenu();
          const v = viewRef.current;
          if (!v) return;
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.onchange = (e) => {
            const target = e.target as HTMLInputElement;
            if (target.files && target.files.length > 0) {
              handleInsertImage(target.files[0], v);
            }
          };
          input.click();
        }
      }
    ];
  };

  return (
    <CoreEditor
      containerRef={containerRef}
      viewRef={viewRef}
      extraContextMenuItems={extraContextMenuItems}
    />
  );
});
