import { describe, it, expect, vi } from "vitest";
import { LineType, parseScreenplay } from "../parser";
import {
  analyzeFountainLine,
  segmentIntoScenes,
  runTranslationJob,
  getLineContextLabel,
} from "./translationEngine";

vi.mock("../lib/aiProviders", () => ({
  RateLimitError: class RateLimitError extends Error {
    public retryAfterSec: number;
    constructor(message: string, retryAfterSec: number) {
      super(message);
      this.name = "RateLimitError";
      this.retryAfterSec = retryAfterSec;
    }
  },
  createAIProvider: vi.fn(() => ({
    chat: vi.fn(async (messages, options) => {
      const userMsg = messages.find((m: any) => m.role === "user")?.content || "";
      // Pre-flight check
      if (userMsg.includes("Translate to English: Hello")) {
        return "Hello";
      }

      // Extract lines after the --- marker
      const markerIdx = userMsg.indexOf("---");
      const lines = markerIdx !== -1 ? userMsg.slice(markerIdx + 3).trim().split("\n") : userMsg.split("\n");
      const translated = lines
        .map((l: string) => `[ES] ${l.replace(/^\[[^\]]+\]\s*/, "").trim()}`)
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

describe("getLineContextLabel", () => {
  it("labels dialogue with the speaker character name", () => {
    const script = `
JOHN
Hello there!
`.trim();
    const parsed = parseScreenplay(script);
    // line 0 is JOHN (character), line 1 is "Hello there!" (dialogue)
    const label = getLineContextLabel(1, parsed.lines);
    expect(label).toBe("[Dialogue: JOHN]");
  });

  it("labels action lines as [Action]", () => {
    const script = `
He sits down slowly.
`.trim();
    const parsed = parseScreenplay(script);
    const label = getLineContextLabel(0, parsed.lines);
    expect(label).toBe("[Action]");
  });

  it("labels parentheticals as [Parenthetical]", () => {
    const script = `
JOHN
(whispering)
Don't look now.
`.trim();
    const parsed = parseScreenplay(script);
    const label = getLineContextLabel(1, parsed.lines);
    expect(label).toBe("[Parenthetical]");
  });
});

describe("segmentIntoScenes", () => {
  it("segments screenplay into individual scenes based on headings", () => {
    const script = `
INT. OFFICE - DAY

JOHN
Hello.

EXT. STREET - NIGHT

SARAH
Goodbye.
`.trim();

    const parsed = parseScreenplay(script);
    const rawLines = script.split(/\r?\n/);
    const analyzed = rawLines.map((l, i) => analyzeFountainLine(l, parsed.lines[i]));

    const scenes = segmentIntoScenes(analyzed, parsed.lines);
    expect(scenes.length).toBe(2);
    expect(scenes[0].heading).toContain("INT. OFFICE - DAY");
    expect(scenes[1].heading).toContain("EXT. STREET - NIGHT");
    expect(scenes[0].sceneIndex).toBe(0);
    expect(scenes[1].sceneIndex).toBe(1);
  });

  it("handles preamble before the first scene heading", () => {
    const script = `
An opening action line before any scene.

INT. CABIN - DAY

BOB
Welcome.
`.trim();

    const parsed = parseScreenplay(script);
    const rawLines = script.split(/\r?\n/);
    const analyzed = rawLines.map((l, i) => analyzeFountainLine(l, parsed.lines[i]));

    const scenes = segmentIntoScenes(analyzed, parsed.lines);
    expect(scenes.length).toBe(2);
    expect(scenes[0].heading).toBe("Preamble");
    expect(scenes[1].heading).toContain("INT. CABIN - DAY");
  });

  it("returns fallback chunk if no headings exist in the document", () => {
    const script = `
Just some action text.
And more action text.
`.trim();

    const parsed = parseScreenplay(script);
    const rawLines = script.split(/\r?\n/);
    const analyzed = rawLines.map((l, i) => analyzeFountainLine(l, parsed.lines[i]));

    const scenes = segmentIntoScenes(analyzed, parsed.lines);
    expect(scenes.length).toBe(1);
    expect(scenes[0].heading).toBe("Document");
  });

  it("adaptively splits very long scenes into numbered parts", () => {
    // Generate a scene with 45 translatable lines
    let script = "INT. LONG SCENE - DAY\n\n";
    for (let i = 0; i < 45; i++) {
      script += `CHARACTER_${i % 3}\nLine number ${i}.\n\n`;
    }

    const parsed = parseScreenplay(script.trim());
    const rawLines = script.trim().split(/\r?\n/);
    const analyzed = rawLines.map((l, i) => analyzeFountainLine(l, parsed.lines[i]));

    const scenes = segmentIntoScenes(analyzed, parsed.lines);
    expect(scenes.length).toBeGreaterThan(1);
    expect(scenes[0].partNumber).toBe(1);
    expect(scenes[0].totalParts).toBe(scenes.length);
    expect(scenes[1].partNumber).toBe(2);
  });
});

describe("runTranslationJob", () => {
  it("translates scene by scene and updates script content", async () => {
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
      provider: "openai-compatible",
      apiEndpoint: "https://api.mock.ai/v1",
      apiKey: "mock-key",
      model: "mock-model",
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
      customInstruction: "Make it colloquial",
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
    expect(updatedContent).toContain("[ES] Hello Sarah.");
    expect(updatedContent).toContain("[ES] Good to see you.");
  });

  it("retries only specified retrySceneIndices when provided", async () => {
    const script = `
INT. SCENE ONE - DAY

JOHN
Line one.

INT. SCENE TWO - NIGHT

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

    const mockPromptConfig: any = {
      provider: "openai-compatible",
      apiEndpoint: "https://api.mock.ai/v1",
      apiKey: "mock-key",
      model: "mock-model",
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
      retrySceneIndices: [1], // Only retry scene two
      updateFileScriptContent,
      uiActions: {
        setAiStatus: vi.fn(),
        setTranslationState: vi.fn(),
        setTranslatingTarget: vi.fn(),
        setTranslationJob: vi.fn(),
        setIsTranslationModalOpen: vi.fn(),
        registerTranslationAbort: vi.fn(),
        getTranslationState: () => "running",
      },
    });

    expect(updateFileScriptContent).toHaveBeenCalled();
    expect(updatedContent).toContain("[ES] Line two.");
  });

  it("strips AI-generated bullet dashes (- ) from translations when original had none", async () => {
    const script = `
INT. PARK - DAY

JOHN
Are you sure?
`.trim();

    const parsedDoc = parseScreenplay(script);
    const rawLines = script.split(/\r?\n/);
    const analyzedLines = rawLines.map((l, i) => analyzeFountainLine(l, parsedDoc.lines[i]));

    let updatedContent = "";
    const updateFileScriptContent = vi.fn((fileId, scriptIndex, content) => {
      updatedContent = content;
    });

    const mockPromptConfig: any = {
      provider: "openai-compatible",
      apiEndpoint: "https://api.mock.ai/v1",
      apiKey: "mock-key",
      model: "mock-model",
      translateLanguages: ["Spanish"],
    };

    // Mock provider returning a dash bullet list
    const { createAIProvider } = await import("../lib/aiProviders");
    vi.mocked(createAIProvider).mockReturnValue({
      chat: vi.fn(async (messages) => {
        const userMsg = messages.find((m: any) => m.role === "user")?.content || "";
        if (userMsg.includes("Translate to English: Hello")) return "Hello";
        return "- ¿Estás seguro?";
      }),
    } as any);

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
        setAiStatus: vi.fn(),
        setTranslationState: vi.fn(),
        setTranslatingTarget: vi.fn(),
        setTranslationJob: vi.fn(),
        setIsTranslationModalOpen: vi.fn(),
        registerTranslationAbort: vi.fn(),
        getTranslationState: () => "running",
      },
    });

    expect(updateFileScriptContent).toHaveBeenCalled();
    // It should NOT contain "- ¿Estás seguro?", it should be clean "¿Estás seguro?"
    expect(updatedContent).toContain("¿Estás seguro?");
    expect(updatedContent).not.toContain("- ¿Estás seguro?");
  });

  it("strips echoed character name prefixes (@RADIO: or RADIO:) from dialogue lines", async () => {
    const script = `
INT. COCKPIT - DAY

@RADIO (O.S.)
Incoming transmission.

@PILOT
I will handle it.
`.trim();

    const parsedDoc = parseScreenplay(script);
    const rawLines = script.split(/\r?\n/);
    const analyzedLines = rawLines.map((l, i) => analyzeFountainLine(l, parsedDoc.lines[i]));

    let updatedContent = "";
    const updateFileScriptContent = vi.fn((fileId, scriptIndex, content) => {
      updatedContent = content;
    });

    const mockPromptConfig: any = {
      provider: "openai-compatible",
      apiEndpoint: "https://api.mock.ai/v1",
      apiKey: "mock-key",
      model: "mock-model",
      translateLanguages: ["Tamil"],
    };

    const { createAIProvider } = await import("../lib/aiProviders");
    vi.mocked(createAIProvider).mockReturnValue({
      chat: vi.fn(async (messages) => {
        const userMsg = messages.find((m: any) => m.role === "user")?.content || "";
        if (userMsg.includes("Translate to English: Hello")) return "Hello";
        // Simulate LLM returning character prefixes in dialogue
        return "@RADIO: கம்ப்யூட்டர் செய்தி.\n@PILOT: நான் சமாளிப்பேன்.";
      }),
    } as any);

    await runTranslationJob({
      lang: "Tamil",
      promptConfig: mockPromptConfig,
      sourceScriptName: "TestScript.fountain",
      duplicatedName: "TestScript-Tamil",
      targetFileId: "file-1",
      targetScriptIndex: 1,
      lines: rawLines,
      analyzedLines,
      parsedDoc,
      updateFileScriptContent,
      uiActions: {
        setAiStatus: vi.fn(),
        setTranslationState: vi.fn(),
        setTranslatingTarget: vi.fn(),
        setTranslationJob: vi.fn(),
        setIsTranslationModalOpen: vi.fn(),
        registerTranslationAbort: vi.fn(),
        getTranslationState: () => "running",
      },
    });

    expect(updateFileScriptContent).toHaveBeenCalled();
    // Dialogue lines should not have @RADIO: or @PILOT:
    expect(updatedContent).toContain("கம்ப்யூட்டர் செய்தி.");
    expect(updatedContent).not.toContain("@RADIO: கம்ப்யூட்டர் செய்தி.");
    expect(updatedContent).toContain("நான் சமாளிப்பேன்.");
    expect(updatedContent).not.toContain("@PILOT: நான் சமாளிப்பேன்.");
  });

  it("strips stray @ before character names mentioned in action or dialogue body", async () => {
    const script = `COOPER
Cooper, are you ready?

Cooper walks towards the airlock.`;

    const parsedDoc = parseScreenplay(script);
    const rawLines = script.split("\n");
    const analyzedLines = rawLines.map((l, i) => {
      const an = analyzeFountainLine(l, parsedDoc.lines[i]);
      return { ...an, isTranslatable: parsedDoc.lines[i]?.type !== LineType.character };
    });

    let updatedContent = "";
    const updateFileScriptContent = vi.fn((_fid, _idx, content) => {
      updatedContent = content;
    });

    const mockPromptConfig: any = {
      provider: "openai-compatible",
      apiEndpoint: "https://api.mock.ai/v1",
      apiKey: "mock-key",
      model: "mock-model",
      translateLanguages: ["Tamil"],
    };

    const { createAIProvider } = await import("../lib/aiProviders");
    vi.mocked(createAIProvider).mockReturnValue({
      chat: vi.fn(async (messages) => {
        const userMsg = messages.find((m: any) => m.role === "user")?.content || "";
        if (userMsg.includes("Translate to English: Hello")) return "Hello";
        // Model echoed @ before Cooper in dialogue and action
        return "@Cooper, நீங்கள் தயாரா?\n!@Cooper காற்று பூட்டை நோக்கி நடக்கிறார்.";
      }),
    } as any);

    await runTranslationJob({
      lang: "Tamil",
      promptConfig: mockPromptConfig,
      sourceScriptName: "TestScript.fountain",
      duplicatedName: "TestScript-Tamil",
      targetFileId: "file-1",
      targetScriptIndex: 1,
      lines: rawLines,
      analyzedLines,
      parsedDoc,
      updateFileScriptContent,
      uiActions: {
        setAiStatus: vi.fn(),
        setTranslationState: vi.fn(),
        setTranslatingTarget: vi.fn(),
        setTranslationJob: vi.fn(),
        setIsTranslationModalOpen: vi.fn(),
        registerTranslationAbort: vi.fn(),
        getTranslationState: () => "running",
      },
    });

    expect(updateFileScriptContent).toHaveBeenCalled();
    // Character cue line should keep @
    expect(updatedContent).toContain("@COOPER");
    // Dialogue and action lines should have @ stripped from Cooper
    expect(updatedContent).toContain("Cooper, நீங்கள் தயாரா?");
    expect(updatedContent).not.toContain("@Cooper, நீங்கள் தயாரா?");
    expect(updatedContent).toContain("!Cooper காற்று பூட்டை நோக்கி நடக்கிறார்.");
    expect(updatedContent).not.toContain("!@Cooper");
  });

  it("strips quotation marks from dialogue, parentheses from action, and foreign glyphs", async () => {
    const script = `COOPER
Hello there.

Cooper enters the room.`;

    const parsedDoc = parseScreenplay(script);
    const rawLines = script.split("\n");
    const analyzedLines = rawLines.map((l, i) => {
      const an = analyzeFountainLine(l, parsedDoc.lines[i]);
      return { ...an, isTranslatable: parsedDoc.lines[i]?.type !== LineType.character };
    });

    let updatedContent = "";
    const updateFileScriptContent = vi.fn((_fid, _idx, content) => {
      updatedContent = content;
    });

    const mockPromptConfig: any = {
      provider: "openai-compatible",
      apiEndpoint: "https://api.mock.ai/v1",
      apiKey: "mock-key",
      model: "mock-model",
      translateLanguages: ["Tamil"],
    };

    const { createAIProvider } = await import("../lib/aiProviders");
    vi.mocked(createAIProvider).mockReturnValue({
      chat: vi.fn(async (messages) => {
        const userMsg = messages.find((m: any) => m.role === "user")?.content || "";
        if (userMsg.includes("Translate to English: Hello")) return "Hello";
        // Model returned dialogue in quotes with accidental Japanese glyph (日), and action wrapped in ( ) with Telugu glyph (క)
        return `"வணக்கம் நண்பா.日"\n!(கூப்பர் அறைக்குள் நுழைகிறார்.క)`;
      }),
    } as any);

    await runTranslationJob({
      lang: "Tamil",
      promptConfig: mockPromptConfig,
      sourceScriptName: "TestScript.fountain",
      duplicatedName: "TestScript-Tamil",
      targetFileId: "file-1",
      targetScriptIndex: 1,
      lines: rawLines,
      analyzedLines,
      parsedDoc,
      updateFileScriptContent,
      uiActions: {
        setAiStatus: vi.fn(),
        setTranslationState: vi.fn(),
        setTranslatingTarget: vi.fn(),
        setTranslationJob: vi.fn(),
        setIsTranslationModalOpen: vi.fn(),
        registerTranslationAbort: vi.fn(),
        getTranslationState: () => "running",
      },
    });

    expect(updateFileScriptContent).toHaveBeenCalled();
    // Quotes and Japanese glyph should be stripped from dialogue
    expect(updatedContent).toContain("வணக்கம் நண்பா.");
    expect(updatedContent).not.toContain('"வணக்கம் நண்பா."');
    expect(updatedContent).not.toContain("日");
    // Outer parentheses and Telugu glyph should be stripped from action
    expect(updatedContent).toContain("!கூப்பர் அறைக்குள் நுழைகிறார்.");
    expect(updatedContent).not.toContain("!(");
    expect(updatedContent).not.toContain("క");
  });
});
