import { expect, it, vi } from "vitest";
import { createDocumentCalculation, createSharedRequests, createTextCalculation } from "./documentDataStore";
import { getTextStatistics } from "./textStatistics";

it("is lazy, shares snapshots, and separates revisions and options", () => {
  const calculate = vi.fn((_input: object, options: string) => ({ options }));
  const read = createDocumentCalculation("test", calculate);
  const revision = {};
  expect(calculate).not.toHaveBeenCalled();
  expect(read(revision)).toBe(read(revision));
  expect(read(revision, "other")).not.toBe(read(revision));
  read({});
  expect(calculate).toHaveBeenCalledTimes(3);
});

it("bounds option retention and retries failed calculations", () => {
  const read = createDocumentCalculation(
    "test",
    (_: object, key) => {
      if (key === "fail") throw new Error("failed");
      return {};
    },
    2,
  );
  const input = {};
  const first = read(input, "a");
  read(input, "b");
  read(input, "c");
  expect(read(input, "a")).not.toBe(first);
  expect(() => read(input, "fail")).toThrow();
  expect(read(input, "c")).toBeDefined();
});

it("shares running requests and releases settled and failed jobs", async () => {
  const read = createSharedRequests();
  const run = vi.fn(async () => 42);
  const first = read("revision", run);
  expect(read("revision", run)).toBe(first);
  expect(await first).toBe(42);
  await read("revision", run);
  expect(run).toHaveBeenCalledTimes(2);
  await expect(
    read("failure", async () => {
      throw new Error("failed");
    }),
  ).rejects.toThrow();
  expect(await read("failure", run)).toBe(42);
});

it("preserves raw-text counts including blank and CRLF input", () => {
  expect(getTextStatistics("")).toEqual({ words: 0, characters: 0, lines: 1 });
  const text = "A bee\r\nflies.\n";
  expect(getTextStatistics(text)).toEqual({ words: 3, characters: text.length, lines: 3 });
  expect(getTextStatistics(text)).toBe(getTextStatistics(text));
  expect(getTextStatistics(text + "Now").words).toBe(4);
});

it("bounds retained text, snapshots and options, and does not cache oversized inputs", () => {
  const calculate = vi.fn(() => ({}));
  const read = createTextCalculation("bounded", calculate, { maxCharacters: 6, maxSnapshots: 2, maxOptions: 2 });
  const first = read("abc");
  expect(read("abc")).toBe(first);
  read("def");
  read("ghi");
  expect(read("abc")).not.toBe(first);
  expect(read("oversized")).not.toBe(read("oversized"));
  const a = read("a", "one");
  read("a", "two");
  read("a", "three");
  expect(read("a", "one")).not.toBe(a);
});
