import { useEffect, useState } from "react";
import { AppProviders } from "../context";
import { ExportWindow } from "./ExportWindow";
import type { ExportWindowData } from "../utils/exportWindow";
import { WindowLoading } from "./WindowLoading";
import { Alert } from "@mui/material";

function ExportWindowContent() {
  const [data, setData] = useState<ExportWindowData | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!(typeof window !== "undefined" && "__TAURI_INTERNALS__" in window)) return;
    let active = true;
    let stop: (() => void) | undefined;
    void (async () => {
      const { listen, emitTo } = await import("@tauri-apps/api/event");
      const unlisten = await listen<ExportWindowData>("export:document", event => {
        if (active) setData(event.payload);
      });
      if (!active) { unlisten(); return; }
      stop = unlisten;
      const parent = new URLSearchParams(window.location.search).get("parent");
      if (!parent) throw new Error("No source document window.");
      await emitTo(parent, "export:ready");
    })().catch(reason => { if (active) setError(String(reason)); });
    return () => { active = false; stop?.(); };
  }, []);
  const close = () => {
    if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
      void import("@tauri-apps/api/window").then(({ getCurrentWindow }) => getCurrentWindow().close());
    }
  };
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <WindowLoading label="Loading export" />;
  return <ExportWindow key={`${data.file.filePath}:${data.file.activeScriptName}`} data={data} onClose={close} />;
}
export function NativeExportWindow() {
  return <AppProviders><ExportWindowContent /></AppProviders>;
}
