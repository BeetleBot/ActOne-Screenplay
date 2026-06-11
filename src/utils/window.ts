import { getCurrentWindow } from "@tauri-apps/api/window";

export const getTauriWindow = () => {
  try { return getCurrentWindow(); } catch { return null; }
};
