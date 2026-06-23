# shadcn/ui Migration — Implementation Log

## Status: COMPLETED (Phases 0-6), PENDING (Phase 8-9)

---

## Phase 0: Foundation Setup
- [x] Tailwind CSS v4 + @tailwindcss/vite plugin installed and configured
- [x] src/index.css with `@import "tailwindcss"` + `@custom-variant dark`
- [x] npx shadcn@latest init
- [x] All 27 shadcn UI primitives installed (button, dialog, dropdown-menu, command, input, select, switch, tabs, tooltip, badge, card, separator, scroll-area, slider, table, alert, context-menu, checkbox, progress, popover, alert-dialog, collapsible, sheet, kbd, chart, label, sonner, accordion)

---

## Phase 1: Theme System
- [x] Rewrite `ThemeContext.tsx` — remove MuiThemeProvider + CssBaseline, apply theme via CSS classes on `<html>`, custom theme CRUD preserved
- [x] Delete `src/theme/muiTheme.ts` — migrate utilities to `src/theme/themeColors.ts`
- [x] Create `src/index.css` with `@theme inline` shadcn tokens, 6 theme classes (sepia/charcoal/pitch-black/pitch-white), editor vars

---

## Phase 2: Icons
- [x] Rewrite `Icons.tsx` — all ~79 icon components re-exported from `lucide-react`, `AssignmentIcon` kept as custom SVG with `size` prop

---

## Phase 3: Layout Shell
- [x] ErrorBoundary.tsx — MUI Box/Typography/Button/IconButton/Tooltip → shadcn Button + Tooltip + Tailwind
- [x] Workspace.tsx — MUI Box/Paper → Tailwind divs
- [x] MainLayout.tsx — MUI Box → Tailwind div
- [x] SearchPanel.tsx — MUI Box/Paper/IconButton/InputBase/Typography → shadcn Button/Input + Tailwind
- [x] ActivityBar.tsx — All MUI components → shadcn DropdownMenu/Slider/Button/Tooltip + Tailwind
- [x] HeaderBar.tsx — MUI AppBar/IconButton/Tooltip/Menu → custom header + shadcn DropdownMenu/Tooltip/Button
- [x] StatusBar.tsx — MUI Box/Typography/Menu → Tailwind + shadcn DropdownMenu

---

## Phase 4: Modal/Dialog Components
- [x] CustomModalContext.tsx — MUI Dialog → shadcn Dialog controlled
- [x] CommandPalette.tsx — Full rewrite using shadcn CommandDialog/CommandInput/CommandList/CommandGroup/CommandItem
- [x] ExportModal.tsx — MUI → shadcn Dialog + Select + Switch
- [x] SettingsModal.tsx — MUI → shadcn Dialog + Tabs + Select + Slider + Switch
- [x] HelpModal.tsx — MUI → shadcn Dialog + Badge + Input
- [x] ProductionBreakdownModal.tsx — MUI → shadcn Dialog + Table
- [x] StructureImportModal.tsx — MUI → shadcn Dialog + Input
- [x] TitlePageEditorModal.tsx — MUI → shadcn Dialog + Tabs + Input
- [x] ThemeManagerModal.tsx — MUI → shadcn Dialog + Tabs + Switch
- [x] ModalManager.tsx — No MUI changes needed (already clean)

---

## Phase 5: Sidebar Views
- [x] SidebarViews.tsx — All MUI components → shadcn Card/Button/Input/Textarea + Tailwind
- [x] OutlineView.tsx — All MUI components → shadcn Button/Input/Separator/DropdownMenu/Popover + Tailwind (DnD kept)
- [x] ScriptsView.tsx — All MUI components → shadcn Button/Input/Separator/Switch/Select/Dialog/DropdownMenu + Tailwind (DnD kept)
- [x] MarkerView.tsx — All MUI components → shadcn Input/Button/Badge/Separator/Popover + Tailwind
- [x] TodoView.tsx — All MUI components → shadcn Button/Input/Checkbox/Separator + Tailwind
- [x] SprintView.tsx — All MUI components → shadcn Button/Input/Separator/Tooltip + Tailwind (CircularProgress → inline SVG)

---

## Phase 6: Editor & Miscellaneous
- [x] FountainEditor.tsx — MUI Menu/MenuItem/Divider/ListItemIcon/ListItemText/Typography/Box → shadcn ContextMenu (all 6 submenus converted to nested ContextMenuSub)
- [x] WelcomeScreen.tsx — All MUI components → shadcn Button/DropdownMenu + Tailwind (theme menu via DropdownMenu)
- [x] HelpMarkdown.tsx — MUI Box/Typography/Divider/Link → native HTML + Tailwind + shadcn Table
- [x] ActoneBanner.tsx — MUI Alert/AlertTitle/Button → shadcn Alert/AlertDescription + Button

---

## Phase 7: Compaction Pass — SKIPPED (will do later)

---

## Phase 8: Charts
- [ ] Statistics tab — Add recharts AreaChart/BarChart for word/scene counts
- [ ] SprintView — Add recharts BarChart for sprint history

---

## Phase 9: Cleanup
- [x] Remove MUI from package.json — `@mui/material`, `@emotion/react`, `@emotion/styled` removed
- [x] Remove MUI manual chunk in vite.config.ts
- [x] npm install — lockfile cleaned
- [x] tsc --noEmit = 0 errors
- [x] npm test = 200/200 pass
- [ ] Remove unused shadcn components from src/components/ui/
\