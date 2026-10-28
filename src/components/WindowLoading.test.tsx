import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { WindowLoading } from "./WindowLoading";
it("shows an accessible logo loader without visible loading text", () => {
  render(<WindowLoading />);
  expect(screen.getByRole("status", { name: "Loading window" })).toBeInTheDocument();
  expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  expect(screen.getByRole("status").firstElementChild).toHaveAttribute("aria-hidden", "true");
});

it("supports window-specific accessible labels and embedded loading areas", () => {
  render(<WindowLoading label="Loading X-Ray" embedded />);
  expect(screen.getByRole("status", { name: "Loading X-Ray" })).toHaveClass("actone-window-loading-embedded");
  expect(screen.queryByText("Loading X-Ray")).not.toBeInTheDocument();
});
