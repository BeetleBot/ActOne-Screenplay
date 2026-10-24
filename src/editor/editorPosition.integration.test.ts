import { createElement, StrictMode, useRef } from "react";
import { act, render, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useCoreCodeMirror } from "./useCoreCodeMirror";
import { readEditorPosition } from "../utils/editorPosition";
import { flushPendingEditorEdits } from "./pendingEdits";

const app = vi.hoisted(() => ({
  text: "", fileId: "first-session", path: "C:/file1.actone", script: "files/test.md", index: 0,
  setRawText: vi.fn(), setEditorView: vi.fn(), setActiveLineNumber: vi.fn(),
}));
vi.mock("../context", () => ({
  useDocumentText: () => app.text,
  useFileActions: () => ({ setRawText: app.setRawText }),
  useWorkspaceMetadata: () => ({ activeScriptIndex: app.index, activeFileId: app.fileId, scriptFileName: app.script, filePath: app.path }),
  useParsedScreenplay: () => ({ screenplayText: app.text }),
  useUI: () => ({ typewriterMode: false, lineFocusEnabled: false, isZenMode: false, spellcheckEnabled: false }),
  useEditor: () => ({ setEditorView: app.setEditorView }),
  useCursor: () => ({ setActiveLineNumber: app.setActiveLineNumber }),
}));

// jsdom does not implement text geometry; these tests exercise state/lifecycle,
// not native WebView layout or font metrics.
Object.defineProperty(Range.prototype, "getClientRects", { configurable: true, value: () => [] });
Object.defineProperty(Range.prototype, "getBoundingClientRect", { configurable: true, value: () => new DOMRect() });

const areas: HTMLElement[] = [];
function mount() {
  const area = document.createElement("div");
  area.className = "editor-scroll-area";
  const container = document.createElement("div");
  area.appendChild(container);
  document.body.appendChild(area);
  areas.push(area);
  const containerRef = { current: container };
  return { area, ...renderHook(() => useCoreCodeMirror({ containerRef }), { wrapper: StrictMode }) };
}

beforeEach(() => {
  localStorage.clear();
  app.fileId = "first-session";
  app.path = "C:/file1.actone";
  app.index = 0;
  vi.clearAllMocks();
});
afterEach(() => { for (const area of areas.splice(0)) area.remove(); });

it.each(["md", "fountain"])("restores selection and scroll in a reopened %s document after another project", async extension => {
  app.script = `files/test.${extension}`;
  app.text = Array.from({ length: 90 }, (_, index) => extension === "md" ? `Prose line ${index + 1}` : `Action line ${index + 1}`).join("\n");
  const first = mount();
  const view = first.result.current.current!;
  const line40 = view.state.doc.line(40).from;
  act(() => { view.dispatch({ selection: { anchor: line40, head: line40 + 5 } }); });
  // Let initial layout restoration finish before simulating the user's scroll.
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 60)); });
  document.dispatchEvent(new Event("wheel"));
  first.area.scrollTop = 640;
  first.area.scrollLeft = 12;
  act(() => flushPendingEditorEdits(app.fileId));
  expect(readEditorPosition(app.path, app.script)?.head).toBe(line40 + 5);
  first.unmount();

  app.path = "C:/other.actone";
  app.fileId = "other-session";
  const other = mount();
  other.unmount();
  app.path = "C:/file1.actone";
  app.fileId = "new-session-id";
  const reopened = mount();
  expect(reopened.result.current.current!.state.selection.main.anchor).toBe(line40);
  expect(reopened.result.current.current!.state.selection.main.head).toBe(line40 + 5);
  await waitFor(() => expect(reopened.area.scrollTop).toBe(640));
  expect(reopened.area.scrollLeft).toBe(12);
  expect(app.setActiveLineNumber).toHaveBeenLastCalledWith(39);
  expect(app.setRawText).not.toHaveBeenCalled();
  reopened.unmount();
});

it("saves the outgoing document before switching, and restores independent positions", async () => {
  app.script = "files/first.fountain";
  app.text = "INT. ROOM - DAY\n\nSome action here.";
  const editor = mount();
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 60)); });
  act(() => editor.result.current.current!.dispatch({ selection: { anchor: 22 } }));
  document.dispatchEvent(new Event("wheel"));
  editor.area.scrollTop = 150;
  app.script = "files/second.fountain";
  app.index = 1;
  app.text = "EXT. PARK - DAY\n\nOther action.";
  editor.rerender();
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 60)); });
  act(() => editor.result.current.current!.dispatch({ selection: { anchor: 17 } }));
  document.dispatchEvent(new Event("wheel"));
  editor.area.scrollTop = 350;
  app.script = "files/first.fountain";
  app.index = 0;
  app.text = "INT. ROOM - DAY\n\nSome action here.";
  editor.rerender();
  expect(editor.result.current.current!.state.selection.main.head).toBe(22);
  await waitFor(() => expect(editor.area.scrollTop).toBe(150));
  expect(readEditorPosition(app.path, "files/second.fountain")?.head).toBe(17);
  editor.unmount();
});

it("clamps an old selection when the saved document has become shorter", () => {
  app.script = "files/shorter.md";
  app.text = "A long original document with a selection near the end.";
  const first = mount();
  act(() => first.result.current.current!.dispatch({ selection: { anchor: 30, head: 40 } }));
  first.unmount();
  app.text = "Short";
  app.fileId = "reopened-shorter";
  const reopened = mount();
  expect(reopened.result.current.current!.state.selection.main.anchor).toBe(5);
  expect(reopened.result.current.current!.state.selection.main.head).toBe(5);
  reopened.unmount();
});


it("restores both prose and screenplay positions when switching editor types inside one project", async () => {
  const documents = [
    { name: "files/test.md", text: "Prose document with its own position", cursor: 20, scroll: 250 },
    { name: "files/script.fountain", text: "INT. ROOM - DAY\n\nAction here.", cursor: 24, scroll: 600 },
  ];
  for (const doc of documents) {
    app.script = doc.name;
    app.text = doc.text;
    const editor = mount();
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 60)); });
    act(() => editor.result.current.current!.dispatch({ selection: { anchor: doc.cursor } }));
    document.dispatchEvent(new Event("wheel"));
    editor.area.scrollTop = doc.scroll;
    editor.unmount();
  }
  for (const doc of documents) {
    app.script = doc.name;
    app.text = doc.text;
    const editor = mount();
    expect(editor.result.current.current!.state.selection.main.head).toBe(doc.cursor);
    await waitFor(() => expect(editor.area.scrollTop).toBe(doc.scroll));
    editor.unmount();
  }
});


it.each(["md", "fountain"])("saves the %s viewport before React removes its scrollable content", async extension => {
  app.script = `files/remove.${extension}`;
  app.text = "A document being closed or replaced by another editor type.";
  function EditorFixture() {
    const containerRef = useRef<HTMLDivElement | null>(null);
    useCoreCodeMirror({ containerRef });
    return createElement("div", { className: "editor-scroll-area" }, createElement("div", { ref: containerRef }));
  }
  const editor = render(createElement(EditorFixture));
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 60)); });
  const area = editor.container.querySelector<HTMLElement>(".editor-scroll-area")!;
  let top = 640;
  // Real browsers clamp when removed content no longer supplies scroll height.
  Object.defineProperty(area, "scrollTop", {
    get: () => area.isConnected ? top : 0,
    set: (value: number) => { top = value; },
  });
  editor.unmount();
  expect(area.scrollTop).toBe(0);
  expect(readEditorPosition(app.path, app.script)?.scrollTop).toBe(640);
});
