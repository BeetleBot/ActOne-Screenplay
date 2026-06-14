# Pre-Existing Issues

All previously identified issues have been fixed:

- `: any` types in `ProductionBreakdownModal.tsx` — replaced with proper `ProdTag`, `ProdDefinition`, `Occurrence`, `DefWithOccurrences`, `CatWithDefs` interfaces
- Unused imports `LinearProgress`, `ListItem` in `SidebarViews.tsx` — removed
- Unused `setIsSidebarOpen` param in `Workspace.tsx` — removed
- `"9999px"` hardcoded in 6 component files + `muiTheme.ts` — replaced with `PILL_RADIUS` constant
- `key={idx}` in `HelpModal.tsx` — replaced with stable keys (`item.name`, `s.keys`, `group.group`)
- `ProductionBreakdownModal.tsx` — also: added null-safe `t.range` destructuring, cast `categoriesWithDefinitions` filter
- Test files excluded from `tsc` build via `tsconfig.json`

**Only remaining items** (test-only, never affect runtime):
- `ErrorBoundary.test.tsx` — unused `vi` import
- `CustomModalContext.test.tsx` — variable used before assigned
- `UIContext.test.tsx` — read-only `fullscreenElement`
- `actone.test.ts` — `require()` (needs `@types/node`)

These are excluded from the production build by `tsconfig.json`.
