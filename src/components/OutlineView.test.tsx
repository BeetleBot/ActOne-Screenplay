import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { LineType } from "../parser/FountainParser";
import type { ParsedLine } from "../parser/FountainParser";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { lineTypesField } from "../editor/fountainSyntax";

const mockScrollToLine = vi.fn();
const mockSetSelectedSceneId = vi.fn();
const mockReorderScenes = vi.fn();
const { mockCopyToClipboard, mockRevealVirtualRow } = vi.hoisted(() => ({
  mockCopyToClipboard: vi.fn().mockResolvedValue(true),
  mockRevealVirtualRow: vi.fn(() => vi.fn()),
}));
vi.mock("./revealVirtualRow", () => ({ revealVirtualRow: mockRevealVirtualRow }));
let mockLines: ParsedLine[] = [];
let mockActiveLineNumber = -1;
const mockCursorListeners = new Set<() => void>();
const mockParseListeners = new Set<() => void>();
let mockRawText = "";
interface MockFile {
  scripts?: { type?: string; fileName?: string; content?: string }[];
  [key: string]: unknown;
}
let mockFiles: MockFile[] = [];
let mockEditorView: { state: EditorState; dispatch: (...args: never[]) => void } | EditorView | null = null;

vi.mock("../context", () => ({
  useWorkspaceMetadata: () => ({
    activeFileId: "file1",
    activeScriptIndex: 0,
    isProse: mockFiles.some((file) =>
      file.scripts?.some(
        (script) => script.type === "markdown" || script.type === "prose" || script.fileName?.endsWith(".md"),
      ),
    ),
  }),
  useDocumentText: () => mockFiles[0]?.scripts?.[0]?.content ?? mockRawText,
  useParsedScreenplay: () => {
    const lines = React.useSyncExternalStore((listener) => {
      mockParseListeners.add(listener);
      return () => mockParseListeners.delete(listener);
    }, () => mockLines);
    return { lines, screenplayText: mockRawText };
  },
  useEditor: () => ({
    scrollToLine: mockScrollToLine,
    editorView: mockEditorView,
  }),
  useScriptEditor: () => ({
    reorderScenes: mockReorderScenes,
  }),
  useCursor: () => ({
    activeLineNumber: React.useSyncExternalStore((listener) => {
      mockCursorListeners.add(listener);
      return () => mockCursorListeners.delete(listener);
    }, () => mockActiveLineNumber),
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
  mockActiveLineNumber = -1;
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
      dispatch: vi.fn(),
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
      {
        id: "sec2",
        text: "## SCENE GROUP",
        type: LineType.section,
        isOutlineElement: true,
        sectionDepth: 2,
      } as ParsedLine,
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
      {
        id: "sc1",
        text: "EXT. HOUSE - DAY",
        type: LineType.heading,
        isOutlineElement: true,
        color: "red",
      } as ParsedLine,
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

describe("Navigator drag indices", () => {
  it("reorders a scene using full-list indices", () => {
    mockLines = [0, 1, 2].map((index) => ({
      id: `scene-${index}`,
      text: `INT. ROOM ${index} - DAY`,
      type: LineType.heading,
      isOutlineElement: true,
    }));
    const { container } = render(<OutlineView />);
    const rect = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
      this: HTMLElement,
    ) {
      const index = Number(this.getAttribute("data-scene-index") ?? 0);
      return {
        top: index * 40,
        bottom: index * 40 + 36,
        left: 0,
        right: 200,
        width: 200,
        height: 36,
        x: 0,
        y: index * 40,
        toJSON: () => ({}),
      };
    });
    try {
      const second = container.querySelector('[data-scene-index="1"]')!;
      const handle = second.querySelector("svg")!.parentElement!;
      fireEvent.mouseDown(handle, { clientX: 10, clientY: 50 });
      fireEvent.mouseMove(document, { clientX: 10, clientY: 4 });
      fireEvent.mouseUp(document);
      expect(mockReorderScenes).toHaveBeenCalledWith(1, 0);
    } finally {
      rect.mockRestore();
    }
  });
});

describe("Navigator cursor following", () => {
  it("does not scroll back to the editor scene when changing synopsis visibility or searching", () => {
    mockLines = [
      { id: "first", text: "INT. FIRST - DAY", type: LineType.heading, isOutlineElement: true } as ParsedLine,
      { id: "synopsis", text: "= A long summary", type: LineType.synopse, isOutlineElement: true } as ParsedLine,
      { id: "last", text: "INT. LAST - DAY", type: LineType.heading, isOutlineElement: true } as ParsedLine,
    ];
    mockActiveLineNumber = 2;
    render(<OutlineView />);
    const initialReveals = mockRevealVirtualRow.mock.calls.length;
    fireEvent.click(screen.getAllByRole("button")[0]);
    fireEvent.click(screen.getByText("Synopses"));
    const input = screen.getByPlaceholderText("Search outline...");
    fireEvent.change(input, { target: { value: "FIRST" } });
    fireEvent.change(input, { target: { value: "FIRST absent" } });
    fireEvent.change(input, { target: { value: "" } });
    expect(mockRevealVirtualRow).toHaveBeenCalledTimes(initialReveals);
    expect(screen.getByText("A long summary")).toBeInTheDocument();
  });

  it("still reveals an offscreen scene when the editor cursor moves", () => {
    mockLines = Array.from({ length: 200 }, (_, index) => ({
      id: `scene-${index}`, text: `INT. ROOM ${index} - DAY`, type: LineType.heading, isOutlineElement: true,
    }));
    mockActiveLineNumber = 0;
    render(<OutlineView />);
    mockRevealVirtualRow.mockClear();
    act(() => {
      mockActiveLineNumber = 199;
      mockCursorListeners.forEach((listener) => listener());
    });
    expect(mockRevealVirtualRow).toHaveBeenCalledWith(expect.any(Function), 199, expect.any(Function));
  });

  it("does not initiate cursor-follow scrolling when reordered rows are published", () => {
    mockLines = [0, 1, 2].map((index) => ({
      id: `scene-${index}`, text: `INT. ROOM ${index} - DAY`, type: LineType.heading, isOutlineElement: true,
    }));
    mockActiveLineNumber = 0;
    render(<OutlineView />);
    mockRevealVirtualRow.mockClear();
    act(() => {
      mockLines = [mockLines[2], mockLines[0], mockLines[1]];
      mockParseListeners.forEach((listener) => listener());
    });
    expect(mockRevealVirtualRow).not.toHaveBeenCalled();
  });

  it("keeps the navigator viewport when a scene move changes the editor cursor line", () => {
    const text = "INT. FIRST - DAY\n\nFirst action.\n\nINT. SECOND - DAY\n\nSecond action.";
    mockRawText = text;
    mockLines = text.split("\n").map((line, index) => ({
      id: `line-${index}`, text: line, type: line.startsWith("INT.") ? LineType.heading : LineType.action,
      isOutlineElement: line.startsWith("INT."),
    }));
    mockActiveLineNumber = 6;
    const view = new EditorView({ state: EditorState.create({ doc: text, selection: { anchor: text.indexOf("Second action.") } }) });
    mockEditorView = view;
    const { container, unmount } = render(<OutlineView />);
    const scroller = container.querySelector('[role="list"]') as HTMLElement;
    scroller.scrollTop = 240;
    mockRevealVirtualRow.mockClear();
    try {
      const reordered = "INT. SECOND - DAY\n\nSecond action.\n\nINT. FIRST - DAY\n\nFirst action.";
      act(() => {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: reordered },
          selection: { anchor: reordered.indexOf("Second action.") },
          userEvent: "move.scene",
        });
        mockActiveLineNumber = 2;
        mockCursorListeners.forEach((listener) => listener());
      });
      act(() => {
        mockRawText = reordered;
        mockLines = reordered.split("\n").map((line, index) => ({
          id: `updated-${index}`, text: line, type: line.startsWith("INT.") ? LineType.heading : LineType.action,
          isOutlineElement: line.startsWith("INT."),
        }));
        mockParseListeners.forEach((listener) => listener());
      });
      expect(mockRevealVirtualRow).not.toHaveBeenCalled();
      expect(scroller.scrollTop).toBe(240);
    } finally {
      unmount();
      view.destroy();
    }
  });
});
