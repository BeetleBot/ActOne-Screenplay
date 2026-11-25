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
  // The fixture now renders 352 cases; allow the full matrix on slower hosts.
  execFileSync(executable, [directory], { timeout: 180000 });
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
  const cases = [
    "heading-three",
    "heading-single",
    "heading-cue",
    "heading-chain",
    "shot-three",
    "section-three",
    "parenthetical",
    "dialogue-sentence",
    "action-split",
    "dual-short",
    "dual-long",
    "dual-unequal",
    "long-sentence",
    "manual-break",
    "hidden-outline",
    "styled-heading",
  ];
  for (const paper of ["letter", "a4"]) {
    for (const name of cases) {
      const loading = getDocument({
        data: new Uint8Array(await readFile(join(directory, `${paper}-${name}.pdf`))),
        useSystemFonts: false,
      });
      const document = await loading.promise;
      const pages = [];
      try {
        for (let number = 1; number <= document.numPages; number++) {
          const page = await document.getPage(number);
          const { items } = await page.getTextContent();
          const rows = new Map();
          for (const item of items.filter((item) => item.str?.trim())) {
            const y = item.transform[5];
            if (y > page.view[3] - 65) continue; // Page number, outside body.
            assert.ok(y >= 72 - 0.1, `${paper}-${name}: body/continuation marker below bottom margin`);
            const key = Math.round(y * 10);
            if (!rows.has(key)) rows.set(key, []);
            rows.get(key).push(item);
          }
          const lines = [...rows]
            .sort(([a], [b]) => b - a)
            .map(([, items]) =>
              items
                .sort((a, b) => a.transform[4] - b.transform[4])
                .map((item) => item.str)
                .join(""),
            );
          pages.push(lines.join("\n").replace(/\s/g, ""));
        }
        const label = `${paper}-${name}`;
        const all = pages.join("\n");
        const onPage = (text) => pages.findIndex((page) => page.includes(text.replace(/\s/g, ""))) + 1;
        if (
          [
            "heading-three",
            "heading-single",
            "heading-cue",
            "heading-chain",
            "hidden-outline",
            "styled-heading",
          ].includes(name)
        ) {
          assert.equal(onPage("INT. ORPHAN TEST - DAY"), 2, `${label}: heading must move with its content`);
          assert.equal(
            onPage(name === "heading-cue" ? "Speech row 1." : "Action row 1."),
            2,
            `${label}: content follows heading`,
          );
        }
        if (["heading-chain", "shot-three"].includes(name)) {
          assert.equal(onPage("CLOSE ON THE DOOR"), 2, `${label}: shot must stay with action`);
        }
        if (name === "section-three") {
          assert.equal(onPage("A SECTION"), 2, `${label}: section must stay with action`);
          assert.equal(onPage("Action row 1."), 2, label);
        }
        if (name === "parenthetical") {
          assert.equal(onPage("Before row 3."), 1, label);
          assert.equal(onPage("(quietly)"), 2, `${label}: parenthetical moves with following speech`);
          assert.equal(onPage("After row 1."), 2, label);
          assert.ok(pages[0].endsWith("(MORE)"), `${label}: outgoing marker follows spoken text`);
          assert.ok(pages[1].startsWith("BOB(CONT'D)"), `${label}: continuation repeats cue`);
        }
        if (name === "dialogue-sentence") {
          assert.equal(onPage("Speech row 3."), 1, label);
          assert.equal(onPage("Speech row 4"), 2, `${label}: split at complete sentence`);
          assert.ok(pages[0].endsWith("Speechrow3.(MORE)"), label);
          assert.ok(pages[1].startsWith("BOB(CONT'D)"), label);
        }
        if (name === "action-split") {
          assert.equal(onPage("Action row 3."), 1, label);
          assert.equal(onPage("Action row 4."), 2, `${label}: leave two action lines for continuation`);
          assert.equal(onPage("Action row 5."), 2, label);
        }
        if (name === "dual-short") {
          assert.equal(onPage("BOB"), 2, `${label}: keep dual dialogue intact`);
          assert.equal(onPage("ALICE"), 2, label);
          assert.ok(!all.includes("(MORE)"), label);
        }
        if (["dual-short", "dual-long", "dual-unequal"].includes(name)) {
          const left = name === "dual-short" ? 6 : 70;
          const right = name === "dual-short" ? 6 : name === "dual-unequal" ? 2 : 65;
          for (const [prefix, count] of [
            ["Left", left],
            ["Right", right],
          ]) {
            const actual = [...all.matchAll(new RegExp(`${prefix}row(\\d+)\\.`, "g"))].map((match) => Number(match[1]));
            assert.deepEqual(
              actual,
              Array.from({ length: count }, (_, i) => i + 1),
              `${label}: every ${prefix} line appears once`,
            );
          }
          if (name === "dual-long") {
            assert.equal(onPage("Left row 1."), 1, label);
            assert.equal(onPage("Right row 1."), 1, `${label}: overflow in left column must not skip right column`);
            assert.ok(all.includes("CONT'D"), label);
          }
          if (name === "dual-unequal") {
            assert.equal((all.match(/ALICE/g) ?? []).length, 1, `${label}: completed column must not restart`);
          }
        }
        if (name === "long-sentence") {
          assert.ok(
            pages.length >= 2 && pages.length <= 10,
            `${label}: oversized sentence paginates with bounded progress`,
          );
          for (const word of ["words", "without", "punctuation"]) {
            assert.equal(
              (all.match(new RegExp(word, "g")) ?? []).length,
              450,
              `${label}: oversized speech retains every ${word}`,
            );
          }
          assert.equal(onPage("INT. ORPHAN TEST - DAY"), onPage("BOB"), label);
        }
        if (name === "manual-break") {
          assert.equal(onPage("INT. ORPHAN TEST - DAY"), 1, label);
          assert.equal(onPage("Action row 1."), 2, `${label}: explicit page break is honored`);
        }
        if (name === "hidden-outline") {
          assert.ok(!all.includes("Hidden"), label);
        }
      } finally {
        await loading.destroy();
      }
    }
  }
  const boundaryCases = JSON.parse(await readFile(join(directory, "boundary-cases.json"), "utf8"));
  for (const testCase of boundaryCases) {
    const { name, kind, prefixes, first, second } = testCase;
    const pages = await inspectPdf(join(directory, `${name}.pdf`), name);
    const compact = (text) => text.replace(/\s/g, "");
    const texts = pages.map((page) => compact(page.lines.join("\n")));
    const all = texts.join("\n");
    const firstPrefix = prefixes[0];
    assert.equal(
      texts.findIndex((text) => text.includes("INT.BOUNDARY-DAY")),
      texts.findIndex((text) => text.includes(`${firstPrefix}001.`)),
      `${name}: heading stays with actual content`,
    );
    for (const page of pages) {
      assert.ok(page.lines.length > 0, `${name}: no accidental blank pages`);
      const last = compact(page.lines.at(-1));
      assert.ok(
        !["INT.BOUNDARY-DAY", "BOB", "BOB(CONT'D)", "ALICE", "ALICE(CONT'D)", "(whispering)"].includes(last),
        `${name}: stranded heading/cue/parenthetical at page bottom: ${last}`,
      );
      assert.ok(!compact(page.lines[0]).startsWith("CUTTO:"), `${name}: closing transition cannot start a page`);
    }
    for (const [index, prefix] of [...prefixes].entries()) {
      const count = index === 0 ? first : second;
      const actual = [...all.matchAll(new RegExp(`${prefix}(\\d{3})\\.`, "g"))].map((match) => Number(match[1]));
      assert.deepEqual(
        actual,
        Array.from({ length: count }, (_, i) => i + 1),
        `${name}: ${prefix} text is preserved once in order`,
      );
    }
    if (prefixes === "A") {
      const fragments = texts.map((text) => (text.match(/A\d{3}\./g) ?? []).length).filter(Boolean);
      if (fragments.length > 1)
        assert.ok(
          fragments.every((count) => count >= 2),
          `${name}: action split needs two lines each side`,
        );
    } else if (prefixes === "LR") {
      for (const [column, prefix, cue, total] of [
        ["left", "L", "BOB", first],
        ["right", "R", "ALICE", second],
      ]) {
        const fragments = pages
          .map((page) => compact(page[column].join("\n")))
          .filter((text) => new RegExp(`${prefix}\\d{3}\\.`).test(text));
        for (const [index, text] of fragments.entries()) {
          const count = (text.match(new RegExp(`${prefix}\\d{3}\\.`, "g")) ?? []).length;
          assert.ok(text.includes(cue), `${name}: ${column} fragment has cue`);
          if (fragments.length > 1) assert.ok(count >= 2, `${name}: ${column} split needs two spoken lines each side`);
          if (index < fragments.length - 1) assert.ok(text.endsWith("(MORE)"), `${name}: ${column} outgoing MORE`);
          if (index > 0) assert.ok(text.startsWith(`${cue}(CONT'D)`), `${name}: ${column} continuation cue`);
        }
        assert.ok(total > 0 && fragments.length > 0, name);
      }
    } else {
      const fragments = texts.filter((text) => /[DE]\d{3}\./.test(text));
      for (const [index, text] of fragments.entries()) {
        const count = (text.match(/[DE]\d{3}\./g) ?? []).length;
        assert.ok(text.includes("BOB"), `${name}: spoken fragment has character cue`);
        if (fragments.length > 1) assert.ok(count >= 2, `${name}: dialogue split needs two spoken lines each side`);
        if (index < fragments.length - 1) assert.ok(text.endsWith("(MORE)"), `${name}: outgoing MORE follows speech`);
        if (index > 0) assert.ok(text.startsWith("BOB(CONT'D)"), `${name}: continuation cue starts page`);
        assert.ok(!text.includes("(whispering)(MORE)"), `${name}: parenthetical stays with following speech`);
      }
    }
  }
  console.log(
    `PDF layout: Letter/A4 geometry, watermarks, 32 targeted cases and ${boundaryCases.length} boundary cases passed.`,
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}

async function inspectPdf(path, label) {
  const loading = getDocument({ data: new Uint8Array(await readFile(path)), useSystemFonts: false });
  const document = await loading.promise;
  const pages = [];
  try {
    assert.ok(document.numPages <= 10, `${label}: bounded pagination`);
    for (let number = 1; number <= document.numPages; number++) {
      const page = await document.getPage(number);
      const { items } = await page.getTextContent();
      const rows = new Map();
      for (const item of items.filter((item) => item.str?.trim())) {
        const [x, y] = item.transform.slice(4);
        if (y > page.view[3] - 65) continue;
        assert.ok(y >= 72 - 0.1, `${label}: text and MORE stay above bottom margin`);
        assert.ok(x >= 0 && x + item.width <= page.view[2] + 0.1, `${label}: text stays within paper width`);
        const key = Math.round(y * 10);
        if (!rows.has(key)) rows.set(key, []);
        rows.get(key).push(item);
      }
      const sorted = [...rows]
        .sort(([a], [b]) => b - a)
        .map(([, items]) => items.sort((a, b) => a.transform[4] - b.transform[4]));
      const lines = (filter) =>
        sorted
          .map((items) =>
            items
              .filter(filter)
              .map((item) => item.str)
              .join(""),
          )
          .filter((text) => text.trim());
      const middle = page.view[2] / 2 + 36;
      pages.push({
        lines: lines(() => true),
        left: lines((item) => item.transform[4] < middle),
        right: lines((item) => item.transform[4] >= middle),
      });
    }
  } finally {
    await loading.destroy();
  }
  return pages;
}
