import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ExportPdfWindow } from "./ExportPdfWindow";
import { ExportScriptWindow } from "./ExportScriptWindow";
import { invoke } from "@tauri-apps/api/core";
import { openPath, revealItemInDir } from "@tauri-apps/plugin-opener";

const mockFileState = {
  rawText: "INT. HOUSE - DAY\nJohn sits alone.",
  isBundle: false,
  activeScriptName: "Draft",
  filePath: "/home/writer/Projects/Draft.fountain",
  parsedDoc: {
    titlePage: [],
    tokens: [],
    scenes: [],
    settings: {
      elementFormats: undefined,
      sceneNumberMode: "left_side",
      watermarkSettings: {
        headerEnabled: false,
        footerEnabled: false,
        centerEnabled: false,
      },
    },
  },
  scripts: [{ name: "Draft", type: "screenplay", path: "Draft.fountain" }],
  activeScriptIndex: 0,
  updateSettings: vi.fn(),
};

vi.mock("../context", () => ({
  useFile: () => mockFileState,
  useUI: () => ({ fontFamily: "courier-prime", paperSize: "letter" }),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockImplementation(async (command) => {
    if (command === "get_detected_scripts") return [];
    if (command === "get_fonts_for_script") return [];
    return null;
  }),
}));

vi.mock("@tauri-apps/plugin-opener", () => ({
  openPath: vi.fn().mockResolvedValue(undefined),
  revealItemInDir: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./PdfExportPreview", () => ({
  PdfExportPreview: ({ argumentsJson }: { argumentsJson: string }) => <div data-testid="pdf-preview" data-args={argumentsJson} />,
}));

vi.mock("./TitleBar", () => ({
  TitleBar: ({ title, onClose }: { title: string; onClose: () => void }) => (
    <div data-testid="titlebar">
      <span>{title}</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock("./WindowResizeHandles", () => ({
  WindowResizeHandles: () => null,
}));

describe("ExportPdfWindow Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window as unknown as { __TAURI_INTERNALS__?: object }).__TAURI_INTERNALS__ = {};
    mockFileState.scripts = [{ name: "Draft", type: "screenplay", path: "Draft.fountain" }];
    mockFileState.filePath = "/home/writer/Projects/Draft.fountain";
  });

  it("renders without crashing and displays unified PDF settings and preview", () => {
    render(<ExportPdfWindow onClose={vi.fn()} />);
    expect(screen.getByText("Page & Layout")).toBeInTheDocument();
    expect(screen.getByText("Element Styles & Scene Numbers")).toBeInTheDocument();
    expect(screen.getByText("Watermarks & Security")).toBeInTheDocument();
    expect(screen.getByTestId("pdf-preview")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "PDF export settings" })).toHaveStyle({ overflowY: "auto", minHeight: 0 });
  });

  it("offers all five prose styles and shares the selected style with preview and export", async () => {
    mockFileState.scripts = [{ name: "Notes", type: "markdown", path: "Notes.md" }];
    mockFileState.filePath = "/home/writer/Notes.md";
    render(<ExportPdfWindow onClose={vi.fn()} />);
    const selector = screen.getByRole("combobox", { name: "Export Style" });
    expect(selector).toHaveTextContent("Classic");
    for (const style of ["Manuscript", "Treatment", "Modern", "Literary", "Classic"]) {
      fireEvent.mouseDown(selector);
      fireEvent.click(screen.getByRole("option", { name: new RegExp(style) }));
      const args = JSON.parse(screen.getByTestId("pdf-preview").getAttribute("data-args")!);
      expect(args.proseStyle).toBe(style.toLowerCase());
    }
    fireEvent.mouseDown(selector);
    fireEvent.click(screen.getByRole("option", { name: /Literary/ }));
    fireEvent.click(screen.getByRole("button", { name: "Export to PDF" }));
    await waitFor(() => expect(invoke).toHaveBeenCalledWith("export_prose_pdf", expect.objectContaining({ proseStyle: "literary", markdownText: mockFileState.rawText })));
  });

  it("resolves short image names identically for prose preview and saved PDF", async () => {
    mockFileState.scripts = [{ name: "Notes", type: "markdown", path: "Notes.md" }];
    mockFileState.filePath = "/home/writer/Notes.md";
    const originalText = mockFileState.rawText;
    const dataUrl = "data:image/png;base64,AAAA";
    const settings = mockFileState.parsedDoc.settings as typeof mockFileState.parsedDoc.settings & { proseImages?: Record<string, string> };
    settings.proseImages = { image1: dataUrl };
    mockFileState.rawText = "![image1](image1)";
    try {
      render(<ExportPdfWindow onClose={vi.fn()} />);
      const preview = JSON.parse(screen.getByTestId("pdf-preview").getAttribute("data-args")!);
      expect(preview.markdownText).toBe(`![image1](${dataUrl})`);
      expect(preview.proseStyle).toBe("classic");
      fireEvent.click(screen.getByRole("button", { name: "Export to PDF" }));
      await waitFor(() => expect(invoke).toHaveBeenCalledWith("export_prose_pdf", expect.objectContaining({ markdownText: preview.markdownText, proseStyle: "classic" })));
      expect(mockFileState.rawText).toBe("![image1](image1)");
    } finally {
      mockFileState.rawText = originalText;
      delete settings.proseImages;
    }
  });

  it("keeps prose styles out of screenplay export", () => {
    render(<ExportPdfWindow onClose={vi.fn()} />);
    expect(screen.queryByRole("combobox", { name: "Export Style" })).not.toBeInTheDocument();
  });

  it("offers actions after a successful PDF export", async () => {
    const path = "/home/writer/Exports/Draft.pdf";
    vi.mocked(invoke).mockImplementation(async (command) => command === "export_pdf" ? path : []);
    const onClose = vi.fn();
    render(<ExportPdfWindow onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Export to PDF" }));
    expect(await screen.findByText(/export complete/i)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Open file" }));
    await waitFor(() => expect(openPath).toHaveBeenCalledWith(path));
    fireEvent.click(screen.getByRole("button", { name: "Show in folder" }));
    await waitFor(() => expect(revealItemInDir).toHaveBeenCalledWith(path));
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("shows export error when export_pdf fails", async () => {
    vi.mocked(invoke).mockImplementation(async (command) => {
      if (command === "export_pdf") throw new Error("disk full");
      return [];
    });
    render(<ExportPdfWindow onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Export to PDF" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("disk full");
    expect(screen.queryByRole("button", { name: "Open file" })).not.toBeInTheDocument();
  });
});

describe("ExportScriptWindow Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window as unknown as { __TAURI_INTERNALS__?: object }).__TAURI_INTERNALS__ = {};
    mockFileState.scripts = [{ name: "Draft", type: "screenplay", path: "Draft.fountain" }];
    mockFileState.filePath = "/home/writer/Projects/Draft.fountain";
  });

  it.each([
    { prose: false, nav: "Fountain", button: "Export to Fountain (.fountain)", command: "export_fountain", extension: "fountain" },
    { prose: false, nav: "Final Draft (.fdx)", button: "Export to Final Draft (.fdx)", command: "export_fdx", extension: "fdx" },
    { prose: false, nav: "Fade In (.fadein)", button: "Export to Fade In (.fadein)", command: "export_fadein", extension: "fadein" },
    { prose: true, nav: "Markdown (.md)", button: "Export to Markdown (.md)", command: "export_markdown", extension: "md" },
  ])("offers completion actions for $extension exports", async ({ prose, nav, button, command, extension }) => {
    if (prose) mockFileState.scripts = [{ name: "Draft", type: "markdown", path: "Draft.md" }];
    const exported = `/home/writer/Exports/Draft.${extension}`;
    vi.mocked(invoke).mockImplementation(async (name, args) => name === "prepare_fountain_export" ? (args as { rawText: string }).rawText : name === command ? exported : []);
    const onClose = vi.fn();
    render(<ExportScriptWindow onClose={onClose} />);
    if (!prose) {
      fireEvent.click(screen.getByText(nav));
    }
    fireEvent.click(screen.getByRole("button", { name: button }));
    fireEvent.click(await screen.findByRole("button", { name: "Open file" }));
    expect(invoke).toHaveBeenCalledWith(command, expect.objectContaining(
      prose ? { content: mockFileState.rawText, defaultName: "Draft.md" } : { fountainText: mockFileState.rawText },
    ));
    await waitFor(() => expect(openPath).toHaveBeenCalledWith(exported));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("keeps export options open when the save dialog is canceled", async () => {
    vi.mocked(invoke).mockImplementation(async (command, args) => command === "prepare_fountain_export" ? (args as { rawText: string }).rawText : command === "export_fountain" ? null : []);
    const onClose = vi.fn();
    render(<ExportScriptWindow onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Export to Fountain (.fountain)" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Export to Fountain (.fountain)" })).not.toBeDisabled());
    expect(screen.queryByText(/export complete/i)).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
