import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ empty: false, loading: false, index: 0, rightPane: null as string | null, addScript: vi.fn() }));

vi.mock("../../context", () => ({
  useUI: () => ({
    activeTab: "outline",
    paperSize: "a4",
    zoomLevel: 100,
    sidebarWidth: 300,
    isZenMode: false,
    typewriterMode: false,
    showTimeline: true,
    activeRightPane: mock.rightPane,
    rightPaneWidth: 320,
    setRightPaneWidth: vi.fn(),
    setActiveRightPane: vi.fn(),
    setSidebarWidth: vi.fn(),
  }),
  useEditor: () => ({ editorView: null }),
  useFileActions: () => ({ addScript: mock.addScript }),
  useWorkspaceMetadata: () => ({ hasNoScripts: mock.empty, isProse: false, scripts: [], activeScriptIndex: mock.index, activeFileId: "project", isDocumentLoading: mock.loading }),
}));
vi.mock("../SidebarViews", () => ({ SidebarViews: () => <div data-testid="navigator">Navigator</div> }));
vi.mock("../ScriptEditor", () => ({ ScriptEditor: () => <div>Editor</div> }));
vi.mock("../ProseEditor", () => ({ ProseEditor: () => null }));
vi.mock("../SearchPanel", () => ({ SearchPanel: () => <div>Find panel contents</div> }));
vi.mock("../ai/UrAIChatPane", () => ({ UrAIChatPane: () => <div>Chat panel contents</div> }));
vi.mock("../TimelineView", () => ({ TimelineView: () => <div data-testid="timeline">Timeline</div> }));
import { Workspace } from "./Workspace";

describe("editor timeline placement", () => {
  it("keeps the same pane shells and resize handles across open, switch, and close", () => {
    const view = render(<Workspace isSidebarOpen={false} />);
    const right = view.container.querySelector(".right-pane");
    const leftHandle = view.container.querySelector(".sidebar-resizer");
    expect(right).toHaveAttribute("inert");
    try {
      mock.rightPane = "search";
      view.rerender(<Workspace isSidebarOpen />);
      expect(screen.getByText("Find panel contents").closest(".right-pane")).toBe(right);
      mock.rightPane = "prompt";
      view.rerender(<Workspace isSidebarOpen={false} />);
      expect(screen.getByText("Chat panel contents").closest(".right-pane")).toBe(right);
      mock.rightPane = null;
      view.rerender(<Workspace isSidebarOpen />);
      expect(view.container.querySelector(".right-pane")).toBe(right);
      expect(right).toHaveAttribute("inert");
      expect(screen.queryByText("Chat panel contents")).toBeNull();
      expect(view.container.querySelector(".sidebar-resizer")).toBe(leftHandle);
    } finally {
      mock.rightPane = null;
      view.unmount();
    }
  });
  it("does not mount hidden sidebar views", () => {
    const view = render(<Workspace isSidebarOpen={false} />);
    expect(screen.queryByTestId("navigator")).toBeNull();
    view.rerender(<Workspace isSidebarOpen />);
    expect(screen.getByTestId("navigator")).toBeInTheDocument();
    view.unmount();
  });
  it("replaces the previous editor with an embedded loader while a new script prepares", async () => {
    const view = render(<Workspace isSidebarOpen />);
    await waitFor(() => expect(screen.getByText("Editor")).toBeInTheDocument());
    mock.index = 1;
    mock.loading = true;
    view.rerender(<Workspace isSidebarOpen={false} />);
    expect(screen.queryByText("Editor")).toBeNull();
    expect(screen.getByRole("status", { name: "Loading document" })).toHaveClass("actone-window-loading-embedded", "actone-document-loading");
    mock.loading = false;
    view.rerender(<Workspace isSidebarOpen />);
    await waitFor(() => expect(screen.getByText("Editor")).toBeInTheDocument());
    await waitFor(() => expect(screen.queryByRole("status", { name: "Loading document" })).toBeNull());
    view.unmount();
    mock.index = 0;
  });
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
