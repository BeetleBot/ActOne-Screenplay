import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

vi.mock("../context", () => ({
  useFile: () => ({ rawText: "", scripts: [], scriptFileName: "test.fountain", saveFile: vi.fn(), updateSettings: vi.fn() }),
  useEditor: () => ({ editorView: null }),
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
    lineFocusEnabled: false,
    setLineFocusEnabled: vi.fn(),
  }),
}));

import { CommandPalette } from "./CommandPalette";

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
});

