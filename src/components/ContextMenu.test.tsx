import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ContextMenu, type ContextMenuItem } from "./ContextMenu";

afterEach(cleanup);

function renderMenu(items: ContextMenuItem[], onClose = vi.fn()) {
  return {
    onClose,
    ...render(<ContextMenu open x={40} y={40} items={items} onClose={onClose} />),
  };
}

describe("ContextMenu", () => {
  it("renders compact menu items and separators", () => {
    renderMenu([{ label: "Copy" }, "separator", { label: "Paste" }]);

    expect(screen.getAllByRole("menu").length).toBeGreaterThan(0);
    expect(screen.getByRole("menuitem", { name: "Copy" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Paste" })).toBeTruthy();
    expect(document.querySelector("hr")).toBeTruthy();
  });

  it("runs an item action and closes the menu", () => {
    const action = vi.fn();
    const { onClose } = renderMenu([{ label: "Copy", action }]);

    fireEvent.click(screen.getByRole("menuitem", { name: "Copy" }));

    expect(action).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not run disabled items", () => {
    const action = vi.fn();
    const { onClose } = renderMenu([{ label: "Delete", enabled: false, action }]);

    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));

    expect(action).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("opens a submenu on hover and runs submenu actions", async () => {
    const action = vi.fn();
    const { onClose } = renderMenu([{
      label: "Format",
      children: [{ label: "Bold", action }],
    }]);

    fireEvent.mouseEnter(screen.getByRole("menuitem", { name: "Format" }));
    expect(await screen.findByRole("menuitem", { name: "Bold" })).toBeTruthy();

    fireEvent.click(screen.getByRole("menuitem", { name: "Bold" }));
    await waitFor(() => expect(action).toHaveBeenCalledOnce());
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("keeps the submenu open while moving from the parent item into it", async () => {
    renderMenu([{
      label: "Translate",
      children: [{ label: "French" }],
    }]);

    const parent = screen.getByRole("menuitem", { name: "Translate" });
    fireEvent.mouseEnter(parent);
    const child = await screen.findByRole("menuitem", { name: "French" });

    fireEvent.mouseLeave(parent, { relatedTarget: child });
    fireEvent.mouseEnter(child);
    await new Promise((resolve) => setTimeout(resolve, 180));

    expect(screen.getByRole("menuitem", { name: "French" })).toBeTruthy();
  });

  it("supports keyboard navigation and Escape", () => {
    const onClose = vi.fn();
    renderMenu([{ label: "One" }, { label: "Two" }], onClose);
    const first = screen.getByRole("menuitem", { name: "One" });
    const second = screen.getByRole("menuitem", { name: "Two" });

    first.focus();
    act(() => fireEvent.keyDown(first, { key: "ArrowDown" }));
    expect(document.activeElement).toBe(second);

    act(() => fireEvent.keyDown(second, { key: "Escape" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("supports native-style typeahead selection", () => {
    renderMenu([{ label: "Copy" }, { label: "Paste" }, { label: "Preferences" }]);
    const menu = document.querySelector<HTMLElement>(".context-menu");
    expect(menu).toBeTruthy();
    const paste = screen.getByRole("menuitem", { name: "Paste" });

    fireEvent.keyDown(menu!, { key: "p" });

    expect(document.activeElement).toBe(paste);
  });
});
