import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { showCrashScreen, readCrashWindowReport, CrashScreen } from "./CrashScreen";
import { CRASH_REPORT_WINDOW_KEY } from "../constants/reporting";
import type { ErrorReport } from "../utils/errorReport";

vi.mock("../constants/reporting", () => ({
  CRASH_REPORT_WEBHOOK_URL: "https://discord.example.test/webhook",
  ERROR_REPORT_QUEUE_KEY: "actone-error-report-queue",
  ERROR_REPORT_MAX_QUEUE: 50,
  CRASH_REPORT_WINDOW_KEY: "actone-crash-report-latest",
}));

function sampleReport(overrides: Partial<ErrorReport> = {}): ErrorReport {
  return {
    code: "ACT-0.4.3-TEST123-ABCDEF",
    timestamp: new Date().toISOString(),
    type: "uncaught",
    severity: "window",
    message: "boom",
    appVersion: "0.4.3",
    userAgent: "test",
    occurrence: 1,
    diagnostics: {
      os: "windows", osVersion: "Windows 11 Pro", architecture: "x86_64", cpuModel: "AMD Ryzen 5 8400F", cpuCount: 12,
      totalMemoryMb: 32768, availableMemoryMb: 18432, userAgent: "test", language: "en-GB", online: true,
      hardwareConcurrency: 12, deviceMemoryMb: null, viewport: "1000x700",
    },
    ...overrides,
  };
}

describe("showCrashScreen", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("open", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("stores the report in localStorage", () => {
    const report = sampleReport();
    showCrashScreen(report);
    const stored = JSON.parse(localStorage.getItem(CRASH_REPORT_WINDOW_KEY) as string);
    expect(stored.code).toBe(report.code);
  });

  it("opens the crash window in non-Tauri environments", () => {
    showCrashScreen(sampleReport());
    expect(window.open).toHaveBeenCalledWith("/?modal=crash", "actone-crash", expect.any(String));
  });

  it("readCrashWindowReport returns the stored report", () => {
    const report = sampleReport();
    showCrashScreen(report);
    expect(readCrashWindowReport()?.code).toBe(report.code);
  });

  it("readCrashWindowReport returns null when nothing is stored", () => {
    expect(readCrashWindowReport()).toBeNull();
  });
});

describe("CrashScreen", () => {
  it("shows Restart App for an app-level crash", async () => {
    render(<CrashScreen report={sampleReport({ severity: "app" })} />);
    await waitFor(() => expect(screen.getByText("Restart App")).toBeTruthy());
    expect(screen.getByText("ACT-0.4.3-TEST123-ABCDEF")).toBeTruthy();
  });

  it("shows Reload Window for a window-level crash with a label", async () => {
    render(<CrashScreen report={sampleReport({ severity: "window", windowLabel: "main" })} />);
    await waitFor(() => expect(screen.getByText("Reload Window")).toBeTruthy());
  });

  it("shows no primary recovery for a pane-level report", async () => {
    render(<CrashScreen report={sampleReport({ severity: "pane" })} />);
    await waitFor(() => expect(screen.getByText("ACT-0.4.3-TEST123-ABCDEF")).toBeTruthy());
    expect(screen.queryByText("Restart App")).toBeNull();
    expect(screen.queryByText("Reload Window")).toBeNull();
  });
});
