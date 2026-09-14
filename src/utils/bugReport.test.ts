import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendBugReport } from "./bugReport";
import * as sentry from "./sentry";

vi.mock("./sentry", () => ({
  sendBugReportFeedback: vi.fn().mockResolvedValue("test-event-id"),
}));

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("sendBugReport", () => {
  it("submits the bug report to Sentry feedback successfully", async () => {
    const result = await sendBugReport({
      name: "Tester",
      email: "test@example.com",
      description: "Found an alignment bug in toolbar",
    });

    expect(result.success).toBe(true);
    expect(result.code).toMatch(/^BUG-/);
    expect(sentry.sendBugReportFeedback).toHaveBeenCalledTimes(1);
    expect(sentry.sendBugReportFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Found an alignment bug in toolbar",
        name: "Tester",
        email: "test@example.com",
      })
    );
  });

  it("handles failure gracefully and returns error message", async () => {
    vi.mocked(sentry.sendBugReportFeedback).mockRejectedValueOnce(new Error("Network error"));

    const result = await sendBugReport({
      description: "Network fail test",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Network error");
  });
});
