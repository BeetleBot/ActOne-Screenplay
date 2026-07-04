# Theming System

ActOne has a comprehensive theming system with **14 built-in themes**, custom theme support, and cross-window synchronization.

## Theme Architecture

```
ThemeEngine.ts
  ├── deriveAllColors(coreColors) → full palette
  ├── generateMuiTheme(colors, mode) → MUI theme
  └── getFountainColors(colors) → syntax highlighting
```

## Built-in Themes

| Theme | Mode |
|-------|------|
| Light | Light |
| Dark | Dark |
| Dracula | Dark |
| Nord | Dark |
| Solarized Light | Light |
| Solarized Dark | Dark |
| Monokai | Dark |
| GitHub Light | Light |
| GitHub Dark | Dark |
| One Dark | Dark |
| One Light | Light |
| Ayu Light | Light |
| Ayu Dark | Dark |
| Adaptive | Follows system |

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
