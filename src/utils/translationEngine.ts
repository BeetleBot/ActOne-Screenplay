import { PromptConfig } from "../hooks/usePromptConfig";
import { getLanguageDetails } from "../constants/languages";
import { createAIProvider, RateLimitError } from "../lib/aiProviders";
import { extractThinkingAndClean } from "../hooks/useAIChat";
import { FountainDocument, LineType } from "../parser";

export interface AnalyzedLine {
  original: string;
  indent: string;
  prefix: string;
  suffix: string;
  cleanText: string;
  isTranslatable: boolean;
}

export interface SceneChunk {
  heading: string;
  sceneIndex: number;
  startLine: number;
  endLine: number;
  partNumber?: number;
  totalParts?: number;
  lineIndices: number[];
}

export interface TranslationJobParams {
  lang: string;
  promptConfig: PromptConfig;
  sourceScriptName: string;
  duplicatedName: string;
  targetFileId: string;
  targetScriptIndex: number;
  lines: string[];
  analyzedLines: AnalyzedLine[];
  parsedDoc: FountainDocument | null;
  preserveCharacterNames?: boolean;
  dynamicToneInstructions?: string;
  customInstruction?: string;
  retrySceneIndices?: number[];
  updateFileScriptContent: (fileId: string, scriptIndex: number, newContent: string) => void;
  uiActions: {
    setAiStatus: (status: string | null) => void;
    setTranslationState: (state: "idle" | "running" | "paused" | "cancelled") => void;
    setTranslatingTarget: (target: { fileId: string; scriptIndex: number } | null) => void;
    setTranslationJob: (fn: (prev: any) => any) => void;
    setIsTranslationModalOpen: (open: boolean) => void;
    registerTranslationAbort: (controller: AbortController | null) => void;
    getTranslationState: () => string;
  };
}

export function analyzeFountainLine(line: string, parsedLine: any): AnalyzedLine {
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

  if (type === LineType.character || type === LineType.dualDialogueCharacter) {
    let charName = trimmed;
    if (!charName.startsWith("@")) {
      charName = "@" + charName;
    }
    return { original: indent + charName, indent, prefix: "", suffix: "", cleanText: charName, isTranslatable: false };
  }

  if (type === LineType.heading) {
    let headingText = trimmed;
    if (!headingText.startsWith(".")) {
      headingText = "." + headingText;
    }
    return { original: indent + headingText, indent, prefix: "", suffix: "", cleanText: headingText, isTranslatable: false };
  }

  if (type === LineType.transitionLine) {
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

/**
 * Strips isolated foreign language glyphs (e.g. CJK/Japanese/Chinese, or neighboring Indic scripts like Telugu/Kannada)
 * when translating into a specific target language, preventing cross-lingual tokenizer bleeding.
 */
export function sanitizeForeignGlyphs(text: string, targetLang: string): string {
  if (!text) return text;
  const langLower = targetLang.toLowerCase();

  // If target is Tamil, strip foreign non-Tamil scripts that small models accidentally bleed into:
  // - CJK Ideographs & Japanese Hiragana/Katakana (\u3040-\u30ff, \u3400-\u4dbf, \u4e00-\u9fff, \uf900-\ufaff)
  // - Telugu (\u0C00-\u0C7F)
  // - Kannada (\u0C80-\u0CFF)
  // - Malayalam (\u0D00-\u0D7F)
  if (langLower.includes("tamil")) {
    return text
      .replace(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g, "")
      .replace(/[\u0C00-\u0D7F]/gu, "");
  }

  // If target is Telugu, strip CJK and other non-Telugu scripts
  if (langLower.includes("telugu")) {
    return text
      .replace(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g, "")
      .replace(/[\u0B80-\u0BFF\u0C80-\u0D7F]/gu, "");
  }

  // If target is not Chinese/Japanese/Korean, strip accidental CJK characters
  if (!langLower.includes("chinese") && !langLower.includes("japanese") && !langLower.includes("korean")) {
    return text.replace(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g, "");
  }

  return text;
}

/**
 * Returns an informative context label (e.g. [JOHN], [Action], [Parenthetical])
 * so the AI model understands speaker attribution and tone requirements.
 */
export function getLineContextLabel(lineIdx: number, parsedLines: any[]): string {
  const parsed = parsedLines[lineIdx];
  const type = parsed?.type;

  if (type === LineType.dialogue || type === LineType.dualDialogue) {
    let speaker = "Dialogue";
    for (let b = lineIdx - 1; b >= Math.max(0, lineIdx - 6); b--) {
      const p = parsedLines[b];
      if (p?.type === LineType.character || p?.type === LineType.dualDialogueCharacter) {
        const cleanChar = p.text?.replace(/\([^)]*\)/g, "").replace(/[@^]/g, "").trim();
        if (cleanChar) {
          speaker = cleanChar;
          break;
        }
      }
    }
    return `[Dialogue: ${speaker}]`;
  }

  if (type === LineType.parenthetical || type === LineType.dualDialogueParenthetical) {
    return "[Parenthetical]";
  }

  if (type === LineType.action || type === LineType.centered || type === LineType.synopse) {
    return "[Action]";
  }

  if (type === LineType.heading) {
    return "[Scene Heading]";
  }

  if (type === LineType.transitionLine) {
    return "[Transition]";
  }

  if (type === LineType.shot) {
    return "[Shot]";
  }

  return "[Action]";
}

const SCENE_CHUNK_MAX_LINES = 35;

/**
 * Split analyzed lines into scene-based chunks.
 * Each chunk represents one scene (heading to next heading).
 * Long scenes (> SCENE_CHUNK_MAX_LINES translatable lines) are split
 * at character-change boundaries into numbered parts.
 */
export function segmentIntoScenes(
  analyzedLines: AnalyzedLine[],
  parsedLines: any[],
): SceneChunk[] {
  // Find scene boundaries (heading lines)
  const sceneBoundaries: { heading: string; startLine: number }[] = [];
  const hasAnyHeadings = parsedLines.some((p) => p?.type === LineType.heading);
  let foundFirstScene = false;

  for (let i = 0; i < parsedLines.length; i++) {
    const type = parsedLines[i]?.type;
    // Skip title page lines
    if (type !== undefined && type >= LineType.titlePageTitle && type <= LineType.titlePageUnknown) {
      continue;
    }
    if (type === LineType.heading) {
      foundFirstScene = true;
      sceneBoundaries.push({
        heading: analyzedLines[i]?.cleanText || parsedLines[i]?.text || `Scene ${sceneBoundaries.length + 1}`,
        startLine: i,
      });
    } else if (hasAnyHeadings && !foundFirstScene && analyzedLines[i]?.isTranslatable && analyzedLines[i]?.cleanText.trim()) {
      // Lines before first heading form a "preamble" scene
      foundFirstScene = true;
      sceneBoundaries.push({
        heading: "Preamble",
        startLine: i,
      });
    }
  }

  if (sceneBoundaries.length === 0) {
    // No scenes found — treat the whole document as one chunk
    const allIndices = analyzedLines
      .map((_, i) => i)
      .filter((i) => analyzedLines[i].isTranslatable && analyzedLines[i].cleanText.trim());
    if (allIndices.length === 0) return [];
    return [{ heading: "Document", sceneIndex: 0, startLine: 0, endLine: analyzedLines.length - 1, lineIndices: allIndices }];
  }

  // Build raw scenes
  const rawScenes: { heading: string; startLine: number; endLine: number; lineIndices: number[] }[] = [];
  for (let s = 0; s < sceneBoundaries.length; s++) {
    const start = sceneBoundaries[s].startLine;
    const end = s + 1 < sceneBoundaries.length ? sceneBoundaries[s + 1].startLine - 1 : analyzedLines.length - 1;
    const indices: number[] = [];
    for (let i = start; i <= end; i++) {
      if (analyzedLines[i].isTranslatable && analyzedLines[i].cleanText.trim()) {
        indices.push(i);
      }
    }
    if (indices.length > 0) {
      rawScenes.push({ heading: sceneBoundaries[s].heading, startLine: start, endLine: end, lineIndices: indices });
    }
  }

  // Apply adaptive chunking to long scenes
  const chunks: SceneChunk[] = [];
  let sceneIdx = 0;
  for (const scene of rawScenes) {
    if (scene.lineIndices.length <= SCENE_CHUNK_MAX_LINES) {
      chunks.push({
        heading: scene.heading,
        sceneIndex: sceneIdx,
        startLine: scene.startLine,
        endLine: scene.endLine,
        lineIndices: scene.lineIndices,
      });
    } else {
      // Split at character-change boundaries
      const parts = splitSceneIntoParts(scene.lineIndices, parsedLines);
      for (let p = 0; p < parts.length; p++) {
        chunks.push({
          heading: scene.heading,
          sceneIndex: sceneIdx,
          startLine: scene.startLine,
          endLine: scene.endLine,
          partNumber: p + 1,
          totalParts: parts.length,
          lineIndices: parts[p],
        });
      }
    }
    sceneIdx++;
  }

  return chunks;
}

/**
 * Split a long scene's translatable line indices into parts of ~SCENE_CHUNK_MAX_LINES,
 * breaking at character-name boundaries when possible.
 */
function splitSceneIntoParts(lineIndices: number[], parsedLines: any[]): number[][] {
  const parts: number[][] = [];
  let currentPart: number[] = [];

  for (let i = 0; i < lineIndices.length; i++) {
    currentPart.push(lineIndices[i]);

    if (currentPart.length >= SCENE_CHUNK_MAX_LINES && i < lineIndices.length - 1) {
      // Look for a character line nearby as a split point
      let splitFound = false;
      for (let look = i + 1; look < Math.min(i + 10, lineIndices.length); look++) {
        const idx = lineIndices[look];
        // Check if there's a character line right before this translatable line
        for (let back = idx - 1; back >= Math.max(0, idx - 3); back--) {
          const type = parsedLines[back]?.type;
          if (type === LineType.character || type === LineType.dualDialogueCharacter) {
            // Split here — current part ends at i, next part starts at look
            // But include lines i+1..look-1 in current part
            for (let fill = i + 1; fill < look; fill++) {
              currentPart.push(lineIndices[fill]);
            }
            parts.push(currentPart);
            currentPart = [];
            i = look - 1; // Will be incremented by the for loop
            splitFound = true;
            break;
          }
        }
        if (splitFound) break;
      }
      if (!splitFound && currentPart.length >= SCENE_CHUNK_MAX_LINES + 10) {
        // Hard split if no character boundary found within 10 lines
        parts.push(currentPart);
        currentPart = [];
      }
    }
  }

  if (currentPart.length > 0) {
    parts.push(currentPart);
  }

  return parts.length > 0 ? parts : [lineIndices];
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isAbortError(error: any, controller: AbortController): boolean {
  // Always check the signal first — this is the definitive user-initiated abort
  if (controller.signal.aborted) return true;
  if (!error) return false;
  if (error.name === "AbortError") return true;
  // Only match "abort" — NOT "cancel" which Tauri uses for network drops
  const msg = typeof error === "string" ? error : error.message || String(error);
  return /\babort(ed)?\b/i.test(msg);
}

/**
 * Run a pre-flight check to verify the AI provider is reachable.
 */
async function preFlightCheck(
  params: TranslationJobParams,
): Promise<{ ok: boolean; error?: string }> {
  const provider = createAIProvider(params.promptConfig);
  if (!provider) return { ok: false, error: "AI provider is not configured." };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    await provider.chat(
      [{ role: "user", content: "Translate to English: Hello" }],
      { maxTokens: 50, signal: controller.signal },
    );
    clearTimeout(timeout);
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err) };
  }
}

export const runTranslationJob = async (params: TranslationJobParams) => {
  const {
    lang,
    promptConfig,
    sourceScriptName,
    duplicatedName,
    targetFileId,
    targetScriptIndex,
    analyzedLines,
    parsedDoc,
    customInstruction,
    retrySceneIndices,
    updateFileScriptContent,
    uiActions: {
      setAiStatus,
      setTranslationState,
      setTranslatingTarget,
      setTranslationJob,
      setIsTranslationModalOpen,
      registerTranslationAbort,
      getTranslationState,
    },
  } = params;

  const provider = createAIProvider(promptConfig);
  if (!provider) {
    setAiStatus("Error: AI provider is not configured.");
    setTimeout(() => setAiStatus(null), 5000);
    return;
  }

  const controller = new AbortController();
  registerTranslationAbort(controller);

  try {
    // Build the working copy of document lines
    const currentDocLines = analyzedLines.map((item) => {
      if (!item.isTranslatable) return item.original;
      return item.indent + item.prefix + item.cleanText + item.suffix;
    });

    updateFileScriptContent(targetFileId, targetScriptIndex, currentDocLines.join("\n"));

    // Segment into scenes
    const parsedLines = parsedDoc?.lines || [];
    const allChunks = segmentIntoScenes(analyzedLines, parsedLines);

    // Filter to only retry scenes if specified
    let chunks: SceneChunk[];
    if (retrySceneIndices && retrySceneIndices.length > 0) {
      const retrySet = new Set(retrySceneIndices);
      chunks = allChunks.filter((_, i) => retrySet.has(i));
    } else {
      chunks = allChunks;
    }

    if (chunks.length === 0) {
      setAiStatus("No translatable content found.");
      setTimeout(() => setAiStatus(null), 5000);
      return;
    }

    // Language & model info
    const ld = getLanguageDetails(lang);
    const langInfo = `"${lang}" (${ld.native}, code: ${ld.code})`;
    const effectiveModel =
      promptConfig.provider === "openai-compatible"
        ? promptConfig.apiModel || promptConfig.model || "openai-compatible"
        : promptConfig.model || "llama3.2";

    // Collect character names (clean proper names without @ prefix)
    const allCharacters = new Set<string>();
    if (parsedDoc?.lines) {
      parsedDoc.lines.forEach((line) => {
        if (line.type === LineType.character || line.type === LineType.dualDialogueCharacter) {
          const charName = line.text.replace(/\([^)]*\)/g, "").replace(/[@^]/g, "").trim();
          if (charName) allCharacters.add(charName);
        }
      });
    }

    // Count total scenes (unique scene indices)
    const uniqueSceneIndices = new Set(chunks.map((c) => c.sceneIndex));
    const totalScenes = uniqueSceneIndices.size;
    const totalTranslatableLines = chunks.reduce((sum, c) => sum + c.lineIndices.length, 0);
    const startTime = Date.now();

    // Pre-flight check
    setTranslationState("running");
    setTranslatingTarget({ fileId: targetFileId, scriptIndex: targetScriptIndex });
    setTranslationJob(() => ({
      fileId: targetFileId,
      scriptIndex: targetScriptIndex,
      scriptName: duplicatedName,
      sourceScriptName,
      lang,
      langCode: ld.code,
      langNative: ld.native,
      totalScenes,
      completedScenes: 0,
      currentSceneHeading: "Checking AI connection...",
      currentSceneIndex: 0,
      statusMessage: "Checking AI connection...",
      totalLines: totalTranslatableLines,
      translatedLines: 0,
      failedScenes: 0,
      failedSceneIndices: [],
      latestPreview: "",
      startTime,
      model: effectiveModel,
      provider: promptConfig.provider,
      state: "preflight" as const,
    }));
    setIsTranslationModalOpen(true);

    const flightResult = await preFlightCheck(params);
    if (!flightResult.ok) {
      setAiStatus(`Pre-flight failed: ${flightResult.error}`);
      setTranslationJob((prev: any) => prev ? {
        ...prev,
        state: "error",
        error: `Pre-flight check failed: ${flightResult.error}`,
        statusMessage: `Connection failed: ${flightResult.error}`,
        endTime: Date.now(),
      } : null);
      setTimeout(() => setAiStatus(null), 8000);
      registerTranslationAbort(null);
      setTranslationState("idle");
      setTranslatingTarget(null);
      return;
    }

    let translatedLinesCount = 0;
    const completedSceneIndices = new Set<number>();
    const failedChunkIndices = new Set<number>();
    let currentDelay = 1000; // Auto-throttle: start at 1s

    // Process chunks sequentially
    for (let ci = 0; ci < chunks.length; ci++) {
      // Check pause/cancel
      while (getTranslationState() === "paused") {
        setTranslationJob((prev: any) => prev ? {
          ...prev,
          state: "paused",
          statusMessage: `Paused — Scene ${completedSceneIndices.size + 1} of ${totalScenes}`,
        } : null);
        await wait(300);
      }
      if (getTranslationState() === "cancelled" || controller.signal.aborted) break;

      const chunk = chunks[ci];
      const currentSceneNumber = Math.min(completedSceneIndices.size + 1, totalScenes);
      const partLabel = chunk.totalParts ? ` (Part ${chunk.partNumber} of ${chunk.totalParts})` : "";
      const sceneLabel = `Scene ${currentSceneNumber} of ${totalScenes} — ${chunk.heading}${partLabel}`;

      // Update progress
      setTranslationJob((prev: any) => prev ? {
        ...prev,
        state: "running",
        currentSceneHeading: chunk.heading,
        currentSceneIndex: currentSceneNumber,
        currentPart: chunk.partNumber,
        currentTotalParts: chunk.totalParts,
        statusMessage: `Translating: ${sceneLabel}`,
      } : null);
      setAiStatus(`Translating: ${sceneLabel}`);

      // Label lines with character speaker cues and element types for context
      const chunkLabeledTexts = chunk.lineIndices.map((idx) => {
        const label = getLineContextLabel(idx, parsedLines);
        return `${label} ${analyzedLines[idx].cleanText}`;
      });

      // Find character names in this scene
      const sceneChars = new Set<string>();
      for (let idx = chunk.startLine; idx <= chunk.endLine; idx++) {
        const text = analyzedLines[idx]?.original || "";
        allCharacters.forEach((char) => {
          if (text.includes(char)) sceneChars.add(char);
        });
      }

      const systemParts = [
        `You are a professional screenplay translator. Translate the screenplay lines below into ${langInfo}.`,
        ld.example ? `Example phrasing in ${ld.native}: "${ld.example}"` : "",
        "",
        "ELEMENT TYPES & TONE:",
        "• Lines labeled with [Dialogue: SPEAKER] are Dialogue: translate using natural, conversational, spoken phrasing suitable for cinema and modern film dialogue.",
        "• Lines labeled [Action] are Action/Description: translate using punchy, vivid, cinematic present-tense prose.",
        "• Lines labeled [Parenthetical] are Actor Directions: translate naturally as an emotional cue or action.",
        "• Lines labeled [Scene Heading], [Transition], or [Shot]: translate using standard film terminology.",
        params.dynamicToneInstructions ? `\nTone Preferences:\n${params.dynamicToneInstructions}` : "",
        "",
      ];

      if (customInstruction) {
        systemParts.push("ADDITIONAL INSTRUCTIONS:");
        systemParts.push(customInstruction);
        systemParts.push("");
      }

      systemParts.push("RULES:");
      systemParts.push("1. Return EXACTLY 1 translated line per input line, preserving the exact line-by-line order.");
      systemParts.push("2. Output ONLY the spoken or descriptive text directly. Do NOT prepend character names or speaker labels (e.g. do not write 'RADIO:' or '@RADIO:'). Do NOT include [Label] tags, numbering, markdown bullets/dashes (- or *), or explanations.");
      systemParts.push("3. Screenplay format: Do NOT wrap Dialogue lines in quotation marks (\" or '). Do NOT wrap Action/Description lines in parentheses ( ). Output plain text lines.");
      systemParts.push("4. Do not invent or continue scenes. Output ONLY in the target language.");
      if (params.preserveCharacterNames !== false && sceneChars.size > 0) {
        systemParts.push(`5. Preserve these character names as-is (do not translate, and never add '@' to names in dialogue or action lines): ${Array.from(sceneChars).join(", ")}`);
      }

      const systemPrompt = systemParts.filter(Boolean).join("\n");

      const userParts = [];
      userParts.push(`Scene: ${chunk.heading}`);
      if (sceneChars.size > 0) {
        userParts.push(`Characters: ${Array.from(sceneChars).join(", ")}`);
      }
      userParts.push("");
      userParts.push(`Translate each of these ${chunkLabeledTexts.length} lines:`);
      userParts.push("---");
      userParts.push(chunkLabeledTexts.join("\n"));

      const userPrompt = userParts.join("\n");

      // Attempt translation with retries
      let success = false;
      const MAX_RETRIES = 3;

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        if (getTranslationState() === "cancelled" || controller.signal.aborted) break;

        while (getTranslationState() === "paused") {
          await wait(300);
        }

        try {
          let fullRaw = "";
          const chatResult = await provider.chat(
            [{ role: "user", content: userPrompt }],
            {
              system: systemPrompt,
              temperature: promptConfig.translateTemp !== undefined ? promptConfig.translateTemp : 0.3,
              maxTokens: 8192,
              signal: controller.signal,
              onChunk: (delta) => {
                fullRaw += delta;
                const cleanPreview = fullRaw
                  .replace(/<think>[\s\S]*?<\/think>/gi, "")
                  .replace(/<think>[\s\S]*$/gi, "")
                  .trim();
                const previewLines = cleanPreview.split("\n").filter((l) => l.trim().length > 0);
                let latest = previewLines[previewLines.length - 1] || "";
                if (latest) {
                  // Clean off any echoed [Label] prefix
                  latest = latest
                    .replace(/^\[(Dialogue:[^\]]*|Action|Parenthetical|Scene Heading|Transition|Shot)\]\s*:?\s*/i, "")
                    .replace(/^[-*•]\s+/, "")
                    .replace(/^["'“]\s*/, "")
                    .replace(/\s*["'”]$/, "")
                    .trim();
                  latest = sanitizeForeignGlyphs(latest, lang);
                  if (latest) {
                    setTranslationJob((prev: any) =>
                      prev ? { ...prev, latestPreview: latest } : null
                    );
                  }
                }
              },
            },
          );

          if (!fullRaw && typeof chatResult === "string") {
            fullRaw = chatResult;
          }

          // Parse response — tolerant line-by-line matching
          const { cleanContent } = extractThinkingAndClean(fullRaw);
          const resLines = cleanContent.split(/\r?\n/).filter((l) => l.trim().length > 0);

          let linesApplied = 0;
          chunk.lineIndices.forEach((lineIdx, i) => {
            let translated = resLines[i]?.trim();
            if (translated && translated.length > 0) {
              const item = analyzedLines[lineIdx];

              // Clean off any echoed [Label] prefix the model might repeat
              translated = translated
                .replace(/^\[(Dialogue:[^\]]*|Action|Parenthetical|Scene Heading|Transition|Shot)\]\s*:?\s*/i, "")
                .trim();

              // Clean off echoed character name prefixes (e.g. "@RADIO:", "RADIO:", "@PILOT:")
              const lineType = parsedLines[lineIdx]?.type;
              const isDialogueLine = lineType === LineType.dialogue || lineType === LineType.dualDialogue;

              if (isDialogueLine) {
                allCharacters.forEach((char) => {
                  const cleanChar = char.replace(/^@/, "").trim();
                  if (cleanChar && cleanChar.length >= 2) {
                    const charRegex = new RegExp(`^@?${cleanChar.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*`, "i");
                    if (!charRegex.test(item.cleanText)) {
                      translated = translated.replace(charRegex, "").trim();
                    }
                  }
                });

                // Generic speaker prefix fallback for dialogue lines (e.g. "@NAME:" or "NAME:")
                const genericSpeakerRegex = /^@?[A-Z0-9_\s.()'-]{2,}\s*:\s*/;
                if (genericSpeakerRegex.test(translated) && !genericSpeakerRegex.test(item.cleanText)) {
                  translated = translated.replace(genericSpeakerRegex, "").trim();
                }
              }

              // Strip stray '@' before character names in body text (Action, Dialogue, etc.)
              // Fountain only uses '@' as a prefix for character cue lines, never inside dialogue or action.
              allCharacters.forEach((char) => {
                if (char && char.length >= 2) {
                  const escapedChar = char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                  // Match @CharacterName when preceded by start of line or non-word character
                  const atCharRegex = new RegExp(`(^|[^\\w@])@(${escapedChar})\\b`, "gi");
                  if (atCharRegex.test(translated) && !atCharRegex.test(item.cleanText)) {
                    translated = translated.replace(atCharRegex, "$1$2");
                  }
                }
              });

              // Strip model-generated markdown bullet dashes (- or * or •) if the original screenplay text didn't have them
              if (!item.cleanText.startsWith("-") && !item.cleanText.startsWith("•") && !item.cleanText.startsWith("*")) {
                translated = translated.replace(/^[-*•]\s+/, "").trim();
              }

              // Strip model-generated quotation marks around dialogue if original line did not have them
              if (isDialogueLine) {
                const hadQuotes = (item.cleanText.startsWith('"') && item.cleanText.endsWith('"')) ||
                  (item.cleanText.startsWith("'") && item.cleanText.endsWith("'")) ||
                  (item.cleanText.startsWith("“") && item.cleanText.endsWith("”"));
                if (!hadQuotes) {
                  translated = translated
                    .replace(/^["'“](.*)["'”]$/s, "$1")
                    .replace(/^["'“]\s*/, "")
                    .replace(/\s*["'”]$/, "")
                    .trim();
                }
              }

              // Strip redundant leading Fountain action escape (!) if the model echoed it
              if (item.prefix === "!" && translated.startsWith("!")) {
                translated = translated.slice(1).trim();
              }

              // Strip model-generated parentheses around action/description lines if original was not in parentheses
              const isActionLine = lineType === LineType.action || lineType === LineType.centered || lineType === LineType.synopse;
              if (isActionLine) {
                const hadParentheses = item.cleanText.startsWith("(") && item.cleanText.endsWith(")");
                if (!hadParentheses && translated.startsWith("(") && translated.endsWith(")")) {
                  translated = translated.slice(1, -1).trim();
                }
              }

              // Sanitize foreign unicode script bleeding (e.g. CJK/Telugu glyphs leaking into Tamil)
              translated = sanitizeForeignGlyphs(translated, lang);

              if (!translated) return;

              // Safety: reject if model output a scene heading for a non-heading line
              if (/^(INT\.|EXT\.|EST\.|I\/E\.)/i.test(translated) && !/^(INT\.|EXT\.|EST\.|I\/E\.)/i.test(item.cleanText)) {
                return; // Keep original
              }

              // Fountain syntax normalization:
              // Strip redundant outer wrappers from model output so item.prefix / item.suffix don't double-wrap
              if (item.prefix === "(" && item.suffix === ")" && translated.startsWith("(") && translated.endsWith(")")) {
                translated = translated.slice(1, -1).trim();
              } else if (item.prefix === "!" && translated.startsWith("!")) {
                translated = translated.slice(1).trim();
              } else if (item.prefix === "." && translated.startsWith(".")) {
                translated = translated.slice(1).trim();
              } else if (item.prefix.startsWith(">") && translated.startsWith(">")) {
                translated = translated.replace(/^>\s*/, "").trim();
              } else if (item.prefix === ">" && item.suffix === "<" && translated.startsWith(">") && translated.endsWith("<")) {
                translated = translated.slice(1, -1).trim();
              } else if (item.prefix === "=" && translated.startsWith("=")) {
                translated = translated.slice(1).trim();
              } else if (item.prefix === "!!" && translated.startsWith("!!")) {
                translated = translated.slice(2).trim();
              }

              currentDocLines[lineIdx] = item.indent + item.prefix + translated + item.suffix;
              linesApplied++;
            }
          });

          if (linesApplied > 0) {
            translatedLinesCount += linesApplied;
            updateFileScriptContent(targetFileId, targetScriptIndex, currentDocLines.join("\n"));
            success = true;

            setTranslationJob((prev: any) => prev ? {
              ...prev,
              translatedLines: translatedLinesCount,
            } : null);
            break;
          }
          // If zero lines applied, retry
        } catch (err: any) {
          if (isAbortError(err, controller) || getTranslationState() === "cancelled") {
            break;
          }

          if (err instanceof RateLimitError) {
            const waitSec = err.retryAfterSec || 10;
            setTranslationJob((prev: any) => prev ? {
              ...prev,
              state: "waiting",
              statusMessage: `⏳ Rate limited — waiting ${waitSec}s before retrying ${sceneLabel}`,
              waitingSeconds: waitSec,
            } : null);
            setAiStatus(`Rate limited — waiting ${waitSec}s...`);
            currentDelay = Math.min(currentDelay * 2, 30000);
            await wait(waitSec * 1000);
            setTranslationJob((prev: any) => prev ? { ...prev, state: "running", waitingSeconds: undefined } : null);
            continue;
          }

          // Network error — wait and retry
          if (attempt < MAX_RETRIES - 1) {
            const backoff = 5000 * (attempt + 1);
            setTranslationJob((prev: any) => prev ? {
              ...prev,
              state: "waiting",
              statusMessage: `⚠ Error on ${sceneLabel}, retrying in ${Math.round(backoff / 1000)}s...`,
              waitingSeconds: Math.round(backoff / 1000),
            } : null);
            await wait(backoff);
            setTranslationJob((prev: any) => prev ? { ...prev, state: "running", waitingSeconds: undefined } : null);
          }
        }
      }

      if (!success && getTranslationState() !== "cancelled" && !controller.signal.aborted) {
        failedChunkIndices.add(ci);
        setTranslationJob((prev: any) => prev ? {
          ...prev,
          statusMessage: `⚠ ${sceneLabel} failed, moving on...`,
          failedScenes: failedChunkIndices.size,
          failedSceneIndices: Array.from(failedChunkIndices),
        } : null);
      }

      // Check if all chunks for this scene are finished
      const remainingChunksForScene = chunks.slice(ci + 1).some((c) => c.sceneIndex === chunk.sceneIndex);
      if (!remainingChunksForScene) {
        completedSceneIndices.add(chunk.sceneIndex);
        setTranslationJob((prev: any) => prev ? {
          ...prev,
          completedScenes: completedSceneIndices.size,
        } : null);
      }

      // Auto-throttle delay between chunks
      if (ci < chunks.length - 1 && getTranslationState() !== "cancelled" && !controller.signal.aborted) {
        if (success) {
          currentDelay = Math.max(500, currentDelay - 200); // Decrease on success
        }
        await wait(currentDelay);
      }
    }

    // Final state
    if (getTranslationState() !== "cancelled" && !controller.signal.aborted) {
      const endTime = Date.now();
      const hasFailures = failedChunkIndices.size > 0;
      setAiStatus(hasFailures ? `Translation finished with ${failedChunkIndices.size} failed scene(s).` : "Translation Completed!");
      setTranslationJob((prev: any) =>
        prev
          ? {
              ...prev,
              completedScenes: totalScenes,
              translatedLines: translatedLinesCount,
              failedScenes: failedChunkIndices.size,
              failedSceneIndices: Array.from(failedChunkIndices),
              endTime,
              state: "completed",
              statusMessage: hasFailures
                ? `Translation finished — ${failedChunkIndices.size} scene(s) could not be translated`
                : "Translation finished successfully",
            }
          : null
      );
      setIsTranslationModalOpen(true);
      setTimeout(() => setAiStatus(null), 5000);
    } else {
      setAiStatus("Translation Cancelled.");
      setTranslationJob((prev: any) => (prev ? { ...prev, state: "cancelled", endTime: Date.now(), statusMessage: "Translation cancelled" } : null));
      setTimeout(() => setAiStatus(null), 3000);
    }
  } catch (err: any) {
    if (!isAbortError(err, controller) && !controller.signal.aborted && getTranslationState() !== "cancelled") {
      const errMsg = err?.message || String(err);
      setAiStatus(`AI Error: ${errMsg.slice(0, 60)}`);
      setTranslationJob((prev: any) => (prev ? { ...prev, state: "error", error: errMsg, endTime: Date.now(), statusMessage: `Error: ${errMsg}` } : null));
      setTimeout(() => setAiStatus(null), 8000);
    } else {
      setAiStatus("Translation Cancelled.");
      setTranslationJob((prev: any) => (prev ? { ...prev, state: "cancelled", endTime: Date.now(), statusMessage: "Translation cancelled" } : null));
      setTimeout(() => setAiStatus(null), 3000);
    }
  } finally {
    registerTranslationAbort(null);
    setTranslationState("idle");
    setTranslatingTarget(null);
  }
};
