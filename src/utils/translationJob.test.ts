import { describe, it, expect, vi, beforeEach } from "vitest";
import { runTranslationJob, analyzeFountainLine } from "./translationEngine";
import { parseScreenplay } from "../parser";
const { invoke, listener } = vi.hoisted(() => ({
  invoke: vi.fn(),
  listener: { current: null as null | ((event: { payload: unknown }) => void) },
}));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async (_name, callback) => {
    listener.current = callback;
    return vi.fn();
  }),
}));
vi.mock("../lib/urai", async (original) => ({
  ...(await original<typeof import("../lib/urai")>()),
  isUrAIDesktop: () => true,
}));
beforeEach(() => {
  invoke.mockReset();
});
describe("native translation job integration", () => {
  function params() {
    const lines = ["INT. ROOM - DAY", "", "JOHN", "Hello there."];
    const parsedDoc = parseScreenplay(lines.join("\n"));
    return {
      lang: "Tamil",
      promptConfig: {
        provider: "ollama",
        model: "test",
        ollamaUrl: "http://localhost:11434",
        apiKey: "",
        translatePrompt: "natural",
        translateTemp: 0.2,
      } as never,
      sourceScriptName: "source",
      duplicatedName: "Tamil",
      targetFileId: "file",
      targetScriptIndex: 1,
      lines,
      analyzedLines: lines.map((l, i) => analyzeFountainLine(l, parsedDoc.lines[i])),
      parsedDoc,
      updateFileScriptContent: vi.fn(),
      uiActions: {
        setAiStatus: vi.fn(),
        setTranslationState: vi.fn(),
        setTranslatingTarget: vi.fn(),
        setTranslationJob: vi.fn(),
        setIsTranslationModalOpen: vi.fn(),
        registerTranslationAbort: vi.fn(),
        getTranslationState: () => "running",
      },
    };
  }
  it("sends original stable work ids and keeps the source untouched", async () => {
    const p = params();
    invoke.mockImplementation(async (name, args) => {
      expect(name).toBe("urai_run_job");
      const job = args.request.job;
      expect(job.items.map((i: { element: { id: string } }) => i.element.id)).toEqual(["line-3"]);
      expect(job.temperature).toBe(0.2);
      const result = {
        ...job,
        lines: [...job.lines.slice(0, 3), "வணக்கம்"],
        completed: ["line-3"],
        failed: [],
        status: "completed",
      };
      listener.current?.({ payload: result });
      return result;
    });
    await runTranslationJob(p);
    expect(p.lines[3]).toBe("Hello there.");
    expect(p.updateFileScriptContent).toHaveBeenLastCalledWith("file", 1, expect.stringContaining("வணக்கம்"), "Tamil");
    expect(p.uiActions.registerTranslationAbort).toHaveBeenLastCalledWith(null);
  });
  it("rejects resume if a writer edited the translation target", async () => {
    const p = params();
    invoke.mockResolvedValueOnce({ lines: ["different checkpoint"] });
    await runTranslationJob({ ...p, nativeJobId: "saved-job" });
    expect(p.uiActions.setAiStatus).toHaveBeenCalledWith(expect.stringContaining("target changed"));
    expect(p.updateFileScriptContent).not.toHaveBeenCalled();
  });
});
