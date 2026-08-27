import { describe, it, expect, beforeEach } from "vitest";
import { logger } from "./logger";

describe("logger utility", () => {
  beforeEach(() => {
    logger.clearRecentLogs();
  });

  it("records info, warn, and error logs into recent logs", () => {
    logger.info("test-module", "test info message");
    logger.warn("test-module", "test warning message");
    logger.error("test-module", "test error message", new Error("err"));

    const logs = logger.getRecentLogs();
    expect(logs).toHaveLength(3);
    expect(logs[0].level).toBe("info");
    expect(logs[0].message).toBe("test info message");
    expect(logs[1].level).toBe("warn");
    expect(logs[2].level).toBe("error");
    expect(logs[2].stack).toBeDefined();
  });

  it("formats recent log lines with timestamps and levels", () => {
    logger.info("editor", "File opened");
    logger.warn("export", "Font fallback");

    const formatted = logger.formatRecentLogs();
    expect(formatted).toContain("[INF] [editor] File opened");
    expect(formatted).toContain("[WRN] [export] Font fallback");
  });

  it("limits recent logs buffer to maximum count", () => {
    for (let i = 0; i < 60; i += 1) {
      logger.info("bench", `message ${i}`);
    }

    const logs = logger.getRecentLogs();
    expect(logs).toHaveLength(50);
    expect(logs[0].message).toBe("message 10");
    expect(logs[49].message).toBe("message 59");
  });
});
