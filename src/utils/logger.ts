export interface ErrorReport {
  timestamp: string;
  module: string;
  message: string;
  stack?: string;
}

type LogLevel = "info" | "warn" | "error";

const MAX_RECENT = 50;
const recentErrors: ErrorReport[] = [];
const isDev = typeof window !== "undefined" && import.meta.env?.DEV;

function log(level: LogLevel, module: string, message: string, error?: unknown) {
  const report: ErrorReport = {
    timestamp: new Date().toISOString(),
    module,
    message,
    stack: error instanceof Error ? error.stack : undefined,
  };

  recentErrors.push(report);
  if (recentErrors.length > MAX_RECENT) recentErrors.shift();

  if (isDev) {
    const prefix = `[${module}]`;
    const args: unknown[] = [prefix, message];
    if (error) args.push(error);
    switch (level) {
      case "error": console.error(...args); break;
      case "warn": console.warn(...args); break;
      case "info": console.log(...args); break;
    }
  }
}

export const logger = {
  error(module: string, message: string, error?: unknown) {
    log("error", module, message, error);
  },
  warn(module: string, message: string, error?: unknown) {
    log("warn", module, message, error);
  },
  info(module: string, message: string) {
    log("info", module, message);
  },
  getRecentErrors(): ErrorReport[] {
    return [...recentErrors];
  },
};
