import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { setPromptConfigField, openSettingsWindow } = vi.hoisted(() => ({
  setPromptConfigField: vi.fn(),
  openSettingsWindow: vi.fn(),
}));

const mockEditorDispatch = vi.fn();
const mockContentDOMFocus = vi.fn();
const mockEditorView = {
  contentDOM: { focus: mockContentDOMFocus },
  state: {
    selection: { main: { head: 42 } },
  },
  dispatch: mockEditorDispatch,
};

vi.mock("../context", () => ({
  useUI: () => ({ setActiveRightPane: vi.fn(), appScale: 100 }),
  useEditor: () => ({ editorView: mockEditorView }),
}));

vi.mock("../hooks/useModalWindows", () => ({
  useModalWindows: () => ({ openSettingsWindow }),
}));

vi.mock("../hooks/usePromptConfig", () => ({
  usePromptConfig: () => ({ provider: "none", model: "", apiModel: "" }),
  setPromptConfigField,
  fetchModels: vi.fn().mockResolvedValue(["llama3.2", "mistral-nemo"]),
}));

import { AiModelPalette } from "./AiModelPalette";

describe("AiModelPalette", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("keeps actions at the top without adding a heading", async () => {
    render(<AiModelPalette isOpen onClose={vi.fn()} />);

    expect(screen.queryByText("Choose model")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Disable AI" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Configure Models…" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("llama3.2")).toBeInTheDocument());
  });

  it("filters models and selects the filtered result with Enter", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AiModelPalette isOpen onClose={onClose} />);

    const input = screen.getByRole("textbox", { name: "Filter AI models" });
    await user.type(input, "mistral");

    expect(screen.queryByText("llama3.2")).not.toBeInTheDocument();
    expect(screen.getByText("mistral-nemo")).toBeInTheDocument();
    await user.keyboard("{ArrowDown}{Enter}");

    expect(setPromptConfigField).toHaveBeenCalledWith("provider", "ollama");
    expect(setPromptConfigField).toHaveBeenCalledWith("model", "mistral-nemo");
    expect(onClose).toHaveBeenCalled();
  });

  it("supports keyboard navigation with PageDown, PageUp, Home, End", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AiModelPalette isOpen onClose={onClose} />);

    await waitFor(() => expect(screen.getByText("llama3.2")).toBeInTheDocument());

    const input = screen.getByRole("textbox", { name: "Filter AI models" });
    await user.click(input);
    await user.keyboard("{End}{Enter}");

    expect(setPromptConfigField).toHaveBeenCalledWith("provider", "ollama");
    expect(setPromptConfigField).toHaveBeenCalledWith("model", "mistral-nemo");
    expect(onClose).toHaveBeenCalled();
  });

  it("closes with Escape and opens settings from the top action", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AiModelPalette isOpen onClose={onClose} />);

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Configure Models…" }));
    expect(openSettingsWindow).toHaveBeenCalledWith("muse");
  });

  it("restores editor focus and scrolls cursor into view when closing", async () => {
    vi.useFakeTimers();
    const { rerender } = render(<AiModelPalette isOpen onClose={vi.fn()} />);

    rerender(<AiModelPalette isOpen={false} onClose={vi.fn()} />);
    vi.advanceTimersByTime(100);

    expect(mockContentDOMFocus).toHaveBeenCalled();
    expect(mockEditorDispatch).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
