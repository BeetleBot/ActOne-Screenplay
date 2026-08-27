export interface LogReport {
  timestamp: string;
  module: string;
  message: string;
  stack?: string;
}

export interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error";
  module: string;
  message: string;
  stack?: string;
}

export type ErrorReport = LogReport;

type LogLevel = "info" | "warn" | "error";

const MAX_RECENT_LOGS = 50;
const recentLogs: LogEntry[] = [];
const isDev = typeof window !== "undefined" && import.meta.env?.DEV;

function log(level: LogLevel, module: string, message: string, error?: unknown) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    module,
    message,
    stack: error instanceof Error ? error.stack : undefined,
  };

  recentLogs.push(entry);
  if (recentLogs.length > MAX_RECENT_LOGS) recentLogs.shift();

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
  getRecentLogs(): LogEntry[] {
    return [...recentLogs];
  },
  getRecentLogLines(max = 30): string[] {
    return recentLogs.slice(-max).map((e) => {
      const time = e.timestamp.slice(11, 19);
      const lvl = e.level === "error" ? "ERR" : e.level === "warn" ? "WRN" : "INF";
      return `${time} [${lvl}] [${e.module}] ${e.message}`;
    });
  },
  formatRecentLogs(max = 30): string {
    return this.getRecentLogLines(max).join("\n");
  },
  getRecentErrors(): ErrorReport[] {
    return recentLogs
      .filter((e) => e.level === "error")
      .map((e) => ({
        timestamp: e.timestamp,
        module: e.module,
        message: e.message,
        stack: e.stack,
      }));
  },
  clearRecentLogs() {
    recentLogs.length = 0;
  },
};
