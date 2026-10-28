import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../context", () => ({
  useUI: () => ({
    activeTab: "outline",
    paperSize: "a4",
    zoomLevel: 100,
    sidebarWidth: 300,
    isZenMode: false,
    typewriterMode: false,
    showTimeline: true,
    activeRightPane: null,
    setActiveRightPane: vi.fn(),
    setSidebarWidth: vi.fn(),
  }),
  useEditor: () => ({ editorView: null }),
  useFileActions: () => ({}),
  useWorkspaceMetadata: () => ({ hasNoScripts: false, isProse: false }),
}));
vi.mock("../SidebarViews", () => ({ SidebarViews: () => <div data-testid="navigator">Navigator</div> }));
vi.mock("../ScriptEditor", () => ({ ScriptEditor: () => <div>Editor</div> }));
vi.mock("../ProseEditor", () => ({ ProseEditor: () => null }));
vi.mock("../SearchPanel", () => ({ SearchPanel: () => null }));
vi.mock("../MusePanel", () => ({ MusePanel: () => null }));
vi.mock("../RightPane", () => ({ RightPane: () => null }));
vi.mock("../TimelineView", () => ({ TimelineView: () => <div data-testid="timeline">Timeline</div> }));
import { Workspace } from "./Workspace";

describe("editor timeline placement", () => {
  it("keeps the timeline out of the rounded editor container", () => {
    render(<Workspace isSidebarOpen />);
    expect(screen.queryByTestId("timeline")).toBeNull();
    expect(screen.getByTestId("navigator").closest("#sidebar-container")).not.toBeNull();
  });
});
