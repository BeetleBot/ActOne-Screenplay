import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

const { editorViewRef, copySceneMock, lineNumberToggle, openFilePathMock } = vi.hoisted(() => ({
  editorViewRef: { current: null as { state: import("@codemirror/state").EditorState } | null },
  lineNumberToggle: vi.fn(),
  copySceneMock: vi.fn().mockResolvedValue(true),
  openFilePathMock: vi.fn(),
}));

const mockRecentFiles = [
  { path: "C:/Projects/MovieA.actone", name: "MovieA", lastOpened: Date.now() - 1000 * 60 * 5 },
  { path: "C:/Projects/ScriptB.fountain", name: "ScriptB", lastOpened: Date.now() - 1000 * 60 * 60 * 2 },
];

vi.mock("../context", () => ({
  useFile: () => ({
    rawText: "",
    scripts: [],
    scriptFileName: "test.fountain",
    recentFiles: mockRecentFiles,
    openFilePath: openFilePathMock,
    saveFile: vi.fn(),
    updateSettings: vi.fn(),
  }),
  useEditor: () => ({ editorView: editorViewRef.current }),
  useScriptEditor: () => ({ autoAddSceneNumbers: vi.fn(), clearSceneNumbers: vi.fn() }),
  useUI: () => ({
    typewriterMode: false,
    setTypewriterMode: vi.fn(),
    setActiveTab: vi.fn(),
    setFontFamily: vi.fn(),
    setPaperSize: vi.fn(),
    setShowSearchPanel: vi.fn(),
    setShowReplacePanel: vi.fn(),
    isZenMode: false,
    setIsZenMode: vi.fn(),
    zoomLevel: 100,
    setZoomLevel: vi.fn(),
    appScale: 100,
    hideSyntaxEnabled: false,
    setHideSyntaxEnabled: vi.fn(),
    hideTagsEnabled: false,
    setHideTagsEnabled: vi.fn(),
    lineNumbersEnabled: true,
    setLineNumbersEnabled: lineNumberToggle,
    lineFocusEnabled: false,
    setLineFocusEnabled: vi.fn(),
  }),
  useCustomModal: () => ({
    confirm: vi.fn().mockResolvedValue("ok"),
    prompt: vi.fn().mockResolvedValue(""),
  }),
}));

vi.mock("../utils", () => ({
  copyToClipboard: copySceneMock,
  readFromClipboard: vi.fn().mockResolvedValue(""),
}));

import { CommandPalette } from "./CommandPalette";
import { EditorState } from "@codemirror/state";
import { lineTypesField } from "../editor/fountainSyntax";

const defaultProps = {
  isOpen: false,
  onClose: vi.fn(),
  onExportPDF: vi.fn(),
  toggleSidebar: vi.fn(),
  isSidebarOpen: false,
  onOpenStructureModal: vi.fn(),
  onOpenSettingsModal: vi.fn(),
  onOpenTitlePageModal: vi.fn(),
  onOpenHelpModal: vi.fn(),
  onOpenBreakdownModal: vi.fn(),
  onOpenThemeManagerModal: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  editorViewRef.current = null;
});

describe("CommandPalette Component", () => {
  it("renders nothing when isOpen is false", () => {
    const { container } = render(React.createElement(CommandPalette, defaultProps));
    expect(container.textContent).toBe("");
  });

  it("renders command palette when isOpen is true", () => {
    render(React.createElement(CommandPalette, { ...defaultProps, isOpen: true }));
    expect(screen.getByPlaceholderText("Type a command or search...")).toBeTruthy();
  });

  it("triggers onOpenBugReportModal when clicking Report a Bug", () => {
    const onOpenBugReportModal = vi.fn();
    render(React.createElement(CommandPalette, { ...defaultProps, isOpen: true, onOpenBugReportModal }));
    const bugItem = screen.getByText("Report a Bug");
    bugItem.click();
    expect(onOpenBugReportModal).toHaveBeenCalledTimes(1);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("triggers onOpenSceneJump when clicking Jump to Scene", () => {
    const onOpenSceneJump = vi.fn();
    render(React.createElement(CommandPalette, { ...defaultProps, isOpen: true, onOpenSceneJump }));
    const jumpItem = screen.getByText("Jump to Scene...");
    jumpItem.click();
    expect(onOpenSceneJump).toHaveBeenCalledTimes(1);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("copies the scene under the cursor from the command palette", () => {
    const text = "INT. HOUSE - NIGHT\n\nBOB\nHello.\n\nEXT. STREET - DAY\n\nALICE\nHi.";
    const state = EditorState.create({
      doc: text,
      selection: { anchor: text.indexOf("Hello") },
      extensions: [lineTypesField],
    });
    editorViewRef.current = { state };

    render(React.createElement(CommandPalette, { ...defaultProps, isOpen: true }));
    screen.getByText("Copy Current Scene").click();

    expect(copySceneMock).toHaveBeenCalledWith("INT. HOUSE - NIGHT\n\nBOB\nHello.\n\n");
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("can hide editor line numbers from the command palette", () => {
    render(<CommandPalette {...defaultProps} isOpen />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Hide Line Numbers" } });
    fireEvent.click(screen.getByText("Hide Line Numbers"));
    expect(lineNumberToggle).toHaveBeenCalledWith(false);
  });

  it("opens recent projects sub-menu and opens selected project", () => {
    render(<CommandPalette {...defaultProps} isOpen />);
    
    // Find Open Recent Projects... entry and click it
    const recentEntry = screen.getByText("Open Recent Projects...");
    fireEvent.click(recentEntry);

    // Verify sub-menu title and placeholder
    expect(screen.getByPlaceholderText("Search recent projects...")).toBeTruthy();
    expect(screen.getAllByText("Recent Projects").length).toBeGreaterThan(0);
    expect(screen.getByText("MovieA")).toBeTruthy();
    expect(screen.getByText("ScriptB")).toBeTruthy();

    // Click MovieA to open
    fireEvent.click(screen.getByText("MovieA"));
    expect(openFilePathMock).toHaveBeenCalledWith("C:/Projects/MovieA.actone");
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("navigates back from recent projects sub-menu with Escape", () => {
    render(<CommandPalette {...defaultProps} isOpen />);
    fireEvent.click(screen.getByText("Open Recent Projects..."));
    expect(screen.getByPlaceholderText("Search recent projects...")).toBeTruthy();

    const input = screen.getByRole("textbox");
    fireEvent.keyDown(input, { key: "Escape" });

    // Should return to main commands view without closing palette
    expect(screen.getByPlaceholderText("Type a command or search...")).toBeTruthy();
    expect(defaultProps.onClose).not.toHaveBeenCalled();

    // Second Escape closes palette
    fireEvent.keyDown(input, { key: "Escape" });
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it("does not show recent projects in top-level search query", () => {
    render(<CommandPalette {...defaultProps} isOpen />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "MovieA" } });

    // MovieA should NOT appear directly in top-level commands search
    expect(screen.queryByText("MovieA")).toBeNull();

    // Only appears after navigating into "Open Recent Projects..."
    fireEvent.change(input, { target: { value: "recent" } });
    fireEvent.click(screen.getByText("Open Recent Projects..."));
    expect(screen.getByText("MovieA")).toBeTruthy();
  });
});
