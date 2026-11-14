import React from "react";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { FileProvider, useFile } from "./FileContext";
import { usePageBreaks } from "./FileSubscriptions";
import { UIProvider, useUI } from "./UIContext";
import { CustomModalProvider } from "./CustomModalContext";
import { parseScreenplay } from "../parser";
import { parseScreenplayAsync } from "../utils/asyncParser";
import type { ScriptInfo } from "../utils";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("../utils/asyncParser", () => ({ parseScreenplayAsync: vi.fn() }));
const scripts: ScriptInfo[] = [
  { name: "First", fileName: "files/first.fountain", content: "INT. ROOM - DAY\n\nFirst action.", savedContent: "INT. ROOM - DAY\n\nFirst action." },
  { name: "Second", fileName: "files/second.fountain", content: "EXT. PARK - NIGHT\n\nSecond action.", savedContent: "EXT. PARK - NIGHT\n\nSecond action." },
  { name: "Prose", type: "markdown", fileName: "files/prose.md", content: "# Notes", savedContent: "# Notes" },
  { name: "Canvas", type: "canvas", fileName: "files/canvas.excalidraw", content: "{}", savedContent: "{}" },
];
function wrapper({ children }: { children: React.ReactNode }) {
  return <UIProvider><CustomModalProvider><FileProvider>{children}</FileProvider></CustomModalProvider></UIProvider>;
}
beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.mocked(invoke).mockReset();
  vi.mocked(invoke).mockImplementation(async command => command === "read_actone_bundle"
    ? { scripts: scripts.map(script => ({ ...script })), settings: {} } : null);
  vi.mocked(parseScreenplayAsync).mockReset();
  vi.mocked(parseScreenplayAsync).mockImplementation(async (text, paperSize) => parseScreenplay(text, paperSize));
  (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
});
afterEach(() => vi.useRealTimers());
async function open() {
  const hook = renderHook(() => ({ ...useFile(), ui: useUI(), subscribedBreaks: usePageBreaks() }), { wrapper });
  await act(async () => { await hook.result.current.openFilePath("C:/switching.actone"); });
  return hook;
}

it("selects text immediately and parses each visit without caching", async () => {
  const hook = await open();
  act(() => hook.result.current.setActiveScript(1));
  expect(hook.result.current.rawText).toBe(scripts[1].content);
  expect(hook.result.current.parsedDoc.lines).toEqual([]);
  expect(hook.result.current.isDocumentLoading).toBe(true);
  expect(parseScreenplayAsync).not.toHaveBeenCalled();
  await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
  expect(parseScreenplayAsync).not.toHaveBeenCalled();
  await act(async () => { hook.result.current.prepareDocument(); await vi.advanceTimersByTimeAsync(0); });
  expect(hook.result.current.parsedDoc.lines.length).toBeGreaterThan(0);
  expect(hook.result.current.isDocumentLoading).toBe(false);
  act(() => hook.result.current.setActiveScript(0));
  expect(hook.result.current.parsedDoc.screenplayText).toBe(scripts[0].content);
  expect(hook.result.current.parsedDoc.lines).toEqual([]);
  await act(async () => { hook.result.current.prepareDocument(); await vi.advanceTimersByTimeAsync(0); });
  act(() => hook.result.current.setActiveScript(1));
  expect(hook.result.current.parsedDoc.lines).toEqual([]);
  await act(async () => { hook.result.current.prepareDocument(); await vi.advanceTimersByTimeAsync(0); });
  expect(parseScreenplayAsync).toHaveBeenCalledTimes(3);
  await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
  expect(vi.mocked(invoke).mock.calls.some(([command]) => command === "get_page_breaks")).toBe(true);
  expect(hook.result.current.parsedDoc.pageBreaks).toEqual(parseScreenplay(scripts[1].content, hook.result.current.ui.paperSize).pageBreaks);
  hook.unmount();
});

it("does not let a late parse replace prose or newer edits", async () => {
  let resolve!: (doc: ReturnType<typeof parseScreenplay>) => void;
  vi.mocked(parseScreenplayAsync).mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  const hook = await open();
  act(() => hook.result.current.setActiveScript(1));
  await act(async () => { hook.result.current.prepareDocument(); await vi.advanceTimersByTimeAsync(0); });
  act(() => hook.result.current.setActiveScript(2));
  await act(async () => resolve(parseScreenplay(scripts[1].content)));
  expect(hook.result.current.rawText).toBe("# Notes");
  expect(hook.result.current.parsedDoc.lines).toEqual([]);
  act(() => hook.result.current.setActiveScript(1));
  act(() => hook.result.current.setRawText("INT. UPDATED - DAY"));
  act(() => hook.result.current.setActiveScript(0));
  act(() => hook.result.current.setActiveScript(1));
  expect(hook.result.current.rawText).toBe("INT. UPDATED - DAY");
  await act(async () => { hook.result.current.prepareDocument(); await vi.advanceTimersByTimeAsync(0); });
  expect(hook.result.current.parsedDoc.screenplayText).toBe("INT. UPDATED - DAY");
  hook.unmount();
});

it("cancels superseded switches before starting unnecessary parses", async () => {
  const hook = await open();
  act(() => hook.result.current.setActiveScript(1));
  act(() => hook.result.current.setActiveScript(0));
  await act(async () => { hook.result.current.prepareDocument(); await vi.advanceTimersByTimeAsync(0); });
  expect(parseScreenplayAsync).toHaveBeenCalledTimes(1);
  expect(parseScreenplayAsync).toHaveBeenCalledWith(scripts[0].content, expect.any(String), expect.any(String));
  expect(hook.result.current.parsedDoc.screenplayText).toBe(scripts[0].content);
  hook.unmount();
});

it("parses using the latest paper size", async () => {
  const hook = await open();
  act(() => hook.result.current.setActiveScript(1));
  await act(async () => { hook.result.current.prepareDocument(); await vi.advanceTimersByTimeAsync(0); });
  act(() => hook.result.current.setActiveScript(0));
  const nextSize = hook.result.current.ui.paperSize === "a4" ? "letter" : "a4";
  act(() => hook.result.current.ui.setPaperSize(nextSize));
  act(() => hook.result.current.setActiveScript(1));
  expect(hook.result.current.parsedDoc.lines).toEqual([]);
  await act(async () => { hook.result.current.prepareDocument(); await vi.advanceTimersByTimeAsync(0); });
  expect(parseScreenplayAsync).toHaveBeenLastCalledWith(scripts[1].content, nextSize, expect.any(String));
  expect(hook.result.current.parsedDoc.lines.length).toBeGreaterThan(0);
  hook.unmount();
});

it("ignores a parse for text that was edited while the worker was running", async () => {
  let resolve!: (doc: ReturnType<typeof parseScreenplay>) => void;
  vi.mocked(parseScreenplayAsync).mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  const hook = await open();
  act(() => hook.result.current.setActiveScript(1));
  await act(async () => { hook.result.current.prepareDocument(); await vi.advanceTimersByTimeAsync(0); });
  act(() => hook.result.current.setRawText("INT. UPDATED - DAY"));
  await act(async () => resolve(parseScreenplay(scripts[1].content)));
  expect(hook.result.current.rawText).toBe("INT. UPDATED - DAY");
  expect(hook.result.current.parsedDoc.lines).toEqual([]);
  await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
  expect(hook.result.current.parsedDoc.screenplayText).toBe("INT. UPDATED - DAY");
  hook.unmount();
});

it("ends loading on a parse failure and allows retrying the selected document", async () => {
  vi.mocked(parseScreenplayAsync).mockRejectedValueOnce(new Error("Parser unavailable"));
  const hook = await open();
  act(() => hook.result.current.setActiveScript(1));
  await act(async () => { hook.result.current.prepareDocument(); await vi.advanceTimersByTimeAsync(0); });
  expect(hook.result.current.isDocumentLoading).toBe(false);
  expect(hook.result.current.documentLoadError).toContain("Select it again to retry");
  act(() => hook.result.current.setActiveScript(1));
  expect(hook.result.current.isDocumentLoading).toBe(true);
  await act(async () => { hook.result.current.prepareDocument(); await vi.advanceTimersByTimeAsync(0); });
  expect(hook.result.current.documentLoadError).toBeNull();
  expect(hook.result.current.isDocumentLoading).toBe(false);
  hook.unmount();
});

it("restarts an unfinished parse when returning to its project", async () => {
  vi.mocked(parseScreenplayAsync).mockImplementationOnce(() => new Promise(() => {}));
  const hook = await open();
  const originalProject = hook.result.current.activeFileId;
  act(() => hook.result.current.setActiveScript(1));
  await act(async () => { hook.result.current.prepareDocument(); await vi.advanceTimersByTimeAsync(0); });
  act(() => hook.result.current.newFile("INT. OTHER - DAY"));
  act(() => hook.result.current.selectFile(originalProject));
  await act(async () => {});
  expect(hook.result.current.rawText).toBe(scripts[1].content);
  expect(hook.result.current.isDocumentLoading).toBe(false);
  expect(hook.result.current.parsedDoc.lines.length).toBeGreaterThan(0);
  hook.unmount();
});


it("publishes native pagination to the editor and page subscribers without changing parsed lines", async () => {
  const hook = await open();
  const originalLines = hook.result.current.parsedDoc.lines;
  vi.mocked(invoke).mockResolvedValue([2]);
  await act(async () => { await vi.advanceTimersByTimeAsync(200); });
  expect(hook.result.current.parsedDoc.pageBreaks).toEqual([2]);
  expect(hook.result.current.subscribedBreaks).toEqual([2]);
  expect(hook.result.current.parsedDoc.lines).toBe(originalLines);
  expect(invoke).toHaveBeenLastCalledWith("get_page_breaks", expect.objectContaining({
    fountainText: scripts[0].content, fontFamily: hook.result.current.ui.fontFamily,
    paperSize: hook.result.current.ui.paperSize, autoContd: hook.result.current.ui.autoContdEnabled,
    exportSections: false, exportSynopses: false, exportTitlePage: true,
  }));
  hook.unmount();
});

it("recalculates native pagination for paper, font, continuation and element-format changes", async () => {
  const hook = await open();
  vi.mocked(invoke).mockResolvedValue([2]);
  await act(async () => { await vi.advanceTimersByTimeAsync(200); });
  const changes = [
    () => hook.result.current.ui.setFontFamily(hook.result.current.ui.fontFamily === "courier-prime" ? "courier-prime-sans" : "courier-prime"),
    () => hook.result.current.ui.setPaperSize(hook.result.current.ui.paperSize === "a4" ? "letter" : "a4"),
    () => hook.result.current.ui.setAutoContdEnabled(!hook.result.current.ui.autoContdEnabled),
    () => hook.result.current.updateSettings(prev => ({ ...prev, elementFormats: { action: { bold: true, italic: false, underline: false } } })),
  ];
  for (const change of changes) {
    vi.mocked(invoke).mockClear();
    act(change);
    await act(async () => { await vi.advanceTimersByTimeAsync(200); });
    expect(vi.mocked(invoke).mock.calls.filter(([command]) => command === "get_page_breaks")).toHaveLength(1);
    expect(hook.result.current.parsedDoc.pageBreaks).toEqual([2]);
  }
  hook.unmount();
});

it.each([2, 3])("rejects late native layout after switching to non-screenplay script %s", async index => {
  const hook = await open();
  let resolve!: (breaks: number[]) => void;
  vi.mocked(invoke).mockReturnValueOnce(new Promise<number[]>(done => { resolve = done; }));
  await act(async () => { await vi.advanceTimersByTimeAsync(200); });
  act(() => hook.result.current.setActiveScript(index));
  await act(async () => resolve([99]));
  await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
  expect(hook.result.current.parsedDoc.pageBreaks).toBeUndefined();
  expect(hook.result.current.subscribedBreaks).toBeUndefined();
  expect(vi.mocked(invoke).mock.calls.filter(([command]) => command === "get_page_breaks")).toHaveLength(1);
  hook.unmount();
});

it("keeps native layout when a parser refresh finishes for the same document", async () => {
  const hook = await open();
  vi.mocked(invoke).mockResolvedValue([2]);
  await act(async () => { await vi.advanceTimersByTimeAsync(200); });
  // Settings update reconstructs the parsed document without changing layout inputs.
  act(() => hook.result.current.updateSettings(prev => ({ ...prev, testSetting: "changed" })));
  expect(hook.result.current.parsedDoc.pageBreaks).toEqual([2]);
  expect(hook.result.current.parsedDoc.settings.testSetting).toBe("changed");
  hook.unmount();
});


it("ignores a native result for text edited before parsing finishes", async () => {
  const hook = await open();
  let resolve!: (breaks: number[]) => void;
  vi.mocked(invoke).mockReturnValueOnce(new Promise<number[]>(done => { resolve = done; }));
  await act(async () => { await vi.advanceTimersByTimeAsync(200); });
  act(() => hook.result.current.setRawText("INT. EDITED - NIGHT\n\nNew action."));
  await act(async () => resolve([99]));
  expect(hook.result.current.parsedDoc.pageBreaks).not.toEqual([99]);
  vi.mocked(invoke).mockResolvedValue([3]);
  await act(async () => { await vi.advanceTimersByTimeAsync(100); });
  await act(async () => { await vi.advanceTimersByTimeAsync(200); });
  expect(invoke).toHaveBeenLastCalledWith("get_page_breaks", expect.objectContaining({ fountainText: "INT. EDITED - NIGHT\n\nNew action." }));
  expect(hook.result.current.subscribedBreaks).toEqual([3]);
  hook.unmount();
});

it("applies only the newest project's queued layout", async () => {
  const hook = await open();
  let resolve!: (breaks: number[]) => void;
  vi.mocked(invoke).mockReturnValueOnce(new Promise<number[]>(done => { resolve = done; }));
  await act(async () => { await vi.advanceTimersByTimeAsync(200); });
  act(() => hook.result.current.newFile("INT. NEW PROJECT - DAY\n\nAction."));
  await act(async () => { await vi.advanceTimersByTimeAsync(200); });
  vi.mocked(invoke).mockResolvedValue([3]);
  await act(async () => resolve([99]));
  expect(hook.result.current.rawText).toContain("NEW PROJECT");
  expect(hook.result.current.parsedDoc.pageBreaks).toEqual([3]);
  expect(hook.result.current.subscribedBreaks).toEqual([3]);
  hook.unmount();
});

it("does not request native layout for a project without scripts", async () => {
  const hook = await open();
  act(() => hook.result.current.newFile());
  vi.mocked(invoke).mockClear();
  await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
  expect(invoke).not.toHaveBeenCalled();
  hook.unmount();
});
