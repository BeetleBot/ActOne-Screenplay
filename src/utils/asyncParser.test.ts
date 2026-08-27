import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parseScreenplayAsync } from "./asyncParser";
import { parseScreenplay, LineType } from "../parser";

describe("asyncParser - parseScreenplayAsync", () => {
  const originalWorker = globalThis.Worker;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.Worker = originalWorker;
  });

  it("falls back to synchronous parsing when Worker is undefined", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).Worker = undefined;

    const text = `INT. OFFICE - DAY\n\nJOHN\nHello world!`;
    const doc = await parseScreenplayAsync(text);

    expect(doc).toBeDefined();
    expect(doc.lines.length).toBeGreaterThan(0);
    expect(doc.lines[0].type).toBe(LineType.heading);
    expect(doc.lines[0].text).toBe("INT. OFFICE - DAY");
  });

  it("handles paperSize argument in fallback mode", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).Worker = undefined;

    const text = `INT. HOUSE - DAY\n\nAction text here.`;
    const expected = parseScreenplay(text, "a4");
    const actual = await parseScreenplayAsync(text, "a4");

    expect(actual.lines).toEqual(expected.lines);
    expect(actual.pageBreaks).toEqual(expected.pageBreaks);
  });

  it("uses Worker and parses asynchronously when Worker is available", async () => {
    let workerPostMessage: (msg: unknown) => void = () => {};

    class MockWorker {
      public onmessage: ((e: MessageEvent) => void) | null = null;
      constructor() {
        workerPostMessage = (msg: unknown) => {
          const req = msg as { id: number; text: string; paperSize?: "a4" | "letter" };
          const doc = parseScreenplay(req.text, req.paperSize);
          if (this.onmessage) {
            this.onmessage(new MessageEvent("message", { data: { id: req.id, type: "parsed", doc } }));
          }
        };
      }
      public postMessage(msg: unknown) {
        workerPostMessage(msg);
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).Worker = MockWorker as any;

    const text = `EXT. STREET - NIGHT\n\nSARAH\nIs anyone there?`;
    const result = await parseScreenplayAsync(text);

    expect(result).toBeDefined();
    expect(result.lines.length).toBeGreaterThan(0);
    expect(result.lines.some((l) => l.text === "SARAH")).toBe(true);
  });
});
