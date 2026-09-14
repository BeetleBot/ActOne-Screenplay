import { describe, it, expect, beforeEach, vi } from "vitest";
import { getSecret, storeSecret, deleteSecret } from "./secrets";

describe("secrets utility", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("stores and retrieves secrets using fallback storage when outside Tauri", async () => {
    await storeSecret("test_key", "secret-value-123");
    const retrieved = await getSecret("test_key");
    expect(retrieved).toBe("secret-value-123");
  });

  it("returns empty string when secret does not exist", async () => {
    const retrieved = await getSecret("non_existent_key");
    expect(retrieved).toBe("");
  });

  it("deletes a secret", async () => {
    await storeSecret("to_delete", "secret-xyz");
    await deleteSecret("to_delete");
    const retrieved = await getSecret("to_delete");
    expect(retrieved).toBe("");
  });
});
