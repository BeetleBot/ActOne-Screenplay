import { BUG_REPORT_WEBHOOK_URL } from "../constants/reporting";
import {
  getSystemDiagnostics,
  getScriptReportContext,
  getAppVersion,
  formatUptime,
  type SystemDiagnostics,
  type ScriptReportContext,
} from "./errorReport";
import { logger } from "./logger";

export interface BugReportInput {
  name?: string;
  email?: string;
  discordUsername?: string;
  description: string;
}

export interface BugReportPayload {
  code: string;
  timestamp: string;
  input: BugReportInput;
  diagnostics: SystemDiagnostics;
  scriptContext: ScriptReportContext;
  sessionUptime: string;
  recentLogs?: string;
}

function memoryLabel(mb: number): string {
  return mb > 0 ? `${(mb / 1024).toFixed(1)} GB` : "unavailable";
}

function generateBugReportCode(): string {
  const version = getAppVersion();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  const time = Date.now().toString(36).toUpperCase();
  return `BUG-${version}-${time}-${rand}`;
}

export function buildBugReportDiscordPayload(report: BugReportPayload): string {
  const diag = report.diagnostics;
  const fields = [
    { name: "Reporter", value: report.input.name?.trim() || "Anonymous", inline: true },
    { name: "Contact Email", value: report.input.email?.trim() || "Not provided", inline: true },
    { name: "Discord", value: report.input.discordUsername?.trim() || "Not provided", inline: true },
    { name: "App version", value: getAppVersion(), inline: true },
    { name: "Operating system", value: `${diag.os} ${diag.osVersion}`.slice(0, 1000), inline: true },
    { name: "Architecture", value: diag.architecture, inline: true },
    { name: "Processor", value: diag.cpuModel !== "unknown" ? `${diag.cpuModel} (${diag.cpuCount} cores)`.slice(0, 1000) : "unknown", inline: false },
    { name: "Memory", value: `${memoryLabel(diag.availableMemoryMb)} available of ${memoryLabel(diag.totalMemoryMb)}`, inline: true },
    { name: "Locale · screen · network", value: `${diag.language} · ${diag.viewport} · ${diag.online ? "online" : "offline"}`, inline: true },
    { name: "Session uptime", value: report.sessionUptime, inline: true },
  ];

  const ctx = report.scriptContext;
  if (ctx && Object.keys(ctx).length > 0) {
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

  if (report.recentLogs) {
    fields.push({ name: "Recent action trail", value: `\`\`\`text\n${report.recentLogs.slice(0, 980)}\n\`\`\``, inline: false });
  }

  return JSON.stringify({
    username: "ActOne Bug Reports",
    embeds: [
      {
        title: `🐛 ActOne Bug Report: ${report.code}`,
        description: report.input.description.trim().slice(0, 2000),
        color: 0x3b82f6, // Blue (#3B82F6)
        timestamp: report.timestamp,
        fields,
        footer: { text: "User submitted bug report" },
      },
    ],
  });
}

export function buildBugReportAttachmentText(report: BugReportPayload): string {
  const diag = report.diagnostics;
  return [
    `================================================================`,
    `ActOne User Bug Report: ${report.code}`,
    `Timestamp: ${report.timestamp}`,
    `App Version: ${getAppVersion()}`,
    `Reporter Name: ${report.input.name?.trim() || "Anonymous"}`,
    `Contact Email: ${report.input.email?.trim() || "Not provided"}`,
    `Discord Username: ${report.input.discordUsername?.trim() || "Not provided"}`,
    `Session Uptime: ${report.sessionUptime}`,
    `================================================================`,
    ``,
    `[BUG DESCRIPTION]`,
    report.input.description.trim(),
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
    `[RECENT ACTION TRAIL]`,
    report.recentLogs || "(no recent logs)",
    ``,
    `================================================================`,
  ].join("\n");
}

export async function sendBugReport(input: BugReportInput): Promise<{ success: boolean; code: string; error?: string }> {
  const code = generateBugReportCode();
  const timestamp = new Date().toISOString();
  const diag = getSystemDiagnostics();
  const scriptCtx = getScriptReportContext();
  const recentLogs = logger.formatRecentLogs(30);
  const uptime = formatUptime(performance.now());

  const payloadData: BugReportPayload = {
    code,
    timestamp,
    input,
    diagnostics: diag,
    scriptContext: scriptCtx,
    sessionUptime: uptime,
    recentLogs: recentLogs || undefined,
  };

  const payload = buildBugReportDiscordPayload(payloadData);
  const attachmentName = `${code}.txt`;
  const attachmentData = buildBugReportAttachmentText(payloadData);

  logger.info("bug-report", `Submitting user bug report ${code}`);

  try {
    const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
    if (isTauri) {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("send_error_report", {
        webhookUrl: BUG_REPORT_WEBHOOK_URL,
        payload,
        attachmentName,
        attachmentData,
      });
      return { success: true, code };
    }

    if (typeof FormData !== "undefined") {
      const formData = new FormData();
      formData.append("payload_json", payload);
      const blob = new Blob([attachmentData], { type: "text/plain" });
      formData.append("files[0]", blob, attachmentName);
      const response = await fetch(BUG_REPORT_WEBHOOK_URL, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error(`Discord returned status ${response.status}`);
      }
      return { success: true, code };
    }

    const response = await fetch(BUG_REPORT_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    });
    if (!response.ok) {
      throw new Error(`Discord returned status ${response.status}`);
    }
    return { success: true, code };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("bug-report", `Failed to send bug report ${code}`, err);
    return { success: false, code, error: message };
  }
}
