import {
  CRASH_REPORT_WEBHOOK_URL,
  ERROR_REPORT_MAX_QUEUE,
  ERROR_REPORT_QUEUE_KEY,
  ERROR_REPORT_SENT_KEYS,
  ERROR_REPORT_IN_FLIGHT_KEY,
} from "../constants/reporting";
import { logger } from "./logger";

export type ErrorReportType = "render" | "uncaught" | "unhandled-rejection" | "rust-panic" | "pre-mount";

export type ErrorSeverity = "pane" | "window" | "app";

export interface ScriptReportContext {
  mode?: "Screenplay" | "Prose";
  scenesCount?: number;
  linesCount?: number;
  estimatedPages?: number;
  activeView?: string;
}

export interface ErrorReport {
  code: string;
  timestamp: string;
  type: ErrorReportType;
  severity: ErrorSeverity;
  message: string;
  stack?: string;
  recentLogs?: string;
  sessionUptime?: string;
  scriptContext?: ScriptReportContext;
  component?: string;
  filename?: string;
  windowLabel?: string;
  appVersion: string;
  userAgent: string;
  occurrence: number;
  occurrenceText?: string;
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
let scriptContextState: ScriptReportContext = {};
let lastBoundaryCaughtAt = 0;
const sessionStartedAt = Date.now();
const sessionBurstMap = new Map<string, { firstAt: number; count: number; lastAt: number }>();

function isDevReporting(): boolean {
  return Boolean(import.meta.env?.DEV && import.meta.env?.MODE !== "test");
}

export function setSystemDiagnostics(info: Partial<SystemDiagnostics>): void {
  systemInfo = { ...systemInfo, ...info };
}

export function setScriptReportContext(ctx: Partial<ScriptReportContext>): void {
  scriptContextState = { ...scriptContextState, ...ctx };
}

export function markBoundaryCaught(): void {
  lastBoundaryCaughtAt = Date.now();
}

export function resetErrorReportSessionForTests(): void {
  sessionCounts.clear();
  sessionBurstMap.clear();
  sentThisSession = 0;
  sending = false;
  systemInfo = {};
  scriptContextState = {};
  lastBoundaryCaughtAt = 0;
}

export function wasJustCaughtByBoundary(windowMs = 5000): boolean {
  return Date.now() - lastBoundaryCaughtAt < windowMs;
}

export function formatUptime(uptimeMs: number): string {
  const totalSecs = Math.max(0, Math.floor(uptimeMs / 1000));
  if (totalSecs < 60) return `${totalSecs}s`;
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours}h ${remMins}m`;
}

function severityColor(severity?: ErrorSeverity): number {
  switch (severity) {
    case "app":
      return 0xe53935; // 🔴 Critical Red (#E53935)
    case "window":
      return 0xfb8c00; // 🟠 Orange (#FB8C00)
    case "pane":
      return 0xfdd835; // 🟡 Yellow (#FDD835)
    default:
      return 0xe53935;
  }
}

export function getScriptReportContext(): ScriptReportContext {
  return { ...scriptContextState };
}

export function getSystemDiagnostics(): SystemDiagnostics {
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

function diagnostics(): SystemDiagnostics {
  return getSystemDiagnostics();
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

export function getAppVersion(): string {
  try {
    return typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "unknown";
  } catch {
    return "unknown";
  }
}

function appVersion(): string {
  return getAppVersion();
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
  const occurrenceVal = report.occurrenceText || (report.occurrence > 1 ? `${report.occurrence} times` : "1 time");
  const fields: DiscordEmbedField[] = [
    { name: "Crash type", value: report.type, inline: true },
    { name: "Scope", value: report.severity, inline: true },
    { name: "Component", value: report.component || "unknown", inline: true },
    { name: "Occurrences", value: occurrenceVal, inline: true },
    { name: "Session uptime", value: report.sessionUptime || "unknown", inline: true },
    { name: "App version", value: report.appVersion, inline: true },
    { name: "Operating system", value: `${diag.os} ${diag.osVersion}`.slice(0, 1000), inline: true },
    { name: "Architecture", value: diag.architecture, inline: true },
    { name: "Processor", value: diag.cpuModel !== "unknown" ? `${diag.cpuModel} (${diag.cpuCount} cores)`.slice(0, 1000) : "unknown", inline: false },
    { name: "Memory", value: `${memoryLabel(diag.availableMemoryMb)} available of ${memoryLabel(diag.totalMemoryMb)}`, inline: true },
    { name: "Locale · screen · network", value: `${diag.language} · ${diag.viewport} · ${diag.online ? "online" : "offline"}`, inline: true },
    { name: "Runtime", value: `${diag.hardwareConcurrency} logical cores`, inline: true },
  ];

  if (report.scriptContext) {
    const ctx = report.scriptContext;
    const parts: string[] = [];
    if (ctx.mode) parts.push(`Mode: ${ctx.mode}`);
    if (ctx.estimatedPages) parts.push(`~${ctx.estimatedPages} pages`);
    if (ctx.scenesCount !== undefined) parts.push(`${ctx.scenesCount} scenes`);
    if (ctx.linesCount !== undefined) parts.push(`${ctx.linesCount} lines`);
    if (ctx.activeView) parts.push(`View: ${ctx.activeView}`);
    if (parts.length > 0) {
      fields.push({ name: "Script context", value: parts.join(" · ").slice(0, 1000), inline: false });
    }
  }

  fields.push({ name: "WebView", value: diag.userAgent.slice(0, 1000), inline: false });

  if (report.stack) {
    fields.push({ name: "Stack trace", value: `\`\`\`\n${report.stack.slice(0, 980)}\n\`\`\``, inline: false });
  }
  if (report.recentLogs) {
    fields.push({ name: "Recent action trail", value: `\`\`\`text\n${report.recentLogs.slice(0, 980)}\n\`\`\``, inline: false });
  }
  return JSON.stringify({
    username: "ActOne Crash Reports",
    embeds: [
      {
        title: `ActOne crash ${report.code}`,
        description: (report.message || "Unknown error").slice(0, 1000),
        color: severityColor(report.severity),
        timestamp: report.timestamp,
        fields,
        footer: { text: "Automatic crash report" },
      },
    ],
  });
}

export function buildLogAttachmentText(report: ErrorReport): string {
  const diag = d(report);
  const sections = [
    `================================================================`,
    `ActOne Crash Report: ${report.code}`,
    `Timestamp: ${report.timestamp}`,
    `App Version: ${report.appVersion}`,
    `Severity: ${report.severity}`,
    `Type: ${report.type}`,
    `Component: ${report.component || "unknown"}`,
    `Occurrences: ${report.occurrenceText || (report.occurrence > 1 ? `${report.occurrence} times` : "1 time")}`,
    `Session Uptime: ${report.sessionUptime || "unknown"}`,
    `================================================================`,
    ``,
    `[SYSTEM DIAGNOSTICS]`,
    `OS: ${diag.os} ${diag.osVersion}`,
    `Architecture: ${diag.architecture}`,
    `Processor: ${diag.cpuModel} (${diag.cpuCount} cores)`,
    `Memory: ${memoryLabel(diag.availableMemoryMb)} available / ${memoryLabel(diag.totalMemoryMb)} total`,
    `Logical Cores: ${diag.hardwareConcurrency}`,
    `Display Viewport: ${diag.viewport}`,
    `Language: ${diag.language}`,
    `Network: ${diag.online ? "online" : "offline"}`,
    `WebView: ${diag.userAgent}`,
    ``,
    `[ERROR DETAILS]`,
    `Message: ${report.message}`,
    `Stack Trace:`,
    report.stack || "(no stack trace)",
    ``,
    `[RECENT ACTION TRAIL]`,
    report.recentLogs || "(no recent logs)",
    ``,
    `================================================================`,
  ];
  return sections.join("\n");
}

async function sendToDiscord(report: ErrorReport): Promise<void> {
  if (isDevReporting()) return;
  const payload = buildDiscordPayload(report);
  if (import.meta.env?.MODE === "test" && CRASH_REPORT_WEBHOOK_URL.includes("discord.com")) {
    throw new Error("network disabled in tests");
  }
  const attachmentName = `crash-${report.code}.txt`;
  const attachmentData = buildLogAttachmentText(report);
  const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
  if (isTauri) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("send_error_report", {
      webhookUrl: CRASH_REPORT_WEBHOOK_URL,
      payload,
      attachmentName,
      attachmentData,
    });
    return;
  }
  if (typeof FormData !== "undefined") {
    const formData = new FormData();
    formData.append("payload_json", payload);
    const blob = new Blob([attachmentData], { type: "text/plain" });
    formData.append("files[0]", blob, attachmentName);
    const response = await fetch(CRASH_REPORT_WEBHOOK_URL, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) throw new Error(`Discord returned ${response.status}`);
    return;
  }
  const response = await fetch(CRASH_REPORT_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
  });
  if (!response.ok) throw new Error(`Discord returned ${response.status}`);
}

function readSentKeys(): Set<string> {
  const storage = safeStorage();
  if (!storage) return new Set();
  try {
    const list = JSON.parse(storage.getItem(ERROR_REPORT_SENT_KEYS) || "[]") as string[];
    return new Set(list);
  } catch {
    return new Set();
  }
}

function recordSentKey(code: string): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    const sent = Array.from(readSentKeys());
    if (!sent.includes(code)) {
      sent.push(code);
      storage.setItem(ERROR_REPORT_SENT_KEYS, JSON.stringify(sent.slice(-100)));
    }
  } catch {
    /* storage unavailable */
  }
}

function readInFlight(): Record<string, number> {
  const storage = safeStorage();
  if (!storage) return {};
  try {
    return JSON.parse(storage.getItem(ERROR_REPORT_IN_FLIGHT_KEY) || "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

function claimInFlight(code: string, leaseMs = 30000): boolean {
  const storage = safeStorage();
  if (!storage) return true;
  try {
    const now = Date.now();
    const inFlight = readInFlight();
    const cleaned: Record<string, number> = {};
    for (const [k, ts] of Object.entries(inFlight)) {
      if (now - ts < leaseMs) {
        cleaned[k] = ts;
      }
    }
    if (cleaned[code] && now - cleaned[code] < leaseMs) {
      return false;
    }
    cleaned[code] = now;
    storage.setItem(ERROR_REPORT_IN_FLIGHT_KEY, JSON.stringify(cleaned));
    return true;
  } catch {
    return true;
  }
}

function releaseInFlight(code: string): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    const inFlight = readInFlight();
    delete inFlight[code];
    storage.setItem(ERROR_REPORT_IN_FLIGHT_KEY, JSON.stringify(inFlight));
  } catch {
    /* storage unavailable */
  }
}

export async function flushErrorReports(): Promise<void> {
  if (sending || sentThisSession >= MAX_SENDS_PER_SESSION) return;
  sending = true;
  try {
    let queue = readQueue();
    const sentKeys = readSentKeys();
    const filteredQueue = queue.filter((report) => !sentKeys.has(report.code));
    if (filteredQueue.length !== queue.length) {
      writeQueue(filteredQueue);
      queue = filteredQueue;
    }

    while (queue.length && sentThisSession < MAX_SENDS_PER_SESSION) {
      const current = queue[0];
      if (!current) break;

      if (readSentKeys().has(current.code)) {
        queue = readQueue().filter((report) => report.code !== current.code);
        writeQueue(queue);
        continue;
      }

      if (!claimInFlight(current.code)) {
        queue = queue.slice(1);
        continue;
      }

      try {
        await sendToDiscord(current);
        sentThisSession += 1;
        recordSentKey(current.code);
        queue = readQueue().filter((report) => report.code !== current.code);
        writeQueue(queue);
      } catch {
        releaseInFlight(current.code);
        break;
      } finally {
        releaseInFlight(current.code);
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

  const now = Date.now();
  const burst = sessionBurstMap.get(key);
  let burstCount = 1;
  let burstDuration = 0;
  if (burst) {
    burst.count += 1;
    burstDuration = Math.max(0.1, (now - burst.firstAt) / 1000);
    burst.lastAt = now;
    burstCount = burst.count;
  } else {
    sessionBurstMap.set(key, { firstAt: now, count: 1, lastAt: now });
  }

  const occurrenceText =
    burstCount > 1
      ? `Repeated ${burstCount} times in ${burstDuration.toFixed(1)}s`
      : occurrence > 1
      ? `${occurrence} times`
      : "1 time";

  const randPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  const recentLogs = logger.formatRecentLogs(30);
  const report: ErrorReport = {
    code: `ACT-${appVersion()}-${Date.now().toString(36).toUpperCase()}-${randPart}-${key}`,
    timestamp: new Date().toISOString(),
    type: input.type,
    severity: input.severity ?? "window",
    message,
    stack,
    recentLogs: recentLogs || undefined,
    sessionUptime: formatUptime(now - sessionStartedAt),
    scriptContext: Object.keys(scriptContextState).length > 0 ? { ...scriptContextState } : undefined,
    component: input.component,
    filename: input.filename,
    windowLabel: input.windowLabel ?? currentWindowLabel(),
    appVersion: appVersion(),
    userAgent: typeof navigator === "undefined" ? "unknown" : navigator.userAgent,
    occurrence,
    occurrenceText,
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
  const lines = [
    `Error code: ${report.code}`,
    `Type: ${report.type}`,
    `Time: ${report.timestamp}`,
    `Version: ${report.appVersion}`,
    `OS: ${diag.os} ${diag.osVersion}`,
    `Processor: ${diag.cpuModel} (${diag.cpuCount} cores)`,
    `Memory: ${memoryLabel(diag.availableMemoryMb)} available of ${memoryLabel(diag.totalMemoryMb)}`,
    `Message: ${report.message}`,
    report.stack || "",
  ];
  if (report.recentLogs) {
    lines.push(`\nRecent action trail:\n${report.recentLogs}`);
  }
  return lines.join("\n");
}
