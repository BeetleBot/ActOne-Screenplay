# Pre-Existing Issues (unrelated to recent refactor)

## TypeScript errors (non-blocking)
- **`ProductionBreakdownModal.tsx`** — ~16 `: any` types used instead of proper interfaces
- **`Workspace.tsx:15`** — unused `setIsSidebarOpen` parameter
- **`SidebarViews.tsx:21,25`** — unused imports `LinearProgress`, `ListItem`
- **`ErrorBoundary.test.tsx`** — unused import `vi`
- **`CustomModalContext.test.tsx`** — variable used before assigned
- **`UIContext.test.tsx`** — assigning to read-only `fullscreenElement`
- **`actone.test.ts`** — uses `require()` (needs `@types/node`)

## Code quality nits
- `"9999px"` hardcoded in 8 component files (use `PILL_RADIUS` constant)
- `key={idx}` in `HelpModal.tsx` maps (fragile, but list is static)
- CSS custom property strings (`"var(--font-ui)"`, `"var(--button-color)"`) duplicated across ~10 files
- Unused `React` imports in several files (modern JSX transform doesn't need them)

None of these cause runtime bugs.
