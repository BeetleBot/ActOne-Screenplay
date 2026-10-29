import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import tauriConfig from "../src-tauri/tauri.conf.json";

describe("application identity", () => {
  it("keeps the desktop app and Flatpak identity aligned", () => {
    const manifest = readFileSync("flatpak/ink.iyal.actone.yml", "utf8");
    const metainfo = readFileSync("flatpak/ink.iyal.actone.metainfo.xml", "utf8");

    expect(tauriConfig.identifier).toBe("ink.iyal.actone");
    expect(manifest).toMatch(new RegExp(`^app-id: ${tauriConfig.identifier.replaceAll(".", "\\.")}$`, "m"));
    expect(metainfo).toContain(`<id>${tauriConfig.identifier}</id>`);
    expect(metainfo).toContain(`${tauriConfig.identifier}.desktop`);
  });
});
