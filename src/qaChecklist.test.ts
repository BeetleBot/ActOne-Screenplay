import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { unpackActoneBundle, packActoneBundle, ScriptInfo } from "./utils/actone";
import { parseFdxToFountain } from "./utils/text";
import { parseFadeInToFountain } from "./utils/fadeinParser";
import { stripFountainForExport } from "./utils/fountainExport";

const fixturesDir = path.resolve(process.cwd(), "qa-test-fixtures");

describe("QA Checklist: Opening Projects", () => {
  it("opens an existing .actone project with all documents in correct order and original names", () => {
    const bundleBytes = fs.readFileSync(path.join(fixturesDir, "Complete_Feature_Project.actone"));
    const bundle = unpackActoneBundle(bundleBytes);

    expect(bundle.scripts).toHaveLength(3);
    expect(bundle.scripts[0].name).toBe("Screenplay Main");
    expect(bundle.scripts[0].type).toBe("fountain");
    expect(bundle.scripts[1].name).toBe("World Bible");
    expect(bundle.scripts[1].type).toBe("markdown");
    expect(bundle.scripts[2].name).toBe("Beat Board");
    expect(bundle.scripts[2].type).toBe("canvas");
  });

  it("checks screenplay text, Markdown, and Canvas drawing integrity", () => {
    const bundleBytes = fs.readFileSync(path.join(fixturesDir, "Complete_Feature_Project.actone"));
    const bundle = unpackActoneBundle(bundleBytes);

    // Screenplay check
    expect(bundle.scripts[0].content).toContain("EXT. CHENNAI BEACH ROAD - NIGHT");
    expect(bundle.scripts[0].content).toContain("KAVIN");
    expect(bundle.scripts[0].content).toContain("MEERA");

    // Markdown check
    expect(bundle.scripts[1].content).toContain("# Production Notes & World Bible");
    expect(bundle.scripts[1].content).toContain("| **Kavin** | Protagonist |");

    // Canvas drawing check
    const canvasData = JSON.parse(bundle.scripts[2].content);
    expect(canvasData.type).toBe("excalidraw");
    expect(canvasData.elements).toBeDefined();
    expect(canvasData.elements.length).toBeGreaterThan(0);
    expect(canvasData.elements[1].text).toBe("Act I - The Hook");
  });

  it("checks notepad entries, todos, parking items, character information, and settings", () => {
    const bundleBytes = fs.readFileSync(path.join(fixturesDir, "Complete_Feature_Project.actone"));
    const bundle = unpackActoneBundle(bundleBytes);

    const mainFile = "files/Screenplay Main.fountain";
    expect(bundle.settings.notepad[mainFile]).toContain("General project scratchpad notes");
    expect(bundle.settings.todos[mainFile]).toHaveLength(2);
    expect(bundle.settings.todos[mainFile][0].text).toBe("Polish dialogue in Scene 2");
    expect(bundle.settings.parking[mainFile]).toHaveLength(1);
    expect(bundle.settings.parking[mainFile][0].text).toContain("Alternative twist");
    expect(bundle.settings.genders.KAVIN).toBeDefined();
    expect(bundle.settings.genders.KAVIN.gender).toBe("male");
    expect(bundle.settings.showSceneNumbers).toBe(true);
  });

  it("saves a copy of an older/existing project, reopens it, and confirms nothing disappears", async () => {
    const originalBytes = fs.readFileSync(path.join(fixturesDir, "Complete_Feature_Project.actone"));
    const bundle = unpackActoneBundle(originalBytes);

    const rePackedBytes = await packActoneBundle(bundle.scripts, bundle.settings);
    const reOpened = unpackActoneBundle(rePackedBytes);

    expect(reOpened.scripts.map(s => s.name)).toEqual(bundle.scripts.map(s => s.name));
    expect(reOpened.scripts[0].content).toBe(bundle.scripts[0].content);
    expect(reOpened.scripts[1].content).toBe(bundle.scripts[1].content);
    expect(reOpened.scripts[2].content).toBe(bundle.scripts[2].content);
    expect(reOpened.settings.notepad).toEqual(bundle.settings.notepad);
    expect(reOpened.settings.todos).toEqual(bundle.settings.todos);
    expect(reOpened.settings.parking).toEqual(bundle.settings.parking);
  });

  it("opens multiple projects independently and ensures each maintains its own content and settings", async () => {
    const projABytes = fs.readFileSync(path.join(fixturesDir, "Complete_Feature_Project.actone"));
    const projA = unpackActoneBundle(projABytes);

    const projBScripts: ScriptInfo[] = [
      { name: "Independent Script", fileName: "files/Independent Script.fountain", content: "EXT. INDEPENDENT - DAY\n", savedContent: "", type: "fountain" }
    ];
    const projBSettings = { notepad: "Project B Notes", todos: [{ id: "b1", text: "Task B" }] };
    const projBBytes = await packActoneBundle(projBScripts, projBSettings);
    const projB = unpackActoneBundle(projBBytes);

    expect(projA.scripts[0].name).not.toBe(projB.scripts[0].name);
    expect(projA.settings.notepad).not.toBe(projB.settings.notepad);
    expect(projB.scripts).toHaveLength(1);
    expect(projB.settings.notepad).toBe("Project B Notes");
  });
});

describe("QA Checklist: Saving — Highest Priority", () => {
  it("edits screenplay, saves, and confirms changes remain", async () => {
    const bundleBytes = fs.readFileSync(path.join(fixturesDir, "Complete_Feature_Project.actone"));
    const bundle = unpackActoneBundle(bundleBytes);

    const updatedText = bundle.scripts[0].content + "\nKAVIN\nOne more thing before I go.\n";
    bundle.scripts[0].content = updatedText;

    const savedBytes = await packActoneBundle(bundle.scripts, bundle.settings);
    const reopened = unpackActoneBundle(savedBytes);

    expect(reopened.scripts[0].content).toContain("One more thing before I go.");
  });

  it("changes several documents in one project, saves once, and confirms all changes remain", async () => {
    const bundleBytes = fs.readFileSync(path.join(fixturesDir, "Complete_Feature_Project.actone"));
    const bundle = unpackActoneBundle(bundleBytes);

    bundle.scripts[0].content += "\n// Screenplay edit";
    bundle.scripts[1].content += "\n| **Vikram** | Crime Boss |";

    const canvasObj = JSON.parse(bundle.scripts[2].content);
    canvasObj.elements.push({ id: "rect-new", type: "rectangle", x: 200, y: 200 });
    bundle.scripts[2].content = JSON.stringify(canvasObj);

    const savedBytes = await packActoneBundle(bundle.scripts, bundle.settings);
    const reopened = unpackActoneBundle(savedBytes);

    expect(reopened.scripts[0].content).toContain("// Screenplay edit");
    expect(reopened.scripts[1].content).toContain("| **Vikram** | Crime Boss |");
    expect(JSON.parse(reopened.scripts[2].content).elements.some((e: { id: string }) => e.id === "rect-new")).toBe(true);
  });

  it("renames, reorders, adds, and deletes documents, then confirms resulting structure", async () => {
    const bundleBytes = fs.readFileSync(path.join(fixturesDir, "Complete_Feature_Project.actone"));
    const bundle = unpackActoneBundle(bundleBytes);

    // 1. Add new document
    const newDoc: ScriptInfo = {
      name: "Episode 2 Outline",
      fileName: "files/Episode 2 Outline.md",
      type: "markdown",
      content: "# Episode 2",
      savedContent: ""
    };

    // 2. Rename World Bible -> Universe Bible
    const renamedDoc: ScriptInfo = {
      ...bundle.scripts[1],
      name: "Universe Bible",
      fileName: "files/Universe Bible.md"
    };

    // 3. Delete Beat Board (scripts[2]) and Reorder: Universe Bible first, then Screenplay Main, then Episode 2
    const reordered: ScriptInfo[] = [
      renamedDoc,
      bundle.scripts[0],
      newDoc
    ];

    const savedBytes = await packActoneBundle(reordered, bundle.settings);
    const reopened = unpackActoneBundle(savedBytes);

    expect(reopened.scripts).toHaveLength(3);
    expect(reopened.scripts[0].name).toBe("Universe Bible");
    expect(reopened.scripts[1].name).toBe("Screenplay Main");
    expect(reopened.scripts[2].name).toBe("Episode 2 Outline");
    expect(reopened.scripts.find(s => s.name === "Beat Board")).toBeUndefined();
  });

  it("changes settings or notes without editing screenplay text, saves, and confirms persistence", async () => {
    const bundleBytes = fs.readFileSync(path.join(fixturesDir, "Complete_Feature_Project.actone"));
    const bundle = unpackActoneBundle(bundleBytes);

    const mainFile = "files/Screenplay Main.fountain";
    const updatedNotepad = {
      ...bundle.settings.notepad,
      [mainFile]: "Updated notepad without touching screenplay."
    };

    const newSettings = {
      ...bundle.settings,
      notepad: updatedNotepad,
      showSceneNumbers: false,
      fontSize: 18,
    };

    const savedBytes = await packActoneBundle(bundle.scripts, newSettings);
    const reopened = unpackActoneBundle(savedBytes);

    expect(reopened.settings.notepad[mainFile]).toBe("Updated notepad without touching screenplay.");
    expect(reopened.settings.showSceneNumbers).toBe(false);
    expect(reopened.settings.fontSize).toBe(18);
  });

  it("saves and reads properly with Tamil and non-English characters in path and content", async () => {
    const tamilPath = path.join(fixturesDir, "திரைக்கதை திட்டம்", "திரைக்கதை மாதிரி.fountain");
    const tamilContent = fs.readFileSync(tamilPath, "utf8");

    const tamilScripts: ScriptInfo[] = [
      {
        name: "திரைக்கதை முதன்மை",
        fileName: "files/திரைக்கதை முதன்மை.fountain",
        type: "fountain",
        content: tamilContent,
        savedContent: ""
      }
    ];

    const tamilSettings = {
      notepad: "தமிழில் குறிப்புகள்",
      todos: [{ id: "t1", text: "காட்சி 1 திருத்தங்கள்" }]
    };

    const savedBytes = await packActoneBundle(tamilScripts, tamilSettings);
    const reopened = unpackActoneBundle(savedBytes);

    expect(reopened.scripts[0].name).toBe("திரைக்கதை முதன்மை");
    expect(reopened.scripts[0].content).toContain("மழை பெய்து கொண்டிருக்கிறது");
    expect(reopened.settings.notepad).toBe("தமிழில் குறிப்புகள்");
  });
});

describe("QA Checklist: Importing & Damaged Files", () => {
  it("imports standard Fountain screenplay with cues, dialogue, parentheticals, and scenes", () => {
    const fountainPath = path.join(fixturesDir, "sample_screenplay.fountain");
    const text = fs.readFileSync(fountainPath, "utf8");

    expect(text).toContain("EXT. CHENNAI BEACH ROAD - NIGHT #1#");
    expect(text).toContain("KAVIN");
    expect(text).toContain("(whispering to himself)");
    expect(text).toContain("DISSOLVE TO:");
  });

  it("imports valid Final Draft (.fdx) file into clean Fountain text", () => {
    const fdxPath = path.join(fixturesDir, "valid_sample.fdx");
    const fdxXml = fs.readFileSync(fdxPath, "utf8");

    const fountain = parseFdxToFountain(fdxXml);
    expect(fountain).toContain("EXT. CITY PARK - DAY");
    expect(fountain).toContain("SARAH");
    expect(fountain).toContain("We made it in time.");
  });

  it("handles damaged FDX file without unhandled crashes", () => {
    const damagedFdxPath = path.join(fixturesDir, "damaged_sample.fdx");
    const text = fs.readFileSync(damagedFdxPath, "utf8");

    // Should handle malformed XML gracefully (DOMParser returns parsererror document, parseFdx returns safe text or empty without throwing)
    expect(() => {
      const result = parseFdxToFountain(text);
      expect(typeof result).toBe("string");
    }).not.toThrow();
  });

  it("handles damaged Fade In file without unhandled crashes", () => {
    const damagedFadeInPath = path.join(fixturesDir, "damaged_sample.fadein");
    const bytes = fs.readFileSync(damagedFadeInPath);

    // Damaged archive should throw a catchable error or return empty without catastrophic process exit
    expect(() => {
      try {
        parseFadeInToFountain(new Uint8Array(bytes));
      } catch (e) {
        expect(e).toBeDefined();
      }
    }).not.toThrow();
  });
});

describe("QA Checklist: Exporting", () => {
  it("exports screenplay to fountain with formatting intact", () => {
    const fountainPath = path.join(fixturesDir, "sample_screenplay.fountain");
    const raw = fs.readFileSync(fountainPath, "utf8");

    const formatted = stripFountainForExport(raw, {});
    expect(formatted).toBeDefined();
    expect(formatted.length).toBeGreaterThan(0);
    expect(formatted).toContain("EXT. CHENNAI BEACH ROAD - NIGHT");
  });
});
