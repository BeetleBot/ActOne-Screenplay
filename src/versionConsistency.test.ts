import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const read = (path: string) => readFileSync(path, "utf8");
const version = (JSON.parse(read("package.json")) as { version: string }).version;

describe("release version consistency", () => {
  it("keeps npm and desktop manifests and lockfiles aligned", () => {
    const lock = JSON.parse(read("package-lock.json")) as { version: string; packages: Record<string, { version: string }> };
    expect(lock.version).toBe(version);
    expect(lock.packages[""].version).toBe(version);
    expect(JSON.parse(read("src-tauri/tauri.conf.json")).version).toBe(version);
    expect(read("src-tauri/Cargo.toml").match(/\[package\][\s\S]*?^version = "([^"]+)"/m)?.[1]).toBe(version);
    expect(read("src-tauri/Cargo.lock").match(/name = "actone"\r?\nversion = "([^"]+)"/)?.[1]).toBe(version);
  });
  it("keeps the newest changelog and Flatpak release aligned without duplicate versions", () => {
    expect(read("CHANGELOG.md").match(/^## \[([^\]]+)\]/m)?.[1]).toBe(version);
    const releases = Array.from(read("flatpak/ink.iyal.actone.metainfo.xml").matchAll(/<release version="([^"]+)"/g), match => match[1]);
    expect(releases[0]).toBe(version);
    expect(new Set(releases).size).toBe(releases.length);
  });
});
