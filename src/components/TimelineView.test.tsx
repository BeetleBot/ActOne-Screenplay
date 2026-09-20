import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { TimelineView } from "./TimelineView";
import { LineType } from "../parser";
import type { FountainDocument } from "../parser";

// Mock contexts
const mockScrollToLine = vi.fn();
let mockParsedDoc: FountainDocument | null = null;
let mockActiveLineId: string | null = null;
let mockActiveLineNumber: number = -1;
let mockSelectedSceneId: string | null = null;
let mockTimelineFilter = { type: "default" as const, values: [] as string[] };
let mockTimelineShowSections = true;
let mockTimelineShowSceneNumbers = true;
let mockTimelineShowSceneColors = true;

vi.mock("../context", () => ({
  useFile: () => ({
    parsedDoc: mockParsedDoc,
  }),
  useEditor: () => ({
    scrollToLine: mockScrollToLine,
  }),
  useCursor: () => ({
    activeLineId: mockActiveLineId,
    activeLineNumber: mockActiveLineNumber,
    selectedSceneId: mockSelectedSceneId,
  }),
  useUI: () => ({
    timelineFilter: mockTimelineFilter,
    timelineShowSections: mockTimelineShowSections,
    timelineShowSceneNumbers: mockTimelineShowSceneNumbers,
    timelineShowSceneColors: mockTimelineShowSceneColors,
  }),
}));

describe("TimelineView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockScrollToLine.mockReset();
    mockActiveLineId = null;
    mockActiveLineNumber = -1;
    mockSelectedSceneId = null;
    mockTimelineFilter = { type: "default", values: [] };
    mockTimelineShowSections = true;
    mockTimelineShowSceneNumbers = true;
    mockTimelineShowSceneColors = true;
  });

  it("renders nothing if parsedDoc is null or has no lines", () => {
    mockParsedDoc = null;
    const { container } = render(<TimelineView />);
    expect(container.firstChild).toBeNull();
  });

  it("renders only scenes track when no section or subsection headings exist", () => {
    mockParsedDoc = {
      lines: [
        { id: "l1", text: "INT. COFFEE SHOP - DAY", type: LineType.heading, isOutlineElement: true },
        { id: "l2", text: "A barista makes coffee.", type: LineType.action, isOutlineElement: false },
      ],
      settings: {},
      screenplayText: "",
      pageBreaks: [0],
    };

    render(<TimelineView />);

    expect(screen.queryByText("Draft")).not.toBeInTheDocument();
    expect(document.querySelector(".sections-track")).not.toBeInTheDocument();
    expect(document.querySelector(".subsections-track")).not.toBeInTheDocument();
    expect(document.querySelector(".scenes-track")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("renders acts and sequences correctly with section depths", () => {
    mockParsedDoc = {
      lines: [
        { id: "l1", text: "# ACT I", type: LineType.section, sectionDepth: 1, isOutlineElement: true },
        { id: "l2", text: "## SEQUENCE A", type: LineType.section, sectionDepth: 2, isOutlineElement: true },
        { id: "l3", text: "INT. ROOM - DAY", type: LineType.heading, isOutlineElement: true },
        { id: "l4", text: "JOHN", type: LineType.character, isOutlineElement: false },
        { id: "l5", text: "Hello world.", type: LineType.dialogue, isOutlineElement: false },
        { id: "l6", text: "# ACT II", type: LineType.section, sectionDepth: 1, isOutlineElement: true },
        { id: "l7", text: "EXT. STREET - NIGHT", type: LineType.heading, isOutlineElement: true },
      ],
      settings: {},
      screenplayText: "",
      pageBreaks: [0],
    };

    render(<TimelineView />);

    expect(screen.getByText("ACT I")).toBeInTheDocument();
    expect(screen.getByText("SEQUENCE A")).toBeInTheDocument();
    expect(screen.getByText("ACT II")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("highlights the active scene and section based on activeLineNumber over stale activeLineId", () => {
    mockParsedDoc = {
      lines: [
        { id: "l1", text: "# ACT I", type: LineType.section, sectionDepth: 1, isOutlineElement: true },
        { id: "l2", text: "INT. ROOM - DAY", type: LineType.heading, isOutlineElement: true },
        { id: "l3", text: "Action line in scene 1.", type: LineType.action, isOutlineElement: false },
        { id: "l4", text: "EXT. STREET - NIGHT", type: LineType.heading, isOutlineElement: true },
        { id: "l5", text: "Action line in scene 2.", type: LineType.action, isOutlineElement: false },
      ],
      settings: {},
      screenplayText: "",
    };

    // Simulate cursor is in scene 1 (line index 2) but stale activeLineId points to line index 4
    mockActiveLineNumber = 2;
    mockActiveLineId = "l5";
    render(<TimelineView />);

    const scene1 = screen.getByText("1").closest(".timeline-segment");
    const scene2 = screen.getByText("2").closest(".timeline-segment");
    expect(scene1).toHaveClass("active");
    expect(scene2).not.toHaveClass("active");
  });

  it("calls scrollToLine on pointer down scrubbing", () => {
    mockParsedDoc = {
      lines: [
        { id: "l1", text: "INT. ROOM - DAY", type: LineType.heading, isOutlineElement: true },
        { id: "l2", text: "Line 2", type: LineType.action, isOutlineElement: false },
        { id: "l3", text: "Line 3", type: LineType.action, isOutlineElement: false },
        { id: "l4", text: "Line 4", type: LineType.action, isOutlineElement: false },
      ],
      settings: {},
      screenplayText: "",
    };

    render(<TimelineView />);

    const tracksContainer = document.querySelector(".timeline-tracks-container");
    expect(tracksContainer).toBeInTheDocument();

    // Mock getBoundingClientRect
    vi.spyOn(tracksContainer!, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 400,
      height: 40,
      right: 400,
      bottom: 40,
      x: 0,
      y: 0,
      toJSON: () => {},
    } as DOMRect);

    const el = tracksContainer as HTMLElement;
    el.setPointerCapture = vi.fn();
    el.releasePointerCapture = vi.fn();

    // Click at 50% width (clientX = 200) -> line 2 of 4 lines
    fireEvent.pointerDown(tracksContainer!, {
      clientX: 200,
      button: 0,
      pointerId: 1,
    });

    expect(mockScrollToLine).toHaveBeenCalledWith(2, true);

    // Drag move to 75% width (clientX = 300) -> line 3
    fireEvent.pointerMove(tracksContainer!, {
      clientX: 300,
      pointerId: 1,
    });

    expect(mockScrollToLine).toHaveBeenCalledWith(3, true);

    // Release pointer
    fireEvent.pointerUp(tracksContainer!, {
      clientX: 300,
      pointerId: 1,
    });

    expect(mockScrollToLine).toHaveBeenCalledWith(3, false);
  });

  it("filters scenes by character correctly", () => {
    mockParsedDoc = {
      lines: [
        { id: "l1", text: "INT. ROOM - DAY", type: LineType.heading, isOutlineElement: true },
        { id: "l2", text: "JOHN", type: LineType.character, isOutlineElement: false },
        { id: "l3", text: "Hello", type: LineType.dialogue, isOutlineElement: false },
        { id: "l4", text: "EXT. STREET - NIGHT", type: LineType.heading, isOutlineElement: true },
        { id: "l5", text: "SARAH", type: LineType.character, isOutlineElement: false },
        { id: "l6", text: "Goodbye", type: LineType.dialogue, isOutlineElement: false },
      ],
      settings: {},
      screenplayText: "",
    };

    mockTimelineFilter = { type: "character", values: ["JOHN"] };
    render(<TimelineView />);

    const scene1 = screen.getByText("1").closest(".timeline-segment");
    const scene2 = screen.getByText("2").closest(".timeline-segment");

    expect(scene1).toHaveStyle({ opacity: "1" });
    expect(scene2).toHaveStyle({ opacity: "0.12" });
  });

  it("filters scenes by location correctly", () => {
    mockParsedDoc = {
      lines: [
        { id: "l1", text: "INT. COFFEE SHOP - DAY", type: LineType.heading, location: "COFFEE SHOP", isOutlineElement: true },
        { id: "l2", text: "EXT. HIGHWAY - NIGHT", type: LineType.heading, location: "HIGHWAY", isOutlineElement: true },
      ],
      settings: {},
      screenplayText: "",
    };

    mockTimelineFilter = { type: "location", values: ["COFFEE SHOP"] };
    render(<TimelineView />);

    const scene1 = screen.getByText("1").closest(".timeline-segment");
    const scene2 = screen.getByText("2").closest(".timeline-segment");

    expect(scene1).toHaveStyle({ opacity: "1" });
    expect(scene2).toHaveStyle({ opacity: "0.12" });
  });

  it("filters scenes by setting (INT/EXT) correctly", () => {
    mockParsedDoc = {
      lines: [
        { id: "l1", text: "INT. APARTMENT - DAY", type: LineType.heading, setting: "INT.", isOutlineElement: true },
        { id: "l2", text: "EXT. ROOFTOP - NIGHT", type: LineType.heading, setting: "EXT.", isOutlineElement: true },
      ],
      settings: {},
      screenplayText: "",
    };

    mockTimelineFilter = { type: "setting", values: ["INT"] };
    render(<TimelineView />);

    const scene1 = screen.getByText("1").closest(".timeline-segment");
    const scene2 = screen.getByText("2").closest(".timeline-segment");

    expect(scene1).toHaveStyle({ opacity: "1" });
    expect(scene2).toHaveStyle({ opacity: "0.12" });
  });

  it("renders marker pins and filters scenes by marker", () => {
    mockParsedDoc = {
      lines: [
        { id: "l1", text: "INT. APARTMENT - DAY", type: LineType.heading, isOutlineElement: true },
        { id: "l2", text: "Action with marker", type: LineType.action, marker: { color: "blue", description: "Fix dialogue" }, isOutlineElement: false },
        { id: "l3", text: "EXT. ROOFTOP - NIGHT", type: LineType.heading, isOutlineElement: true },
        { id: "l4", text: "Night action", type: LineType.action, isOutlineElement: false },
      ],
      settings: {},
      screenplayText: "",
    };

    mockTimelineFilter = { type: "marker", values: [] };
    render(<TimelineView />);

    // Check scene filtering: scene 1 has a marker, scene 2 does not
    const scene1 = screen.getByText("1").closest(".timeline-segment");
    const scene2 = screen.getByText("2").closest(".timeline-segment");
    expect(scene1).toHaveStyle({ opacity: "1" });
    expect(scene2).toHaveStyle({ opacity: "0.12" });

    // Check marker pin rendering
    const pin = document.querySelector(".timeline-marker-pin");
    expect(pin).toBeInTheDocument();

    // Clicking marker pin scrolls to that line
    fireEvent.click(pin!);
    expect(mockScrollToLine).toHaveBeenCalledWith(1, false);
  });

  it("hides section tracks when mockTimelineShowSections is false", () => {
    mockParsedDoc = {
      lines: [
        { id: "l1", text: "# ACT I", type: LineType.section, sectionDepth: 1, isOutlineElement: true },
        { id: "l2", text: "INT. ROOM - DAY", type: LineType.heading, isOutlineElement: true },
      ],
      settings: {},
      screenplayText: "",
    };
    mockTimelineShowSections = false;
    render(<TimelineView />);

    expect(screen.queryByText("ACT I")).not.toBeInTheDocument();
    expect(document.querySelector(".sections-track")).not.toBeInTheDocument();
  });

  it("hides scene numbers when mockTimelineShowSceneNumbers is false", () => {
    mockParsedDoc = {
      lines: [
        { id: "l1", text: "INT. ROOM - DAY", type: LineType.heading, isOutlineElement: true },
      ],
      settings: {},
      screenplayText: "",
    };
    mockTimelineShowSceneNumbers = false;
    render(<TimelineView />);

    expect(screen.queryByText("1")).not.toBeInTheDocument();
  });

  it("omits scene colors when mockTimelineShowSceneColors is false", () => {
    mockParsedDoc = {
      lines: [
        { id: "l1", text: "INT. ROOM - DAY", type: LineType.heading, color: "blue", isOutlineElement: true },
      ],
      settings: {},
      screenplayText: "",
    };
    mockTimelineShowSceneColors = false;
    render(<TimelineView />);

    const segment = document.querySelector(".timeline-segment.scene-segment");
    expect(segment).toBeInTheDocument();
    expect(segment).not.toHaveClass("colored");
  });
});
