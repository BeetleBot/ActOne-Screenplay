import { describe, it, expect } from "vitest";
import { packActoneBundle, packActoneBundleAsync, unpackActoneBundle } from "./actone";
import type { ScriptInfo } from "./actone";
import { migrateSettingsKey } from "./perScriptSettings";
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
    const settings = {
      custom: 123,
      productionTags: {
        "files/S1.fountain": { tags: [{ id: "tag1", name: "Prop" }], definitions: [] },
        "files/S2.fountain": { tags: [{ id: "tag2", name: "Costume" }], definitions: [] },
      },
    };
    const syncPacked = packActoneBundle(scripts, settings);
    const asyncPacked = await packActoneBundleAsync(scripts, settings);
    
    const unpackedSync = unpackActoneBundle(syncPacked);
    const unpackedAsync = unpackActoneBundle(asyncPacked);
    expect(unpackedAsync).toEqual(unpackedSync);
  });

  it("filters orphaned productionTags for deleted scripts when packing multi-script bundle", () => {
    const scripts = makeScripts([
      { name: "S1", content: "Scene 1" },
      { name: "S2", content: "Scene 2" },
    ]);
    const settings = {
      productionTags: {
        "files/S1.fountain": { tags: [{ id: "t1", name: "Car" }], definitions: [] },
        "files/DeletedScript.fountain": { tags: [{ id: "t_orphan", name: "Orphan" }], definitions: [] },
      },
    };

    const packed = packActoneBundle(scripts, settings);
    const unzipped = unzipSync(packed.slice(4));
    const prodTags = JSON.parse(strFromU8(unzipped["production_tags.json"]));

    expect(prodTags["files/S1.fountain"]).toEqual({ tags: [{ id: "t1", name: "Car" }], definitions: [] });
    expect(prodTags["files/S2.fountain"]).toEqual({ tags: [], definitions: [] });
    expect(prodTags["files/DeletedScript.fountain"]).toBeUndefined();
  });

  it("preserves productionTags structure directly when scripts.length <= 1", () => {
    const scripts = makeScripts([
      { name: "SingleScript", content: "Single scene" },
    ]);
    const settings = {
      productionTags: { tags: [{ id: "t1", name: "Solo" }], definitions: [] },
    };

    const packed = packActoneBundle(scripts, settings);
    const unzipped = unzipSync(packed.slice(4));
    const prodTags = JSON.parse(strFromU8(unzipped["production_tags.json"]));

    expect(prodTags).toEqual({ tags: [{ id: "t1", name: "Solo" }], definitions: [] });
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

describe("actone bundle - Per-Script Settings Isolation & Script Renaming", () => {
  it("packs a multi-script bundle with productionTags and isolates/cleans orphaned script keys via resolvePerScript", async () => {
    const scripts: ScriptInfo[] = [
      { name: "Script A", fileName: "files/Script A.fountain", type: "fountain", content: "SCENE A", savedContent: "SCENE A" },
      { name: "Script B", fileName: "files/Script B.fountain", type: "fountain", content: "SCENE B", savedContent: "SCENE B" },
    ];

    const settings = {
      notepad: {
        "files/Script A.fountain": "Notes for A",
        "files/Script B.fountain": "Notes for B",
        "files/Orphaned.fountain": "Orphaned Notes",
      },
      todos: {
        "files/Script A.fountain": [{ id: "tA", text: "Todo A" }],
        "files/Script B.fountain": [{ id: "tB", text: "Todo B" }],
        "files/Orphaned.fountain": [{ id: "tO", text: "Todo Orphan" }],
      },
      parking: {
        "files/Script A.fountain": [{ id: "pA", text: "Parked A" }],
        "files/Script B.fountain": [{ id: "pB", text: "Parked B" }],
        "files/Orphaned.fountain": [{ id: "pO", text: "Parked Orphan" }],
      },
      genders: {
        "files/Script A.fountain": { HERO: "female" },
        "files/Script B.fountain": { VILLAIN: "male" },
        "files/Orphaned.fountain": { GHOST: "other" },
      },
      productionTags: {
        "files/Script A.fountain": { tags: [{ id: "tagA", name: "Prop A" }], definitions: [] },
        "files/Script B.fountain": { tags: [{ id: "tagB", name: "Prop B" }], definitions: [] },
      },
    };

    const packedSync = packActoneBundle(scripts, settings);
    const packedAsync = await packActoneBundleAsync(scripts, settings);

    for (const packed of [packedSync, packedAsync]) {
      const rawEntries = unzipSync(packed.slice(4));

      // Check raw JSON files inside the ZIP archive to ensure resolvePerScript pruned orphaned keys
      const rawCharacters = JSON.parse(strFromU8(rawEntries["characters.json"]));
      expect(rawCharacters["files/Script A.fountain"]).toEqual({ HERO: "female" });
      expect(rawCharacters["files/Script B.fountain"]).toEqual({ VILLAIN: "male" });
      expect(rawCharacters["files/Orphaned.fountain"]).toBeUndefined();

      const rawTodos = JSON.parse(strFromU8(rawEntries["todos.json"]));
      expect(rawTodos["files/Script A.fountain"]).toEqual([{ id: "tA", text: "Todo A" }]);
      expect(rawTodos["files/Script B.fountain"]).toEqual([{ id: "tB", text: "Todo B" }]);
      expect(rawTodos["files/Orphaned.fountain"]).toBeUndefined();

      const rawParking = JSON.parse(strFromU8(rawEntries["parking.json"]));
      expect(rawParking["files/Script A.fountain"]).toEqual([{ id: "pA", text: "Parked A" }]);
      expect(rawParking["files/Script B.fountain"]).toEqual([{ id: "pB", text: "Parked B" }]);
      expect(rawParking["files/Orphaned.fountain"]).toBeUndefined();

      const rawNotepad = JSON.parse(strFromU8(rawEntries["notepad.json"]));
      expect(rawNotepad["files/Script A.fountain"]).toBe("Notes for A");
      expect(rawNotepad["files/Script B.fountain"]).toBe("Notes for B");
      expect(rawNotepad["files/Orphaned.fountain"]).toBeUndefined();

      const rawProductionTags = JSON.parse(strFromU8(rawEntries["production_tags.json"]));
      expect(rawProductionTags["files/Script A.fountain"]).toEqual({ tags: [{ id: "tagA", name: "Prop A" }], definitions: [] });
      expect(rawProductionTags["files/Script B.fountain"]).toEqual({ tags: [{ id: "tagB", name: "Prop B" }], definitions: [] });

      // Check unpacked bundle
      const unpacked = unpackActoneBundle(packed);
      expect(unpacked.scripts).toHaveLength(2);
      expect(unpacked.settings.notepad["files/Orphaned.fountain"]).toBeUndefined();
      expect(unpacked.settings.todos["files/Orphaned.fountain"]).toBeUndefined();
      expect(unpacked.settings.parking["files/Orphaned.fountain"]).toBeUndefined();
      expect(unpacked.settings.genders["files/Orphaned.fountain"]).toBeUndefined();
      expect(unpacked.settings.productionTags["files/Script A.fountain"]).toEqual({ tags: [{ id: "tagA", name: "Prop A" }], definitions: [] });
      expect(unpacked.settings.productionTags["files/Script B.fountain"]).toEqual({ tags: [{ id: "tagB", name: "Prop B" }], definitions: [] });
    }
  });

  it("renaming a script, saving, and unpacking preserves todos, parking, notepad, character genders, and production tags under the new filename", () => {
    const originalScripts: ScriptInfo[] = [
      { name: "Episode 1", fileName: "files/Episode 1.fountain", type: "fountain", content: "INT. LAB - DAY", savedContent: "INT. LAB - DAY" },
      { name: "Episode 2", fileName: "files/Episode 2.fountain", type: "fountain", content: "EXT. FOREST - NIGHT", savedContent: "EXT. FOREST - NIGHT" },
    ];

    const initialSettings = {
      notepad: {
        "files/Episode 1.fountain": "Episode 1 notes",
        "files/Episode 2.fountain": "Episode 2 notes",
      },
      todos: {
        "files/Episode 1.fountain": [{ id: "t1", text: "Fix Act 1 dialogue", done: false }],
        "files/Episode 2.fountain": [{ id: "t2", text: "Review cliffhanger", done: true }],
      },
      parking: {
        "files/Episode 1.fountain": [{ id: "p1", text: "Alt punchline: What a night!" }],
        "files/Episode 2.fountain": [{ id: "p2", text: "Intro scene ideas" }],
      },
      genders: {
        "files/Episode 1.fountain": { JOHN: "male", MARY: "female" },
        "files/Episode 2.fountain": { DETECTIVE: "non-binary" },
      },
      productionTags: {
        "files/Episode 1.fountain": { tags: [{ id: "tag-car", name: "Vintage Car", category: "vehicles" }], definitions: [] },
        "files/Episode 2.fountain": { tags: [{ id: "tag-gun", name: "Prop Revolver", category: "props" }], definitions: [] },
      },
    };

    // Simulate renaming "Episode 1" -> "Pilot Episode"
    const oldFileName = "files/Episode 1.fountain";
    const newFileName = "files/Pilot Episode.fountain";

    const renamedScripts: ScriptInfo[] = [
      { name: "Pilot Episode", fileName: newFileName, type: "fountain", content: originalScripts[0].content, savedContent: originalScripts[0].savedContent },
      originalScripts[1],
    ];

    const migratedSettings = migrateSettingsKey(initialSettings, oldFileName, newFileName);

    // Save (pack) the bundle
    const packed = packActoneBundle(renamedScripts, migratedSettings);

    // Load (unpack) the bundle
    const unpacked = unpackActoneBundle(packed);

    // Scripts verification
    expect(unpacked.scripts).toHaveLength(2);
    expect(unpacked.scripts[0].name).toBe("Pilot Episode");
    expect(unpacked.scripts[0].fileName).toBe("files/Pilot Episode.fountain");
    expect(unpacked.scripts[0].content).toBe("INT. LAB - DAY");
    expect(unpacked.scripts[1].name).toBe("Episode 2");
    expect(unpacked.scripts[1].fileName).toBe("files/Episode 2.fountain");

    // Settings verification under new filename
    const notepad = unpacked.settings.notepad as Record<string, string>;
    expect(notepad["files/Pilot Episode.fountain"]).toBe("Episode 1 notes");
    expect(notepad["files/Episode 1.fountain"]).toBeUndefined();
    expect(notepad["files/Episode 2.fountain"]).toBe("Episode 2 notes");

    const todos = unpacked.settings.todos as Record<string, unknown[]>;
    expect(todos["files/Pilot Episode.fountain"]).toEqual([{ id: "t1", text: "Fix Act 1 dialogue", done: false }]);
    expect(todos["files/Episode 1.fountain"]).toBeUndefined();
    expect(todos["files/Episode 2.fountain"]).toEqual([{ id: "t2", text: "Review cliffhanger", done: true }]);

    const parking = unpacked.settings.parking as Record<string, unknown[]>;
    expect(parking["files/Pilot Episode.fountain"]).toEqual([{ id: "p1", text: "Alt punchline: What a night!" }]);
    expect(parking["files/Episode 1.fountain"]).toBeUndefined();
    expect(parking["files/Episode 2.fountain"]).toEqual([{ id: "p2", text: "Intro scene ideas" }]);

    const genders = unpacked.settings.genders as Record<string, Record<string, string>>;
    expect(genders["files/Pilot Episode.fountain"]).toEqual({ JOHN: "male", MARY: "female" });
    expect(genders["files/Episode 1.fountain"]).toBeUndefined();
    expect(genders["files/Episode 2.fountain"]).toEqual({ DETECTIVE: "non-binary" });

    const productionTags = unpacked.settings.productionTags as Record<string, unknown>;
    expect(productionTags["files/Pilot Episode.fountain"]).toEqual({ tags: [{ id: "tag-car", name: "Vintage Car", category: "vehicles" }], definitions: [] });
    expect(productionTags["files/Episode 1.fountain"]).toBeUndefined();
    expect(productionTags["files/Episode 2.fountain"]).toEqual({ tags: [{ id: "tag-gun", name: "Prop Revolver", category: "props" }], definitions: [] });
  });
});

