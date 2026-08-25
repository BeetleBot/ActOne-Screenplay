# Theming System

ActOne has a comprehensive theming system with **17 built-in themes**, 3 family-specific adaptive variants, custom theme support, and cross-window synchronization.

## Theme Architecture

```
muiTheme.ts
  ├── THEMES / THEME_CATEGORIES → theme data + section labels
  ├── deriveAllColors(coreColors) → full palette
  ├── generateMuiTheme(colors, mode) → MUI theme
  └── resolveThemeConfig(themeId) → light/dark pair
```

## Built-in Themes

Themes are organized into categories, each with its own adaptive variant:

### Classic (adaptiveId: `adaptive`)

| Theme | Mode | Description |
|-------|------|-------------|
| Classic Light | Light | Clean light theme |
| Classic Dark | Dark | Clean dark theme |
| Adaptive | Auto | Switches Classic Light/Dark by system preference |

### Catppuccin (adaptiveId: `catppuccin-adaptive`)

| Theme | Mode | Description |
|-------|------|-------------|
| Catppuccin Latte | Light | Soft light theme with purple accents |
| Catppuccin Mocha | Dark | Rich dark theme with purple accents |
| Catppuccin Adaptive | Auto | Switches Latte/Mocha by system preference |

### Pitch (adaptiveId: `pitch-adaptive`)

| Theme | Mode | Description |
|-------|------|-------------|
| Pitch Light | Light | Pure white e-ink style |
| Pitch Dark | Dark | Pure black background with grey tones |
| Pitch Adaptive | Auto | Switches white/black by system preference |

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

## Theme Categories

The `THEME_CATEGORIES` array in `muiTheme.ts` drives both the Theme Manager and Quick Settings:

```typescript
const THEME_CATEGORIES: ThemeCategory[] = [
  { label: "CLASSIC", category: "classic", adaptiveId: "adaptive" },
  { label: "CATPPUCCIN", category: "catppuccin", adaptiveId: "catppuccin-adaptive" },
  { label: "PITCH", category: "pitch", adaptiveId: "pitch-adaptive" },
  { label: "PASTEL", category: "pastel" },
];
```

The adaptive item is rendered first in its section (e.g. "Adaptive" before "Classic Light"). The `ADAPTIVE_THEME_META` record provides icon colors for each family's adaptive chip.

## Theme ID Resolution

`resolveThemeConfig()` in `themeUtils.ts` maps adaptive theme IDs to their current light/dark variant at runtime:

| Adaptive ID | Maps to |
|-------------|---------|
| `adaptive` | Classic Light (light mode) / Classic Dark (dark mode) |
| `catppuccin-adaptive` | Catppuccin Latte (light) / Catppuccin Mocha (dark) |
| `pitch-adaptive` | Pitch Light (light) / Pitch Dark (dark) |

## Adaptive Theme Toggle

`ThemeContext.tsx`'s `toggleMode` handles all three adaptive types. When the user toggles light/dark:

- If the current theme is `adaptive`, it swaps between the Classic Light and Classic Dark theme objects directly
- If `catppuccin-adaptive`, it swaps between Catppuccin Latte and Catppuccin Mocha
- If `pitch-adaptive`, it swaps between Pitch Light and Pitch Dark
- For non-adaptive themes, it falls through to the normal light/dark resolution

Initial saved-theme validation ensures that after a cold start, restored adaptive IDs are correctly resolved to their current light/dark variants. If a saved `themeId` is one of the three adaptive IDs, the proper pair lookup occurs before the first render.

## Color System

Each theme is defined by **5 core colors**:

| Color | Purpose |
|-------|---------|
| `primary` | Main accent |
| `secondary` | Secondary accent |
| `surface` | Background |
| `error` | Error states |
| `onSurface` | Text color |

`deriveAllColors()` generates the full palette from these 5 colors, producing:
- Surface variants (surface, surfaceVariant, surfaceContainer, surfaceBright, surfaceDim)
- On-surface variants
- Primary/secondary/tertiary containers
- Outlines
- Fountain syntax colors (scene heading, character, dialogue, action, transition, etc.)

## Fountain Syntax Colors

Per-element colors are derived from the theme palette:

| Element | Color Source |
|---------|-------------|
| Scene Heading | Primary |
| Character | Secondary |
| Dialogue | OnSurface |
| Action | OnSurface |
| Parenthetical | OnSurface variant |
| Transition | Tertiary |
| Lyrics | Tertiary |
| Centered Text | Tertiary |
| Section | Primary variant |
| Synopsis | OnSurface (italic) |
| Boneyard | Outline (dimmed) |
| Note | Error/warning |
| Marker | Color based on type |
| Scene Number | Primary |

## Custom Themes

Users can create custom themes via the **Theme Manager** window (`?modal=theme-manager`). Custom themes are:
- Stored in `actone-theme.json` via the Rust backend
- Synchronized across all windows via `theme:state-changed` Tauri events
- Listed alongside built-in themes in the settings

## Cross-Window Synchronization

When a theme changes:
1. Frontend calls `set_theme_state` Tauri command
2. Rust backend persists to `actone-theme.json`
3. Rust emits `theme:state-changed` event
4. All open windows (main, settings, help, etc.) receive the event and update

## Material Color Utilities

ActOne uses `@material/material-color-utilities` for color science — HCT (Hue, Chroma, Tone) color space, tonal palettes, and accessible contrast ratios.

---

## Design System — Arc / Craft (Warm Tactile Studio)

The full visual language is authoritative in `DESIGN.md` (Option B: "Arc / Craft" — Warm, Tactile, Literary Craft Studio). Key tokens are implemented in `src/index.css` (`--radius-*`, `--shadow-*`, `--duration-*`) and `src/constants.ts` / `src/theme/muiTheme.ts`.

### 1. Rounded Capsule Scale
All user-facing surfaces use a harmonious radius scale — **not** sharp `0px` corners:

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-xs` | 4px | status dots, KBD keycaps, tag chips |
| `--radius-sm` | 6px | buttons, inputs, dropdown items, scene cards |
| `--radius-md` | 8px | tab capsules, dock items, banner cards |
| `--radius-lg` | 12px | floating sidebars, tool containers, modal papers |
| `--radius-xl` | 16px | welcome dialog, large floating canvases |
| `--radius-pill` | 9999px | status pills, search bars, active count capsules |

Global `shape.borderRadius` is `6` (MUI default). Papers default to `8px`, dialogs to `12px`, menus/popovers to `8px`. Pill search inputs and tab capsules use `20px`/`9999px`. Only the simulated manuscript page edges remain sharp.

### 2. Dual-Layer Ambient Shadows
No single-layer harsh black drops. Light theme uses dual-layer diffusion (`--shadow-xs/sm/md/lg/floating` + `--shadow-page`); dark theme uses deeper ambient variants. Active tab pills, scene cards, and dialogs float with subtle depth.

### 3. Motion & Tactile Feedback
`--duration-fast 0.12s` / `--duration-normal 0.20s` / `--duration-slow 0.28s` with `--easing-snappy` and `--easing-spring` curves. Cards lift on hover (`translateY(-1px)` + `--shadow-sm`), press scales to `0.98` / `0.92` for tactile bounce.

### 4. Minimal Pill Scrollbars
Thin `6px` capsule thumbs (`border-radius: 9999px`, `background-clip: padding-box`, `scrollbar-width: thin`) with soft hover, not blocky 10px bars.

### 5. Input & Button Styling
Outlined inputs have soft `6px` radius, paper backgrounds, and focus within `0 0 0 2px accent-mix` ring. Primary actions are pill contained buttons (`20px` radius); secondary are outlined pills. Contained buttons use the accent gradient with polished top-edge highlight; hover/active states use alpha-tinted feedback.
