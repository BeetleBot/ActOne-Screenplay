# Timeline View

The Timeline View is a multi-track visual overview extending smoothly from the status bar, providing screenwriters with instant macro-level spatial awareness of their story's structural pacing, acts, sequences, and individual scenes.

## Features

- **Status Bar Integration**: Docked directly into the status bar area, sharing its background, theme, and aesthetic seamlessly.
- **Customizable Display Options**:
  - **Section Lines**: Optional Acts and Sequences tracks (hidden by default, toggled via Timeline Options).
  - **Scene Numbers**: Toggleable scene number indicators without clashing rounded boxes.
  - **Scene Colors**: Optional color-coded scene cards.
- **Synchronized Tracks**:
  - **Acts / Sections Track** (Top): Renders top-level Fountain sections (`# Act I`, `# Act II`, etc.) sized proportionally to their script length.
  - **Sequences Track** (Middle): Renders secondary Fountain sections (`## Sequence 1`, etc.) indicating sub-arcs and sequences.
  - **Scenes Track** (Bottom): Renders every individual scene heading proportionally sized to its line length, showing scene numbers, locations, and color tags.
- **Interactive Playhead**: A vertical playhead cursor with top and bottom indicator needles and a neon beacon indicates your active writing position in real time.
- **Scrubbing Navigation**: Click or drag anywhere across the timeline tracks to smoothly scroll the editor to that exact line/scene.
- **Fluid Horizontal Zooming & Panning**: Hold `Ctrl` (or `Alt`) and scroll the mouse wheel over the timeline for smooth exponential zooming (1x to 15x) anchored to your mouse focal position. Standard wheel/trackpad scrolling pans horizontally when zoomed.
- **Dynamic Multi-Track Filtering**:
  - Filter scenes by Character, Location, Time of Day, Setting (INT/EXT), or Markers from the Status Bar.
  - When **Markers** filter is active, discrete bookmark pin icons are rendered directly along the timeline at the exact line positions. Hovering over a marker pin shows its line number and description in a tooltip, and clicking it jumps directly to that line.
  - Filtered scenes remain vibrantly highlighted while non-matching scenes are subtly dimmed.
- **Keyboard Shortcut**: Toggle visibility anytime via `Alt+T` or the Command Palette (`Ctrl+K` -> "Show/Hide Timeline View").
- **Preferences**: Timeline visibility and track preferences are persisted in `localStorage` under `actone-show-timeline`, `actone-timeline-show-sections`, `actone-timeline-show-scene-numbers`, and `actone-timeline-show-scene-colors`.
