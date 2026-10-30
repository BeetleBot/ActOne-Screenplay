# ActOne Screenplay — Design System

Canvas documents embed the upstream hand-drawn editor in the existing workspace, using the product name Canvas. Keep its editing controls and drawing appearance; ActOne provides project save, import/export, offline fonts, and surrounding app chrome. AI generation tools are hidden. Canvas uses its own pan/zoom and omits screenplay timeline and page statistics.

> **For agents:** this is the canonical design reference. `src/theme/muiTheme.ts` + `src/index.css` are the runtime sources of truth; this doc is their human-readable synthesis. Keep them in sync.

## 1. Principles

- **Desktop-native, distraction-free.** No web-page chrome. Every window feels like a native app (`src/components/TitleBar.tsx:15`, `src/components/WelcomeScreen.tsx:384`).
- **Floating islands, not full-bleed pages.** Welcome, modals, and panels sit as elevated cards on a solid app background.
- **Theme is a token swap.** Light/dark is not a separate stylesheet — it's a CSS-var / MUI palette swap (`src/theme/muiTheme.ts:77` `deriveAllColors`, `src/index.css:36` vars).
- **One radius/shadow/motion language.** All buttons, cards, dialogs, menus share the same tokens. Never invent a new radius.

## 2. Tokens

### Typography
- **UI:** `Inter` via `--font-ui` (`src/index.css:6`). All MUI, menus, sidebars, dialogs force `font-family: var(--font-ui)` (`src/index.css:116`).
- **Editor:** `Courier Prime` + `Courier Prime Sans` + Indic fallback stack `--font-editor-indic` (`src/index.css:7`, `src/fonts.css`). Map: `--font-editor: "Courier Prime", var(--font-editor-indic)` and `--font-editor-sans`.
- **Scale:** Menus 12–12.5px, captions/tooltips 11px, headings 13px/700, dialog titles 11px 700 uppercase.

### Radii
`src/index.css:16`
- `xs 4px`, `sm 6px`, `md 8px`, `lg 12px`, `xl 16px`, `pill 9999px`
- Rule: buttons `6px` (`muiTheme.ts:359 shape.borderRadius:6`), dialogs `12px` (`muiTheme.ts:610`), popovers/menus `8px`, Welcome islands `14px` (`WelcomeScreen.tsx:653`), pills `20px+`.

### Shadows
`src/index.css:23`
- `xs 0 1px 2px rgba(0,0,0,0.04)` → `floating 0 20px 48px -8px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.06)`
- Dark mode uses same layers with higher opacity: Welcome island `0 10px 30px -4px rgba(0,0,0,0.5)` (`WelcomeScreen.tsx:655`).

### Motion
`src/index.css:29`
- `fast 0.12s`, `normal 0.20s`, `slow 0.28s`; `spring cubic-bezier(0.34,1.56,0.64,1)`, `snappy 0.16,1,0.3,1`. All buttons scale `0.97` on `:active` (`src/index.css:855`).

### Layout
- TitleBar `40px` (`TitleBar.tsx:106`), uppercase `11px 700 0.04em` (`TitleBar.tsx:133`), controls `28x28 6px`.
- Page width `816px` / editor paper `8.5in` (`src/index.css:11`).

## 3. Color & Theme System

### Engine
`src/theme/muiTheme.ts:77` `deriveAllColors({editor, text, accent, sidebar, button}, isDark, overrides)` produces:
`editor/text/accent/sidebar/button/selectionText/selectionBg/dropdown/dropdownText/border/textSecondary`. Optional `app` separates UI background from `editor`; optional `editorText` separates writing foreground from UI `text`. Legacy themes fall back to the shared colours. Theme Manager uses three palette seeds (Interface, Accent, Writing paper), optional manual text overrides and a large interactive preview in a resizable 1000 × 700 window with a 40/60 split. The pure palette compiler derives supporting roles and independently readable UI/writing foregrounds; legacy palettes remain supported.

Default borders: dark `rgba(255,255,255,0.10)` / light `rgba(0,0,0,0.10)`; `textSecondary` dark `rgba(255,255,255,0.54)`.

### Site mapping (CSS vars in `src/index.css:36`)
`--bg-app/--bg-sidebar/--bg-editor-wrapper/--border-color/--text-main/--text-muted/--accent-color/--accent-rgb/--titlebar-bg`.

### Palettes (`src/theme/muiTheme.ts:101`)
| ID | Name | `editor` | `text` | `accent` | `sidebar` |
|---|---|---|---|---|---|
| `light` | Classic Light | `#EEEEEE` | `#101010` | `#555555` | `#EEEEEE` |
| `dark` | **Classic Dark** (site default) | `#101010` | `#CCCCCC` | `#555555` | `#101010` |
| `catppuccin-latte/mocha`, `pitch-white/black`, 12 pastels… see full table in `muiTheme.ts:130-342` |

Adaptive meta (`ADAPTIVE_THEME_META:36`) groups: `adaptive` (Classic), `catppuccin-adaptive`, `pitch-adaptive`.

> **Current site:** `iyal-ink/actone` is **Classic Dark only** — no toggle. Keep tokens ready for future multi-theme.

## 4. Layout Patterns

### WelcomeScreen — Floating Islands (`src/components/WelcomeScreen.tsx:634`)
- Outer `flex p 1.25 gap 1.25 overflow hidden`.
- Left island: Recent files `38% (240-320px)` `14px` `1px border (dark rgba(white,0.07)/light rgba(black,0.06))` + floating shadow.
- Right: centered hero (`76x76` logo with `drop-shadow 0 6px 16px rgba(accent,0.35)`, `22px 700 title`, `11.5px disabled version`) + action list card `max 440px 14px` rows `px 2.25 py 1.25 borderBottom faint`, pill actions `20px`.
- Footer StatusBar-style `28px` (`WelcomeScreen.tsx:1066`).

### MainLayout (`src/components/layout/MainLayout.tsx:36`)
- Seamless, borderless chrome frame (`background.paper`) wrapping `ActivityBar`, `HeaderBar`, `Workspace`, and `StatusBar`.
- `ActivityBar` (transparent, `46px`, `borderRight: none`) and `StatusBar` (transparent, `30px`, `borderTop: none`) sit flush within the outer layout surface.
- `HeaderBar` (`46px`, `pl: 0`) aligns document tabs flush with the editor canvas top-left rounded corner.
- Editor canvas container (`.editor-container`) sits as an extruded card with `12px` border-radius and `background.default` surface.

### Extruded Panes & Mutual Exclusivity (`src/components/layout/Workspace.tsx`, `src/components/RightPane.tsx`)
- **Extruded Geometry:** Sidebars and right-side panels extrude directly out of the continuous window chrome without interior dividing borders (`border: 'none'`, `boxShadow: 'none'`).
- **Motion:** Panes animate using synchronized `240ms cubic-bezier(0.25, 1, 0.5, 1)` natural deceleration curves on `width`, `min-width`, and `max-width`.
- **Fluid Content:** Inner pane containers use `width: 100%` for fluid scaling with zero trailing background gaps.
- **Mutual Pane Exclusivity:** Only one pane (Left Sidebar or Right Pane) is open at any time. Opening a sidebar closes right panels (UrAI/Search) and vice-versa.
- **Persistence:** Pane dimensions (`sidebarWidth` 180–800px, `rightPaneWidth` 240–700px) are persisted in `localStorage`.

### TitleBar (`src/components/TitleBar.tsx:103`)
Transparent `40px` bar, controls right `28x28 6px`, hover `alpha(text,0.08)` and close `alpha(error,0.15)`.

## 5. Component Language (MUI overrides `src/theme/muiTheme.ts:509`)

### Scene Navigator

- Continuous, borderless outline rows on the sidebar surface; no coloured header banners, attached sub-cards, vertical accent bars, or divider lines above sections.
- Scene colours are confined to number badges. Headings use semibold UI text; synopses use regular secondary text. Storylines appear as compact rectangular tags with a 4px radius, subtle theme border/fill and text at 11px or above.
- Sections and nested subsections use indentation and disclosure controls. Closing a parent hides its complete subtree and retains each child's disclosure state.
- Search and filter controls use the standard 6px input/button radius. Selection uses the theme's full-row selection surface.
- Drag grips work on scenes and section groups. Horizontal insertion lines indicate before/after placement; a highlighted section indicates nesting. A temporary root drop target moves items outside all sections. No scene-number strip appears beneath this panel; the timeline shares the status-bar footer outside the rounded editor container.
- Keep virtual row measurement caching and cursor-follow suppression during structure moves. Animate colour only; do not animate row heights or offsets.

### Timeline precision

- Scene, section and sequence segments use absolute start/end positions on the same source-line axis as markers and the playhead. Do not use flex shrink, physical borders or external segment margins to allocate space: these distort long timelines. Paint scene gutters and borders inside a pseudo-element instead.
- A click targets the segment's exact source heading. A drag maps the pointer against the full zoomed track rectangle. Playhead movement is immediate, without position easing. Navigator selection must not override the current editor scene.
- Map navigation and cursor positions between the parsed snapshot and the live editor document while parsing is pending.

- **Buttons:** `borderRadius 6`, `contained` solid chosen accent with automatically contrasting text, `outlined` `1px solid border`, `hover color-mix(accent 8%, transparent)`. Disable ripple (`MuiButtonBase:518`).
- **Dialogs:** `12px` `1px solid border` `0 16px 40px -8px rgba(0,0,0,0.25)` (`muiTheme.ts:609`).
- **Paper/Popover/Menu:** `8px` `1px solid border` `0 8px 24px rgba(0,0,0,0.12)`; MenuItem `12px/5-7px 10px margin 2px 6px 6px`.
- **Inputs:** `6px` `bg dropdown` `1px solid border`, focus `1px inset accent`.
- **Tooltips:** `1000ms` delay arrow (`muiTheme.ts:351`), popovers sorted with `8px`.

## 6. Editor Specifics

- Paper: `max 8.5in`, padding `60px 1.0in 60px 1.5in` (`src/index.css:211`), transparent, courier 14px 1.2 450.
- Fountain indents (`src/index.css:365`): heading uppercase bold, character `2.2in`, parenthetical `1.6in`, dialogue `1.0in`, transitions right/upper.
- Selection `rgba(accent-rgb,0.30)`, cursor `2.5px solid text-main` (`src/index.css:282`).

## 7. Usage Rules for Agents

- Use `derived ThemeConfig` — never hard-code a hex. For website, map to CSS vars, not raw hex.
- Keep radii/shadows from Section 2. No custom `border-radius: 0` or left accent bars (`AGENTS.md:8` forbids left bars on Outline items).
- Use `240ms cubic-bezier(0.25, 1, 0.5, 1)` for layout transitions and preserve mutual pane exclusivity.
- Icons are centralized (`src/components/Icons.tsx`). Fonts via `fonts.css`.
- Guard Tauri calls, normalize `\r\n`, use `e.key` — see `AGENTS.md`.

## 8. References

- Runtime: `src/theme/muiTheme.ts` (theme factory, MUI theme creation), `src/index.css` (tokens + editor styles), `src/components/WelcomeScreen.tsx`, `src/components/TitleBar.tsx`, `src/components/layout/MainLayout.tsx`, `src/components/layout/Workspace.tsx`, `src/fonts.css`, `src/prose-editor.css`.


### Window loading

All window startup and screen-loading states use `WindowLoading`, a centered transparent ActOne mark with no visible loading text. `public/window-loading.css` supplies the shared breathing animation (96px mark, 0.85–1.15 scale, 0.3–1 opacity) and theme colors. The same markup appears in `index.html` before React starts, in Suspense fallbacks, and in document handoffs such as Export and X-Ray. Reduced-motion preferences disable the pulse. Embedded loading regions use the same mark without covering their window chrome.

### Yellow scene and marker colors

Named yellow uses `#DBD600` in light themes and the existing luminous yellow in dark themes. It follows the same rendering rules as other scene colors: 35% navigator badge fills and solid timeline pill fills. Timeline numbers use automatically contrasting ink for each pill colour. Editor markers use colored text without a background highlight. There are no yellow-only text or selection overrides.

Switches use a slim 36 × 22px track, 16px thumb and 3px inset for both normal and small sizes; checked translation is 14px. Off tracks use a subtle muted fill and border; on tracks use the interface accent with a contrasting thumb. Keyboard focus uses a clear outline and disabled switches reduce opacity.

The timeline is interface chrome: its root explicitly uses `--bg-timeline` and `--timeline-ink`, independent of its writing-surface parent. The timeline is rendered in MainLayout’s footer above StatusBar, outside the rounded editor container. Its surface matches the status-bar/interface-panel surface exactly, with independently contrasting lines and labels. Scene pills use opaque scene/accent fills with automatically contrasting numbers; filtered items use an opaque neutral fill. Paper colour changes must not recolour the timeline.

Status-bar labels and icons use `--status-ink`; accents and saved/error indicators use surface-adjusted status tokens with at least 4.5:1 contrast against footer chrome. Do not dim language controls using opacity or use raw accent/success colours for footer text. Menus and popovers retain their own surface palettes.

Shared interactive colours are surface-aware: MUI primary controls use a readable adaptation of the chosen accent against the panel surface; paired primary foregrounds are computed independently. The chosen accent is preserved for solid contained-button fills and editor syntax. Secondary UI labels and CSS muted tokens receive contrast correction, including legacy alpha colours composited against the actual surface. Menus/inputs resolve their own foreground and focus colour, and tooltips use an explicit foreground/background pair. Outline menu checkmarks inherit menu ink; selected colour chips derive their ink from the actual chip fill. Do not apply extra opacity to secondary labels or useful drag/add affordances.

Document tabs are flat: active and inactive tabs use no box shadow. Active tabs retain their rounded shape and theme surface highlight.

Switch root descendant rules explicitly fix thumb and switch-base dimensions for both sizes so MUI small-size defaults cannot enlarge the thumb beyond the track. The 22px switch base moves 14px inside a 36px root, leaving a consistent 3px thumb inset.
