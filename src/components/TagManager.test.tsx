import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

vi.mock("../context", () => ({
  useFile: () => ({
    parsedDoc: { lines: [], settings: {}, screenplayText: "" },
    filePath: null,
    activeScriptName: "Script",
    scriptFileName: "test.fountain",
  }),
  useEditor: () => ({
    editorView: null,
    scrollToLine: vi.fn(),
    updateSettings: vi.fn(),
  }),
  useUI: () => ({
    appScale: 100,
  }),
}));

import { TagManager } from "./TagManager";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TagManager Component", () => {
  it("renders without crashing", () => {
    const { container } = render(React.createElement(TagManager, { onClose: vi.fn() }));
    expect(container).toBeTruthy();
  });

  it("renders tag manager title", () => {
    render(React.createElement(TagManager, { onClose: vi.fn() }));
    expect(screen.getByText("Tag Manager")).toBeTruthy();
  });
});
