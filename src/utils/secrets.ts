const SERVICE_NAME = "ink.iyal.actone";

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function storeSecret(key: string, value: string): Promise<void> {
  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("store_secret", { service: SERVICE_NAME, key, value });
      return;
    } catch {
      /* Fall back to localStorage */
    }
  }
  try {
    localStorage.setItem(`actone-sec-${key}`, value);
  } catch {
    /* ignore */
  }
}

export async function getSecret(key: string): Promise<string> {
  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const res = await invoke<string>("get_secret", { service: SERVICE_NAME, key });
      if (res) return res;
    } catch {
      /* Fall back to localStorage */
    }
  }
  try {
    return localStorage.getItem(`actone-sec-${key}`) || "";
  } catch {
    return "";
  }
}

export async function deleteSecret(key: string): Promise<void> {
  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("delete_secret", { service: SERVICE_NAME, key });
      return;
    } catch {
      /* Fall back to localStorage */
    }
  }
  try {
    localStorage.removeItem(`actone-sec-${key}`);
  } catch {
    /* ignore */
  }
}
