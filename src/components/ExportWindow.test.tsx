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
  PdfExportPreview: () => <div data-testid="pdf-preview" />,
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

  it("renders without crashing and displays PDF tabs", () => {
    render(<ExportPdfWindow onClose={vi.fn()} />);
    expect(screen.getByText("Document & Layout")).toBeInTheDocument();
    expect(screen.getByText("Element Formatting")).toBeInTheDocument();
    expect(screen.getByText("Watermarks")).toBeInTheDocument();
    expect(screen.getByTestId("pdf-preview")).toBeInTheDocument();
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
    { prose: false, nav: "Fountain (.fountain)", button: "Export to Fountain (.fountain)", command: "export_fountain", extension: "fountain" },
    { prose: false, nav: "Final Draft (.fdx)", button: "Export to Final Draft (.fdx)", command: "export_fdx", extension: "fdx" },
    { prose: false, nav: "Fade In (.fadein)", button: "Export to Fade In (.fadein)", command: "export_fadein", extension: "fadein" },
    { prose: true, nav: "Markdown (.md)", button: "Export to Markdown (.md)", command: "export_markdown", extension: "md" },
  ])("offers completion actions for $extension exports", async ({ prose, nav, button, command, extension }) => {
    if (prose) mockFileState.scripts = [{ name: "Draft", type: "markdown", path: "Draft.md" }];
    const exported = `/home/writer/Exports/Draft.${extension}`;
    vi.mocked(invoke).mockImplementation(async name => name === command ? exported : []);
    const onClose = vi.fn();
    render(<ExportScriptWindow onClose={onClose} />);
    if (!prose) {
      fireEvent.click(screen.getByText(nav));
    }
    fireEvent.click(screen.getByRole("button", { name: button }));
    fireEvent.click(await screen.findByRole("button", { name: "Open file" }));
    await waitFor(() => expect(openPath).toHaveBeenCalledWith(exported));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("keeps export options open when the save dialog is canceled", async () => {
    vi.mocked(invoke).mockImplementation(async command => command === "export_fountain" ? null : []);
    const onClose = vi.fn();
    render(<ExportScriptWindow onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Export to Fountain (.fountain)" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Export to Fountain (.fountain)" })).not.toBeDisabled());
    expect(screen.queryByText(/export complete/i)).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
