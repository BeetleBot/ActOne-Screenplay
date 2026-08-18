import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import React from "react";

vi.mock("../../context", () => ({
  useUI: () => ({ fontFamily: "font-courier", spellcheckEnabled: true }),
  useEditor: () => ({ updateSettings: vi.fn() }),
  useParking: () => ({ addItem: vi.fn() }),
  useFile: () => ({ files: [], activeFileId: null }),
}));

import { CoreEditor } from "./CoreEditor";

describe("CoreEditor Component", () => {
  it("renders container element properly", () => {
    const containerRef = React.createRef<HTMLDivElement>();
    const viewRef = { current: null };

    const { container } = render(
      <CoreEditor
        containerRef={containerRef}
        viewRef={viewRef}
      />
    );

    expect(container.querySelector(".editor-font-wrapper")).toBeTruthy();
  });

  it("passes custom context menu items correctly", () => {
    const containerRef = React.createRef<HTMLDivElement>();
    const viewRef = { current: null };
    const mockExtraItems = vi.fn().mockReturnValue([{ label: "Custom Action", action: vi.fn() }]);

    const { container } = render(
      <CoreEditor
        containerRef={containerRef}
        viewRef={viewRef}
        extraContextMenuItems={mockExtraItems}
      />
    );

    expect(container.querySelector(".editor-font-wrapper")).toBeTruthy();
  });
});
