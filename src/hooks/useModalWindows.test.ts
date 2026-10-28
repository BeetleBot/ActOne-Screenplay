import { act, renderHook, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { useModalWindows } from "./useModalWindows";
const { createWindow } = vi.hoisted(() => ({ createWindow: vi.fn() }));
vi.mock("@tauri-apps/api/webviewWindow", () => ({ WebviewWindow: class { constructor(label: string, options: unknown) { createWindow(label, options); } once() {} } }));
it("opens a resizable Theme Manager without maximizing", async () => {
  Object.defineProperty(window, "__TAURI_INTERNALS__", { configurable: true, value: {} });
  const { result } = renderHook(() => useModalWindows());
  act(() => result.current.openThemeManagerWindow());
  await waitFor(() => expect(createWindow).toHaveBeenCalledWith("theme-manager", expect.objectContaining({ width: 1000, height: 700, resizable: true })));
  expect(createWindow.mock.calls[0][1]).not.toHaveProperty("maximized", true);
  delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
});
