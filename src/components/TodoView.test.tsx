import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  completedAt?: number;
}

let mockSettings: Record<string, any> = {};
const mockScriptFileName = "main.fountain";
const mockUpdateSettings = vi.fn((updater: any) => {
  if (typeof updater === "function") {
    mockSettings = updater(mockSettings);
  } else {
    mockSettings = updater;
  }
});

vi.mock("../context", () => ({
  useFile: () => ({
    get parsedDoc() {
      return { settings: mockSettings };
    },
    scriptFileName: mockScriptFileName,
  }),
  useEditor: () => ({
    updateSettings: mockUpdateSettings,
  }),
}));

import { TodoView } from "./TodoView";

beforeEach(() => {
  vi.clearAllMocks();
  mockSettings = {
    todos: {
      [mockScriptFileName]: [
        { id: "todo-1", text: "Outline Act 2", completed: false, createdAt: 1000 },
        { id: "todo-2", text: "Fix character arc", completed: true, createdAt: 2000, completedAt: 3000 },
      ],
    },
  };
});

describe("TodoView Component", () => {
  it("renders pending and completed todo items", () => {
    render(<TodoView />);
    expect(screen.getByText("Outline Act 2")).toBeTruthy();
    expect(screen.getByText("Fix character arc")).toBeTruthy();
    expect(screen.getByText("Pending")).toBeTruthy();
    expect(screen.getByText("Completed (1)")).toBeTruthy();
  });

  it("renders empty state when there are no active tasks", () => {
    mockSettings = { todos: { [mockScriptFileName]: [] } };
    render(<TodoView />);
    expect(screen.getByText("No tasks yet")).toBeTruthy();
  });

  it("adds a new todo on Enter key", () => {
    render(<TodoView />);
    const input = screen.getByPlaceholderText("Add a task...") as HTMLInputElement;

    act(() => {
      fireEvent.change(input, { target: { value: "Review dialogue" } });
      fireEvent.keyDown(input, { key: "Enter" });
    });

    expect(mockUpdateSettings).toHaveBeenCalled();
    const updatedTodos = mockSettings.todos[mockScriptFileName] as TodoItem[];
    expect(updatedTodos).toHaveLength(3);
    expect(updatedTodos.some((t) => t.text === "Review dialogue" && !t.completed)).toBe(true);
  });

  it("adds a new todo on Add button click", () => {
    render(<TodoView />);
    const input = screen.getByPlaceholderText("Add a task...") as HTMLInputElement;

    act(() => {
      fireEvent.change(input, { target: { value: "Check scene headings" } });
    });

    // Find the Add button inside the input
    const addBtn = input.parentElement?.querySelector("button");
    expect(addBtn).toBeTruthy();

    act(() => {
      fireEvent.click(addBtn!);
    });

    expect(mockUpdateSettings).toHaveBeenCalled();
    const updatedTodos = mockSettings.todos[mockScriptFileName] as TodoItem[];
    expect(updatedTodos.some((t) => t.text === "Check scene headings")).toBe(true);
  });

  it("does not add an empty or whitespace-only todo", () => {
    render(<TodoView />);
    const input = screen.getByPlaceholderText("Add a task...") as HTMLInputElement;

    act(() => {
      fireEvent.change(input, { target: { value: "   " } });
      fireEvent.keyDown(input, { key: "Enter" });
    });

    expect(mockUpdateSettings).not.toHaveBeenCalled();
  });

  it("toggles completion of an active todo to completed", () => {
    render(<TodoView />);
    const pendingTodo = screen.getByText("Outline Act 2");

    act(() => {
      fireEvent.click(pendingTodo);
    });

    expect(mockUpdateSettings).toHaveBeenCalled();
    const updatedTodos = mockSettings.todos[mockScriptFileName] as TodoItem[];
    const toggled = updatedTodos.find((t) => t.id === "todo-1");
    expect(toggled?.completed).toBe(true);
    expect(toggled?.completedAt).toBeDefined();
  });

  it("toggles completion of a completed todo back to active", () => {
    render(<TodoView />);
    const completedTodo = screen.getByText("Fix character arc");

    act(() => {
      fireEvent.click(completedTodo);
    });

    expect(mockUpdateSettings).toHaveBeenCalled();
    const updatedTodos = mockSettings.todos[mockScriptFileName] as TodoItem[];
    const toggled = updatedTodos.find((t) => t.id === "todo-2");
    expect(toggled?.completed).toBe(false);
    expect(toggled?.completedAt).toBeUndefined();
  });

  it("deletes a pending todo when delete button is clicked", () => {
    render(<TodoView />);
    const pendingItem = screen.getByText("Outline Act 2").closest("li")!;
    const deleteBtn = pendingItem.querySelector("button.MuiIconButton-edgeEnd")!;

    act(() => {
      fireEvent.click(deleteBtn);
    });

    expect(mockUpdateSettings).toHaveBeenCalled();
    const updatedTodos = mockSettings.todos[mockScriptFileName] as TodoItem[];
    expect(updatedTodos.find((t) => t.id === "todo-1")).toBeUndefined();
  });

  it("deletes a completed todo when delete button is clicked", () => {
    render(<TodoView />);
    const completedItem = screen.getByText("Fix character arc").closest("li")!;
    const deleteBtn = completedItem.querySelector("button.MuiIconButton-edgeEnd")!;

    act(() => {
      fireEvent.click(deleteBtn);
    });

    expect(mockUpdateSettings).toHaveBeenCalled();
    const updatedTodos = mockSettings.todos[mockScriptFileName] as TodoItem[];
    expect(updatedTodos.find((t) => t.id === "todo-2")).toBeUndefined();
  });

  it("toggles collapse of completed tasks list", () => {
    render(<TodoView />);
    const toggleButton = screen.getByText("Completed (1)");

    act(() => {
      fireEvent.click(toggleButton);
    });

    // Clicking again toggles back
    act(() => {
      fireEvent.click(toggleButton);
    });
  });

  it("renders disabled state with banner when disabled prop is true", () => {
    render(<TodoView disabled={true} />);
    expect(screen.getByText("Tasks require saving the screenplay as an ActOne Bundle (.actone).")).toBeTruthy();
    expect(screen.getByPlaceholderText("Save as .actone to use tasks")).toBeTruthy();
  });

  describe("Keyboard navigation", () => {
    it("navigates active todos with Arrow keys and toggles with Enter/Space", () => {
      mockSettings = {
        todos: {
          [mockScriptFileName]: [
            { id: "todo-1", text: "Task One", completed: false, createdAt: 1000 },
            { id: "todo-2", text: "Task Two", completed: false, createdAt: 2000 },
          ],
        },
      };
      const { container } = render(<TodoView />);
      const list = container.querySelector("ul[tabindex='0']")!;
      expect(list).toBeTruthy();

      // Navigate down to item 0
      act(() => {
        fireEvent.keyDown(list, { key: "ArrowDown" });
      });

      // Navigate down to item 1
      act(() => {
        fireEvent.keyDown(list, { key: "ArrowDown" });
      });

      // Toggle item 1 with Enter
      act(() => {
        fireEvent.keyDown(list, { key: "Enter" });
      });

      expect(mockUpdateSettings).toHaveBeenCalled();
      const updatedTodos = mockSettings.todos[mockScriptFileName] as TodoItem[];
      expect(updatedTodos.find((t) => t.id === "todo-2")?.completed).toBe(true);
    });

    it("deletes active todo with Delete key", () => {
      mockSettings = {
        todos: {
          [mockScriptFileName]: [
            { id: "todo-1", text: "Task One", completed: false, createdAt: 1000 },
          ],
        },
      };
      const { container } = render(<TodoView />);
      const list = container.querySelector("ul[tabindex='0']")!;

      act(() => {
        fireEvent.keyDown(list, { key: "ArrowDown" });
      });

      act(() => {
        fireEvent.keyDown(list, { key: "Delete" });
      });

      expect(mockUpdateSettings).toHaveBeenCalled();
      const updatedTodos = mockSettings.todos[mockScriptFileName] as TodoItem[];
      expect(updatedTodos).toHaveLength(0);
    });
  });
});
