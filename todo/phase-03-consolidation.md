# Phase 3 — Consolidation

## Goal
Stop repeating yourself — deduplicate constants, components, and utilities scattered across the codebase.

---

### 3.1 Extract CATEGORIES Constant

**Technical**: The same array of production categories exists in `FountainEditor.tsx`, `ProductionBreakdownModal.tsx`, and `useCodeMirror.ts` with slight variations between them. Extract to `src/constants.ts`.

**Layman**: The same list of categories (Cast, Props, Locations, etc.) is copy-pasted in 3 files with minor differences. Put it in one place so adding a category doesn't require updating 3 spots.

---

### 3.2 Deduplicate ActoneBanner Component

**Technical**: The same `<Alert>` block with `CloseIcon` and version text is rendered in `SidebarViews.tsx` and `TodoView.tsx`. Extract to its own component.

**Layman**: A banner that tells you what version you're on is recreated in two different places. Make one reusable component.

---

### 3.3 Deduplicate Scene Heading Cleaning

**Technical**: The regex pattern `scene.replace(/(INT|EXT)[.\s]/, ...)` appears in `OutlineView.tsx`, `ExportModal.tsx`, and `MarkerView.tsx`. Extract to a utility in `text.ts`.

**Layman**: Parsing "INT. HOUSE" to strip the prefix is done 3 different ways in 3 files. One utility to rule them all.

---

### 3.4 Replace Inline Word Count with Shared Utility

**Technical**: `StatusBar.tsx` has inline word count logic while `text.ts` already exports `countWords()`. Replace the inline version with the shared import.

**Layman**: Re-inventing the wheel — there's already a word counter utility, but the status bar ignores it and writes its own.
