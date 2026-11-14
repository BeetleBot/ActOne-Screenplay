import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { useDocumentPagination, useProsePagination, type DocumentPaginationOptions } from "./useDocumentPagination";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(invoke).mockReset();
  (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
});
afterEach(() => vi.useRealTimers());
function options(): DocumentPaginationOptions {
  return { fileId: "project", scriptIndex: 0, text: "INT. ROOM - DAY", enabled: true,
    paperSize: "letter", fontFamily: "Courier Prime", elementFormats: "{}", scriptFonts: "{}", autoContd: false, onResult: vi.fn() };
}

it("calculates layout on each visit without caching results", async () => {
  vi.mocked(invoke).mockResolvedValue([0, 50]);
  const initial = options();
  const hook = renderHook(props => useDocumentPagination(props), { initialProps: initial });
  await act(async () => { await vi.advanceTimersByTimeAsync(200); });
  hook.rerender({ ...initial, scriptIndex: 1, text: "other" });
  await act(async () => { await vi.advanceTimersByTimeAsync(200); });
  vi.mocked(initial.onResult!).mockClear();
  hook.rerender(initial);
  expect(initial.onResult).not.toHaveBeenCalled();
  await act(async () => { await vi.advanceTimersByTimeAsync(200); });
  expect(initial.onResult).toHaveBeenCalledWith([0, 50]);
  expect(invoke).toHaveBeenCalledTimes(3);
  hook.unmount();
});

it.each(["text", "paperSize", "fontFamily", "elementFormats", "scriptFonts", "autoContd"] as const)("recalculates when %s changes", async field => {
  vi.mocked(invoke).mockResolvedValue([0]);
  const initial = options();
  const hook = renderHook(props => useDocumentPagination(props), { initialProps: initial });
  await act(async () => { await vi.advanceTimersByTimeAsync(200); });
  const changes = { text: "new", paperSize: "a4", fontFamily: "Other", elementFormats: '{"action":{}}', scriptFonts: '{"script":"Other"}', autoContd: true };
  hook.rerender({ ...initial, [field]: changes[field] } as DocumentPaginationOptions);
  await act(async () => { await vi.advanceTimersByTimeAsync(200); });
  expect(invoke).toHaveBeenCalledTimes(2);
  hook.unmount();
});

it("does not apply a late result to the next document", async () => {
  let resolve!: (breaks: number[]) => void;
  vi.mocked(invoke).mockReturnValueOnce(new Promise<number[]>(done => { resolve = done; }));
  const initial = options();
  const hook = renderHook(props => useDocumentPagination(props), { initialProps: initial });
  await act(async () => { await vi.advanceTimersByTimeAsync(200); });
  hook.rerender({ ...initial, scriptIndex: 1, text: "other" });
  await act(async () => resolve([99]));
  expect(initial.onResult).not.toHaveBeenCalled();
  hook.rerender(initial);
  vi.mocked(invoke).mockResolvedValue([0]);
  await act(async () => { await vi.advanceTimersByTimeAsync(200); });
  expect(initial.onResult).toHaveBeenCalledWith([0]);
  expect(initial.onResult).not.toHaveBeenCalledWith([99]);
  expect(invoke).toHaveBeenCalledTimes(2);
  hook.unmount();
});

it("uses Classic native prose pagination and drops stale results", async () => {
  let resolve!: (breaks: number[]) => void;
  vi.mocked(invoke).mockReturnValueOnce(new Promise<number[]>(done => { resolve = done; }));
  const hook = renderHook(({ text }) => useProsePagination(text, "a4", "notes", true), { initialProps: { text: "first" } });
  await act(async () => { await vi.advanceTimersByTimeAsync(300); });
  expect(invoke).toHaveBeenCalledWith("get_prose_page_breaks", { markdownText: "first", paperSize: "a4" });
  hook.rerender({ text: "second" });
  await act(async () => resolve([99]));
  expect(hook.result.current).toBeNull();
  vi.mocked(invoke).mockResolvedValue([12, 30]);
  await act(async () => { await vi.advanceTimersByTimeAsync(300); });
  expect(hook.result.current).toEqual([12, 30]);
  hook.unmount();
});

it("resolves short image names for Classic prose pagination", async () => {
  vi.mocked(invoke).mockResolvedValue([]);
  const images = { proseImages: { image1: "data:image/png;base64,AAAA" } };
  const hook = renderHook(() => useProsePagination("![image1](image1)", "letter", "notes", true, images));
  await act(async () => { await vi.advanceTimersByTimeAsync(300); });
  expect(invoke).toHaveBeenCalledWith("get_prose_page_breaks", { markdownText: "![image1](data:image/png;base64,AAAA)", paperSize: "letter" });
  hook.unmount();
});


it("debounces edits and exposes only the current revision's result", async () => {
  vi.mocked(invoke).mockResolvedValue([4, 20]);
  const initial = options();
  const hook = renderHook(props => useDocumentPagination(props), { initialProps: initial });
  hook.rerender({ ...initial, text: "edit one" });
  await act(async () => { await vi.advanceTimersByTimeAsync(100); });
  hook.rerender({ ...initial, text: "edit two" });
  await act(async () => { await vi.advanceTimersByTimeAsync(199); });
  expect(invoke).not.toHaveBeenCalled();
  await act(async () => { await vi.advanceTimersByTimeAsync(1); });
  expect(invoke).toHaveBeenCalledTimes(1);
  expect(invoke).toHaveBeenCalledWith("get_page_breaks", expect.objectContaining({ fountainText: "edit two" }));
  expect(hook.result.current).toEqual([4, 20]);
  hook.rerender({ ...initial, text: "edit three" });
  expect(hook.result.current).toBeNull();
  hook.unmount();
});

it("serializes native layout and coalesces queued revisions to the newest text", async () => {
  let resolve!: (breaks: number[]) => void;
  vi.mocked(invoke).mockReturnValueOnce(new Promise<number[]>(done => { resolve = done; }));
  const initial = options();
  const hook = renderHook(props => useDocumentPagination(props), { initialProps: initial });
  await act(async () => { await vi.advanceTimersByTimeAsync(200); });
  hook.rerender({ ...initial, text: "queued old" });
  await act(async () => { await vi.advanceTimersByTimeAsync(200); });
  hook.rerender({ ...initial, text: "queued latest" });
  await act(async () => { await vi.advanceTimersByTimeAsync(200); });
  expect(invoke).toHaveBeenCalledTimes(1);
  vi.mocked(invoke).mockResolvedValue([7]);
  await act(async () => resolve([99]));
  expect(invoke).toHaveBeenCalledTimes(2);
  expect(invoke).toHaveBeenLastCalledWith("get_page_breaks", expect.objectContaining({ fountainText: "queued latest" }));
  expect(hook.result.current).toEqual([7]);
  expect(initial.onResult).not.toHaveBeenCalledWith([99]);
  hook.unmount();
});

it("discards pending requests and results when disabled or unmounted", async () => {
  let resolve!: (breaks: number[]) => void;
  vi.mocked(invoke).mockReturnValueOnce(new Promise<number[]>(done => { resolve = done; }));
  const initial = options();
  const hook = renderHook(props => useDocumentPagination(props), { initialProps: initial });
  await act(async () => { await vi.advanceTimersByTimeAsync(200); });
  hook.rerender({ ...initial, text: "queued" });
  await act(async () => { await vi.advanceTimersByTimeAsync(200); });
  hook.rerender({ ...initial, enabled: false });
  await act(async () => resolve([99]));
  expect(hook.result.current).toBeNull();
  expect(invoke).toHaveBeenCalledTimes(1);
  expect(initial.onResult).not.toHaveBeenCalled();
  hook.unmount();
});

it.each([null, [-1], [5, 3], [2.5], [Number.NaN], ["3"]].map(breaks => ({ breaks })))("ignores invalid layout results $breaks", async ({ breaks }) => {
  vi.mocked(invoke).mockResolvedValue(breaks);
  const initial = options();
  const hook = renderHook(() => useDocumentPagination(initial));
  await act(async () => { await vi.advanceTimersByTimeAsync(200); });
  expect(hook.result.current).toBeNull();
  expect(initial.onResult).not.toHaveBeenCalled();
  hook.unmount();
});

it.each([[], [8, 8, 8, 20]].map(breaks => ({ breaks })))("accepts authoritative empty or repeated-source-line results $breaks", async ({ breaks }) => {
  vi.mocked(invoke).mockResolvedValue(breaks);
  const hook = renderHook(() => useDocumentPagination(options()));
  await act(async () => { await vi.advanceTimersByTimeAsync(200); });
  expect(hook.result.current).toEqual(breaks);
  hook.unmount();
});

it("does not call native layout in the browser", async () => {
  delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
  const hook = renderHook(() => useDocumentPagination(options()));
  await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
  expect(invoke).not.toHaveBeenCalled();
  expect(hook.result.current).toBeNull();
  hook.unmount();
});
