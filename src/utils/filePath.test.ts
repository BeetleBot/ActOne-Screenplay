import { describe, expect, it } from "vitest";
import { sameFilePath } from "./filePath";

describe("sameFilePath", () => {
  it("distinguishes Linux files whose names differ only by case", () => {
    expect(sameFilePath("/home/me/Movie.actone", "/home/me/movie.actone")).toBe(false);
    expect(sameFilePath("/home/me/Movie.actone", "/home/me/Movie.actone")).toBe(true);
  });
  it("preserves Windows case-insensitive comparisons and separator variants", () => {
    expect(sameFilePath("C:/Scripts/Movie.ACTONE", "c:/scripts/movie.actone")).toBe(true);
    expect(sameFilePath(String.raw`C:\Scripts\Movie.actone`, "c:/Scripts/Movie.actone")).toBe(true);
    expect(sameFilePath(String.raw`\\server\share\Movie.actone`, String.raw`\\SERVER\share\movie.actone`)).toBe(true);
  });
  it("does not rewrite a legal backslash in a POSIX filename", () => {
    expect(sameFilePath(String.raw`/home/me/a\b.actone`, "/home/me/a/b.actone")).toBe(false);
    expect(sameFilePath(null, "/home/me/movie.actone")).toBe(false);
  });
});
