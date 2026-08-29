import React, { useRef, useState, useMemo } from "react";
import { useFile, useUI, useCustomModal } from "../context";
import { usePromptConfig } from "../hooks/usePromptConfig";
import { useScriptCodeMirror } from "../editor";
import { logger } from "../utils/logger";
import { FOUNTAIN_SYNTAX_RULES } from "../constants";
import { setRephraseRangeEffect } from "../editor/rephraseState";
import { extractThinkingAndClean } from "../hooks/useAIChat";
import { CoreEditor, type MenuSelectionSnap } from "./editor/CoreEditor";
import { type ContextMenuItem, type ContextMenuItemDef } from "./ContextMenu";
import { createAIProvider } from "../lib/aiProviders";
import { getLanguageDetails } from "../constants/languages";

const HIGHLIGHT_COLORS = [
  { key: "red", label: "Red", color: "var(--scene-color-red)" },
  { key: "orange", label: "Orange", color: "var(--scene-color-orange)" },
  { key: "yellow", label: "Yellow", color: "var(--scene-color-yellow)" },
  { key: "green", label: "Green", color: "var(--scene-color-green)" },
  { key: "blue", label: "Blue", color: "var(--scene-color-blue)" },
  { key: "purple", label: "Purple", color: "var(--scene-color-purple)" },
  { key: "pink", label: "Pink", color: "var(--scene-color-pink)" },
  { key: "none", label: "Clear Highlight", color: "var(--cat-other)" }
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
  { key: "none", label: "Default (Orange)", color: "var(--cat-other)" }
];

export const ScriptEditor = React.memo(() => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { setActiveRightPane, setActiveTab, setAiStatus, setIsTranslationModalOpen, setTranslationSetupTarget } = useUI();
  const { parsedDoc, activeScriptIndex, activeFileId } = useFile();
  const { prompt: showPrompt } = useCustomModal();
  
  const viewRef = useScriptCodeMirror(containerRef);

  const [translatingLang, setTranslatingLang] = useState<string | null>(null);
  const promptConfig = usePromptConfig();

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
    } catch (e) { logger.warn("editor", "Failed to find current scene line", e); }
    return null;
  }, [parsedDoc?.lines, viewRef.current?.state.selection.main]);

  const performInlineRephrase = async (text: string, userPrompt: string, snap: MenuSelectionSnap | null) => {
    const v = viewRef.current;
    if (!v) return;
    const from = snap ? snap.from : v.state.selection.main.from;
    const to = snap ? snap.to : v.state.selection.main.to;
    const originalText = text;

    const lines = originalText.split(/\r?\n/);
    const lineData = lines.map(line => {
      let prefix = "";
      let suffix = "";
      let clean = line;

      const indentMatch = clean.match(/^\s+/);
      let indent = "";
      if (indentMatch) {
        indent = indentMatch[0];
        clean = clean.slice(indent.length);
      }

      if (clean.startsWith("!!")) {
        prefix = "!!";
        clean = clean.slice(2);
      } else if (clean.startsWith("=")) {
        prefix = "=";
        clean = clean.slice(1);
      } else if (clean.startsWith(".")) {
        prefix = ".";
        clean = clean.slice(1);
      } else if (clean.startsWith("-")) {
        if (clean.startsWith("- ")) {
          prefix = "- ";
          clean = clean.slice(2);
        } else {
          prefix = "-";
          clean = clean.slice(1);
        }
      } else if (clean.startsWith(">")) {
        prefix = ">";
        clean = clean.slice(1);
      } else if (clean.startsWith("[[") && clean.endsWith("]]")) {
        prefix = "[[";
        suffix = "]]";
        clean = clean.slice(2, -2);
      } else if (clean.startsWith("#")) {
        const match = clean.match(/^#+/);
        if (match) {
          prefix = match[0];
          clean = clean.slice(prefix.length);
        }
      }

      return {
        original: line,
        indent,
        prefix,
        suffix,
        clean
      };
    });

    const cleanBody = lineData.map(ld => ld.clean).join("\n");
    const isSingleLine = lines.length === 1;

    const containsNonLatin = /[^\u0000-\u007F\u0080-\u00FF\u0100-\u017F\u0180-\u024F\u2000-\u206F]/.test(cleanBody);

    const doc = v.state.doc;
    const lineStart = doc.lineAt(from);
    const lineEnd = doc.lineAt(to);
    const startLineNum = Math.max(1, lineStart.number - 5);
    const endLineNum = Math.min(doc.lines, lineEnd.number + 5);

    const contextAbove = doc.sliceString(doc.line(startLineNum).from, lineStart.from);
    const contextBelow = doc.sliceString(lineEnd.to, doc.line(endLineNum).to);

    const promptContext = containsNonLatin
      ? `>>> TEXT TO REPHRASE:\n${cleanBody}\n<<<`
      : [
          contextAbove ? `--- SCRIPT CONTEXT ABOVE ---\n${contextAbove}\n` : "",
          `>>> TEXT TO REPHRASE:\n${cleanBody}\n<<<`,
          contextBelow ? `\n--- SCRIPT CONTEXT BELOW ---\n${contextBelow}` : ""
        ].join("").trim();

    v.dispatch({
      effects: setRephraseRangeEffect.of({ from, to })
    });

    try {
      const systemPrompt = [
        userPrompt,
        "",
        "Instructions:",
        "1. Rephrase ONLY the text enclosed in '>>> TEXT TO REPHRASE:\\n...\\n<<<'.",
        "2. Use the surrounding 'SCRIPT CONTEXT ABOVE' and 'SCRIPT CONTEXT BELOW' only to understand the story context, formatting type (synopsis, scene heading, action, dialogue), and style.",
        "3. Do NOT rewrite the surrounding context or add any new scene headings, actions, or dialogue.",
        "4. Your output MUST match the number of lines and structure of the selected text exactly. Do not merge lines or split single lines into multiple paragraphs.",
        "5. Do NOT translate the text. Rephrase strictly in the exact same language as the target text (e.g. if the target text is in Tamil, your response MUST be in Tamil).",
        "6. Do NOT use dashes or hyphens (- or -- or —) unless part of a necessary compound word like 'co-working' or 'ten-year-old'. Use commas, full stops, or conjunctions (and, but, so) instead.",
        "7. Do NOT change the capitalization or convert lowercase text into ALL CAPS unless the original target text was already in ALL CAPS.",
        isSingleLine
          ? "7. Respond ONLY with the rephrased text on a SINGLE line. Do NOT add any newlines, line breaks, or carriage returns. Do not add any introductory text, quotes, or explanations."
          : "7. Respond ONLY with the rephrased text. Do NOT introduce any new line breaks, extra blank lines, or structural divisions that were not present in the original text. Rephrase the text as-is, preserving the exact line-by-line structure and any internal formatting/syntax.",
        "",
        "Follow these strict Fountain syntax rules:",
        FOUNTAIN_SYNTAX_RULES
      ].join("\n");

      const provider = createAIProvider(promptConfig);
      if (!provider) throw new Error("No AI provider configured");

      let fullRaw = "";
      let lastReplacedLength = to - from;

      const applyStreamChunk = (rawAccumulated: string, isFinal = false) => {
        const { cleanContent } = extractThinkingAndClean(rawAccumulated);
        if (!cleanContent && !isFinal) return;

        let processed = cleanContent;
        if (containsNonLatin && !/[^\u0000-\u007F\u0080-\u00FF\u0100-\u017F\u0180-\u024F\u2000-\u206F]/.test(processed)) {
          if (isFinal) processed = cleanBody;
        }

        const resLines = processed.split(/\r?\n/);
        const finalLines = lineData.map((ld, i) => {
          const rephrasedLine = resLines[i] !== undefined ? (isFinal ? resLines[i].trim() : resLines[i]) : (isFinal ? ld.clean : "");
          return ld.indent + ld.prefix + rephrasedLine + (isFinal || resLines[i] !== undefined ? ld.suffix : "");
        });
        const currentText = finalLines.join("\n").replace(/—/g, "--");

        v.dispatch({
          changes: { from, to: from + lastReplacedLength, insert: currentText },
          selection: { anchor: from + currentText.length },
          effects: isFinal ? setRephraseRangeEffect.of(null) : undefined,
        });
        lastReplacedLength = currentText.length;
      };

      await provider.chat(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: promptContext }
        ],
        {
          temperature: promptConfig.rephraseTemp,
          onChunk: (delta) => {
            fullRaw += delta;
            applyStreamChunk(fullRaw, false);
          }
        }
      );

      applyStreamChunk(fullRaw || cleanBody, true);
    } catch (err) {
      v.dispatch({
        effects: setRephraseRangeEffect.of(null)
      });
      logger.error("editor", "Inline rephrase failed", err);
    }
  };

  const handlePromptAction = async (action: "lookup" | "synonyms", snap: MenuSelectionSnap | null, closeMenu: () => void) => {
    const v = viewRef.current;
    const text = (snap && snap.from !== snap.to) ? snap.text : (v ? v.state.sliceDoc(v.state.selection.main.from, v.state.selection.main.to) : "");
    closeMenu();
    if (!text || !text.trim()) return;

    if (action === "lookup") {
      setActiveRightPane("prompt");
      setActiveTab("muse");
      (window as any).pendingPromptAction = { action: "lookup", text };
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("prompt-lookup", { detail: text }));
      }, 100);
    } else if (action === "synonyms") {
      setActiveRightPane("prompt");
      setActiveTab("muse");
      (window as any).pendingPromptAction = { action: "synonyms", text };
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("prompt-synonyms", { detail: text }));
      }, 100);
    }
  };

  const handleRephraseClick = async (userPrompt: string, snap: MenuSelectionSnap | null, closeMenu: () => void) => {
    const v = viewRef.current;
    const text = (snap && snap.from !== snap.to) ? snap.text : (v ? v.state.sliceDoc(v.state.selection.main.from, v.state.selection.main.to) : "");
    closeMenu();
    if (!text || !text.trim()) return;

    await performInlineRephrase(text, userPrompt, snap);
  };

  const handleTranslateClick = async (lang: string, snap: MenuSelectionSnap | null, closeMenu: () => void) => {
    setTranslatingLang(lang);
    setAiStatus(`Translating to ${lang}...`);
    const v = viewRef.current;
    const text = (snap && snap.from !== snap.to) ? snap.text : (v ? v.state.sliceDoc(v.state.selection.main.from, v.state.selection.main.to) : "");
    closeMenu();
    if (!text || !text.trim()) {
      setAiStatus(null);
      setTranslatingLang(null);
      return;
    }

    try {
      if (!v) return;
      const from = snap ? snap.from : v.state.selection.main.from;
      const to = snap ? snap.to : v.state.selection.main.to;

      v.dispatch({
        effects: setRephraseRangeEffect.of({ from, to })
      });

      const lines = text.split(/\r?\n/);
      const lineData = lines.map(line => {
        let prefix = "";
        let suffix = "";
        let clean = line;
        const indentMatch = clean.match(/^\s+/);
        let indent = "";
        if (indentMatch) {
          indent = indentMatch[0];
          clean = clean.slice(indent.length);
        }
        if (clean.startsWith("!!")) { prefix = "!!"; clean = clean.slice(2); }
        else if (clean.startsWith("=")) { prefix = "="; clean = clean.slice(1); }
        else if (clean.startsWith(".")) { prefix = "."; clean = clean.slice(1); }
        else if (clean.startsWith("-")) {
          if (clean.startsWith("- ")) { prefix = "- "; clean = clean.slice(2); }
          else { prefix = "-"; clean = clean.slice(1); }
        }
        else if (clean.startsWith(">")) { prefix = ">"; clean = clean.slice(1); }
        else if (clean.startsWith("[[") && clean.endsWith("]]")) { prefix = "[["; suffix = "]]"; clean = clean.slice(2, -2); }
        else if (clean.startsWith("#")) { const m = clean.match(/^#+/); if (m) { prefix = m[0]; clean = clean.slice(prefix.length); } }
        return { indent, prefix, suffix, clean, original: line };
      });

      const cleanBody = lineData.map(ld => ld.clean).join("\n");
      const isSingleLine = lineData.length === 1;

      const ld = getLanguageDetails(lang);
      const langInfo = `"${lang}" (language code: ${ld.code}, native name: ${ld.native})`;

      const systemPrompt = [
        `You are a professional screenplay translation tool. Translate the given text into ${langInfo}.`,
        `The output MUST be written in ${ld.native} script (${ld.code}).`,
        ld.example ? `Example of this language: "${ld.example}"` : "",
        `NEVER output text in Tamil, Hindi, or any other Indian language unless ${ld.code} explicitly requires it.`,
        "",
        "TONE & STYLE GUIDELINES:",
        "• Dialogue & Conversation: Use a natural, casual, spoken conversational tone (colloquial spoken language as spoken by real people in modern movies). Do NOT use stiff, formal, archaic, or textbook/literary phrasing.",
        "• Action & Description: Keep action lines punchy, vivid, and cinematic.",
        "",
        "CRITICAL RULES:",
        `1. Translate each input line into ${langInfo} using natural conversational phrasing.`,
        "2. Do NOT add preamble, conversational notes, safety disclaimers, or markdown fences.",
        isSingleLine
          ? "3. Output ONLY the translated text on a SINGLE line without surrounding quotes."
          : "3. Output ONLY the translated text preserving the exact line-by-line structure without surrounding quotes."
      ].filter(Boolean).join("\n");

      const provider = createAIProvider(promptConfig);
      if (!provider) throw new Error("No AI provider configured");

      let fullRaw = "";
      let lastReplacedLength = to - from;

      const applyStreamChunk = (rawAccumulated: string, isFinal = false) => {
        const { cleanContent } = extractThinkingAndClean(rawAccumulated);
        if (!cleanContent && !isFinal) return;

        const resLines = cleanContent.split(/\r?\n/);
        const finalLines = lineData.map((ld, i) => {
          const translatedLine = resLines[i] !== undefined ? (isFinal ? resLines[i].trim() : resLines[i]) : (isFinal ? ld.clean : "");
          return ld.indent + ld.prefix + translatedLine + (isFinal || resLines[i] !== undefined ? ld.suffix : "");
        });
        const currentText = finalLines.join("\n");

        v.dispatch({
          changes: { from, to: from + lastReplacedLength, insert: currentText },
          selection: { anchor: from + currentText.length },
          effects: isFinal ? setRephraseRangeEffect.of(null) : undefined,
        });
        lastReplacedLength = currentText.length;
      };

      await provider.chat(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: cleanBody }
        ],
        {
          temperature: promptConfig.translateTemp,
          onChunk: (delta) => {
            fullRaw += delta;
            applyStreamChunk(fullRaw, false);
          }
        }
      );

      applyStreamChunk(fullRaw || cleanBody, true);
      setAiStatus(null);
    } catch (err: any) {
      const msg = err?.message || String(err);
      logger.error("editor", "Inline translate failed", err);
      setAiStatus(`AI Error: ${msg.slice(0, 50)}`);
      setTimeout(() => setAiStatus(null), 7000);
      v?.dispatch({ effects: setRephraseRangeEffect.of(null) });
    } finally {
      setTranslatingLang(null);
    }
    v?.focus();
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
      changes: { from: lineObj.from, to: lineObj.to, insert: newText }
    });
    closeMenu();
  };

  const handleDropMarkerWithColor = async (colorName: string, snap: MenuSelectionSnap | null, closeMenu: () => void) => {
    const v = viewRef.current;
    if (!v) return;
    const from = snap ? snap.from : v.state.selection.main.from;
    const to = snap ? snap.to : v.state.selection.main.to;
    const defaultDesc = snap ? snap.text : "";
    closeMenu();
    const desc = await showPrompt({
      title: "Drop Marker",
      message: `Enter ${colorName} marker description:`,
      defaultValue: defaultDesc
    });
    if (desc !== null) {
      const markerText = colorName === "none" ? `[[marker: ${desc.trim()}]]` : `[[marker ${colorName}: ${desc.trim()}]]`;
      v.dispatch({
        changes: { from, to, insert: markerText },
        selection: { anchor: from + markerText.length }
      });
    }
  };

  const extraContextMenuItems = (snap: MenuSelectionSnap | null, hasSel: boolean, closeMenu: () => void): ContextMenuItem[] => {
    const isSceneLine = currentSceneLine !== null;

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
              enabled: translatingLang !== lang,
              action: () => handleTranslateClick(lang, snap, closeMenu),
            })),
          },
        ]
      : [{
          label: "Translate Whole Document",
          action: () => handleTranslateWholeDocument(closeMenu),
        }];

    return [
      { label: "Muse", children: museItems },
      "separator",
      {
        label: "Highlight Scene",
        enabled: isSceneLine,
        children: HIGHLIGHT_COLORS.map((col) => ({ label: col.label, action: () => handleHighlightScene(col.key, closeMenu) })),
      },
      {
        label: "Drop Marker",
        children: MARKER_COLORS.map((col) => ({ label: col.label, action: () => handleDropMarkerWithColor(col.key, snap, closeMenu) })),
      },
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
