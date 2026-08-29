import { PromptConfig } from "../hooks/usePromptConfig";
import { getLanguageDetails } from "../constants/languages";
import { createAIProvider } from "../lib/aiProviders";
import { FountainDocument, LineType } from "../parser";
import { extractThinkingAndClean } from "../hooks/useAIChat";

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
  const { cleanContent } = extractThinkingAndClean(rawText);
  const withoutFences = cleanContent
    .replace(/^```[a-z]*\s*$/gim, "")
    .replace(/^```\s*$/gim, "");

  const rawResLines = withoutFences.split(/\r?\n/);
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

async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  signal?: AbortSignal
): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    if (signal?.aborted) {
      const err = new Error("AbortError");
      err.name = "AbortError";
      throw err;
    }
    try {
      return await operation();
    } catch (error: any) {
      if (signal?.aborted || isAbortError(error)) {
        const err = new Error("AbortError");
        err.name = "AbortError";
        throw err;
      }
      
      attempt++;
      if (attempt >= maxRetries) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 500;
      await wait(delay);
    }
  }
  throw new Error("Unreachable");
}

export const runTranslationJob = async (params: TranslationJobParams) => {
  const {
    lang,
    promptConfig,
    sourceScriptName,
    duplicatedName,
    targetFileId,
    targetScriptIndex,
    lines,
    analyzedLines,
    parsedDoc,
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

    const translatableIndices: number[] = [];
    analyzedLines.forEach((item, idx) => {
      if (item.isTranslatable && item.cleanText.trim()) {
        translatableIndices.push(idx);
      }
    });

    const BATCH_SIZE = 10;
    const totalBatches = Math.ceil(translatableIndices.length / BATCH_SIZE) || 1;

    const ld = getLanguageDetails(lang);
    const langInfo = `"${lang}" (code: ${ld.code}, native: ${ld.native})`;

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
      `You are a professional screenplay translation tool. Translate the given numbered lines into ${langInfo}.`,
      `The output MUST be written in ${ld.native} script (${ld.code}).`,
      "",
      "TONE & STYLE GUIDELINES:",
      "• Dialogue & Conversation: Use a natural, casual, spoken conversational tone (colloquial spoken language as spoken by real people in modern movies). Do NOT use stiff, formal, archaic, or textbook/literary phrasing.",
      "• Action & Description: Keep action lines punchy, vivid, and cinematic.",
      "",
      "CRITICAL RULES:",
      `1. Translate each line into ${langInfo} with spoken conversational phrasing for dialogue.`,
      "2. Output format: N|<translated text> (e.g. 1|Translated text). Preserve the exact 'N|' prefix for each line.",
      "3. You MUST return EXACTLY the same number of lines as provided in the input.",
      "4. Do NOT continue the scene, do NOT add new dialogue, and do NOT add scene headings (like INT./EXT.).",
      "5. Do NOT add preamble, conversational text, safety disclaimers, or markdown code fences.",
      "6. Output ONLY the lines in format: N|<translated text>"
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
      startTime,
      model: effectiveModel,
      provider: promptConfig.provider,
      state: "running" as const,
    };

    setTranslatingTarget({ fileId: targetFileId, scriptIndex: targetScriptIndex });
    setTranslationJob(() => initialJob);
    setIsTranslationModalOpen(true);

    let translatedLinesCount = 0;
    let completedBatches = 0;
    const activeBatchIndices = new Set<number>();

    const updateActiveStatus = () => {
      setAiStatus(`Translating line ${Math.min(translatedLinesCount + 1, totalTranslatableLines)} of ${totalTranslatableLines} to ${lang}...`);
    };

    const executeBatch = async (b: number) => {
      while (getTranslationState() === "paused") {
        await wait(300);
      }
      if (getTranslationState() === "cancelled") {
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

      const batchInputs = batchIndices.map((idx, i) => `${i + 1}|${analyzedLines[idx].cleanText}`);
      const userPrompt = batchInputs.join("\n");

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
        relevantChars.size > 0
          ? `\nDO NOT TRANSLATE THESE CHARACTER NAMES (keep original spelling): [${Array.from(relevantChars).join(", ")}]`
          : "";

      const batchSystemPrompt = baseSystemPrompt + glossarySuffix;

      let translatedBatchText = "";
      const processedNums = new Set<number>();

      const processParsedLines = (parsedMap: Map<number, string>) => {
        let hasUpdates = false;
        batchIndices.forEach((lineIdx, i) => {
          const num = i + 1;
          if (parsedMap.has(num) && !processedNums.has(num)) {
            let translatedText = parsedMap.get(num) || "";
            const item = analyzedLines[lineIdx];

            if (/^(INT\.|EXT\.|EST\.|I\/E\.)/i.test(translatedText) && !/^(INT\.|EXT\.|EST\.|I\/E\.)/i.test(item.cleanText)) {
              translatedText = item.cleanText;
            }
            if (!translatedText) translatedText = item.cleanText;

            currentDocLines[lineIdx] = item.indent + item.prefix + translatedText + item.suffix;
            processedNums.add(num);
            translatedLinesCount++;
            hasUpdates = true;
          }
        });

        if (hasUpdates) {
          updateFileScriptContent(targetFileId, targetScriptIndex, currentDocLines.join("\n"));
          updateActiveStatus();
          setTranslationJob((prev: any) =>
            prev ? { ...prev, translatedLines: translatedLinesCount } : null
          );
        }
      };

      try {
        await retryWithBackoff(async () => {
          translatedBatchText = "";
          processedNums.clear();
          
          await provider.chat([{ role: "user", content: userPrompt }], {
            system: batchSystemPrompt,
            temperature: promptConfig.translateTemp !== undefined ? promptConfig.translateTemp : 0.1,
            signal: controller.signal,
            onChunk: (delta) => {
              translatedBatchText += delta;
              const lines = translatedBatchText.split("\n");
              if (lines.length > 1) {
                const completeLines = lines.slice(0, -1).join("\n");
                const currentParsedMap = parseBatchResponse(completeLines);
                processParsedLines(currentParsedMap);
              }
            },
          });
        }, 3, 1000, controller.signal);
      } catch (err: any) {
        if (isAbortError(err) || controller.signal.aborted || getTranslationState() === "cancelled") {
          return;
        }
        console.warn(`Batch ${b} encountered an error:`, err);
      } finally {
        activeBatchIndices.delete(b);
      }

      if (getTranslationState() === "cancelled" || controller.signal.aborted) {
        return;
      }

      // Final sweep for the last line and missing entries (using fallback, no retry block)
      const finalParsedMap = parseBatchResponse(translatedBatchText);
      batchIndices.forEach((lineIdx, i) => {
        const num = i + 1;
        if (!processedNums.has(num)) {
          let translatedText = finalParsedMap.get(num) || "";
          const item = analyzedLines[lineIdx];

          if (/^(INT\.|EXT\.|EST\.|I\/E\.)/i.test(translatedText) && !/^(INT\.|EXT\.|EST\.|I\/E\.)/i.test(item.cleanText)) {
            translatedText = item.cleanText;
          }
          if (!translatedText) translatedText = item.cleanText;

          currentDocLines[lineIdx] = item.indent + item.prefix + translatedText + item.suffix;
          processedNums.add(num);
          translatedLinesCount++;
        }
      });

      completedBatches += 1;
      updateFileScriptContent(targetFileId, targetScriptIndex, currentDocLines.join("\n"));
      updateActiveStatus();
      setTranslationJob((prev: any) =>
        prev
          ? {
              ...prev,
              completedBatches,
              translatedLines: translatedLinesCount,
              activeBatches: Array.from(activeBatchIndices),
            }
          : null
      );
    };

    const tasks = Array.from({ length: totalBatches }, (_, i) => () => executeBatch(i));
    
    await pLimit(promptConfig.provider === "ollama" ? 1 : 3, tasks);

    if (getTranslationState() !== "cancelled" && !controller.signal.aborted) {
      const endTime = Date.now();
      setAiStatus("Translation Completed!");
      setTranslationJob((prev: any) =>
        prev
          ? {
              ...prev,
              completedBatches: totalBatches,
              translatedLines: totalTranslatableLines,
              endTime,
              state: "completed",
            }
          : null
      );
      setIsTranslationModalOpen(true);
      setTimeout(() => setAiStatus(null), 4000);
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
