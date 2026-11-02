import { afterAll, expect, vi } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";

const oracle = vi.hoisted(() => {
  const records: unknown[] = [];
  const encode = (v: unknown): unknown => v === undefined ? { $undefined: true }
    : v instanceof Uint8Array ? { $bytes: Buffer.from(v).toString("base64") }
    : Array.isArray(v) ? v.map(encode)
    : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, value]) => [k, encode(value)])) : v;
  return { records, encode };
});

function instrument<T extends object>(module: T, names: string[]) {
  return Object.fromEntries(Object.entries(module).map(([name, fn]) => [name, names.includes(name) ? (...args: unknown[]) => {
    const input = oracle.encode(args);
    const result = fn(...args);
    const save = (value: unknown) => {
      oracle.records.push({ test: expect.getState().currentTestName, name, args: input, expected: oracle.encode(value) });
      return value;
    };
    return result instanceof Promise ? result.then(save) : save(result);
  } : fn]));
}

vi.mock("../../src/utils/actone", async importOriginal => instrument(await importOriginal(), ["packActoneBundle", "packActoneBundleAsync", "unpackActoneBundle"]));
vi.mock("../../src/utils/fountainExport", async importOriginal => instrument(await importOriginal(), ["stripFountainForExport"]));
vi.mock("../../src/utils/fadeinParser", async importOriginal => instrument(await importOriginal(), ["parseFadeInToFountain", "parseFadeInXmlToFountain"]));
vi.mock("../../src/utils/text", async importOriginal => instrument(await importOriginal(), ["parseFdxToFountain", "parseScriptFileToFountain"]));
vi.mock("../../src/utils/perScriptSettings", async importOriginal => instrument(await importOriginal(), ["getPerScriptSetting", "getPerScriptSettingArray", "getPerScriptSettingObject", "getPerScriptSettingString", "getPerScriptSettingNumber", "migrateSettingsKey", "removeSettingsKey", "updatePerScriptSetting"]));
vi.mock("../../src/utils/savedFile", async importOriginal => instrument(await importOriginal(), ["acknowledgeSavedFile"]));

afterAll(() => {
  const dir = resolve("src-tauri/tests/fixtures/file-core");
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, `${basename(expect.getState().testPath!)}.json`), JSON.stringify(oracle.records) + "\n");
});
