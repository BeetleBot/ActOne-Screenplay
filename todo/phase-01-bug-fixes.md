# Phase 1 — Bug Fixes

## Goal
Fix things that actually break user output or crash the app.

---

### 1.1 Fix Rich Text PDF Export

**Technical**: `shape_rich_string()` in `elements.rs:147-185` flattened the entire `RichString` to plain text via `to_plain_string()`, then applied only the **first element's** format attributes (bold/italic/underline) to the whole string. Non-first elements' formatting was silently discarded.

**Fix**: After `buffer.set_text()`, modify `buffer.lines[0]`'s `AttrsList` to set per-byte-range `AttrsSpan` entries matching each `RichString` element's bold/italic attributes. Underline is now tracked per-line by checking each glyph's byte range against pre-computed underline spans.

**Layman**: If you wrote "Hello **bold** world", the bold formatting on "bold" was being thrown away. Now each word keeps its own formatting.

**Files changed**:
- `src-tauri/src/pdf/export/elements.rs` — Rewrote `shape_rich_string()` to use `AttrsList` for per-element formatting

---

### 1.2 Wrap Tauri `invoke` in try/catch

**Technical**: `ScriptsView.tsx`'s `handleExportAll` had no error handling around `invoke("pick_directory")` or the per-script export invokes. A failure would crash the UI without recovery.

**Fix**: Added try/catch around `pick_directory` and wrapping each per-script export. One script failing no longer blocks the rest.

**Layman**: If exporting 5 scripts and #3 fails, the other 4 still export instead of the whole thing crashing.

**Files changed**:
- `src/components/ScriptsView.tsx` — Wrapped all invoke calls in `handleExportAll`

---

### 1.3 Remove Dead Code in sync-version.js

**Technical**: Lines 33-46 tried to update `winapp/Package.appxmanifest` — a directory and file that were deleted during the MSIX restructuring. The code silently did nothing.

**Fix**: Removed the dead block entirely.

**Layman**: A script had leftover code that claimed to update a deleted file. Now it doesn't pretend anymore.

**Files changed**:
- `sync-version.js` — Removed `winapp/` version sync block
