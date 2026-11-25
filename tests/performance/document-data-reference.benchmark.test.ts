import { expect, it } from "vitest";
import { performance } from "node:perf_hooks";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseScreenplay } from "../../src/parser";
import { countWords } from "../../src/utils/text";
import { calculateXray, analyzeXray } from "../../src/utils/xray";
import { calculateScreenplayIndex, buildScreenplayIndex } from "../../src/utils/sceneIndexer";
import { getTextStatistics } from "../../src/document/textStatistics";

it.skipIf(!process.env.DOCUMENT_BENCHMARK)(
  "compares unchanged reference calculators with cached consumers",
  () => {
    const fixtures = {
      BeeDetective: readFileSync("Test-Files/BeeDetective.fountain", "utf8").replace(/\r\n/g, "\n"),
      prose: "# A journey\n\nA bee follows a trail through the garden.\n\n".repeat(1000),
    };
    const results: object[] = [];
    for (const [fixture, text] of Object.entries(fixtures)) {
      const doc = parseScreenplay(text);
      const operations = {
        words: { reference: () => countWords(text), shared: () => getTextStatistics(text).words },
        index: { reference: () => calculateScreenplayIndex(doc), shared: () => buildScreenplayIndex(doc) },
        xray: { reference: () => calculateXray(doc), shared: () => analyzeXray(doc) },
      };
      for (const [operation, functions] of Object.entries(operations)) {
        expect(functions.shared()).toEqual(functions.reference());
        for (const [mode, run] of Object.entries(functions)) {
          const samples: number[] = [];
          for (let repeat = 0; repeat < 21; repeat++) {
            const start = performance.now();
            for (let consumer = 0; consumer < 20; consumer++) run();
            samples.push(performance.now() - start);
          }
          samples.sort((a, b) => a - b);
          results.push({
            fixture,
            characters: text.length,
            operation,
            mode,
            consumers: 20,
            medianMs: samples[10],
            p95Ms: samples[19],
          });
        }
      }
      // Fresh source revisions must still return correct results after an edit.
      const changed = parseScreenplay(text + "\n\nINT. NEW HIVE - DAY\n\nA bee arrives.");
      expect(analyzeXray(changed)).toEqual(calculateXray(changed));
      expect(buildScreenplayIndex(changed)).toEqual(calculateScreenplayIndex(changed));
    }
    mkdirSync("output/benchmarks", { recursive: true });
    writeFileSync(
      `output/benchmarks/${process.env.DOCUMENT_BENCHMARK}-reference.json`,
      JSON.stringify(
        {
          measuredAt: new Date().toISOString(),
          runtime: process.version,
          scope: "Same-process calculator reference comparison, not native UI responsiveness or prose layout",
          results,
        },
        null,
        2,
      ),
    );
  },
  120000,
);
