# .actone Bundle Format and Desktop File Core

## Ownership

Desktop project encoding/decoding is implemented in `src-tauri/src/actone.rs`. `src/utils/fileCore.ts` is the guarded Tauri command boundary used by FileContext and embedded tutorial loading. Native commands fail explicitly if the desktop service is unavailable; they do not switch to a TypeScript codec.

The previous implementations in `src/utils/actone.ts`, `canvasAssets.ts`, `fountainExport.ts`, `fadeinParser.ts`, and `text.ts` are deliberately retained for reference, test comparison, and rollback. Existing non-native branches are legacy code, not a web release target. Android is outside this migration.

React still owns live editor state, pending-edit flushing, document selection, save queues, per-script setting updates, and dirty-state acknowledgement. This is an explicit runtime boundary, not a completed migration of UI state to Rust. `project_state.rs` is compiled only for Rust parity tests; its reference implementations are not production services. Rust owns bundle conversion, disk writes, native import conversion, snapshot packing/storage, and export text preparation. The existing Rust PDF/FDX/Fade In engines remain in use. Canvas image rendering and X-Ray page rendering retain their existing graphics pipeline.

## Native Commands

All payload keys use camelCase. `ScriptInfo` contains `name`, `fileName`, `type` (`fountain`, `markdown`, or `canvas`), `content`, and `savedContent`. The last field is UI bookkeeping; only current content is stored in the archive.

| Command | Payload | Result |
| --- | --- | --- |
| `read_actone_bundle` | `{ path, bundleName? }` | Decoded bundle, reading disk in Rust |
| `unpack_actone_bundle` | `{ bytes, bundleName? }` | Decoded bundle for embedded samples |
| `pack_actone_bundle` | `{ scripts, settings }` | Encoded bytes; available for boundary testing/explicit byte consumers |
| `save_actone_bundle` | `{ path, scripts, settings }` | Completes only after encoding and atomic replacement |
| `import_script_content` | `{ path }` | Fountain text from FDX/Fade In, or normalized text |
| `prepare_fountain_export` | `{ rawText, options }` | Cleaned Fountain text |

A decoded bundle contains ordered `scripts`, `settings`, `promptChats`, and `isLegacy`. The file core runs blocking encoding/decoding and file work through `spawn_blocking`. Core errors reject the frontend invocation.

`prepare_fountain_export` accepts `sections`, `synopses`, `titlePage`, and optional `uppercaseElements` (default true). FDX/Fade In export callers disable section/synopsis output as before. Native Fountain export accepts `fountainText`; Markdown export accepts `content`, `defaultDirectory?`, and `defaultName?`.

## Storage Format

Output is a ZIP archive prefixed by the four bytes `ACT1` (`41 43 54 31`). `format.json` records version 4. ZIP compression bytes/timestamps may differ between implementations without changing project contents.

```text
format.json
project.json
files/<document>.fountain
files/<document>.md
files/<document>.excalidraw
assets/<encoded-document-path>/<encoded-image-id>
settings.json
characters.json
todos.json
parking.json
notepad.json
sprint_data.json
urai.json
```

`project.json` is an ordered array of `{ name, file, type }`. Unknown settings, character profiles and productionTags remain in `settings.json`. The current writer does not emit separate production_tags.json or marker.json entries.

Canvas images are binary asset entries. Stored Canvas JSON references `actoneAsset`; opening restores data URLs, preserving binary bytes and MIME information. A missing referenced image is an error. JSON field order is preserved; floating-point parsing uses round-trip precision. Tests compare Canvas JSON values where JSON numeric spelling differs between serializers.

Single-document and multiple-document metadata shapes preserve existing compatibility rules. Packing filters orphaned keys for genders, todos, parking and notepad in keyed multi-document metadata. Existing rename/delete UI helpers cover notepad, todos, parking, genders and characterProfiles; productionTags is not implicitly migrated by those helpers.

Duplicate or reserved document archive paths are rejected before the destination is written. Entries are decoded in memory and never extracted to filesystem paths. Arbitrary unknown ZIP entries were not round-tripped by the previous codec and are not newly promised by this migration.

## Legacy Input

The reader accepts prefixed ACT1, historical trailing ACT1, and ordinary ZIP bytes. It supports flat `project.json` paths, older `fountain.json` manifests, manifest-less Fountain/Markdown files, empty-manifest fallback and missing optional metadata. Flat document paths normalize to `files/`, along with supported keyed metadata.

Conversation precedence is `urai.json`, then historical `muse.json`, then `prompt.json`. Malformed optional metadata uses its existing defaults; corrupt archives and invalid required manifests fail. Native project opening retains the existing immediate legacy-upgrade behavior, so tests must use disposable copies.

## Save Semantics

Frontend code flushes pending editor/Canvas edits before capturing the project. `save_actone_bundle` compresses and writes within Rust, avoiding the previous frontend ZIP-to-number-array transfer. The shared writer uses a unique sibling temporary file, writes and syncs it, then renames it over the destination. Failed replacement preserves the original and reports the complete temporary file's location.

A completed save acknowledges only the captured revision. Later text, metadata or document-structure changes remain dirty. Existing per-project frontend queues and save-before-close checks remain necessary; atomic filesystem replacement alone does not establish UI revision correctness.

Native script and PDF exports also finish generation before atomic replacement. Cancellation returns null; export/write errors reject. The PDF renderer and export settings remain unchanged.

## Verification and Fixture Maintenance

- `npm test`: retained UI/TypeScript tests plus native boundary and save-race tests.
- `cargo test --manifest-path src-tauri/Cargo.toml --locked`: Rust unit tests, named TypeScript-oracle tests, real Tauri MockRuntime command decoding, and PDF output comparison.
- `npm run test:file-core:native`: builds the test process bridge and verifies real samples and generated projects through both codecs in both directions. TypeScript is the retained reference implementation, not a browser product requirement.
- `npm run test:file-core:fixtures`: explicitly reruns the six original logic suites and regenerates their committed oracle fixtures and named Rust cases. Review fixture changes; do not regenerate expected results merely to silence a regression.

Oracle fixtures reside in `src-tauri/tests/fixtures/file-core/`; their original test names are retained. Seventy named Rust tests cover calls made by the 71 original tests (the parameterized Canvas cases share a name). UI tests remain in TypeScript; Rust equivalents do not replace webview state/integration coverage.

Production samples are read-only during comparisons. No test rewrites the checked-in project files. Windows execution does not establish Linux/Flatpak runtime parity; verify native dialogs, folder grants, permissions and locks on each release platform.

## Compatibility edge cases

Missing, empty, and null manifest document types default to Fountain. Canvas base64 decoding accepts browser-compatible unpadded input, ASCII spacing, and nonzero trailing bits, while rejecting malformed data. Fountain cleanup matches ECMAScript whitespace (including BOM, excluding NEL) and ASCII word boundaries. The cross-language suite checks these inputs against the retained TypeScript functions across all export option combinations.

Native Fade In/FDX XML parsing accepts DOCTYPE declarations with bounded document node counts. External entities are not loaded. Malformed XML rejects the native import command instead of returning an empty success or raw XML. FileContext displays an Import Failed dialog, clears the progress indicator, and adds no document on either import route. Empty Fade In `basestyle` attributes fall back to `name`, including when deciding dialogue continuity.
