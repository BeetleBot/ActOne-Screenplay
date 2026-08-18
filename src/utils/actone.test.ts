import { describe, it, expect } from "vitest";
import { packActoneBundle, unpackActoneBundle } from "./actone";
import type { ScriptInfo } from "./actone";
import { zipSync, strToU8, unzipSync, strFromU8 } from "fflate";

const makeScripts = (arr: { name: string; content: string }[]): ScriptInfo[] =>
  arr.map((s) => ({ name: s.name, fileName: `${s.name}.fountain`, content: s.content, savedContent: s.content }));

describe("actone bundle", () => {
  it("packs and unpacks a single script", () => {
    const scripts = makeScripts([{ name: "Main", content: "EXT. HOUSE - DAY\n\nHello world." }]);
    const settings = {};
    const packed = packActoneBundle(scripts, settings);
    const unpacked = unpackActoneBundle(packed);
    expect(unpacked.scripts).toHaveLength(1);
    expect(unpacked.scripts[0].name).toBe("Main");
    expect(unpacked.scripts[0].content).toBe("EXT. HOUSE - DAY\n\nHello world.");
  });

  it("packs and unpacks multiple scripts", () => {
    const scripts = makeScripts([
      { name: "Act One", content: "INT. ROOM - NIGHT\n\nJohn enters." },
      { name: "Act Two", content: "EXT. GARDEN - DAY\n\nBirds chirp." },
    ]);
    const packed = packActoneBundle(scripts, {});
    const unpacked = unpackActoneBundle(packed);
    expect(unpacked.scripts).toHaveLength(2);
    expect(unpacked.scripts[0].name).toBe("Act One");
    expect(unpacked.scripts[1].name).toBe("Act Two");
    expect(unpacked.scripts[0].content).toBe("INT. ROOM - NIGHT\n\nJohn enters.");
    expect(unpacked.scripts[1].content).toBe("EXT. GARDEN - DAY\n\nBirds chirp.");
  });

  it("preserves manifest order", () => {
    const scripts = makeScripts([
      { name: "C", content: "Third" },
      { name: "A", content: "First" },
      { name: "B", content: "Second" },
    ]);
    const packed = packActoneBundle(scripts, {});
    const unpacked = unpackActoneBundle(packed);
    expect(unpacked.scripts.map((s) => s.name)).toEqual(["C", "A", "B"]);
  });

  it("handles legacy document.fountain bundles", () => {
    const legacy = zipSync({ "document.fountain": strToU8("INT. TEST - DAY\n\nHello.") });
    const unpacked = unpackActoneBundle(legacy, "MyScript");
    expect(unpacked.scripts).toHaveLength(1);
    expect(unpacked.scripts[0].name).toBe("MyScript");
    expect(unpacked.scripts[0].fileName).toBe("files/MyScript.fountain");
    expect(unpacked.scripts[0].content).toBe("INT. TEST - DAY\n\nHello.");
  });

  it("handles empty content gracefully", () => {
    const bundle = packActoneBundle([{ name: "Empty", fileName: "files/Empty.fountain", content: "", savedContent: "" }], {});
    const unpacked = unpackActoneBundle(bundle);
    expect(unpacked.scripts[0].content).toBe("");
  });

  it("packs and unpacks with settings", () => {
    const scripts: ScriptInfo[] = [
      { name: "S1", fileName: "files/S1.fountain", content: "A", savedContent: "A" }
    ];
    const settings = { notepad: "notes", someCustom: 42 };
    const packed = packActoneBundle(scripts, settings);
    const unpacked = unpackActoneBundle(packed);
    expect(unpacked.settings.notepad).toBe("notes");
    expect(unpacked.settings.someCustom).toBe(42);
  });

  it("packs and unpacks with todos, parking, sprint", () => {
    const scripts: ScriptInfo[] = [{ name: "S", fileName: "files/S.fountain", content: "A", savedContent: "A" }];
    const settings = {
      todos: [{ id: "1", text: "t" }],
      parking: [{ text: "p" }],
      sprintHistory: [{ date: "now" }]
    };
    const packed = packActoneBundle(scripts, settings);
    const unpacked = unpackActoneBundle(packed);
    expect(unpacked.settings.todos).toEqual([{ id: "1", text: "t" }]);
    expect(unpacked.settings.parking).toEqual([{ text: "p" }]);
    expect(unpacked.settings.sprintHistory).toEqual([{ date: "now" }]);
  });

  it("project.json exists in new bundles", () => {
    const scripts: ScriptInfo[] = [{ name: "Main", fileName: "files/Main.fountain", type: "fountain", content: "...", savedContent: "..." }];
    const packed = packActoneBundle(scripts, {});
    const zipBytes = packed.slice(4);
    const unzipped = unzipSync(zipBytes);
    expect(unzipped["project.json"]).toBeDefined();
    const manifest = JSON.parse(strFromU8(unzipped["project.json"]));
    expect(manifest).toEqual([{ name: "Main", file: "files/Main.fountain", type: "fountain" }]);
  });

  it("prepends ACT1 magic to packed bundles", () => {
    const scripts = makeScripts([{ name: "Main", content: "Test." }]);
    const packed = packActoneBundle(scripts, {});
    expect(packed[0]).toBe(0x41);
    expect(packed[1]).toBe(0x43);
    expect(packed[2]).toBe(0x54);
    expect(packed[3]).toBe(0x31);
    expect(packed[4]).toBe(0x50);
    expect(packed[5]).toBe(0x4B);
  });

  it("throws for non-zipped bytes", () => {
    expect(() => unpackActoneBundle(new Uint8Array([1, 2, 3]))).toThrow();
  });
});
