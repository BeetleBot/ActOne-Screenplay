import type { ApiEntry } from "../constants";

const PREFIX = "enc:v1:";
const SALT_STORAGE_KEY = "actone-device-salt";

let cachedKey: CryptoKey | null = null;

function bufferToBase64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function getOrCreateDeviceSalt(): Uint8Array {
  try {
    const existing = localStorage.getItem(SALT_STORAGE_KEY);
    if (existing) {
      return base64ToBuffer(existing);
    }
    const fresh = crypto.getRandomValues(new Uint8Array(16));
    localStorage.setItem(SALT_STORAGE_KEY, bufferToBase64(fresh));
    return fresh;
  } catch {
    return new Uint8Array([11, 42, 83, 104, 25, 66, 17, 98, 209, 130, 44, 75, 16, 88, 19, 31]);
  }
}

async function getEncryptionKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;

  const salt = getOrCreateDeviceSalt();
  const rawMaterial = new TextEncoder().encode(
    "actone-secure-storage-v1-" + (typeof window !== "undefined" ? window.location.origin : "app")
  );

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    rawMaterial,
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  const derived = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: 10000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  cachedKey = derived;
  return derived;
}

export function isEncrypted(value: string): boolean {
  return typeof value === "string" && value.startsWith(PREFIX);
}

export async function encryptApiKey(plaintext: string): Promise<string> {
  if (!plaintext || plaintext.trim() === "") return "";
  if (isEncrypted(plaintext)) return plaintext;

  try {
    const key = await getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);

    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encoded
    );

    return `${PREFIX}${bufferToBase64(iv)}:${bufferToBase64(ciphertext)}`;
  } catch {
    return plaintext;
  }
}

export async function decryptApiKey(stored: string): Promise<string> {
  if (!stored || stored.trim() === "") return "";
  if (!isEncrypted(stored)) {
    return stored;
  }

  try {
    const parts = stored.slice(PREFIX.length).split(":");
    if (parts.length !== 2) return stored;

    const [ivB64, cipherB64] = parts;
    const iv = base64ToBuffer(ivB64);
    const ciphertext = base64ToBuffer(cipherB64);
    const key = await getEncryptionKey();

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      key,
      ciphertext as BufferSource
    );

    return new TextDecoder().decode(decrypted);
  } catch {
    return stored;
  }
}

export async function encryptApiList(list: ApiEntry[]): Promise<ApiEntry[]> {
  return Promise.all(
    list.map(async (entry) => {
      if (!entry.apiKey || isEncrypted(entry.apiKey)) return entry;
      const enc = await encryptApiKey(entry.apiKey);
      return { ...entry, apiKey: enc };
    })
  );
}

export async function decryptApiList(list: ApiEntry[]): Promise<ApiEntry[]> {
  return Promise.all(
    list.map(async (entry) => {
      if (!entry.apiKey || !isEncrypted(entry.apiKey)) return entry;
      const dec = await decryptApiKey(entry.apiKey);
      return { ...entry, apiKey: dec };
    })
  );
}
