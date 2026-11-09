import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SystemFontPicker } from "./SystemFontPicker";
import * as tauriCore from "@tauri-apps/api/core";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("SystemFontPicker component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render font list when open is false", () => {
    render(
      <SystemFontPicker
        open={false}
        script="Tamil"
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByText(/Select System Font/i)).not.toBeInTheDocument();
  });

  it("loads and displays system fonts when opened", async () => {
    vi.mocked(tauriCore.invoke).mockResolvedValueOnce(["Courier Prime", "Mukta", "Arial"]);

    render(
      <SystemFontPicker
        open={true}
        script="Tamil"
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Courier Prime")).toBeInTheDocument();
      expect(screen.getByText("Mukta")).toBeInTheDocument();
    });
  });

  it("filters fonts when user types into search input", async () => {
    vi.mocked(tauriCore.invoke).mockResolvedValueOnce(["Courier Prime", "Mukta", "Arial"]);

    render(
      <SystemFontPicker
        open={true}
        script="Tamil"
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Courier Prime")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search fonts/i);
    fireEvent.change(searchInput, { target: { value: "Mukta" } });

    expect(screen.getByText("Mukta")).toBeInTheDocument();
    expect(screen.queryByText("Courier Prime")).not.toBeInTheDocument();
  });

  it("calls onSelect when a font option is clicked", async () => {
    vi.mocked(tauriCore.invoke).mockResolvedValueOnce(["Courier Prime"]);
    const onSelect = vi.fn();

    render(
      <SystemFontPicker
        open={true}
        script="Latin"
        onSelect={onSelect}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Courier Prime")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Courier Prime"));
    expect(onSelect).toHaveBeenCalledWith("Courier Prime");
  });
});
