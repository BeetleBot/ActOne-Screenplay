import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  captureError,
  flushErrorReports,
  buildDiscordPayload,
  buildLogAttachmentText,
  markBoundaryCaught,
  wasJustCaughtByBoundary,
  resetErrorReportSessionForTests,
  setSystemDiagnostics,
  isTransientTauriTeardownError,
  type ErrorReport,
} from "./errorReport";

import { ERROR_REPORT_MAX_QUEUE, ERROR_REPORT_QUEUE_KEY } from "../constants/reporting";

vi.mock("../constants/reporting", () => ({
  CRASH_REPORT_WEBHOOK_URL: "https://discord.example.test/webhook",
  ERROR_REPORT_QUEUE_KEY: "actone-error-report-queue",
  ERROR_REPORT_SENT_KEYS: "actone-error-report-sent-keys",
  ERROR_REPORT_IN_FLIGHT_KEY: "actone-error-report-in-flight",
  ERROR_REPORT_MAX_QUEUE: 50,
}));

function queue(): ErrorReport[] {
  return JSON.parse(localStorage.getItem(ERROR_REPORT_QUEUE_KEY) || "[]") as ErrorReport[];
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  resetErrorReportSessionForTests();
  vi.stubGlobal("__APP_VERSION__", "0.4.3");
  delete (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
});

describe("captureError", () => {
  it("assigns an error code with version, time and stack hash", () => {
    const report = captureError({ type: "render", error: new Error("boom") });
    expect(report.code).toMatch(/^ACT-0\.4\.3-[0-9A-Z]+-[0-9A-Z]{4}-[0-9A-Z]{6}$/);
  });

  it("captures message and stack from an Error", () => {
    const error = new Error("boom");
    const report = captureError({ type: "uncaught", error });
    expect(report.message).toBe("boom");
    expect(report.stack).toBeTruthy();
  });

  it("queues the first occurrence and reports occurrence counts", () => {
    const error = new Error("same error");
    captureError({ type: "render", error, component: "sidebar" });
    const second = captureError({ type: "render", error, component: "sidebar" });
    expect(queue()).toHaveLength(1);
    expect(second.occurrence).toBe(2);
  });

  it("includes runtime diagnostics", () => {
    const report = captureError({ type: "unhandled-rejection", message: "async failure" });
    expect(report.diagnostics).toBeDefined();
    expect(report.diagnostics?.userAgent).toBeTruthy();
    expect(report.diagnostics?.online).toBe(true);
  });

  it("defaults severity to window and allows explicit severity", () => {
    expect(captureError({ type: "uncaught", message: "x" }).severity).toBe("window");
    expect(captureError({ type: "render", message: "x", severity: "pane" }).severity).toBe("pane");
    expect(captureError({ type: "rust-panic", message: "x", severity: "app" }).severity).toBe("app");
  });
});

describe("flushErrorReports", () => {
  it("posts queued reports and clears them on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const report = captureError({ type: "render", error: new Error("flush me") });
    await vi.waitFor(() => expect(queue()).toHaveLength(0));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://discord.example.test/webhook");
    const payloadStr = init.body instanceof FormData ? (init.body.get("payload_json") as string) : (init.body as string);
    expect(JSON.parse(payloadStr).embeds[0].title).toContain(report.code);
    if (init.body instanceof FormData) {
      expect(init.body.get("files[0]")).toBeDefined();
    }
  });

  it("keeps queued reports when Discord rejects", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);
    captureError({ type: "uncaught", message: "keep me" });
    await flushErrorReports();
    expect(queue().length).toBeGreaterThan(0);
    vi.unstubAllGlobals();
  });

  it("stops after the per-session send limit", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    for (let i = 0; i < 12; i += 1) {
      captureError({ type: "uncaught", message: `distinct error ${i}` });
    }
    await vi.waitFor(() => expect(queue().length).toBe(2));
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(ERROR_REPORT_MAX_QUEUE);
    vi.unstubAllGlobals();
  });

  it("does not send duplicate reports if already marked as sent in localStorage", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const report = captureError({ type: "render", error: new Error("dedup test") });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    // Manually push report back to queue to simulate a secondary window loading the queue
    localStorage.setItem("actone-error-report-queue", JSON.stringify([report]));
    await flushErrorReports();

    // Fetch should NOT have been called a second time
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(queue()).toHaveLength(0);
    vi.unstubAllGlobals();
  });

  it("skips reports currently locked in-flight by another window", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const report: ErrorReport = {
      code: "ACT-0.4.3-LOCK-TEST",
      timestamp: new Date().toISOString(),
      type: "uncaught",
      severity: "window",
      message: "in flight error",
      appVersion: "0.4.3",
      userAgent: "test",
      occurrence: 1,
    };
    localStorage.setItem("actone-error-report-queue", JSON.stringify([report]));
    localStorage.setItem("actone-error-report-in-flight", JSON.stringify({ [report.code]: Date.now() }));

    await flushErrorReports();
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

describe("buildDiscordPayload", () => {
  it("builds a structured embed with diagnostics fields and severity color", () => {
    const report = captureError({ type: "render", error: new Error("payload"), severity: "window" });
    const payload = JSON.parse(buildDiscordPayload(report));
    expect(payload.embeds[0].title).toContain(report.code);
    expect(payload.embeds[0].color).toBe(0xfb8c00);
    const names = payload.embeds[0].fields.map((f: { name: string }) => f.name);
    expect(names).toContain("Operating system");
    expect(names).toContain("Processor");
    expect(names).toContain("Session uptime");
    expect(payload.embeds[0].footer.text).toBe("Automatic crash report");
  });

  it("applies critical red for app crashes and yellow for pane errors", () => {
    const appReport = captureError({ type: "rust-panic", message: "panic", severity: "app" });
    const paneReport = captureError({ type: "render", message: "sub-component", severity: "pane" });
    expect(JSON.parse(buildDiscordPayload(appReport)).embeds[0].color).toBe(0xe53935);
    expect(JSON.parse(buildDiscordPayload(paneReport)).embeds[0].color).toBe(0xfdd835);
  });

  it("attaches diagnostics collected after capture at send time", () => {
    const report = captureError({ type: "uncaught", message: "early" });
    setSystemDiagnostics({ os: "windows", osVersion: "Windows 11 Pro", architecture: "x86_64", cpuModel: "AMD Ryzen 5 8400F", cpuCount: 12, totalMemoryMb: 32768, availableMemoryMb: 18432 });
    const payload = JSON.parse(buildDiscordPayload(report));
    const get = (name: string) => payload.embeds[0].fields.find((f: { name: string }) => f.name === name)?.value;
    expect(get("Operating system")).toBe("windows Windows 11 Pro");
    expect(get("Architecture")).toBe("x86_64");
    expect(get("Processor")).toContain("AMD Ryzen 5 8400F");
    expect(get("Memory")).toBe("18.0 GB available of 32.0 GB");
  });

  it("attaches script context when provided", () => {
    const report = captureError({ type: "uncaught", message: "context error" });
    report.scriptContext = { mode: "Screenplay", estimatedPages: 110, scenesCount: 48, linesCount: 2400 };
    const payload = JSON.parse(buildDiscordPayload(report));
    const ctxField = payload.embeds[0].fields.find((f: { name: string }) => f.name === "Script context");
    expect(ctxField).toBeDefined();
    expect(ctxField.value).toContain("Mode: Screenplay");
    expect(ctxField.value).toContain("~110 pages");
    expect(ctxField.value).toContain("48 scenes");
  });

  it("attaches recent action trail to payload when present", () => {
    const report = captureError({ type: "uncaught", message: "trail error" });
    report.recentLogs = "12:00:00 [INF] [editor] Opened file\n12:00:01 [ERR] [export] Export failed";
    const payload = JSON.parse(buildDiscordPayload(report));
    const trailField = payload.embeds[0].fields.find((f: { name: string }) => f.name === "Recent action trail");
    expect(trailField).toBeDefined();
    expect(trailField.value).toContain("[editor] Opened file");
  });
});

describe("boundary suppression", () => {
  it("reports a boundary catch within the window", () => {
    markBoundaryCaught();
    expect(wasJustCaughtByBoundary()).toBe(true);
  });
});

describe("isTransientTauriTeardownError", () => {
  it("classifies resource id errors as transient", () => {
    expect(isTransientTauriTeardownError("The resource id 4083235040 is invalid.")).toBe(true);
    expect(isTransientTauriTeardownError("The resource ID 123 is invalid")).toBe(true);
  });

  it("classifies missing and dropped resource errors as transient", () => {
    expect(isTransientTauriTeardownError("Resource not found")).toBe(true);
    expect(isTransientTauriTeardownError("The resource is dropped")).toBe(true);
  });

  it("classifies in-progress drag operations as transient", () => {
    expect(isTransientTauriTeardownError("The operation is already in progress")).toBe(true);
  });

  it("does not classify real application errors as transient", () => {
    expect(isTransientTauriTeardownError("Cannot read properties of undefined (reading 'map')")).toBe(false);
    expect(isTransientTauriTeardownError("invalid resource name: 'foo'")).toBe(false);
    expect(isTransientTauriTeardownError("Something resourceful went wrong")).toBe(false);
  });
});

describe("buildLogAttachmentText", () => {
  it("generates a full un-truncated text report with diagnostics and action trail", () => {
    const report = captureError({ type: "uncaught", message: "attachment error" });
    report.recentLogs = "12:00:00 [INF] [app] Started\n12:00:05 [ERR] [editor] Crashed";
    const text = buildLogAttachmentText(report);
    expect(text).toContain(`ActOne Crash Report: ${report.code}`);
    expect(text).toContain("[SYSTEM DIAGNOSTICS]");
    expect(text).toContain("[RECENT ACTION TRAIL]");
    expect(text).toContain("[app] Started");
  });
});
