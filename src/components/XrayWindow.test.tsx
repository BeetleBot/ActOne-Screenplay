import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseScreenplay } from "../parser";
import { XrayContent } from "./XrayWindow";
const exportPdf = vi.fn();
vi.mock("../utils/xrayReport", () => ({ exportXrayPdf: (...args: unknown[]) => exportPdf(...args) }));
const data = {
  parsedDoc: parseScreenplay(
    "INT. ROOM - DAY\n\nA door opens.\n\nALICE\nHello Bob.\n\nBOB\nHello Alice.\n\nEXT. PARK - NIGHT\n\nALICE\nGood night.",
  ),
  scriptFileName: "A New Story",
  settings: {},
};
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
describe("X-Ray workspace", () => {
  it("shows a welcoming overview and searches scene content", () => {
    render(<XrayContent data={data} />);
    expect(screen.getByText("A New Story")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Scenes" }));
    fireEvent.change(screen.getByLabelText("Search scenes, locations or speakers"), { target: { value: "park" } });
    expect(screen.getByRole("button", { name: /2\. EXT\. PARK/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /1\. INT\. ROOM/ })).not.toBeInTheDocument();
  });
  it("exports the complete report while a scene filter is active", async () => {
    exportPdf.mockResolvedValue(true);
    render(<XrayContent data={data} />);
    fireEvent.click(screen.getByRole("tab", { name: "Scenes" }));
    fireEvent.change(screen.getByLabelText("Search scenes, locations or speakers"), { target: { value: "park" } });
    fireEvent.click(screen.getByRole("button", { name: "Export PDF" }));
    await screen.findByText("Your analysis PDF has been saved.");
    expect(exportPdf.mock.calls[0][0].scenes).toHaveLength(2);
  });
  it("handles cancellation and failure without claiming success", async () => {
    exportPdf.mockResolvedValueOnce(false).mockRejectedValueOnce(new Error("Disk unavailable"));
    render(<XrayContent data={data} />);
    fireEvent.click(screen.getByRole("button", { name: "Export PDF" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Export PDF" })).toBeEnabled());
    expect(screen.queryByText("Your analysis PDF has been saved.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Export PDF" }));
    await screen.findByText("Disk unavailable");
  });
  it("disables export while waiting for a script", () => {
    render(<XrayContent data={null} timedOut />);
    expect(screen.getByRole("button", { name: "Export PDF" })).toBeDisabled();
    expect(screen.getByText(/Reopen X-Ray/)).toBeInTheDocument();
  });
});

it("shows the shared logo while receiving the screenplay", () => {
  render(<XrayContent data={null} />);
  expect(screen.getByRole("status", { name: "Loading X-Ray" })).toBeInTheDocument();
  expect(screen.queryByText(/Waiting for your screenplay/)).not.toBeInTheDocument();
});

it("keeps analysis content scrollable without compressing chart panels", () => {
  render(<XrayContent data={data} />);
  expect(screen.getByRole("tabpanel", { name: "Overview" })).toHaveStyle({ overflow: "auto", minHeight: 0 });
  const chart = screen.getByRole("group", { name: /Scene rhythm:/ });
  expect(chart).toHaveAttribute("viewBox", "0 0 280 125");
});

it("recalculates chart geometry on resize while keeping label sizes stable", () => {
  const callbacks: ResizeObserverCallback[] = [];
  const original = globalThis.ResizeObserver;
  globalThis.ResizeObserver = class {
    constructor(callback: ResizeObserverCallback) { callbacks.push(callback); }
    observe() {}
    unobserve() {}
    disconnect() {}
  } as typeof ResizeObserver;
  try {
    render(<XrayContent data={data} />);
    const chart = screen.getByRole("group", { name: /Scene rhythm:/ });
    const resize = (width: number) => act(() => {
      callbacks.forEach(callback => callback([{ contentRect: { width } } as ResizeObserverEntry], {} as ResizeObserver));
    });
    resize(440);
    expect(chart).toHaveAttribute("viewBox", "0 0 440 125");
    const label = chart.querySelector("text");
    const fontSize = label?.getAttribute("font-size");
    resize(680);
    expect(chart).toHaveAttribute("viewBox", "0 0 680 125");
    expect(label).toHaveAttribute("font-size", fontSize!);
  } finally {
    globalThis.ResizeObserver = original;
  }
});
