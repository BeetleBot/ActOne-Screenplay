import { describe, expect, it, vi } from "vitest";
import { parseScreenplay } from "../parser";
import { analyzeXray } from "./xray";
import { buildXrayReport, renderXrayPrintPage, exportXrayPdf } from "./xrayReport";
const invoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...args: unknown[]) => invoke(...args) }));
const sample =
  "Title: A Story\nAuthor: Writer\n\nINT. ROOM - DAY\n\nA door opens.\n\nALICE (V.O.)\nHello there.\n\nBOB\nHello Alice.\n\nEXT. PARK - NIGHT\n\nALICE\nGood night.";
describe("X-Ray report", () => {
  it("counts body text, normalizes voices and tracks shared scenes", () => {
    const r = analyzeXray(parseScreenplay(sample));
    expect(r.words).toBe(9);
    expect(r.dialogueWords).toBe(6);
    expect(r.actionWords).toBe(3);
    expect(r.characters[0]).toMatchObject({ name: "ALICE", words: 4, speeches: 2, scenes: [1, 2] });
    expect(r.connections).toEqual([{ names: ["ALICE", "BOB"], scenes: [1] }]);
    expect(r.scenes[1].offset).toBe(r.scenes[0].seconds);
  });
  it("excludes multiline notes and boneyards without shifting source links", () => {
    const doc = parseScreenplay(
      "INT. ROOM - DAY\n\nVisible action.\n\n/*\n\nGHOST\nHidden words.\n\n*/\n\n[[A note\nacross lines]]\n\nALICE\nHello.",
    );
    const r = analyzeXray(doc);
    expect(r.words).toBe(3);
    expect(r.characters.map((c) => c.name)).toEqual(["ALICE"]);
    expect(doc.lines[r.characters[0].firstLine].text).toBe("ALICE");
  });
  it("handles empty drafts without invented duration", () => {
    expect(analyzeXray(parseScreenplay(""))).toMatchObject({
      words: 0,
      seconds: 0,
      scenes: [],
      characters: [],
      findings: [],
    });
  });
  it("does not carry a speaker into an action or another scene", () => {
    const r = analyzeXray(parseScreenplay(sample));
    expect(r.scenes[1].speechWords.BOB).toBeUndefined();
    expect(r.scenes[1].speakers).toEqual(["ALICE"]);
  });
  it("exposes review thresholds and adjustable reading estimates", () => {
    const doc = parseScreenplay(`INT. ROOM - DAY\n\nALICE\n${"word ".repeat(110)}`);
    const r = analyzeXray(doc);
    expect(r.findings.map((f) => f.title)).toEqual(
      expect.arrayContaining(["Long speech · ALICE", "Dialogue-heavy scene · 1"]),
    );
    expect(analyzeXray(doc, 120).seconds).toBeGreaterThan(analyzeXray(doc, 180).seconds);
    expect(analyzeXray(doc, 0, NaN).seconds).toBe(r.seconds);
  });
  it("keeps pre-scene writing in totals and detects empty scenes", () => {
    const r = analyzeXray(parseScreenplay("An opening image.\n\nINT. ROOM - DAY\n\nEXT. PARK - NIGHT"));
    expect(r.preSceneWords).toBe(3);
    expect(r.words).toBe(3);
    expect(r.findings).toHaveLength(2);
  });
  it("exports chart pages with escaped manuscript labels and methodology", () => {
    const r = analyzeXray(parseScreenplay(sample));
    const pages = buildXrayReport(r, "Story <script>", 150, 200);
    const svg = pages.map((page, i) => renderXrayPrintPage(page, "Story <script>", i, pages.length)).join("");
    expect(svg).toContain("Story &lt;script&gt;");
    expect(svg).toContain("<rect");
    expect(svg).toContain("<circle");
    expect(svg).toContain("150 wpm");
    expect(svg).toContain("INT. ROOM");
    expect(svg).not.toContain("NaN");
    expect(pages.map((p) => p.title)).toContain("Cast across the story");
  });
  it("sends rendered chart pages to the native PDF exporter", async () => {
    Object.defineProperty(window, "__TAURI_INTERNALS__", { value: {}, configurable: true });
    vi.stubGlobal(
      "Image",
      class {
        src = "";
        decode = () => Promise.resolve();
      },
    );
    vi.stubGlobal("URL", { createObjectURL: () => "blob:test", revokeObjectURL: vi.fn() });
    const context = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
    const encode = vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,PNG");
    invoke.mockResolvedValueOnce("report.pdf");
    await expect(exportXrayPdf(analyzeXray(parseScreenplay(sample)), "Story", 150, 200)).resolves.toBe(true);
    expect(invoke).toHaveBeenCalledWith(
      "export_xray_pdf",
      expect.objectContaining({ fileName: "Story", pages: expect.arrayContaining(["PNG"]) }),
    );
    invoke.mockRejectedValueOnce(new Error("Disk unavailable"));
    await expect(exportXrayPdf(analyzeXray(parseScreenplay(sample)), "Story", 150, 200)).rejects.toThrow(
      "Disk unavailable",
    );
    context.mockRestore();
    encode.mockRestore();
    vi.unstubAllGlobals();
    Reflect.deleteProperty(window, "__TAURI_INTERNALS__");
  });
});
