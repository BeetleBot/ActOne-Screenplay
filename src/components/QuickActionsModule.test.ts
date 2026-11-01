import { describe, it, expect, vi } from "vitest";
import {
  detectQuickActionPrefix,
  fuzzyQuickActionScore,
  formatRelativeTime,
  getPageNumberForLine,
  buildSceneQuickActionItems,
  buildCharacterQuickActionItems,
  buildThemeQuickActionItems,
  buildMarkerQuickActionItems,
} from "./QuickActionsModule";
import { LineType, type FountainDocument } from "../parser";

describe("QuickActionsModule", () => {
  it("detects all five quick action prefixes correctly", () => {
    expect(detectQuickActionPrefix("sc. coffee")).toEqual({ type: "scenes", query: "coffee" });
    expect(detectQuickActionPrefix("sc 14")).toEqual({ type: "scenes", query: "14" });
    expect(detectQuickActionPrefix("rf. movie")).toEqual({ type: "recent", query: "movie" });
    expect(detectQuickActionPrefix("rf interstellar")).toEqual({ type: "recent", query: "interstellar" });
    expect(detectQuickActionPrefix("ch. bob")).toEqual({ type: "characters", query: "bob" });
    expect(detectQuickActionPrefix("ch alice")).toEqual({ type: "characters", query: "alice" });
    expect(detectQuickActionPrefix("th. midnight")).toEqual({ type: "themes", query: "midnight" });
    expect(detectQuickActionPrefix("th sepia")).toEqual({ type: "themes", query: "sepia" });
    expect(detectQuickActionPrefix("mk. red")).toEqual({ type: "markers", query: "red" });
    expect(detectQuickActionPrefix("mk note")).toEqual({ type: "markers", query: "note" });
    expect(detectQuickActionPrefix("regular command")).toBeNull();
  });

  it("calculates page number based on pageBreaks array", () => {
    const pageBreaks = [50, 100, 150];
    expect(getPageNumberForLine(10, pageBreaks)).toBe(1);
    expect(getPageNumberForLine(50, pageBreaks)).toBe(2);
    expect(getPageNumberForLine(120, pageBreaks)).toBe(3);
    expect(getPageNumberForLine(160, pageBreaks)).toBe(4);
  });

  it("formats relative timestamps", () => {
    const now = Date.now();
    expect(formatRelativeTime(now - 1000 * 20)).toBe("just now");
    expect(formatRelativeTime(now - 1000 * 60 * 15)).toBe("15m ago");
    expect(formatRelativeTime(now - 1000 * 60 * 60 * 3)).toBe("3h ago");
    expect(formatRelativeTime(now - 1000 * 60 * 60 * 24 * 2)).toBe("2d ago");
  });

  it("scores matches using fuzzyQuickActionScore", () => {
    expect(fuzzyQuickActionScore("coffee", "INT. COFFEE SHOP - DAY")).toBeGreaterThan(0);
    expect(fuzzyQuickActionScore("coff", "INT. COFFEE SHOP - DAY")).toBeGreaterThan(0);
    expect(fuzzyQuickActionScore("xyz123", "INT. COFFEE SHOP - DAY")).toBe(0);
  });

  it("builds scene items for screenplay and prose", () => {
    const onSelectLine = vi.fn();
    const doc: FountainDocument = {
      lines: [
        { id: "s1", type: LineType.section, text: "# ACT ONE", sectionDepth: 1 },
        { id: "1", type: LineType.heading, text: "INT. DINER - DAY", sceneNumber: "1", setting: "INT", location: "DINER", timeOfDay: "DAY" },
        { id: "2", type: LineType.synopse, text: "= Coffee meetup" },
      ],
      sceneHeadings: [],
    };

    const screenplayItems = buildSceneQuickActionItems({
      isProse: false,
      proseText: "",
      parsedDoc: doc,
      pageBreaks: [0],
      onSelectLine,
    });

    expect(screenplayItems).toHaveLength(1);
    expect(screenplayItems[0].name).toBe("INT. DINER - DAY");
    expect(screenplayItems[0].category).toBe("ACT ONE");
    expect(screenplayItems[0].badge).toBe("#1");
    expect(screenplayItems[0].subtitle).toBe("Coffee meetup");

    screenplayItems[0].action();
    expect(onSelectLine).toHaveBeenCalledWith(1);

    const proseItems = buildSceneQuickActionItems({
      isProse: true,
      proseText: "# Chapter One\n\nSome body text\n## Beat Two",
      parsedDoc: doc,
      pageBreaks: [],
      onSelectLine,
    });

    expect(proseItems).toHaveLength(2);
    expect(proseItems[0].name).toBe("Chapter One");
    expect(proseItems[0].badge).toBe("#");
    expect(proseItems[1].name).toBe("Beat Two");
    expect(proseItems[1].badge).toBe("##");
  });

  it("builds character items with dialogue count and first line", () => {
    const onSelectLine = vi.fn();
    const doc: FountainDocument = {
      lines: [
        { id: "1", type: LineType.character, text: "ALICE" },
        { id: "2", type: LineType.dialogue, text: "Hello Bob." },
        { id: "3", type: LineType.character, text: "BOB" },
        { id: "4", type: LineType.dialogue, text: "Hey Alice." },
        { id: "5", type: LineType.character, text: "ALICE (O.S.)" },
        { id: "6", type: LineType.dialogue, text: "Did you hear that?" },
      ],
      sceneHeadings: [],
    };

    const chars = buildCharacterQuickActionItems({
      parsedDoc: doc,
      onSelectLine,
    });

    expect(chars).toHaveLength(2);
    expect(chars[0].name).toBe("ALICE");
    expect(chars[0].badge).toBe("2 speeches");
    expect(chars[1].name).toBe("BOB");
    expect(chars[1].badge).toBe("1 speech");

    chars[0].action();
    expect(onSelectLine).toHaveBeenCalledWith(0);
  });

  it("builds theme items including built-in and custom themes", () => {
    const onSelectTheme = vi.fn();
    const themesList = buildThemeQuickActionItems({
      activeThemeId: "dark",
      customThemes: [
        {
          id: "custom-neon",
          name: "Neon Nights",
          isDark: true,
          colors: {
            bg: "#000",
            surface: "#111",
            text: "#fff",
            textMuted: "#888",
            primary: "#0ff",
            primaryHover: "#0ee",
            accent: "#f0f",
            border: "#222",
            divider: "#333",
          },
        },
      ],
      onSelectTheme,
    });

    expect(themesList.length).toBeGreaterThan(5);
    const custom = themesList.find((t) => t.id === "theme-custom-custom-neon");
    expect(custom).toBeDefined();
    expect(custom?.name).toBe("Neon Nights");

    custom?.action();
    expect(onSelectTheme).toHaveBeenCalledWith("custom-neon");
  });

  it("builds marker items from parsed lines", () => {
    const onSelectLine = vi.fn();
    const doc: FountainDocument = {
      lines: [
        { id: "1", type: LineType.heading, text: "INT. OFFICE - DAY", sceneNumber: "3" },
        { id: "2", type: LineType.action, text: "He signs [[marker red: Verify legal clause]] the contract.", marker: { color: "red", description: "Verify legal clause" } },
      ],
      sceneHeadings: [],
    };

    const markers = buildMarkerQuickActionItems({
      parsedDoc: doc,
      onSelectLine,
    });

    expect(markers).toHaveLength(1);
    expect(markers[0].name).toBe("Verify legal clause");
    expect(markers[0].badge).toBe("RED");
    expect(markers[0].subtitle).toBe("INT. OFFICE - DAY");

    markers[0].action();
    expect(onSelectLine).toHaveBeenCalledWith(1);
  });
});
