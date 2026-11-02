import { describe, expect, it } from "vitest";
import { zipSync, strToU8 } from "fflate";
import { stripFountainForExport } from "../../src/utils/fountainExport";
import { parseFadeInXmlToFountain } from "../../src/utils/fadeinParser";
import { parseFdxToFountain } from "../../src/utils/text";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { packActoneBundle, unpackActoneBundle } from "../../src/utils/actone";
import type { ScriptInfo } from "../../src/utils/actone";

function native(requests: unknown[]): unknown[] {
  const executable = resolve(`src-tauri/target/debug/examples/file_core_bridge${process.platform === "win32" ? ".exe" : ""}`);
  const result = spawnSync(executable, [], { input: requests.map(r => JSON.stringify(r)).join("\n") + "\n", encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (result.error) throw result.error;
  expect(result.status, result.stderr).toBe(0);
  return result.stdout.trim().split(/\r?\n/).map(line => {
    const response = JSON.parse(line);
    expect(response.error).toBeUndefined();
    return response.ok;
  });
}
const fixtures = ["Test-Files/Interstellar.actone", "Test-Files/MultiLanguage.actone", "Test-Files/BeeDetectiveTour.actone", "public/samples/BeeDetectiveTour.actone", "src-tauri/samples/BeeDetectiveTour.actone"];

// JSON numeric spelling/whitespace is not Canvas content; compare every value.
function contents(bundle: ReturnType<typeof unpackActoneBundle>) {
  return { ...bundle, scripts: bundle.scripts.map(script => script.type === "canvas"
    ? { ...script, content: JSON.parse(script.content), savedContent: JSON.parse(script.savedContent) }
    : script) };
}

describe("real project compatibility in both directions", () => {
  it.each(fixtures)("preserves %s through native save and browser reopen", path => {
    const bytes = new Uint8Array(readFileSync(resolve(path)));
    const expected = unpackActoneBundle(bytes, "Fixture");
    const [opened] = native([{ op: "unpack", bytes: Buffer.from(bytes).toString("base64"), name: "Fixture" }]);
    expect(opened).toEqual(expected);
    const [packed] = native([{ op: "pack", scripts: expected.scripts, settings: expected.settings }]);
    const rustBytes = new Uint8Array(Buffer.from(packed as string, "base64"));
    const browser = unpackActoneBundle(rustBytes);
    expect(contents(browser)).toEqual(contents(unpackActoneBundle(packActoneBundle(expected.scripts, expected.settings))));
    const [nativeReopened] = native([{ op: "unpack", bytes: packed }]);
    expect(nativeReopened).toEqual(browser);
  });
});

describe("generated Unicode and asset compatibility", () => {
  it.each(Array.from({ length: 32 }, (_, seed) => seed))("round trips generated project seed %i", seed => {
    const scripts: ScriptInfo[] = Array.from({ length: seed % 5 + 1 }, (_, i) => ({
      name: `Draft ${seed}-${i} தமிழ் 🎭`, fileName: `files/தமிழ் ${seed}-${i}.${i % 2 ? "md" : "fountain"}`,
      type: i % 2 ? "markdown" : "fountain", content: `${"தமிழ் नमस्ते 🌎 \"quoted\" \\path\n\n".repeat(seed + 1)}${i}`, savedContent: "",
    }));
    if (seed % 3 === 0) scripts.push({ name: "Canvas", fileName: `files/Ideas ${seed}.excalidraw`, type: "canvas", savedContent: "", content: JSON.stringify({ type: "excalidraw", version: 2, elements: [], files: { "தமிழ் / image": { id: "தமிழ் / image", mimeType: "image/png", dataURL: `data:image/png;base64,${Buffer.from(Array.from({ length: seed * 17 + 1 }, (_, i) => i % 256)).toString("base64")}` } } }) });
    const settings = { notepad: Object.fromEntries(scripts.map(s => [s.fileName, `Notes ${s.name}`])), todos: [{ text: "Task", done: false }], parking: [], genders: { HERO: "female" }, productionTags: { retained: seed }, unknown: { nested: [seed, null, true, "🎭"] } };
    const tsBytes = packActoneBundle(scripts, settings);
    const expected = unpackActoneBundle(tsBytes);
    expect(native([{ op: "unpack", bytes: Buffer.from(tsBytes).toString("base64") }])[0]).toEqual(expected);
    const [packed] = native([{ op: "pack", scripts, settings }]);
    expect(unpackActoneBundle(new Uint8Array(Buffer.from(packed as string, "base64")))) .toEqual(expected);
  });
});


describe("review regression compatibility with retained TypeScript", () => {
  const exportInputs = [
    "\ufeffTitle: Private title\nAuthor: Writer\n\nint. room - day\n\n# Section\n= Summary\n\n@john\nHello.",
    "inté room\n\n!Action.\n\n@john\n(quietly)\nHello.",
    "\ufeff# Section\n\n\ufeff= Summary\n\n!Action.\ufeff",
    "\u0085Title: Not a title\n\nint. room - day\n\u0085",
  ];
  it.each(Array.from({length: 16}, (_, flags) => flags))("matches legacy export across options %i", flags => {
    const options = {sections: !!(flags & 1), synopses: !!(flags & 2), titlePage: !!(flags & 4), uppercaseElements: !!(flags & 8)};
    expect(native(exportInputs.map(text => ({op: "strip", text, options})))).toEqual(exportInputs.map(text => stripFountainForExport(text, options)));
  });
  it.each([
    '<!DOCTYPE fadein><fadein><para><style basestyle="Character"/><text>John</text></para></fadein>',
    '<fadein><para><style basestyle="" name="Character"/><text>John</text></para><para><style basestyle="" name="Dialogue"/><text>Hello.</text></para></fadein>',
  ])("matches legacy Fade In XML: %s", xml => {
    const bytes = zipSync({"document.xml": strToU8(xml)});
    expect(native([{op: "import", name: "draft.fadein", bytes: Buffer.from(bytes).toString("base64")}])[0]).toBe(parseFadeInXmlToFountain(xml));
  });
  it("matches legacy FDX with a document declaration", () => {
    const xml = '<!DOCTYPE FinalDraft><FinalDraft><Paragraph Type="Character"><Text>John</Text></Paragraph></FinalDraft>';
    expect(native([{op: "import", name: "draft.fdx", bytes: Buffer.from(xml).toString("base64")}])[0]).toBe(parseFdxToFountain(xml));
  });
  it("opens a legacy null document type", () => {
    const bytes = zipSync({"project.json": strToU8(JSON.stringify([{name: "Main", file: "files/main.fountain", type: null}])), "files/main.fountain": strToU8("Hello")});
    expect(native([{op: "unpack", bytes: Buffer.from(bytes).toString("base64")}])[0]).toEqual(unpackActoneBundle(bytes));
  });
  it.each(["Zh==", "Zh", " Z h ==\n"])("accepts legacy Canvas base64 %s", encoded => {
    const scripts: ScriptInfo[] = [{name: "Canvas", fileName: "files/Canvas.excalidraw", type: "canvas", savedContent: "", content: JSON.stringify({type: "excalidraw", files: {a: {mimeType: "image/png", dataURL: `data:image/png;base64,${encoded}`}}})}];
    const [packed] = native([{op: "pack", scripts, settings: {}}]);
    expect(contents(unpackActoneBundle(new Uint8Array(Buffer.from(packed as string, "base64"))))).toEqual(contents(unpackActoneBundle(packActoneBundle(scripts, {}))));
  });
});
