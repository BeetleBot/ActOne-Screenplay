import type { FileContextProps, UIContextProps } from "../context";

export interface ExportWindowData {
  file: Pick<FileContextProps, "rawText" | "isBundle" | "activeScriptName" | "filePath" | "parsedDoc" | "scripts" | "activeScriptIndex">;
  ui: Pick<UIContextProps, "fontFamily" | "paperSize">;
}

let pendingPdf: Promise<void> | undefined;
let pendingScript: Promise<void> | undefined;

export function openExportPdfWindow(data: ExportWindowData): Promise<void> {
  if (pendingPdf) return pendingPdf;
  pendingPdf = openPdf(data).finally(() => { pendingPdf = undefined; });
  return pendingPdf;
}

export function openExportScriptWindow(data: ExportWindowData): Promise<void> {
  if (pendingScript) return pendingScript;
  pendingScript = openScript(data).finally(() => { pendingScript = undefined; });
  return pendingScript;
}

// Backwards compatibility alias
export const openExportWindow = openExportPdfWindow;

async function openPdf(data: ExportWindowData): Promise<void> {
  if (!(typeof window !== "undefined" && "__TAURI_INTERNALS__" in window)) return;
  const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
  const { listen, emitTo } = await import("@tauri-apps/api/event");
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  const existing = await WebviewWindow.getByLabel("export-pdf");
  if (existing) {
    await emitTo("export-pdf", "export:document", data);
    await existing.setFocus();
    return;
  }
  const parent = getCurrentWindow().label;
  await new Promise<void>((resolve, reject) => {
    let stop: (() => void) | undefined;
    const timer = window.setTimeout(() => { stop?.(); reject(new Error("Export PDF window did not respond.")); }, 20000);
    const finish = (error?: unknown) => { window.clearTimeout(timer); stop?.(); if (error) reject(error); else resolve(); };
    void listen("export-pdf:ready", () => {
      void emitTo("export-pdf", "export:document", data).then(() => finish()).catch(finish);
    }).then(unlisten => {
      stop = unlisten;
      const win = new WebviewWindow("export-pdf", {
        url: `/?modal=export-pdf&parent=${encodeURIComponent(parent)}`,
        title: "ActOne – Export PDF",
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 500,
        resizable: true,
        maximized: true,
        decorations: false,
      });
      void win.once("tauri://error", event => finish(event.payload));
    }).catch(finish);
  });
}

async function openScript(data: ExportWindowData): Promise<void> {
  if (!(typeof window !== "undefined" && "__TAURI_INTERNALS__" in window)) return;
  const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
  const { listen, emitTo } = await import("@tauri-apps/api/event");
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  const { LogicalSize } = await import("@tauri-apps/api/dpi");
  const existing = await WebviewWindow.getByLabel("export-script");
  if (existing) {
    if (typeof existing.setSize === "function") {
      await existing.setSize(new LogicalSize(500, 600)).catch(() => {});
    }
    if (typeof existing.center === "function") {
      await existing.center().catch(() => {});
    }
    await emitTo("export-script", "export:document", data);
    await existing.setFocus();
    return;
  }
  const parent = getCurrentWindow().label;
  await new Promise<void>((resolve, reject) => {
    let stop: (() => void) | undefined;
    const timer = window.setTimeout(() => { stop?.(); reject(new Error("Export Script window did not respond.")); }, 20000);
    const finish = (error?: unknown) => { window.clearTimeout(timer); stop?.(); if (error) reject(error); else resolve(); };
    void listen("export-script:ready", () => {
      void emitTo("export-script", "export:document", data).then(() => finish()).catch(finish);
    }).then(unlisten => {
      stop = unlisten;
      const win = new WebviewWindow("export-script", {
        url: `/?modal=export-script&parent=${encodeURIComponent(parent)}`,
        title: "ActOne – Export Script",
        width: 500,
        height: 600,
        minWidth: 500,
        minHeight: 600,
        maxWidth: 500,
        maxHeight: 600,
        resizable: false,
        decorations: false,
      });
      void win.once("tauri://created", () => {
        void win.setSize(new LogicalSize(500, 600)).catch(() => {});
        void win.center().catch(() => {});
      });
      void win.once("tauri://error", event => finish(event.payload));
    }).catch(finish);
  });
}
