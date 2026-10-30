import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAIChat, extractThinkingAndClean } from "./useAIChat";

// Mock dependencies
vi.mock("./usePromptConfig", () => ({
  usePromptConfig: () => ({
    provider: "ollama",
    model: "gemma:2b",
    systemPrompt: "Custom UrAI System Prompt",
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

vi.mock("../lib/urai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/urai")>()),
  loadNativeSessions: vi.fn(async () => null),
  saveNativeSessions: vi.fn(async () => undefined),
  nativeChat: vi.fn(async (_config, _messages, options) => {
    options?.onChunk?.("Hello from UrAI!");
    return { text: "Hello from UrAI!", inputTokens: 12, outputTokens: 5, finishReason: "stop" };
  }),
}));

describe("useAIChat (UrAI Chat Hook)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("initializes with default session", () => {
    const { result } = renderHook(() => useAIChat(() => null, null, "file-1"));

    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.sessions[0].title).toBe("New Conversation");
    expect(result.current.turns).toEqual([]);
    expect(result.current.streaming).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("creates a new session and switches to it", async () => {
    const { result } = renderHook(() => useAIChat(() => null, null, "file-1"));

    await act(async () => {});
    const firstId = result.current.activeSessionId;

    await act(async () => {});
    act(() => {
      result.current.newSession();
    });

    expect(result.current.sessions).toHaveLength(2);
    expect(result.current.activeSessionId).not.toBe(firstId);
    expect(result.current.turns).toEqual([]);
  });

  it("selects an existing session", async () => {
    const { result } = renderHook(() => useAIChat(() => null, null, "file-1"));

    await act(async () => {});
    const firstId = result.current.activeSessionId;

    await act(async () => {});
    act(() => {
      result.current.newSession();
    });

    const secondId = result.current.activeSessionId;
    expect(secondId).not.toBe(firstId);

    act(() => {
      result.current.selectSession(firstId);
    });

    expect(result.current.activeSessionId).toBe(firstId);
  });

  it("deletes a session", async () => {
    const { result } = renderHook(() => useAIChat(() => null, null, "file-1"));

    await act(async () => {});
    act(() => {
      result.current.newSession();
    });

    expect(result.current.sessions).toHaveLength(2);
    const idToDelete = result.current.sessions[0].id;

    act(() => {
      result.current.deleteSession(idToDelete);
    });

    expect(result.current.sessions).toHaveLength(1);
  });

  it("recreates a session if the last one is deleted", async () => {
    const { result } = renderHook(() => useAIChat(() => null, null, "file-1"));

    await act(async () => {});
    const initialId = result.current.sessions[0].id;

    act(() => {
      result.current.deleteSession(initialId);
    });

    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.sessions[0].id).not.toBe(initialId);
  });

  it("sends message and appends turns", async () => {
    const { result } = renderHook(() => useAIChat(() => null, null, "file-1"));

    await act(async () => {});
    await act(async () => {
      await result.current.send("Hello UrAI!", "Hello UrAI!");
    });

    expect(result.current.turns).toHaveLength(2);
    expect(result.current.turns[0].role).toBe("user");
    expect(result.current.turns[1].role).toBe("assistant");
    expect(result.current.turns[1].content).toBe("Hello from UrAI!");
  });

  describe("extractThinkingAndClean", () => {
    it("strips completed think tags and returns clean content", () => {
      const input = "<think>Analyzing screenplay</think>Here is the answer.";
      const res = extractThinkingAndClean(input);
      expect(res.thinking).toBe("Analyzing screenplay");
      expect(res.cleanContent).toBe("Here is the answer.");
    });

    it("strips in-progress unclosed think tags during streaming", () => {
      const input = "<think>Analyzing screenplay in progress...";
      const res = extractThinkingAndClean(input);
      expect(res.thinking).toBe("Analyzing screenplay in progress...");
      expect(res.cleanContent).toBe("");
    });
  });
});

describe("UrAI sharing provenance", () => {
  it("does not resend earlier turns when sharing changes", async () => {
    localStorage.clear();
    const { nativeChat } = await import("../lib/urai");
    vi.mocked(nativeChat).mockClear();
    const { result, rerender } = renderHook(({ selection }) => useAIChat(() => null, null, "scope-test", undefined, undefined, undefined, undefined, "script", {
      context: { scope: "selection", scenes: [], sceneIds: [], selection }, contextTokens: 8192,
    }), { initialProps: { selection: "first shared excerpt" } });
    await act(async () => {});
    await act(async () => { await result.current.send("Question one"); });
    await act(async () => { await result.current.send("Question two"); });
    expect(vi.mocked(nativeChat).mock.calls[1][1]).toHaveLength(3);
    rerender({ selection: "different excerpt" });
    await act(async () => { await result.current.send("New scope question"); });
    expect(vi.mocked(nativeChat).mock.calls[2][1]).toEqual([{ role: "user", content: "New scope question" }]);
  });
});
