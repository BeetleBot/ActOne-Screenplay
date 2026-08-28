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

const pLimit = async <T,>(limit: number, tasks: (() => Promise<T>)[]) => {
  const results: T[] = [];
  const executing: Promise<void>[] = [];
  for (const task of tasks) {
    const p = Promise.resolve().then(() => task());
    results.push(p as unknown as T);
    const e: Promise<void> = p.then(() => {
      executing.splice(executing.indexOf(e), 1);
    });
    executing.push(e);
    if (executing.length >= limit) {
      await Promise.race(executing);
    }
  }
  return Promise.all(results);
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await operation();
    } catch (error: any) {
      if (error?.name === "AbortError") throw error;
      
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

    // Token-efficient batch size: 80 lines per batch reduces prompt overhead by ~75%
    const BATCH_SIZE = 80;
    const totalBatches = Math.ceil(translatableIndices.length / BATCH_SIZE) || 1;

    const ld = getLanguageDetails(lang);
    const langInfo = `"${lang}" (code: ${ld.code}, native: ${ld.native})`;

    // Collect all character names from AST
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
      ld.example ? `Example: "${ld.example}"` : "",
      `NEVER output text in Tamil, Hindi, or any other Indian language unless ${ld.code} explicitly requires it.`,
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
      totalLines: lines.length,
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
      const activeList = Array.from(activeBatchIndices).map((x) => x + 1).sort((a, b) => a - b);
      if (activeList.length > 0) {
        const min = activeList[0];
        const max = activeList[activeList.length - 1];
        const rangeStr = min === max ? `part ${min}` : `parts ${min}–${max}`;
        setAiStatus(`Translating ${rangeStr} of ${totalBatches} to ${lang}...`);
      }
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

      // Compact line numbering: 1|Line text (uses ~50% fewer tokens than [1] Line text)
      const batchInputs = batchIndices.map((idx, i) => `${i + 1}|${analyzedLines[idx].cleanText}`);
      const userPrompt = batchInputs.join("\n");

      // Scope character glossary specifically to the characters relevant in this chunk
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

      try {
        await retryWithBackoff(async () => {
          translatedBatchText = "";
          await provider.chat([{ role: "user", content: userPrompt }], {
            system: batchSystemPrompt,
            temperature: promptConfig.translateTemp !== undefined ? promptConfig.translateTemp : 0.1,
            signal: controller.signal,
            onChunk: (delta) => {
              translatedBatchText += delta;
            },
          });
        }, 3, 1000);
      } finally {
        activeBatchIndices.delete(b);
      }

      if (getTranslationState() === "cancelled") {
        return;
      }

      const rawResLines = translatedBatchText.split(/\r?\n/);
      const cleanedResLines = rawResLines
        .map((l) => l.trim())
        .filter((l) => !/^(\*|\-|\#)?\s*(user safety|safety|moderation|disclaimer):/i.test(l));

      // Parse tags: supports N|text, [N] text, N. text, etc.
      const parsedMap = new Map<number, string>();
      for (const line of cleanedResLines) {
        const match = line.match(/^\[?(\d+)\]?[\|\.\:\s\-]+([\s\S]*)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          const val = match[2].trim();
          if (!isNaN(num)) {
            parsedMap.set(num, val);
          }
        }
      }

      batchIndices.forEach((lineIdx, i) => {
        const item = analyzedLines[lineIdx];
        const num = i + 1;
        
        let translatedText = "";
        if (parsedMap.has(num)) {
          translatedText = parsedMap.get(num) || "";
        } else if (cleanedResLines[i] !== undefined) {
          translatedText = cleanedResLines[i].replace(/^\[?\d+\]?[\|\.\:\s\-]*/, "").trim();
        }

        // Safety against hallucinated scene headers
        if (/^(INT\.|EXT\.|EST\.|I\/E\.)/i.test(translatedText) && !/^(INT\.|EXT\.|EST\.|I\/E\.)/i.test(item.cleanText)) {
          translatedText = item.cleanText;
        }

        if (!translatedText) {
          translatedText = item.cleanText;
        }

        currentDocLines[lineIdx] = item.indent + item.prefix + translatedText + item.suffix;
      });

      translatedLinesCount += batchIndices.length;
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
    
    await pLimit(3, tasks);

    if (getTranslationState() !== "cancelled") {
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
    }
  } catch (err: any) {
    if (err?.name !== "AbortError") {
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
