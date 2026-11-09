import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useApiList, notifyApiListChange } from "./useApiList";
import { STORAGE_KEYS } from "../constants";
import * as cryptoStorage from "../utils/cryptoStorage";

vi.mock("../utils/cryptoStorage", () => ({
  decryptApiList: vi.fn((list) => Promise.resolve(list)),
  encryptApiList: vi.fn((list) => Promise.resolve(list)),
}));

vi.mock("./usePromptConfig", () => ({
  notifyConfigChange: vi.fn(),
}));

describe("useApiList hook", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    notifyApiListChange();
  });

  it("returns an empty array when no stored API list exists", () => {
    const { result } = renderHook(() => useApiList());
    expect(result.current).toEqual([]);
  });

  it("handles corrupted JSON gracefully", () => {
    localStorage.setItem(STORAGE_KEYS.PROMPT_API_LIST, "invalid-json{{");
    const { result } = renderHook(() => useApiList());
    expect(result.current).toEqual([]);
  });

  it("masks secure: tokens initially and resolves decrypted values", async () => {
    const rawList = [
      {
        id: "api-1",
        name: "OpenAI",
        provider: "openai",
        apiKey: "secure:v1:token123",
        models: ["gpt-4o"],
        enabled: true,
      },
      {
        id: "api-2",
        name: "Ollama",
        provider: "ollama",
        apiKey: "plain-token",
        models: ["llama3"],
        enabled: true,
      },
    ];
    localStorage.setItem(STORAGE_KEYS.PROMPT_API_LIST, JSON.stringify(rawList));

    vi.mocked(cryptoStorage.decryptApiList).mockResolvedValueOnce([
      { ...rawList[0], apiKey: "decrypted-token-123" },
      rawList[1],
    ]);

    const { result } = renderHook(() => useApiList());

    // Plain key is kept, secure: key is masked initially
    expect(result.current[1]?.apiKey).toBe("plain-token");
    expect(result.current[0]?.apiKey).toBe("");

    // Wait for decrypt resolution
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current[0]?.apiKey).toBe("decrypted-token-123");
  });

  it("notifies listeners and updates external store when notifyApiListChange is called", () => {
    const { result } = renderHook(() => useApiList());
    expect(result.current).toEqual([]);

    act(() => {
      localStorage.setItem(
        STORAGE_KEYS.PROMPT_API_LIST,
        JSON.stringify([{ id: "api-new", name: "Custom", provider: "custom", models: [] }]),
      );
      notifyApiListChange();
    });

    expect(result.current).toHaveLength(1);
    expect(result.current[0]?.name).toBe("Custom");
  });
});
