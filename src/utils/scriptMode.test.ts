import { describe, it, expect } from "vitest";
import { isProseScript, isActonePath } from "./scriptMode";
import type { ScriptInfo } from "./actone";

describe("scriptMode - isProseScript", () => {
  it("returns true when script.type is 'markdown'", () => {
    const script: ScriptInfo = {
      name: "Notes",
      fileName: "files/Notes.txt",
      type: "markdown",
      content: "# Hello",
      savedContent: "# Hello",
    };
    expect(isProseScript(script)).toBe(true);
  });

  it("returns true when script.fileName ends with .md or .markdown", () => {
    const script1: ScriptInfo = {
      name: "Outline",
      fileName: "files/Outline.md",
      type: "fountain",
      content: "",
      savedContent: "",
    };
    expect(isProseScript(script1)).toBe(true);

    const script2: ScriptInfo = {
      name: "Doc",
      fileName: "files/Doc.MARKDOWN",
      type: undefined,
      content: "",
      savedContent: "",
    };
    expect(isProseScript(script2)).toBe(true);
  });

  it("returns true when filePath ends with .md or .markdown (case insensitive)", () => {
    expect(isProseScript(null, "path/to/script.md")).toBe(true);
    expect(isProseScript(null, "path/to/script.MD")).toBe(true);
    expect(isProseScript(null, "path/to/script.markdown")).toBe(true);
    expect(isProseScript(null, "path/to/script.MARKDOWN")).toBe(true);
  });

  it("returns false for fountain scripts and other extensions", () => {
    const script: ScriptInfo = {
      name: "Screenplay",
      fileName: "files/Screenplay.fountain",
      type: "fountain",
      content: "",
      savedContent: "",
    };
    expect(isProseScript(script)).toBe(false);
    expect(isProseScript(script, "files/Screenplay.fountain")).toBe(false);
    expect(isProseScript(null, "files/Screenplay.fountain")).toBe(false);
    expect(isProseScript(null, "files/Screenplay.txt")).toBe(false);
    expect(isProseScript(null, "")).toBe(false);
    expect(isProseScript(undefined, undefined)).toBe(false);
    expect(isProseScript(null, null)).toBe(false);
  });

  it("handles edge cases (empty object, undefined properties, no extension)", () => {
    expect(isProseScript({} as ScriptInfo)).toBe(false);
    expect(isProseScript({ fileName: "" } as ScriptInfo)).toBe(false);
    expect(isProseScript({ fileName: "markdown" } as ScriptInfo)).toBe(false);
    expect(isProseScript({ fileName: "something.md.fountain" } as ScriptInfo)).toBe(false);
    expect(isProseScript(null, "something.md.bak")).toBe(false);
  });
});

describe("scriptMode - isActonePath", () => {
  it("returns true for .actone extensions with various casing", () => {
    expect(isActonePath("project.actone")).toBe(true);
    expect(isActonePath("PROJECT.ACTONE")).toBe(true);
    expect(isActonePath("path/to/my_screenplay.AcToNe")).toBe(true);
    expect(isActonePath("C:\\Users\\test\\project.actone")).toBe(true);
  });

  it("returns true for .zip and .actone.zip extensions with various casing", () => {
    expect(isActonePath("bundle.zip")).toBe(true);
    expect(isActonePath("BUNDLE.ZIP")).toBe(true);
    expect(isActonePath("project.actone.zip")).toBe(true);
    expect(isActonePath("PROJECT.ACTONE.ZIP")).toBe(true);
  });

  it("returns false for other extensions and edge cases", () => {
    expect(isActonePath("script.fountain")).toBe(false);
    expect(isActonePath("notes.md")).toBe(false);
    expect(isActonePath("project.actone.bak")).toBe(false);
    expect(isActonePath("actone")).toBe(false);
    expect(isActonePath("zip")).toBe(false);
    expect(isActonePath("")).toBe(false);
    expect(isActonePath(null)).toBe(false);
    expect(isActonePath(undefined)).toBe(false);
  });
});
