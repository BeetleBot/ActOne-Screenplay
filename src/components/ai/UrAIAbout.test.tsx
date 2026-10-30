import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { UrAIAbout } from "./UrAIAbout";

describe("UrAIAbout", () => {
  it("explains the Tamil name and Your AI when focused", async () => {
    render(<UrAIAbout />);
    await userEvent.setup().tab();
    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip).toHaveTextContent("உரை");
    expect(tooltip).toHaveTextContent("Your AI");
  });
});
