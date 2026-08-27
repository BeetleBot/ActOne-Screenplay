import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { confirmDialog } from "./dialog";

vi.mock("@tauri-apps/plugin-dialog", () => ({
  confirm: vi.fn(),
}));

describe("dialog - confirmDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).__TAURI_INTERNALS__;
    vi.restoreAllMocks();
  });

  it("uses window.confirm in browser environment when __TAURI_INTERNALS__ is not present", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    const result = await confirmDialog("Are you sure you want to delete this script?");

    expect(confirmSpy).toHaveBeenCalledWith("Are you sure you want to delete this script?");
    expect(result).toBe(true);

    confirmSpy.mockReturnValue(false);
    const resultFalse = await confirmDialog("Cancel action?");
    expect(resultFalse).toBe(false);
  });

  it("calls Tauri plugin confirm dialog when __TAURI_INTERNALS__ is in window", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__TAURI_INTERNALS__ = {};

    const { confirm } = await import("@tauri-apps/plugin-dialog");
    vi.mocked(confirm).mockResolvedValue(true);

    const options = { title: "Confirm Delete", kind: "warning" as const };
    const result = await confirmDialog("Are you sure?", options);

    expect(confirm).toHaveBeenCalledWith("Are you sure?", options);
    expect(result).toBe(true);
  });

  it("handles negative confirmation in Tauri environment", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__TAURI_INTERNALS__ = {};

    const { confirm } = await import("@tauri-apps/plugin-dialog");
    vi.mocked(confirm).mockResolvedValue(false);

    const result = await confirmDialog("Discard unsaved changes?");
    expect(confirm).toHaveBeenCalledWith("Discard unsaved changes?", undefined);
    expect(result).toBe(false);
  });
});
