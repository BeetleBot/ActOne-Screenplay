import type { FileContextProps, UIContextProps } from "../context";

export interface ExportWindowData {
  file: Pick<FileContextProps, "rawText" | "isBundle" | "activeScriptName" | "filePath" | "parsedDoc" | "scripts" | "activeScriptIndex">;
  ui: Pick<UIContextProps, "fontFamily" | "paperSize">;
}

let pending: Promise<void> | undefined;
export function openExportWindow(data: ExportWindowData): Promise<void> {
  if (pending) return pending;
  pending = open(data).finally(() => { pending = undefined; });
  return pending;
}
async function open(data: ExportWindowData): Promise<void> {
  if (!(typeof window !== "undefined" && "__TAURI_INTERNALS__" in window)) return;
  const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
  const { listen, emitTo } = await import("@tauri-apps/api/event");
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  const existing = await WebviewWindow.getByLabel("export");
  if (existing) { await emitTo("export", "export:document", data); await existing.setFocus(); return; }
  const parent = getCurrentWindow().label;
  await new Promise<void>((resolve, reject) => {
    let stop: (() => void) | undefined;
    const timer = window.setTimeout(() => { stop?.(); reject(new Error("Export window did not respond.")); }, 20000);
    const finish = (error?: unknown) => { window.clearTimeout(timer); stop?.(); if (error) reject(error); else resolve(); };
    void listen("export:ready", () => {
      void emitTo("export", "export:document", data).then(() => finish()).catch(finish);
    }).then(unlisten => {
      stop = unlisten;
      const win = new WebviewWindow("export", {
        url: `/?modal=export&parent=${encodeURIComponent(parent)}`,
        title: "ActOne – Export", width: 1200, height: 800,
        minWidth: 800, minHeight: 500, resizable: true, maximized: true, decorations: false,
      });
      void win.once("tauri://error", event => finish(event.payload));
    }).catch(finish);
  });
}
