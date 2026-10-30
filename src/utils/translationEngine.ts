import { PromptConfig } from "../hooks/usePromptConfig";
import { getLanguageDetails } from "../constants/languages";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { isUrAIDesktop, providerConfig, destination, textFingerprint, type UrAIElement } from "../lib/urai";
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
  nativeJobId?: string;
  updateFileScriptContent: (
    fileId: string,
    scriptIndex: number,
    newContent: string,
    expectedScriptName?: string,
  ) => void;
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
    return {
      original: indent + headingText,
      indent,
      prefix: ".",
      suffix: "",
      cleanText: headingText.slice(1),
      isTranslatable: false,
    };
  }

  if (type === LineType.transitionLine) {
    let transText = trimmed;
    if (!transText.startsWith(">")) {
      transText = "> " + transText;
    }
    return {
      original: indent + transText,
      indent,
      prefix: "> ",
      suffix: "",
      cleanText: transText.replace(/^>\s*/, ""),
      isTranslatable: false,
    };
  }

  const isOtherNonTranslatable =
    type === LineType.empty ||
    type === LineType.section ||
    type === LineType.pageBreak ||
    type === LineType.more ||
    type === LineType.dualDialogueMore ||
    (type !== undefined && type >= LineType.titlePageTitle && type <= LineType.titlePageUnknown);

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
export function sanitizeForeignGlyphs(text: string, _targetLang: string): string {
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
        const cleanChar = p.text
          ?.replace(/\([^)]*\)/g, "")
          .replace(/[@^]/g, "")
          .trim();
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
export function segmentIntoScenes(analyzedLines: AnalyzedLine[], parsedLines: any[]): SceneChunk[] {
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
    } else if (
      hasAnyHeadings &&
      !foundFirstScene &&
      analyzedLines[i]?.isTranslatable &&
      analyzedLines[i]?.cleanText.trim()
    ) {
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
    return [
      { heading: "Document", sceneIndex: 0, startLine: 0, endLine: analyzedLines.length - 1, lineIndices: allIndices },
    ];
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

interface NativeJobItem {
  line: number;
  prefix: string;
  suffix: string;
  indent: string;
  element: UrAIElement;
  scene: number;
  heading: string;
}
interface NativeJob {
  id: string;
  language: string;
  instructions: string;
  lines: string[];
  items: NativeJobItem[];
  completed: string[];
  failed: string[];
  destination: string;
  status: string;
  currentHeading: string;
  totalScenes: number;
  temperature?: number;
  lastError?: string;
  sourceRevisions?: string[];
}

export async function runTranslationJob(params: TranslationJobParams) {
  try {
    await executeTranslationJob(params);
  } catch (error) {
    params.uiActions.setAiStatus(String(error));
    params.uiActions.setTranslationJob((prev) =>
      prev ? { ...prev, state: "error", error: String(error), statusMessage: String(error) } : null,
    );
    params.uiActions.registerTranslationAbort(null);
  }
}

async function executeTranslationJob(params: TranslationJobParams) {
  const { uiActions: ui } = params;
  if (!isUrAIDesktop()) {
    ui.setAiStatus("Document translation runs in the desktop app.");
    return;
  }
  const id = params.nativeJobId || crypto.randomUUID();
  const controller = new AbortController();
  const parsed = params.parsedDoc?.lines ?? [];
  const chunks = segmentIntoScenes(params.analyzedLines, parsed);
  const items: NativeJobItem[] = chunks.flatMap((chunk) =>
    chunk.lineIndices.map((line) => {
      const item = params.analyzedLines[line];
      return {
        line,
        prefix: item.prefix,
        suffix: item.suffix,
        indent: item.indent,
        scene: chunk.sceneIndex,
        heading: chunk.heading,
        element: {
          id: `line-${line}`,
          text: item.cleanText,
          kind: getLineContextLabel(line, parsed),
          speaker: getLineContextLabel(line, parsed),
        },
      };
    }),
  );
  const ld = getLanguageDetails(params.lang);
  let job: NativeJob = {
    id,
    language: params.lang,
    temperature: params.promptConfig.translateTemp,
    instructions: [
      params.promptConfig.translatePrompt,
      params.dynamicToneInstructions,
      params.customInstruction,
      params.preserveCharacterNames !== false
        ? "Preserve all character names exactly."
        : "Use consistent names throughout.",
    ]
      .filter(Boolean)
      .join("\n"),
    lines: params.analyzedLines.map((i) =>
      i.isTranslatable ? i.indent + i.prefix + i.cleanText + i.suffix : i.original,
    ),
    items,
    completed: [],
    failed: [],
    destination: destination(params.promptConfig),
    status: "running",
    currentHeading: "Preparing translation",
    totalScenes: new Set(items.map((i) => i.scene)).size,
  };
  if (params.nativeJobId) {
    job = await invoke<NativeJob>("urai_load_job", { jobId: id });
    if (
      job.lines.join("\n") !== params.lines.join("\n") &&
      !job.sourceRevisions?.includes(await textFingerprint(params.lines.join("\n")))
    )
      throw new Error(
        "The translation target changed since its last checkpoint. Restore that version or start a new translation to avoid overwriting your edits.",
      );
  }
  const update = (next: NativeJob) => {
    job = next;
    params.updateFileScriptContent(
      params.targetFileId,
      params.targetScriptIndex,
      next.lines.join("\n"),
      params.duplicatedName,
    );
    const complete = next.status === "completed" || next.status === "partial";
    const completedScenes = new Set(
      next.items.filter((i) => next.completed.includes(i.element.id)).map((i) => i.scene),
    );
    const pendingScenes = new Set(next.items.filter((i) => !next.completed.includes(i.element.id)).map((i) => i.scene));
    const actualCompleted = [...completedScenes].filter((i) => !pendingScenes.has(i)).length;
    ui.setTranslationJob(() => ({
      nativeJobId: id,
      fileId: params.targetFileId,
      scriptIndex: params.targetScriptIndex,
      scriptName: params.duplicatedName,
      sourceScriptName: params.sourceScriptName,
      lang: next.language,
      langCode: ld.code,
      langNative: ld.native,
      totalScenes: next.totalScenes,
      completedScenes: actualCompleted,
      currentSceneHeading: next.currentHeading,
      currentSceneIndex: Math.min(actualCompleted + 1, next.totalScenes),
      totalLines: next.items.length,
      translatedLines: next.completed.length,
      failedScenes: new Set(next.items.filter((i) => next.failed.includes(i.element.id)).map((i) => i.scene)).size,
      failedSceneIndices: next.items.flatMap((i, idx) => (next.failed.includes(i.element.id) ? [idx] : [])),
      latestPreview: next.completed.length
        ? next.lines[next.items.find((i) => i.element.id === next.completed.at(-1))?.line ?? 0]
        : "",
      model: params.promptConfig.provider === "ollama" ? params.promptConfig.model : params.promptConfig.apiModel,
      provider: params.promptConfig.provider,
      startTime,
      endTime: complete ? Date.now() : undefined,
      state: complete
        ? "completed"
        : next.status === "paused"
          ? "paused"
          : next.status === "waiting"
            ? "waiting"
            : next.status === "interrupted"
              ? "error"
              : "running",
      statusMessage:
        next.status === "partial"
          ? `Translation has untranslated elements: ${next.lastError || "Retry to finish them."}`
          : next.status === "completed"
            ? "Translation completed"
            : next.status === "interrupted"
              ? "Translation interrupted. Resume from its saved checkpoint."
              : `Translating: ${next.currentHeading}`,
    }));
  };
  const startTime = Date.now();
  const unlisten = await listen<NativeJob>("urai-job", (e) => {
    if (e.payload.id === id) update(e.payload);
  });
  let lastPause = false;
  const control = setInterval(() => {
    if (controller.signal.aborted || ui.getTranslationState() === "cancelled") {
      void invoke("urai_cancel", { requestId: id });
      return;
    }
    const paused = ui.getTranslationState() === "paused";
    if (paused !== lastPause) {
      lastPause = paused;
      void invoke("urai_pause_job", { jobId: id, paused });
    }
  }, 150);
  const abort = () => {
    void invoke("urai_cancel", { requestId: id });
  };
  controller.signal.addEventListener("abort", abort, { once: true });
  try {
    ui.registerTranslationAbort(controller);
    ui.setTranslationState("running");
    ui.setTranslatingTarget({ fileId: params.targetFileId, scriptIndex: params.targetScriptIndex });
    ui.setIsTranslationModalOpen(true);
    update(job);
    const result = await invoke<NativeJob>("urai_run_job", {
      request: { job, config: providerConfig(params.promptConfig), retry: Boolean(params.nativeJobId) },
    });
    update(result);
  } catch (e) {
    ui.setTranslationJob((prev) =>
      prev
        ? {
            ...prev,
            state: controller.signal.aborted ? "cancelled" : "error",
            error: String(e),
            statusMessage: "Translation stopped. Its checkpoint is available to resume.",
          }
        : null,
    );
  } finally {
    clearInterval(control);
    unlisten();
    controller.signal.removeEventListener("abort", abort);
    ui.registerTranslationAbort(null);
    ui.setTranslationState("idle");
    ui.setTranslatingTarget(null);
  }
}
