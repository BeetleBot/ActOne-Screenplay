export async function confirmDialog(message: string, options?: { kind?: "info" | "warning" | "error"; title?: string }): Promise<boolean> {
  if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
    const { confirm } = await import("@tauri-apps/plugin-dialog");
    return await confirm(message, options);
  } else {
    return window.confirm(message);
  }
}
