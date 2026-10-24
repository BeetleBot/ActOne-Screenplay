import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import userEvent from "@testing-library/user-event";
import { EditorState } from "@codemirror/state";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { StatusBar } from "./StatusBar";
import { LineType } from "../../parser";

let mockRawText = "INT. CAFE - DAY\nJOHN\nHello!";
let mockPageBreaks = [0];
let mockTitlePage = false;
let mockEditorView: { state: EditorState; dispatch: ReturnType<typeof vi.fn>; focus: ReturnType<typeof vi.fn> } | null = null;
const mockSetTimelineFilter = vi.fn();
let mockShowTimeline = true;
let mockTimelineFilter = { type: "default" as const, values: [] as string[] };
let mockIsMarkdown = false;
let mockHasNoScripts = false;

vi.mock("../../context", () => ({
  useFile: () => ({
    rawText: "INT. CAFE - DAY\nJOHN\nHello!",
    parsedDoc: {
      lines: [
        { id: "1", text: "INT. CAFE - DAY", type: LineType.heading, location: "CAFE", timeOfDay: "DAY", setting: "INT.", isOutlineElement: true },
        { id: "2", text: "JOHN", type: LineType.character, isOutlineElement: false },
        { id: "3", text: "Hello!", type: LineType.dialogue, isOutlineElement: false },
        { id: "4", text: "EXT. PARK - NIGHT", type: LineType.heading, location: "PARK", timeOfDay: "NIGHT", setting: "EXT.", isOutlineElement: true },
      ],
      settings: {},
      screenplayText: "",
      pageBreaks: [0],
    },
    isBundle: false,
    scripts: [{ name: "Script 1", fileName: "script.fountain" }],
    activeScriptIndex: 0,
    filePath: "script.fountain",
    activeScriptName: "Script 1",
    setActiveScript: vi.fn(),
    activeFileId: "f1",
    saveStatus: "idle",
    files: [{ id: "f1", scripts: mockHasNoScripts ? [] : [{ name: "Script 1", fileName: "script.fountain" }] }],
  }),
  useDocumentText: () => mockRawText,
  useParsedScreenplay: () => ({
    lines: [
      ...(mockTitlePage ? [{ id: "title", text: "Title: Script", type: LineType.titlePageTitle }] : []),
      { id: "1", text: "INT. CAFE - DAY", type: LineType.heading, location: "CAFE", timeOfDay: "DAY", setting: "INT.", isOutlineElement: true },
      { id: "2", text: "JOHN", type: LineType.character, isOutlineElement: false },
      { id: "3", text: "Hello!", type: LineType.dialogue, isOutlineElement: false },
      { id: "4", text: "EXT. PARK - NIGHT", type: LineType.heading, location: "PARK", timeOfDay: "NIGHT", setting: "EXT.", isOutlineElement: true },
    ], settings: {}, screenplayText: "",
  }),
  usePageBreaks: () => mockPageBreaks,
  useFileSaveStatus: () => "idle",
  useFileActions: () => ({ setActiveScript: vi.fn() }),
  useWorkspaceMetadata: () => ({
    isBundle: false, scripts: [{ name: "Script 1", fileName: "script.fountain" }], activeScriptIndex: 0,
    filePath: "script.fountain", activeScriptName: "Script 1", activeFileId: "f1",
    hasNoScripts: mockHasNoScripts, isProse: mockIsMarkdown,
  }),
  useUI: () => ({
    isZenMode: false,
    aiStatus: null,
    translationState: "idle",
    setTranslationState: vi.fn(),
    cancelTranslation: vi.fn(),
    spellcheckEnabled: false,
    setSpellcheckEnabled: vi.fn(),
    spellcheckLanguage: "en",
    setSpellcheckLanguage: vi.fn(),
    showTimeline: mockShowTimeline,
    timelineFilter: mockTimelineFilter,
    setTimelineFilter: mockSetTimelineFilter,
    timelineShowSections: true,
    setTimelineShowSections: vi.fn(),
    timelineShowSceneNumbers: true,
    setTimelineShowSceneNumbers: vi.fn(),
    timelineShowSceneColors: true,
    setTimelineShowSceneColors: vi.fn(),
  }),
  useSprint: () => ({
    activeSprints: {},
  }),
  useEditor: () => ({
    editorView: mockEditorView,
  }),
  useCursor: () => ({
    activeLineNumber: 0,
  }),
}));

vi.mock("../../hooks", () => ({
  useStoreUpdateCheck: () => ({
    updateAvailable: false,
    installUpdate: vi.fn(),
  }),
}));

vi.mock("../../hooks/useModalWindows", () => ({
  useModalWindows: () => ({
    openSettingsWindow: vi.fn(),
  }),
}));

vi.mock("../../utils/scriptMode", () => ({
  isProseScript: () => mockIsMarkdown,
}));

describe("StatusBar Timeline Filter Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockShowTimeline = true;
    mockTimelineFilter = { type: "default", values: [] };
    mockIsMarkdown = false;
    mockHasNoScripts = false;
  });

  it("renders timeline filter trigger when showTimeline is enabled on a screenplay", () => {
    render(<StatusBar />);
    const filterBtn = screen.getByText("Timeline Options");
    expect(filterBtn).toBeInTheDocument();
  });

  it("does not render timeline filter trigger when showTimeline is false", () => {
    mockShowTimeline = false;
    render(<StatusBar />);
    expect(screen.queryByText("Timeline Options")).not.toBeInTheDocument();
  });

  it("does not render timeline filter trigger in prose mode", () => {
    mockIsMarkdown = true;
    render(<StatusBar />);
    expect(screen.queryByText("Timeline Options")).not.toBeInTheDocument();
  });

  it("opens filter menu and allows selecting a filter", () => {
    render(<StatusBar />);
    const trigger = screen.getByText("Timeline Options");
    fireEvent.click(trigger);

    expect(screen.getByText("Characters")).toBeInTheDocument();
    expect(screen.getByText("Locations")).toBeInTheDocument();
    expect(screen.getByText("Time of Day")).toBeInTheDocument();
    expect(screen.getByText("Setting (INT/EXT)")).toBeInTheDocument();

    // Click Characters submenu
    fireEvent.click(screen.getByText("Characters"));
    expect(screen.getByPlaceholderText("Search characters...")).toBeInTheDocument();
    expect(screen.getByText("JOHN")).toBeInTheDocument();

    // Select character JOHN
    fireEvent.click(screen.getByText("JOHN"));
    expect(mockSetTimelineFilter).toHaveBeenCalledWith({
      type: "character",
      values: ["JOHN"],
    });
  });

  it("displays active filter label with character name", () => {
    mockTimelineFilter = { type: "character", values: ["JOHN"] };
    render(<StatusBar />);
    expect(screen.getByText("Timeline: CHARACTER (JOHN)")).toBeInTheDocument();
  });

  it("allows selecting Markers filter and displays MARKERS label", () => {
    render(<StatusBar />);
    const trigger = screen.getByText("Timeline Options");
    fireEvent.click(trigger);

    expect(screen.getByText("Markers")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Markers"));

    expect(mockSetTimelineFilter).toHaveBeenCalledWith({
      type: "marker",
      values: [],
    });

    mockTimelineFilter = { type: "marker", values: [] };
    render(<StatusBar />);
    expect(screen.getByText("Timeline: MARKERS")).toBeInTheDocument();
  });

  it("renders display options toggles in timeline options menu", () => {
    render(<StatusBar />);
    const trigger = screen.getByText("Timeline Options");
    fireEvent.click(trigger);

    expect(screen.getByText("Display Options")).toBeInTheDocument();
    expect(screen.getByText("Section Lines")).toBeInTheDocument();
    expect(screen.getByText("Scene Numbers")).toBeInTheDocument();
    expect(screen.getByText("Scene Colors")).toBeInTheDocument();
  });
});


describe("page counter navigation", () => {
  beforeEach(() => {
    mockHasNoScripts = false;
    mockIsMarkdown = false;
    mockTitlePage = false;
    mockRawText = Array.from({ length: 160 }, (_, index) => `Line ${index + 1}`).join("\n");
    mockPageBreaks = [55, 109];
    mockEditorView = { state: EditorState.create({ doc: mockRawText }), dispatch: vi.fn(), focus: vi.fn() };
  });

  it.each([
    { prose: false, title: false, breaks: [55, 109], page: "1", line: 1 },
    { prose: false, title: false, breaks: [55, 109], page: "3", line: 109 },
    { prose: false, title: true, breaks: [5, 55, 109], page: "1", line: 5 },
    { prose: false, title: true, breaks: [5, 55, 109], page: "3", line: 109 },
    { prose: false, title: false, breaks: [], page: "2", line: 55 },
    { prose: true, title: false, breaks: [], page: "3", line: 81 },
  ])("jumps page $page to line $line with prose=$prose title=$title", ({ prose, title, breaks, page, line }) => {
    mockIsMarkdown = prose;
    mockTitlePage = title;
    mockPageBreaks = breaks;
    render(<StatusBar />);
    fireEvent.click(screen.getByRole("button", { name: /Jump to page/ }));
    const input = screen.getByRole("textbox", { name: "Page number" });
    fireEvent.change(input, { target: { value: page } });
    fireEvent.submit(input.closest("form")!);
    expect(mockEditorView!.dispatch).toHaveBeenCalledWith({
      selection: { anchor: mockEditorView!.state.doc.line(line).from }, effects: expect.anything(),
    });
    expect(mockEditorView!.focus).toHaveBeenCalled();
  });

  it.each(["0", "4", "-1", "1.5", "", "text", "1e1"])("rejects invalid page %s", page => {
    render(<StatusBar />);
    fireEvent.click(screen.getByRole("button", { name: /Jump to page/ }));
    const input = screen.getByRole("textbox", { name: "Page number" });
    fireEvent.change(input, { target: { value: page } });
    fireEvent.submit(input.closest("form")!);
    expect(screen.getByText("Enter a whole number from 1 to 3")).toBeInTheDocument();
    expect(mockEditorView!.dispatch).not.toHaveBeenCalled();
  });

  it("accepts typing a page number and pressing Enter, and dismisses with Escape", async () => {
    const user = userEvent.setup();
    render(<StatusBar />);
    await user.click(screen.getByRole("button", { name: /Jump to page/ }));
    const input = screen.getByRole("textbox", { name: "Page number" });
    expect(screen.getByText("Go to page")).toBeInTheDocument();
    expect(screen.getByText("Enter ↵")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Go" })).not.toBeInTheDocument();
    await user.clear(input);
    await user.type(input, "2{Enter}");
    expect(mockEditorView!.dispatch).toHaveBeenCalledWith({
      selection: { anchor: mockEditorView!.state.doc.line(55).from }, effects: expect.anything(),
    });
    await waitFor(() => expect(screen.queryByRole("textbox", { name: "Page number" })).not.toBeInTheDocument());
    mockEditorView!.dispatch.mockClear();
    await user.click(screen.getByRole("button", { name: /Jump to page/ }));
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("textbox", { name: "Page number" })).not.toBeInTheDocument());
    expect(mockEditorView!.dispatch).not.toHaveBeenCalled();
  });

  it("disables jumping until an editor is ready", () => {
    mockEditorView = null;
    render(<StatusBar />);
    expect(screen.getByRole("button", { name: /Jump to page/ })).toBeDisabled();
  });
});
