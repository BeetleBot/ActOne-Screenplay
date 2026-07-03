import { describe, expect, it } from "vitest";
import {
  getPerScriptSetting,
  getPerScriptSettingArray,
  getPerScriptSettingObject,
  getPerScriptSettingString,
  getPerScriptSettingNumber,
} from "./perScriptSettings";

describe("getPerScriptSetting", () => {
  it("handles basic and missing settings", () => {
    expect(getPerScriptSetting("x", {}, "a.fountain")).toBeUndefined();
    expect(getPerScriptSetting("x", undefined, "a.fountain")).toBeUndefined();
  });

  it("handles per-script settings", () => {
    const settings = {
      parking: {
        "a.fountain": [1, 2],
        "b.fountain": [3, 4],
      },
    };
    expect(getPerScriptSetting("parking", settings, "a.fountain")).toEqual([1, 2]);
    expect(getPerScriptSetting("parking", settings, "b.fountain")).toEqual([3, 4]);
    expect(getPerScriptSetting("parking", settings, "c.fountain")).toBeUndefined();
  });

  it("handles non-per-script object settings", () => {
    const settings = {
      characterProfiles: {
        alice: { age: 30 },
      },
    };
    expect(getPerScriptSetting("characterProfiles", settings, "a.fountain")).toBeUndefined();
    expect(getPerScriptSetting("characterProfiles", settings, "alice")).toEqual({ age: 30 });
  });

  it("handles empty scriptFileName", () => {
    const settings = {
      parking: {
        "a.fountain": [1, 2],
      },
    };
    expect(getPerScriptSetting("parking", settings, "")).toEqual({ "a.fountain": [1, 2] });
  });
});

describe("getPerScriptSettingArray", () => {
  it("returns fallback or actual value", () => {
    expect(getPerScriptSettingArray("todos", { todos: [1, 2] }, "a")).toEqual([1, 2]);
    const settings = {
      todos: {
        "b.fountain": [2, 3],
      },
    };
    expect(getPerScriptSettingArray("todos", settings, "b.fountain")).toEqual([2, 3]);
    expect(getPerScriptSettingArray("todos", settings, "missing.fountain", [])).toEqual([]);
    expect(getPerScriptSettingArray("todos", settings, "missing.fountain", [99])).toEqual([99]);
    expect(getPerScriptSettingArray("todos", { todos: { a: 1 } }, "x.fountain")).toEqual([]);
    expect(getPerScriptSettingArray("todos", {}, "x.fountain")).toEqual([]);
  });
});

describe("getPerScriptSettingObject", () => {
  it("returns fallback or actual value", () => {
    const v = { foo: "bar" };
    expect(getPerScriptSettingObject("x", { x: { "a.fountain": v } }, "a.fountain", {})).toBe(v);
    expect(getPerScriptSettingObject("x", { x: { "a.fountain": {} } }, "b.fountain", { a: 1 })).toEqual({ a: 1 });
    const fb = { fallback: true };
    expect(getPerScriptSettingObject("x", { x: [1, 2] }, "a.fountain", fb)).toBe(fb);
    expect(getPerScriptSettingObject("x", {}, "a.fountain", { a: 1 })).toEqual({ a: 1 });
    expect(getPerScriptSettingObject("x", { x: "hello" }, "a.fountain", fb)).toBe(fb);
  });
});

describe("getPerScriptSettingString", () => {
  it("returns fallback or actual value", () => {
    expect(getPerScriptSettingString("notepad", { notepad: "hi" }, "a.fountain")).toBe("hi");
    const settings = {
      notepad: {
        "a.fountain": "first",
      },
    };
    expect(getPerScriptSettingString("notepad", settings, "a.fountain")).toBe("first");
    expect(getPerScriptSettingString("notepad", settings, "b.fountain", "default")).toBe("default");
    expect(getPerScriptSettingString("x", { x: 42 }, "a", "fallback")).toBe("fallback");
  });
});

describe("getPerScriptSettingNumber", () => {
  it("returns fallback or actual value", () => {
    expect(getPerScriptSettingNumber("x", { x: 42 }, "a")).toBe(42);
    expect(getPerScriptSettingNumber("x", { x: NaN }, "a", 7)).toBe(7);
    expect(getPerScriptSettingNumber("x", { x: "nope" }, "a", 7)).toBe(7);
  });
});
