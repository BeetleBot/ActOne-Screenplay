# Shared document data

ActOne shares pure derived data through `src/document/` while retaining existing
file ownership, React subscriptions, editor transactions and native layout rules.
No new editable document copy or global all-purpose context is introduced.

## Ownership and identity

`FileContext` remains authoritative for file/script contents and parsed documents.
`FileSubscriptions` continues to expose text, parsed content, pagination, metadata
and actions independently. Consumers must subscribe to the smallest existing
domain they require. Sprint now uses those narrow subscriptions.

Parsed line arrays are immutable input snapshots. Calculators keyed by their
identity reuse results across metadata and pagination wrapper updates. A new
parse creates a new key. `documentSnapshotId` assigns a weak, process-local ID to
that source snapshot for window communication. IDs are never persisted or used
as scene IDs, file paths, script positions, or text revisions in saved projects.

Pure exact-text statistics and search results may safely be reused across files:
their outputs contain no file identity. Native layout requests additionally key
by file/script identity and all supplied layout inputs. Editor and export
settings are not interchangeable.

Do not mutate shared results or parsed arrays. Apply edits through existing
document actions and consume a new snapshot. View-specific sorting must copy or
filter arrays first. Stateful outline reconciliation and live CodeMirror
position mapping retain their existing owners and semantics.

## Calculations and demand

| Data | Owner/cache | Trigger |
|---|---|---|
| Raw word, character and line counts | `textStatistics.ts` | Requested text changes |
| Heading/section/title facts | `lineFacts.ts` | Requested parsed line snapshot changes |
| Scene index | `utils/sceneIndexer.ts` | Requested parsed line snapshot changes |
| UrAI scene sources | `lib/uraiSources.ts` | Requested parsed line snapshot changes |
| X-Ray text analysis | `utils/xray.ts` | Requested parsed line snapshot changes |
| X-Ray reading estimates/findings | X-Ray report cache | Snapshot or reading rates change |
| Search matches | `searchResults.ts` | Requested text, query or matching flags change |
| Native screenplay/prose layout | Existing pagination hooks plus shared pending requests | Existing 200/300 ms scheduling |
| System font inventory | Existing font hook plus shared pending requests | Explicit refresh |

No root effect calculates all of these after every edit. A closed panel does not
request its data merely because the cache exists. UrAI may legitimately request
X-Ray data while X-Ray is closed; the demand comes from its reading/tool request.
Existing word-count definitions in raw text, script statistics and X-Ray remain
distinct. Selection counts also remain separate from whole-document counts.

Sprint timer ticks reuse document counts and perform only time/rate arithmetic.
Timeline and Status Bar share structural facts. Native page-break changes no
longer rebuild Fountain syntax decorations; current layout documents still reach
existing consumers. The paper-size effect reuses matching parses within its
update instead of parsing the active text twice.

## Window sharing

`createXrayWindowData` attaches a cached default report when available and always
pairs it with the source snapshot. It **does not** initiate analysis on the
editor thread. X-Ray computes a missing report in its own WebView as before.

At the default reading rates, X-Ray emits `modal:xray:analysis-result` containing
the report and snapshot ID. The editor checks the active source identity and
validates the report shape before priming its cache. Stale/malformed results are
discarded. Cached reports are not emitted back in a loop. Event listeners follow
existing window/component cleanup. Non-native/browser consumers retain the local
calculation path.

Profile updates do not invalidate text analysis. Reading-rate changes reuse the
text analysis but recompute affected estimates and findings using the original
formulas, rounding and ordering. These are reading estimates, not performed time.

## Bounds, failure and freshness

- Object snapshots use weak keys and can be collected when no longer referenced.
- Each snapshot retains at most four option variants.
- Each exact-text calculator retains at most two snapshots, one million total
  UTF-16 units, and four option variants per snapshot. Oversized inputs are
  calculated without retention.
- Failed calculations are not cached.
- Identical native requests share only pending work. Completed and failed
  promises are removed. Explicit later font refreshes and layout visits still
  execute, preserving external-resource freshness and existing timing.
- Each pagination consumer retains its own stale-result and unmount checks.
  Sharing a native promise does not authorize it to update a different document.

Development diagnostics in `utils/performance.ts` retain at most 200 timing
samples and 32 operation counters. They record sizes/counts/times, never source
text. Production builds disable these diagnostics.

## Domain boundaries

Search matching is shared; query UI, current match and replacements remain in
SearchContext. Autocomplete and editing operations keep their current live
CodeMirror path when a background parse would be stale. The parser worker's
existing per-document queue and fallback remain authoritative.

Spellchecking depends on dictionary state, ranges and exclusions; it is not
merged with word counting or given a cache that could suppress dictionary
updates. Themes/preferences already have separate owners and are not tied to
document revisions. Canvas, parking, todos and markers retain their editable
state owners. Snapshots, save/import/export, AI requests and translation jobs
remain explicit operations, not memoized side effects.

## Verification and benchmarks

Run `npm run benchmark:document-data -- checkpoint-name` explicitly after each
migration. Raw reports are written under `output/benchmarks/`; normal tests skip
timing workloads but run deterministic cache, bounds, parity, lifecycle and
request-sharing checks.

The benchmark measures 20 repeated consumers over 21 samples and reports median
and p95. Synthetic fixtures cover 10/150/600 scenes. A separate same-process
reference comparison covers BeeDetective and prose text. Prose here exercises
pure calculations, not native prose layout. Fresh edited inputs have parity
checks. Results are calculator timings, **not** native keystroke latency, CPU,
window-opening time or process-memory measurements.

`.github/workflows/document-data-benchmark.yml` configures Windows/Linux runs on
relevant pull requests, main/master pushes, manual dispatch and weekly schedules.
It uploads raw reports for 30 days. It takes effect when pushed to GitHub; no
hosted run has been performed by this local change. Timing thresholds are not
hard-coded from one machine. Deterministic execution-sharing tests guard against
duplicate work without flaky wall-clock assertions.

`tests/desktop/benchmark.py` provides a separate native harness using the isolated
desktop-test application and the existing driver tools. It requires Python
`psutil`. After `npm run build:desktop-test`, run:

```sh
python tests/desktop/benchmark.py --phase current --runs 5
```

Use `--application` for a separately built isolated baseline binary and
`--fixture` for another project/script. Prose requires `--skip-xray`. The harness
checks the isolated application identifier before accessing storage, copies the
fixture to a temporary workspace, records document-open and edit-command-to-frame
times, X-Ray readiness, idle CPU and aggregate app/WebView RSS, and repeats app
lifecycles. Command timings include WebDriver overhead; aggregate RSS can count
shared pages more than once. It does not measure raw keystroke event latency or
tab-switch latency. Resource sampling requires access to the test process tree.

Native CPU/memory/typing benchmarks and a Linux WebKitGTK runtime comparison are
still required before claiming an overall application speedup. This session's
native driver connection was denied with WinError 10013, so the new native
benchmark harness has only been syntax-checked, not executed. See
`../performance/document-data-results.md` for measured stages and validation limits.
