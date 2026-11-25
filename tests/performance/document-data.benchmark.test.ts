// Explicit benchmark: DOCUMENT_BENCHMARK=baseline npx vitest run tests/performance
import { it, expect } from "vitest";
import { performance } from "node:perf_hooks";
import { mkdirSync, writeFileSync } from "node:fs";
import { parseScreenplay } from "../../src/parser";
import { getTextStatistics } from "../../src/document/textStatistics";
import { analyzeXray } from "../../src/utils/xray";
import { buildScreenplayIndex } from "../../src/utils/sceneIndexer";

it.skipIf(!process.env.DOCUMENT_BENCHMARK)(
  "measures repeat consumers on unchanged revisions",
  () => {
    const results: Record<string, unknown>[] = [];
    for (const scenes of [10, 150, 600]) {
      const text = Array.from(
        { length: scenes },
        (_, i) =>
          `INT. ROOM ${i} - DAY\n\n${"A bee investigates the room. ".repeat(15)}\n\nBEE\n${"Something is wrong here. ".repeat(12)}\n`,
      ).join("\n");
      const doc = parseScreenplay(text);
      for (const [name, run] of Object.entries({
        words: () => getTextStatistics(text).words,
        index: () => buildScreenplayIndex(doc),
        xray: () => analyzeXray(doc),
      })) {
        const samples: number[] = [];
        for (let repeat = 0; repeat < 21; repeat++) {
          const start = performance.now();
          for (let consumer = 0; consumer < 20; consumer++) run();
          samples.push(performance.now() - start);
        }
        samples.sort((a, b) => a - b);
        results.push({
          scenes,
          characters: text.length,
          operation: name,
          consumers: 20,
          medianMs: samples[10],
          p95Ms: samples[19],
        });
      }
    }
    mkdirSync("output/benchmarks", { recursive: true });
    writeFileSync(
      `output/benchmarks/${process.env.DOCUMENT_BENCHMARK}.json`,
      JSON.stringify(
        {
          measuredAt: new Date().toISOString(),
          runtime: process.version,
          platform: process.platform,
          workload: "warm repeated pure calculations; not UI latency, CPU, or memory",
          results,
        },
        null,
        2,
      ),
    );
    expect(results).toHaveLength(9);
  },
  120000,
);
