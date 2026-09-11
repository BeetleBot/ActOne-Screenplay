import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";
import { SceneJumpPalette, fuzzyMatchScore } from "./SceneJumpPalette";
import { LineType } from "../parser";

const mockScrollToLine = vi.fn();
const mockOnClose = vi.fn();

const mockLines = [
  {
    id: "l1",
    type: LineType.heading,
    text: "INT. COFFEE SHOP - DAY #1#",
    sceneNumber: "1",
    setting: "INT",
    location: "COFFEE SHOP",
    timeOfDay: "DAY",
    isOutlineElement: true,
  },
  {
    id: "l2",
    type: LineType.synopse,
    text: "= Detective meets informant secretly",
    isOutlineElement: true,
  },
  {
    id: "l3",
    type: LineType.action,
    text: "Steam rises from the mug.",
    isOutlineElement: false,
  },
  {
    id: "l4",
    type: LineType.heading,
    text: "EXT. HIGHWAY - NIGHT #2# [[storyline ChaseArc]]",
    sceneNumber: "2",
    setting: "EXT",
    location: "HIGHWAY",
    timeOfDay: "NIGHT",
    storylines: ["ChaseArc"],
    isOutlineElement: true,
  },
  {
    id: "l5",
    type: LineType.heading,
    text: "I/E. VAN - EVENING #14A#",
    sceneNumber: "14A",
    setting: "I/E",
    location: "VAN",
    timeOfDay: "EVENING",
    isOutlineElement: true,
  },
];

let mockParsedDoc = { lines: mockLines, settings: {}, screenplayText: "" };
let mockIsProse = false;
let mockProseContent = "";

vi.mock("../context", () => ({
  useFile: () => ({
    parsedDoc: mockParsedDoc,
    rawText: mockProseContent,
    files: [
      {
        id: "f1",
        filePath: mockIsProse ? "test.md" : "test.fountain",
        scripts: [
          {
            name: mockIsProse ? "Notes" : "Script",
            type: mockIsProse ? "prose" : "screenplay",
            content: mockProseContent,
          },
        ],
        activeScriptIndex: 0,
      },
    ],
    activeFileId: "f1",
    activeScriptIndex: 0,
    filePath: mockIsProse ? "test.md" : "test.fountain",
  }),
  useEditor: () => ({
    scrollToLine: mockScrollToLine,
    editorView: {
      contentDOM: { focus: vi.fn() },
    },
  }),
}));

describe("fuzzyMatchScore", () => {
  it("scores exact match highest", () => {
    const scoreExact = fuzzyMatchScore("coffee", "coffee");
    const scorePrefix = fuzzyMatchScore("coffee", "coffee shop");
    expect(scoreExact).toBeGreaterThan(scorePrefix);
  });

  it("scores partial and word matches properly", () => {
    expect(fuzzyMatchScore("ext night", "EXT. HIGHWAY - NIGHT")).toBeGreaterThan(0);
    expect(fuzzyMatchScore("xyz", "EXT. HIGHWAY - NIGHT")).toBe(0);
  });
});

describe("SceneJumpPalette", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsProse = false;
    mockParsedDoc = { lines: mockLines, settings: {}, screenplayText: "" };
  });

  it("renders screenplay scenes when open", () => {
    render(<SceneJumpPalette isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByPlaceholderText(/Jump to scene/i)).toBeInTheDocument();
    expect(screen.getByText("INT. COFFEE SHOP - DAY")).toBeInTheDocument();
    expect(screen.getByText("EXT. HIGHWAY - NIGHT")).toBeInTheDocument();
    expect(screen.getByText("I/E. VAN - EVENING")).toBeInTheDocument();
  });

  it("filters scenes by scene number (#14A)", () => {
    render(<SceneJumpPalette isOpen={true} onClose={mockOnClose} />);
    const input = screen.getByPlaceholderText(/Jump to scene/i);

    act(() => {
      fireEvent.change(input, { target: { value: "14A" } });
    });

    expect(screen.getByText("I/E. VAN - EVENING")).toBeInTheDocument();
    expect(screen.queryByText("INT. COFFEE SHOP - DAY")).toBeNull();
  });

  it("filters scenes by setting prefix (EXT) and time (NIGHT)", () => {
    render(<SceneJumpPalette isOpen={true} onClose={mockOnClose} />);
    const input = screen.getByPlaceholderText(/Jump to scene/i);

    act(() => {
      fireEvent.change(input, { target: { value: "NIGHT" } });
    });

    expect(screen.getByText("EXT. HIGHWAY - NIGHT")).toBeInTheDocument();
    expect(screen.queryByText("INT. COFFEE SHOP - DAY")).toBeNull();
  });

  it("filters scenes by synopsis keyword", () => {
    render(<SceneJumpPalette isOpen={true} onClose={mockOnClose} />);
    const input = screen.getByPlaceholderText(/Jump to scene/i);

    act(() => {
      fireEvent.change(input, { target: { value: "informant" } });
    });

    expect(screen.getByText("INT. COFFEE SHOP - DAY")).toBeInTheDocument();
    expect(screen.getByText("Detective meets informant secretly")).toBeInTheDocument();
  });

  it("jumps to scene line when clicking an item", () => {
    render(<SceneJumpPalette isOpen={true} onClose={mockOnClose} />);
    const sceneItem = screen.getByText("EXT. HIGHWAY - NIGHT");
    fireEvent.click(sceneItem);

    expect(mockOnClose).toHaveBeenCalled();
    expect(mockScrollToLine).toHaveBeenCalledWith(3);
  });

  it("navigates with ArrowDown and selects with Enter", () => {
    render(<SceneJumpPalette isOpen={true} onClose={mockOnClose} />);
    const input = screen.getByPlaceholderText(/Jump to scene/i);

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(mockOnClose).toHaveBeenCalled();
    expect(mockScrollToLine).toHaveBeenCalledWith(3);
  });

  it("closes when pressing Escape", () => {
    render(<SceneJumpPalette isOpen={true} onClose={mockOnClose} />);
    const input = screen.getByPlaceholderText(/Jump to scene/i);
    fireEvent.keyDown(input, { key: "Escape" });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("renders markdown headings when in prose mode", () => {
    mockIsProse = true;
    mockProseContent = "# Chapter 1 - The Arrival\nSome text\n## Scene A\nMore text";

    render(<SceneJumpPalette isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByPlaceholderText(/Jump to section or chapter/i)).toBeInTheDocument();
    expect(screen.getByText("Chapter 1 - The Arrival")).toBeInTheDocument();
    expect(screen.getByText("Scene A")).toBeInTheDocument();
  });
});
