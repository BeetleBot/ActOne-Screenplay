import { describe, expect, it } from "vitest";
import {
  getPerScriptSetting,
  getPerScriptSettingArray,
  getPerScriptSettingObject,
  getPerScriptSettingString,
  getPerScriptSettingNumber,
  migrateSettingsKey,
  removeSettingsKey,
  migrateProductionTags,
  updatePerScriptSetting,
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

describe("migrateSettingsKey", () => {
  it("correctly migrates keys in all 6 properties: notepad, todos, parking, genders, characterProfiles, productionTags", () => {
    const initialSettings = {
      paperSize: "A4",
      notepad: {
        "files/old.fountain": "Notes for old script",
        "files/other.fountain": "Notes for other script",
      },
      todos: {
        "files/old.fountain": [{ id: "t1", text: "Old todo" }],
        "files/other.fountain": [{ id: "t2", text: "Other todo" }],
      },
      parking: {
        "files/old.fountain": [{ id: "p1", text: "Old parking item" }],
        "files/other.fountain": [{ id: "p2", text: "Other parking item" }],
      },
      genders: {
        "files/old.fountain": { ALICE: "female", BOB: "male" },
        "files/other.fountain": { CHARLIE: "non-binary" },
      },
      characterProfiles: {
        "files/old.fountain": { ALICE: { age: 30, role: "Lead" } },
        "files/other.fountain": { CHARLIE: { age: 25, role: "Supporting" } },
      },
      productionTags: {
        "files/old.fountain": { tags: [{ id: "tag1", name: "Prop" }], definitions: [] },
        "files/other.fountain": { tags: [{ id: "tag2", name: "Location" }], definitions: [] },
      },
    };

    const result = migrateSettingsKey(initialSettings, "files/old.fountain", "files/new.fountain");

    // All 6 properties should have "files/new.fountain" with the original data
    expect(result.notepad["files/new.fountain"]).toBe("Notes for old script");
    expect(result.todos["files/new.fountain"]).toEqual([{ id: "t1", text: "Old todo" }]);
    expect(result.parking["files/new.fountain"]).toEqual([{ id: "p1", text: "Old parking item" }]);
    expect(result.genders["files/new.fountain"]).toEqual({ ALICE: "female", BOB: "male" });
    expect(result.characterProfiles["files/new.fountain"]).toEqual({ ALICE: { age: 30, role: "Lead" } });
    expect(result.productionTags["files/new.fountain"]).toEqual({ tags: [{ id: "tag1", name: "Prop" }], definitions: [] });

    // Old key should be deleted from all 6 properties
    expect("files/old.fountain" in result.notepad).toBe(false);
    expect("files/old.fountain" in result.todos).toBe(false);
    expect("files/old.fountain" in result.parking).toBe(false);
    expect("files/old.fountain" in result.genders).toBe(false);
    expect("files/old.fountain" in result.characterProfiles).toBe(false);
    expect("files/old.fountain" in result.productionTags).toBe(false);

    // Other scripts should remain untouched
    expect(result.notepad["files/other.fountain"]).toBe("Notes for other script");
    expect(result.todos["files/other.fountain"]).toEqual([{ id: "t2", text: "Other todo" }]);
    expect(result.parking["files/other.fountain"]).toEqual([{ id: "p2", text: "Other parking item" }]);
    expect(result.genders["files/other.fountain"]).toEqual({ CHARLIE: "non-binary" });
    expect(result.characterProfiles["files/other.fountain"]).toEqual({ CHARLIE: { age: 25, role: "Supporting" } });
    expect(result.productionTags["files/other.fountain"]).toEqual({ tags: [{ id: "tag2", name: "Location" }], definitions: [] });

    // Top-level unrelated settings remain untouched
    expect(result.paperSize).toBe("A4");
  });

  it("handles edge cases: undefined, null, or non-object settings", () => {
    expect(migrateSettingsKey(undefined, "old.fountain", "new.fountain")).toEqual({});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(migrateSettingsKey(null as any, "old.fountain", "new.fountain")).toEqual({});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(migrateSettingsKey("invalid" as any, "old.fountain", "new.fountain")).toBe("invalid");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(migrateSettingsKey(123 as any, "old.fountain", "new.fountain")).toBe(123);
  });

  it("handles edge cases: same filename, empty or missing old/new filename", () => {
    const settings = {
      notepad: { "a.fountain": "note" },
    };
    expect(migrateSettingsKey(settings, "a.fountain", "a.fountain")).toBe(settings);
    expect(migrateSettingsKey(settings, "", "b.fountain")).toBe(settings);
    expect(migrateSettingsKey(settings, "a.fountain", "")).toBe(settings);
  });

  it("handles edge cases: missing old keys in settings properties", () => {
    const settings = {
      notepad: { "other.fountain": "note" },
      todos: { "other.fountain": [{ id: "1" }] },
    };
    const result = migrateSettingsKey(settings, "missing.fountain", "new.fountain");
    expect(result.notepad).toEqual({ "other.fountain": "note" });
    expect(result.todos).toEqual({ "other.fountain": [{ id: "1" }] });
  });

  it("handles edge cases: non-object or array values in keyed properties without errors", () => {
    const settings = {
      notepad: "flat notepad string",
      todos: [1, 2, 3],
      parking: null,
      genders: undefined,
      characterProfiles: 42,
      productionTags: true,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = migrateSettingsKey(settings as any, "old.fountain", "new.fountain");
    expect(result.notepad).toBe("flat notepad string");
    expect(result.todos).toEqual([1, 2, 3]);
    expect(result.parking).toBeNull();
    expect(result.genders).toBeUndefined();
    expect(result.characterProfiles).toBe(42);
    expect(result.productionTags).toBe(true);
  });

  it("handles partially populated settings without adding missing properties", () => {
    const settings = {
      notepad: { "old.fountain": "notes" },
      todos: { "old.fountain": [] },
    };
    const result = migrateSettingsKey(settings, "old.fountain", "new.fountain");
    expect(result.notepad).toEqual({ "new.fountain": "notes" });
    expect(result.todos).toEqual({ "new.fountain": [] });
    expect(result.parking).toBeUndefined();
    expect(result.genders).toBeUndefined();
    expect(result.characterProfiles).toBeUndefined();
    expect(result.productionTags).toBeUndefined();
  });
});

describe("removeSettingsKey", () => {
  it("deleting a script removes keys from all 6 properties without modifying other scripts' data", () => {
    const initialSettings = {
      paperSize: "US-Letter",
      notepad: {
        "files/toDelete.fountain": "Notes to delete",
        "files/keep.fountain": "Notes to keep",
      },
      todos: {
        "files/toDelete.fountain": [{ id: "t1" }],
        "files/keep.fountain": [{ id: "t2" }],
      },
      parking: {
        "files/toDelete.fountain": [{ id: "p1" }],
        "files/keep.fountain": [{ id: "p2" }],
      },
      genders: {
        "files/toDelete.fountain": { ALICE: "female" },
        "files/keep.fountain": { BOB: "male" },
      },
      characterProfiles: {
        "files/toDelete.fountain": { ALICE: { age: 30 } },
        "files/keep.fountain": { BOB: { age: 40 } },
      },
      productionTags: {
        "files/toDelete.fountain": { tags: [{ id: "tag1" }], definitions: [] },
        "files/keep.fountain": { tags: [{ id: "tag2" }], definitions: [] },
      },
    };

    const result = removeSettingsKey(initialSettings, "files/toDelete.fountain");

    // "files/toDelete.fountain" should be removed from all 6 properties
    expect("files/toDelete.fountain" in result.notepad).toBe(false);
    expect("files/toDelete.fountain" in result.todos).toBe(false);
    expect("files/toDelete.fountain" in result.parking).toBe(false);
    expect("files/toDelete.fountain" in result.genders).toBe(false);
    expect("files/toDelete.fountain" in result.characterProfiles).toBe(false);
    expect("files/toDelete.fountain" in result.productionTags).toBe(false);

    // Other scripts should remain untouched
    expect(result.notepad["files/keep.fountain"]).toBe("Notes to keep");
    expect(result.todos["files/keep.fountain"]).toEqual([{ id: "t2" }]);
    expect(result.parking["files/keep.fountain"]).toEqual([{ id: "p2" }]);
    expect(result.genders["files/keep.fountain"]).toEqual({ BOB: "male" });
    expect(result.characterProfiles["files/keep.fountain"]).toEqual({ BOB: { age: 40 } });
    expect(result.productionTags["files/keep.fountain"]).toEqual({ tags: [{ id: "tag2" }], definitions: [] });

    // Top-level unrelated settings remain untouched
    expect(result.paperSize).toBe("US-Letter");
  });

  it("handles edge cases: undefined, null, or non-object settings", () => {
    expect(removeSettingsKey(undefined, "file.fountain")).toEqual({});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(removeSettingsKey(null as any, "file.fountain")).toEqual({});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(removeSettingsKey("invalid" as any, "file.fountain")).toBe("invalid");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(removeSettingsKey(123 as any, "file.fountain")).toBe(123);
  });

  it("handles edge cases: empty or missing fileName", () => {
    const settings = {
      notepad: { "a.fountain": "note" },
    };
    expect(removeSettingsKey(settings, "")).toBe(settings);
  });

  it("handles edge cases: target key not in properties", () => {
    const settings = {
      notepad: { "other.fountain": "note" },
      todos: { "other.fountain": [{ id: "1" }] },
    };
    const result = removeSettingsKey(settings, "missing.fountain");
    expect(result.notepad).toEqual({ "other.fountain": "note" });
    expect(result.todos).toEqual({ "other.fountain": [{ id: "1" }] });
  });

  it("handles edge cases: non-object or array values in properties without errors", () => {
    const settings = {
      notepad: "flat notepad string",
      todos: [1, 2, 3],
      parking: null,
      genders: undefined,
      characterProfiles: 42,
      productionTags: true,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = removeSettingsKey(settings as any, "file.fountain");
    expect(result.notepad).toBe("flat notepad string");
    expect(result.todos).toEqual([1, 2, 3]);
    expect(result.parking).toBeNull();
    expect(result.genders).toBeUndefined();
    expect(result.characterProfiles).toBe(42);
    expect(result.productionTags).toBe(true);
  });
});

describe("migrateProductionTags", () => {
  it("handles empty or non-object raw inputs", () => {
    expect(migrateProductionTags(null)).toEqual({});
    expect(migrateProductionTags(undefined)).toEqual({});
    expect(migrateProductionTags("")).toEqual({});
  });

  it("preserves pure flat format if no per-script entries exist", () => {
    const flat = { tags: [], definitions: [] };
    expect(migrateProductionTags(flat)).toEqual(flat);
  });

  it("migrates hybrid format by stripping top-level flat junk and keeping per-script entries", () => {
    const hybrid = {
      tags: [],
      definitions: [],
      "33.fountain": { tags: [{ id: "t1", name: "Prop" }], definitions: [] },
      "34.fountain": { tags: [{ id: "t2", name: "Wardrobe" }], definitions: [] },
    };
    const result = migrateProductionTags(hybrid);
    expect(result["33.fountain"]).toEqual({ tags: [{ id: "t1", name: "Prop" }], definitions: [] });
    expect(result["34.fountain"]).toEqual({ tags: [{ id: "t2", name: "Wardrobe" }], definitions: [] });
    expect("tags" in result).toBe(false);
    expect("definitions" in result).toBe(false);
  });
});

describe("updatePerScriptSetting", () => {
  it("updates setting for given scriptFileName", () => {
    const prev = {
      notepad: {
        "a.fountain": "note a",
      },
    };
    const updated = updatePerScriptSetting(prev, "notepad", "b.fountain", "note b");
    expect(updated.notepad).toEqual({
      "a.fountain": "note a",
      "b.fountain": "note b",
    });
  });

  it("handles empty scriptFileName by setting key directly", () => {
    expect(updatePerScriptSetting({}, "key", "", "val")).toEqual({ key: "val" });
  });

  it("creates new dictionary if previous key value was not an object", () => {
    const prev = { notepad: "flat note" };
    const updated = updatePerScriptSetting(prev, "notepad", "a.fountain", "per-script note");
    expect(updated.notepad).toEqual({ "a.fountain": "per-script note" });
  });
});

