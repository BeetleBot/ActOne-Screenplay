import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseScreenplay } from "../parser";
import { screenplayContext, estimateUrAITokens, loadNativeSessions, nativeChat, nativeTransform, resolveNativeSceneFocus, saveNativeSessions } from "./urai";
import { screenplaySources } from "./uraiSources";
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
  it("uses the revision from Rust to commit and serialize queued history saves", async () => {
    vi.stubGlobal("__TAURI_INTERNALS__", {});
    try {
      const key = "rewrite-v1::revision-fixture";
      invoke.mockResolvedValueOnce({ sessions: [], revision: "initial" });
      await expect(loadNativeSessions(key)).resolves.toEqual([]);
      invoke.mockResolvedValueOnce("first").mockResolvedValueOnce("second");
      await Promise.all([saveNativeSessions(key, [{ id: "one" }]), saveNativeSessions(key, [{ id: "two" }])]);
      expect(invoke).toHaveBeenNthCalledWith(2, "urai_save_sessions", { key, sessions: [{ id: "one" }], expectedRevision: "initial" });
      expect(invoke).toHaveBeenNthCalledWith(3, "urai_save_sessions", { key, sessions: [{ id: "two" }], expectedRevision: "first" });
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("passes scene references to the local resolver without duplicating screenplay text", async () => {
    const scenes = screenplaySources(parseScreenplay("INT. ROOM - DAY #16#\n\nMaya leaves."));
    invoke.mockResolvedValueOnce([1]);
    await expect(resolveNativeSceneFocus("Read the 16th scene", scenes, 1, [])).resolves.toEqual([1]);
    expect(invoke).toHaveBeenCalledWith("urai_resolve_scene_focus", {
      query: "Read the 16th scene", cursorLine: 1, previous: [],
      scenes: [{ id: 1, label: "16", heading: "INT. ROOM - DAY #16#", explicitLabel: true, startLine: 1, endLine: 3 }],
    });
  });
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
  it("projects the completed Rust turn from the command response", async () => {
    const onTurn = vi.fn();
    const turn = { status: "completed", content: "Answer", toolCalls: [], sources: [], tokens: 2 };
    invoke.mockResolvedValueOnce({ text: "<think>notes</think>Answer", inputTokens: 10, outputTokens: 2, finishReason: "stop", turn });
    await nativeChat(config, [{ role: "user", content: "Hello" }], { instructions: "Help", compactHistory: true, onTurn });
    expect(listen).toHaveBeenCalledOnce();
    expect(listen).toHaveBeenCalledWith("urai-turn", expect.any(Function));
    expect(onTurn).toHaveBeenCalledWith(turn);
  });
  it("does not submit an already cancelled transformation", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(nativeTransform(config, "translate", [], { signal: controller.signal })).rejects.toThrow("Aborted");
    expect(invoke).not.toHaveBeenCalled();
  });
});
