import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";

const mockSetActiveRightPane = vi.fn();
const mockConfirm = vi.fn();

vi.mock("../context", () => ({
  useUI: () => ({
    activeRightPane: "search",
    setActiveRightPane: mockSetActiveRightPane,
  }),
  useEditor: () => ({
    get editorView() { return null; },
  }),
  useFile: () => ({
    parsedDoc: { screenplayText: "Hello world\n\nAnother line", lines: [{ text: "Hello world", type: 0, sceneNumber: undefined }] },
    rawText: "Hello world\n\nAnother line",
    setRawText: vi.fn(),
  }),
  useCustomModal: () => ({
    confirm: mockConfirm,
  }),
}));

import { SearchPanel } from "./SearchPanel";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SearchPanel Component", () => {
  it("renders the search input", () => {
    render(React.createElement(SearchPanel));
    expect(screen.getByPlaceholderText("Find...")).toBeTruthy();
  });

  it("renders empty state when no query is entered", () => {
    render(React.createElement(SearchPanel));
    expect(screen.getByText(/Type a query to search/)).toBeTruthy();
  });

  it("shows replace section when chevron is clicked", () => {
    render(React.createElement(SearchPanel));
    const chevron = screen.getByLabelText("Show replace");
    act(() => { fireEvent.click(chevron); });
    expect(screen.getByPlaceholderText("Replace with...")).toBeTruthy();
  });

  it("shows no results state when query does not match", () => {
    render(React.createElement(SearchPanel));
    const nativeInput = screen.getByPlaceholderText("Find...") as HTMLInputElement;
    act(() => {
      fireEvent.change(nativeInput, { target: { value: "zzzznotfound" } });
    });
    expect(screen.getByText("No matches found")).toBeTruthy();
  });
});
