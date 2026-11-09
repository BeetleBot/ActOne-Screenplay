# Testing

ActOne uses **Vitest** with **jsdom** for all frontend tests.

## Running Tests

```bash
# Run all tests
npm run test

# Watch mode
npx vitest

# With coverage
npx vitest --coverage
```

## Performance benchmarks

`npm run benchmark:editor` runs repeatable 50-, 100-, 200- and 300-page screenplay benchmarks in a real Chromium browser, including isolated editor-extension comparisons and the real application update pipeline. `npm run benchmark:app` runs only the application phase. Reports are saved under `benchmarks/results/`; reviewed reference results live under `benchmarks/baselines/`.

See [benchmarks/README.md](../../benchmarks/README.md) for baseline comparisons, slower-CPU simulation, workload definitions and limitations. Benchmarks use production source and CSS; jsdom unit-test timings are not used to claim browser performance.

### Navigator and Search regression coverage

The Navigator uses memoized outline projections and measured virtual rows. Tests cover stable identities, duplicate headings and mapping parsed positions through live edits. Search tests compare bounded/incremental scans against complete CodeMirror scans and verify replacement undo and stale-confirmation handling. The real-browser application benchmark additionally checks offscreen scene reveal and collapsed sections across newline insertion, outside the timed workloads.

See [implementation plan](../../benchmarks/PERFORMANCE-PLAN.md) for the performance targets and desktop validation scope.

## Test Configuration

**`vitest.config.ts`**: jsdom environment, global test APIs, CSS disabled. Setup file `src/test-setup.ts` removes `__TAURI_INTERNALS__` by default; individual native-path tests install their own Tauri marker and API mocks.

## Test Structure

Tests are co-located with source files:

```
src/
├── parser/
│   ├── FountainParser.ts
│   └── parser.test.ts
├── editor/
│   ├── fountainSyntax.ts
│   ├── fountainSyntax.test.ts
│   ├── inlineAutocomplete.ts
│   ├── inlineAutocomplete.test.ts
│   └── useCodeMirror.test.ts
├── context/
│   ├── FileContext.tsx
│   ├── FileContext.test.tsx
│   ├── UIContext.test.tsx
│   ├── SprintContext.test.tsx
│   └── ...
├── components/
│   ├── OutlineView.tsx
│   ├── OutlineView.test.tsx
│   ├── ExportModal.test.tsx
│   └── ...
└── utils/
    ├── actone.test.ts
    ├── text.test.ts
    ├── window.test.ts
    └── perScriptSettings.test.ts
```

Tests cover frontend, editor, parser, contexts, components, and utilities. Use the Vitest run summary for current file and test counts.

### Prose regression coverage and limits

`src/editor/useProseCodeMirror.integration.test.ts` runs the production prose hook and core editor together with the Markdown parser, table widgets, image registry, and pending-edit bridge. Context values are supplied by the test; editor modules are not mocked. Tests verify:

- Live table edits reach the save bridge before blur, with undo and redo intact.
- Packing and reopening a project in a fresh editor preserves Markdown tables and image data.
- Updating the image registry preserves document text and undo history.
- Switching documents flushes pending edits to the outgoing document, clears old images, and resets undo history.
- Unmounting flushes pending text and unregisters the editor.

`table-widget.test.ts` checks exact formatting, alignment delimiters, escaped pipes, missing cells, and idempotence. `prose-media.test.ts` exercises actual table and image widgets, including read-only image controls and registry replacement. `ProseEditor.test.tsx` checks insertion controls with a real CodeMirror state, including stale image previews, oversized decoded images, and read-only paste handling.

These are jsdom tests with text geometry stubs, not native desktop automation or visual layout tests. The project packing round trip uses frontend serialization; it does not verify native filesystem writes or process restart. Likewise, `src/integration/desktopWorkflow.integration.test.tsx` exercises file-context lifecycle with mocked native commands and a virtual disk.

### Native desktop and PDF checks

`npm run build:desktop-test` builds the normal frontend and native app with `tests/desktop/tauri.e2e.conf.json`, using a separate application identifier and profile. Install `tauri-driver` 2.1.0 with `cargo install tauri-driver --version 2.1.0 --locked --root node_modules/.desktop-tools`. On Windows, run `python tests/desktop/install_edge_driver.py` to install a driver matching WebView2. Linux requires `webkit2gtk-driver` and a display (`xvfb-run -a npm run test:desktop` in CI).

`npm run test:desktop` opens a disposable project copy in the native WebView, types through CodeMirror, saves with Ctrl+S, verifies the real archive on disk, closes the app, and reopens it in a new process. It refuses to edit an app with the regular development identifier. Failed runs retain driver logs, HTML and a screenshot in `node_modules/.desktop-results`. The test has bounded waits and runs one lifecycle, without a browser-test framework dependency.

`npm run test:pdf-layout` builds a small native exporter fixture and inspects three PDFs with the existing PDF.js dependency. Assertions check numeric Letter/A4 dimensions, matching baselines and non-overlapping dual-dialogue columns, page bounds, watermark text and rotation, 35% fill opacity, and painting order behind screenplay text. This checks extracted PDF layout, not raster appearance. Once the fixture is built, `node tests/pdf-layout/check.mjs` runs without rebuilding Rust.

Preference tests in `src-tauri/tests/preferences.rs` call the production commands and loader against isolated real files, including reload, damaged files, concurrent writes and failure paths. State is committed only after a successful atomic disk write. `SettingsWindow.test.tsx` uses the real preference engine with a simulated native store to verify change/save/remount and incoming events without write-back loops.

CI runs frontend checks and backend tests, the PDF layout check, and native desktop lifecycle jobs on Windows and Linux. Rust and desktop-driver caches reduce subsequent setup time; native runs are separate from the fast frontend suite.

## Rust Backend Tests

Rust tests are embedded in source files (`#[cfg(test)]` modules):

- `pdf/fdx.rs` — 15 tests covering FDX export
- `pdf/fadein.rs` — 17 tests covering FadeIn export
- `pdf/parser/mod.rs` — 12 preprocessor tests, 25+ end-to-end parsing tests
- `pdf/rich_string/parser.rs` — 24 emphasis parsing tests
- `pdf/rich_string/tokenizer.rs` — 5 delimiter tokenizer tests

```bash
cd src-tauri && cargo test
```

## Test Patterns

### Frontend Component Tests

```typescript
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

describe("ComponentName", () => {
  it("renders correctly", () => {
    render(<Component />);
    expect(screen.getByText("expected text")).toBeDefined();
  });
});
```

### Context Tests

Context tests wrap components in provider trees and assert state changes via exposed actions.

### Parser Tests

Parser tests feed Fountain text and assert the resulting element types and positions:
```typescript
it("parses scene heading", () => {
  const result = parse("INT. HOUSE - DAY");
  expect(result.elements[0].type).toBe("SceneHeading");
});
```

### Rust Tests

```rust
#[test]
fn test_export() {
    let screenplay = parse("INT. HOUSE - DAY\n\nAction line.");
    let result = export(screenplay);
    assert!(result.contains("<ParagraphType>Scene Heading</ParagraphType>"));
}
```
