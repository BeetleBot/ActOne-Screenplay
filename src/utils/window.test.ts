import { describe, it, expect } from "vitest";
import { getTauriWindow } from "./window";

describe("getTauriWindow", () => {
  it("returns null when not in Tauri environment", () => {
    expect(getTauriWindow()).toBeNull();
  });
});
