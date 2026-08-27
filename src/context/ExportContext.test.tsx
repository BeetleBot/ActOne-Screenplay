import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import {
  ExportProvider,
  useExport,
  DEFAULT_EXPORT_SETTINGS,
  DEFAULT_ELEMENT_FORMATS,
} from "./ExportContext";
import * as tauriCore from "@tauri-apps/api/core";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(ExportProvider, null, children);
}

describe("ExportContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws an error when used outside ExportProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useExport())).toThrow(
      "useExport must be used within an ExportProvider"
    );
    spy.mockRestore();
  });

  it("provides default export settings", () => {
    const { result } = renderHook(() => useExport(), { wrapper });

    expect(result.current.settings.format).toBe("pdf");
    expect(result.current.settings.paperSize).toBe("letter");
    expect(result.current.settings.includeTitlePage).toBe(true);
    expect(result.current.settings.includeSections).toBe(false);
    expect(result.current.settings.fontFamily).toBe("Courier Prime");
    expect(result.current.settings.elementFormats).toEqual(DEFAULT_ELEMENT_FORMATS);
    expect(result.current.isExporting).toBe(false);
  });

  it("allows custom initial settings via props", () => {
    const customWrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        ExportProvider,
        {
          initialSettings: {
            format: "fdx",
            paperSize: "a4",
            watermarkText: "DRAFT ONLY",
          },
        },
        children
      );

    const { result } = renderHook(() => useExport(), { wrapper: customWrapper });
    expect(result.current.settings.format).toBe("fdx");
    expect(result.current.settings.paperSize).toBe("a4");
    expect(result.current.settings.watermarkText).toBe("DRAFT ONLY");
  });

  it("updates top-level export settings with updateSettings", () => {
    const { result } = renderHook(() => useExport(), { wrapper });

    act(() => {
      result.current.updateSettings({
        format: "fountain",
        paperSize: "a4",
        includeSections: true,
        includeSynopses: true,
        watermarkText: "CONFIDENTIAL",
      });
    });

    expect(result.current.settings.format).toBe("fountain");
    expect(result.current.settings.paperSize).toBe("a4");
    expect(result.current.settings.includeSections).toBe(true);
    expect(result.current.settings.includeSynopses).toBe(true);
    expect(result.current.settings.watermarkText).toBe("CONFIDENTIAL");
  });

  it("updates individual element formatting with updateElementFormat", () => {
    const { result } = renderHook(() => useExport(), { wrapper });

    act(() => {
      result.current.updateElementFormat("character", { bold: true, uppercase: true } as any);
      result.current.updateElementFormat("dialogue", { italic: true });
    });

    expect(result.current.settings.elementFormats.character.bold).toBe(true);
    expect(result.current.settings.elementFormats.dialogue.italic).toBe(true);
    // Preserves other elements
    expect(result.current.settings.elementFormats.scene_heading.bold).toBe(true);
  });

  it("resets export settings back to defaults", () => {
    const { result } = renderHook(() => useExport(), { wrapper });

    act(() => {
      result.current.updateSettings({
        format: "markdown",
        watermarkText: "SAMPLE",
      });
    });

    expect(result.current.settings.format).toBe("markdown");

    act(() => {
      result.current.resetSettings();
    });

    expect(result.current.settings).toEqual(DEFAULT_EXPORT_SETTINGS);
  });

  it("executes exportScript and manages isExporting state", async () => {
    const { result } = renderHook(() => useExport(), { wrapper });
    const content = "INT. ROOM - DAY\n\nALICE\nHello world.";

    let exportPromise: any;
    act(() => {
      exportPromise = result.current.exportScript(content, "pdf");
    });

    const res = await exportPromise;
    expect(res.success).toBe(true);
    expect(res.filePath).toBeDefined();
    expect(result.current.isExporting).toBe(false);
  });

  it("calls Tauri backend for export when available", async () => {
    (window as any).__TAURI_INTERNALS__ = {};
    vi.mocked(tauriCore.invoke).mockResolvedValueOnce({
      success: true,
      filePath: "/exports/myscript.pdf",
    });

    const { result } = renderHook(() => useExport(), { wrapper });

    let exportRes: any;
    await act(async () => {
      exportRes = await result.current.exportScript("INT. CAFE", "pdf");
    });

    expect(tauriCore.invoke).toHaveBeenCalledWith("export_screenplay", {
      content: "INT. CAFE",
      format: "pdf",
      settings: expect.any(Object),
    });
    expect(exportRes.success).toBe(true);
    expect(exportRes.filePath).toBe("/exports/myscript.pdf");

    delete (window as any).__TAURI_INTERNALS__;
  });

  it("handles export failure gracefully", async () => {
    (window as any).__TAURI_INTERNALS__ = {};
    vi.mocked(tauriCore.invoke).mockRejectedValueOnce(new Error("Disk write error"));

    const { result } = renderHook(() => useExport(), { wrapper });

    let exportRes: any;
    await act(async () => {
      exportRes = await result.current.exportScript("INT. CAFE", "pdf");
    });

    expect(exportRes.success).toBe(false);
    expect(exportRes.error).toBe("Disk write error");
    expect(result.current.isExporting).toBe(false);

    delete (window as any).__TAURI_INTERNALS__;
  });
});
