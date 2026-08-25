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

The **Theme Manager** window (`?modal=theme-manager`, transparent TitleBar with `28px` rounded window controls) allows creating custom themes. Both panes are `10px` rounded, theme rows and swatches are `6px`–`8px` rounded with soft shadows:

### Theme Properties
- **5 core colors**: Accent, Button, Text, Sidebar, Editor (shown as color fields with `6px` pickers)
- All other colors are derived automatically from these 5 using Material color science (HCT color space)
- Preset color cubes (5 options) are `6px` rounded with hover accent border

### Creating a Custom Theme
1. Open Theme Manager (Quick Settings → "Manage Themes…" or via Command Palette)
2. Click "Create" (pill button `6px`) or "Import" for `.actheme` files
3. Set the 5 core colors (or pick a preset)
4. Choose Dark or Light mode
5. Give it a name
6. Save (pill buttons `6px`)

Custom themes appear under a **CUSTOM** section with per-theme actions: **Export** (download `.actheme`), **Edit**, **Delete** — all with `6px` rounded icon buttons. The right pane shows a live **Theme Preview** (`8px` rounded, bordered, with app mock).

## Design System — Rounded Craft

All theme surfaces adhere to the warm Craft radius + shadow scale from `DESIGN.md` §3–4: `4px` (chips), `6px` (buttons/inputs), `8px` (papers/menus), `12px` (panels/dialogs), `6px` scrollbar thumbs, and dual-layer ambient shadows.

## Fountain Syntax Colors

The theme also controls per-element syntax highlighting colors. When `fountainColorsEnabled` is toggled off, all text appears in the base text color (for a distraction-free writing experience).

## UI Scale

**Quick Settings → Interface Scale** slider adjusts the overall UI size (75%–300%, step 5).

## Interactive Tour

The Theming tour (in Tutorials) opens the Bee Detective sample in the main window
and the Theme Manager window with an embedded tour card. The tour covers:

1. **Pick a Theme** — browse and select a different built-in theme (rounded `6px` rows)
2. **Create a Custom Theme** — click the Create button to open the color editor
3. **Export & Import** — learn about .actheme files
