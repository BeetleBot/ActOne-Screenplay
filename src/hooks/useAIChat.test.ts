import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAIChat, parseToolCall, extractThinkingAndClean } from "./useAIChat";

// Mock dependencies
vi.mock("./usePromptConfig", () => ({
  usePromptConfig: () => ({
    activeProvider: "ollama",
    ollamaModel: "gemma:2b",
    systemPrompt: "Custom Muse System Prompt",
    chatTemp: 0.7,
  }),
  getActiveModelName: () => "gemma:2b",
}));

vi.mock("../context", () => ({
  useUI: () => ({
    setAiStatus: vi.fn(),
    registerTranslationAbort: vi.fn(),
  }),
}));

vi.mock("../lib/aiProviders", () => ({
  createAIProvider: vi.fn(() => ({
    chat: vi.fn(async (_messages, options) => {
      options?.onChunk?.("Hello from Muse!");
      return "Hello from Muse!";
    }),
  })),
}));

describe("useAIChat (Muse Agent Hook)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("initializes with default session and empty turns", () => {
    const { result } = renderHook(() =>
      useAIChat(() => null, null, "file-1")
    );

    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.sessions[0].title).toBe("New Conversation");
    expect(result.current.turns).toEqual([]);
  });

  it("creates a new session", () => {
    const { result } = renderHook(() =>
      useAIChat(() => null, null, "file-1")
    );

    act(() => {
      result.current.newSession();
    });

    expect(result.current.sessions).toHaveLength(2);
  });

  it("clears current active session turns", () => {
    const { result } = renderHook(() =>
      useAIChat(() => null, null, "file-1")
    );

    act(() => {
      result.current.send("Hello Muse!");
    });

    act(() => {
      result.current.clear();
    });

    expect(result.current.turns).toEqual([]);
  });

  it("deletes a session when multiple exist", () => {
    const { result } = renderHook(() =>
      useAIChat(() => null, null, "file-1")
    );

    const initialId = result.current.sessions[0].id;
    act(() => {
      vi.spyOn(Date, "now").mockReturnValueOnce(1234567890123);
      result.current.newSession();
    });

    expect(result.current.sessions).toHaveLength(2);
    act(() => {
      result.current.deleteSession(initialId);
    });

    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.sessions[0].id).not.toBe(initialId);
  });

  it("sends message and appends turns", async () => {
    const { result } = renderHook(() =>
      useAIChat(() => null, null, "file-1")
    );

    await act(async () => {
      await result.current.send("Hello Muse!", "Hello Muse!");
    });

    expect(result.current.turns).toHaveLength(2);
    expect(result.current.turns[0].role).toBe("user");
    expect(result.current.turns[1].role).toBe("assistant");
    expect(result.current.turns[1].content).toBe("Hello from Muse!");
  });

  describe("parseToolCall", () => {
    it("parses standard ```tool_call markdown blocks", () => {
      const input = "```tool_call\n{\"name\": \"replace_scene\", \"args\": {\"sceneNumber\": 59, \"newFountainText\": \"INT. RING\"}}\n```";
      const res = parseToolCall(input);
      expect(res).toEqual({
        name: "replace_scene",
        args: { sceneNumber: 59, newFountainText: "INT. RING" },
      });
    });

    it("parses loose pseudo-code tool_call replace_scene{scene_id:59, new_text: \"INT. RING\"}", () => {
      const input = 'tool_call replace_scene{scene_id:59, new_text:"INT. RING"}';
      const res = parseToolCall(input);
      expect(res).toEqual({
        name: "replace_scene",
        args: { scene_id: 59, new_text: "INT. RING" },
      });
    });

    it("parses bare JSON objects containing name and args", () => {
      const input = '{"name": "search_script", "args": {"query": "stars"}}';
      const res = parseToolCall(input);
      expect(res).toEqual({
        name: "search_script",
        args: { query: "stars" },
      });
    });
  });

  describe("extractThinkingAndClean", () => {
    it("strips completed <think> tags and returns clean content", () => {
      const input = "<think>Analyzing screenplay</think>Here is the answer.";
      const res = extractThinkingAndClean(input);
      expect(res.thinking).toBe("Analyzing screenplay");
      expect(res.cleanContent).toBe("Here is the answer.");
    });

    it("strips in-progress/unclosed <think> tags during streaming", () => {
      const input = "<think>Analyzing screenplay in progress...";
      const res = extractThinkingAndClean(input);
      expect(res.thinking).toBe("Analyzing screenplay in progress...");
      expect(res.cleanContent).toBe("");
    });

    it("strips completed ```tool_call blocks", () => {
      const input = "I will search.\n```tool_call\n{\"name\": \"search_script\"}\n```\nDone.";
      const res = extractThinkingAndClean(input);
      expect(res.cleanContent).toBe("I will search.\n\nDone.");
    });

    it("strips in-progress/unclosed ```tool_call blocks during streaming", () => {
      const input = "Let me check.\n```tool_call\n{\"name\": \"search_script\", \"args\": {";
      const res = extractThinkingAndClean(input);
      expect(res.cleanContent).toBe("Let me check.");
    });
  });
});
