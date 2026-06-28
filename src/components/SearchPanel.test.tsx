import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

let mockShowSearchPanel = true;
let mockShowReplacePanel = false;
const mockSetShowSearchPanel = vi.fn();
const mockSetShowReplacePanel = vi.fn();

vi.mock("../context", () => ({
  useUI: () => ({
    get showSearchPanel() { return mockShowSearchPanel; },
    setShowSearchPanel: mockSetShowSearchPanel,
    get showReplacePanel() { return mockShowReplacePanel; },
    setShowReplacePanel: mockSetShowReplacePanel,
  }),
  useEditor: () => ({
    get editorView() { return null; },
  }),
}));

import { SearchPanel } from "./SearchPanel";

beforeEach(() => {
  vi.clearAllMocks();
  mockShowSearchPanel = true;
  mockShowReplacePanel = false;
});

describe("SearchPanel Component", () => {
  it("renders nothing when showSearchPanel is false", () => {
    mockShowSearchPanel = false;
    const { container } = render(React.createElement(SearchPanel));
    expect(container.textContent).toBe("");
  });

  it("renders search panel when showSearchPanel is true", () => {
    render(React.createElement(SearchPanel));
    expect(screen.getByPlaceholderText("Find")).toBeTruthy();
  });

  it("shows replace section when showReplacePanel is true", () => {
    mockShowReplacePanel = true;
    render(React.createElement(SearchPanel));
    expect(screen.getByPlaceholderText("Replace")).toBeTruthy();
  });
});
