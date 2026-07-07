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

## Design System & Styling Constraints

To maintain a cohesive, professional e-ink/monospace aesthetic across the entire application, several styling rules are enforced globally:

### 1. Sharp Corners (Zero Border Radius)
ActOne implements a strict flat design system with **no rounded corners**.
- All dropdowns, inputs, list items, dialog sheets, and custom panels override Material UI's default rounded shapes with a hardcoded `borderRadius: 0` or default to the global shape settings (`shape: { borderRadius: 0 }`).
- This applies to modals, templates, scrollbars, and window control buttons.

### 2. Global Outlined Inputs
Text boxes and inputs use a custom flat style:
- The default Material UI `fieldset notch` is hidden.
- The wrapper is styled with a `1px solid` border using the theme's `divider` or `border` colors.
- Focused inputs receive an inset `boxShadow` ring matching the theme's accent color rather than an external ring.

### 3. Premium Button Styling
Standard `Button` elements feature a tactile 3D effect designed to look premium under any color palette:
- **Contained Buttons**: Rendered with a top-to-bottom background gradient using the theme's primary/accent color (`accent`) mixed with a dark overlay at the bottom. It utilizes an inset highlight shadow (`inset 0 1.5px 0px rgba(255, 255, 255, 0.12)`) to create a polished top edge highlight.
- **Outlined Buttons**: Transparent background with a `1px` border that transitions cleanly on hover/active focus states using a light color-mixed background tint.
- **Inherit/Neutral Buttons**: Contained buttons styled with `color="inherit"` dynamically build a gradient based on the current theme's neutral button background (`button`).
