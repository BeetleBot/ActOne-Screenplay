import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildBugReportDiscordPayload,
  buildBugReportAttachmentText,
  sendBugReport,
  type BugReportPayload,
} from "./bugReport";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const mockPayload: BugReportPayload = {
  code: "BUG-0.4.21-ABC1-XYZ2",
  timestamp: "2026-08-28T00:00:00.000Z",
  input: {
    name: "Jane Doe",
    email: "jane@example.com",
    discordUsername: "@janedoe",
    description: "Exporting PDF with dual dialogue crashes on scene 4.",
  },
  diagnostics: {
    os: "linux",
    osVersion: "Arch Linux rolling",
    architecture: "x86_64",
    cpuModel: "AMD Ryzen 5 8400F",
    cpuCount: 12,
    totalMemoryMb: 32768,
    availableMemoryMb: 24576,
    userAgent: "WebKitGTK 2.44",
    language: "en-US",
    online: true,
    hardwareConcurrency: 12,
    deviceMemoryGb: 32,
    viewport: "1920x1080",
  },
  scriptContext: {
    mode: "Screenplay",
    scenesCount: 48,
    linesCount: 2400,
    estimatedPages: 110,
  },
  sessionUptime: "15m 30s",
  recentLogs: "00:00:01 [INF] [app] App started\n00:00:05 [INF] [editor] Opened script",
};

describe("buildBugReportDiscordPayload", () => {
  it("formats a rich Discord embed with reporter info, diagnostics, and blue color", () => {
    const payloadStr = buildBugReportDiscordPayload(mockPayload);
    const payload = JSON.parse(payloadStr);

    expect(payload.username).toBe("ActOne Bug Reports");
    expect(payload.embeds).toHaveLength(1);
    const embed = payload.embeds[0];
    expect(embed.title).toContain("BUG-0.4.21-ABC1-XYZ2");
    expect(embed.description).toBe("Exporting PDF with dual dialogue crashes on scene 4.");
    expect(embed.color).toBe(0x3b82f6);

    const fieldNames = embed.fields.map((f: { name: string }) => f.name);
    expect(fieldNames).toContain("Reporter");
    expect(fieldNames).toContain("Contact Email");
    expect(fieldNames).toContain("Discord");
    expect(fieldNames).toContain("Operating system");
    expect(fieldNames).toContain("Session uptime");
    expect(fieldNames).toContain("Script context");
    expect(fieldNames).toContain("Recent action trail");

    const reporterField = embed.fields.find((f: { name: string }) => f.name === "Reporter");
    expect(reporterField.value).toBe("Jane Doe");

    const scriptField = embed.fields.find((f: { name: string }) => f.name === "Script context");
    expect(scriptField.value).toContain("Mode: Screenplay");
    expect(scriptField.value).toContain("48 scenes");
  });

  it("handles anonymous / empty optional inputs cleanly", () => {
    const anonPayload: BugReportPayload = {
      ...mockPayload,
      input: {
        description: "Simple bug without contact info.",
      },
    };
    const payload = JSON.parse(buildBugReportDiscordPayload(anonPayload));
    const embed = payload.embeds[0];
    const getVal = (name: string) => embed.fields.find((f: { name: string }) => f.name === name)?.value;

    expect(getVal("Reporter")).toBe("Anonymous");
    expect(getVal("Contact Email")).toBe("Not provided");
    expect(getVal("Discord")).toBe("Not provided");
  });
});

describe("buildBugReportAttachmentText", () => {
  it("builds a full text report with un-truncated diagnostics and user description", () => {
    const text = buildBugReportAttachmentText(mockPayload);
    expect(text).toContain("ActOne User Bug Report: BUG-0.4.21-ABC1-XYZ2");
    expect(text).toContain("Reporter Name: Jane Doe");
    expect(text).toContain("Contact Email: jane@example.com");
    expect(text).toContain("[BUG DESCRIPTION]");
    expect(text).toContain("Exporting PDF with dual dialogue crashes on scene 4.");
    expect(text).toContain("[SYSTEM DIAGNOSTICS]");
    expect(text).toContain("AMD Ryzen 5 8400F");
    expect(text).toContain("[RECENT ACTION TRAIL]");
    expect(text).toContain("[editor] Opened script");
  });
});

describe("sendBugReport", () => {
  it("submits the bug report to the webhook with multipart FormData in web environment", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendBugReport({
      name: "Tester",
      email: "test@example.com",
      description: "Found an alignment bug in toolbar",
    });

    expect(result.success).toBe(true);
    expect(result.code).toMatch(/^BUG-/);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("discord.com/api/webhooks/1542602477713498123");
    expect(init.body instanceof FormData).toBe(true);

    const formData = init.body as FormData;
    const payloadStr = formData.get("payload_json") as string;
    expect(payloadStr).toBeTruthy();
    expect(JSON.parse(payloadStr).embeds[0].description).toBe("Found an alignment bug in toolbar");
    expect(formData.get("files[0]")).toBeDefined();
  });

  it("handles fetch failure gracefully and returns error message", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendBugReport({
      description: "Network fail test",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Discord returned status 500");
  });
});
