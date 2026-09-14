import { describe, it, expect, beforeEach } from "vitest";
import { encryptApiKey, decryptApiKey, isEncrypted, encryptApiList, decryptApiList } from "./cryptoStorage";

describe("cryptoStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("identifies encrypted vs plain strings correctly", () => {
    expect(isEncrypted("sk-test123456")).toBe(false);
    expect(isEncrypted("enc:v1:iv:ciphertext")).toBe(true);
    expect(isEncrypted("")).toBe(false);
  });

  it("encrypts and decrypts an API key", async () => {
    const original = "sk-or-v1-abcdef1234567890";
    const encrypted = await encryptApiKey(original);

    expect(encrypted).not.toBe(original);
    expect(encrypted.startsWith("enc:v1:")).toBe(true);

    const decrypted = await decryptApiKey(encrypted);
    expect(decrypted).toBe(original);
  });

  it("handles empty or blank keys gracefully", async () => {
    expect(await encryptApiKey("")).toBe("");
    expect(await decryptApiKey("")).toBe("");
  });

  it("preserves already plaintext keys on decrypt (backward compatibility)", async () => {
    const plain = "sk-legacy-key-without-prefix";
    const decrypted = await decryptApiKey(plain);
    expect(decrypted).toBe(plain);
  });

  it("generates different ciphertexts for the same key due to random IV", async () => {
    const key = "sk-test-same-key";
    const enc1 = await encryptApiKey(key);
    const enc2 = await encryptApiKey(key);

    expect(enc1).not.toBe(enc2);
    expect(await decryptApiKey(enc1)).toBe(key);
    expect(await decryptApiKey(enc2)).toBe(key);
  });

  it("handles malformed encrypted strings without crashing", async () => {
    const malformed = "enc:v1:invalid_string";
    const result = await decryptApiKey(malformed);
    expect(result).toBe(malformed);
  });

  it("encrypts and decrypts API entry lists correctly", async () => {
    const originalList = [
      { id: "1", name: "OpenRouter", endpoint: "https://openrouter.ai/api/v1", apiKey: "sk-or-12345", model: "anthropic/claude-3" },
      { id: "2", name: "Local", endpoint: "http://localhost:11434/v1", apiKey: "", model: "llama3" }
    ];

    const encryptedList = await encryptApiList(originalList);
    expect(encryptedList[0].apiKey.startsWith("enc:v1:")).toBe(true);
    expect(encryptedList[1].apiKey).toBe("");

    const decryptedList = await decryptApiList(encryptedList);
    expect(decryptedList).toEqual(originalList);
  });
});
