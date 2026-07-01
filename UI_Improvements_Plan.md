# Implementation Plan — Modernizing the ActOne UI Layout

This plan details the design and code changes required to migrate ActOne's user interface away from default mobile-first Material Design presets to a flat, premium desktop experience (inspired by Linear, Obsidian, and VS Code).

## Proposed Changes

---

### Component 1: Global Theme Styles (`muiTheme.ts`)
We will configure component style overrides inside [muiTheme.ts](file:///home/nkr/Projects/ACTOneFamily/ActOneCode/src/theme/muiTheme.ts) to disable mobile touch indicators and flatten interactive controls.

#### [MODIFY] [muiTheme.ts](file:///home/nkr/Projects/ACTOneFamily/ActOneCode/src/theme/muiTheme.ts)
- **Disable Button Ripples Globally**: Add `disableRipple: true` and `disableTouchRipple: true` to the default props of `MuiButtonBase`, `MuiButton`, `MuiIconButton`, and `MuiMenuItem`.
- **Flat Inputs & Borderless Fields**: 
  - Update `MuiOutlinedInput` and `MuiSelect` theme configurations:
    - Set the default background color to a flat shade (`theme.palette.action.hover` or `theme.colors.dropdown`).
    - Remove the default bold borders (`.MuiOutlinedInput-notchedOutline { border: 'none' }`).
    - Set border radii to `6px`.
    - Apply a subtle `1px solid` border only on focus state (`&.Mui-focused`), highlighted in the theme's active accent color.
- **Modern Compact Scrollbars & Popovers**:
  - Configure `MuiPopover` and `MuiMenu` paper to render with flat border styling, clean margins, and clear default browser shadows.
  - Disable default background scaling issues.

---

### Component 2: Global Stylesheet overrides (`index.css`)
We will write customized CSS patterns into [index.css](file:///home/nkr/Projects/ACTOneFamily/ActOneCode/src/index.css) to override default HTML element tracks.

#### [MODIFY] [index.css](file:///home/nkr/Projects/ACTOneFamily/ActOneCode/src/index.css)
- **Custom Thin Scrollbars**:
  - Standardize scrollbars across the application:
    ```css
    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    ::-webkit-scrollbar-track {
      background: transparent;
    }
    ::-webkit-scrollbar-thumb {
      background: var(--theme-border);
      border-radius: 3px;
      transition: background 0.15s ease;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: var(--accent-color);
    }
    ```
  - Ensures scrollbars are narrow, unobtrusive, and match the active theme.
- **Glassmorphic Backdrops**:
  - Maintain the clean `.MuiBackdrop-root` backdrop filter rules to ensure background dialog blur remains disabled during popup options.

---

### Component 3: Sidebar Panel Upgrades (Outline / Todo / Sprint)
We will refactor layout structures in the sidebar lists to use dynamic color-mixes, indented visual tracks, and outline style tags.

#### [MODIFY] [TodoView.tsx](file:///home/nkr/Projects/ACTOneFamily/ActOneCode/src/components/TodoView.tsx)
- **Styling Alignment**:
  - Replace the default boxy list buttons with custom row layouts.
  - Apply the background color-mix system used in `SnapshotsPanel.tsx`:
    - Base: `color-mix(in srgb, theme.palette.text.primary 4%, transparent)`
    - Hover: `color-mix(in srgb, theme.palette.text.primary 8%, transparent)`
    - Selected: `color-mix(in srgb, theme.palette.text.primary 12%, transparent)`
  - Style the checkbox circles to be borderless elements that transition opacity on hover.
  - Format status chips as capitalized thin-bordered tags (e.g. `COMPLETED`, `PENDING`) with high letter-spacing.

#### [MODIFY] [SprintView.tsx](file:///home/nkr/Projects/ACTOneFamily/ActOneCode/src/components/SprintView.tsx)
- **Compact UI Alignments**:
  - Align button elements with flat theme overrides.
  - Remove all remaining custom box-shadow and gradient styling.
  - Convert duration buttons to use clean, thin-bordered tags instead of solid pills.

#### [MODIFY] [OutlineView.tsx](file:///home/nkr/Projects/ACTOneFamily/ActOneCode/src/components/OutlineView.tsx)
- **Indented Hierarchies and Tracks**:
  - For nested items (Act, Sequence, Scene), draw a thin vertical track guide (`1px solid`) on the left margin using `color-mix(in srgb, theme.palette.divider 40%, transparent)`.
  - Draw these vertical lines recursively to indicate outline relationships, creating a clean folder-tree structure like VS Code.
  - Style all type filters to match storyline tag dimensions.

---

### Component 4: Dialogs & Windows (Settings & Command Palette)
We will ensure that settings toggles, inputs, and sliders fit into this new flat layout.

#### [MODIFY] [SettingsWindow.tsx](file:///home/nkr/Projects/ACTOneFamily/ActOneCode/src/components/SettingsWindow.tsx)
- **Slider Redesign**:
  - Set slider track heights to `2px`.
  - Style slider thumbs as compact, borderless circles that scale smoothly when hovered or active.
- **Button Standards**:
  - Standardize settings buttons to use flat layouts, thin borders, and sharp radii, matching the primary sidebar view.

#### [MODIFY] [CommandPalette.tsx](file:///home/nkr/Projects/ACTOneFamily/ActOneCode/src/components/CommandPalette.tsx)
- **Translucent Modal Backdrop**:
  - Give the search palette popover a modern translucent background:
    ```typescript
    backgroundColor: "rgba(20, 20, 20, 0.8)",
    backdropFilter: "blur(12px)",
    ```
  - Standardize outline border to `1px solid divider` with a shadow-free layout.

---

## Verification Plan

### Automated Tests
- Run `npm run typecheck` to confirm TypeScript compiles correctly.
- Run `npx vitest run` to ensure all 221 unit tests continue to pass.

### Manual Verification
- Check all sidebars (Outline, Snapshots, Sprint, Notepad) to ensure consistency in background colors, selections, tag styling, and visual indicators.
- Adjust sliders in settings to verify the new compact design.
- Verify custom narrow scrollbars in all panel views.
