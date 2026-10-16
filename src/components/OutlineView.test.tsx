import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { LineType } from "../parser/FountainParser";
import type { ParsedLine, FountainDocument } from "../parser/FountainParser";
import { EditorState } from "@codemirror/state";
import { lineTypesField } from "../editor/fountainSyntax";

const mockScrollToLine = vi.fn();
const mockSetSelectedSceneId = vi.fn();
const mockReorderScenes = vi.fn();
const { mockCopyToClipboard } = vi.hoisted(() => ({
  mockCopyToClipboard: vi.fn().mockResolvedValue(true),
}));
let mockLines: ParsedLine[] = [];
let mockRawText = "";
let mockFiles: unknown[] = [];
let mockEditorView: { state: EditorState } | null = null;

vi.mock("../context", () => ({
  useFile: () => ({
    get parsedDoc() { return { lines: mockLines } as unknown as FountainDocument; },
    get rawText() { return mockRawText; },
    get files() { return mockFiles; },
    activeFileId: "file1",
  }),
  useEditor: () => ({
    scrollToLine: mockScrollToLine,
    editorView: mockEditorView,
  }),
  useScriptEditor: () => ({
    reorderScenes: mockReorderScenes,
  }),
  useCursor: () => ({
    activeLineNumber: -1,
    selectedSceneId: null,
    setSelectedSceneId: mockSetSelectedSceneId,
  }),
}));

vi.mock("../utils", () => ({ copyToClipboard: mockCopyToClipboard }));

import { OutlineView } from "./OutlineView";

beforeEach(() => {
  vi.clearAllMocks();
  mockLines = [];
  mockRawText = "";
  mockFiles = [];
  mockEditorView = null;
});

describe("OutlineView Component", () => {
  it("renders without crashing when empty", () => {
    const { container } = render(React.createElement(OutlineView));
    expect(container).toBeTruthy();
  });

  it("copies the right-clicked scene from the Scene Navigator", () => {
    const fountain = "INT. HOUSE - DAY\n\nBOB\nHello.\n\nEXT. STREET - NIGHT\n\nALICE\nHi.";
    mockRawText = fountain;
    mockLines = [
      { id: "sc1", text: "INT. HOUSE - DAY", type: LineType.heading, isOutlineElement: true } as ParsedLine,
      { id: "sc2", text: "EXT. STREET - NIGHT", type: LineType.heading, isOutlineElement: true } as ParsedLine,
    ];
    mockEditorView = {
      state: EditorState.create({ doc: fountain, extensions: [lineTypesField] }),
    };

    render(React.createElement(OutlineView));
    fireEvent.contextMenu(screen.getByText("INT. HOUSE - DAY"), { clientX: 20, clientY: 30 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Copy Scene" }));

    expect(mockCopyToClipboard).toHaveBeenCalledWith("INT. HOUSE - DAY\n\nBOB\nHello.\n\n");
  });

  it("renders sections and scenes in the tree", () => {
    mockLines = [
      { id: "sec1", text: "# ACT I", type: LineType.section, isOutlineElement: true, sectionDepth: 1 } as ParsedLine,
      { id: "sc1", text: "EXT. HOUSE - DAY", type: LineType.heading, isOutlineElement: true } as ParsedLine,
      { id: "sc2", text: "INT. ROOM - NIGHT", type: LineType.heading, isOutlineElement: true } as ParsedLine,
    ];
    const { container } = render(React.createElement(OutlineView));
    expect(container.textContent).toContain("ACT I");
    expect(container.textContent).toContain("EXT. HOUSE - DAY");
    expect(container.textContent).toContain("INT. ROOM - NIGHT");
  });

  it("renders nested scenes under sections", () => {
    mockLines = [
      { id: "sec1", text: "# ACT I", type: LineType.section, isOutlineElement: true, sectionDepth: 1 } as ParsedLine,
      { id: "sc1", text: "EXT. HOUSE - DAY", type: LineType.heading, isOutlineElement: true } as ParsedLine,
      { id: "sec2", text: "## SCENE GROUP", type: LineType.section, isOutlineElement: true, sectionDepth: 2 } as ParsedLine,
      { id: "sc2", text: "INT. ROOM - NIGHT", type: LineType.heading, isOutlineElement: true } as ParsedLine,
    ];
    const { container } = render(React.createElement(OutlineView));
    expect(container.textContent).toContain("ACT I");
    expect(container.textContent).toContain("SCENE GROUP");
    expect(container.textContent).toContain("EXT. HOUSE - DAY");
    expect(container.textContent).toContain("INT. ROOM - NIGHT");
  });

  it("renders scene color indicators", () => {
    mockLines = [
      { id: "sc1", text: "EXT. HOUSE - DAY", type: LineType.heading, isOutlineElement: true, color: "red" } as ParsedLine,
    ];
    const { container } = render(React.createElement(OutlineView));
    expect(container.textContent).toContain("EXT. HOUSE - DAY");
  });

  it("renders prose headings list when in prose mode", () => {
    mockFiles = [
      {
        id: "file1",
        activeScriptIndex: 0,
        scripts: [
          {
            name: "Chapter 1",
            type: "markdown",
            content: "# Main Title\n\nIntro text.\n\n## Section 1\n\nBody.\n\n### Sub-Section 1.1\n\nDetails.",
          },
        ],
      },
    ];
    const { container } = render(React.createElement(OutlineView));
    expect(container.textContent).toContain("Main Title");
    expect(container.textContent).toContain("Section 1");
    expect(container.textContent).toContain("Sub-Section 1.1");
    expect(container.textContent).toContain("H1");
    expect(container.textContent).toContain("H2");
    expect(container.textContent).toContain("H3");
  });
});
