import { describe, it, expect } from "vitest";
import { packActoneBundle, packActoneBundleAsync, unpackActoneBundle } from "./actone";
import type { ScriptInfo } from "./actone";
import { zipSync, strToU8, unzipSync, strFromU8 } from "fflate";

const makeScripts = (arr: { name: string; content: string; type?: "fountain" | "markdown" }[]): ScriptInfo[] =>
  arr.map((s) => ({
    name: s.name,
    fileName: `files/${s.name}.${s.type === "markdown" ? "md" : "fountain"}`,
    type: s.type || "fountain",
    content: s.content,
    savedContent: s.content,
  }));

describe("actone bundle - Core Packing & Unpacking", () => {
  it("packs and unpacks a single screenplay", () => {
    const scripts = makeScripts([{ name: "Main", content: "EXT. HOUSE - DAY\n\nHello world." }]);
    const settings = { paperSize: "A4" };
    const packed = packActoneBundle(scripts, settings);
    const unpacked = unpackActoneBundle(packed);
    expect(unpacked.scripts).toHaveLength(1);
    expect(unpacked.scripts[0].name).toBe("Main");
    expect(unpacked.scripts[0].fileName).toBe("files/Main.fountain");
    expect(unpacked.scripts[0].type).toBe("fountain");
    expect(unpacked.scripts[0].content).toBe("EXT. HOUSE - DAY\n\nHello world.");
    expect(unpacked.settings.paperSize).toBe("A4");
  });

  it("packs and unpacks multiple mixed scripts (Fountain & Markdown)", () => {
    const scripts: ScriptInfo[] = [
      { name: "Episode 1", fileName: "files/Episode 1.fountain", type: "fountain", content: "INT. LAB - DAY\n\nALICE\nIt works.", savedContent: "INT. LAB - DAY\n\nALICE\nIt works." },
      { name: "Episode 2", fileName: "files/Episode 2.fountain", type: "fountain", content: "EXT. PARK - NIGHT\n\nSilence.", savedContent: "EXT. PARK - NIGHT\n\nSilence." },
      { name: "Treatment", fileName: "files/Treatment.md", type: "markdown", content: "# Series Outline\n\n- Season 1: 10 episodes\n- Theme: Discovery", savedContent: "# Series Outline\n\n- Season 1: 10 episodes\n- Theme: Discovery" },
    ];
    const packed = packActoneBundle(scripts, {});
    const unpacked = unpackActoneBundle(packed);

    expect(unpacked.scripts).toHaveLength(3);
    expect(unpacked.scripts[0]).toEqual({
      name: "Episode 1",
      fileName: "files/Episode 1.fountain",
      type: "fountain",
      content: "INT. LAB - DAY\n\nALICE\nIt works.",
      savedContent: "INT. LAB - DAY\n\nALICE\nIt works.",
    });
    expect(unpacked.scripts[1]).toEqual({
      name: "Episode 2",
      fileName: "files/Episode 2.fountain",
      type: "fountain",
      content: "EXT. PARK - NIGHT\n\nSilence.",
      savedContent: "EXT. PARK - NIGHT\n\nSilence.",
    });
    expect(unpacked.scripts[2]).toEqual({
      name: "Treatment",
      fileName: "files/Treatment.md",
      type: "markdown",
      content: "# Series Outline\n\n- Season 1: 10 episodes\n- Theme: Discovery",
      savedContent: "# Series Outline\n\n- Season 1: 10 episodes\n- Theme: Discovery",
    });
  });

  it("prepends 4-byte ACT1 magic header", () => {
    const scripts = makeScripts([{ name: "Main", content: "Test." }]);
    const packed = packActoneBundle(scripts, {});
    expect(packed[0]).toBe(0x41); // 'A'
    expect(packed[1]).toBe(0x43); // 'C'
    expect(packed[2]).toBe(0x54); // 'T'
    expect(packed[3]).toBe(0x31); // '1'
    expect(packed[4]).toBe(0x50); // 'P' (ZIP header)
    expect(packed[5]).toBe(0x4b); // 'K' (ZIP header)
  });

  it("packs asynchronously identically to sync pack", async () => {
    const scripts = makeScripts([
      { name: "S1", content: "Scene 1 content" },
      { name: "S2", content: "Scene 2 content" },
    ]);
    const settings = { custom: 123 };
    const syncPacked = packActoneBundle(scripts, settings);
    const asyncPacked = await packActoneBundleAsync(scripts, settings);
    
    const unpackedSync = unpackActoneBundle(syncPacked);
    const unpackedAsync = unpackActoneBundle(asyncPacked);
    expect(unpackedAsync).toEqual(unpackedSync);
  });
});

describe("actone bundle - Reordering & Content Stability", () => {
  it("strictly preserves script content when order is changed (1,2,3,4 -> 1,4,2,3)", () => {
    const originalScripts: ScriptInfo[] = [
      { name: "Script 1", fileName: "files/Script 1.fountain", type: "fountain", content: "CONTENT_OF_SCRIPT_1", savedContent: "CONTENT_OF_SCRIPT_1" },
      { name: "Script 2", fileName: "files/Script 2.fountain", type: "fountain", content: "CONTENT_OF_SCRIPT_2", savedContent: "CONTENT_OF_SCRIPT_2" },
      { name: "Script 3", fileName: "files/Script 3.fountain", type: "fountain", content: "CONTENT_OF_SCRIPT_3", savedContent: "CONTENT_OF_SCRIPT_3" },
      { name: "Script 4", fileName: "files/Script 4.fountain", type: "fountain", content: "CONTENT_OF_SCRIPT_4", savedContent: "CONTENT_OF_SCRIPT_4" },
    ];

    // Reorder 4th between 1st and 2nd -> [1, 4, 2, 3]
    const reorderedScripts: ScriptInfo[] = [
      originalScripts[0],
      originalScripts[3],
      originalScripts[1],
      originalScripts[2],
    ];

    const packed = packActoneBundle(reorderedScripts, {
      notepad: {
        "files/Script 1.fountain": "Notes for 1",
        "files/Script 4.fountain": "Notes for 4",
        "files/Script 2.fountain": "Notes for 2",
        "files/Script 3.fountain": "Notes for 3",
      }
    });

    const unpacked = unpackActoneBundle(packed);

    // Verify order in manifest
    expect(unpacked.scripts.map(s => s.name)).toEqual(["Script 1", "Script 4", "Script 2", "Script 3"]);
    
    // Verify each file keeps its OWN exact content and NEVER swaps
    expect(unpacked.scripts[0].name).toBe("Script 1");
    expect(unpacked.scripts[0].content).toBe("CONTENT_OF_SCRIPT_1");

    expect(unpacked.scripts[1].name).toBe("Script 4");
    expect(unpacked.scripts[1].content).toBe("CONTENT_OF_SCRIPT_4");

    expect(unpacked.scripts[2].name).toBe("Script 2");
    expect(unpacked.scripts[2].content).toBe("CONTENT_OF_SCRIPT_2");

    expect(unpacked.scripts[3].name).toBe("Script 3");
    expect(unpacked.scripts[3].content).toBe("CONTENT_OF_SCRIPT_3");

    // Verify per-script settings stay attached to the script fileName, not array index
    const notepad = unpacked.settings.notepad as Record<string, string>;
    expect(notepad["files/Script 4.fountain"]).toBe("Notes for 4");
    expect(notepad["files/Script 2.fountain"]).toBe("Notes for 2");
  });
});

describe("actone bundle - Backward Compatibility & Migration", () => {
  it("unpacks Gen 1 pre-0.3.0 bundle with trailing ACT1 magic and document.fountain", () => {
    const rawZip = zipSync({
      "document.fountain": strToU8("EXT. OLD FORMAT - DAY\n\nLegacy content."),
      "notepad.json": strToU8(JSON.stringify("Global notes")),
    });

    // Append magic at the end
    const legacyBytes = new Uint8Array(rawZip.length + 4);
    legacyBytes.set(rawZip);
    legacyBytes.set([0x41, 0x43, 0x54, 0x31], rawZip.length);

    const unpacked = unpackActoneBundle(legacyBytes, "MyLegacyProject");
    expect(unpacked.isLegacy).toBe(true);
    expect(unpacked.scripts).toHaveLength(1);
    expect(unpacked.scripts[0].name).toBe("MyLegacyProject");
    expect(unpacked.scripts[0].fileName).toBe("files/MyLegacyProject.fountain");
    expect(unpacked.scripts[0].content).toBe("EXT. OLD FORMAT - DAY\n\nLegacy content.");
    expect(unpacked.settings.notepad).toBe("Global notes");
  });

  it("unpacks Gen 2 bundle with fountain.json manifest and root flat files", () => {
    const rawZip = zipSync({
      "fountain.json": strToU8(JSON.stringify([
        { name: "Act 1", file: "Act 1.fountain" },
        { name: "Act 2", file: "Act 2.fountain" },
      ])),
      "Act 1.fountain": strToU8("ACT 1 TEXT"),
      "Act 2.fountain": strToU8("ACT 2 TEXT"),
      "notepad.json": strToU8(JSON.stringify({
        "Act 1.fountain": "Notes 1",
        "Act 2.fountain": "Notes 2",
      })),
      "todos.json": strToU8(JSON.stringify({
        "Act 1.fountain": [{ id: "t1", text: "Fix Act 1" }],
      })),
    });

    const packedWithHeader = new Uint8Array(4 + rawZip.length);
    packedWithHeader.set([0x41, 0x43, 0x54, 0x31]);
    packedWithHeader.set(rawZip, 4);

    const unpacked = unpackActoneBundle(packedWithHeader);
    expect(unpacked.isLegacy).toBe(true);
    expect(unpacked.scripts).toHaveLength(2);
    expect(unpacked.scripts[0].fileName).toBe("files/Act 1.fountain");
    expect(unpacked.scripts[1].fileName).toBe("files/Act 2.fountain");
    expect(unpacked.scripts[0].content).toBe("ACT 1 TEXT");
    expect(unpacked.scripts[1].content).toBe("ACT 2 TEXT");

    // Keys migrated from "Act 1.fountain" to "files/Act 1.fountain"
    const notepad = unpacked.settings.notepad as Record<string, string>;
    expect(notepad["files/Act 1.fountain"]).toBe("Notes 1");
    expect(notepad["files/Act 2.fountain"]).toBe("Notes 2");

    const todos = unpacked.settings.todos as Record<string, unknown[]>;
    expect(todos["files/Act 1.fountain"]).toEqual([{ id: "t1", text: "Fix Act 1" }]);
  });

  it("unpacks Gen 3 bundle having flat files in project.json and normalizes them to files/", () => {
    // Exactly like the user's bundle: 57.fountain, 58.fountain, project.json flat
    const rawZip = zipSync({
      "project.json": strToU8(JSON.stringify([
        { name: "57", file: "57.fountain", type: "fountain" },
        { name: "58", file: "58.fountain", type: "fountain" },
      ])),
      "57.fountain": strToU8("SCENE 57 TEXT"),
      "58.fountain": strToU8("SCENE 58 TEXT"),
      "production_tags.json": strToU8(JSON.stringify({
        "57.fountain": { tags: [{ id: "tag1", name: "Prop" }] },
      })),
    });

    const packed = new Uint8Array(4 + rawZip.length);
    packed.set([0x41, 0x43, 0x54, 0x31]);
    packed.set(rawZip, 4);

    const unpacked = unpackActoneBundle(packed);
    expect(unpacked.isLegacy).toBe(true);
    expect(unpacked.scripts).toHaveLength(2);
    expect(unpacked.scripts[0].fileName).toBe("files/57.fountain");
    expect(unpacked.scripts[1].fileName).toBe("files/58.fountain");
    expect(unpacked.scripts[0].content).toBe("SCENE 57 TEXT");
    expect(unpacked.scripts[1].content).toBe("SCENE 58 TEXT");

    // Re-pack and verify it auto-upgrades to files/ inside ZIP
    const repacked = packActoneBundle(unpacked.scripts, unpacked.settings);
    const unzippedRepacked = unzipSync(repacked.slice(4));

    expect(unzippedRepacked["files/57.fountain"]).toBeDefined();
    expect(unzippedRepacked["files/58.fountain"]).toBeDefined();
    expect(unzippedRepacked["57.fountain"]).toBeUndefined();
    expect(unzippedRepacked["58.fountain"]).toBeUndefined();

    const manifest = JSON.parse(strFromU8(unzippedRepacked["project.json"]));
    expect(manifest[0].file).toBe("files/57.fountain");
    expect(manifest[1].file).toBe("files/58.fountain");
  });

  it("migrates legacy prompt.json to muse.json", () => {
    const rawZip = zipSync({
      "project.json": strToU8(JSON.stringify([{ name: "Test", file: "files/Test.fountain" }])),
      "files/Test.fountain": strToU8("INT. ROOM - DAY"),
      "prompt.json": strToU8(JSON.stringify({
        conversations: [{ id: "c1", title: "Brainstorming" }],
        activeConversationId: "c1",
      })),
    });
    const packed = new Uint8Array(4 + rawZip.length);
    packed.set([0x41, 0x43, 0x54, 0x31]);
    packed.set(rawZip, 4);

    const unpacked = unpackActoneBundle(packed);
    expect(unpacked.settings.promptChats).toEqual({
      conversations: [{ id: "c1", title: "Brainstorming" }],
      activeConversationId: "c1",
    });

    // Verify when re-packed, it is saved into muse.json
    const repacked = packActoneBundle(unpacked.scripts, unpacked.settings);
    const unzipped = unzipSync(repacked.slice(4));
    expect(unzipped["muse.json"]).toBeDefined();
    const museChats = JSON.parse(strFromU8(unzipped["muse.json"]));
    expect(museChats.activeConversationId).toBe("c1");
  });

  it("silently ignores obsolete marker.json without throwing", () => {
    const rawZip = zipSync({
      "project.json": strToU8(JSON.stringify([{ name: "Test", file: "files/Test.fountain" }])),
      "files/Test.fountain": strToU8("CONTENT"),
      "marker.json": strToU8(JSON.stringify({ lines: [1, 2, 3] })),
    });
    const packed = new Uint8Array(4 + rawZip.length);
    packed.set([0x41, 0x43, 0x54, 0x31]);
    packed.set(rawZip, 4);

    expect(() => unpackActoneBundle(packed)).not.toThrow();
  });
});

describe("actone bundle - Robust Unicode & Special Formatting", () => {
  it("handles Indic scripts, emojis, and multiline markdown cleanly", () => {
    const tamilText = "காட்சி 1. அறை - பகல்\n\nகதாநாயகன் நுழைகிறான்.";
    const hindiText = "दृश्य १. कमरा - दिन\n\nनमस्ते दुनिया.";
    const mdProse = "# Character Profile 🎭\n\n* **Name:** சரண்யா / रोहन\n* **Notes:** `Special \\$100 & quotes \"test\"`\n\n```json\n{\"test\": true}\n```";

    const scripts: ScriptInfo[] = [
      { name: "தமிழ்", fileName: "files/தமிழ்.fountain", type: "fountain", content: tamilText, savedContent: tamilText },
      { name: "हिंदी", fileName: "files/हिंदी.fountain", type: "fountain", content: hindiText, savedContent: hindiText },
      { name: "Profile", fileName: "files/Profile.md", type: "markdown", content: mdProse, savedContent: mdProse },
    ];

    const packed = packActoneBundle(scripts, {});
    const unpacked = unpackActoneBundle(packed);

    expect(unpacked.scripts[0].content).toBe(tamilText);
    expect(unpacked.scripts[1].content).toBe(hindiText);
    expect(unpacked.scripts[2].content).toBe(mdProse);
  });
});
