import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

let mockFileState = {
  rawText: "EXT. HOUSE - DAY\n\nHello.",
  isBundle: false,
  activeScriptName: "Script",
  filePath: null,
  updateSettings: vi.fn(),
  parsedDoc: { lines: [], settings: {}, screenplayText: "EXT. HOUSE - DAY\n\nHello." },
  scripts: [{ id: "s1", name: "Script", type: "fountain", content: "EXT. HOUSE - DAY\n\nHello." }],
  activeScriptIndex: 0,
};

vi.mock("../context", () => ({
  useFile: () => mockFileState,
  useUI: () => ({
    fontFamily: "courier-prime",
    paperSize: "letter",
    appScale: 100,
  }),
}));

import { ExportModal } from "./ExportModal";

beforeEach(() => {
  vi.clearAllMocks();
  mockFileState = {
    rawText: "EXT. HOUSE - DAY\n\nHello.",
    isBundle: false,
    activeScriptName: "Script",
    filePath: null,
    updateSettings: vi.fn(),
    parsedDoc: { lines: [], settings: {}, screenplayText: "EXT. HOUSE - DAY\n\nHello." },
    scripts: [{ id: "s1", name: "Script", type: "fountain", content: "EXT. HOUSE - DAY\n\nHello." }],
    activeScriptIndex: 0,
  };
});

describe("ExportModal Component", () => {
  it("renders without crashing", () => {
    const { container } = render(React.createElement(ExportModal, { onClose: vi.fn() }));
    expect(container).toBeTruthy();
  });

  it("renders script mode export options", () => {
    render(React.createElement(ExportModal, { onClose: vi.fn() }));
    expect(screen.getByText(/export script/i)).toBeTruthy();
    expect(screen.getByText(/start each scene on new page/i)).toBeTruthy();
    expect(screen.getByText(/^fountain$/i)).toBeTruthy();
  });

  it("renders prose mode export modal correctly", () => {
    mockFileState = {
      ...mockFileState,
      scripts: [{ id: "s1", name: "Chapter 1", type: "markdown", content: "# Chapter 1\n\nSome prose text." }],
    };
    render(React.createElement(ExportModal, { onClose: vi.fn() }));
    expect(screen.getByText(/export prose/i)).toBeTruthy();
    expect(screen.getByText(/markdown \(\.md\)/i)).toBeTruthy();
    expect(screen.queryByText(/^fountain$/i)).toBeNull();
    expect(screen.queryByText(/element formatting/i)).toBeNull();
  });
});
