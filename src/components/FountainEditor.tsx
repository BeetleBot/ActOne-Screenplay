import React, { useRef, useState, useMemo } from "react";
import { useFile, useUI, useEditor, useParking, useCustomModal } from "../context";
import { LineType } from "../parser";
import { usePromptConfig } from "../hooks/usePromptConfig";
import { getLanguageDetails } from "../constants/languages";
import { useCodeMirror } from "../editor";
import { Menu, MenuItem, Divider, ListItemIcon, ListItemText, Typography, Box } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { Theme } from "@mui/material/styles";
import { ContentCutIcon, ContentCopyIcon, AssignmentIcon, LocalOfferIcon, BookmarkIcon, ColorLensIcon, TextFieldsIcon, GoogleLogoIcon, TaskAltIcon, ArchiveIcon, FormatBoldIcon, FormatItalicIcon, FormatUnderlinedIcon, DeleteIcon, ChevronRightIcon, AutoAwesomeIcon } from "./Icons";
import { logger } from "../utils/logger";
import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager";
import { CATEGORIES, FOUNTAIN_SYNTAX_RULES } from "../constants";
import { getPerScriptSettingObject } from "../utils/perScriptSettings";
import { updateTagsEffect, tagStateField } from "../editor/tagState";
import { setRephraseRangeEffect } from "../editor/rephraseState";
import { toggleInlineMarker as toggleInlineMarkerShared } from "../editor/formatUtils";


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

interface ProdTagItem {
  range?: [number, number];
  definitionId: string;
  type?: string;
  sceneId?: string;
}

interface ProdDef {
  id: string;
  name: string;
  type: string;
  colorOverride: string | null;
}

import { createAIProvider } from "../lib/aiProviders";

export const FountainEditor = React.memo(() => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { fontFamily, setActiveRightPane, setActiveTab, setAiStatus, translationState, setTranslationState } = useUI();
  const translationStateRef = useRef<'idle' | 'running' | 'paused' | 'cancelled'>(translationState);
  translationStateRef.current = translationState;
  const { parsedDoc, scriptFileName, activeScriptIndex, duplicateScript, activeFileId, updateFileScriptContent } = useFile();
  const { updateSettings } = useEditor();
  const parking = useParking();
  const { prompt: showPrompt } = useCustomModal();
  
  const viewRef = useCodeMirror(containerRef);

  const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number } | null>(null);
  const [quickTagMode, setQuickTagMode] = useState(false);
  const [subMenuAnchorEl, setSubMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [promptMenuAnchorEl, setPromptMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [rephraseMenuAnchorEl, setRephraseMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [formatMenuAnchorEl, setFormatMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [highlightMenuAnchorEl, setHighlightMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [markerMenuAnchorEl, setMarkerMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [transformMenuAnchorEl, setTransformMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [translateMenuAnchorEl, setTranslateMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [translatingLang, setTranslatingLang] = useState<string | null>(null);

  const promptConfig = usePromptConfig();

  // Snapshot of selection captured at mousedown time (button=2 / right-click),
  // BEFORE CodeMirror's own mousedown handler collapses the selection.
  // Always set — includes cursor position even when there is no text selection.
  const menuSelectionRef = useRef<{ from: number; to: number; text: string } | null>(null);

  const view = viewRef.current;
  const selection = view ? view.state.selection.main : null;
  const hasSelection = selection ? selection.from !== selection.to : false;
  const selectedText = (view && selection && hasSelection) ? view.state.sliceDoc(selection.from, selection.to) : "";

  // These are derived from the snapshotted selection so they remain stable while the menu is open.
  const menuHasSelection = menuSelectionRef.current !== null && menuSelectionRef.current.from !== menuSelectionRef.current.to;
  const menuSelectedText = menuSelectionRef.current?.text ?? "";

  const wordCount = useMemo(() => {
    const text = contextMenu ? menuSelectedText : selectedText;
    if (!text) return 0;
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  }, [selectedText, menuSelectedText, contextMenu]);

  const charCount = contextMenu ? menuSelectedText.length : selectedText.length;

  const currentSceneLine = useMemo(() => {
    if (!view || !selection || !parsedDoc?.lines) return null;
    try {
      const lineObj = view.state.doc.lineAt(selection.from);
      const lineIndex = lineObj.number - 1;
      for (let i = lineIndex; i >= 0; i--) {
        const line = parsedDoc.lines[i];
        if (line && line.type === 10) {
          return { index: i, line };
        }
      }
    } catch (e) { logger.warn("editor", "Failed to find current scene line", e); }
    return null;
  }, [parsedDoc?.lines, view, selection]);

  const existingTag = useMemo(() => {
    if (!view) return null;
    // When context menu is open, use the snapshot cursor (captured before CodeMirror collapsed selection).
    // When menu is closed, fall back to the live cursor for any passive checks.
    const cursor = contextMenu
      ? (menuSelectionRef.current?.from ?? selection?.from)
      : selection?.from;
    if (cursor == null) return null;

    const prodTags = getPerScriptSettingObject<{ tags: ProdTagItem[]; definitions: ProdDef[] }>("productionTags", parsedDoc.settings, scriptFileName, { tags: [], definitions: [] });
    if (!prodTags || !prodTags.tags) return null;

    const tag = prodTags.tags.find((t) => {
      if (!t.range) return false;
      const [start, len] = t.range;
      return cursor >= start && cursor <= start + len;
    });

    if (tag) {
      const def = prodTags.definitions?.find((d) => d.id === tag.definitionId);
      if (!def) return null;
      const catLabel = CATEGORIES.find(c => c.key === def.type)?.label || def.type;
      return { tag, def, catLabel };
    }
    return null;
  }, [contextMenu, parsedDoc.settings?.productionTags, view, selection, scriptFileName]);

  // Capture selection on right-click mousedown — this fires BEFORE CodeMirror's mousedown
  // handler, so the selection is still intact at this point.
  const handleMouseDown = (event: React.MouseEvent) => {
    if (event.button !== 2) return; // only care about right-click
    const v = viewRef.current;
    if (!v) { menuSelectionRef.current = null; return; }
    const sel = v.state.selection.main;
    menuSelectionRef.current = {
      from: sel.from,
      to: sel.to,
      text: sel.from !== sel.to ? v.state.sliceDoc(sel.from, sel.to) : "",
    };
  };

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    // menuSelectionRef was already set in handleMouseDown (before CodeMirror collapsed it).
    // Nothing to re-read here — just open the menu.
    setQuickTagMode(event.ctrlKey || event.metaKey);
    setContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY,
    });
  };

  const handleClose = () => {
    setContextMenu(null);
    setQuickTagMode(false);
    setSubMenuAnchorEl(null);
    setPromptMenuAnchorEl(null);
    setRephraseMenuAnchorEl(null);
    setFormatMenuAnchorEl(null);
    setHighlightMenuAnchorEl(null);
    setMarkerMenuAnchorEl(null);
    setTransformMenuAnchorEl(null);
    setTranslateMenuAnchorEl(null);
    setTranslatingLang(null);
    menuSelectionRef.current = null;
    // Restore editor focus after the menu is fully closed.
    setTimeout(() => viewRef.current?.focus(), 0);
  };

  const handleRemoveTag = () => {
    if (!existingTag || !view) return;
    const currentTags = view.state.field(tagStateField, false);
    if (!currentTags) return;
    
    const tags = (currentTags.tags || []).filter((t) => t !== existingTag.tag);
    view.dispatch({
      effects: updateTagsEffect.of({
        ...currentTags,
        tags
      })
    });
    handleClose();
  };

  const handleTagClick = (category: string) => {
    const snap = menuSelectionRef.current;
    if (!view || !snap) return;
    const from = snap.from;
    const to = snap.to;
    const text = snap.text.trim();
    if (!text) return;

    const currentTags = view.state.field(tagStateField, false);
    if (!currentTags) return;
    
    const tags = [...(currentTags.tags || [])];
    const definitions = [...(currentTags.definitions || [])];

    let def = definitions.find((d) => d.name.toLowerCase() === text.toLowerCase() && d.type === category);
    if (!def) {
      def = {
        id: "def-" + Math.random().toString(36).substring(2, 9),
        name: text,
        type: category,
        colorOverride: null
      };
      definitions.push(def);
    }

    const existingTagIdx = tags.findIndex((t) => t.range && t.range[0] === from && t.range[1] === (to - from));
    if (existingTagIdx !== -1) {
      tags[existingTagIdx] = {
        ...tags[existingTagIdx],
        type: category,
        definitionId: def.id
      };
    } else {
      tags.push({
        range: [from, to - from],
        type: category,
        definitionId: def.id,
        sceneId: ""
      });
    }

    view.dispatch({
      effects: updateTagsEffect.of({
        tags,
        definitions
      })
    });

    handleClose();
  };

  const toggleInlineMarker = (marker: string) => {
    if (!view) return;
    const snap = menuSelectionRef.current;
    toggleInlineMarkerShared(view, marker, snap || undefined);
    handleClose();
  };

  const handleParkSelection = () => {
    const snap = menuSelectionRef.current;
    if (!view || !snap) return;
    const { from, to, text } = snap;
    if (!text.trim()) return;

    parking.addItem(text);
    view.dispatch({
      changes: { from, to, insert: "" },
    });
    handleClose();
    view.focus();
  };

  const handleHighlightScene = (colorName: string) => {
    if (!view || !currentSceneLine) return;
    const { index } = currentSceneLine;
    const lineObj = view.state.doc.line(index + 1);
    const originalText = lineObj.text;
    const supportedColors = ["blue", "brown", "cyan", "green", "magenta", "orange", "pink", "purple", "red", "yellow"];
    let newText = originalText.replace(/\s*\[\[color\s+[#\w]+\]\]/gi, "");
    const colorRegex = new RegExp(`\\s*\\[\\[(${supportedColors.join("|")}|#[0-9a-fA-F]{6})\\]\\]`, "gi");
    newText = newText.replace(colorRegex, "");
    if (colorName !== "none") {
      newText = `${newText.trimEnd()} [[${colorName}]]`;
    }
    view.dispatch({
      changes: { from: lineObj.from, to: lineObj.to, insert: newText }
    });
    handleClose();
  };

  const handleDropMarkerWithColor = async (colorName: string) => {
    const snap = menuSelectionRef.current;
    if (!view) return;
    const from = snap?.from ?? view.state.selection.main.from;
    const to = snap?.to ?? view.state.selection.main.to;
    const defaultDesc = snap?.text ?? "";
    handleClose();
    const desc = await showPrompt({
      title: "Drop Marker",
      message: `Enter ${colorName} marker description:`,
      defaultValue: defaultDesc
    });
    if (desc !== null) {
      const markerText = colorName === "none" ? `[[marker: ${desc.trim()}]]` : `[[marker ${colorName}: ${desc.trim()}]]`;
      view.dispatch({
        changes: { from, to, insert: markerText },
        selection: { anchor: from + markerText.length }
      });
    }
  };

  const handleTransformCase = (mode: "upper" | "title" | "lower") => {
    const snap = menuSelectionRef.current;
    if (!view || !snap) return;
    const { from, to } = snap;
    let newText = snap.text;
    if (mode === "upper") {
      newText = snap.text.toUpperCase();
    } else if (mode === "lower") {
      newText = snap.text.toLowerCase();
    } else if (mode === "title") {
      newText = snap.text.replace(/\b\w+/g, (s) => s.charAt(0).toUpperCase() + s.substring(1).toLowerCase());
    }
    view.dispatch({
      changes: { from, to, insert: newText },
      selection: { anchor: from, head: from + newText.length }
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
    if (!view) return;
    const snap = menuSelectionRef.current;
    if (cmd === "paste") {
      try {
        const text = await readText();
        const sel = view.state.selection.main;
        view.dispatch({
          changes: { from: sel.from, to: sel.to, insert: text },
          selection: { anchor: sel.from + text.length }
        });
      } catch (e) {
        logger.error("editor", "clipboard read failed", e);
      }
    } else if (snap && snap.from !== snap.to && (cmd === "cut" || cmd === "copy")) {
      try {
        await writeText(snap.text);
        if (cmd === "cut") {
          view.dispatch({
            changes: { from: snap.from, to: snap.to, insert: "" },
            selection: { anchor: snap.from },
          });
        }
      } catch (e) {
        logger.error("editor", "clipboard write failed", e);
      }
    }
    view.focus();
    handleClose();
  };

  const performInlineRephrase = async (text: string, userPrompt: string) => {
    if (!view) return;
    const snap = menuSelectionRef.current || view.state.selection.main;
    if (!snap) return;

    const from = snap.from;
    const to = snap.to;
    const originalText = text;

    // Parse each line to extract prefixes/suffixes/indentation
    const lines = originalText.split(/\r?\n/);
    const lineData = lines.map(line => {
      let prefix = "";
      let suffix = "";
      let clean = line;

      // Preserve leading whitespace
      const indentMatch = clean.match(/^\s+/);
      let indent = "";
      if (indentMatch) {
        indent = indentMatch[0];
        clean = clean.slice(indent.length);
      }

      // Check and extract Fountain formatting prefixes
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
        // Strip "- " or "-"
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

    // Check if the selected text contains non-Latin scripts (e.g. Tamil, Hindi, Cyrillic)
    const containsNonLatin = /[^\u0000-\u007F\u0080-\u00FF\u0100-\u017F\u0180-\u024F\u2000-\u206F]/.test(cleanBody);

    // Extract surrounding context (up to 5 lines above and below)
    const doc = view.state.doc;
    const lineStart = doc.lineAt(from);
    const lineEnd = doc.lineAt(to);
    const startLineNum = Math.max(1, lineStart.number - 5);
    const endLineNum = Math.min(doc.lines, lineEnd.number + 5);

    const contextAbove = doc.sliceString(doc.line(startLineNum).from, lineStart.from);
    const contextBelow = doc.sliceString(lineEnd.to, doc.line(endLineNum).to);

    // If the selection is in a different language/script (non-Latin), DO NOT send English surrounding context,
    // as it triggers smaller local LLMs to translate the selection into English.
    const promptContext = containsNonLatin
      ? `>>> TEXT TO REPHRASE:\n${cleanBody}\n<<<`
      : [
          contextAbove ? `--- SCRIPT CONTEXT ABOVE ---\n${contextAbove}\n` : "",
          `>>> TEXT TO REPHRASE:\n${cleanBody}\n<<<`,
          contextBelow ? `\n--- SCRIPT CONTEXT BELOW ---\n${contextBelow}` : ""
        ].join("").trim();

    view.dispatch({
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

      let rephrased = await provider.chat(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: promptContext }
        ],
        { temperature: promptConfig.rephraseTemp }
      );
      if (!rephrased) rephrased = cleanBody;

      // Fail-safe: if original text was non-Latin and response is strictly Latin, the LLM translated it. Reject translation and keep original!
      const responseContainsNonLatin = /[^\u0000-\u007F\u0080-\u00FF\u0100-\u017F\u0180-\u024F\u2000-\u206F]/.test(rephrased);
      if (containsNonLatin && !responseContainsNonLatin) {
        rephrased = cleanBody;
      }

      // Reconstruct final output by re-applying indentation, prefixes, and suffixes line-by-line
      const resLines = rephrased.split(/\r?\n/);
      const finalLines = lineData.map((ld, i) => {
        const rephrasedLine = resLines[i] !== undefined ? resLines[i].trim() : ld.clean;
        return ld.indent + ld.prefix + rephrasedLine + ld.suffix;
      });
      const finalRephrased = finalLines.join("\n").replace(/—/g, "--");

      view.dispatch({
        changes: { from, to, insert: finalRephrased },
        effects: setRephraseRangeEffect.of(null),
        selection: { anchor: from + finalRephrased.length }
      });
    } catch (err) {
      view.dispatch({
        effects: setRephraseRangeEffect.of(null)
      });
      logger.error("editor", "Inline rephrase failed", err);
    }
  };

  const handlePromptAction = async (action: "lookup" | "synonyms" | "rephrase") => {
    setPromptMenuAnchorEl(null);
    const text = menuSelectionRef.current?.text ?? selectedText;
    handleClose();
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

  const handleRephraseClick = async (userPrompt: string) => {
    setRephraseMenuAnchorEl(null);
    setPromptMenuAnchorEl(null);
    const text = menuSelectionRef.current?.text ?? selectedText;
    handleClose();
    if (!text || !text.trim()) return;

    await performInlineRephrase(text, userPrompt);
  };

  const handleTranslateClick = async (lang: string) => {
    setTranslateMenuAnchorEl(null);
    setPromptMenuAnchorEl(null);
    setTranslatingLang(lang);
    setAiStatus(`Translating to ${lang}...`);
    const text = menuSelectionRef.current?.text ?? selectedText;
    handleClose();
    if (!text || !text.trim()) {
      setAiStatus(null);
      setTranslatingLang(null);
      return;
    }

    try {
      if (!view) return;
      const snap = menuSelectionRef.current || view.state.selection.main;
      if (!snap) return;

      const from = snap.from;
      const to = snap.to;

      view.dispatch({
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
        promptConfig.translatePrompt || "You are a professional translation tool. Translate the user's text to the specified language.",
        "",
        "STRICT NON-TRANSLATION RULES (DO NOT TRANSLATE THESE):",
        "1. DO NOT translate Title Page lines (e.g. Title:, Author:, Authors:, Credit:, Source:, Contact:, Draft date:, Copyright:). Keep the entire Title Page exactly as it appears in the original.",
        "2. DO NOT translate Scene Headings (e.g. INT. COFFEE SHOP - DAY, EXT. PARK - NIGHT, or lines starting with INT., EXT., EST., I/E., or forced with '.'). Keep scene headings in original English/text.",
        "3. DO NOT translate Transitions (e.g. CUT TO:, FADE IN:, DISSOLVE TO:, SMASH CUT TO:, or lines starting with '>'). Keep transitions in original English.",
        "4. DO NOT translate Character Names (character lines in ALL CAPS above dialogue). Keep character names in original ALL CAPS as written.",
        "",
        "WHAT TO TRANSLATE:",
        `5. Translate ONLY Action descriptions, Dialogue text, Parentheticals, and Synopsis text into ${langInfo}.`,
        `   The output MUST be written in ${ld.native} script (${ld.code}).`,
        ld.example ? `   Example of this language: "${ld.example}"` : "",
        `   NEVER output text in Tamil, Hindi, or any other Indian language unless ${ld.code} explicitly requires it.`,
        "",
        "FORMATTING INSTRUCTIONS:",
        "6. Do not add explanations, intro text, quotes, or conversational filler.",
        "7. Preserve the EXACT same number of lines as the input. Do not merge, split, or skip any lines.",
        "8. Do NOT introduce new line breaks, extra blank lines, or structural divisions that were not present in the original text.",
        "9. Do NOT add or remove punctuation other than what naturally occurs in the target language.",
        isSingleLine
          ? "10. Respond with the translated text on a SINGLE line. Do NOT add newlines, line breaks, or carriage returns."
          : "10. Respond with the translated text preserving the exact line-by-line structure of the input.",
        "",
        "Follow these strict Fountain syntax rules:",
        FOUNTAIN_SYNTAX_RULES
      ].join("\n");
      const provider = createAIProvider(promptConfig);
      if (!provider) throw new Error("No AI provider configured");

      let translated = await provider.chat(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: cleanBody }
        ],
        { temperature: promptConfig.translateTemp }
      );
      if (!translated) translated = cleanBody;

      const resLines = translated.split(/\r?\n/);
      const finalLines = lineData.map((ld, i) => {
        const translatedLine = resLines[i] !== undefined ? resLines[i].trim() : ld.clean;
        return ld.indent + ld.prefix + translatedLine + ld.suffix;
      });
      const finalText = finalLines.join("\n");

      view.dispatch({
        changes: { from, to, insert: finalText },
        effects: setRephraseRangeEffect.of(null),
        selection: { anchor: from + finalText.length }
      });
      setAiStatus(null);
    } catch (err: any) {
      const msg = err?.message || String(err);
      logger.error("editor", "Inline translate failed", err);
      setAiStatus(`AI Error: ${msg.slice(0, 50)}`);
      setTimeout(() => setAiStatus(null), 7000);
      view?.dispatch({ effects: setRephraseRangeEffect.of(null) });
    } finally {
      setTranslatingLang(null);
    }
    view?.focus();
  };

interface LineAnalysis {
  original: string;
  indent: string;
  prefix: string;
  suffix: string;
  cleanText: string;
  isTranslatable: boolean;
}

function analyzeFountainLineWithAST(line: string, parsedLine: any): LineAnalysis {
  let clean = line;
  const indentMatch = clean.match(/^\s+/);
  let indent = "";
  if (indentMatch) {
    indent = indentMatch[0];
    clean = clean.slice(indent.length);
  }

  const trimmed = clean.trim();
  if (!trimmed) {
    return { original: line, indent, prefix: "", suffix: "", cleanText: "", isTranslatable: false };
  }

  const type = parsedLine?.type;

  // 1. Force explicit Fountain syntax for structural non-translatable lines (Character, Scene Heading, Transition):
  if (type === LineType.character || type === LineType.dualDialogueCharacter) {
    // Force '@' prefix so non-Latin character names (Tamil, Hindi, etc. without uppercase) NEVER crash into Action!
    let charName = trimmed;
    if (!charName.startsWith("@")) {
      charName = "@" + charName;
    }
    return { original: indent + charName, indent, prefix: "", suffix: "", cleanText: charName, isTranslatable: false };
  }

  if (type === LineType.heading) {
    // Force '.' prefix so scene headings always remain explicit
    let headingText = trimmed;
    if (!headingText.startsWith(".")) {
      headingText = "." + headingText;
    }
    return { original: indent + headingText, indent, prefix: "", suffix: "", cleanText: headingText, isTranslatable: false };
  }

  if (type === LineType.transitionLine) {
    // Force '>' prefix for transitions
    let transText = trimmed;
    if (!transText.startsWith(">")) {
      transText = "> " + transText;
    }
    return { original: indent + transText, indent, prefix: "", suffix: "", cleanText: transText, isTranslatable: false };
  }

  const isOtherNonTranslatable = (
    type === LineType.empty ||
    type === LineType.section ||
    type === LineType.pageBreak ||
    type === LineType.more ||
    type === LineType.dualDialogueMore ||
    (type !== undefined && type >= LineType.titlePageTitle && type <= LineType.titlePageUnknown)
  );

  if (isOtherNonTranslatable) {
    return { original: line, indent, prefix: "", suffix: "", cleanText: trimmed, isTranslatable: false };
  }

  // 2. Force explicit Fountain syntax for translatable lines (Synopsis, Shots, Centered, Parentheticals):
  let prefix = "";
  let suffix = "";

  if (type === LineType.action) {
    prefix = "!";
    if (clean.startsWith("!")) clean = clean.slice(1);
  } else if (type === LineType.synopse) {
    prefix = "=";
    if (clean.startsWith("=")) clean = clean.slice(1);
  } else if (type === LineType.shot) {
    prefix = "!!";
    if (clean.startsWith("!!")) clean = clean.slice(2);
  } else if (type === LineType.centered) {
    prefix = ">";
    suffix = "<";
    if (clean.startsWith(">")) clean = clean.slice(1);
    if (clean.endsWith("<")) clean = clean.slice(0, -1);
  } else if (type === LineType.parenthetical || type === LineType.dualDialogueParenthetical) {
    prefix = "(";
    suffix = ")";
    if (clean.startsWith("(")) clean = clean.slice(1);
    if (clean.endsWith(")")) clean = clean.slice(0, -1);
  } else {
    // Bullet points, comments, or general action/dialogue syntax
    if (clean.startsWith("- ")) {
      prefix = "- ";
      clean = clean.slice(2);
    } else if (clean.startsWith("-")) {
      prefix = "-";
      clean = clean.slice(1);
    } else if (clean.startsWith("[[") && clean.endsWith("]]")) {
      prefix = "[[";
      suffix = "]]";
      clean = clean.slice(2, -2);
    }
  }

  return {
    original: line,
    indent,
    prefix,
    suffix,
    cleanText: clean.trim(),
    isTranslatable: true,
  };
}

  const handleTranslateWholeDocument = async (lang: string) => {
    handleClose();
    if (!parsedDoc) return;
    
    setAiStatus(`Preparing translation to ${lang}...`);

    const rawText = parsedDoc.screenplayText || "";
    const lines = rawText.split(/\r?\n/);
    const parsedLines = parsedDoc.lines || [];
    
    // Analyze all lines using AST API LineTypes
    const analyzedLines = lines.map((line, i) => {
      return analyzeFountainLineWithAST(line, parsedLines[i]);
    });

    const provider = createAIProvider(promptConfig);
    if (!provider) {
       setAiStatus("Error: AI provider is not configured.");
       setTimeout(() => setAiStatus(null), 5000);
       return;
    }

    setTranslatingLang(lang);

    try {
      const targetFileId = activeFileId;
      const duplicatedName = await duplicateScript(activeScriptIndex);
      if (!duplicatedName) throw new Error("Failed to duplicate script");
      
      const targetScriptIndex = activeScriptIndex + 1;

      // Build initial document with non-translatable lines in place
      const currentDocLines = analyzedLines.map(item => {
        if (!item.isTranslatable) return item.original;
        return item.indent + item.prefix + item.cleanText + item.suffix;
      });
      
      updateFileScriptContent(targetFileId, targetScriptIndex, currentDocLines.join("\n"));

      // Collect all indices of translatable lines
      const translatableIndices: number[] = [];
      analyzedLines.forEach((item, idx) => {
        if (item.isTranslatable && item.cleanText.trim()) {
          translatableIndices.push(idx);
        }
      });

      const BATCH_SIZE = 20; // translate 20 lines per API call
      const totalBatches = Math.ceil(translatableIndices.length / BATCH_SIZE) || 1;

      const ld = getLanguageDetails(lang);
      const langInfo = `"${lang}" (language code: ${ld.code}, native name: ${ld.native})`;

      const systemPrompt = [
        `You are a professional translation tool. Translate the user's text lines to ${langInfo}.`,
        `The output MUST be written in ${ld.native} script (${ld.code}).`,
        ld.example ? `Example of this language: "${ld.example}"` : "",
        `NEVER output text in Tamil, Hindi, or any other Indian language unless ${ld.code} explicitly requires it.`,
        "",
        "CRITICAL INSTRUCTIONS:",
        `1. Translate each input line into ${langInfo}.`,
        "2. You MUST return EXACTLY the same number of lines as provided in the input.",
        "3. Do NOT combine multiple lines into a paragraph. Do NOT omit any lines.",
        "4. Respond ONLY with the translated lines, one per line. Do not add conversational text, line numbers, or explanations."
      ].join("\n");

      for (let b = 0; b < totalBatches; b++) {
        // Pause loop
        while ((translationStateRef.current as string) === "paused") {
          setAiStatus(`Translation Paused (Part ${b + 1}/${totalBatches})`);
          await new Promise((resolve) => setTimeout(resolve, 300));
        }

        // Cancel check
        if ((translationStateRef.current as string) === "cancelled") {
          setAiStatus("Translation Cancelled.");
          setTimeout(() => setAiStatus(null), 3000);
          break;
        }

        setAiStatus(`Translating part ${b + 1}/${totalBatches} to ${lang}...`);
        
        const batchIndices = translatableIndices.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
        if (batchIndices.length === 0) continue;

        const batchInputs = batchIndices.map(idx => analyzedLines[idx].cleanText);
        const userPrompt = batchInputs.join("\n");

        let translatedBatchText = "";

        await provider.chat([{ role: "user", content: userPrompt }], {
          system: systemPrompt,
          temperature: promptConfig.translateTemp,
          onChunk: (delta) => {
            translatedBatchText += delta;
          }
        });

        if ((translationStateRef.current as string) === "cancelled") {
          setAiStatus("Translation Cancelled.");
          setTimeout(() => setAiStatus(null), 3000);
          break;
        }

        // Sync batch update to target document/script
        const resLines = translatedBatchText.split(/\r?\n/);
        batchIndices.forEach((lineIdx, i) => {
          const item = analyzedLines[lineIdx];
          const translatedText = resLines[i] !== undefined && resLines[i].trim() ? resLines[i].trim() : item.cleanText;
          currentDocLines[lineIdx] = item.indent + item.prefix + translatedText + item.suffix;
        });
        updateFileScriptContent(targetFileId, targetScriptIndex, currentDocLines.join("\n"));
      }

      if ((translationStateRef.current as string) !== "cancelled") {
        setAiStatus("Translation Completed!");
        setTimeout(() => setAiStatus(null), 4000);
      }
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      logger.error("editor", "Whole document translation failed", err);
      setAiStatus(`AI Error: ${errMsg.slice(0, 60)}`);
      setTimeout(() => setAiStatus(null), 8000);
    } finally {
      setTranslatingLang(null);
      setTranslationState("idle");
    }
  };

  const menuProps = {
    disableScrollLock: true,
    disableAutoFocus: true,
    disableRestoreFocus: true,
    transitionDuration: 0,
    MenuListProps: {
      autoFocusItem: false,
      dense: true,
    },
    slotProps: {
      backdrop: {
        sx: { backdropFilter: "none", WebkitBackdropFilter: "none" },
        onClick: handleClose
      },
      paper: {
        sx: (theme: Theme) => ({
          borderRadius: 0,
          boxShadow: `0px 4px 16px ${alpha(theme.palette.common.black, 0.15)}`,
          border: "1px solid",
          borderColor: "divider",
          minWidth: 180,
          py: 0.25,
        })
      }
    }
  };

  return (
    <div 
      className={`editor-font-wrapper ${fontFamily}`} 
      style={{ display: "flex", flex: 1, minHeight: "100%", flexDirection: "column" }}
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenu}
    >
      <div ref={containerRef} style={{ flex: 1, minHeight: "100%", cursor: "text" }} onClick={() => viewRef.current?.focus()} />
      
      <Menu
        open={contextMenu !== null}
        onClose={handleClose}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
        {...menuProps}
      >
        {quickTagMode ? (
          <>
            {menuHasSelection && (
              <Box sx={{ px: 2, py: 1, borderBottom: "1px solid", borderColor: "divider", mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: "block" }}>
                  QUICK TAG
                </Typography>
              </Box>
            )}
            {CATEGORIES.map((cat) => (
              <MenuItem key={cat.key} onClick={() => handleTagClick(cat.key)} disabled={!menuHasSelection}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: cat.color,
                    mr: 1.5,
                    flexShrink: 0
                  }}
                />
                <ListItemText primary={cat.label} />
              </MenuItem>
            ))}
            {existingTag && (
              <MenuItem onClick={handleRemoveTag}>
                <ListItemIcon>
                  <DeleteIcon fontSize="small" color="error" />
                </ListItemIcon>
                <ListItemText primary="Remove Tag" secondary={existingTag.def?.name || "unnamed"} />
              </MenuItem>
            )}
          </>
        ) : (
          <>
        {menuHasSelection && (
          <Box sx={{ px: 2, py: 1, borderBottom: "1px solid", borderColor: "divider", mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: "block" }}>
              SELECTION STATS
            </Typography>
            <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
              {wordCount} {wordCount === 1 ? "word" : "words"} • {charCount} {charCount === 1 ? "char" : "chars"}
            </Typography>
          </Box>
        )}

        <MenuItem 
          onClick={(e) => setPromptMenuAnchorEl(e.currentTarget)}
        >
          <ListItemIcon>
            <AutoAwesomeIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Muse" />
          <ChevronRightIcon fontSize="small" sx={{ ml: "auto", opacity: 0.5 }} />
        </MenuItem>

        <MenuItem disabled={!menuHasSelection} onClick={() => handleEditorAction("cut")}>
          <ListItemIcon>
            <ContentCutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Cut" />
        </MenuItem>
        
        <MenuItem disabled={!menuHasSelection} onClick={() => handleEditorAction("copy")}>
          <ListItemIcon>
            <ContentCopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Copy" />
        </MenuItem>
        
        <MenuItem onClick={() => handleEditorAction("paste")}>
          <ListItemIcon>
            <AssignmentIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Paste" />
        </MenuItem>

        <Divider />

        <MenuItem
          disabled={!menuHasSelection}
          onClick={(e) => {
            setSubMenuAnchorEl(e.currentTarget);
            setFormatMenuAnchorEl(null);
            setHighlightMenuAnchorEl(null);
            setMarkerMenuAnchorEl(null);
            setTransformMenuAnchorEl(null);
          }}
          sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <ListItemIcon>
              <LocalOfferIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Tag" />
          </Box>
          <ChevronRightIcon fontSize="small" sx={{ opacity: 0.5 }} />
        </MenuItem>

        {existingTag && (
          <MenuItem onClick={handleRemoveTag}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText 
              primary="Remove Tag" 
              secondary={existingTag.def?.name || "unnamed"}
            />
          </MenuItem>
        )}

        <MenuItem
          disabled={!currentSceneLine}
          onClick={(e) => {
            setHighlightMenuAnchorEl(e.currentTarget);
            setSubMenuAnchorEl(null);
            setFormatMenuAnchorEl(null);
            setMarkerMenuAnchorEl(null);
            setTransformMenuAnchorEl(null);
          }}
          sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <ListItemIcon>
              <ColorLensIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Highlight Scene" />
          </Box>
          <ChevronRightIcon fontSize="small" sx={{ opacity: 0.5 }} />
        </MenuItem>

        <MenuItem
          onClick={(e) => {
            setMarkerMenuAnchorEl(e.currentTarget);
            setSubMenuAnchorEl(null);
            setFormatMenuAnchorEl(null);
            setHighlightMenuAnchorEl(null);
            setTransformMenuAnchorEl(null);
          }}
          sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <ListItemIcon>
              <BookmarkIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Drop Marker" />
          </Box>
          <ChevronRightIcon fontSize="small" sx={{ opacity: 0.5 }} />
        </MenuItem>

        <Divider />

        <MenuItem
          disabled={!menuHasSelection}
          onClick={(e) => {
            setFormatMenuAnchorEl(e.currentTarget);
            setSubMenuAnchorEl(null);
            setHighlightMenuAnchorEl(null);
            setMarkerMenuAnchorEl(null);
            setTransformMenuAnchorEl(null);
          }}
          sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <ListItemIcon>
              <FormatBoldIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Format" />
          </Box>
          <ChevronRightIcon fontSize="small" sx={{ opacity: 0.5 }} />
        </MenuItem>

        <MenuItem
          disabled={!menuHasSelection}
          onClick={(e) => {
            setTransformMenuAnchorEl(e.currentTarget);
            setSubMenuAnchorEl(null);
            setFormatMenuAnchorEl(null);
            setHighlightMenuAnchorEl(null);
            setMarkerMenuAnchorEl(null);
          }}
          sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <ListItemIcon>
              <TextFieldsIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Transform Case" />
          </Box>
          <ChevronRightIcon fontSize="small" sx={{ opacity: 0.5 }} />
        </MenuItem>

        <MenuItem
          disabled={!menuHasSelection}
          onClick={handleLookUpSelection}
        >
          <ListItemIcon>
            <GoogleLogoIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Look Up Word" />
        </MenuItem>

        <Divider />

        <MenuItem
          disabled={!menuHasSelection}
          onClick={handleCreateTaskFromSelection}
        >
          <ListItemIcon>
            <TaskAltIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Create Task" />
        </MenuItem>

        <MenuItem
          disabled={!menuHasSelection}
          onClick={handleParkSelection}
        >
          <ListItemIcon>
            <ArchiveIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Park Selection" />
        </MenuItem>
        </>
        )}
      </Menu>

      <Menu
        open={promptMenuAnchorEl !== null}
        anchorEl={promptMenuAnchorEl}
        onClose={() => setPromptMenuAnchorEl(null)}
        anchorOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        {...menuProps}
      >
        {menuHasSelection ? (
          <>
            <MenuItem onClick={() => handlePromptAction("lookup")}>
              <ListItemText primary="Look up" />
            </MenuItem>
            <MenuItem onClick={() => handlePromptAction("synonyms")}>
              <ListItemText primary="Synonyms" />
            </MenuItem>
            <MenuItem
              onClick={(e) => {
                setRephraseMenuAnchorEl(e.currentTarget);
              }}
              sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <ListItemText primary="Rephrase" />
              <ChevronRightIcon fontSize="small" sx={{ ml: 1, opacity: 0.5 }} />
            </MenuItem>
            <MenuItem
              onClick={(e) => {
                setTranslateMenuAnchorEl(e.currentTarget);
              }}
              sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <ListItemText primary="Translate" />
              <ChevronRightIcon fontSize="small" sx={{ ml: 1, opacity: 0.5 }} />
            </MenuItem>
          </>
        ) : (
          <MenuItem
            onClick={(e) => {
              setTranslateMenuAnchorEl(e.currentTarget);
            }}
            sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
          >
            <ListItemText primary="Translate Whole Script" />
            <ChevronRightIcon fontSize="small" sx={{ ml: 1, opacity: 0.5 }} />
          </MenuItem>
        )}
      </Menu>

      <Menu
        open={rephraseMenuAnchorEl !== null}
        anchorEl={rephraseMenuAnchorEl}
        onClose={() => setRephraseMenuAnchorEl(null)}
        anchorOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        {...menuProps}
      >
        {promptConfig.rephrasePresets.map((preset) => (
          <MenuItem
            key={preset.name}
            onClick={() => handleRephraseClick(preset.prompt)}
            disabled={!preset.prompt.trim()}
          >
            <ListItemText primary={preset.name || "Untitled"} />
          </MenuItem>
        ))}
      </Menu>

      <Menu
        open={translateMenuAnchorEl !== null}
        anchorEl={translateMenuAnchorEl}
        onClose={() => setTranslateMenuAnchorEl(null)}
        anchorOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        {...menuProps}
      >
        {promptConfig.translateLanguages.map(lang => (
          <MenuItem 
            key={lang} 
            onClick={() => {
              if (menuHasSelection) {
                handleTranslateClick(lang);
              } else {
                handleTranslateWholeDocument(lang);
              }
            }} 
            disabled={translatingLang === lang}
          >
            <ListItemText primary={translatingLang === lang ? `Translating to ${lang}...` : lang} />
          </MenuItem>
        ))}
      </Menu>

      <Menu
        open={subMenuAnchorEl !== null}
        anchorEl={subMenuAnchorEl}
        onClose={() => setSubMenuAnchorEl(null)}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        {...menuProps}
      >
        {CATEGORIES.map((cat) => (
          <MenuItem key={cat.key} onClick={() => handleTagClick(cat.key)}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: cat.color,
                mr: 1.5,
                flexShrink: 0
              }}
            />
            <ListItemText primary={cat.label} />
          </MenuItem>
        ))}
      </Menu>

      <Menu
        open={highlightMenuAnchorEl !== null}
        anchorEl={highlightMenuAnchorEl}
        onClose={() => setHighlightMenuAnchorEl(null)}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        {...menuProps}
      >
        {HIGHLIGHT_COLORS.map((col) => (
          <MenuItem key={col.key} onClick={() => handleHighlightScene(col.key)}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: col.color,
                mr: 1.5,
                flexShrink: 0
              }}
            />
            <ListItemText primary={col.label} />
          </MenuItem>
        ))}
      </Menu>

      <Menu
        open={markerMenuAnchorEl !== null}
        anchorEl={markerMenuAnchorEl}
        onClose={() => setMarkerMenuAnchorEl(null)}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        {...menuProps}
      >
        {MARKER_COLORS.map((col) => (
          <MenuItem key={col.key} onClick={() => handleDropMarkerWithColor(col.key)}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: col.color,
                mr: 1.5,
                flexShrink: 0
              }}
            />
            <ListItemText primary={col.label} />
          </MenuItem>
        ))}
      </Menu>

      <Menu
        open={formatMenuAnchorEl !== null}
        anchorEl={formatMenuAnchorEl}
        onClose={() => setFormatMenuAnchorEl(null)}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        {...menuProps}
      >
        <MenuItem disabled={!menuHasSelection} onClick={() => toggleInlineMarker("**")}>
          <ListItemIcon>
            <FormatBoldIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Bold" />
        </MenuItem>
        <MenuItem disabled={!menuHasSelection} onClick={() => toggleInlineMarker("*")}>
          <ListItemIcon>
            <FormatItalicIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Italic" />
        </MenuItem>
        <MenuItem disabled={!menuHasSelection} onClick={() => toggleInlineMarker("_")}>
          <ListItemIcon>
            <FormatUnderlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Underline" />
        </MenuItem>
      </Menu>

      <Menu
        open={transformMenuAnchorEl !== null}
        anchorEl={transformMenuAnchorEl}
        onClose={() => setTransformMenuAnchorEl(null)}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        {...menuProps}
      >
        <MenuItem disabled={!menuHasSelection} onClick={() => handleTransformCase("upper")}>
          <ListItemText primary="UPPERCASE" />
        </MenuItem>
        <MenuItem disabled={!menuHasSelection} onClick={() => handleTransformCase("title")}>
          <ListItemText primary="Title Case" />
        </MenuItem>
        <MenuItem disabled={!menuHasSelection} onClick={() => handleTransformCase("lower")}>
          <ListItemText primary="lowercase" />
        </MenuItem>
      </Menu>
    </div>
  );
});
