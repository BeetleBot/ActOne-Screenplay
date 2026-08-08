import { CRASH_REPORT_WEBHOOK_URL, ERROR_REPORT_MAX_QUEUE, ERROR_REPORT_QUEUE_KEY } from "../constants/reporting";
import { logger } from "./logger";

export type ErrorReportType = "render" | "uncaught" | "unhandled-rejection" | "rust-panic" | "pre-mount";

export type ErrorSeverity = "pane" | "window" | "app";

export interface ErrorReport {
  code: string;
  timestamp: string;
  type: ErrorReportType;
  severity: ErrorSeverity;
  message: string;
  stack?: string;
  component?: string;
  filename?: string;
  windowLabel?: string;
  appVersion: string;
  userAgent: string;
  occurrence: number;
  diagnostics?: SystemDiagnostics;
}

export interface SystemDiagnostics {
  os: string;
  osVersion: string;
  architecture: string;
  cpuModel: string;
  cpuCount: number;
  totalMemoryMb: number;
  availableMemoryMb: number;
  userAgent: string;
  language: string;
  online: boolean;
  hardwareConcurrency: number;
  deviceMemoryGb: number | null;
  viewport: string;
}

interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

const TRANSIENT_TAURI_ERROR_PATTERNS: RegExp[] = [
  /resource id \d+ is invalid/i,
  /resource.*\bnot found/i,
  /resource.*\b(dropped|destroyed|closed|invalid)\b/i,
  /operation is already in progress/i,
  /app quit requested/i,
];

export function isTransientTauriTeardownError(message: string): boolean {
  return TRANSIENT_TAURI_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

let systemInfo: Partial<SystemDiagnostics> = {};
let lastBoundaryCaughtAt = 0;

function isDevReporting(): boolean {
  return Boolean(import.meta.env?.DEV && import.meta.env?.MODE !== "test");
}

export function setSystemDiagnostics(info: Partial<SystemDiagnostics>): void {
  systemInfo = { ...systemInfo, ...info };
}

export function markBoundaryCaught(): void {
  lastBoundaryCaughtAt = Date.now();
}

export function resetErrorReportSessionForTests(): void {
  sessionCounts.clear();
  sentThisSession = 0;
  sending = false;
  systemInfo = {};
  lastBoundaryCaughtAt = 0;
}

export function wasJustCaughtByBoundary(windowMs = 5000): boolean {
  return Date.now() - lastBoundaryCaughtAt < windowMs;
}

function diagnostics(): SystemDiagnostics {
  const nav = typeof navigator === "undefined" ? null : (navigator as Navigator & { deviceMemory?: number });
  return {
    os: systemInfo.os || "unknown",
    osVersion: systemInfo.osVersion || "unknown",
    architecture: systemInfo.architecture || "unknown",
    cpuModel: systemInfo.cpuModel || "unknown",
    cpuCount: systemInfo.cpuCount || nav?.hardwareConcurrency || 0,
    totalMemoryMb: systemInfo.totalMemoryMb || 0,
    availableMemoryMb: systemInfo.availableMemoryMb || 0,
    userAgent: nav?.userAgent || "unknown",
    language: nav?.language || "unknown",
    online: typeof navigator === "undefined" ? true : navigator.onLine,
    hardwareConcurrency: nav?.hardwareConcurrency || 0,
    deviceMemoryGb: nav?.deviceMemory || null,
    viewport: typeof window === "undefined" ? "unknown" : `${window.innerWidth}x${window.innerHeight}`,
  };
}

const sessionCounts = new Map<string, number>();
let sending = false;
let sentThisSession = 0;
const MAX_SENDS_PER_SESSION = 10;

function safeStorage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

function hash(value: string): string {
  let result = 5381;
  for (let i = 0; i < value.length; i += 1) result = ((result << 5) - result) ^ value.charCodeAt(i);
  return Math.abs(result).toString(36).toUpperCase().padStart(6, "0").slice(-6);
}

function appVersion(): string {
  try {
    return typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "unknown";
  } catch {
    return "unknown";
  }
}

function currentWindowLabel(): string | undefined {
  try {
    if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) return undefined;
    const internals = (window as unknown as { __TAURI_INTERNALS__?: { metadata?: { currentWindow?: { label?: string } } } }).__TAURI_INTERNALS__;
    return internals?.metadata?.currentWindow?.label || "main";
  } catch {
    return undefined;
  }
}

function errorText(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) return { message: error.message || error.name, stack: error.stack };
  if (typeof error === "string") return { message: error };
  try {
    return { message: JSON.stringify(error) || String(error) };
  } catch {
    return { message: String(error) };
  }
}

function readQueue(): ErrorReport[] {
  const storage = safeStorage();
  if (!storage) return [];
  try {
    return JSON.parse(storage.getItem(ERROR_REPORT_QUEUE_KEY) || "[]") as ErrorReport[];
  } catch {
    return [];
  }
}

function writeQueue(queue: ErrorReport[]): void {
  safeStorage()?.setItem(ERROR_REPORT_QUEUE_KEY, JSON.stringify(queue.slice(-ERROR_REPORT_MAX_QUEUE)));
}

function memoryLabel(mb: number): string {
  return mb > 0 ? `${(mb / 1024).toFixed(1)} GB` : "unavailable";
}

function d(report: ErrorReport): SystemDiagnostics {
  return {
    ...{
      os: "unknown",
      osVersion: "unknown",
      architecture: "unknown",
      cpuModel: "unknown",
      cpuCount: 0,
      totalMemoryMb: 0,
      availableMemoryMb: 0,
      userAgent: report.userAgent,
      language: "unknown",
      online: true,
      hardwareConcurrency: 0,
      deviceMemoryGb: null,
      viewport: "unknown",
    },
    ...(report.diagnostics || {}),
    ...systemInfo,
  };
}

export function buildDiscordPayload(report: ErrorReport): string {
  const diag = d(report);
  const fields: DiscordEmbedField[] = [
    { name: "Crash type", value: report.type, inline: true },
    { name: "Scope", value: report.severity, inline: true },
    { name: "Component", value: report.component || "unknown", inline: true },
    { name: "Occurrences this session", value: report.occurrence > 1 ? `${report.occurrence} times` : "1 time", inline: true },
    { name: "App version", value: report.appVersion, inline: true },
    { name: "Operating system", value: `${diag.os} ${diag.osVersion}`.slice(0, 1000), inline: true },
    { name: "Architecture", value: diag.architecture, inline: true },
    { name: "Processor", value: diag.cpuModel !== "unknown" ? `${diag.cpuModel} (${diag.cpuCount} cores)`.slice(0, 1000) : "unknown", inline: false },
    { name: "Memory", value: `${memoryLabel(diag.availableMemoryMb)} available of ${memoryLabel(diag.totalMemoryMb)}`, inline: true },
    { name: "Locale · screen · network", value: `${diag.language} · ${diag.viewport} · ${diag.online ? "online" : "offline"}`, inline: true },
    { name: "Runtime", value: `${diag.hardwareConcurrency} logical cores`, inline: true },
    { name: "WebView", value: diag.userAgent.slice(0, 1000), inline: false },
  ];
  if (report.stack) {
    fields.push({ name: "Stack trace", value: `\`\`\`\n${report.stack.slice(0, 980)}\n\`\`\``, inline: false });
  }
  return JSON.stringify({
    username: "ActOne Crash Reports",
    embeds: [
      {
        title: `ActOne crash ${report.code}`,
        description: (report.message || "Unknown error").slice(0, 1000),
        color: 0xef5350,
        timestamp: report.timestamp,
        fields,
        footer: { text: "Automatic crash report" },
      },
    ],
  });
}

async function sendToDiscord(report: ErrorReport): Promise<void> {
  if (isDevReporting()) return;
  const payload = buildDiscordPayload(report);
  if (import.meta.env?.MODE === "test" && CRASH_REPORT_WEBHOOK_URL.includes("discord.com")) {
    throw new Error("network disabled in tests");
  }
  const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
  if (isTauri) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("send_error_report", { webhookUrl: CRASH_REPORT_WEBHOOK_URL, payload });
    return;
  }
  const response = await fetch(CRASH_REPORT_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
  });
  if (!response.ok) throw new Error(`Discord returned ${response.status}`);
}

export async function flushErrorReports(): Promise<void> {
  if (sending || sentThisSession >= MAX_SENDS_PER_SESSION) return;
  sending = true;
  try {
    let queue = readQueue();
    while (queue.length && sentThisSession < MAX_SENDS_PER_SESSION) {
      try {
        await sendToDiscord(queue[0]);
        const sentCode = queue[0].code;
        sentThisSession += 1;
        queue = readQueue().filter((report) => report.code !== sentCode);
        writeQueue(queue);
      } catch {
        break;
      }
    }
  } finally {
    sending = false;
  }
}

export function captureError(input: {
  type: ErrorReportType;
  error?: unknown;
  message?: string;
  stack?: string;
  component?: string;
  filename?: string;
  severity?: ErrorSeverity;
  windowLabel?: string;
}): ErrorReport {
  const parsed = input.error === undefined ? { message: input.message || "Unknown error", stack: input.stack } : errorText(input.error);
  const message = input.message || parsed.message;
  const stack = input.stack || parsed.stack;
  const key = hash(`${input.type}:${input.component || ""}:${message}:${stack || ""}`);
  const occurrence = (sessionCounts.get(key) || 0) + 1;
  sessionCounts.set(key, occurrence);
  const randPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  const report: ErrorReport = {
    code: `ACT-${appVersion()}-${Date.now().toString(36).toUpperCase()}-${randPart}-${key}`,
    timestamp: new Date().toISOString(),
    type: input.type,
    severity: input.severity ?? "window",
    message,
    stack,
    component: input.component,
    filename: input.filename,
    windowLabel: input.windowLabel ?? currentWindowLabel(),
    appVersion: appVersion(),
    userAgent: typeof navigator === "undefined" ? "unknown" : navigator.userAgent,
    occurrence,
    diagnostics: diagnostics(),
  };
  logger.error("error-report", `${report.code}: ${message}`, input.error);
  if (occurrence === 1 && !isDevReporting()) {
    const queue = readQueue();
    queue.push(report);
    writeQueue(queue);
    void flushErrorReports();
  }
  return report;
}

export function formatErrorDetails(report: ErrorReport): string {
  const diag = d(report);
  return [
    `Error code: ${report.code}`,
    `Type: ${report.type}`,
    `Time: ${report.timestamp}`,
    `Version: ${report.appVersion}`,
    `OS: ${diag.os} ${diag.osVersion}`,
    `Processor: ${diag.cpuModel} (${diag.cpuCount} cores)`,
    `Memory: ${memoryLabel(diag.availableMemoryMb)} available of ${memoryLabel(diag.totalMemoryMb)}`,
    `Message: ${report.message}`,
    report.stack || "",
  ].join("\n");
}
