import { describe, it, expect } from "vitest";
import { countWords } from "./text";

describe("countWords", () => {
  it("counts words in a simple sentence", () => {
    expect(countWords("Hello world")).toBe(2);
  });

  it("returns 0 for empty string", () => {
    expect(countWords("")).toBe(0);
  });

  it("returns 0 for whitespace-only string", () => {
    expect(countWords("   ")).toBe(0);
  });

  it("handles multiple spaces between words", () => {
    expect(countWords("Hello    world  foo")).toBe(3);
  });

  it("handles leading/trailing whitespace", () => {
    expect(countWords("  Hello world  ")).toBe(2);
  });

  it("returns 1 for a single word", () => {
    expect(countWords("Hello")).toBe(1);
  });
});
