import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";
import type { SnapshotInfo } from "../context/SnapshotContext";

let mockSnapshots: SnapshotInfo[] = [];
let mockSettings: { enabled: boolean; auto_enabled?: boolean; auto_interval_minutes?: number } = {
  enabled: true,
};
const mockCreateSnapshot = vi.fn();
const mockDeleteSnapshot = vi.fn();
const mockOpenSnapshotAsFile = vi.fn();
const mockUpdateSettings = vi.fn();
const mockConfirm = vi.fn();
const mockOpenSettingsWindow = vi.fn();

vi.mock("../context/SnapshotContext", () => ({
  useSnapshots: () => ({
    get snapshots() {
      return mockSnapshots;
    },
    get settings() {
      return mockSettings;
    },
    createSnapshot: mockCreateSnapshot,
    deleteSnapshot: mockDeleteSnapshot,
    openSnapshotAsFile: mockOpenSnapshotAsFile,
    updateSettings: mockUpdateSettings,
  }),
}));

vi.mock("../context/CustomModalContext", () => ({
  useCustomModal: () => ({
    confirm: mockConfirm,
  }),
}));

vi.mock("../hooks/useModalWindows", () => ({
  useModalWindows: () => ({
    openSettingsWindow: mockOpenSettingsWindow,
  }),
}));

import { SnapshotsPanel } from "./SnapshotsPanel";

beforeEach(() => {
  vi.clearAllMocks();
  mockSettings = { enabled: true };
  mockSnapshots = [
    {
      id: "snap-1",
      created_at: "2026-08-27T10:00:00.000Z",
      snapshot_type: "manual",
      custom_tag: "draft-v1",
      comment: "First draft completed",
      file_path: "/snapshots/snap-1.fountain",
      size_bytes: 1024,
    },
    {
      id: "snap-2",
      created_at: "2026-08-27T11:00:00.000Z",
      snapshot_type: "on_save",
      custom_tag: "",
      comment: "",
      file_path: "/snapshots/snap-2.fountain",
      size_bytes: 2048,
    },
    {
      id: "snap-3",
      created_at: "2026-08-27T12:00:00.000Z",
      snapshot_type: "auto",
      custom_tag: "",
      comment: "Auto backup",
      file_path: "/snapshots/snap-3.fountain",
      size_bytes: 2048,
    },
  ];
});

describe("SnapshotsPanel Component", () => {
  it("renders snapshot list with comments and tags", () => {
    render(<SnapshotsPanel />);
    expect(screen.getByText("Snapshots")).toBeTruthy();
    expect(screen.getByText("First draft completed")).toBeTruthy();
    expect(screen.getByText("Auto backup")).toBeTruthy();
    expect(screen.getAllByText("MANUAL").length).toBeGreaterThan(0);
    expect(screen.getAllByText("SAVE").length).toBeGreaterThan(0);
    expect(screen.getAllByText("AUTO").length).toBeGreaterThan(0);
    expect(screen.getAllByText("DRAFT-V1").length).toBeGreaterThan(0);
  });

  it("renders empty state when there are no snapshots", () => {
    mockSnapshots = [];
    render(<SnapshotsPanel />);
    expect(screen.getByText("No snapshots yet")).toBeTruthy();
  });

  it("renders disabled state with enable button when snapshots are turned off", () => {
    mockSettings = { enabled: false };
    mockSnapshots = [];
    render(<SnapshotsPanel />);
    expect(screen.getByText("Snapshots are currently turned off.")).toBeTruthy();

    const enableBtn = screen.getByText("Enable Snapshots");
    act(() => {
      fireEvent.click(enableBtn);
    });

    expect(mockUpdateSettings).toHaveBeenCalledWith({ enabled: true });
  });

  it("triggers openSettingsWindow when settings button is clicked", () => {
    render(<SnapshotsPanel />);
    const settingsBtn = screen.getAllByRole("button").find((btn) => {
      return btn.querySelector("svg[data-testid='SettingsIcon']") || btn.innerHTML.includes("svg");
    });
    expect(settingsBtn).toBeTruthy();

    act(() => {
      fireEvent.click(settingsBtn!);
    });

    expect(mockOpenSettingsWindow).toHaveBeenCalledWith("snapshots");
  });

  describe("Manual snapshot creation", () => {
    it("creates a manual snapshot with comment and tag on button click", async () => {
      render(<SnapshotsPanel />);
      const commentInput = screen.getByPlaceholderText("Comment (optional)...") as HTMLInputElement;
      const tagInput = screen.getByPlaceholderText("Tag (optional)...") as HTMLInputElement;
      const createBtn = screen.getByText("New Snapshot");

      act(() => {
        fireEvent.change(commentInput, { target: { value: "Major scene rewrite" } });
        fireEvent.change(tagInput, { target: { value: "v2-edit" } });
      });

      await act(async () => {
        fireEvent.click(createBtn);
      });

      expect(mockCreateSnapshot).toHaveBeenCalledWith("Major scene rewrite", "manual", "v2-edit");
      expect(commentInput.value).toBe("");
      expect(tagInput.value).toBe("");
    });

    it("creates a manual snapshot on Enter key in input field", async () => {
      render(<SnapshotsPanel />);
      const commentInput = screen.getByPlaceholderText("Comment (optional)...") as HTMLInputElement;

      act(() => {
        fireEvent.change(commentInput, { target: { value: "Quick checkpoint" } });
      });

      await act(async () => {
        fireEvent.keyDown(commentInput, { key: "Enter" });
      });

      expect(mockCreateSnapshot).toHaveBeenCalledWith("Quick checkpoint", "manual", undefined);
    });
  });

  describe("Opening snapshots", () => {
    it("opens snapshot file when snapshot item is clicked", async () => {
      render(<SnapshotsPanel />);
      const firstComment = screen.getByText("First draft completed");
      const itemButton = firstComment.closest("div")?.parentElement?.querySelector(".MuiListItemButton-root");
      expect(itemButton).toBeTruthy();

      await act(async () => {
        fireEvent.click(itemButton!);
      });

      expect(mockOpenSnapshotAsFile).toHaveBeenCalledWith(mockSnapshots[0]);
    });

    it("opens snapshot from context menu 'Open as New File'", async () => {
      render(<SnapshotsPanel />);
      const firstComment = screen.getByText("First draft completed");
      const itemContainer = firstComment.closest("div")?.parentElement;
      const moreBtn = itemContainer!.querySelector(".MuiListItemButton-root button")!;

      act(() => {
        fireEvent.click(moreBtn);
      });

      const openMenuItem = screen.getByText("Open as New File");
      await act(async () => {
        fireEvent.click(openMenuItem);
      });

      expect(mockOpenSnapshotAsFile).toHaveBeenCalledWith(mockSnapshots[0]);
    });
  });

  describe("Deleting snapshots", () => {
    it("deletes snapshot when confirmed via modal dialog", async () => {
      mockConfirm.mockResolvedValueOnce("delete");
      render(<SnapshotsPanel />);
      const firstComment = screen.getByText("First draft completed");
      const itemContainer = firstComment.closest("div")?.parentElement;
      const moreBtn = itemContainer!.querySelector(".MuiListItemButton-root button")!;

      act(() => {
        fireEvent.click(moreBtn);
      });

      const deleteMenuItem = screen.getByText("Delete");
      await act(async () => {
        fireEvent.click(deleteMenuItem);
      });

      expect(mockConfirm).toHaveBeenCalled();
      expect(mockDeleteSnapshot).toHaveBeenCalledWith(mockSnapshots[0]);
    });

    it("does not delete snapshot when user cancels modal dialog", async () => {
      mockConfirm.mockResolvedValueOnce("cancel");
      render(<SnapshotsPanel />);
      const firstComment = screen.getByText("First draft completed");
      const itemContainer = firstComment.closest("div")?.parentElement;
      const moreBtn = itemContainer!.querySelector(".MuiListItemButton-root button")!;

      act(() => {
        fireEvent.click(moreBtn);
      });

      const deleteMenuItem = screen.getByText("Delete");
      await act(async () => {
        fireEvent.click(deleteMenuItem);
      });

      expect(mockConfirm).toHaveBeenCalled();
      expect(mockDeleteSnapshot).not.toHaveBeenCalled();
    });
  });

  describe("Tag filter filtering", () => {
    it("filters snapshots when a tag button is clicked and unfilters on second click", () => {
      render(<SnapshotsPanel />);
      // Filter options are chips rendered in the tag row
      const manualFilterChips = screen.getAllByText("MANUAL");
      // The first one is the filter button at top
      const filterButton = manualFilterChips[0];

      act(() => {
        fireEvent.click(filterButton);
      });

      expect(screen.getByText("First draft completed")).toBeTruthy();
      expect(screen.queryByText("Auto backup")).toBeNull();

      // Click filter again to toggle off
      act(() => {
        fireEvent.click(filterButton);
      });

      expect(screen.getByText("First draft completed")).toBeTruthy();
      expect(screen.getByText("Auto backup")).toBeTruthy();
    });
  });
});
