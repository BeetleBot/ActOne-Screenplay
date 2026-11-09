import { describe, it, expect, vi, afterEach } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { packActoneBundle, packActoneBundleAsync, unpackActoneBundle, type ScriptInfo } from "./actone";
import {
  packProseAssets,
  restoreProseAssets,
  optimizedImageSize,
  imageDescription,
  readProseImage,
  optimizeProseImage,
  resolveProseImages,
  exportProseMarkdown,
  getProseImages,
  shortenProseImages,
  nextProseImageName,
} from "./proseAssets";
const url = "data:image/png;base64,iVBORw==";
const prose = (content: string): ScriptInfo => ({
  type: "markdown",
  name: "Notes",
  fileName: "files/Notes.md",
  content,
  savedContent: content,
});
describe("portable prose images", () => {
  it("stores image bytes outside Markdown and restores exact editor content", async () => {
    const script = prose(`Before\n\n![Reference](${url})\n\nAfter`);
    for (const bytes of [packActoneBundle([script], {}), await packActoneBundleAsync([script], {})]) {
      const entries = unzipSync(bytes.slice(4));
      expect(strFromU8(entries[script.fileName])).toContain("actone-image:assets/prose/");
      expect(strFromU8(entries[script.fileName])).not.toContain("base64");
      expect(Object.keys(entries).filter((p) => p.startsWith("assets/prose/"))).toHaveLength(1);
      expect(unpackActoneBundle(bytes).scripts[0].content).toBe(script.content);
    }
  });
  it("keeps different documents and repeated images intact", () => {
    const scripts = [
      prose(`![one](${url})\n![two](${url})`),
      { ...prose(`![three](${url})`), fileName: "files/Other.md" },
    ];
    expect(unpackActoneBundle(packActoneBundle(scripts, {})).scripts.map((s) => s.content)).toEqual(
      scripts.map((s) => s.content),
    );
  });
  it("fails visibly for missing image bytes", () => {
    expect(() => restoreProseAssets("![x](actone-image:assets/prose/missing.png)", {})).toThrow("Missing prose image");
  });
  it("rejects unresolved image references when saving", () => {
    expect(() => packProseAssets(prose("![x](actone-image:assets/prose/missing.png)"), {})).toThrow("Unresolved");
  });
  it("leaves plain Markdown, links, external images and screenplay content unchanged", () => {
    const content = "![external](https://example.com/a.png)\n[link](notes.md)";
    expect(packProseAssets(prose(content), {})).toBe(content);
    expect(packProseAssets({ ...prose(`![x](${url})`), type: "fountain" }, {})).toContain(url);
  });
  it("preserves image types and Unicode descriptions", () => {
    for (const mime of ["png", "jpeg", "webp"]) {
      const content = `![தமிழ் 🌸](data:image/${mime};base64,YQ==)`;
      const entries = {};
      expect(restoreProseAssets(packProseAssets(prose(content), entries), entries)).toBe(content);
    }
  });
  it("fits large images without stretching or upscaling", () => {
    expect(optimizedImageSize(4800, 3200)).toEqual({ width: 2400, height: 1600 });
    expect(optimizedImageSize(1000, 4000)).toEqual({ width: 600, height: 2400 });
    expect(optimizedImageSize(100, 50)).toEqual({ width: 100, height: 50 });
  });
  it("makes file names safe as Markdown descriptions", () => {
    expect(imageDescription("a[b]\n.png")).toBe("a b");
  });
  it("rejects unsupported, oversized and disguised images before decoding", async () => {
    await expect(readProseImage(new File(["x"], "a.svg", { type: "image/svg+xml" }))).rejects.toThrow("Choose a PNG");
    const huge = new File([], "a.png", { type: "image/png" });
    Object.defineProperty(huge, "size", { value: 41 * 1024 * 1024 });
    await expect(readProseImage(huge)).rejects.toThrow("40 MB");
    const fake = new File([], "a.png", { type: "image/png" });
    Object.defineProperty(fake, "arrayBuffer", { value: async () => new TextEncoder().encode("not an image").buffer });
    await expect(readProseImage(fake)).rejects.toThrow("not a valid");
  });
});

describe("optional image optimization", () => {
  afterEach(() => vi.restoreAllMocks());
  it("keeps transparency using WebP and never enlarges the image", async () => {
    vi.spyOn(globalThis, "Image").mockImplementation(function () {
      return { decode: async () => {}, naturalWidth: 4800, naturalHeight: 3200 };
    } as unknown as typeof Image);
    const draw = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: draw,
    } as unknown as CanvasRenderingContext2D);
    const encode = vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/webp;base64,YQ==");
    const original = "data:image/png;base64," + "YQ==".repeat(100);
    expect(await optimizeProseImage(original)).toBe("data:image/webp;base64,YQ==");
    expect(encode).toHaveBeenCalledWith("image/webp", 0.85);
    expect(draw.mock.calls[0].slice(1)).toEqual([0, 0, 2400, 1600]);
    expect(original).toContain("data:image/png");
  });
  it("retains the original when optimization would increase size", async () => {
    vi.spyOn(globalThis, "Image").mockImplementation(function () {
      return { decode: async () => {}, naturalWidth: 80, naturalHeight: 40 };
    } as unknown as typeof Image);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/jpeg;base64," + "YQ==".repeat(100));
    const original = "data:image/jpeg;base64,YQ==";
    expect(await optimizeProseImage(original)).toBe(original);
  });
});

describe("short prose image references", () => {
  it("saves short Markdown and binary assets and restores the separate registry", async () => {
    const script = prose("![image1](image1)\n\n![image2](image2)");
    const settings = { proseImages: { image1: url, image2: "data:image/jpeg;base64,YQ==" } };
    for (const bytes of [packActoneBundle([script], settings), await packActoneBundleAsync([script], settings)]) {
      const entries = unzipSync(bytes.slice(4));
      expect(strFromU8(entries[script.fileName])).toBe(script.content);
      expect(strFromU8(entries["settings.json"])).not.toContain("base64");
      expect(entries["assets/prose/image1.png"]).toBeDefined();
      const bundle = unpackActoneBundle(bytes);
      expect(bundle.settings.proseImages).toEqual(settings.proseImages);
      expect(bundle.scripts[0].content).toBe(script.content);
      expect(resolveProseImages(bundle.scripts[0].content, bundle.settings)).toContain(url);
    }
  });
  it("excludes deleted images on save without mutating live undo assets", async () => {
    const settings = { proseImages: { image1: url, image2: url } };
    const scripts = [prose("![image2](image2)")];
    for (const bytes of [packActoneBundle(scripts, settings), await packActoneBundleAsync(scripts, settings)]) {
      const entries = unzipSync(bytes.slice(4));
      expect(entries["assets/prose/image1.png"]).toBeUndefined();
      expect(entries["assets/prose/image2.png"]).toBeDefined();
      expect(getProseImages(unpackActoneBundle(bytes).settings)).toEqual({ image2: url });
    }
    expect(settings.proseImages.image1).toBe(url);
    expect(resolveProseImages("![image1](image1)", settings)).toContain(url);
    const restored = unpackActoneBundle(packActoneBundle([prose("![image1](image1)")], settings));
    expect(getProseImages(restored.settings)).toEqual({ image1: url });
    expect(nextProseImageName(settings.proseImages)).toBe("image3");
  });
  it("retains images used by any prose document and drops all unused assets", () => {
    const settings = { proseImages: { image1: url, image2: url } };
    const scripts = [prose("No image here"), { ...prose("![Shared](image1)"), fileName: "files/Second.md" }];
    expect(getProseImages(unpackActoneBundle(packActoneBundle(scripts, settings)).settings)).toEqual({ image1: url });
    expect(getProseImages(unpackActoneBundle(packActoneBundle([prose("Deleted all")], settings)).settings)).toEqual({});
  });
  it("rejects missing named images when saving and exporting", () => {
    expect(() => packActoneBundle([prose("![image1](image1)")], {})).toThrow("Missing prose image");
    expect(() => resolveProseImages("![image1](image1)", {})).toThrow("Missing prose image");
  });
  it("converts legacy embedded pictures without retaining data in visible Markdown", () => {
    const result = shortenProseImages(`![Very long file name](${url})`, {});
    expect(result.text).toBe("![image1](image1)");
    expect(result.images.image1).toBe(url);
    expect(resolveProseImages(result.text, { proseImages: result.images })).toBe(`![image1](${url})`);
  });
});

describe("portable Markdown image export", () => {
  it("exports short relative image filenames and exact binary bytes", () => {
    const result = exportProseMarkdown("![Description](image1)", { proseImages: { image1: url } });
    expect(result.content).toBe("![Description](images/image1.png)");
    expect(result.entries["images/image1.png"]).toEqual(Uint8Array.from([137, 80, 78, 71]));
    expect(result.content).not.toContain("base64");
  });
});
