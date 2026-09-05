import { PromptConfig } from "../hooks/usePromptConfig";
import { getLanguageDetails } from "../constants/languages";
import { createAIProvider } from "../lib/aiProviders";
import { FountainDocument, LineType } from "../parser";

export interface AnalyzedLine {
  original: string;
  indent: string;
  prefix: string;
  suffix: string;
  cleanText: string;
  isTranslatable: boolean;
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
  retryIndices?: number[];
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

export function parseBatchResponse(rawText: string): Map<number, string> {
  const strippedText = rawText
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<think>[\s\S]*$/gi, "")
    .replace(/^```[a-z]*\s*$/gim, "")
    .replace(/^```\s*$/gim, "");

  const rawResLines = strippedText.split(/\r?\n/);
  const cleanedResLines = rawResLines
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !/^[*#-]?\s*(user safety|safety|moderation|disclaimer):/i.test(l));

  const parsedMap = new Map<number, string>();
  let currentNum: number | null = null;

  for (const line of cleanedResLines) {
    const match = line.match(/^(?:#|Line\s*)?\[?(\d+)\]?[|.:)\s-]+([\s\S]*)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      const val = match[2].trim();
      if (!isNaN(num)) {
        currentNum = num;
        parsedMap.set(num, val);
      }
    } else if (currentNum !== null && parsedMap.has(currentNum)) {
      const existing = parsedMap.get(currentNum) || "";
      parsedMap.set(currentNum, existing ? `${existing} ${line}` : line);
    }
  }

  return parsedMap;
}

export const pLimit = async <T,>(limit: number, tasks: (() => Promise<T>)[]): Promise<T[]> => {
  const results: Promise<T>[] = [];
  const executing: Set<Promise<any>> = new Set();
  for (const task of tasks) {
    const p = Promise.resolve().then(() => task());
    results.push(p);
    executing.add(p);
    const clean = () => executing.delete(p);
    p.then(clean, clean);
    if (executing.size >= limit) {
      await Promise.race(Array.from(executing));
    }
  }
  return Promise.all(results);
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isAbortError(error: any): boolean {
  if (!error) return false;
  if (error.name === "AbortError") return true;
  const msg = typeof error === "string" ? error : error.message || String(error);
  return /abort|cancel/i.test(msg);
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
    retryIndices,
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
    const currentDocLines = analyzedLines.map((item) => {
      if (!item.isTranslatable) return item.original;
      return item.indent + item.prefix + item.cleanText + item.suffix;
    });

    updateFileScriptContent(targetFileId, targetScriptIndex, currentDocLines.join("\n"));

    let translatableIndices: number[] = [];
    if (retryIndices && retryIndices.length > 0) {
      translatableIndices = retryIndices.filter(
        (idx) => idx >= 0 && idx < analyzedLines.length && analyzedLines[idx].cleanText.trim()
      );
    } else {
      analyzedLines.forEach((item, idx) => {
        if (item.isTranslatable && item.cleanText.trim()) {
          translatableIndices.push(idx);
        }
      });
    }

    const isOllama = promptConfig.provider === "ollama";
    const BATCH_SIZE = isOllama ? 10 : 20;
    const totalBatches = Math.ceil(translatableIndices.length / BATCH_SIZE) || 1;

    const ld = getLanguageDetails(lang);
    const langInfo = `"${lang}" (${ld.native}, code: ${ld.code})`;

    const allCharacters = new Set<string>();
    if (parsedDoc?.lines) {
      parsedDoc.lines.forEach((line) => {
        if (line.type === LineType.character || line.type === LineType.dualDialogueCharacter) {
          const charName = line.text.replace(/\([^)]*\)/g, "").replace(/\^/g, "").trim();
          if (charName) allCharacters.add(charName);
        }
      });
    }

    const baseSystemPrompt = [
      `You are a professional screenplay translator. Translate the numbered lines into ${langInfo}.`,
      ld.example ? `Example phrasing in ${ld.native}: "${ld.example}"` : "",
      "",
      "TONE & STYLE:",
      params.dynamicToneInstructions ||
      "• Dialogue: Natural spoken conversational tone for modern movies. Never stiff or formal.\n• Action: Punchy, vivid, cinematic.",
      "",
      "RULES:",
      "1. Format each output line as N|<translated text> exactly (e.g. 1|Translated text).",
      "2. Return EXACTLY the same number of lines as provided.",
      "3. Do not add explanations, notes, headings, markdown code blocks, or preamble.",
      "4. Do not invent or continue scenes."
    ].filter(Boolean).join("\n");

    const effectiveModel =
      promptConfig.provider === "openai-compatible"
        ? promptConfig.apiModel || promptConfig.model || "openai-compatible"
        : promptConfig.model || "llama3.2";

    const startTime = Date.now();
    const totalTranslatableLines = translatableIndices.length;

    const initialJob = {
      fileId: targetFileId,
      scriptIndex: targetScriptIndex,
      scriptName: duplicatedName,
      sourceScriptName: sourceScriptName,
      lang,
      langCode: ld.code,
      langNative: ld.native,
      totalBatches,
      completedBatches: 0,
      activeBatches: [],
      totalLines: totalTranslatableLines,
      translatedLines: 0,
      failedLines: 0,
      failedIndices: [],
      latestPreview: "",
      startTime,
      model: effectiveModel,
      provider: promptConfig.provider,
      state: "running" as const,
    };

    setTranslationState("running");
    setTranslatingTarget({ fileId: targetFileId, scriptIndex: targetScriptIndex });
    setTranslationJob(() => initialJob);
    setIsTranslationModalOpen(true);

    let translatedLinesCount = 0;
    let completedBatches = 0;
    const activeBatchIndices = new Set<number>();
    const failedLineIndices = new Set<number>();

    const updateActiveStatus = () => {
      setAiStatus(`Translating line ${Math.min(translatedLinesCount + 1, totalTranslatableLines)} of ${totalTranslatableLines} to ${lang}...`);
    };

    const executeBatch = async (b: number) => {
      while (getTranslationState() === "paused") {
        await wait(300);
      }
      if (getTranslationState() === "cancelled" || controller.signal.aborted) {
        return;
      }

      activeBatchIndices.add(b);
      updateActiveStatus();
      setTranslationJob((prev: any) =>
        prev ? { ...prev, activeBatches: Array.from(activeBatchIndices) } : null
      );

      const batchIndices = translatableIndices.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
      if (batchIndices.length === 0) {
        activeBatchIndices.delete(b);
        return;
      }

      let contextHeader = "";
      const firstLineIdx = batchIndices[0];
      const contextLines: string[] = [];
      for (let ci = Math.max(0, firstLineIdx - 3); ci < firstLineIdx; ci++) {
        if (analyzedLines[ci].original.trim()) {
          contextLines.push(analyzedLines[ci].original.trim());
        }
      }
      if (contextLines.length > 0) {
        contextHeader = `[SCENE CONTEXT - DO NOT TRANSLATE]\n${contextLines.join("\n")}\n[END CONTEXT]\n\n`;
      }

      const batchStart = batchIndices[0];
      const batchEnd = batchIndices[batchIndices.length - 1];
      const relevantChars = new Set<string>();
      for (let idx = Math.max(0, batchStart - 5); idx <= Math.min(analyzedLines.length - 1, batchEnd + 5); idx++) {
        const text = analyzedLines[idx].original;
        allCharacters.forEach((char) => {
          if (text.includes(char)) {
            relevantChars.add(char);
          }
        });
      }

      const glossarySuffix =
        (params.preserveCharacterNames !== false && relevantChars.size > 0)
          ? `\nPRESERVE CHARACTER NAMES: [${Array.from(relevantChars).join(", ")}]`
          : "";

      const batchSystemPrompt = baseSystemPrompt + glossarySuffix;

      let missingIndices: number[] = [...batchIndices];
      let attempt = 0;
      const MAX_BATCH_RETRIES = 5;

      while (attempt < MAX_BATCH_RETRIES && missingIndices.length > 0) {
        if (getTranslationState() === "cancelled" || controller.signal.aborted) {
          activeBatchIndices.delete(b);
          return;
        }

        while (getTranslationState() === "paused") {
          await wait(300);
        }

        const currentInputs = missingIndices.map((idx, i) => `${i + 1}|${analyzedLines[idx].cleanText}`);
        const attemptPrompt = `${contextHeader}Translate each numbered line below:\n${currentInputs.join("\n")}`;

        let fullRawResponse = "";

        try {
          await provider.chat([{ role: "user", content: attemptPrompt }], {
            system: batchSystemPrompt,
            temperature: promptConfig.translateTemp !== undefined ? promptConfig.translateTemp : 0.1,
            maxTokens: 8192,
            signal: controller.signal,
            onChunk: (delta) => {
              fullRawResponse += delta;
              const cleanPreview = fullRawResponse
                .replace(/<think>[\s\S]*?<\/think>/gi, "")
                .replace(/<think>[\s\S]*$/gi, "")
                .trim();
              const previewLines = cleanPreview.split("\n").filter((l) => l.trim().length > 0);
              const latest = previewLines[previewLines.length - 1] || "";
              if (latest) {
                setTranslationJob((prev: any) =>
                  prev ? { ...prev, latestPreview: latest } : null
                );
              }
            },
          });

          const parsedMap = parseBatchResponse(fullRawResponse);
          const stillMissing: number[] = [];

          missingIndices.forEach((lineIdx, i) => {
            const num = i + 1;
            const translatedText = parsedMap.get(num);

            if (translatedText && translatedText.trim().length > 0) {
              let finalText = translatedText.trim();
              const item = analyzedLines[lineIdx];

              if (/^(INT\.|EXT\.|EST\.|I\/E\.)/i.test(finalText) && !/^(INT\.|EXT\.|EST\.|I\/E\.)/i.test(item.cleanText)) {
                finalText = item.cleanText;
              }

              currentDocLines[lineIdx] = item.indent + item.prefix + finalText + item.suffix;
              translatedLinesCount++;
            } else {
              stillMissing.push(lineIdx);
            }
          });

          missingIndices = stillMissing;

          if (missingIndices.length === 0) {
            break;
          }
        } catch (err: any) {
          if (isAbortError(err) || controller.signal.aborted || getTranslationState() === "cancelled") {
            activeBatchIndices.delete(b);
            return;
          }
        }

        attempt++;
        if (missingIndices.length > 0 && attempt < MAX_BATCH_RETRIES) {
          await wait(1000 * Math.pow(1.5, attempt - 1));
        }
      }

      if (missingIndices.length > 0) {
        missingIndices.forEach((lineIdx) => {
          failedLineIndices.add(lineIdx);
        });
      }

      activeBatchIndices.delete(b);
      completedBatches += 1;

      updateFileScriptContent(targetFileId, targetScriptIndex, currentDocLines.join("\n"));
      updateActiveStatus();
      setTranslationJob((prev: any) =>
        prev
          ? {
              ...prev,
              completedBatches,
              translatedLines: translatedLinesCount,
              failedLines: failedLineIndices.size,
              failedIndices: Array.from(failedLineIndices),
              activeBatches: Array.from(activeBatchIndices),
            }
          : null
      );
    };

    const tasks = Array.from({ length: totalBatches }, (_, i) => () => executeBatch(i));
    const concurrency = isOllama ? 1 : 2;

    await pLimit(concurrency, tasks);

    if (getTranslationState() !== "cancelled" && !controller.signal.aborted) {
      const endTime = Date.now();
      const hasFailures = failedLineIndices.size > 0;
      setAiStatus(hasFailures ? `Translation Finished with ${failedLineIndices.size} unparsed lines.` : "Translation Completed!");
      setTranslationJob((prev: any) =>
        prev
          ? {
              ...prev,
              completedBatches: totalBatches,
              translatedLines: translatedLinesCount,
              failedLines: failedLineIndices.size,
              failedIndices: Array.from(failedLineIndices),
              endTime,
              state: "completed",
            }
          : null
      );
      setIsTranslationModalOpen(true);
      setTimeout(() => setAiStatus(null), 5000);
    } else {
      setAiStatus("Translation Cancelled.");
      setTranslationJob((prev: any) => (prev ? { ...prev, state: "cancelled", endTime: Date.now() } : null));
      setTimeout(() => setAiStatus(null), 3000);
    }
  } catch (err: any) {
    if (!isAbortError(err) && !controller.signal.aborted && getTranslationState() !== "cancelled") {
      const errMsg = err?.message || String(err);
      setAiStatus(`AI Error: ${errMsg.slice(0, 60)}`);
      setTranslationJob((prev: any) => (prev ? { ...prev, state: "error", error: errMsg, endTime: Date.now() } : null));
      setTimeout(() => setAiStatus(null), 8000);
    } else {
      setAiStatus("Translation Cancelled.");
      setTranslationJob((prev: any) => (prev ? { ...prev, state: "cancelled", endTime: Date.now() } : null));
      setTimeout(() => setAiStatus(null), 3000);
    }
  } finally {
    registerTranslationAbort(null);
    setTranslationState("idle");
    setTranslatingTarget(null);
  }
};
