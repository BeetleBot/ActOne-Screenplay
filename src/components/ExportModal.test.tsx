import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

vi.mock("../context", () => ({
  useFile: () => ({
    rawText: "EXT. HOUSE - DAY\n\nHello.",
    isBundle: false,
    activeScriptName: "Script",
    filePath: null,
    updateSettings: vi.fn(),
    parsedDoc: { lines: [], settings: {}, screenplayText: "EXT. HOUSE - DAY\n\nHello." },
  }),
  useUI: () => ({
    fontFamily: "courier-prime",
    paperSize: "letter",
    appScale: 100,
  }),
}));

import { ExportModal } from "./ExportModal";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ExportModal Component", () => {
  it("renders without crashing", () => {
    const { container } = render(React.createElement(ExportModal, { onClose: vi.fn() }));
    expect(container).toBeTruthy();
  });

  it("renders export options", () => {
    render(React.createElement(ExportModal, { onClose: vi.fn() }));
    expect(screen.getByText(/export script/i)).toBeTruthy();
  });

  it("renders start-each-scene-on-new-page option in PDF pane", () => {
    render(React.createElement(ExportModal, { onClose: vi.fn() }));
    expect(screen.getByText(/start each scene on new page/i)).toBeTruthy();
  });
});
