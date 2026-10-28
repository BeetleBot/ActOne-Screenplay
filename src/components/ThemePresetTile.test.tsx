import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ThemePresetTile } from "./ThemePresetTile";

it("shows a non-collapsing palette preview and selects the preset", () => {
  const onSelect = vi.fn();
  render(<ThemePresetTile name="Noir" colors={{ sidebar: "#1a1a2e", editor: "#0f0f1a", accent: "#e94560" }} selected onSelect={onSelect} />);
  const preview = screen.getByRole("img", { name: "Noir palette preview" });
  expect(preview).toHaveStyle({ height: "40px", width: "100%", flexShrink: "0", backgroundColor: "#1a1a2e" });
  expect(screen.getByRole("button", { name: "Use Noir preset" })).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByRole("button", { name: "Use Noir preset" }));
  expect(onSelect).toHaveBeenCalledOnce();
});
