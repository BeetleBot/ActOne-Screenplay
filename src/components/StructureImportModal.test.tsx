import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { StructureImportModal } from "./StructureImportModal";
import * as tauriCore from "@tauri-apps/api/core";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("../context", () => ({
  useFile: () => ({
    rawText: "",
    setRawText: vi.fn(),
    files: [{ id: "file-1", scripts: [{ name: "Main.fountain" }] }],
    activeFileId: "file-1",
    filePath: "my_movie.fountain",
    addScript: vi.fn(),
  }),
  useEditor: () => ({
    editorView: null,
  }),
}));

vi.mock("./TitleBar", () => ({
  TitleBar: () => <div data-testid="mock-titlebar">TitleBar</div>,
}));

describe("StructureImportModal component", () => {
  const mockStructures = [
    {
      name: "Save The Cat",
      description: "15 beat structure",
      beats: [
        { label: "Opening Image", description: "First snapshot" },
        { label: "Theme Stated", description: "What the story is about" },
      ],
    },
    {
      name: "Hero's Journey",
      description: "Monomyth beats",
      beats: [{ label: "Ordinary World", description: "Status quo" }],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders structure templates and action buttons", async () => {
    vi.mocked(tauriCore.invoke).mockResolvedValueOnce(mockStructures);

    render(<StructureImportModal onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Save The Cat")).toBeInTheDocument();
      expect(screen.getByText("15 beat structure")).toBeInTheDocument();
      expect(screen.getByText("Hero's Journey")).toBeInTheDocument();
      expect(screen.getByText(/Insert at Cursor/i)).toBeInTheDocument();
      expect(screen.getByText(/Append to End/i)).toBeInTheDocument();
      expect(screen.getByText(/Overwrite Screenplay/i)).toBeInTheDocument();
    });
  });

  it("selects structure tile when clicked", async () => {
    vi.mocked(tauriCore.invoke).mockResolvedValueOnce(mockStructures);

    render(<StructureImportModal onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Hero's Journey")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Hero's Journey"));
    expect(screen.getByText("Hero's Journey")).toBeInTheDocument();
  });
});
