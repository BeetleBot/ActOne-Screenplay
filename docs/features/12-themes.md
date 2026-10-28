# Themes & Appearance

## Built-in Themes

ActOne includes 17 built-in themes organized into sections:

### Classic

| Theme | Mode | Description |
|-------|------|-------------|
| Classic Light | Light | Clean light theme |
| Classic Dark | Dark | Clean dark theme |
| Adaptive | Auto | Follows system light/dark preference |

### Catppuccin

| Theme | Mode | Description |
|-------|------|-------------|
| Catppuccin Latte | Light | Soft light theme with purple accents |
| Catppuccin Mocha | Dark | Rich dark theme with purple accents |
| Catppuccin Adaptive | Auto | Follows system preference (Latte/Mocha) |

### Pitch

| Theme | Mode | Description |
|-------|------|-------------|
| Pitch Light | Light | Pure white e-ink style, black on white |
| Pitch Dark | Dark | Pure black background with grey tones |
| Pitch Adaptive | Auto | Follows system preference (white/black) |

### Pastel

| Theme | Mode | Description |
|-------|------|-------------|
| Sunrise | Light | Warm cream with coral accents |
| Sunset | Dark | Deep warm brown with coral accents |
| Mint | Light | Pale mint with green accents |
| Forest | Dark | Deep forest green with green accents |
| Rose | Light | Soft blush with rose accents |
| Berry | Dark | Deep berry with rose accents |
| Ocean | Dark | Deep teal blue |
| Honey | Light | Warm golden cream |
| Plum | Dark | Dark plum purple |
| Sky | Light | Light pastel blue |
| Slate | Dark | Dark blue-grey |

## Selecting a Theme

Open **Quick Settings** (gear icon in the Activity Bar) to see a grid of theme swatches organized by section — tiles are `6px` rounded with soft shadow. Click any swatch to switch instantly. The active theme is highlighted with a primary-colored border. Custom popovers and menus use `8px` radius with ambient shadow.

The active theme is synchronized across all windows (main editor, settings, help, etc.).

## Adaptive Themes

Each theme family (Classic, Catppuccin, Pitch) has its own adaptive variant that follows the system's light/dark mode preference (`prefers-color-scheme`). The transition happens instantly — no refresh needed.

## Custom Themes

Theme Manager opens at 1000 × 700, resizable and not maximized, with a 40/60 library/editor and preview split.

### Palette compiler

`src/theme/paletteEngine.ts` is a pure, deterministic compiler. Three validated hexadecimal seeds (`interface`, `accent`, `paper`) generate a complete `ThemeColors` palette. UI and writing ink are calculated independently. Automatic text, button text and selection text choose a foreground with at least 4.5:1 contrast against their generated background. Muted text, borders, field surfaces and selections are derived rather than user-configurable. Manual UI/writing foreground overrides are optional and intentionally take precedence over automatic contrast. Mode follows interface luminance; the page can independently be light or dark. Compilation performs no DOM or MUI work.

### Creation and preview

Create offers named palette presets rendered by `ThemePresetTile` as explicitly sized 40px mini workspaces (interface, paper, accent and sample lines), with a selected state, three colour controls, per-field resets and optional custom UI/writing text. Supporting colours are automatic. No scene-colour, breakdown or feedback settings, generators, shuffle controls or lock groups are exposed. Preview changes remain local until Save/Update; selecting a library theme applies it immediately. The preview retains Workspace, Prose & notes and UI elements tabs, real shared controls and app icons, and sample content without loading a project editor. Active and draft MUI themes are memoized; draft variables are scoped to the preview.

### Compatibility and rendering

Existing theme IDs, adaptive families and unversioned `.actheme` files remain supported. `completeCustomColors` completes legacy palettes while preserving validated known supporting roles. Exports retain all supported roles including generated selection colours, button text and independent editor ink. Legacy missing `app`/`editorText` roles retain their editor/text fallbacks. `getEditorVars` is the single CSS-variable mapping for MUI and explicit injection. MUI uses generated button foregrounds; generated primary buttons keep a flat background so gradients do not reduce text contrast. Print styles remain separate.

### Runtime synchronization

`ThemeEngine.ts` caches startup data, shares an initialization promise, subscribes before reading native state, and uses a revision counter to prevent delayed startup reads overriding newer changes. Changes publish immediately to local subscribers before native persistence. Identical native echoes do not notify again. Tauri calls are guarded; browser-only use works with local storage and memory. The existing native `theme:state-changed` protocol is retained.

## Design System — Rounded Craft

All theme surfaces adhere to the warm Craft radius + shadow scale from `DESIGN.md` §3–4: `4px` (chips), `6px` (buttons/inputs), `8px` (papers/menus), `12px` (panels/dialogs), `6px` scrollbar thumbs, and dual-layer ambient shadows.

## Fountain Syntax Colors

The theme also controls per-element syntax highlighting colors. When `fountainColorsEnabled` is toggled off, all text appears in the base text color (for a distraction-free writing experience).

## Interactive Tour

The Theming tour (in Tutorials) opens the Bee Detective sample in the main window
and the Theme Manager window with an embedded tour card. The tour covers:

1. **Pick a Theme** — browse and select a different built-in theme (rounded `6px` rows)
2. **Create a Custom Theme** — click the Create button to open the color editor
3. **Export & Import** — learn about .actheme files


## Shared control readability

`resolveUiColors` derives panel accent, secondary ink, menu ink and input focus colours from their actual surfaces. `opaqueColor` composites supported alpha literals before contrast checks. MUI primary controls (checkboxes, radios, selected chips and navigation indicators) pair the adapted accent with its own contrast foreground. Solid primary buttons preserve the chosen accent and choose readable ink separately. Tooltip backgrounds and text are paired explicitly. `getEditorVars` uses the same resolved muted/menu roles as MUI. Footer roles are calculated separately for footer chrome. Tests cover saturated-blue, grey, yellow, white and dark surfaces, alpha imports, menu toggles and selected chip/search states.
