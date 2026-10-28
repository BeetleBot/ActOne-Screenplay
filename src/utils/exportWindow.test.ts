import { beforeEach, expect, it, vi } from "vitest";
import { openExportWindow, type ExportWindowData } from "./exportWindow";
const mocks = vi.hoisted(() => ({ ready: undefined as undefined | (() => void), emit: vi.fn().mockResolvedValue(undefined), focus: vi.fn(), existing: false, options: undefined as unknown }));
vi.mock("@tauri-apps/api/event", () => ({
  emitTo: mocks.emit,
  listen: vi.fn(async (_event, callback) => { mocks.ready = callback; return vi.fn(); }),
}));
vi.mock("@tauri-apps/api/window", () => ({ getCurrentWindow: () => ({ label: "main" }) }));
vi.mock("@tauri-apps/api/webviewWindow", () => ({ WebviewWindow: class {
  static getByLabel = async () => mocks.existing ? { setFocus: mocks.focus } : null;
  constructor(_label: string, options: unknown) { mocks.options = options; queueMicrotask(() => mocks.ready?.()); }
  once = vi.fn();
} }));
const data = { file: { rawText: "Unsaved draft" }, ui: { paperSize: "a4" } } as ExportWindowData;
beforeEach(() => { vi.clearAllMocks(); mocks.existing = false; Object.assign(window, { __TAURI_INTERNALS__: {} }); });
it("hands off unsaved content after the native window is ready", async () => {
  await openExportWindow(data);
  expect(mocks.options).toMatchObject({ url: "/?modal=export&parent=main", resizable: true, maximized: true });
  expect(mocks.emit).toHaveBeenCalledWith("export", "export:document", data);
});
it("updates and focuses an existing export window", async () => {
  mocks.existing = true;
  await openExportWindow(data);
  expect(mocks.emit).toHaveBeenCalledWith("export", "export:document", data);
  expect(mocks.focus).toHaveBeenCalled();
});
