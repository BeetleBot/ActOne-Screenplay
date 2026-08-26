# ActOne Screenplay — Design System

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
`editor/text/accent/sidebar/button/selectionText/selectionBg/dropdown/dropdownText/border/textSecondary`.

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
`ActivityBar | (HeaderBar + Workspace + StatusBar)` flex column. Workspace is the editor paper (`src/index.css:182`).

### TitleBar (`src/components/TitleBar.tsx:103`)
Transparent `40px` bar, controls right `28x28 6px`, hover `alpha(text,0.08)` and close `alpha(error,0.15)`.

## 5. Component Language (MUI overrides `src/theme/muiTheme.ts:509`)

- **Buttons:** `borderRadius 6`, `contained` gradient `accent 100%→85% black` + inset `rgba(white,0.12)`, `outlined` `1px solid border`, `hover color-mix(accent 8%, transparent)`. Disable ripple (`MuiButtonBase:518`).
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
- Icons are centralized (`src/components/Icons.tsx`). Fonts via `fonts.css`.
- Guard Tauri calls, normalize `\r\n`, use `e.key` — see `AGENTS.md`.

## 8. References

- Runtime: `src/theme/muiTheme.ts` (theme factory, MUI theme creation), `src/index.css` (tokens + editor styles), `src/components/WelcomeScreen.tsx`, `src/components/TitleBar.tsx`, `src/components/layout/MainLayout.tsx`, `src/fonts.css`, `src/prose-editor.css`.
