import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPendingEditorEdits } from "../editor/pendingEdits";
import { CanvasEditor } from "./CanvasEditor";

const mock = vi.hoisted(() => ({ updateScene: vi.fn(), change: null as null | ((e: unknown[], s: object, f: object) => void), setText: vi.fn(), files: {}, elements: [], state: {} }));
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
      React.useEffect(() => { excalidrawAPI({ updateScene: mock.updateScene }); }, [excalidrawAPI]);
      return <div data-testid="canvas-ready" />;
    },
    MainMenu: Object.assign(Empty, { Item: Empty, DefaultItems: { SaveAsImage: Empty, ClearCanvas: Empty } }),
    WelcomeScreen: Object.assign(Empty, { Center: Object.assign(Empty, { Heading: Empty }) }),
    loadFromBlob: async () => ({ elements: [], appState: {}, files: {} }),
    getSceneVersion: (elements: unknown[]) => elements.length,
    serializeAsJSON: (elements: unknown[], _state: object, files: object) => JSON.stringify({ elements, files }),
  };
});
describe("Canvas save bridge", () => {
  it("opens the image export dialog through the application shortcut route", async () => {
    const view = render(<CanvasEditor />);
    await waitFor(() => expect(view.getByTestId("canvas-ready")).toBeTruthy());
    act(() => { window.dispatchEvent(new Event("actone:canvas-export-image")); });
    expect(mock.updateScene).toHaveBeenCalledWith({ appState: { openDialog: { name: "imageExport" } } });
    view.unmount();
  });
  beforeEach(() => { mock.setText.mockClear(); });
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
});
