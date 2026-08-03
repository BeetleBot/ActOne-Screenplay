import { beforeEach, describe, expect, it, vi } from "vitest";
import { captureError, flushErrorReports, buildDiscordPayload, markBoundaryCaught, wasJustCaughtByBoundary, resetErrorReportSessionForTests, setSystemDiagnostics, type ErrorReport } from "./errorReport";
import { ERROR_REPORT_MAX_QUEUE, ERROR_REPORT_QUEUE_KEY } from "../constants/reporting";

vi.mock("../constants/reporting", () => ({
  CRASH_REPORT_WEBHOOK_URL: "https://discord.example.test/webhook",
  ERROR_REPORT_QUEUE_KEY: "actone-error-report-queue",
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
    expect(JSON.parse(init.body as string).embeds[0].title).toContain(report.code);
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
});

describe("buildDiscordPayload", () => {
  it("builds a structured embed with diagnostics fields", () => {
    const report = captureError({ type: "render", error: new Error("payload") });
    const payload = JSON.parse(buildDiscordPayload(report));
    expect(payload.embeds[0].title).toContain(report.code);
    expect(payload.embeds[0].color).toBe(0xef5350);
    const names = payload.embeds[0].fields.map((f: { name: string }) => f.name);
    expect(names).toContain("Operating system");
    expect(names).toContain("Processor");
    expect(payload.embeds[0].footer.text).toBe("Automatic crash report");
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
});

describe("boundary suppression", () => {
  it("reports a boundary catch within the window", () => {
    markBoundaryCaught();
    expect(wasJustCaughtByBoundary()).toBe(true);
  });
});
