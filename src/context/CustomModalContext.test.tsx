import { describe, it, expect, vi } from "vitest";
import { renderHook, act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { CustomModalProvider, useCustomModal } from "./CustomModalContext";
import { UIProvider } from "./UIContext";

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(UIProvider, null, React.createElement(CustomModalProvider, null, children));
}

describe("CustomModalContext", () => {
  it("throws error when used outside of CustomModalProvider", () => {
    // Suppress expected console error from React
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useCustomModal())).toThrow(
      "useCustomModal must be used within a CustomModalProvider"
    );
    spy.mockRestore();
  });

  it("provides confirm and prompt functions", () => {
    const { result } = renderHook(() => useCustomModal(), { wrapper });
    expect(typeof result.current.confirm).toBe("function");
    expect(typeof result.current.prompt).toBe("function");
  });

  describe("Confirm Modal Flow", () => {
    it("renders confirm dialog with title, message, and buttons", async () => {
      function TestComponent() {
        const { confirm } = useCustomModal();
        return (
          <button
            onClick={() =>
              confirm({
                title: "Delete File?",
                message: "This will permanently delete the script.",
                buttons: [
                  { value: "delete", label: "Delete", color: "error" },
                  { value: "cancel", label: "Cancel", color: "inherit" },
                ],
              })
            }
          >
            Open Confirm
          </button>
        );
      }

      render(
        <UIProvider>
          <CustomModalProvider>
            <TestComponent />
          </CustomModalProvider>
        </UIProvider>
      );

      fireEvent.click(screen.getByText("Open Confirm"));

      expect(screen.getByText("Delete File?")).toBeDefined();
      expect(screen.getByText("This will permanently delete the script.")).toBeDefined();
      expect(screen.getByText("Delete")).toBeDefined();
      expect(screen.getByText("Cancel")).toBeDefined();
    });

    it("resolves promise with selected button value on click", async () => {
      let resolvedValue: string | null = null;

      function TestComponent() {
        const { confirm } = useCustomModal();
        return (
          <button
            onClick={async () => {
              const res = await confirm({
                title: "Save Changes",
                message: "Do you want to save your progress?",
                buttons: [
                  { value: "save", label: "Save" },
                  { value: "discard", label: "Discard" },
                ],
              });
              resolvedValue = res;
            }}
          >
            Trigger Confirm
          </button>
        );
      }

      render(
        <UIProvider>
          <CustomModalProvider>
            <TestComponent />
          </CustomModalProvider>
        </UIProvider>
      );

      fireEvent.click(screen.getByText("Trigger Confirm"));
      fireEvent.click(screen.getByText("Save"));

      await waitFor(() => {
        expect(resolvedValue).toBe("save");
      });
    });
  });

  describe("Prompt Modal Flow", () => {
    it("renders prompt dialog with default value and placeholder", () => {
      function TestComponent() {
        const { prompt } = useCustomModal();
        return (
          <button
            onClick={() =>
              prompt({
                title: "Rename Script",
                message: "Enter a new name for the script:",
                defaultValue: "Original_Script",
                placeholder: "Script name...",
              })
            }
          >
            Open Prompt
          </button>
        );
      }

      render(
        <UIProvider>
          <CustomModalProvider>
            <TestComponent />
          </CustomModalProvider>
        </UIProvider>
      );

      fireEvent.click(screen.getByText("Open Prompt"));

      expect(screen.getByText("Rename Script")).toBeDefined();
      expect(screen.getByText("Enter a new name for the script:")).toBeDefined();
      const input = screen.getByDisplayValue("Original_Script") as HTMLInputElement;
      expect(input).toBeDefined();
      expect(input.placeholder).toBe("Script name...");
    });

    it("resolves prompt with entered value on OK button click", async () => {
      let resolvedValue: string | null = null;

      function TestComponent() {
        const { prompt } = useCustomModal();
        return (
          <button
            onClick={async () => {
              const res = await prompt({
                title: "New Scene",
                message: "Enter scene heading",
                defaultValue: "INT. LAB",
              });
              resolvedValue = res;
            }}
          >
            Prompt Scene
          </button>
        );
      }

      render(
        <UIProvider>
          <CustomModalProvider>
            <TestComponent />
          </CustomModalProvider>
        </UIProvider>
      );

      fireEvent.click(screen.getByText("Prompt Scene"));

      const input = screen.getByDisplayValue("INT. LAB");
      fireEvent.change(input, { target: { value: "EXT. DESERT - DAY" } });
      fireEvent.click(screen.getByText("OK"));

      await waitFor(() => {
        expect(resolvedValue).toBe("EXT. DESERT - DAY");
      });
    });

    it("resolves prompt on Enter keydown", async () => {
      let resolvedValue: string | null = null;

      function TestComponent() {
        const { prompt } = useCustomModal();
        return (
          <button
            onClick={async () => {
              const res = await prompt({
                title: "Enter Title",
                message: "",
                defaultValue: "First Draft",
              });
              resolvedValue = res;
            }}
          >
            Prompt Enter
          </button>
        );
      }

      render(
        <UIProvider>
          <CustomModalProvider>
            <TestComponent />
          </CustomModalProvider>
        </UIProvider>
      );

      fireEvent.click(screen.getByText("Prompt Enter"));

      const input = screen.getByDisplayValue("First Draft");
      fireEvent.change(input, { target: { value: "Final Draft" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

      await waitFor(() => {
        expect(resolvedValue).toBe("Final Draft");
      });
    });

    it("resolves prompt with null on Cancel button click or Escape key", async () => {
      let resolvedValue: string | null = "not-null";

      function TestComponent() {
        const { prompt } = useCustomModal();
        return (
          <button
            onClick={async () => {
              const res = await prompt({
                title: "Cancel Test",
                message: "Will be cancelled",
                defaultValue: "test",
              });
              resolvedValue = res;
            }}
          >
            Prompt Cancel
          </button>
        );
      }

      render(
        <UIProvider>
          <CustomModalProvider>
            <TestComponent />
          </CustomModalProvider>
        </UIProvider>
      );

      fireEvent.click(screen.getByText("Prompt Cancel"));
      fireEvent.click(screen.getByText("Cancel"));

      await waitFor(() => {
        expect(resolvedValue).toBeNull();
      });
    });

    it("resolves prompt with null on Escape keydown", async () => {
      let resolvedValue: string | null = "initial";

      function TestComponent() {
        const { prompt } = useCustomModal();
        return (
          <button
            onClick={async () => {
              const res = await prompt({
                title: "Escape Test",
                message: "",
                defaultValue: "esc",
              });
              resolvedValue = res;
            }}
          >
            Prompt Esc
          </button>
        );
      }

      render(
        <UIProvider>
          <CustomModalProvider>
            <TestComponent />
          </CustomModalProvider>
        </UIProvider>
      );

      fireEvent.click(screen.getByText("Prompt Esc"));
      const input = screen.getByDisplayValue("esc");
      fireEvent.keyDown(input, { key: "Escape", code: "Escape" });

      await waitFor(() => {
        expect(resolvedValue).toBeNull();
      });
    });
  });
});
