import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ThemeManagerPreview } from "./ThemeManagerPreview";
import { themes } from "../theme";

describe("Theme Manager preview", () => {
  it("shows readable sample scenes and lets users navigate without changing a document", () => {
    render(<ThemeManagerPreview config={themes[0]} draft={false} />);
    expect(screen.getByRole("tab", { name: "Workspace" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("button", { name: /EXT. PARK/ }));
    expect(screen.getAllByText("EXT. PARK - NIGHT")).toHaveLength(2);
    expect(screen.getByRole("button", { name: /EXT. PARK/ })).toHaveAttribute("aria-pressed", "true");
  });
  it("previews interactive controls and switches between prose and workspace", () => {
    render(<ThemeManagerPreview config={themes[1]} draft />);
    expect(screen.getByText(/Unsaved preview/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "UI elements" }));
    expect(screen.getByRole("button", { name: "Disabled" })).toBeDisabled();
    const checkbox = screen.getByRole("checkbox", { name: "Include scene numbers" });
    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
    fireEvent.click(screen.getByRole("tab", { name: "Prose & notes" }));
    expect(screen.getByText("The world of the story")).toBeInTheDocument();
  });
  it("keeps draft colours out of global body styles", () => {
    const previous = document.body.style.cssText;
    const { rerender } = render(<ThemeManagerPreview config={themes[0]} draft />);
    rerender(<ThemeManagerPreview config={themes[1]} draft />);
    expect(document.body.style.cssText).toBe(previous);
    expect(document.querySelector('style[data-emotion]')?.textContent ?? "").not.toContain("body {");
  });
});
