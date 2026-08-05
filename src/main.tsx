import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { SettingsWindow } from "./components/SettingsWindow";
import { HelpWindow } from "./components/HelpWindow";
import { ThemeManagerWindow } from "./components/ThemeManagerWindow";
import { XrayWindow } from "./components/XrayWindow";
import { TutorialsWindow } from "./components/TutorialsWindow";
import "./index.css";
import { logger } from "./utils/logger";
import { captureError, flushErrorReports, setSystemDiagnostics, wasJustCaughtByBoundary } from "./utils/errorReport";
import { showCrashScreen, readCrashWindowReport, CrashScreen } from "./components/CrashScreen";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ThemeProvider, UIProvider } from "./context";

(window as Window & { __actoneErrorModuleLoaded?: boolean }).__actoneErrorModuleLoaded = true;

window.onerror = (message, source, _line, _col, error) => {
  const report = captureError({ type: "uncaught", error: error ?? message, filename: source || undefined, message: error ? undefined : String(message), severity: "window" });
  if (!wasJustCaughtByBoundary()) showCrashScreen(report);
  return true;
};

window.addEventListener("unhandledrejection", (event) => {
  const report = captureError({ type: "unhandled-rejection", error: event.reason, severity: "window" });
  if (!wasJustCaughtByBoundary()) showCrashScreen(report);
});

void (async () => {
  if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const info = await invoke<{ os: string; os_version: string; architecture: string; cpu_model: string; cpu_count: number; total_memory_mb: number; available_memory_mb: number }>("get_system_info");
      setSystemDiagnostics({ os: info.os, osVersion: info.os_version, architecture: info.architecture, cpuModel: info.cpu_model, cpuCount: info.cpu_count, totalMemoryMb: info.total_memory_mb, availableMemoryMb: info.available_memory_mb });
      const pendingPanic = await invoke<string>("flush_pending_panics");
      if (pendingPanic) captureError({ type: "rust-panic", message: pendingPanic.slice(0, 5000), severity: "app" });
    } catch (error) { logger.warn("error-report", "Unable to collect system diagnostics", error); }
  }
  await flushErrorReports();
})();

const params = new URLSearchParams(window.location.search);
const modalParam = params.get("modal");

const modalWrapper = (children: React.ReactNode) => (
  <UIProvider>
    <ThemeProvider>
      {children}
    </ThemeProvider>
  </UIProvider>
);

let rootElement: React.ReactNode;
if (modalParam === "crash") {
  const report = readCrashWindowReport();
  rootElement = report
    ? modalWrapper(<ErrorBoundary name="crash-window"><CrashScreen report={report} /></ErrorBoundary>)
    : modalWrapper(<div style={{ fontFamily: "sans-serif", padding: 24 }}>No crash report found.</div>);
} else if (modalParam === "settings") {
  rootElement = modalWrapper(<ErrorBoundary fullScreen name="settings-window"><SettingsWindow /></ErrorBoundary>);
} else if (modalParam === "help") {
  rootElement = modalWrapper(<ErrorBoundary fullScreen name="help-window"><HelpWindow /></ErrorBoundary>);
} else if (modalParam === "theme-manager") {
  rootElement = modalWrapper(<ErrorBoundary fullScreen name="theme-manager-window"><ThemeManagerWindow /></ErrorBoundary>);
} else if (modalParam === "xray") {
  rootElement = modalWrapper(<ErrorBoundary fullScreen name="xray-window"><XrayWindow /></ErrorBoundary>);
} else if (modalParam === "tutorials") {
  rootElement = modalWrapper(<ErrorBoundary fullScreen name="tutorials-window"><TutorialsWindow /></ErrorBoundary>);
} else {
  rootElement = <App />;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {rootElement}
  </React.StrictMode>,
);
