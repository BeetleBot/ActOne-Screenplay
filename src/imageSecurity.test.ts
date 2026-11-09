import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface DesktopConfig { app?: { security?: { csp?: string } }; }
const config = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8")) as DesktopConfig;
const directives = new Map(config.app!.security!.csp!.split(";").map(part => {
  const [name, ...sources] = part.trim().split(/\s+/);
  return [name, sources];
}));

describe("packaged image loading policy", () => {
  it("allows the temporary blob images used by canvas import resizing and cursor previews", () => {
    expect(directives.get("img-src")).toContain("blob:");
    // Regression against the actual installed reducer: its temporary image URL
    // must be covered even though the optimization dialog uses data URLs.
    const reducer = readFileSync("node_modules/image-blob-reduce/index.js", "utf8");
    expect(reducer).toContain("URL.createObjectURL(env.blob)");
    expect(reducer).toContain("env.image.src = env.image_url");
  });
  it("continues allowing bundled and data images across canvas, prose, optimization previews and X-Ray", () => {
    expect(directives.get("img-src")).toEqual(["'self'", "data:", "blob:"]);
  });
  it("retains bundled/blob PDF workers without permitting blob scripts or remote images", () => {
    expect(directives.get("worker-src")).toEqual(["'self'", "blob:"]);
    expect(directives.get("script-src")).toEqual(["'self'"]);
    expect(directives.get("default-src")).toEqual(["'self'"]);
  });
  it("uses the same image policy for the Linux packaging overlay", () => {
    const overlay = JSON.parse(readFileSync("src-tauri/tauri.appimage.conf.json", "utf8")) as DesktopConfig;
    expect(overlay.app?.security?.csp).toBeUndefined();
  });
});
