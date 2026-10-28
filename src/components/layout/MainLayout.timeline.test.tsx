import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MainLayout } from "./MainLayout";
const state = vi.hoisted(() => ({ showTimeline: true, isZenMode: false, isProse: false, hasNoScripts: false }));
vi.mock("../../context", () => ({ useUI: () => ({ ...state, setActiveTab: vi.fn() }), useWorkspaceMetadata: () => state }));
vi.mock("./HeaderBar", () => ({ HeaderBar: () => null }));
vi.mock("./ActivityBar", () => ({ ActivityBar: () => null }));
vi.mock("./Workspace", () => ({ Workspace: () => <div className="editor-container">Editor</div> }));
vi.mock("./StatusBar", () => ({ StatusBar: () => <div data-testid="status">Status</div> }));
vi.mock("../TimelineView", () => ({ TimelineView: () => <div data-testid="timeline">Timeline</div> }));
afterEach(cleanup);
beforeEach(() => Object.assign(state, { showTimeline: true, isZenMode: false, isProse: false, hasNoScripts: false }));
const mount = () => render(<MainLayout isSidebarOpen={false} setIsSidebarOpen={vi.fn()} onOpenSettingsModal={vi.fn()} onOpenPalette={vi.fn()} />);
it("shares a footer with StatusBar outside the rounded editor", () => {
  mount();
  const footer = screen.getByRole("contentinfo");
  expect(footer).toContainElement(screen.getByTestId("timeline"));
  expect(footer).toContainElement(screen.getByTestId("status"));
  expect(screen.getByTestId("timeline").closest(".editor-container")).toBeNull();
});
it.each(["isZenMode", "isProse", "hasNoScripts"] as const)("hides timeline when %s", key => {
  state[key] = true; mount();
  expect(screen.queryByTestId("timeline")).toBeNull();
  expect(screen.getByTestId("status")).toBeInTheDocument();
});
it("respects the timeline visibility preference", () => { state.showTimeline = false; mount(); expect(screen.queryByTestId("timeline")).toBeNull(); });
