import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";

let mockSettings: Record<string, any> = {};
let mockFilePath = "project.actone";
const mockScriptFileName = "main.fountain";
const mockSaveFileAs = vi.fn();
const mockUpdateSettings = vi.fn((updater: any) => {
  if (typeof updater === "function") {
    mockSettings = updater(mockSettings);
  } else {
    mockSettings = updater;
  }
});

let mockEditorDispatch = vi.fn();
let mockEditorFocus = vi.fn();
let mockSliceDoc = vi.fn().mockReturnValue("Some selected text");
let mockEditorView: any = {
  state: {
    selection: { main: { empty: false, from: 0, to: 18 } },
    sliceDoc: (...args: any[]) => mockSliceDoc(...args),
  },
  dispatch: (...args: any[]) => mockEditorDispatch(...args),
  focus: () => mockEditorFocus(),
};

let mockParkingItems: Array<{ id: string; text: string }> = [];
const mockAddParkingItem = vi.fn();
const mockRemoveParkingItem = vi.fn();

vi.mock("./ScriptsView", () => ({
  ScriptsView: () => <div data-testid="scripts-view">Scripts View</div>,
}));
vi.mock("./SnapshotsPanel", () => ({
  SnapshotsPanel: () => <div data-testid="snapshots-panel">Snapshots Panel</div>,
}));
vi.mock("./OutlineView", () => ({
  OutlineView: () => <div data-testid="outline-view">Outline View</div>,
}));
vi.mock("./MarkerView", () => ({
  MarkerView: () => <div data-testid="marker-view">Marker View</div>,
}));
vi.mock("./SprintView", () => ({
  SprintView: () => <div data-testid="sprint-view">Sprint View</div>,
}));
vi.mock("./TodoView", () => ({
  TodoView: ({ disabled }: { disabled?: boolean }) => (
    <div data-testid="todo-view" data-disabled={String(disabled)}>
      Todo View
    </div>
  ),
}));

vi.mock("../context", () => ({
  useFile: () => ({
    get parsedDoc() {
      return { settings: mockSettings };
    },
    get filePath() {
      return mockFilePath;
    },
    saveFileAs: mockSaveFileAs,
    scriptFileName: mockScriptFileName,
  }),
  useEditor: () => ({
    updateSettings: mockUpdateSettings,
    get editorView() {
      return mockEditorView;
    },
  }),
  useParking: () => ({
    get items() {
      return mockParkingItems;
    },
    addItem: mockAddParkingItem,
    removeItem: mockRemoveParkingItem,
  }),
}));

import { SidebarViews } from "./SidebarViews";

beforeEach(() => {
  vi.clearAllMocks();
  mockFilePath = "project.actone";
  mockSettings = {
    notepad: {
      [mockScriptFileName]: "Initial notepad content",
    },
  };
  mockParkingItems = [
    { id: "park-1", text: "Parked dialogue line 1" },
    { id: "park-2", text: "Parked description 2" },
  ];
  mockSliceDoc.mockReturnValue("Some selected text");
  mockEditorView = {
    state: {
      selection: { main: { empty: false, from: 0, to: 18 } },
      sliceDoc: (...args: any[]) => mockSliceDoc(...args),
    },
    dispatch: (...args: any[]) => mockEditorDispatch(...args),
    focus: () => mockEditorFocus(),
  };
});

describe("SidebarViews Component", () => {
  describe("Sidebar panel switching", () => {
    it("renders ScriptsView when activeTab is 'scripts'", () => {
      render(<SidebarViews activeTab="scripts" />);
      expect(screen.getByTestId("scripts-view")).toBeTruthy();
    });

    it("renders SnapshotsPanel when activeTab is 'snapshots'", () => {
      render(<SidebarViews activeTab="snapshots" />);
      expect(screen.getByTestId("snapshots-panel")).toBeTruthy();
    });

    it("renders OutlineView when activeTab is 'outline'", () => {
      render(<SidebarViews activeTab="outline" />);
      expect(screen.getByTestId("outline-view")).toBeTruthy();
    });

    it("renders MarkerView when activeTab is 'markers'", () => {
      render(<SidebarViews activeTab="markers" />);
      expect(screen.getByTestId("marker-view")).toBeTruthy();
    });

    it("renders SprintView when activeTab is 'sprint'", () => {
      render(<SidebarViews activeTab="sprint" />);
      expect(screen.getByTestId("sprint-view")).toBeTruthy();
    });

    it("renders TodoView with disabled=false for .actone file", () => {
      mockFilePath = "myproject.actone";
      render(<SidebarViews activeTab="todo" />);
      const todoEl = screen.getByTestId("todo-view");
      expect(todoEl).toBeTruthy();
      expect(todoEl.getAttribute("data-disabled")).toBe("false");
    });

    it("renders TodoView with disabled=true for non-actone file", () => {
      mockFilePath = "myproject.fountain";
      render(<SidebarViews activeTab="todo" />);
      const todoEl = screen.getByTestId("todo-view");
      expect(todoEl).toBeTruthy();
      expect(todoEl.getAttribute("data-disabled")).toBe("true");
    });

    it("returns null for unknown activeTab", () => {
      const { container } = render(<SidebarViews activeTab="unknown_tab" />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("NotepadView", () => {
    it("renders Document Notepad header and textarea with initial text", () => {
      render(<SidebarViews activeTab="notepad" />);
      expect(screen.getByText("Document Notepad")).toBeTruthy();
      expect(screen.getByDisplayValue("Initial notepad content")).toBeTruthy();
    });

    it("updates notepad settings when typing in textarea", () => {
      render(<SidebarViews activeTab="notepad" />);
      const textarea = screen.getByDisplayValue("Initial notepad content");

      act(() => {
        fireEvent.change(textarea, { target: { value: "Updated beat notes" } });
      });

      expect(mockUpdateSettings).toHaveBeenCalled();
      expect(mockSettings.notepad[mockScriptFileName]).toBe("Updated beat notes");
    });

    it("shows banner and disables textarea when file is not .actone", () => {
      mockFilePath = "test.fountain";
      render(<SidebarViews activeTab="notepad" />);
      expect(screen.getByText("Workspace features require saving the screenplay as an ActOne Bundle (.actone).")).toBeTruthy();
      const textarea = screen.getByPlaceholderText("Save as .actone to use the notepad") as HTMLTextAreaElement;
      expect(textarea.disabled).toBe(true);
    });
  });

  describe("ParkingView", () => {
    it("renders parking items and Park Selection button", () => {
      render(<SidebarViews activeTab="parking" />);
      expect(screen.getByText("Parking")).toBeTruthy();
      expect(screen.getByText("Park Selection")).toBeTruthy();
      expect(screen.getByText("Parked dialogue line 1")).toBeTruthy();
      expect(screen.getByText("Parked description 2")).toBeTruthy();
    });

    it("handles parking the selected text from the editor", () => {
      render(<SidebarViews activeTab="parking" />);
      const parkBtn = screen.getByText("Park Selection");

      act(() => {
        fireEvent.click(parkBtn);
      });

      expect(mockAddParkingItem).toHaveBeenCalledWith("Some selected text");
      expect(mockEditorDispatch).toHaveBeenCalledWith({
        changes: { from: 0, to: 18, insert: "" },
      });
      expect(mockEditorFocus).toHaveBeenCalled();
    });

    it("inserts parked text back into editor and removes card on click", () => {
      render(<SidebarViews activeTab="parking" />);
      const card = screen.getByText("Parked dialogue line 1");

      act(() => {
        fireEvent.click(card);
      });

      expect(mockEditorDispatch).toHaveBeenCalledWith({
        changes: { from: 0, insert: "Parked dialogue line 1\n" },
        selection: { anchor: 23 },
      });
      expect(mockRemoveParkingItem).toHaveBeenCalledWith("park-1");
      expect(mockEditorFocus).toHaveBeenCalled();
    });

    it("removes parking card when close button is clicked", () => {
      render(<SidebarViews activeTab="parking" />);
      const cardEl = screen.getByText("Parked dialogue line 1").closest(".MuiCard-root")!;
      const closeBtn = cardEl.querySelector("button")!;

      act(() => {
        fireEvent.click(closeBtn);
      });

      expect(mockRemoveParkingItem).toHaveBeenCalledWith("park-1");
    });

    it("renders empty state placeholder when no items parked", () => {
      mockParkingItems = [];
      render(<SidebarViews activeTab="parking" />);
      expect(screen.getByText(/Select text in the editor and click "Park Selection"/)).toBeTruthy();
    });

    it("shows banner when file is not .actone in Parking tab", () => {
      mockFilePath = "test.fountain";
      render(<SidebarViews activeTab="parking" />);
      expect(screen.getByText("Workspace features require saving the screenplay as an ActOne Bundle (.actone).")).toBeTruthy();
      expect(screen.queryByText("Park Selection")).toBeNull();
    });
  });
});
