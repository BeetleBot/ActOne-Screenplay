import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseScreenplay } from "../parser";
import { screenplayContext, estimateUrAITokens, nativeChat, nativeTransform } from "./urai";
import type { PromptConfig } from "../hooks/usePromptConfig";
const { invoke, listen } = vi.hoisted(() => ({ invoke: vi.fn(), listen: vi.fn(async () => vi.fn()) }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));
vi.mock("@tauri-apps/api/event", () => ({ listen }));
const config = {
  provider: "ollama",
  model: "test",
  ollamaUrl: "http://localhost:11434",
  apiKey: "",
  translateTemp: 0.1,
  rephraseTemp: 0.2,
} as PromptConfig;
beforeEach(() => vi.clearAllMocks());
describe("UrAI boundary", () => {
  it("only includes explicitly selected scenes", () => {
    const doc = parseScreenplay("INT. ROOM - DAY\n\nPublic.\n\nEXT. SECRET - NIGHT\n\nSecret.");
    const selected = screenplayContext(doc, "scene", [1]);
    expect(JSON.stringify(selected)).toContain("Public.");
    expect(JSON.stringify(selected)).not.toContain("Secret.");
    expect(screenplayContext(doc, "none", []).scenes).toEqual([]);
  });
  it("selection scope never includes scene text", () => {
    const doc = parseScreenplay("INT. ROOM - DAY\n\nSecret.");
    expect(screenplayContext(doc, "selection", [], "chosen")).toEqual({
      scope: "selection",
      scenes: [],
      sceneIds: [],
      selection: "chosen",
    });
  });
  it("counts multilingual text more conservatively than ASCII", () => {
    expect(estimateUrAITokens("வணக்கம்")).toBeGreaterThan(estimateUrAITokens("hello!!"));
  });
  it("sends native chat and releases its listener", async () => {
    const unlisten = vi.fn();
    listen.mockResolvedValueOnce(unlisten);
    invoke.mockResolvedValueOnce({ text: "answer", inputTokens: 9, outputTokens: 2, finishReason: "stop" });
    expect((await nativeChat(config, [{ role: "user", content: "Hello" }], { instructions: "Help" })).text).toBe(
      "answer",
    );
    expect(invoke).toHaveBeenCalledWith(
      "urai_chat",
      expect.objectContaining({
        request: expect.objectContaining({ context: expect.objectContaining({ scope: "none" }) }),
      }),
    );
    expect(unlisten).toHaveBeenCalledOnce();
  });
  it("does not submit an already cancelled transformation", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(nativeTransform(config, "translate", [], { signal: controller.signal })).rejects.toThrow("Aborted");
    expect(invoke).not.toHaveBeenCalled();
  });
});
