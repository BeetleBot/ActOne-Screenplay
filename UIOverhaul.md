# UI Overhaul Plan — ActOne → shadcn/ui

## Goal
Modernize ActOne's UI using shadcn/ui. Replace the custom CSS system with Tailwind CSS v4 + shadcn components. Achieve a native desktop-app feel.

## Progress

- [x] Create `uioverhaul` branch
- [ ] **Phase 1:** Install Tailwind CSS v4 + shadcn/ui CLI init
- [ ] **Phase 2:** Configure path aliases (`@/*` → `./src/*`)
- [ ] **Phase 3:** Replace global CSS with shadcn theme system (remove custom themes)
- [ ] **Phase 4:** Add shadcn base components (Button, Card, Dialog, DropdownMenu, etc.)
- [ ] **Phase 5:** Refactor MainLayout with shadcn Sidebar + Tabs
- [ ] **Phase 6:** Replace modals with shadcn Dialog / Sheet
- [ ] **Phase 7:** Refactor remaining components (toolbar, search panel, etc.)
- [ ] **Phase 8:** Test build and verify

---

## Phase 1 — Install Tailwind CSS v4 + shadcn CLI init

### Steps
1. Install `tailwindcss` + `@tailwindcss/vite`
2. Run `npx shadcn@latest init`
3. Install `@types/node` for path aliases

### Expected
- `tailwindcss` in `package.json`
- `@tailwindcss/vite` plugin in `vite.config.ts`
- `@/` path alias added to `vite.config.ts` and `tsconfig.json`
- `components.json` at root
- `src/lib/utils.ts` generated
- `src/components/ui/` directory created
- `src/index.css` rewritten with `@import "tailwindcss"` + shadcn theme tokens

---

## Phase 2 — Path Aliases

### Steps
1. Add `baseUrl` + `paths` to `tsconfig.json`
2. Add `@/` resolve alias to `vite.config.ts`
3. Install `@types/node`

### Expected
Imports like `@/components/ui/button` resolve correctly.

---

## Phase 3 — Theme System Migration

### Current
- `src/themes.css` — 10 custom theme variants (light, dark, pitch-black, lilac, etc.)
- `src/index.css` — imports themes.css, fonts.css, defines layout + component styles
- `src/App.css` — unused default styles (safe to remove)
- Theme toggling via `body.theme-*` classes

### Target
- Remove `themes.css` entirely
- `index.css` becomes Tailwind + shadcn theme variables
- Theme toggling via `.dark` / `:root` (shadcn standard)
- Keep `fonts.css` for local font files
- Keep editor-specific styles but rewrite in Tailwind/shadcn style where possible
- shadcn Sidebar has its own theme tokens (`--sidebar-*`)

### Theme Token Mapping (conceptual)
| Current | shadcn |
|---------|--------|
| `--bg-app` | `--background` |
| `--bg-sidebar` | `--sidebar` |
| `--text-main` | `--foreground` |
| `--text-muted` | `--muted-foreground` |
| `--accent-color` | `--primary` |
| `--border-color` | `--border` |
| Custom themes → just `.dark` variant |

---

## Phase 4 — Base shadcn Components to Add

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
npx shadcn@latest add sheet
npx shadcn@latest add dropdown-menu
npx shadcn@latest add tabs
npx shadcn@latest add input
npx shadcn@latest add select
npx shadcn@latest add checkbox
npx shadcn@latest add label
npx shadcn@latest add separator
npx shadcn@latest add command
npx shadcn@latest add popover
npx shadcn@latest add tooltip
npx shadcn@latest add sidebar
npx shadcn@latest add switch
npx shadcn@latest add slider
npx shadcn@latest add badge
npx shadcn@latest add avatar
npx shadcn@latest add scroll-area
npx shadcn@latest add skeleton
npx shadcn@latest add sonner
```

---

## Phase 5-7 — Component Refactoring Map

| Current Component | shadcn Replacement | Notes |
|---|---|---|
| `ExportModal` | `Dialog` | Keep format selector logic |
| `SettingsModal` | `Dialog` or `Sheet` | |
| `ThemeSelectorModal` | `Dialog` + theme toggle | |
| `HelpModal` | `Dialog` | |
| `RevisionModal` | `Dialog` | |
| `TitlePageEditorModal` | `Sheet` | Slides from right |
| `SearchPanel` | `Command` (cmdk) | Built-in search/filter |
| `SidebarViews` | `Sidebar` + `Tabs` | Outline, Notepad, Characters, Stats, Todo |
| `EditorToolbar` dropdown | `DropdownMenu` | |
| `HeaderBar` (titlebar) | Keep custom | Tauri-specific window controls |
| `TimelineView` | Keep custom | App-specific feature |
| `FountainEditor` | Keep custom | CodeMirror-based editor |
| `ScreenplayPreview` | Keep custom | PDF-matching layout |
| `IndexCardsWorkspace` | Keep (maybe use `Card`) | App-specific feature |
| `ModalManager` | Delete | Replaced by individual Dialog/Sheet components |
| `WindowResizeHandles` | Keep custom | Tauri-specific |

---

## Key Principles

1. **Open Code** — shadcn components are copied into `src/components/ui/` — edit them as needed
2. **Composition** — use shadcn's composable API; don't wrap unnecessarily
3. **Desktop Native** — use `Sidebar`, `Sheet`, `Dialog` for native feel
4. **Keep what's unique** — Fountain editor, preview, timeline, window controls stay custom
5. **Consistent theming** — one source of truth via CSS variables
6. **Incremental** — each phase builds on the previous; test after each
