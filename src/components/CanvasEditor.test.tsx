import { act, render, waitFor, fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPendingEditorEdits } from "../editor/pendingEdits";
import { optimizeProseImage } from "../utils/proseAssets";
import { CanvasEditor } from "./CanvasEditor";

const mock = vi.hoisted(() => ({
  addFiles: vi.fn(),
  sceneElements: [] as object[],
  apiReady: vi.fn(),
  serialize: vi.fn(),
  updateScene: vi.fn(),
  change: null as null | ((e: unknown[], s: object, f: object) => void),
  setText: vi.fn(),
  files: {},
  elements: [],
  state: {},
}));
vi.mock("../utils/proseAssets", () => ({ optimizeProseImage: vi.fn() }));
vi.mock("../context", () => ({
  useDocumentText: () => '{"type":"excalidraw","elements":[],"files":{}}',
  useWorkspaceMetadata: () => ({ activeFileId: "project", activeScriptIndex: 2, activeScriptName: "Ideas" }),
  useFileActions: () => ({ setRawText: mock.setText, saveFile: vi.fn(), importScript: vi.fn() }),
}));
vi.mock("@excalidraw/excalidraw", async () => {
  const React = await import("react");
  const Empty = () => null;
  return {
    Excalidraw: ({
      onChange,
      excalidrawAPI,
    }: {
      onChange: typeof mock.change;
      excalidrawAPI: (api: { updateScene: typeof mock.updateScene }) => void;
    }) => {
      mock.change = onChange;
      React.useEffect(() => {
        onChange?.(mock.elements, mock.state, mock.files);
      }, [onChange]);
      React.useEffect(() => {
        excalidrawAPI({
          updateScene: mock.updateScene,
          addFiles: mock.addFiles,
          getSceneElements: () => mock.sceneElements,
        } as Parameters<typeof excalidrawAPI>[0]);
        mock.apiReady();
      }, [excalidrawAPI]);
      return <div data-testid="canvas-ready" />;
    },
    MainMenu: Object.assign(Empty, { Item: Empty, DefaultItems: { SaveAsImage: Empty, ClearCanvas: Empty } }),
    WelcomeScreen: Object.assign(Empty, { Center: Object.assign(Empty, { Heading: Empty }) }),
    loadFromBlob: async () => ({ elements: [], appState: {}, files: {} }),
    CaptureUpdateAction: { NEVER: "NEVER" },
    newElementWith: (element: object, changes: object) => ({ ...element, ...changes }),
    getSceneVersion: (elements: unknown[]) => elements.length,
    serializeAsJSON: (elements: unknown[], state: object, files: object) => {
      mock.serialize();
      return JSON.stringify({ elements, appState: state, files });
    },
  };
});
describe("Canvas save bridge", () => {
  it("shows an embedded logo while drawing data is loading", async () => {
    const view = render(<CanvasEditor />);
    expect(view.getByRole("status", { name: "Loading canvas" })).toHaveClass(
      "actone-window-loading-embedded",
      "actone-document-loading",
    );
    await waitFor(() => expect(view.getByTestId("canvas-ready")).toBeTruthy());
    expect(view.queryByRole("status", { name: "Loading canvas" })).toBeNull();
    view.unmount();
  });
  it("opens the image export dialog through the application shortcut route", async () => {
    const view = render(<CanvasEditor />);
    await waitFor(() => expect(view.getByTestId("canvas-ready")).toBeTruthy());
    await waitFor(() => expect(mock.apiReady).toHaveBeenCalled());
    act(() => {
      window.dispatchEvent(new Event("actone:canvas-export-image"));
    });
    expect(mock.updateScene).toHaveBeenCalledWith({ appState: { openDialog: { name: "imageExport" } } });
    view.unmount();
  });
  beforeEach(() => {
    mock.setText.mockClear();
    mock.serialize.mockClear();
    mock.apiReady.mockClear();
    mock.updateScene.mockClear();
  });
  it("skips serialization on initial load and repeated unchanged flushes", async () => {
    const view = render(<CanvasEditor />);
    await waitFor(() => expect(view.getByTestId("canvas-ready")).toBeTruthy());
    act(() => flushPendingEditorEdits("project"));
    expect(mock.serialize).not.toHaveBeenCalled();
    act(() => {
      mock.change?.([{ id: "shape" }], {}, mock.files);
      flushPendingEditorEdits("project");
      flushPendingEditorEdits("project");
    });
    expect(mock.serialize).toHaveBeenCalledTimes(1);
    view.unmount();
    expect(mock.serialize).toHaveBeenCalledTimes(1);
  });
  it("keeps dragging updates local until a save flush, including images", async () => {
    const view = render(<CanvasEditor />);
    await waitFor(() => expect(view.getByTestId("canvas-ready")).toBeTruthy());
    act(() => {
      mock.change?.([{ id: "shape" }], {}, { image: { dataURL: "data:image/png;base64,AQID" } });
    });
    expect(mock.setText).not.toHaveBeenCalled();
    act(() => flushPendingEditorEdits("project"));
    expect(mock.setText).toHaveBeenCalledWith(expect.stringContaining("data:image/png;base64,AQID"), {
      fileId: "project",
      scriptIndex: 2,
    });
    view.unmount();
  });
  it("does not dirty the project when only selection changes", async () => {
    const view = render(<CanvasEditor />);
    await waitFor(() => expect(view.getByTestId("canvas-ready")).toBeTruthy());
    act(() => {
      mock.change?.(mock.elements, { selectedElementIds: { x: true } }, mock.files);
      flushPendingEditorEdits("project");
    });
    expect(mock.setText).not.toHaveBeenCalled();
    view.unmount();
  });
  it.each(["viewBackgroundColor", "gridSize", "gridStep", "gridModeEnabled"])(
    "saves changes to %s even when drawing elements are unchanged",
    async (field) => {
      const view = render(<CanvasEditor />);
      await waitFor(() => expect(view.getByTestId("canvas-ready")).toBeTruthy());
      const state = { [field]: field === "viewBackgroundColor" ? "#123456" : field === "gridModeEnabled" ? true : 40 };
      act(() => {
        mock.change?.(mock.elements, state, mock.files);
        flushPendingEditorEdits("project");
      });
      expect(mock.serialize).toHaveBeenCalledTimes(1);
      expect(JSON.parse(mock.setText.mock.calls[0][0]).appState).toEqual(state);
      view.unmount();
    },
  );
});

describe("Canvas image optimization", () => {
  const original = "data:image/png;base64," + "YQ==".repeat(100);
  const optimized = "data:image/webp;base64,YQ==";
  const image = {
    type: "image",
    id: "element1",
    fileId: "file1",
    x: 30,
    y: 50,
    width: 200,
    height: 100,
    isDeleted: false,
  };
  const files = { file1: { id: "file1", mimeType: "image/png", dataURL: original, created: 1 } };
  async function importImage() {
    const view = render(<CanvasEditor />);
    await waitFor(() => expect(view.getByTestId("canvas-ready")).toBeTruthy());
    mock.sceneElements = [image];
    act(() => mock.change?.([image], {}, files));
    return view;
  }
  beforeEach(() => {
    mock.addFiles.mockClear();
    mock.sceneElements = [];
    vi.mocked(optimizeProseImage).mockReset();
  });
  it("offers original quality without changing image bytes", async () => {
    const view = await importImage();
    expect(screen.getByRole("button", { name: "Keep original" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Keep original" }));
    expect(mock.addFiles).not.toHaveBeenCalled();
    act(() => flushPendingEditorEdits("project"));
    expect(mock.setText).toHaveBeenCalledWith(expect.stringContaining(original), expect.anything());
    view.unmount();
  });
  it("previews optimization and applies a separate optimized file without recording an undo step", async () => {
    vi.mocked(optimizeProseImage).mockResolvedValue(optimized);
    const view = await importImage();
    fireEvent.click(screen.getByRole("button", { name: "Optimize image" }));
    await screen.findByRole("button", { name: "Use optimized" });
    expect(mock.addFiles).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Use optimized" }));
    const file = mock.addFiles.mock.calls[0][0][0];
    expect(file.id).not.toBe("file1");
    expect(file.dataURL).toBe(optimized);
    expect(file.mimeType).toBe("image/webp");
    expect(mock.updateScene).toHaveBeenCalledWith({
      elements: [{ ...image, fileId: file.id }],
      captureUpdate: "NEVER",
    });
    expect(files.file1.dataURL).toBe(original);
    mock.updateScene.mockClear();
    act(() => mock.change?.([image], {}, { ...files, [file.id]: file }));
    expect(mock.updateScene).toHaveBeenCalledWith({
      elements: [{ ...image, fileId: file.id }],
      captureUpdate: "NEVER",
    });

    view.unmount();
  });
  it("does not re-prompt for the same image when dragging or undoing", async () => {
    const view = await importImage();
    fireEvent.click(screen.getByRole("button", { name: "Keep original" }));
    act(() => mock.change?.([{ ...image, x: 300 }], {}, files));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Keep original" })).toBeNull());
    view.unmount();
  });
  it("keeps the original available when optimization fails", async () => {
    vi.mocked(optimizeProseImage).mockRejectedValue(new Error("decode failed"));
    const view = await importImage();
    fireEvent.click(screen.getByRole("button", { name: "Optimize image" }));
    expect(await screen.findByText("Could not optimize this image. You can keep the original.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Keep original" }));
    expect(mock.addFiles).not.toHaveBeenCalled();
    view.unmount();
  });
  it("does not create a replacement if optimization cannot reduce size", async () => {
    vi.mocked(optimizeProseImage).mockResolvedValue(original);
    const view = await importImage();
    fireEvent.click(screen.getByRole("button", { name: "Optimize image" }));
    fireEvent.click(await screen.findByRole("button", { name: "Use optimized" }));
    expect(mock.addFiles).not.toHaveBeenCalled();
    view.unmount();
  });
});
