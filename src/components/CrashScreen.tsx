import { useEffect, useState } from "react";
import { Box, Typography, Button, IconButton, Tooltip } from "@mui/material";
import type { ErrorReport } from "../utils/errorReport";
import { formatErrorDetails } from "../utils/errorReport";
import { CRASH_REPORT_WINDOW_KEY } from "../constants/reporting";

const CopyIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
  </svg>
);
async function invokeTauri(command: string, args?: Record<string, unknown>): Promise<void> {
  try {
    if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) return;
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke(command, args);
  } catch {
    /* recovery command unavailable */
  }
}

async function closeCrashWindow(): Promise<void> {
  try {
    if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().close();
      return;
    }
    window.close();
  } catch {
    /* close unavailable */
  }
}

function memoryLabel(mb: number): string {
  return mb > 0 ? `${(mb / 1024).toFixed(1)} GB` : "";
}

export function readCrashWindowReport(): ErrorReport | null {
  try {
    const raw = localStorage.getItem(CRASH_REPORT_WINDOW_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ErrorReport;
  } catch {
    return null;
  }
}

export function showCrashScreen(report: ErrorReport): void {
  try {
    localStorage.setItem(CRASH_REPORT_WINDOW_KEY, JSON.stringify(report));
  } catch {
    /* storage unavailable */
  }
  if (typeof window === "undefined") return;
  if ("__TAURI_INTERNALS__" in window) {
    void (async () => {
      try {
        const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
        const existing = await WebviewWindow.getByLabel("crash-report");
        if (existing) {
          await existing.setFocus();
          return;
        }
        new WebviewWindow("crash-report", {
          url: "/?modal=crash",
          title: "ActOne Encountered an Error",
          width: 480,
          height: 380,
          resizable: false,
          maximizable: false,
          fullscreen: false,
          center: true,
        });
      } catch {
        /* window open unavailable */
      }
    })();
    return;
  }
  window.open("/?modal=crash", "actone-crash", "width=480,height=380");
}

export function CrashScreen({ report }: { report: ErrorReport }) {
  const [copied, setCopied] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [copiedTrace, setCopiedTrace] = useState(false);
  const [showTrace, setShowTrace] = useState(false);

  useEffect(() => {
    document.title = "ActOne Encountered an Error";
    return () => {
      document.title = "ActOne";
    };
  }, []);

  const diag = report.diagnostics;
  const osLine = [diag?.os !== "unknown" && diag?.os, diag?.osVersion !== "unknown" && diag?.osVersion].filter(Boolean).join(" ") || null;
  const cpuLine = diag?.cpuModel && diag.cpuModel !== "unknown" ? `${diag.cpuModel}${diag.cpuCount > 0 ? ` · ${diag.cpuCount} cores` : ""}` : null;
  const memLine = diag && diag.totalMemoryMb > 0 ? `${memoryLabel(diag.availableMemoryMb)} available of ${memoryLabel(diag.totalMemoryMb)}` : null;
  const hasDiag = Boolean(osLine || cpuLine || memLine);

  const isAppCrash = report.severity === "app";
  const canReloadWindow = report.severity === "window" && Boolean(report.windowLabel);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(formatErrorDetails(report));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  const copyRef = async () => {
    try {
      await navigator.clipboard.writeText(report.code);
      setCopiedRef(true);
      window.setTimeout(() => setCopiedRef(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  const copyTrace = async () => {
    try {
      if (report.stack) {
        await navigator.clipboard.writeText(report.stack);
        setCopiedTrace(true);
        window.setTimeout(() => setCopiedTrace(false), 1600);
      }
    } catch {
      /* clipboard unavailable */
    }
  };

  const primaryAction = async () => {
    if (isAppCrash) {
      await invokeTauri("restart_app");
      return;
    }
    if (canReloadWindow) {
      await invokeTauri("reload_window", { label: report.windowLabel });
      if (!("__TAURI_INTERNALS__" in window)) window.opener?.location.reload();
    }
  };

  const primaryLabel = isAppCrash ? "Restart App" : "Reload Window";
  const showPrimary = isAppCrash || canReloadWindow;

  const row = (label: string, value: string) => (
    <Box key={label} sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
      <Typography variant="caption" sx={{ flexShrink: 0, color: "text.secondary", minWidth: 64, fontWeight: 700, fontSize: 10, letterSpacing: 0.5 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ color: "text.primary", fontSize: 11, fontFamily: "monospace", overflowWrap: "anywhere" }}>
        {value}
      </Typography>
    </Box>
  );

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        bgcolor: "background.paper",
        color: "text.primary",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100vw",
        userSelect: "none",
        overflow: "hidden",
      }}
    >
      {/* Sticky Top Bar - Error Reference */}
      <Box
        sx={{
          p: 2,
          pb: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.6 }}>
          Error Reference:
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Box
            sx={{
              px: 0.85,
              py: 0.25,
              bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(244, 67, 54, 0.14)" : "rgba(211, 47, 47, 0.08)"),
              border: "1px solid",
              borderColor: "error.main",
              color: "error.main",
              fontFamily: "monospace",
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: 0.5,
            }}
          >
            {report.code}
          </Box>
          <Tooltip title={copiedRef ? "Copied!" : "Copy Error Reference"}>
            <IconButton size="small" onClick={() => void copyRef()} sx={{ p: 0.5, color: "text.secondary", "&:hover": { color: "text.primary" } }}>
              <CopyIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Scrollable content area */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          p: 2.5,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {/* Error Message */}
        <Box
          sx={{
            p: 1.25,
            bgcolor: "action.hover",
            border: "1px solid",
            borderColor: "divider",
            flexShrink: 0,
          }}
        >
          <Typography variant="body2" sx={{ fontSize: 12, color: "text.primary", lineHeight: 1.45, overflowWrap: "break-word", fontFamily: "monospace" }}>
            {report.message}
          </Typography>
        </Box>

        {/* System Diagnostics */}
        {hasDiag && (
          <Box
            sx={{
              p: 1.25,
              bgcolor: "action.hover",
              border: "1px solid",
              borderColor: "divider",
              display: "flex",
              flexDirection: "column",
              gap: 0.6,
              flexShrink: 0,
            }}
          >
            {osLine && row("OS", osLine)}
            {cpuLine && row("CPU", cpuLine)}
            {memLine && row("RAM", memLine)}
          </Box>
        )}

        {/* Technical Details Stack Trace */}
        {report.stack && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, flexShrink: 0 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10.5, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Technical Stack Trace
              </Typography>
              <Button size="small" variant="outlined" color="inherit" onClick={() => setShowTrace((prev) => !prev)} sx={{ fontSize: 10, py: 0.1, px: 1, textTransform: "none", minWidth: 0 }}>
                {showTrace ? "Hide Trace" : "Show Trace"}
              </Button>
            </Box>

            {showTrace && (
              <Box
                sx={{
                  position: "relative",
                  bgcolor: "action.hover",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Tooltip title={copiedTrace ? "Copied!" : "Copy Trace"}>
                  <IconButton
                    size="small"
                    onClick={() => void copyTrace()}
                    sx={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      p: 0.5,
                      bgcolor: "background.paper",
                      border: "1px solid",
                      borderColor: "divider",
                      color: "text.secondary",
                      "&:hover": { color: "text.primary", bgcolor: "action.hover" },
                      zIndex: 1,
                    }}
                  >
                    <CopyIcon />
                  </IconButton>
                </Tooltip>
                <Box
                  component="pre"
                  sx={{
                    m: 0,
                    p: 1.25,
                    pr: 4,
                    maxHeight: 120,
                    overflow: "auto",
                    fontFamily: "monospace",
                    fontSize: 10,
                    lineHeight: 1.4,
                    color: "error.main",
                    whiteSpace: "pre-wrap",
                    overflowWrap: "break-word",
                  }}
                >
                  {report.stack}
                </Box>
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* Fixed Sticky Action Bar at Bottom */}
      <Box
        sx={{
          bgcolor: "background.paper",
          borderTop: "1px solid",
          borderColor: "divider",
          p: 2,
          pt: 1.5,
          display: "flex",
          flexDirection: "column",
          gap: 1.25,
          flexShrink: 0,
        }}
      >
        <Typography variant="caption" sx={{ fontSize: 10, color: "text.secondary", opacity: 0.85, lineHeight: 1.35 }}>
          Quote your Error Reference Number if you wish to email ActOne support at{" "}
          <Box component="a" href="mailto:actone.report@gmail.com" sx={{ color: "primary.main", textDecoration: "none", fontWeight: 600, "&:hover": { textDecoration: "underline" } }}>
            actone.report@gmail.com
          </Box>. No screenplay content is shared.
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", gap: 1 }}>
            {showPrimary && (
              <Button size="small" variant="contained" color="primary" onClick={() => void primaryAction()} sx={{ fontSize: 11, px: 1.75, py: 0.5 }}>
                {primaryLabel}
              </Button>
            )}
            <Button size="small" variant="outlined" color="inherit" onClick={() => void copy()} sx={{ fontSize: 11, px: 1.75, py: 0.5 }}>
              {copied ? "Copied" : "Copy Details"}
            </Button>
          </Box>
          <Button size="small" color="inherit" onClick={() => void closeCrashWindow()} sx={{ fontSize: 11, color: "text.secondary" }}>
            Dismiss
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
