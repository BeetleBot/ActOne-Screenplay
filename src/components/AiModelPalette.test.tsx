import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { setPromptConfigField, openSettingsWindow } = vi.hoisted(() => ({
  setPromptConfigField: vi.fn(),
  openSettingsWindow: vi.fn(),
}));

vi.mock("../context", () => ({
  useUI: () => ({ setActiveRightPane: vi.fn() }),
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

  it("closes with Escape and opens settings from the top action", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AiModelPalette isOpen onClose={onClose} />);

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Configure Models…" }));
    expect(openSettingsWindow).toHaveBeenCalledWith("muse");
  });
});
