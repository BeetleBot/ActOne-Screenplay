import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: {},
  PDFWorker: class { promise = Promise.resolve(); destroy() {} },
}));
vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/plugin-opener", () => ({ openPath: vi.fn(), revealItemInDir: vi.fn() }));
import { invoke } from "@tauri-apps/api/core";
import { openPath, revealItemInDir } from "@tauri-apps/plugin-opener";

let mockFileState = {
  rawText: "EXT. HOUSE - DAY\n\nHello.",
  isBundle: false,
  activeScriptName: "Script",
  filePath: null,
  updateSettings: vi.fn(),
  parsedDoc: { lines: [], settings: {}, screenplayText: "EXT. HOUSE - DAY\n\nHello." },
  scripts: [{ id: "s1", name: "Script", type: "fountain", content: "EXT. HOUSE - DAY\n\nHello." }],
  activeScriptIndex: 0,
};

vi.mock("../context", () => ({
  useFile: () => mockFileState,
  useUI: () => ({
    fontFamily: "courier-prime",
    paperSize: "letter",
    appScale: 100,
  }),
}));

import { ExportWindow } from "./ExportWindow";

beforeEach(() => {
  vi.clearAllMocks();
  delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
  vi.mocked(invoke).mockResolvedValue([]);
  vi.mocked(openPath).mockResolvedValue();
  vi.mocked(revealItemInDir).mockResolvedValue();
  mockFileState = {
    rawText: "EXT. HOUSE - DAY\n\nHello.",
    isBundle: false,
    activeScriptName: "Script",
    filePath: null,
    updateSettings: vi.fn(),
    parsedDoc: { lines: [], settings: {}, screenplayText: "EXT. HOUSE - DAY\n\nHello." },
    scripts: [{ id: "s1", name: "Script", type: "fountain", content: "EXT. HOUSE - DAY\n\nHello." }],
    activeScriptIndex: 0,
  };
});

describe("ExportWindow Component", () => {
  it("renders without crashing", () => {
    const { container } = render(React.createElement(ExportWindow, { onClose: vi.fn() }));
    expect(container).toBeTruthy();
  });

  it("renders script mode export options", () => {
    render(React.createElement(ExportWindow, { onClose: vi.fn() }));
    expect(screen.getByText(/export script/i)).toBeTruthy();
    expect(screen.getByText(/start each scene on new page/i)).toBeTruthy();
    expect(screen.getByText(/^fountain$/i)).toBeTruthy();
  });

  it("renders prose mode export modal correctly", () => {
    mockFileState = {
      ...mockFileState,
      scripts: [{ id: "s1", name: "Chapter 1", type: "markdown", content: "# Chapter 1\n\nSome prose text." }],
    };
    render(React.createElement(ExportWindow, { onClose: vi.fn() }));
    expect(screen.getByText(/export prose/i)).toBeTruthy();
    expect(screen.getByText(/markdown \(\.md\)/i)).toBeTruthy();
    expect(screen.queryByText(/^fountain$/i)).toBeNull();
    expect(screen.queryByText(/element formatting/i)).toBeNull();
  });
});


describe("desktop export completion", () => {
  const path = "C:\\Drafts\\My script.pdf";
  beforeEach(() => { (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {}; });

  it.each([false, true])("offers actions after a successful PDF with prose=%s", async prose => {
    if (prose) mockFileState.scripts[0].type = "markdown";
    vi.mocked(invoke).mockImplementation(async command => command === (prose ? "export_prose_pdf" : "export_pdf") ? path : []);
    const onClose = vi.fn();
    render(<ExportWindow onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Export to PDF" }));
    expect(await screen.findByText(/export complete/i)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Open file" }));
    await waitFor(() => expect(openPath).toHaveBeenCalledWith(path));
    await waitFor(() => expect(screen.getByRole("button", { name: "Show in folder" })).not.toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: "Show in folder" }));
    await waitFor(() => expect(revealItemInDir).toHaveBeenCalledWith(path));
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it.each([
    { prose: false, nav: "Fountain", button: "Export to Fountain", command: "export_fountain", extension: "fountain" },
    { prose: false, nav: "Final Draft (.fdx)", button: "Export to FDX", command: "export_fdx", extension: "fdx" },
    { prose: false, nav: "Fade In (.fadein)", button: "Export to Fade In", command: "export_fadein", extension: "fadein" },
    { prose: true, nav: "Markdown (.md)", button: "Export to Markdown (.md)", command: "export_markdown", extension: "md" },
  ])("offers completion actions for $extension exports", async ({ prose, nav, button, command, extension }) => {
    if (prose) mockFileState.scripts[0].type = "markdown";
    const exported = `/home/writer/Exports/Draft.${extension}`;
    vi.mocked(invoke).mockImplementation(async name => name === command ? exported : []);
    const onClose = vi.fn();
    render(<ExportWindow onClose={onClose} />);
    fireEvent.click(screen.getByText(nav));
    fireEvent.click(screen.getByRole("button", { name: button }));
    fireEvent.click(await screen.findByRole("button", { name: "Open file" }));
    await waitFor(() => expect(openPath).toHaveBeenCalledWith(exported));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("keeps export options open when the save dialog is canceled", async () => {
    vi.mocked(invoke).mockImplementation(async command => command === "export_pdf" ? null : []);
    const onClose = vi.fn();
    render(<ExportWindow onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Export to PDF" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Export to PDF" })).not.toBeDisabled());
    expect(screen.queryByText(/export complete/i)).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("shows export errors without offering success actions", async () => {
    vi.mocked(invoke).mockImplementation(async command => { if (command === "export_pdf") throw new Error("disk full"); return []; });
    render(<ExportWindow onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Export to PDF" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Export failed");
    expect(screen.queryByRole("button", { name: "Open file" })).not.toBeInTheDocument();
  });

  it("keeps the exported file available when opening it fails", async () => {
    vi.mocked(invoke).mockImplementation(async command => command === "export_pdf" ? path : []);
    vi.mocked(openPath).mockRejectedValue(new Error("no associated application"));
    render(<ExportWindow onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Export to PDF" }));
    fireEvent.click(await screen.findByRole("button", { name: "Open file" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not open the exported file");
    expect(screen.getByRole("button", { name: "Show in folder" })).not.toBeDisabled();
  });
  it("allows retrying when revealing the exported file fails", async () => {
    vi.mocked(invoke).mockImplementation(async command => command === "export_pdf" ? path : []);
    vi.mocked(revealItemInDir).mockRejectedValueOnce(new Error("file manager failed"));
    render(<ExportWindow onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Export to PDF" }));
    fireEvent.click(await screen.findByRole("button", { name: "Show in folder" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not show the exported file");
    fireEvent.click(screen.getByRole("button", { name: "Show in folder" }));
    await waitFor(() => expect(revealItemInDir).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });

});
