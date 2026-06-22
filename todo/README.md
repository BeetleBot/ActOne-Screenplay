# ActOne — Improvement Plan

## Phase 1 — Bug Fixes (PDF + Frontend Resilience) ✅
**Goal**: Fix things that actually break user output or crash the app.

| Task | Status | Files Changed |
|---|---|---|
| Fix rich text PDF export (bold/italic/underline lost) | ✅ Done | `src-tauri/src/pdf/export/elements.rs` |
| Wrap Tauri `invoke` in try/catch | ✅ Done | `src/components/ScriptsView.tsx` |
| Remove dead `winapp/` code from `sync-version.js` | ✅ Done | `sync-version.js` |

## Phase 2 — Type Safety
**Goal**: Remove escape hatches that hide real bugs.

| Task | Status |
|---|---|
| Remove `#![allow(dead_code)]` in `pdf/mod.rs` | ✅ Done |
| Replace `as any` casts (~39 → 3 test-only remain) | ✅ Done |
| Add `"forceConsistentCasingInFileNames"` to tsconfig | ✅ Done |

## Phase 3 — Consolidation ✅
**Goal**: Stop repeating yourself — deduplicate constants, components, utilities.

| Task | Status |
|---|---|
| Extract `CATEGORIES` constant (3 copies → 1) | ✅ Done |
| Deduplicate `ActoneBanner` component | ✅ Done |
| Deduplicate scene heading cleaning (3 copies) | ✅ Done |
| Replace inline word counts with shared utility | ✅ Done |

## Phase 4 — Polish
**Goal**: Tidy up code quality and build config.

| Task | Status |
|---|---|
| Replace `console.warn/error` with structured logger | ✅ Done |
| Extract HelpModal article data (~450 lines) | ⏭️ Skipped |
| Bump tsconfig `target` to ES2022 | ✅ Done |
| Refactor 585-line `generate_pdf()` | ✅ Done |
| Add `lint` + `typecheck` scripts | ✅ Done |
