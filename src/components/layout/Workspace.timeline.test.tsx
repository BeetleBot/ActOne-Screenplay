import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ empty: false, addScript: vi.fn() }));

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
  useFileActions: () => ({ addScript: mock.addScript }),
  useWorkspaceMetadata: () => ({ hasNoScripts: mock.empty, isProse: false, scripts: [], activeScriptIndex: 0 }),
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
  it("opens the empty-project landing page and creates Canvas without menu context", () => {
    mock.empty = true;
    const view = render(<Workspace isSidebarOpen />);
    fireEvent.click(screen.getByRole("button", { name: /New Canvas File/ }));
    expect(mock.addScript).toHaveBeenCalledWith(undefined, "canvas");
    view.unmount();
    mock.empty = false;
  });
  it("keeps the timeline out of the rounded editor container", () => {
    render(<Workspace isSidebarOpen />);
    expect(screen.queryByTestId("timeline")).toBeNull();
    expect(screen.getByTestId("navigator").closest("#sidebar-container")).not.toBeNull();
  });
});
