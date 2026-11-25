# Document-data benchmark results

Measured locally on Windows with Node v24.16.0. Original source revision: `e79c080c1544290be2bc174a77588ca38934eb40`. These are development-runtime pure-calculation benchmarks, not overall application-speed measurements.

## Original, intermediate and final checkpoints

Each cell is median milliseconds for **20 repeated consumers** on an unchanged 600-scene / 458,289-character script, over 21 samples. Early values below 0.01 ms are shown as `<0.01`; raw precision and p95 values are preserved in the linked JSON.

| Checkpoint | Words | Scene index | X-Ray | Raw report |
|---|---:|---:|---:|---|
| baseline | 74.863 | 3.172 | 124.288 | [JSON](document-data/baseline.json) |
| step-1-statistics | <0.01 | 3.106 | 121.172 | [JSON](document-data/step-1-statistics.json) |
| step-2-analysis | <0.01 | <0.01 | <0.01 | [JSON](document-data/step-2-analysis.json) |
| step-3-windows-layout | <0.01 | <0.01 | <0.01 | [JSON](document-data/step-3-windows-layout.json) |
| step-4-structure-fonts | <0.01 | <0.01 | <0.01 | [JSON](document-data/step-4-structure-fonts.json) |
| step-5-search-lifecycle | 0.030 | 0.032 | 0.032 | [JSON](document-data/step-5-search-lifecycle.json) |
| step-6-reading-rates-windows | 0.016 | 0.016 | 0.016 | [JSON](document-data/step-6-reading-rates-windows.json) |
| final | 0.015 | 0.015 | 0.016 | [JSON](document-data/final.json) |

The final lookup times include development-only calculation-counter instrumentation added during migration. This explains the small increase from the early cache-only checkpoints. These phases reuse the same calculator workload; the table does not independently measure window, font, search or layout performance. System load varied during intermediate validation, so sub-millisecond differences are not interpreted as regressions or precise speedup factors.

## BeeDetective reference comparison

The final same-process comparison measures uncached reference calculators against warm shared consumers. It is additional evidence, not a retrospectively measured native-app baseline. BeeDetective is normalized to LF (66,976 characters).

| Calculation | Reference median ms | Shared median ms |
|---|---:|---:|
| words | 10.121 | 0.019 |
| index | 2.082 | 0.018 |
| xray | 46.578 | 0.019 |

[Raw BeeDetective/prose reference results](document-data/final-reference.json). Cache hits avoid rescanning text. New revisions still pay the initial calculation cost; these numbers do not imply equivalent gains in typing or app launch speed.

## Correctness and build validation

- Final focused run: **169 tests passed** across document calculations, search, X-Ray/window sharing, fonts, pagination, timeline, syntax, AI tools and scene sources.
- Full-suite run during migration: **1,301 passed, 5 failed, 12 skipped**. The five failures are in the unchanged `src/linuxWorkflow.test.ts` and concern missing packaging-workflow conditions/manual choices. This is not an all-green suite claim.
- **352 PDF regression cases passed** (32 targeted and 320 boundary cases). The fixture runner needed a 180-second allowance instead of its former 30-second timeout for the expanded matrix. PDF engine/layout rules were not changed.
- Direct comparison against the untouched HEAD X-Ray implementation passed for four inputs (including BeeDetective) and five reading-rate pairs, including invalid-rate fallbacks.
- TypeScript checking and production frontend build passed. Lint passed with existing warnings; targeted lint found no errors.
- Isolated Tauri desktop build passed. Its runtime workflow could not connect to the local driver socket: **WinError 10013**.
- Native benchmark harness syntax-check passed; it has not executed successfully in this environment.

## Execution policy and periodic checks

`npm run benchmark:document-data -- checkpoint-name` records fresh raw reports under `output/benchmarks/`. Historical reports above are retained in the repo for review. The benchmark workflow configures Windows/Linux runs on relevant PRs, main/master pushes, manual dispatch and weekly schedules, with 30-day artifact retention. Hosted runs begin only after this change is pushed.

Deterministic tests guard cache identity, bounds, stale results, failed requests, zero eager work and concurrent request sharing. Timing thresholds require repeated observations on stable runners and are not fabricated from these local samples.

## Remaining verification

Native command-to-frame, document switching, X-Ray opening, sustained CPU, process memory and Linux WebKitGTK runtime measurements remain unverified. The new native harness can collect several of these after local-driver access is available; it is not a substitute for testing tab switching or exact keystroke latency. No baseline/native figures are inferred from calculator results.

The UI layout, visible controls, count definitions, scheduling and PDF layout rules were intentionally preserved. Focused tests support output parity, but native-runtime UX parity cannot be certified while its driver is blocked. See [architecture and execution details](../developer-guide/12-document-data.md).
