import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

const { editorViewRef, copySceneMock, lineNumberToggle } = vi.hoisted(() => ({
  editorViewRef: { current: null as { state: import("@codemirror/state").EditorState } | null },
  lineNumberToggle: vi.fn(),
  copySceneMock: vi.fn().mockResolvedValue(true),
}));

vi.mock("../context", () => ({
  useFile: () => ({ rawText: "", scripts: [], scriptFileName: "test.fountain", saveFile: vi.fn(), updateSettings: vi.fn() }),
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
});


it("can hide editor line numbers from the command palette", () => {
  render(<CommandPalette {...defaultProps} isOpen />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Hide Line Numbers" } });
  fireEvent.click(screen.getByText("Hide Line Numbers"));
  expect(lineNumberToggle).toHaveBeenCalledWith(false);
});
