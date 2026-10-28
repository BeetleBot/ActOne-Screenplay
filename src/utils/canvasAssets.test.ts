import { describe, expect, it } from "vitest";
import { unzipSync, strFromU8, zipSync, strToU8 } from "fflate";
import { packActoneBundle, packActoneBundleAsync, unpackActoneBundle } from "./actone";

describe("Canvas project assets", () => {
  it.each([packActoneBundle, packActoneBundleAsync])(
    "stores images in assets and restores a portable canvas",
    async (pack) => {
      const content = JSON.stringify({
        type: "excalidraw",
        version: 2,
        elements: [],
        files: { image: { id: "image", mimeType: "image/png", dataURL: "data:image/png;base64,AQID" } },
      });
      const bytes = await pack(
        [{ name: "Ideas", fileName: "files/Ideas.excalidraw", type: "canvas", content, savedContent: content }],
        {},
      );
      const entries = unzipSync(bytes.slice(4));
      expect(entries["assets/files%2FIdeas.excalidraw/image"]).toEqual(new Uint8Array([1, 2, 3]));
      expect(strFromU8(entries["files/Ideas.excalidraw"])).not.toContain("base64");
      expect(JSON.parse(unpackActoneBundle(bytes).scripts[0].content)).toEqual(JSON.parse(content));
    },
  );
  it("upgrades a legacy archive while preserving screenplay content", () => {
    const legacy = zipSync({ "document.fountain": strToU8("INT. HOME - DAY\n\nHello.") });
    const opened = unpackActoneBundle(legacy);
    expect(opened.isLegacy).toBe(true);
    const saved = packActoneBundle(opened.scripts, opened.settings);
    expect(JSON.parse(strFromU8(unzipSync(saved.slice(4))["format.json"]))).toEqual({ version: 4 });
    expect(unpackActoneBundle(saved).scripts[0].content).toBe(opened.scripts[0].content);
    expect(unpackActoneBundle(saved).isLegacy).toBe(false);
  });
});
