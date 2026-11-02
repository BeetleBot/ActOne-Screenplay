import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { decodeProject, encodeProject, prepareFountainExport, readProject, saveProject } from "./fileCore";
import type { ScriptInfo } from "./actone";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
const scripts: ScriptInfo[] = [{ name: "Draft", fileName: "files/draft.fountain", type: "fountain", content: "int. room - day", savedContent: "" }];
const settings = { notepad: "Notes", custom: { retained: true } };
const options = { sections: false, synopses: false, titlePage: true };

beforeEach(() => { vi.resetAllMocks(); (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {}; });
afterEach(() => { delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__; });

describe("native file core boundary", () => {
  it("sends project data to Rust without compressing or transferring ZIP bytes", async () => {
    await saveProject("C:/Draft.actOne", scripts, settings);
    expect(invoke).toHaveBeenCalledExactlyOnceWith("save_actone_bundle", { path: "C:/Draft.actOne", scripts, settings });
  });
  it("reads projects directly by path", async () => {
    const bundle = { scripts, settings, isLegacy: false };
    vi.mocked(invoke).mockResolvedValue(bundle);
    expect(await readProject("/home/me/Draft.actone", "Draft")).toBe(bundle);
    expect(invoke).toHaveBeenCalledExactlyOnceWith("read_actone_bundle", { path: "/home/me/Draft.actone", bundleName: "Draft" });
  });
  it("decodes embedded tutorial bytes through Rust", async () => {
    await decodeProject(new Uint8Array([65, 67, 84, 49]), "Tutorial");
    expect(invoke).toHaveBeenCalledExactlyOnceWith("unpack_actone_bundle", { bytes: [65, 67, 84, 49], bundleName: "Tutorial" });
  });
  it("passes all export options to Rust", async () => {
    vi.mocked(invoke).mockResolvedValue("INT. ROOM - DAY\n");
    expect(await prepareFountainExport(scripts[0].content, { ...options, uppercaseElements: false })).toBe("INT. ROOM - DAY\n");
    expect(invoke).toHaveBeenCalledExactlyOnceWith("prepare_fountain_export", { rawText: scripts[0].content, options: { ...options, uppercaseElements: false } });
  });
  it("propagates native failures without falling back to a different save", async () => {
    vi.mocked(invoke).mockRejectedValue(new Error("replacement failed; original preserved"));
    await expect(saveProject("/project.actone", scripts, settings)).rejects.toThrow("original preserved");
    expect(invoke).toHaveBeenCalledTimes(1);
  });
  it("converts native encoded bytes into a typed array", async () => {
    vi.mocked(invoke).mockResolvedValue([65, 67, 84, 49]);
    expect(await encodeProject(scripts, settings)).toEqual(new Uint8Array([65, 67, 84, 49]));
  });
});

describe("desktop service availability", () => {
  beforeEach(() => { delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__; });
  it("reports unavailable native storage instead of saving through TypeScript", async () => {
    await expect(encodeProject(scripts, settings)).rejects.toThrow("desktop file service is unavailable");
    await expect(decodeProject(new Uint8Array())).rejects.toThrow("desktop file service is unavailable");
    await expect(saveProject("/draft.actone", scripts, settings)).rejects.toThrow("desktop file service is unavailable");
    await expect(readProject("/draft.actone")).rejects.toThrow("desktop file service is unavailable");
    expect(invoke).not.toHaveBeenCalled();
  });
  it("reports unavailable native export preparation instead of switching engines", async () => {
    await expect(prepareFountainExport("int. room - day", options)).rejects.toThrow("desktop file service is unavailable");
    expect(invoke).not.toHaveBeenCalled();
  });
});
