import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAIChat } from "./useAIChat";

// Mock dependencies
vi.mock("./usePromptConfig", () => ({
  usePromptConfig: () => ({
    activeProvider: "ollama",
    ollamaModel: "gemma:2b",
    systemPrompt: "Custom Muse System Prompt",
    chatTemp: 0.7,
  }),
}));

vi.mock("../context", () => ({
  useUI: () => ({
    setAiStatus: vi.fn(),
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
      useAIChat(() => "INT. COFFEE SHOP - DAY", null, "file-1")
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
      useAIChat(() => "INT. OFFICE - DAY", null, "file-1")
    );

    await act(async () => {
      await result.current.send("Hello Muse!", "Hello Muse!", "chat");
    });

    expect(result.current.turns).toHaveLength(2);
    expect(result.current.turns[0].role).toBe("user");
    expect(result.current.turns[1].role).toBe("assistant");
    expect(result.current.turns[1].content).toBe("Hello from Muse!");
  });
});
