# Rust file core migration audit

Research date: 2 November 2026. Scope: the desktop ActOne repository, before implementation.

## Conclusion and preservation commitment

Moving project storage and format conversion into Rust is feasible. A staged migration can retain the existing UI and file format. This audit is not proof of an implemented migration, a zero-defect guarantee, or certification of Windows/Linux parity. Android has not been audited.

The acceptance target is the same project contents, supported formats, editing workflows, export options, and visible results. Replacing ZIP compression does not require identical archive bytes. PDF fidelity requires page/render comparison; merely producing a PDF header is insufficient. Existing defects must be recorded separately rather than silently treated as desirable compatibility behavior.

No application source was changed for this audit. Existing user modifications must be preserved, particularly `Test-Files/BeeDetectiveTour.actone` and untracked StoreThumbnails artwork/scripts. Sample projects must be read or copied into isolated test directories, never rewritten in place by migration tests.

## Current ownership and entry points

| Responsibility | Authoritative implementation | Migration treatment |
| --- | --- | --- |
| Bundle decoding, encoding, defaults, legacy migration | `src/utils/actone.ts` | Rust core with compatibility fixtures |
| Canvas binary assets and data URL restoration | `src/utils/canvasAssets.ts` | Rust asset codec, retaining editor JSON contract |
| Open, Save, Save As, per-project queues, editor flush, dirty tracking | `src/context/FileContext.tsx`, `src/utils/savedFile.ts`, `src/editor/pendingEdits.ts` | Rust owns storage; React retains editor synchronization and acknowledges the revision actually written |
| Native dialogs, binary/text reads, atomic project writes, folder grants | `src-tauri/src/lib.rs` | Reuse and consolidate; retain Linux Flatpak folder access handling |
| Snapshot scheduling and live payload capture | `src/context/SnapshotContext.tsx` | Retain live editor capture; move archive production behind Rust commands |
| Snapshot storage, index, retention and deletion | `src-tauri/src/snapshots.rs` | Already Rust; add concurrency/failure coverage |
| Fountain cleanup for export | `src/utils/fountainExport.ts` | Port existing rule order and cases, not a replacement parser with different behavior |
| FDX and Fade In import | `src/utils/text.ts`, `src/utils/fadeinParser.ts` | Rust XML/archive conversion with matched fixtures |
| PDF import | `parse_pdf_to_fountain` in `lib.rs` | Already Rust through pdf2fountain; preserve import notice and unsaved-project workflow |
| Screenplay and prose PDF layout, FDX/Fade In generation | `src-tauri/src/pdf/` | Reuse the existing engine and tests |
| Export dialogs, completion actions and PDF preview | `src/components/ExportScriptWindow.tsx`, `ExportPdfWindow.tsx`, `PdfExportPreview.tsx` | Keep UI; verify command arguments and preview/export equivalence |
| Tutorial/sample bundle loading | `src/App.tsx`, `src/components/OnboardingTour.tsx` | Route native loading through the new reader too |
| X-Ray analysis PDF | `src/utils/xrayReport.tsx`, `src-tauri/src/xray_pdf.rs` | Retain existing rendering pipeline; it includes frontend rendering, not just Rust PDF packaging |
| Canvas image export | `src/components/CanvasEditor.tsx`, Excalidraw | Preserve existing image export; moving bundle storage does not replace the graphics renderer |
| Recent files, selected document, cursor/selection/scroll memory | `FileContext.tsx`, `src/utils/editorPosition.ts` | Preserve local UI persistence and independence from bundle dirty state |
| Close/save-before-exit | `src/App.tsx`, FileContext close operations | Preserve cancel/error handling and keep windows open if data remains dirty |

## Bundle compatibility contract

- Current output: `ACT1` prefix plus ZIP, `format.json` version 4, ordered `project.json` array.
- Input accepts prefixed magic, historical trailing magic, and ordinary ZIP bytes.
- Support screenplay, Markdown and Canvas documents without changing their order or attaching another document's content/settings.
- Preserve Unicode names/text, emojis, multiline formatting, custom settings, sprint history, character data, todos, parking, notepad and stored conversations.
- Preserve single-document versus multiple-document metadata shapes and current fallback defaults.
- Read older `fountain.json` manifests and flat document paths, normalize to `files/`, and migrate the corresponding supported metadata keys.
- Read manifest-less Fountain/Markdown bundles, inferred names, empty-manifest fallback and absent optional JSON entries.
- Preserve conversation fallback precedence: `urai.json`, historical `muse.json`, then `prompt.json`.
- Preserve Canvas image bytes, MIME type/defaults and encoded document/image paths. A missing referenced asset currently throws rather than being silently discarded.
- Keep current handling of malformed optional JSON separate from invalid required manifests or corrupt ZIPs. Record differences explicitly before tightening validation.
- Preserve existing unknown settings. Arbitrary unknown ZIP entries are not currently round-tripped by the TypeScript implementation; full preservation of such entries would be an additional behavior change.
- Do not conflate archive content preservation with text-read newline normalization. Record CRLF cases separately for native text reads and bundle reads before migration.

## Save and snapshot behavior to preserve

- Flush pending text/Canvas edits before taking a save or snapshot payload.
- Save the requested project even when another tab is active.
- Serialize saves per project; use a captured revision and acknowledge only that revision.
- Keep edits, settings changes, document additions/deletions/renames/reordering made during a write dirty until saved.
- Preserve the selected filesystem path and extension case. Windows comparisons and Linux case-sensitive paths use different rules; POSIX backslashes can be filename characters.
- Preserve Save As cancellation, suggested names, chosen folder grants, recent-file updates and unsaved-project transitions.
- Preserve autosave timing and the current active-project behavior. Autosave is not the same operation as snapshot scheduling.
- Preserve manual, automatic and on-save snapshots, comments/tags, retention of manual snapshots, and reopening as a new unsaved project.
- Snapshots must include live unsaved project content; copying only the last saved disk file is insufficient.
- Preserve Save & Exit, Close All and Close Others behavior when saving fails or is canceled.
- Atomic project writing already uses a unique sibling temporary file, writes/syncs it, then renames. On replacement failure it preserves the destination and reports the temporary path. Do not replace it with truncating writes.

## Findings requiring explicit verification

1. **Native export argument mismatches.** `ExportScriptWindow` sends `fountainText` to `export_fountain`, while its Rust function requires `content`. It sends `markdownText` and `defaultName` to `export_markdown`, while Rust requires `content` and has no default-name parameter. Current completion-action tests mock command names and do not validate actual Tauri argument decoding. Confirm/fix these with command-contract coverage and desktop smoke tests.
2. **Separate legacy export abstraction.** `ExportContext.tsx` invokes `export_screenplay`, but that command is not registered in `lib.rs`. Its format union includes HTML; the active script export UI uses separate native commands. Do not mistake this abstraction's mocked success for a working HTML/native export route.
3. **Legacy opening can write immediately.** Native project opening upgrades legacy archives on disk. Characterize both dialog and direct-path entry points and failure behavior before changing them. Tests must operate on disposable copies.
4. **Snapshot collision/index risks.** Snapshot IDs have second precision; concurrent creations can target the same filename. Index updates are read-modify-write with direct `fs::write`, without a transaction across snapshot creation/pruning/index persistence. Add tests before claiming complete recovery safety.
5. **Snapshot location discrepancy.** The frontend persists project/app-data/custom location options, but the inspected Rust storage path always uses the project's `.snapshots` directory. Documentation claiming custom storage works is not sufficient evidence.
6. **Snapshot UI discrepancy.** Developer docs describe in-place restore and read-only opening. The current panel opens a snapshot as a new unsaved project; no `restore_snapshot` command is registered. Preserve actual implemented behavior and correct stale documentation during migration.
7. **Metadata documentation discrepancy.** `productionTags` remains inside `settings.json`; the packer does not emit the documented separate `production_tags.json` or `marker.json`. Rename/delete helpers cover five metadata properties and do not include productionTags. The legacy flat-manifest test creates production_tags.json but does not assert restoration of that entry. Add characterization tests; do not claim existing recovery of data the reader currently ignores.
8. **Export writes differ from project saves.** Fountain/Markdown/FDX/Fade In use direct writes. Screenplay/prose PDF export can create/truncate a destination before rendering completes. A shared atomic export path would improve failure handling, but must be tested as an intentional change. Several commands currently collapse cancellation and failure into `None`.
9. **Browser fallback is real scope.** Bundle/file downloads and tutorial loading have non-Tauri paths. Removing the TypeScript codec requires retaining a fallback or supplying a browser-compatible Rust/Wasm build; native commands alone cannot preserve those paths. Existing browser FDX/Fade In fallback branches download cleaned Fountain text with another extension, so their actual behavior needs separate treatment.
10. **Graphics remain frontend concerns.** Canvas image export and X-Ray page rendering use browser-side graphics. Moving every export operation literally into native Rust would be a separate rendering rewrite with much greater parity risk.

## Existing test migration map

Port all individual cases belonging to moved logic, preserving their inputs and assertions. Keep UI/integration cases in TypeScript and supplement them with Rust core cases; translating React tests into Rust alone would lose coverage.

| Existing suite | Rust equivalents / retained integration coverage |
| --- | --- |
| `src/utils/actone.test.ts` | Every core round trip, mixed document set, magic header, sync/async content equivalence, reorder stability, Gen 1/2/3 migration, conversation migration, ignored marker entry, manifest-less recovery, Unicode, metadata isolation and rename case |
| `src/utils/canvasAssets.test.ts` | Binary asset extraction/restoration and legacy-to-version-4 upgrade; retain async command integration equivalents |
| `src/utils/perScriptSettings.test.ts` | Fallback shapes, type-specific access, migration/deletion for all five currently handled properties, partial/malformed settings and update semantics where ownership moves |
| `src/utils/savedFile.test.ts` | Revision acknowledgement and edits-during-save cases in any Rust save model; retain frontend dirty-state assertions |
| `src/utils/fountainExport.test.ts` | Every heading/character/shot/transition rule; forced action and centered text preservation; dialogue/lyrics/parentheticals; title page, metadata, section and synopsis options |
| `src/utils/fadeinParser.test.ts` | Formatting combinations, zipped import, unified file routing, forced syntax, dialogue/parenthetical continuity for both Fade In and FDX |
| `src/utils/filePath.test.ts`, `scriptMode.test.ts` | Native path/type routing equivalents where moved; keep frontend routing checks |
| `src/context/FileContext.test.tsx` | Keep all frontend cases: case-preserved paths, Linux case distinction, folder grants, save status, duplicate naming, prose preservation, targeted save, snapshots, Save As synchronization, stale parse protection, imports, remembered document across sessions |
| `src/context/SnapshotContext.test.tsx`, `src/components/SnapshotsPanel.test.tsx` | Keep settings/scheduling/panel coverage and live unsaved capture; add native creation/list/deletion/retention integration cases |
| `src/components/ExportWindow.test.tsx`, `src/utils/exportWindow.test.ts` | Keep cancellation, errors, completion/open actions, routing and settings handoff; add real native command argument validation |
| `src/components/PdfExportPreview.test.tsx` | Keep prose/screenplay routing, refresh, stale-result suppression, caching, changed image watermarks, fit/zoom/resize and keyboard navigation |
| `src/context/ExportContext.test.tsx` | Characterize separately; its mocked command is not proof of active native export support |
| Canvas editor, ScriptsView, editor position and script reorder suites | Retain frontend behavior tests, especially pending-edit flush, document targeting, selection/scroll restoration and undo/redo |
| Existing Rust `pdf`, `snapshots`, `xray_pdf` and atomic-write tests | Retain; extend coverage without replacing the current PDF renderer |

## Additional evidence required before replacing working paths

1. Shared fixture corpus consumed by the old TypeScript codec and new Rust codec in both directions. Compare ordered documents, content, all settings and restored binary assets, not ZIP timestamps/compression bytes.
2. Real project copies plus synthetic legacy archives, mixed Canvas/prose/script projects, Unicode/path cases, missing entries, malformed manifests/optional metadata, duplicate archive paths and unknown fields. Preserve ZIP encounter order for manifest-less fallback selection.
3. Every existing moved-logic test mapped to its Rust test name; parameterized cases accounted for explicitly. Add generated round trips with reproducible seeds.
4. Save-race tests for typing, settings changes, rename/delete/add/reorder, tab switching, Save As and exit during an outstanding write. A Rust-only test cannot prove React's dirty indicator remains correct.
5. Failure injection at temporary creation, writing, syncing, replacement, snapshot/index persistence and pruning. Verify original bytes and recoverable temporary bytes; include missing parents, invalid destinations, full-disk simulation and locked files.
6. Actual Tauri boundary tests for required/optional argument names, results, cancellation versus failure and structured error propagation. Mocked `invoke` alone cannot establish the contract.
7. Export fixtures: title pages, sections, synopses, dual dialogue, continuations, scene numbering/colors, paper sizes, element formats, script-specific fonts, multilingual shaping, watermarks and prose tables/links/code. Compare PDF page counts and rendered pages; parse generated XML/ZIP outputs.
8. Desktop walkthrough on Windows and Linux, including Flatpak folder grants. OS dialogs, file locks and exit handling need native checks in addition to headless tests.
9. Explicit browser fallback verification before removing TypeScript codecs. Preserve existing user workflows; report fixes to existing broken branches separately.
10. Full frontend/Rust suites, typecheck, lint, frontend/native build checks, and updated developer docs. User-facing help changes only where actual user behavior changes or existing descriptions are corrected.

## Inspected project fixtures

Archives were inspected read-only, without printing screenplay contents:

| File | Format marker | Manifest documents | Asset entries |
| --- | --- | ---: | ---: |
| `Test-Files/Interstellar.actone` | Version 4 | 6 | 0 |
| `Test-Files/MultiLanguage.actone` | No format.json (legacy) | 4 | 0 |
| `Test-Files/BeeDetectiveTour.actone` | Version 4, user-modified | 5 | 0 |
| `public/samples/BeeDetectiveTour.actone` | No format.json (legacy) | 4 | 0 |
| `src-tauri/samples/BeeDetectiveTour.actone` | No format.json (legacy) | 4 | 0 |

These samples do not supply binary Canvas asset coverage; synthetic fixtures are necessary.

## Baseline verification

- Typecheck passed.
- Lint completed with 0 errors and 92 warnings.
- Initial frontend run failed before tests loaded because temporary-cache renames were denied by the execution environment. Retried with TEMP/TMP pointing into an ignored workspace cache and four workers: **122 test files passed; 1,051 tests passed and 11 skipped (1,062 total)**. The run completed in 189.45 seconds. Skipped tests are not counted as verified behavior.
- Initial Rust run: 180 passed, 7 failed, 3 ignored. Five failures concerned temporary file replacement in the environment's default temporary folder.
- Rust retry using the writable workspace temporary folder: **185 passed, 2 failed, 3 ignored**. Atomic-save and snapshot tests passed. The two remaining failures are `urai::provider::transport_tests::real_http_stream_and_payload` and `http_errors_never_expose_response_secrets`. They use a local HTTP test server; the connection fails in this environment. Root cause beyond that observed failure has not been established.
- The ignored Rust cases require a BeeDetective Fountain fixture, an unlocked native credential store, or a configured live AI evaluation endpoint. They must not be reported as passed.
- Logs are under ignored `node_modules/.cache/rust-migration-audit/`. Native GUI walkthroughs, Linux execution, production builds and migration parity tests have not been performed during this research stage.

## Recommended sequence

First freeze the behavior/fixture/test map and establish the baseline failures. Then add a Rust bundle core alongside TypeScript, prove bidirectional compatibility, and route desktop operations through it incrementally. Next move import/export cleanup rules and consolidate safe writes. Keep UI tests and browser compatibility until equivalent paths exist. Remove duplicate production logic only after the parity gates pass. Record each intentional existing-defect fix separately.

Assurance must be based on this evidence: no feature dropped without an explicit scope decision, no completion claim while required parity checks fail, and a clear account of any platform or workflow that has not been verified.

## Post-implementation review and corrections

The historical baseline above describes the research stage. Desktop bundle/import/export preparation and snapshot storage now run in Rust. React intentionally retains live editor state, per-script state updates, save queues and revision acknowledgement; `project_state.rs` is test-only reference code. Existing TypeScript codec files are retained. Android is outside this migration and no browser fallback is required by the native file service.

The code review found and corrected DOCTYPE handling, empty Fade In style fallback, ECMAScript whitespace/word-boundary export differences, browser-compatible Canvas base64 decoding, null manifest types, synchronous snapshot compression, deletion persistence ordering, and silent damaged-index replacement. Regression tests include direct comparisons against retained TypeScript and failure injection for snapshot storage. Custom snapshot directory preferences remain unchanged by explicit scope decision.

Snapshot recovery preserves invalid index bytes, rebuilds entries from revision filenames, and treats recovered entries as manual to protect them from retention. Original comments/tags cannot be recovered without a usable index. The test-only native bridge now supports import and export-preparation comparisons in addition to bundle round trips.

### Verification after review fixes

- Rust: 278 unit tests, 6 native integration/PDF parity tests, and 7 documentation tests passed; 3 existing tests remain ignored. The run used local network access for the two local AI-server transport tests.
- Cross-language native compatibility: 60 tests passed, including 23 added regression cases covering export option combinations, DOCTYPE imports, style fallback, manifest defaults, and Canvas encoding.
- Full frontend suite: 123 files passed, 1,065 tests passed and 11 skipped. Following the final import-error UI change, the updated FileContext suite passed all 36 tests (including two added failure-path cases).
- Typecheck passed. Lint reported 0 errors and the existing 92 warnings. Diff whitespace checks passed.
- All old TypeScript files are retained. Linux/Flatpak execution and an interactive desktop walkthrough were not performed during this correction pass.
- Final Windows desktop debug build passed (`npm run tauri -- build --debug --no-bundle`), including the updated frontend. Build warnings concern bundle sizes and incremental-cache hard links; neither prevented the build.
