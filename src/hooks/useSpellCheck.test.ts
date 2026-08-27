import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSpellCheck } from "./useSpellCheck";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("useSpellCheck", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes with default state", () => {
    const { result } = renderHook(() => useSpellCheck());
    expect(result.current.isEnabled).toBe(true);
    expect(result.current.isChecking).toBe(false);
    expect(result.current.misspelledWords).toEqual([]);
    expect(result.current.suggestions).toEqual([]);
    expect(result.current.activeWord).toBeNull();
    expect(result.current.ignoredWords).toEqual([]);
    expect(result.current.customWords).toEqual([]);
  });

  it("can be initialized as disabled", () => {
    const { result } = renderHook(() => useSpellCheck({ initialEnabled: false }));
    expect(result.current.isEnabled).toBe(false);
  });

  it("toggles enabled state", () => {
    const { result } = renderHook(() => useSpellCheck());
    act(() => {
      result.current.setIsEnabled(false);
    });
    expect(result.current.isEnabled).toBe(false);
    act(() => {
      result.current.setIsEnabled(true);
    });
    expect(result.current.isEnabled).toBe(true);
  });

  it("returns empty results when checking with spellcheck disabled", async () => {
    const { result } = renderHook(() => useSpellCheck({ initialEnabled: false }));
    let res: any;
    await act(async () => {
      res = await result.current.checkText("This has teh misspelled word.");
    });
    expect(res).toEqual([]);
    expect(result.current.misspelledWords).toEqual([]);
  });

  it("identifies misspelled words in fallback mode", async () => {
    const { result } = renderHook(() => useSpellCheck());
    const text = "He went to teh store and found a misspelld item.";

    let res: any;
    await act(async () => {
      res = await result.current.checkText(text);
    });

    expect(res.length).toBe(2);
    expect(res.map((r: any) => r.word)).toEqual(["teh", "misspelld"]);
    expect(result.current.misspelledWords).toHaveLength(2);
  });

  it("excludes character names from spellcheck errors", async () => {
    const { result } = renderHook(() => useSpellCheck());
    const text = "BOBBY and teh crew walked away.";

    let res: any;
    await act(async () => {
      res = await result.current.checkText(text, ["BOBBY"]);
    });

    expect(res.some((r: any) => r.word === "BOBBY")).toBe(false);
    expect(res.some((r: any) => r.word === "teh")).toBe(true);
  });

  it("retrieves spelling suggestions for a word", async () => {
    const { result } = renderHook(() => useSpellCheck());

    let suggestions: string[] = [];
    await act(async () => {
      suggestions = await result.current.getSuggestions("teh");
    });

    expect(suggestions).toContain("the");
    expect(result.current.suggestions).toContain("the");
    expect(result.current.activeWord).toBe("teh");
  });

  it("handles empty word for suggestions gracefully", async () => {
    const { result } = renderHook(() => useSpellCheck());
    let suggestions: string[] = [];
    await act(async () => {
      suggestions = await result.current.getSuggestions("");
    });
    expect(suggestions).toEqual([]);
    expect(result.current.suggestions).toEqual([]);
  });

  it("replaces misspelled word at specific range offset", async () => {
    const { result } = renderHook(() => useSpellCheck());
    const text = "This is teh day.";

    await act(async () => {
      await result.current.checkText(text);
    });
    expect(result.current.misspelledWords).toHaveLength(1);

    const from = 8;
    const to = 11;
    let newText = "";
    act(() => {
      newText = result.current.replaceWord(text, from, to, "the");
    });

    expect(newText).toBe("This is the day.");
    expect(result.current.misspelledWords).toHaveLength(0);
  });

  it("replaces word in entire text with replaceWordInText", async () => {
    const { result } = renderHook(() => useSpellCheck());
    const text = "teh first and teh second.";

    await act(async () => {
      await result.current.checkText(text);
    });

    let newText = "";
    act(() => {
      newText = result.current.replaceWordInText(text, "teh", "the");
    });

    expect(newText).toBe("the first and the second.");
    expect(result.current.misspelledWords).toHaveLength(0);
  });

  it("adds word to custom dictionary and removes from error list", async () => {
    const { result } = renderHook(() => useSpellCheck());
    const text = "teh quick brown fox";

    await act(async () => {
      await result.current.checkText(text);
    });
    expect(result.current.misspelledWords).toHaveLength(1);

    await act(async () => {
      await result.current.addWordToDictionary("teh");
    });

    expect(result.current.customWords).toContain("teh");
    expect(result.current.misspelledWords).toHaveLength(0);

    // Re-checking text should no longer flag "teh"
    let recheckRes: any;
    await act(async () => {
      recheckRes = await result.current.checkText(text);
    });
    expect(recheckRes).toEqual([]);
  });

  it("ignores word for the session and removes from error list", async () => {
    const { result } = renderHook(() => useSpellCheck());
    const text = "misspelld word here";

    await act(async () => {
      await result.current.checkText(text);
    });
    expect(result.current.misspelledWords).toHaveLength(1);

    await act(async () => {
      await result.current.ignoreWord("misspelld");
    });

    expect(result.current.ignoredWords).toContain("misspelld");
    expect(result.current.misspelledWords).toHaveLength(0);

    // Re-checking text should no longer flag "misspelld"
    let recheckRes: any;
    await act(async () => {
      recheckRes = await result.current.checkText(text);
    });
    expect(recheckRes).toEqual([]);
  });

  it("clears misspelled words and suggestions", async () => {
    const { result } = renderHook(() => useSpellCheck());

    await act(async () => {
      await result.current.checkText("teh");
      await result.current.getSuggestions("teh");
    });

    expect(result.current.misspelledWords.length).toBeGreaterThan(0);
    expect(result.current.suggestions.length).toBeGreaterThan(0);
    expect(result.current.activeWord).toBe("teh");

    act(() => {
      result.current.clearMisspelled();
    });

    expect(result.current.misspelledWords).toEqual([]);
    expect(result.current.suggestions).toEqual([]);
    expect(result.current.activeWord).toBeNull();
  });
});
