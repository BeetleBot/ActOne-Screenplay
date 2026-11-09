import { StrictMode } from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { syntaxTree } from "@codemirror/language";
import { undo, redo } from "@codemirror/commands";
import { useProseCodeMirror } from "./useProseCodeMirror";
import { proseImagesField } from "./markdown/prose-media";
import { flushPendingEditorEdits, readLiveEditorText } from "./pendingEdits";
import { packActoneBundle, unpackActoneBundle } from "../utils/actone";
import type { ProseImageRegistry } from "../utils/proseAssets";

const app = vi.hoisted(() => ({
  text: "",
  fileId: "prose-project",
  script: "files/notes.md",
  index: 0,
  setRawText: vi.fn(),
  setEditorView: vi.fn(),
  setActiveLineNumber: vi.fn(),
}));
vi.mock("../context", () => ({
  useDocumentText: () => app.text,
  useFileActions: () => ({ setRawText: app.setRawText }),
  useWorkspaceMetadata: () => ({
    activeFileId: app.fileId,
    activeScriptIndex: app.index,
    scriptFileName: app.script,
    filePath: "",
  }),
  useParsedScreenplay: () => ({ screenplayText: app.text }),
  useUI: () => ({ typewriterMode: false, spellcheckEnabled: false, lineFocusEnabled: false, isZenMode: false }),
  useEditor: () => ({ setEditorView: app.setEditorView }),
  useCursor: () => ({ setActiveLineNumber: app.setActiveLineNumber }),
}));

let host: HTMLDivElement;
const rangeRects = Object.getOwnPropertyDescriptor(Range.prototype, "getClientRects");
const rangeBounds = Object.getOwnPropertyDescriptor(Range.prototype, "getBoundingClientRect");
function mount(images: ProseImageRegistry = {}) {
  const containerRef = { current: host };
  return renderHook(({ images }) => useProseCodeMirror({ containerRef, images }), {
    initialProps: { images },
    wrapper: StrictMode,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  app.text = "# Notes\n\n| Name | Role |\n| --- | --- |\n| Mira | Writer |\n\n![image1](image1)";
  app.script = "files/notes.md";
  app.index = 0;
  host = document.createElement("div");
  document.body.append(host);
  // jsdom has no text layout. Keep the real editor, parser and extensions.
  Object.defineProperty(Range.prototype, "getClientRects", { configurable: true, value: () => [] });
  Object.defineProperty(Range.prototype, "getBoundingClientRect", { configurable: true, value: () => new DOMRect() });
});
afterEach(() => {
  cleanup();
  host.remove();
  vi.restoreAllMocks();
  if (rangeRects) Object.defineProperty(Range.prototype, "getClientRects", rangeRects);
  else Reflect.deleteProperty(Range.prototype, "getClientRects");
  if (rangeBounds) Object.defineProperty(Range.prototype, "getBoundingClientRect", rangeBounds);
  else Reflect.deleteProperty(Range.prototype, "getBoundingClientRect");
});

describe("real prose editor integration", () => {
  it("installs Markdown parsing, editable tables and registry-backed images together", () => {
    const images = { image1: "data:image/png;base64,YQ==" };
    const editor = mount(images);
    const view = editor.result.current.current!;
    const nodes: string[] = [];
    syntaxTree(view.state).iterate({
      enter: (node) => {
        nodes.push(node.name);
      },
    });
    expect(nodes).toContain("ATXHeading1");
    expect(nodes).toContain("Table");
    expect(view.dom.querySelectorAll("textarea")).toHaveLength(4);
    expect(view.dom.querySelector("img")?.getAttribute("src")).toBe(images.image1);
    expect(view.state.field(proseImagesField)).toEqual(images);
  });

  it("flushes a live table edit for saving before blur and preserves undo/redo", () => {
    const editor = mount();
    const view = editor.result.current.current!;
    const cell = view.dom.querySelectorAll("textarea")[2];
    act(() => {
      cell.value = "தமிழ் writer";
      cell.dispatchEvent(new InputEvent("input", { bubbles: true }));
      flushPendingEditorEdits(app.fileId);
    });
    expect(app.setRawText).toHaveBeenLastCalledWith(view.state.doc.toString(), {
      fileId: app.fileId,
      scriptIndex: 0,
      scriptFileName: "files/notes.md",
    });
    expect(readLiveEditorText(app.fileId, app.script)).toContain("தமிழ் writer");
    act(() => {
      expect(undo(view)).toBe(true);
    });
    expect(view.state.doc.toString()).toBe(app.text);
    act(() => {
      expect(redo(view)).toBe(true);
    });
    expect(view.state.doc.toString()).toContain("தமிழ் writer");
  });

  it("keeps tables and images after packing and reopening a project with a fresh editor", () => {
    const images = { image1: "data:image/png;base64,iVBORw==" };
    const editor = mount(images);
    const view = editor.result.current.current!;
    act(() => view.dispatch({ changes: { from: view.state.doc.length, insert: "\n\nSaved ending." } }));
    const content = view.state.doc.toString();
    const bundle = unpackActoneBundle(
      packActoneBundle(
        [
          {
            name: "Notes",
            fileName: app.script,
            type: "markdown",
            content,
            savedContent: "",
          },
        ],
        { proseImages: images },
      ),
    );
    editor.unmount();
    app.text = bundle.scripts[0].content;
    const reopened = mount(bundle.settings.proseImages as ProseImageRegistry);
    expect(reopened.result.current.current!.state.doc.toString()).toBe(content);
    expect(reopened.result.current.current!.dom.querySelectorAll("textarea")).toHaveLength(4);
    expect(reopened.result.current.current!.dom.querySelector("img")?.getAttribute("src")).toBe(images.image1);
    act(() => {
      expect(undo(reopened.result.current.current!)).toBe(false);
    });
  });

  it("updates the image registry without replacing text or clearing undo history", () => {
    const editor = mount({ image1: "data:image/png;base64,YQ==" });
    const view = editor.result.current.current!;
    act(() => view.dispatch({ changes: { from: view.state.doc.length, insert: "\n\nEdited" } }));
    editor.rerender({ images: { image1: "data:image/png;base64,Yg==" } });
    expect(editor.result.current.current).toBe(view);
    expect(view.dom.querySelector("img")?.getAttribute("src")).toBe("data:image/png;base64,Yg==");
    expect(view.state.doc.toString()).toContain("Edited");
    act(() => {
      expect(undo(view)).toBe(true);
    });
    expect(view.state.doc.toString()).toBe(app.text);
  });

  it("flushes outgoing edits to their original document and clears images on switching", () => {
    const editor = mount({ image1: "data:image/png;base64,YQ==" });
    act(() =>
      editor.result.current.current!.dispatch({ changes: { from: app.text.length, insert: "\nPending edit" } }),
    );
    app.script = "files/other.md";
    app.index = 1;
    app.text = "# Other document\n\nNo pictures.";
    editor.rerender({ images: {} });
    expect(app.setRawText).toHaveBeenCalledWith(expect.stringContaining("Pending edit"), {
      fileId: app.fileId,
      scriptIndex: 0,
      scriptFileName: "files/notes.md",
    });
    const switched = editor.result.current.current!;
    expect(switched.state.doc.toString()).toBe(app.text);
    expect(switched.state.field(proseImagesField)).toEqual({});
    expect(switched.dom.querySelector("img")).toBeNull();
    act(() => {
      expect(undo(switched)).toBe(false);
    });
  });

  it("flushes pending text and unregisters the live editor on unmount", () => {
    const editor = mount();
    act(() => editor.result.current.current!.dispatch({ changes: { from: app.text.length, insert: "\nLast edit" } }));
    editor.unmount();
    expect(app.setRawText).toHaveBeenLastCalledWith(expect.stringContaining("Last edit"), {
      fileId: app.fileId,
      scriptIndex: 0,
      scriptFileName: app.script,
    });
    expect(readLiveEditorText(app.fileId, app.script)).toBeUndefined();
    app.setRawText.mockClear();
    flushPendingEditorEdits(app.fileId);
    expect(app.setRawText).not.toHaveBeenCalled();
  });
});
