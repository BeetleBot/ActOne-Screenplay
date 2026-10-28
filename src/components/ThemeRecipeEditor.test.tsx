import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { expect, it } from "vitest";
import { ThemeRecipeEditor } from "./ThemeRecipeEditor";
import { compileTheme } from "../theme/paletteEngine";
function Harness() { const [colors, setColors] = useState(compileTheme({ interface: "#111111", accent: "#aa77dd", paper: "#fff8e8" })); return <><ThemeRecipeEditor colors={colors} onChange={setColors} /><output data-testid="colors">{JSON.stringify(colors)}</output></>; }
it("offers three choices, recalculates ink and hides manual text controls by default", () => {
  render(<Harness />);
  expect(screen.getAllByRole("textbox")).toHaveLength(3);
  fireEvent.change(screen.getByRole("textbox", { name: "Writing paper", exact: true }), { target: { value: "#111111" } });
  expect(JSON.parse(screen.getByTestId("colors").textContent!).editorText).toBe("#f5f5f5");
  fireEvent.click(screen.getByRole("button", { name: "Choose my own text colours" }));
  expect(screen.getByRole("textbox", { name: "Writing text", exact: true })).toBeInTheDocument();
  fireEvent.change(screen.getByRole("textbox", { name: "Writing text", exact: true }), { target: { value: "#ffddaa" } });
  expect(JSON.parse(screen.getByTestId("colors").textContent!).editorText).toBe("#ffddaa");
  fireEvent.click(screen.getByRole("button", { name: "Use automatic text colours" }));
  expect(JSON.parse(screen.getByTestId("colors").textContent!).editorText).toBe("#f5f5f5");
});
