import { describe, it, expect, vi, beforeEach } from "vitest";
import { openExportPdfWindow, openExportScriptWindow, type ExportWindowData } from "./exportWindow";

const mocks = vi.hoisted(() => ({
  emit: vi.fn().mockResolvedValue(undefined),
  listen: vi.fn(),
  getByLabel: vi.fn().mockResolvedValue(null),
  getCurrentWindow: vi.fn(() => ({ label: "main" })),
}));

vi.mock("@tauri-apps/api/event", () => ({
  emitTo: (...args: unknown[]) => mocks.emit(...args),
  listen: (...args: unknown[]) => mocks.listen(...args),
}));

vi.mock("@tauri-apps/api/webviewWindow", () => ({
  WebviewWindow: class {
    static getByLabel = mocks.getByLabel;
    once = vi.fn();
    constructor(public label: string, public options: unknown) {}
  },
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: mocks.getCurrentWindow,
}));

describe("exportWindow helper", () => {
  const data: ExportWindowData = {
    file: { rawText: "INT. COFFEE SHOP - DAY", isBundle: false, activeScriptName: "Draft", filePath: null, parsedDoc: null, scripts: [], activeScriptIndex: 0 },
    ui: { fontFamily: "courier-prime", paperSize: "letter" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (window as unknown as { __TAURI_INTERNALS__?: object }).__TAURI_INTERNALS__ = {};
  });

  it("opens the PDF export window and delivers document payload on ready", async () => {
    mocks.listen.mockImplementation((event: string, handler: () => void) => {
      if (event === "export-pdf:ready") handler();
      return Promise.resolve(() => {});
    });

    await openExportPdfWindow(data);
    expect(mocks.emit).toHaveBeenCalledWith("export-pdf", "export:document", data);
  });

  it("re-uses an existing PDF export window without re-creating it", async () => {
    const focus = vi.fn().mockResolvedValue(undefined);
    mocks.getByLabel.mockResolvedValueOnce({ setFocus: focus });

    await openExportPdfWindow(data);
    expect(mocks.emit).toHaveBeenCalledWith("export-pdf", "export:document", data);
    expect(focus).toHaveBeenCalled();
  });

  it("opens the Script export window and delivers document payload on ready", async () => {
    mocks.listen.mockImplementation((event: string, handler: () => void) => {
      if (event === "export-script:ready") handler();
      return Promise.resolve(() => {});
    });

    await openExportScriptWindow(data);
    expect(mocks.emit).toHaveBeenCalledWith("export-script", "export:document", data);
  });

  it("re-uses an existing Script export window without re-creating it", async () => {
    const focus = vi.fn().mockResolvedValue(undefined);
    mocks.getByLabel.mockResolvedValueOnce({ setFocus: focus });

    await openExportScriptWindow(data);
    expect(mocks.emit).toHaveBeenCalledWith("export-script", "export:document", data);
    expect(focus).toHaveBeenCalled();
  });
});
