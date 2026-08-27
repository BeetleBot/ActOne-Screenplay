import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { copyToClipboard, readFromClipboard } from "./clipboard";

describe("clipboard utility", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("copies using navigator.clipboard when available", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
        readText: vi.fn(),
      },
    });

    const result = await copyToClipboard("hello world");
    expect(result).toBe(true);
    expect(writeTextMock).toHaveBeenCalledWith("hello world");
  });

  it("falls back to execCommand if navigator.clipboard fails without throwing", async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error("Permission denied")),
        readText: vi.fn(),
      },
    });

    const execCommandMock = vi.fn().mockReturnValue(true);
    document.execCommand = execCommandMock;

    const result = await copyToClipboard("fallback text");
    expect(result).toBe(true);
    expect(execCommandMock).toHaveBeenCalledWith("copy");
  });

  it("handles clipboard read gracefully when navigator fails", async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(),
        readText: vi.fn().mockRejectedValue(new Error("Not allowed")),
      },
    });

    const result = await readFromClipboard();
    expect(result).toBe("");
  });
});
