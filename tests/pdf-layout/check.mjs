import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { getDocument, OPS } from "pdfjs-dist/legacy/build/pdf.mjs";

const directory = await mkdtemp(join(tmpdir(), "actone-pdf-layout-"));
try {
  const executable = resolve(
    "src-tauri/target/debug/examples/pdf_layout_fixture" + (process.platform === "win32" ? ".exe" : ""),
  );
  execFileSync(executable, [directory], { timeout: 30000 });
  for (const [name, width, height] of [
    ["letter", 612, 792],
    ["a4", 595.28, 841.89],
    ["watermark", 612, 792],
  ]) {
    const loading = getDocument({
      data: new Uint8Array(await readFile(join(directory, `${name}.pdf`))),
      useSystemFonts: false,
    });
    const document = await loading.promise;
    try {
      assert.equal(document.numPages, 1);
      const page = await document.getPage(1);
      assert.ok(Math.abs(page.view[2] - width) < 1, `${name}: paper width`);
      assert.ok(Math.abs(page.view[3] - height) < 1, `${name}: paper height`);
      const { items } = await page.getTextContent();
      const find = (text) => {
        const item = items.find((item) => item.str?.includes(text));
        assert.ok(item, `Missing text: ${text}`);
        return item;
      };
      const left = find("BOB"),
        right = find("ALICE");
      assert.ok(right.transform[4] - left.transform[4] > 100, "Dialogue columns must be separated");
      assert.ok(Math.abs(left.transform[5] - right.transform[5]) < 1, "Character cues must share a baseline");
      const ld = find("Left dialogue."),
        rd = find("Right dialogue.");
      assert.ok(ld.transform[4] + ld.width < rd.transform[4], "Dialogue columns must not overlap");
      assert.ok(Math.abs(ld.transform[5] - rd.transform[5]) < 1, "Dialogue must appear side by side");
      for (const item of [left, right, ld, rd]) {
        assert.ok(item.transform[4] >= 0 && item.transform[4] + item.width <= width, "Text must stay inside the page");
        assert.ok(item.transform[5] > 0 && item.transform[5] < height, "Text must stay inside page height");
      }
      if (name === "watermark") {
        const mark = find("CONFIDENTIAL");
        assert.ok(
          Math.abs(mark.transform[1]) > 1 && Math.abs(mark.transform[2]) > 1,
          "Center watermark must be rotated",
        );
        const ops = await page.getOperatorList();
        const alpha = ops.fnArray.findIndex(
          (fn, i) =>
            fn === OPS.setGState &&
            ops.argsArray[i][0].some(([key, value]) => key === "ca" && Math.abs(value - 0.35) < 0.001),
        );
        assert.ok(alpha >= 0, "Watermark must use 35% fill opacity");
        assert.ok(ops.fnArray.slice(alpha + 1).includes(OPS.showText), "Opacity must apply to painted text");
        assert.ok(items.indexOf(mark) < items.indexOf(left), "Watermark must be painted behind screenplay text");
      } else {
        assert.ok(!items.some((item) => item.str?.includes("CONFIDENTIAL")));
      }
    } finally {
      await loading.destroy();
    }
  }
  console.log("PDF layout: Letter/A4 geometry, dual dialogue and watermark checks passed.");
} finally {
  await rm(directory, { recursive: true, force: true });
}
