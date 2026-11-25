import { expect, it } from "vitest";
import { parseScreenplay } from "../parser";
import { analyzeXray, calculateXray } from "../utils/xray";
import { buildScreenplayIndex, calculateScreenplayIndex } from "../utils/sceneIndexer";
import { screenplaySources, calculateScreenplaySources } from "../lib/uraiSources";
import { acceptXrayWindowReport, createXrayWindowData, isXrayReport } from "./documentWindowBridge";
import { readCalculationCounters } from "../utils/performance";
import { getLineFacts } from "./lineFacts";

const fixtures = [
  "",
  "Title: Bees\n\nINT. HIVE - DAY\n\nA bee flies.\n\nBEE\n(quietly)\nHello!",
  "# Act One\n\n## Sequence\n\nEXT. FIELD - NIGHT\n\n/* Hidden. */\n\nBEE\nHello.\n\nQUEEN ^\nWelcome.",
];

it.each(fixtures)("preserves all analysis outputs for %j", (text) => {
  const doc = parseScreenplay(text);
  expect(analyzeXray(doc)).toEqual(calculateXray(doc));
  expect(buildScreenplayIndex(doc)).toEqual(calculateScreenplayIndex(doc));
  expect(screenplaySources(doc)).toEqual(calculateScreenplaySources(doc));
  expect(analyzeXray(doc, 120, 180)).toEqual(calculateXray(doc, 120, 180));
});

it("shares text analysis across layout/profile updates and isolates edited revisions", () => {
  const doc = parseScreenplay(fixtures[1]);
  const updated = { ...doc, pageBreaks: [20], settings: { genders: { BEE: "female" } } };
  expect(analyzeXray(updated)).toBe(analyzeXray(doc));
  expect(buildScreenplayIndex(updated)).toBe(buildScreenplayIndex(doc));
  expect(screenplaySources(updated)).toBe(screenplaySources(doc));
  expect(analyzeXray(parseScreenplay(fixtures[1] + "\nAnother line."))).not.toBe(analyzeXray(doc));
  expect(analyzeXray(doc, 120, 180)).not.toBe(analyzeXray(doc));
});

it("pairs window reports with the exact snapshot and reuses main-window analysis", () => {
  const doc = parseScreenplay(fixtures[1]);
  expect(createXrayWindowData(doc, "bees.fountain").report).toBeNull();
  analyzeXray(doc);
  const payload = createXrayWindowData(doc, "bees.fountain");
  expect(payload.report).toBe(analyzeXray(doc));
  expect(payload.parsedDoc).toBe(doc);
  expect(createXrayWindowData(null, "empty").report).toBeNull();
});

it("shares structural facts without conflating title pages or section depths", () => {
  const doc = parseScreenplay("Title: Bees\n\n# Act\n\n## Sequence\n\n### Beat\n\nINT. HIVE - DAY\n");
  const facts = getLineFacts(doc.lines);
  expect(facts.hasTitlePage).toBe(true);
  expect(facts.sections).toHaveLength(1);
  expect(facts.sectionBoundaries).toHaveLength(2);
  expect(facts.headings).toHaveLength(1);
  expect(getLineFacts(doc.lines)).toBe(facts);
});

it("accepts a matching window result and rejects malformed or stale reports", () => {
  const doc = parseScreenplay("INT. ROUNDTRIP - DAY\n\nA bee waits.");
  const payload = createXrayWindowData(doc, "roundtrip");
  const report = calculateXray(doc);
  expect(isXrayReport(report)).toBe(true);
  expect(acceptXrayWindowReport(doc, { snapshotId: payload.snapshotId, report })).toBe(true);
  expect(analyzeXray(doc)).toBe(report);
  const edited = parseScreenplay("INT. ROUNDTRIP - NIGHT\n\nA bee leaves.");
  expect(acceptXrayWindowReport(edited, { snapshotId: payload.snapshotId, report })).toBe(false);
  expect(acceptXrayWindowReport(doc, { snapshotId: payload.snapshotId, report: {} })).toBe(false);
  expect(acceptXrayWindowReport(null, payload)).toBe(false);
  expect(isXrayReport({ ...report, words: -1 })).toBe(false);
  expect(isXrayReport({ ...report, scenes: [{}] })).toBe(false);
});

it("changes reading rates without rescanning source text or changing findings", () => {
  const doc = parseScreenplay(
    `INT. LONG HIVE - DAY\n\n${"The bee investigates. ".repeat(400)}\n\nBEE\n${"We must find the queen. ".repeat(100)}`,
  );
  const before = readCalculationCounters().find((item) => item.operation === "xray-text")?.executions ?? 0;
  for (const [dialogue, action] of [
    [150, 200],
    [80, 100],
    [500, 600],
    [0, -1],
    [Number.NaN, Infinity],
  ]) {
    expect(analyzeXray(doc, dialogue, action)).toEqual(calculateXray(doc, dialogue, action));
  }
  const after = readCalculationCounters().find((item) => item.operation === "xray-text")?.executions ?? 0;
  expect(after - before).toBe(1);
});
