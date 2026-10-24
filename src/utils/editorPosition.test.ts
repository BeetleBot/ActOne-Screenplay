import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { readEditorPosition, rememberActiveDocument, rememberedDocumentIndex, trackEditorPosition } from "./editorPosition";

beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

function editor(path: string | null, name = "files/test.md") {
  const area = document.createElement("div");
  const view = new EditorView({ state: EditorState.create({ doc: "A document with enough text" }), parent: area });
  const session = trackEditorPosition(view, area, path, name);
  return { area, view, session, close: () => { session.destroy(); view.destroy(); } };
}

describe("local editor memory", () => {
  it("keeps independent positions after closing and working on other projects and documents", () => {
    const first = editor("C:/projects/file1.actone");
    first.view.dispatch({ selection: { anchor: 5, head: 12 } });
    first.area.scrollTop = 430;
    first.area.scrollLeft = 20;
    first.close();
    const second = editor("C:/projects/file2.actone");
    second.area.scrollTop = 900;
    second.close();
    const third = editor("C:/projects/file1.actone", "files/script.fountain");
    third.area.scrollTop = 75;
    third.close();
    expect(readEditorPosition("C:\\projects\\FILE1.actone", "files/test.md"))
      .toEqual({ anchor: 5, head: 12, scrollTop: 430, scrollLeft: 20 });
    expect(readEditorPosition("C:/projects/file1.actone", "files/script.fountain")?.scrollTop).toBe(75);
  });

  it("throttles scrolling writes and flushes the latest state on page hide", () => {
    const item = editor("/projects/file1.actone");
    item.area.scrollTop = 200;
    item.area.dispatchEvent(new Event("scroll"));
    expect(readEditorPosition("/projects/file1.actone", "files/test.md")).toBeNull();
    vi.advanceTimersByTime(200);
    expect(readEditorPosition("/projects/file1.actone", "files/test.md")?.scrollTop).toBe(200);
    item.view.dispatch({ selection: { anchor: 15 } });
    window.dispatchEvent(new Event("pagehide"));
    expect(readEditorPosition("/projects/file1.actone", "files/test.md")?.head).toBe(15);
    item.close();
  });

  it("does not let an old session overwrite another document after switching", () => {
    const item = editor("/projects/file1.actone");
    item.view.dispatch({ selection: { anchor: 8 } });
    item.session.schedule();
    item.session.destroy();
    item.view.setState(EditorState.create({ doc: "Different document" }));
    vi.runOnlyPendingTimers();
    window.dispatchEvent(new Event("beforeunload"));
    expect(readEditorPosition("/projects/file1.actone", "files/test.md")?.head).toBe(8);
    item.view.destroy();
  });

  it("remembers a document by name across reordering, and falls back if it was removed", () => {
    rememberActiveDocument("/file1.actone", "test.md");
    rememberActiveDocument("/file2.actone", "script.fountain");
    expect(rememberedDocumentIndex("/file1.actone", [{ fileName: "script.fountain" }, { fileName: "test.md" }])).toBe(1);
    expect(rememberedDocumentIndex("/file1.actone", [{ fileName: "test.md" }, { fileName: "script.fountain" }])).toBe(0);
    expect(rememberedDocumentIndex("/file1.actone", [{ fileName: "remaining.md" }])).toBe(0);
    expect(rememberedDocumentIndex("/File1.actone", [{ fileName: "script.fountain" }, { fileName: "test.md" }])).toBe(0);
  });

  it("ignores unavailable or corrupt storage and unsaved documents", () => {
    const item = editor(null);
    item.close();
    expect(readEditorPosition(null, "files/test.md")).toBeNull();
    vi.spyOn(localStorage, "getItem").mockReturnValue('{"anchor":-1,"head":3,"scrollTop":0,"scrollLeft":0}');
    expect(readEditorPosition("/file.actone", "files/test.md")).toBeNull();
    vi.mocked(localStorage.getItem).mockImplementation(() => { throw new Error("unavailable"); });
    expect(readEditorPosition("/file.actone", "files/test.md")).toBeNull();
    expect(rememberedDocumentIndex("/file.actone", [])).toBe(0);
    vi.spyOn(localStorage, "setItem").mockImplementation(() => { throw new Error("full"); });
    expect(() => rememberActiveDocument("/file.actone", "test.md")).not.toThrow();
  });
});


it("preserves saved scroll offsets when closed before initial layout completes", () => {
  const area = document.createElement("div");
  const view = new EditorView({ state: EditorState.create({ doc: "Text", selection: { anchor: 3 } }), parent: area });
  const session = trackEditorPosition(view, area, "/early-close.actone", "script.fountain", { scrollTop: 2400, scrollLeft: 10 });
  session.destroy();
  expect(readEditorPosition("/early-close.actone", "script.fountain"))
    .toEqual({ anchor: 3, head: 3, scrollTop: 2400, scrollLeft: 10 });
  view.destroy();
});


function delayedLayoutEditor() {
  const area = document.createElement("div");
  let contentHeight = 100;
  let top = 0;
  Object.defineProperty(area, "scrollTop", {
    get: () => top,
    set: (value: number) => { top = Math.max(0, Math.min(value, contentHeight - 100)); },
  });
  // Model real browser clamping, with CodeMirror's measurement write phase.
  const view = {
    state: EditorState.create({ doc: "Document", selection: { anchor: 4 } }),
    dom: document.createElement("div"),
    requestMeasure: (request: { read: () => unknown; write: (value: unknown) => void }) => request.write(request.read()),
  } as unknown as EditorView;
  return { area, view, grow: () => { contentHeight = 3000; } };
}

it("retries a clamped viewport after delayed layout and resists later automatic scroll resets", () => {
  const { area, view, grow } = delayedLayoutEditor();
  const session = trackEditorPosition(view, area, "/delayed.actone", "script.fountain", { scrollTop: 900, scrollLeft: 15 });
  vi.advanceTimersByTime(400);
  expect(area.scrollTop).toBe(0); // document is still too short to scroll
  session.flush();
  expect(readEditorPosition("/delayed.actone", "script.fountain")?.scrollTop).toBe(900);
  grow();
  vi.advanceTimersByTime(40);
  expect(area.scrollTop).toBe(900);
  area.scrollTop = 0; // late focus/layout scroll from the editor
  vi.advanceTimersByTime(40);
  expect(area.scrollTop).toBe(900);
  expect(area.scrollLeft).toBe(15);
  session.destroy();
});

it.each(["wheel", "pointerdown", "touchstart", "keydown"])("stops viewport restoration immediately on %s navigation", event => {
  const { area, view, grow } = delayedLayoutEditor();
  grow();
  const session = trackEditorPosition(view, area, "/navigation.actone", "test.md", { scrollTop: 900, scrollLeft: 0 });
  vi.advanceTimersByTime(40);
  expect(area.scrollTop).toBe(900);
  document.dispatchEvent(new Event(event));
  area.scrollTop = 250;
  vi.advanceTimersByTime(1700);
  expect(area.scrollTop).toBe(250);
  session.flush();
  expect(readEditorPosition("/navigation.actone", "test.md")?.scrollTop).toBe(250);
  expect(session.isRestoring()).toBe(false);
  session.destroy();
});

it("cancels outgoing viewport restoration when switching documents", () => {
  const { area, view, grow } = delayedLayoutEditor();
  grow();
  const outgoing = trackEditorPosition(view, area, "/switch.actone", "first.md", { scrollTop: 900, scrollLeft: 0 });
  vi.advanceTimersByTime(40);
  outgoing.destroy();
  const incoming = trackEditorPosition(view, area, "/switch.actone", "second.md", { scrollTop: 1800, scrollLeft: 0 });
  vi.advanceTimersByTime(200);
  expect(area.scrollTop).toBe(1800);
  incoming.destroy();
});
