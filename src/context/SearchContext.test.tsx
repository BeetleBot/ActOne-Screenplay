import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { SearchProvider, useSearch } from "./SearchContext";

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(SearchProvider, null, children);
}

describe("SearchContext", () => {
  it("throws error when used outside SearchProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useSearch())).toThrow(
      "useSearch must be used within a SearchProvider"
    );
    spy.mockRestore();
  });

  it("initializes with default search state", () => {
    const { result } = renderHook(() => useSearch(), { wrapper });

    expect(result.current.query).toBe("");
    expect(result.current.replaceText).toBe("");
    expect(result.current.matchCase).toBe(false);
    expect(result.current.matchWholeWord).toBe(false);
    expect(result.current.isRegex).toBe(false);
    expect(result.current.scope).toBe("script");
    expect(result.current.matches).toEqual([]);
    expect(result.current.activeMatchIndex).toBe(-1);
    expect(result.current.activeMatch).toBeNull();
    expect(result.current.isOpen).toBe(false);
  });

  it("opens, closes, and clears search", () => {
    const { result } = renderHook(() => useSearch(), { wrapper });

    act(() => {
      result.current.openSearch("test query");
    });
    expect(result.current.isOpen).toBe(true);
    expect(result.current.query).toBe("test query");

    act(() => {
      result.current.closeSearch();
    });
    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.clearSearch();
    });
    expect(result.current.query).toBe("");
    expect(result.current.matches).toEqual([]);
    expect(result.current.activeMatchIndex).toBe(-1);
  });

  describe("performSearch", () => {
    const sampleScript = `INT. COFFEE SHOP - DAY

ALICE
Hello Bob, welcome to the shop.

BOB
Thanks Alice. The coffee here is great.`;

    it("performs case-insensitive search by default", () => {
      const { result } = renderHook(() => useSearch(), { wrapper });

      let matches: any[] = [];
      act(() => {
        result.current.setQuery("alice");
        matches = result.current.performSearch(sampleScript, "alice");
      });

      expect(matches).toHaveLength(2);
      expect(matches[0].line).toBe(3); // ALICE
      expect(matches[0].text).toBe("ALICE");
      expect(matches[1].line).toBe(7); // Alice
      expect(matches[1].text).toBe("Alice");
      expect(result.current.activeMatchIndex).toBe(0);
      expect(result.current.activeMatch?.text).toBe("ALICE");
    });

    it("performs case-sensitive search when matchCase is true", () => {
      const { result } = renderHook(() => useSearch(), { wrapper });

      act(() => {
        result.current.setMatchCase(true);
      });

      let matches: any[] = [];
      act(() => {
        matches = result.current.performSearch(sampleScript, "ALICE");
      });

      expect(matches).toHaveLength(1);
      expect(matches[0].line).toBe(3);
    });

    it("matches whole words only when matchWholeWord is true", () => {
      const { result } = renderHook(() => useSearch(), { wrapper });
      const text = "He is shopping at the shop near the bishop.";

      act(() => {
        result.current.setMatchWholeWord(true);
      });

      let matches: any[] = [];
      act(() => {
        matches = result.current.performSearch(text, "shop");
      });

      // Should match "shop" but NOT "shopping" or "bishop"
      expect(matches).toHaveLength(1);
      expect(matches[0].from).toBe(22);
    });

    it("handles regular expressions when isRegex is true", () => {
      const { result } = renderHook(() => useSearch(), { wrapper });

      act(() => {
        result.current.setIsRegex(true);
      });

      let matches: any[] = [];
      act(() => {
        matches = result.current.performSearch(sampleScript, "(ALICE|BOB)");
      });

      expect(matches.length).toBeGreaterThanOrEqual(3);
    });

    it("handles invalid regex gracefully", () => {
      const { result } = renderHook(() => useSearch(), { wrapper });

      act(() => {
        result.current.setIsRegex(true);
      });

      let matches: any[] = [];
      act(() => {
        matches = result.current.performSearch(sampleScript, "[unclosed regex");
      });

      expect(matches).toEqual([]);
      expect(result.current.activeMatchIndex).toBe(-1);
    });
  });

  describe("Match Navigation", () => {
    const text = "cat and dog and cat and bird and cat";

    it("navigates forward through matches with nextMatch and wraps around", () => {
      const { result } = renderHook(() => useSearch(), { wrapper });

      act(() => {
        result.current.performSearch(text, "cat");
      });

      expect(result.current.matches).toHaveLength(3);
      expect(result.current.activeMatchIndex).toBe(0);

      act(() => {
        result.current.nextMatch();
      });
      expect(result.current.activeMatchIndex).toBe(1);

      act(() => {
        result.current.nextMatch();
      });
      expect(result.current.activeMatchIndex).toBe(2);

      // Wraps around to 0
      act(() => {
        result.current.nextMatch();
      });
      expect(result.current.activeMatchIndex).toBe(0);
    });

    it("navigates backward through matches with previousMatch and wraps around", () => {
      const { result } = renderHook(() => useSearch(), { wrapper });

      act(() => {
        result.current.performSearch(text, "cat");
      });

      expect(result.current.activeMatchIndex).toBe(0);

      // Wraps around backwards to last index (2)
      act(() => {
        result.current.previousMatch();
      });
      expect(result.current.activeMatchIndex).toBe(2);

      act(() => {
        result.current.previousMatch();
      });
      expect(result.current.activeMatchIndex).toBe(1);
    });
  });

  describe("Replace Operations", () => {
    const text = "apples and oranges and apples";

    it("replaces active match with replaceCurrent and shifts subsequent match offsets", () => {
      const { result } = renderHook(() => useSearch(), { wrapper });

      act(() => {
        result.current.setReplaceText("bananas");
        result.current.performSearch(text, "apples");
      });

      expect(result.current.matches).toHaveLength(2);

      let replaceRes: any;
      act(() => {
        replaceRes = result.current.replaceCurrent(text, "bananas");
      });

      expect(replaceRes.replaced).toBe(true);
      expect(replaceRes.newContent).toBe("bananas and oranges and apples");
      expect(result.current.matches).toHaveLength(1);
      // Verify offset of second match shifted accordingly
      expect(result.current.matches[0].from).toBe("bananas and oranges and ".length);
    });

    it("replaces all matches in content with replaceAll", () => {
      const { result } = renderHook(() => useSearch(), { wrapper });

      act(() => {
        result.current.setReplaceText("peaches");
        result.current.performSearch(text, "apples");
      });

      let replaceAllRes: any;
      act(() => {
        replaceAllRes = result.current.replaceAll(text, "peaches");
      });

      expect(replaceAllRes.count).toBe(2);
      expect(replaceAllRes.newContent).toBe("peaches and oranges and peaches");
      expect(result.current.matches).toHaveLength(0);
      expect(result.current.activeMatchIndex).toBe(-1);
    });
  });
});
