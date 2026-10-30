import { beforeEach, describe, expect, it, vi } from "vitest";
const { encrypt } = vi.hoisted(() => ({ encrypt: vi.fn() }));
vi.mock("../utils/cryptoStorage", () => ({ encryptApiKey: encrypt, decryptApiKey: vi.fn(async s => s), isEncrypted: () => false }));
import { activateConfiguredApi } from "./usePromptConfig";
import { STORAGE_KEYS } from "../constants";
beforeEach(() => { localStorage.clear(); encrypt.mockReset(); });
describe("atomic provider switching", () => {
  it("keeps the old destination until the new credential is secured", async () => {
    localStorage.setItem(STORAGE_KEYS.PROMPT_API_ENDPOINT, "https://old.example/v1");
    localStorage.setItem(STORAGE_KEYS.PROMPT_API_KEY, "old-reference");
    let finish!: (value: string) => void;
    encrypt.mockReturnValueOnce(new Promise<string>(resolve => { finish = resolve; }));
    const selection = activateConfiguredApi({ endpoint: "https://new.example/v1", model: "new", apiKey: "test-only" });
    expect(localStorage.getItem(STORAGE_KEYS.PROMPT_API_ENDPOINT)).toBe("https://old.example/v1");
    finish("secure:v1:new"); await selection;
    expect(localStorage.getItem(STORAGE_KEYS.PROMPT_API_ENDPOINT)).toBe("https://new.example/v1");
    expect(localStorage.getItem(STORAGE_KEYS.PROMPT_API_KEY)).toBe("secure:v1:new");
  });
  it("leaves the provider intact when secure storage fails", async () => {
    localStorage.setItem(STORAGE_KEYS.PROMPT_API_ENDPOINT, "https://old.example/v1");
    encrypt.mockRejectedValueOnce(new Error("locked"));
    await expect(activateConfiguredApi({ endpoint: "https://new.example/v1", model: "new", apiKey: "test-only" })).rejects.toThrow("locked");
    expect(localStorage.getItem(STORAGE_KEYS.PROMPT_API_ENDPOINT)).toBe("https://old.example/v1");
  });
});
