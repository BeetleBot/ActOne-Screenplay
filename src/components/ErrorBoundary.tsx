import React from "react";
import { Box, Typography, Button, IconButton, Tooltip } from "@mui/material";
import { logger } from "../utils/logger";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  name?: string;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const name = this.props.name || "unknown";
    logger.error("err-boundary", `[${name}] caught error`, error);
    if (errorInfo.componentStack) {
      logger.warn("err-boundary", `[${name}] component stack`, new Error(errorInfo.componentStack));
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    const name = this.props.name || "component";
    const errorMessage = this.state.error?.message || "An unexpected error occurred.";
    const errorStack = this.state.error?.stack;

    const handleCopy = () => {
      const text = [
        `Error: ${errorMessage}`,
        `Component: ${name}`,
        `Time: ${new Date().toISOString()}`,
        ``,
        errorStack || "",
      ].join("\n");
      navigator.clipboard.writeText(text);
    };

    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          p: 1.5,
          m: 0.5,
          borderRadius: 1,
          bgcolor: "error.main",
          color: "error.contrastText",
          opacity: 0.85,
          fontSize: 13,
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 600, fontSize: "inherit", lineHeight: 1.3 }}>
          ⚠️ {name} crashed
        </Typography>
        <Typography variant="caption" sx={{ fontSize: "inherit", opacity: 0.8, flex: 1, lineHeight: 1.3 }}>
          {errorMessage}
        </Typography>
        <Tooltip title="Copy error details">
          <IconButton size="small" onClick={handleCopy} sx={{ color: "inherit", opacity: 0.7, "&:hover": { opacity: 1 } }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
          </IconButton>
        </Tooltip>
        <Button
          size="small"
          variant="text"
          onClick={this.handleReset}
          sx={{ color: "inherit", textTransform: "none", fontWeight: 600, fontSize: "inherit", minWidth: 0, p: 0.5 }}
        >
          Retry
        </Button>
      </Box>
    );
  }
}
