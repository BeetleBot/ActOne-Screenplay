import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import React from "react";
import type { ScriptInfo } from "../utils/actone";

let mockScripts: ScriptInfo[] = [];
let mockActiveScriptIndex = 0;
let mockIsBundle = true;
const mockSetActiveScript = vi.fn();
const mockAddScript = vi.fn();
const mockImportScript = vi.fn();
const mockRenameScript = vi.fn();
const mockDuplicateScript = vi.fn();
const mockDeleteScript = vi.fn();
const mockMoveScript = vi.fn();

vi.mock("../context", () => ({
  useFile: () => ({
    get scripts() {
      return mockScripts;
    },
    get activeScriptIndex() {
      return mockActiveScriptIndex;
    },
    get isBundle() {
      return mockIsBundle;
    },
    activeFileId: "test-file-1",
    setActiveScript: mockSetActiveScript,
    addScript: mockAddScript,
    importScript: mockImportScript,
    renameScript: mockRenameScript,
    duplicateScript: mockDuplicateScript,
    deleteScript: mockDeleteScript,
    moveScript: mockMoveScript,
  }),
  useUI: () => ({
    translationJob: null,
  }),
}));

vi.mock("../hooks", () => ({}));

import { ScriptsView } from "./ScriptsView";

beforeEach(() => {
  vi.clearAllMocks();
  mockScripts = [
    { name: "Screenplay Main", fileName: "main.fountain", type: "fountain", content: "" },
    { name: "Notes & Worldbuilding", fileName: "notes.md", type: "markdown", content: "" },
  ];
  mockActiveScriptIndex = 0;
  mockIsBundle = true;
});

describe("ScriptsView Component", () => {
  it("renders null if not in a bundle", () => {
    mockIsBundle = false;
    const { container } = render(<ScriptsView />);
    expect(container.firstChild).toBeNull();
  });

  it("renders scripts list with SCRIPT and PROSE tags", () => {
    render(<ScriptsView />);
    expect(screen.getByText("Screenplay Main")).toBeTruthy();
    expect(screen.getByText("Notes & Worldbuilding")).toBeTruthy();
    expect(screen.getByText("SCRIPT")).toBeTruthy();
    expect(screen.getByText("PROSE")).toBeTruthy();
  });

  it("renders empty state when there are no scripts", () => {
    mockScripts = [];
    render(<ScriptsView />);
    expect(screen.getByText("No files yet")).toBeTruthy();
    expect(screen.getByText("Click + above to add a screenplay or prose document.")).toBeTruthy();
  });

  it("handles active script selection", () => {
    render(<ScriptsView />);
    const notesItem = screen.getByText("Notes & Worldbuilding");
    act(() => {
      fireEvent.click(notesItem);
    });
    expect(mockSetActiveScript).toHaveBeenCalledWith(1);
  });

  describe("Search functionality", () => {
    beforeEach(() => {
      mockScripts = [
        { name: "Episode 1", fileName: "ep1.fountain", type: "fountain", content: "" },
        { name: "Episode 2", fileName: "ep2.fountain", type: "fountain", content: "" },
        { name: "Character Lore", fileName: "lore.md", type: "markdown", content: "" },
        { name: "Treatment", fileName: "treatment.md", type: "markdown", content: "" },
      ];
    });

    it("renders search input when scripts count > 3", () => {
      render(<ScriptsView />);
      expect(screen.getByPlaceholderText("Search files...")).toBeTruthy();
    });

    it("filters scripts list based on search query", () => {
      render(<ScriptsView />);
      const searchInput = screen.getByPlaceholderText("Search files...") as HTMLInputElement;

      act(() => {
        fireEvent.change(searchInput, { target: { value: "episode" } });
      });

      expect(screen.getByText("Episode 1")).toBeTruthy();
      expect(screen.getByText("Episode 2")).toBeTruthy();
      expect(screen.queryByText("Character Lore")).toBeNull();
      expect(screen.queryByText("Treatment")).toBeNull();
    });

    it("shows no matching files state when search yields no results", () => {
      render(<ScriptsView />);
      const searchInput = screen.getByPlaceholderText("Search files...") as HTMLInputElement;

      act(() => {
        fireEvent.change(searchInput, { target: { value: "nonexistent" } });
      });

      expect(screen.getByText("No matching files")).toBeTruthy();
      expect(screen.getByText("Try a different search query.")).toBeTruthy();
    });

    it("clears search query when clear button is clicked", () => {
      render(<ScriptsView />);
      const searchInput = screen.getByPlaceholderText("Search files...") as HTMLInputElement;

      act(() => {
        fireEvent.change(searchInput, { target: { value: "Lore" } });
      });
      expect(screen.queryByText("Episode 1")).toBeNull();

      // Find clear button (IconButton within input endAdornment)
      const clearBtn = searchInput.parentElement?.querySelector("button");
      expect(clearBtn).toBeTruthy();
      act(() => {
        fireEvent.click(clearBtn!);
      });

      expect(screen.getByText("Episode 1")).toBeTruthy();
      expect(screen.getByText("Character Lore")).toBeTruthy();
    });
  });

  describe("Rename actions", () => {
    it("handles double-click rename and saves on Enter", async () => {
      render(<ScriptsView />);
      const scriptText = screen.getByText("Screenplay Main");

      act(() => {
        fireEvent.doubleClick(scriptText);
      });

      const input = screen.getByDisplayValue("Screenplay Main") as HTMLInputElement;
      expect(input).toBeTruthy();

      act(() => {
        fireEvent.change(input, { target: { value: "Pilot Episode" } });
        fireEvent.keyDown(input, { key: "Enter" });
      });

      expect(mockRenameScript).toHaveBeenCalledWith(0, "Pilot Episode");
    });

    it("handles double-click rename and saves on blur", async () => {
      render(<ScriptsView />);
      const scriptText = screen.getByText("Screenplay Main");

      act(() => {
        fireEvent.doubleClick(scriptText);
      });

      const input = screen.getByDisplayValue("Screenplay Main") as HTMLInputElement;
      act(() => {
        fireEvent.change(input, { target: { value: "New Title" } });
        fireEvent.blur(input);
      });

      expect(mockRenameScript).toHaveBeenCalledWith(0, "New Title");
    });

    it("cancels rename on Escape key without saving", () => {
      render(<ScriptsView />);
      const scriptText = screen.getByText("Screenplay Main");

      act(() => {
        fireEvent.doubleClick(scriptText);
      });

      const input = screen.getByDisplayValue("Screenplay Main") as HTMLInputElement;
      act(() => {
        fireEvent.change(input, { target: { value: "Discarded" } });
        fireEvent.keyDown(input, { key: "Escape" });
      });

      expect(mockRenameScript).not.toHaveBeenCalled();
      expect(screen.queryByDisplayValue("Discarded")).toBeNull();
    });

    it("handles rename from context menu with disableRestoreFocus", async () => {
      render(<ScriptsView />);

      const scriptItem = screen.getByText("Screenplay Main").closest("[data-script-index]")!;
      const moreBtn = scriptItem.querySelector("button")!;

      act(() => {
        fireEvent.click(moreBtn);
      });

      const renameMenuItem = screen.getByText("Rename");
      act(() => {
        fireEvent.click(renameMenuItem);
      });

      const input = (await waitFor(() => screen.getByDisplayValue("Screenplay Main"))) as HTMLInputElement;
      expect(input).toBeTruthy();

      act(() => {
        fireEvent.change(input, { target: { value: "Renamed Via Menu" } });
        fireEvent.keyDown(input, { key: "Enter" });
      });

      expect(mockRenameScript).toHaveBeenCalledWith(0, "Renamed Via Menu");
    });
  });

  describe("Context menu actions: Move Up, Move Down, Duplicate, Delete", () => {
    it("handles Move Down on first item", () => {
      render(<ScriptsView />);
      const scriptItem = screen.getByText("Screenplay Main").closest("[data-script-index]")!;
      const moreBtn = scriptItem.querySelector("button")!;

      act(() => {
        fireEvent.click(moreBtn);
      });

      const moveUpItem = screen.getByText("Move Up").closest("li");
      expect(moveUpItem?.getAttribute("aria-disabled")).toBe("true");

      const moveDownItem = screen.getByText("Move Down");
      act(() => {
        fireEvent.click(moveDownItem);
      });

      expect(mockMoveScript).toHaveBeenCalledWith(0, 1);
    });

    it("handles Move Up on second item", () => {
      render(<ScriptsView />);
      const scriptItem = screen.getByText("Notes & Worldbuilding").closest("[data-script-index]")!;
      const moreBtn = scriptItem.querySelector("button")!;

      act(() => {
        fireEvent.click(moreBtn);
      });

      const moveDownItem = screen.getByText("Move Down").closest("li");
      expect(moveDownItem?.getAttribute("aria-disabled")).toBe("true");

      const moveUpItem = screen.getByText("Move Up");
      act(() => {
        fireEvent.click(moveUpItem);
      });

      expect(mockMoveScript).toHaveBeenCalledWith(1, 0);
    });

    it("handles Duplicate action", async () => {
      mockDuplicateScript.mockResolvedValueOnce("Screenplay Main (Copy)");
      render(<ScriptsView />);
      const scriptItem = screen.getByText("Screenplay Main").closest("[data-script-index]")!;
      const moreBtn = scriptItem.querySelector("button")!;

      act(() => {
        fireEvent.click(moreBtn);
      });

      const duplicateItem = screen.getByText("Duplicate");
      await act(async () => {
        fireEvent.click(duplicateItem);
      });

      expect(mockDuplicateScript).toHaveBeenCalledWith(0);
    });

    it("handles Delete action", async () => {
      render(<ScriptsView />);
      const scriptItem = screen.getByText("Screenplay Main").closest("[data-script-index]")!;
      const moreBtn = scriptItem.querySelector("button")!;

      act(() => {
        fireEvent.click(moreBtn);
      });

      const deleteItem = screen.getByText("Delete");
      await act(async () => {
        fireEvent.click(deleteItem);
      });

      expect(mockDeleteScript).toHaveBeenCalledWith(0);
    });

    it("shows Translate Whole Script only for screenplay documents in context menu", () => {
      render(<ScriptsView />);

      // 1. Check Screenplay document context menu
      const screenplayItem = screen.getByText("Screenplay Main").closest("[data-script-index]")!;
      const screenplayMoreBtn = screenplayItem.querySelector("button")!;

      act(() => {
        fireEvent.click(screenplayMoreBtn);
      });

      expect(screen.getByText(/Translate Whole Script/i)).toBeTruthy();

      // 2. Check Prose document context menu
      const proseItem = screen.getByText("Notes & Worldbuilding").closest("[data-script-index]")!;
      const proseMoreBtn = proseItem.querySelector("button")!;

      act(() => {
        fireEvent.click(proseMoreBtn);
      });

      expect(screen.queryByText(/Translate Whole Script/i)).toBeNull();
    });
  });

  describe("Add and Import document menus", () => {
    it("handles Add New File menu for Screenplay and Prose", async () => {
      mockAddScript.mockResolvedValueOnce("New Screenplay");
      render(<ScriptsView />);
      const addBtn = screen.getByTitle("Add New File");

      act(() => {
        fireEvent.click(addBtn);
      });

      const screenplayOption = screen.getByText("Screenplay (.fountain)");
      await act(async () => {
        fireEvent.click(screenplayOption);
      });

      expect(mockAddScript).toHaveBeenCalledWith(undefined, "fountain");

      // Add prose
      act(() => {
        fireEvent.click(addBtn);
      });
      const proseOption = screen.getByText("Prose (.md)");
      await act(async () => {
        fireEvent.click(proseOption);
      });

      expect(mockAddScript).toHaveBeenCalledWith(undefined, "markdown");
    });

    it("handles Import File menu for Fountain, FDX, Fade In, and Prose", async () => {
      render(<ScriptsView />);
      const importBtn = screen.getByTitle("Import File");

      // Fountain
      act(() => {
        fireEvent.click(importBtn);
      });
      const fountainOption = screen.getByText("Fountain (.fountain, .txt)");
      await act(async () => {
        fireEvent.click(fountainOption);
      });
      expect(mockImportScript).toHaveBeenCalledWith("fountain");

      // FDX
      act(() => {
        fireEvent.click(importBtn);
      });
      const fdxOption = screen.getByText("Final Draft (.fdx)");
      await act(async () => {
        fireEvent.click(fdxOption);
      });
      expect(mockImportScript).toHaveBeenCalledWith("fdx");

      // Fade In
      act(() => {
        fireEvent.click(importBtn);
      });
      const fadeinOption = screen.getByText("Fade In (.fadein)");
      await act(async () => {
        fireEvent.click(fadeinOption);
      });
      expect(mockImportScript).toHaveBeenCalledWith("fadein");

      // Prose
      act(() => {
        fireEvent.click(importBtn);
      });
      const proseOption = screen.getByText("Prose (.md)");
      await act(async () => {
        fireEvent.click(proseOption);
      });
      expect(mockImportScript).toHaveBeenCalledWith("markdown");
    });
  });
});
