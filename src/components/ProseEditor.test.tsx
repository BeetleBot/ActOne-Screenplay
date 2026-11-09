import { history, undo, redo } from "@codemirror/commands";
import * as proseAssets from "../utils/proseAssets";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { ProseEditor } from "./ProseEditor";
const mocks = vi.hoisted(() => ({
  nativeDrop: null as
    | ((event: { payload: { type: string; paths: string[]; position: { x: number; y: number } } }) => void)
    | null,
  invoke: vi.fn(),
  viewRef: { current: null as EditorView | null },
  token: 0,
  settings: {} as Record<string, unknown>,
}));
vi.mock("@tauri-apps/api/core", () => ({ invoke: mocks.invoke }));
vi.mock("@tauri-apps/api/webview", () => ({
  getCurrentWebview: () => ({
    onDragDropEvent: async (callback: typeof mocks.nativeDrop) => {
      mocks.nativeDrop = callback;
      return () => {
        mocks.nativeDrop = null;
      };
    },
  }),
}));
vi.mock("../editor/useProseCodeMirror", () => ({ useProseCodeMirror: () => mocks.viewRef }));
vi.mock("../editor/useCoreCodeMirror", () => ({ getScriptSwitchToken: () => mocks.token }));
vi.mock("../context", () => ({
  useUI: () => ({ setActiveRightPane: vi.fn(), setActiveTab: vi.fn() }),
  useParsedScreenplay: () => ({ settings: mocks.settings }),
  useDocumentText: () => "Writing",
  useFileActions: () => ({
    updateSettings: (updater: (settings: Record<string, unknown>) => Record<string, unknown>) => {
      mocks.settings = updater(mocks.settings);
    },
  }),
}));
vi.mock("../hooks/usePromptConfig", () => ({
  usePromptConfig: () => ({ rephrasePresets: [], translateLanguages: [] }),
}));
vi.mock("./ai/UrAITransform", () => ({ useUrAITransform: () => ({ dialog: null }) }));
vi.mock("./editor/CoreEditor", () => ({
  CoreEditor: ({
    containerRef,
    extraContextMenuItems,
  }: {
    containerRef: React.RefObject<HTMLDivElement>;
    extraContextMenuItems: (a: null, b: boolean, c: () => void) => { label: string; action: () => void }[];
  }) => (
    <div ref={containerRef}>
      {extraContextMenuItems(null, false, () => {}).map((item) => (
        <button key={item.label} onClick={item.action}>
          {item.label}
        </button>
      ))}
    </div>
  ),
}));
function imageFile() {
  const bytes = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const file = new File([bytes], "Reference.png", { type: "image/png" });
  Object.defineProperty(file, "arrayBuffer", { value: async () => bytes.buffer });
  return file;
}
beforeEach(() => {
  mocks.token = 0;
  mocks.settings = {};
  mocks.viewRef.current = new EditorView({ state: EditorState.create({ doc: "Writing", extensions: [history()] }) });
  vi.spyOn(globalThis, "Image").mockImplementation(function () {
    return { decode: async () => {}, naturalWidth: 80, naturalHeight: 40 };
  } as unknown as typeof Image);
});
afterEach(() => {
  cleanup();
  mocks.viewRef.current?.destroy();
  vi.restoreAllMocks();
  Reflect.deleteProperty(window, "__TAURI_INTERNALS__");
  Reflect.deleteProperty(document, "elementFromPoint");
  Reflect.deleteProperty(File.prototype, "arrayBuffer");
});
describe("prose insertion controls", () => {
  it("previews the imported image and keeps original quality by default", async () => {
    render(<ProseEditor />);
    fireEvent.change(screen.getByLabelText("Import prose image"), { target: { files: [imageFile()] } });
    expect(await screen.findByText("Keep original")).toBeTruthy();
    expect(mocks.viewRef.current!.state.doc.toString()).toBe("Writing");
    fireEvent.click(screen.getByText("Keep original"));
    expect(mocks.viewRef.current!.state.doc.toString()).toContain("![image1](image1)");
    expect((mocks.settings.proseImages as Record<string, string>).image1).toContain("data:image/png;base64,");
    expect(mocks.viewRef.current!.state.doc.toString()).not.toContain("base64");
  });
  it("undo and redo keep only the accepted optimized image", async () => {
    const optimized = "data:image/webp;base64,YQ==";
    vi.spyOn(proseAssets, "optimizeProseImage").mockResolvedValue(optimized);
    render(<ProseEditor />);
    fireEvent.change(screen.getByLabelText("Import prose image"), { target: { files: [imageFile()] } });
    fireEvent.click(await screen.findByRole("button", { name: "Optimize image" }));
    fireEvent.click(await screen.findByRole("button", { name: "Insert optimized" }));
    expect(mocks.settings.proseImages).toEqual({ image1: optimized });
    expect(undo(mocks.viewRef.current!)).toBe(true);
    expect(mocks.viewRef.current!.state.doc.toString()).toBe("Writing");
    expect(redo(mocks.viewRef.current!)).toBe(true);
    expect(mocks.viewRef.current!.state.doc.toString()).toContain("![image1](image1)");
    expect(mocks.settings.proseImages).toEqual({ image1: optimized });
  });
  it("cancels without changing the document", async () => {
    render(<ProseEditor />);
    fireEvent.change(screen.getByLabelText("Import prose image"), { target: { files: [imageFile()] } });
    await screen.findByText("Keep original");
    fireEvent.click(screen.getByText("Cancel"));
    expect(mocks.viewRef.current!.state.doc.toString()).toBe("Writing");
  });
  it("refuses insertion into a switched document", async () => {
    render(<ProseEditor />);
    fireEvent.change(screen.getByLabelText("Import prose image"), { target: { files: [imageFile()] } });
    await screen.findByText("Keep original");
    mocks.token++;
    fireEvent.click(screen.getByText("Keep original"));
    expect(mocks.viewRef.current!.state.doc.toString()).toBe("Writing");
    expect(await screen.findByText("The document changed. Please insert the image again.")).toBeTruthy();
  });
  it("inserts a table using the chosen dimensions", async () => {
    render(<ProseEditor />);
    fireEvent.click(screen.getByText("Insert Table"));
    fireEvent.change(screen.getByLabelText("Body rows"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Columns"), { target: { value: "4" } });
    fireEvent.click(screen.getByText("Insert table", { selector: "button" }));
    await waitFor(() => expect(mocks.viewRef.current!.state.doc.toString()).toContain("Column 4"));
    expect(
      mocks.viewRef
        .current!.state.doc.toString()
        .split("\n")
        .filter((line) => line.startsWith("|")),
    ).toHaveLength(4);
  });
  it("imports a pasted image through the same preview", async () => {
    render(<ProseEditor />);
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", { value: { files: [imageFile()] } });
    fireEvent(screen.getByText("Insert Table"), event);
    expect(event.defaultPrevented).toBe(true);
    expect(await screen.findByText("Keep original")).toBeTruthy();
  });
  it("imports a desktop image drop inside the prose editor", async () => {
    Object.defineProperty(window, "__TAURI_INTERNALS__", { value: {}, configurable: true });
    render(<ProseEditor />);
    const target = screen.getByText("Insert Table");
    Object.defineProperty(document, "elementFromPoint", { value: () => target, configurable: true });
    Object.defineProperty(File.prototype, "arrayBuffer", {
      value: async () => Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]).buffer,
      configurable: true,
    });
    vi.spyOn(mocks.viewRef.current!, "posAtCoords").mockReturnValue(0);
    mocks.invoke.mockResolvedValue([137, 80, 78, 71, 13, 10, 26, 10]);
    await waitFor(() => expect(mocks.nativeDrop).toBeTruthy());
    mocks.nativeDrop!({
      payload: { type: "drop", paths: ["C:\\Pictures\\Reference.png"], position: { x: 50, y: 50 } },
    });
    expect(await screen.findByText("Keep original")).toBeTruthy();
    expect(mocks.invoke).toHaveBeenCalledWith("read_file_binary", { path: "C:\\Pictures\\Reference.png" });
  });
  it("rejects unsupported images with a useful message", async () => {
    render(<ProseEditor />);
    fireEvent.change(screen.getByLabelText("Import prose image"), {
      target: { files: [new File(["x"], "x.svg", { type: "image/svg+xml" })] },
    });
    expect(await screen.findByText("Choose a PNG, JPEG or WebP image.")).toBeTruthy();
    expect(mocks.viewRef.current!.state.doc.toString()).toBe("Writing");
  });

  it("does not overwrite text edited while the image preview is open", async () => {
    render(<ProseEditor />);
    fireEvent.change(screen.getByLabelText("Import prose image"), { target: { files: [imageFile()] } });
    await screen.findByText("Keep original");
    mocks.viewRef.current!.dispatch({ changes: { from: 7, insert: " changed" } });
    fireEvent.click(screen.getByText("Keep original"));
    expect(await screen.findByText("The document changed. Please insert the image again.")).toBeTruthy();
    expect(mocks.viewRef.current!.state.doc.toString()).toBe("Writing changed");
    expect(mocks.settings).toEqual({});
  });

  it("rejects images above the decoded pixel limit without inserting or saving assets", async () => {
    vi.mocked(globalThis.Image).mockImplementation(function () {
      return { decode: async () => {}, naturalWidth: 10000, naturalHeight: 10000 };
    } as unknown as typeof Image);
    render(<ProseEditor />);
    fireEvent.change(screen.getByLabelText("Import prose image"), { target: { files: [imageFile()] } });
    expect(await screen.findByText("Choose an image with fewer than 40 million pixels.")).toBeTruthy();
    expect(screen.queryByText("Keep original")).toBeNull();
    expect(mocks.viewRef.current!.state.doc.toString()).toBe("Writing");
    expect(mocks.settings).toEqual({});
  });

  it("ignores pasted images in a read-only document", async () => {
    mocks.viewRef.current!.setState(
      EditorState.create({ doc: "Protected", extensions: [EditorState.readOnly.of(true)] }),
    );
    render(<ProseEditor />);
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", { value: { files: [imageFile()] } });
    fireEvent(screen.getByText("Insert Table"), event);
    await waitFor(() => expect(mocks.viewRef.current!.state.doc.toString()).toBe("Protected"));
    expect(globalThis.Image).not.toHaveBeenCalled();
    expect(screen.queryByText("Keep original")).toBeNull();
    expect(mocks.settings).toEqual({});
  });
});
