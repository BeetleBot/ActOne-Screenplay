import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  captureError,
  flushErrorReports,
  getSystemDiagnostics,
  setSystemDiagnostics,
  markBoundaryCaught,
  wasJustCaughtByBoundary,
  isTransientTauriTeardownError,
  buildLogAttachmentText,
  resetErrorReportSessionForTests,
  type ErrorReport,
} from "./errorReport";
import * as sentry from "./sentry";

vi.mock("./sentry", () => ({
  captureExceptionToSentry: vi.fn(),
  captureMessageToSentry: vi.fn(),
}));

function queue(): ErrorReport[] {
  return JSON.parse(localStorage.getItem("actone-error-report-queue") || "[]") as ErrorReport[];
}

beforeEach(() => {
  localStorage.clear();
  resetErrorReportSessionForTests();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("captureError", () => {
  it("enqueues a unique error report and generates a valid report code", () => {
    const error = new Error("Something broke");
    const report = captureError({ type: "render", error, component: "Editor" });

    expect(report.code).toMatch(/^ACT-.*-[A-Z0-9]{4}-[A-Z0-9]{6}$/);
    expect(report.type).toBe("render");
    expect(report.severity).toBe("window");
    expect(report.component).toBe("Editor");
    expect(report.message).toBe("Something broke");
    expect(report.stack).toContain("Something broke");
    expect(report.occurrence).toBe(1);
    expect(queue()).toHaveLength(1);
  });

  it("increments occurrence count and avoids re-queueing for duplicate errors", () => {
    const error = new Error("same error");
    const first = captureError({ type: "uncaught", error });
    const second = captureError({ type: "uncaught", error });

    expect(first.occurrence).toBe(1);
    expect(second.occurrence).toBe(2);
    expect(second.occurrenceText).toContain("Repeated 2 times");
    expect(queue()).toHaveLength(1);
  });

  it("includes runtime diagnostics", () => {
    setSystemDiagnostics({
      os: "linux",
      osVersion: "6.1.0",
      architecture: "x86_64",
      cpuModel: "AMD",
      cpuCount: 8,
      totalMemoryMb: 16384,
      availableMemoryMb: 8192,
    });

    captureError({ type: "unhandled-rejection", message: "async failure" });
    const stored = queue()[0];
    expect(stored.diagnostics?.os).toBe("linux");
    expect(stored.diagnostics?.architecture).toBe("x86_64");
    expect(getSystemDiagnostics().availableMemoryMb).toBe(8192);
  });
});

describe("flushErrorReports", () => {
  it("dispatches queued reports to Sentry and clears them", async () => {
    captureError({ type: "render", error: new Error("flush me") });
    await flushErrorReports();
    expect(queue()).toHaveLength(0);
    expect(sentry.captureMessageToSentry).toHaveBeenCalled();
  });

  it("stops after the per-session send limit", async () => {
    for (let i = 0; i < 12; i += 1) {
      captureError({ type: "uncaught", message: `distinct error ${i}` });
    }
    await vi.waitFor(() => expect(queue().length).toBe(2));
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

  it("does not classify real application errors as transient", () => {
    expect(isTransientTauriTeardownError("Cannot read properties of undefined (reading 'map')")).toBe(false);
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
  });
});
