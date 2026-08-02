import React from "react";
import { Box, Typography, Button, IconButton, Tooltip } from "@mui/material";
import { logger } from "../utils/logger";
import { captureError, formatErrorDetails, markBoundaryCaught, type ErrorReport, type ErrorSeverity } from "../utils/errorReport";
import { showCrashScreen } from "./CrashScreen";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  name?: string;
  fallback?: React.ReactNode;
  fullScreen?: boolean;
  severity?: ErrorSeverity;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  report: ErrorReport | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, report: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const name = this.props.name || "unknown";
    const report = captureError({
      type: "render",
      error,
      component: name,
      severity: this.props.fullScreen ? this.props.severity ?? "window" : this.props.severity ?? "pane",
    });
    markBoundaryCaught();
    this.setState({ report });
    logger.error("err-boundary", `[${name}] caught error`, error);
    if (errorInfo.componentStack) logger.warn("err-boundary", `[${name}] component stack`, new Error(errorInfo.componentStack));
    if (this.props.fullScreen) showCrashScreen(report);
  }

  handleReset = () => this.setState({ hasError: false, error: null, report: null });

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;
    if (this.props.fullScreen) return null;

    const name = this.props.name || "component";
    const errorMessage = this.state.error?.message || "An unexpected error occurred.";
    const report = this.state.report || {
      code: "ACT-UNKNOWN",
      timestamp: new Date().toISOString(),
      type: "render" as const,
      severity: "pane" as const,
      message: errorMessage,
      stack: this.state.error?.stack,
      component: name,
      appVersion: "unknown",
      userAgent: typeof navigator === "undefined" ? "unknown" : navigator.userAgent,
      occurrence: 1,
      diagnostics: {
        os: "unknown", osVersion: "unknown", architecture: "unknown", cpuModel: "unknown", cpuCount: 0,
        totalMemoryMb: 0, availableMemoryMb: 0, userAgent: typeof navigator === "undefined" ? "unknown" : navigator.userAgent,
        language: typeof navigator === "undefined" ? "unknown" : navigator.language, online: typeof navigator === "undefined" ? true : navigator.onLine,
        hardwareConcurrency: typeof navigator === "undefined" ? 0 : navigator.hardwareConcurrency, deviceMemoryGb: null, viewport: "unknown",
      },
    };
    const handleCopy = () => { void navigator.clipboard?.writeText(formatErrorDetails(report)); };

    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          p: 1.25,
          m: 0.5,
          border: "1px solid",
          borderColor: "error.main",
          bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(244, 67, 54, 0.08)" : "rgba(211, 47, 47, 0.04)"),
          color: "text.primary",
          fontSize: 12,
        }}
      >
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.75,
            px: 0.75,
            py: 0.25,
            bgcolor: "error.main",
            color: "error.contrastText",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.5,
          }}
        >
          {name.toUpperCase()} · {report.code}
        </Box>
        <Typography variant="body2" sx={{ fontSize: 12, color: "text.secondary", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {errorMessage}
        </Typography>
        <Tooltip title="Copy error details">
          <IconButton size="small" onClick={handleCopy} sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
            </svg>
          </IconButton>
        </Tooltip>
        <Button size="small" variant="outlined" color="primary" onClick={this.handleReset} sx={{ fontSize: 11, py: 0.25, px: 1.25, minWidth: 0, textTransform: "none" }}>
          Retry
        </Button>
      </Box>
    );
  }
}
