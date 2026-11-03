import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPendingEditorEdits } from "../editor/pendingEdits";
import { CanvasEditor } from "./CanvasEditor";

const mock = vi.hoisted(() => ({ apiReady: vi.fn(), serialize: vi.fn(), updateScene: vi.fn(), change: null as null | ((e: unknown[], s: object, f: object) => void), setText: vi.fn(), files: {}, elements: [], state: {} }));
vi.mock("../context", () => ({
  useDocumentText: () => '{"type":"excalidraw","elements":[],"files":{}}',
  useWorkspaceMetadata: () => ({ activeFileId: "project", activeScriptIndex: 2, activeScriptName: "Ideas" }),
  useFileActions: () => ({ setRawText: mock.setText, saveFile: vi.fn(), importScript: vi.fn() }),
}));
vi.mock("@excalidraw/excalidraw", async () => {
  const React = await import("react");
  const Empty = () => null;
  return {
    Excalidraw: ({ onChange, excalidrawAPI }: { onChange: typeof mock.change; excalidrawAPI: (api: { updateScene: typeof mock.updateScene }) => void }) => {
      mock.change = onChange;
      React.useEffect(() => { onChange?.(mock.elements, mock.state, mock.files); }, [onChange]);
      React.useEffect(() => { excalidrawAPI({ updateScene: mock.updateScene }); mock.apiReady(); }, [excalidrawAPI]);
      return <div data-testid="canvas-ready" />;
    },
    MainMenu: Object.assign(Empty, { Item: Empty, DefaultItems: { SaveAsImage: Empty, ClearCanvas: Empty } }),
    WelcomeScreen: Object.assign(Empty, { Center: Object.assign(Empty, { Heading: Empty }) }),
    loadFromBlob: async () => ({ elements: [], appState: {}, files: {} }),
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
    expect(view.getByRole("status", { name: "Loading canvas" })).toHaveClass("actone-window-loading-embedded", "actone-document-loading");
    await waitFor(() => expect(view.getByTestId("canvas-ready")).toBeTruthy());
    expect(view.queryByRole("status", { name: "Loading canvas" })).toBeNull();
    view.unmount();
  });
  it("opens the image export dialog through the application shortcut route", async () => {
    const view = render(<CanvasEditor />);
    await waitFor(() => expect(view.getByTestId("canvas-ready")).toBeTruthy());
    await waitFor(() => expect(mock.apiReady).toHaveBeenCalled());
    act(() => { window.dispatchEvent(new Event("actone:canvas-export-image")); });
    expect(mock.updateScene).toHaveBeenCalledWith({ appState: { openDialog: { name: "imageExport" } } });
    view.unmount();
  });
  beforeEach(() => { mock.setText.mockClear(); mock.serialize.mockClear(); mock.apiReady.mockClear(); mock.updateScene.mockClear(); });
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
    act(() => { mock.change?.([{ id: "shape" }], {}, { image: { dataURL: "data:image/png;base64,AQID" } }); });
    expect(mock.setText).not.toHaveBeenCalled();
    act(() => flushPendingEditorEdits("project"));
    expect(mock.setText).toHaveBeenCalledWith(expect.stringContaining("data:image/png;base64,AQID"), { fileId: "project", scriptIndex: 2 });
    view.unmount();
  });
  it("does not dirty the project when only selection changes", async () => {
    const view = render(<CanvasEditor />);
    await waitFor(() => expect(view.getByTestId("canvas-ready")).toBeTruthy());
    act(() => { mock.change?.(mock.elements, { selectedElementIds: { x: true } }, mock.files); flushPendingEditorEdits("project"); });
    expect(mock.setText).not.toHaveBeenCalled();
    view.unmount();
  });
  it.each(["viewBackgroundColor", "gridSize", "gridStep", "gridModeEnabled"])("saves changes to %s even when drawing elements are unchanged", async field => {
    const view = render(<CanvasEditor />);
    await waitFor(() => expect(view.getByTestId("canvas-ready")).toBeTruthy());
    const state = { [field]: field === "viewBackgroundColor" ? "#123456" : field === "gridModeEnabled" ? true : 40 };
    act(() => { mock.change?.(mock.elements, state, mock.files); flushPendingEditorEdits("project"); });
    expect(mock.serialize).toHaveBeenCalledTimes(1);
    expect(JSON.parse(mock.setText.mock.calls[0][0]).appState).toEqual(state);
    view.unmount();
  });
});
