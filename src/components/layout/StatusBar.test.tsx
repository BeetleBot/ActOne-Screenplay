import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { StatusBar } from "./StatusBar";
import { LineType } from "../../parser";

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
    editorView: null,
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
