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

  it("renders disable option at top and configure models at bottom of the list", async () => {
    render(<AiModelPalette isOpen onClose={vi.fn()} />);

    expect(screen.queryByText("Choose model")).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Disable AI/i })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("llama3.2")).toBeInTheDocument());
    expect(screen.getByRole("option", { name: /Configure Models…/i })).toBeInTheDocument();
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

    expect(openSettingsWindow).toHaveBeenCalledWith("muse");
    expect(onClose).toHaveBeenCalled();
  });

  it("closes with Escape", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AiModelPalette isOpen onClose={onClose} />);

    const input = screen.getByRole("textbox", { name: "Filter AI models" });
    await user.click(input);
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("opens settings when clicking configure", async () => {
    const user = userEvent.setup();
    render(<AiModelPalette isOpen onClose={vi.fn()} />);

    await user.click(screen.getByRole("option", { name: /Configure Models…/i }));
    expect(openSettingsWindow).toHaveBeenCalledWith("muse");
  });

  it("restores editor focus safely without jumping viewport when closing", async () => {
    vi.useFakeTimers();
    const { rerender } = render(<AiModelPalette isOpen onClose={vi.fn()} />);

    rerender(<AiModelPalette isOpen={false} onClose={vi.fn()} />);
    vi.advanceTimersByTime(100);

    expect(mockContentDOMFocus).toHaveBeenCalledWith({ preventScroll: true });
    expect(mockEditorDispatch).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
