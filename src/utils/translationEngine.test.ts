import { describe, it, expect, vi } from "vitest";
import { LineType, parseScreenplay } from "../parser";
import {
  analyzeFountainLine,
  parseBatchResponse,
  pLimit,
  runTranslationJob,
} from "./translationEngine";

vi.mock("../lib/aiProviders", () => ({
  createAIProvider: vi.fn(() => ({
    chat: vi.fn(async (messages, options) => {
      const userMsg = messages.find((m: any) => m.role === "user")?.content || "";
      const lines = userMsg.split("\n");
      const translated = lines
        .map((l: string) => {
          const parts = l.split("|");
          return `${parts[0]}|[ES] ${parts[1] || ""}`;
        })
        .join("\n");
      if (options?.onChunk) {
        options.onChunk(translated);
      }
      return translated;
    }),
  })),
}));

describe("analyzeFountainLine", () => {
  it("marks empty and whitespace lines as non-translatable", () => {
    const res = analyzeFountainLine("   ", { type: LineType.empty });
    expect(res.isTranslatable).toBe(false);
    expect(res.cleanText).toBe("");
  });

  it("handles character cues and forces @ prefix if absent", () => {
    const res = analyzeFountainLine("JOHN", { type: LineType.character });
    expect(res.isTranslatable).toBe(false);
    expect(res.cleanText).toBe("@JOHN");
    expect(res.original).toBe("@JOHN");

    const resWithAt = analyzeFountainLine("@JOHN", { type: LineType.character });
    expect(resWithAt.isTranslatable).toBe(false);
    expect(resWithAt.cleanText).toBe("@JOHN");
    expect(resWithAt.original).toBe("@JOHN");
  });

  it("handles scene headings and forces . prefix if absent", () => {
    const res = analyzeFountainLine("INT. COFFEE SHOP - DAY", { type: LineType.heading });
    expect(res.isTranslatable).toBe(false);
    expect(res.cleanText).toBe(".INT. COFFEE SHOP - DAY");

    const resWithDot = analyzeFountainLine(".INT. COFFEE SHOP - DAY", { type: LineType.heading });
    expect(resWithDot.isTranslatable).toBe(false);
    expect(resWithDot.cleanText).toBe(".INT. COFFEE SHOP - DAY");
  });

  it("handles transitions and forces > prefix if absent", () => {
    const res = analyzeFountainLine("CUT TO:", { type: LineType.transitionLine });
    expect(res.isTranslatable).toBe(false);
    expect(res.cleanText).toBe("> CUT TO:");
  });

  it("marks action lines as translatable with ! prefix", () => {
    const res = analyzeFountainLine("John enters the room slowly.", { type: LineType.action });
    expect(res.isTranslatable).toBe(true);
    expect(res.prefix).toBe("!");
    expect(res.cleanText).toBe("John enters the room slowly.");
  });

  it("marks dialogue lines as translatable with no prefix", () => {
    const res = analyzeFountainLine("I never wanted this to happen.", { type: LineType.dialogue });
    expect(res.isTranslatable).toBe(true);
    expect(res.prefix).toBe("");
    expect(res.cleanText).toBe("I never wanted this to happen.");
  });

  it("handles parentheticals with ( and ) prefix/suffix", () => {
    const res = analyzeFountainLine("(whispering softly)", { type: LineType.parenthetical });
    expect(res.isTranslatable).toBe(true);
    expect(res.prefix).toBe("(");
    expect(res.suffix).toBe(")");
    expect(res.cleanText).toBe("whispering softly");
  });

  it("handles shots with !! prefix", () => {
    const res = analyzeFountainLine("CLOSE UP ON GUN", { type: LineType.shot });
    expect(res.isTranslatable).toBe(true);
    expect(res.prefix).toBe("!!");
    expect(res.cleanText).toBe("CLOSE UP ON GUN");
  });

  it("handles synopsis lines with = prefix", () => {
    const res = analyzeFountainLine("= John arrives in London", { type: LineType.synopse });
    expect(res.isTranslatable).toBe(true);
    expect(res.prefix).toBe("=");
    expect(res.cleanText).toBe("John arrives in London");
  });

  it("marks section headers and page breaks as non-translatable", () => {
    const sectionRes = analyzeFountainLine("# Act 1", { type: LineType.section });
    expect(sectionRes.isTranslatable).toBe(false);

    const breakRes = analyzeFountainLine("===", { type: LineType.pageBreak });
    expect(breakRes.isTranslatable).toBe(false);
  });
});

describe("parseBatchResponse", () => {
  it("parses pipe-delimited numbered lines", () => {
    const raw = `
1|First line of dialogue
2|Second line of dialogue
3|Third line of dialogue
`.trim();
    const map = parseBatchResponse(raw);
    expect(map.size).toBe(3);
    expect(map.get(1)).toBe("First line of dialogue");
    expect(map.get(2)).toBe("Second line of dialogue");
    expect(map.get(3)).toBe("Third line of dialogue");
  });

  it("parses bracketed and dot-numbered lines", () => {
    const raw = `
[1] Line one
2. Line two
3: Line three
4) Line four
Line 5: Line five
#6. Line six
`.trim();
    const map = parseBatchResponse(raw);
    expect(map.get(1)).toBe("Line one");
    expect(map.get(2)).toBe("Line two");
    expect(map.get(3)).toBe("Line three");
    expect(map.get(4)).toBe("Line four");
    expect(map.get(5)).toBe("Line five");
    expect(map.get(6)).toBe("Line six");
  });

  it("strips <think>...</think> reasoning blocks", () => {
    const raw = `
<think>
1. We need to translate line 1 carefully.
2. Line 2 has tricky colloquial terms.
</think>
1|Translated line 1
2|Translated line 2
`.trim();
    const map = parseBatchResponse(raw);
    expect(map.size).toBe(2);
    expect(map.get(1)).toBe("Translated line 1");
    expect(map.get(2)).toBe("Translated line 2");
  });

  it("strips markdown code fences", () => {
    const raw = "```text\n1|Translated line 1\n2|Translated line 2\n```";
    const map = parseBatchResponse(raw);
    expect(map.size).toBe(2);
    expect(map.get(1)).toBe("Translated line 1");
    expect(map.get(2)).toBe("Translated line 2");
  });

  it("accumulates multi-line continuation responses", () => {
    const raw = `
1|This is an action sentence.
This is the continuation of the action sentence.
2|Second line.
`.trim();
    const map = parseBatchResponse(raw);
    expect(map.size).toBe(2);
    expect(map.get(1)).toBe("This is an action sentence. This is the continuation of the action sentence.");
    expect(map.get(2)).toBe("Second line.");
  });

  it("ignores safety and moderation disclaimers", () => {
    const raw = `
Safety: Content is safe for viewing.
1|Normal text
`.trim();
    const map = parseBatchResponse(raw);
    expect(map.size).toBe(1);
    expect(map.get(1)).toBe("Normal text");
  });
});

describe("pLimit", () => {
  it("limits concurrent tasks and finishes all tasks", async () => {
    let running = 0;
    let maxRunning = 0;

    const tasks = Array.from({ length: 8 }, (_, i) => async () => {
      running++;
      if (running > maxRunning) maxRunning = running;
      await new Promise((r) => setTimeout(r, 20));
      running--;
      return i * 2;
    });

    const results = await pLimit(3, tasks);
    expect(maxRunning).toBeLessThanOrEqual(3);
    expect(results).toEqual([0, 2, 4, 6, 8, 10, 12, 14]);
  });
});

describe("runTranslationJob", () => {
  it("translates all translatable lines in batches and updates script content", async () => {
    const script = `
INT. DINER - NIGHT

JOHN
Hello Sarah.

SARAH
(smiling)
Good to see you.

John sits down and opens his menu.
`.trim();

    const parsedDoc = parseScreenplay(script);
    const rawLines = script.split(/\r?\n/);
    const analyzedLines = rawLines.map((l, i) => analyzeFountainLine(l, parsedDoc.lines[i]));

    let updatedContent = "";
    const updateFileScriptContent = vi.fn((fileId, scriptIndex, content) => {
      updatedContent = content;
    });

    const setAiStatus = vi.fn();
    const setTranslationState = vi.fn();
    const setTranslatingTarget = vi.fn();
    const setTranslationJob = vi.fn();
    const setIsTranslationModalOpen = vi.fn();
    const registerTranslationAbort = vi.fn();

    const mockPromptConfig: any = {
      provider: "mock",
      translateLanguages: ["Spanish"],
    };

    await runTranslationJob({
      lang: "Spanish",
      promptConfig: mockPromptConfig,
      sourceScriptName: "TestScript.fountain",
      duplicatedName: "TestScript-Spanish",
      targetFileId: "file-1",
      targetScriptIndex: 1,
      lines: rawLines,
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
        getTranslationState: () => "running",
      },
    });

    expect(updateFileScriptContent).toHaveBeenCalled();
    expect(updatedContent).toContain(".INT. DINER - NIGHT");
    expect(updatedContent).toContain("@JOHN");
    expect(updatedContent).toContain("@SARAH");
  });

  it("translates only specified retryIndices when retryIndices is provided", async () => {
    const script = `
JOHN
Line one.

SARAH
Line two.
`.trim();

    const parsedDoc = parseScreenplay(script);
    const rawLines = script.split(/\r?\n/);
    const analyzedLines = rawLines.map((l, i) => analyzeFountainLine(l, parsedDoc.lines[i]));

    let updatedContent = "";
    const updateFileScriptContent = vi.fn((fileId, scriptIndex, content) => {
      updatedContent = content;
    });

    const setTranslationJob = vi.fn();

    const mockPromptConfig: any = {
      provider: "mock",
      translateLanguages: ["French"],
    };

    await runTranslationJob({
      lang: "French",
      promptConfig: mockPromptConfig,
      sourceScriptName: "TestScript.fountain",
      duplicatedName: "TestScript-French",
      targetFileId: "file-1",
      targetScriptIndex: 1,
      lines: rawLines,
      analyzedLines,
      parsedDoc,
      retryIndices: [1], // Only retry "Line one."
      updateFileScriptContent,
      uiActions: {
        setAiStatus: vi.fn(),
        setTranslationState: vi.fn(),
        setTranslatingTarget: vi.fn(),
        setTranslationJob,
        setIsTranslationModalOpen: vi.fn(),
        registerTranslationAbort: vi.fn(),
        getTranslationState: () => "running",
      },
    });

    expect(updateFileScriptContent).toHaveBeenCalled();
    expect(updatedContent).toContain("[ES] Line one.");
  });
});

