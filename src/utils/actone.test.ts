import { describe, it, expect } from "vitest";
import { packActoneBundle, unpackActoneBundle } from "./actone";
import type { ScriptInfo } from "./actone";

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
    const { zipSync, strToU8 } = require("fflate");
    const legacy = zipSync({ "document.fountain": strToU8("INT. TEST - DAY\n\nHello.") });
    const unpacked = unpackActoneBundle(legacy, "MyScript");
    expect(unpacked.scripts).toHaveLength(1);
    expect(unpacked.scripts[0].name).toBe("MyScript");
    expect(unpacked.scripts[0].fileName).toBe("document.fountain");
    expect(unpacked.scripts[0].content).toBe("INT. TEST - DAY\n\nHello.");
  });

  it("handles empty content gracefully", () => {
    const scripts = makeScripts([{ name: "Empty", content: "" }]);
    const packed = packActoneBundle(scripts, {});
    const unpacked = unpackActoneBundle(packed);
    expect(unpacked.scripts[0].content).toBe("");
  });

  it("packs and unpacks with settings", () => {
    const scripts = makeScripts([{ name: "Main", content: "INT. ROOM - NIGHT" }]);
    const settings = { revisionModeEnabled: true, genders: { JOHN: "male" } };
    const packed = packActoneBundle(scripts, settings);
    const unpacked = unpackActoneBundle(packed);
    expect(unpacked.settings.genders).toEqual({ JOHN: "male" });
    expect(unpacked.settings.todos).toEqual([]);
  });

  it("packs and unpacks with todos, parking, sprint", () => {
    const scripts = makeScripts([{ name: "Main", content: "Action line." }]);
    const settings = {
      todos: [{ id: "1", text: "Fix this", completed: false }],
      parking: [{ id: "p1", text: "Parked text", createdAt: 100 }],
      sprintHistory: [{ id: "s1", startTime: 0, endTime: 1, durationMinutes: 5, wordCount: 100, content: "" }],
      markers: [{ id: "m1", color: "red", description: "Fix this" }],
      productionTags: { tags: [], definitions: [] },
    };
    const packed = packActoneBundle(scripts, settings);
    const unpacked = unpackActoneBundle(packed);
    expect(unpacked.settings.todos).toHaveLength(1);
    expect(unpacked.settings.parking).toHaveLength(1);
    expect(unpacked.settings.sprintHistory).toHaveLength(1);
    expect(unpacked.settings.markers).toHaveLength(1);
    expect(unpacked.settings.productionTags).toEqual({ tags: [], definitions: [] });
  });

  it("fountain.json exists in new bundles", () => {
    const scripts = makeScripts([{ name: "Main", content: "Test." }]);
    const packed = packActoneBundle(scripts, {});
    const { unzipSync, strFromU8 } = require("fflate");
    const zipBytes = packed.slice(4);
    const unzipped = unzipSync(zipBytes);
    expect(unzipped["fountain.json"]).toBeDefined();
    const manifest = JSON.parse(strFromU8(unzipped["fountain.json"]));
    expect(manifest).toEqual([{ name: "Main", file: "Main.fountain" }]);
  });

  it("prepends magic header to packed bundles", () => {
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
