# Editor

The core editing experience is powered by **CodeMirror 6** with custom Fountain screenplay extensions.

## Features

### Fountain Syntax Highlighting

Every line is classified in real-time into one of 25+ line types (Scene Heading, Character, Dialogue, Action, Transition, etc.) and color-coded according to the active theme.

### Smart Line Type Cycling

Pressing **Tab** on any line cycles through Fountain prefixes:
- Empty → `INT.` → `EXT.` → `INT./EXT.` → `I.E.` → `EST.` → (back to empty)

### Smart Enter

- After a character name: automatically inserts `(V.O.)`-style parenthetical if the next line is empty
- In dialogue: continues as dialogue with appropriate indentation

### Smart Quotes

Straight quotes (`"` and `'`) are automatically converted to curly typographic quotes (`""` and `'`) as you type.

### Bold / Italic / Underline

| Shortcut | Effect |
|----------|--------|
| `Ctrl+B` | `**bold**` |
| `Ctrl+I` | `*italic*` |
| `Ctrl+U` | `_underline_` |

### Right-Click Context Menu

Opens a context menu with options:
- **Insert Marker** — add a margin marker
- **Set Scene Color** — color-code the current scene
- **Add/Remove Note** — toggle `[[note]]` annotation
- **Transform Case** — UPPERCASE, lowercase, Title Case
- **Look Up** — open word in system dictionary
- **Park Selection** — stash selected text for later
- **Tag Scene** — attach production tags
- **Create Task** — create a to-do item from line

### Zen Mode

`Ctrl+Alt+Enter` toggles a full-screen distraction-free mode. The activity bar, header bar, and status bar are hidden.

### Typewriter Mode

Keeps your editing line vertically centered on screen. As you type, the page scrolls around your cursor instead of allowing it to drift.

### Zoom

| Shortcut | Effect |
|----------|--------|
| `Ctrl+=` | Zoom in |
| `Ctrl+-` | Zoom out |
| `Ctrl+0` | Reset zoom |

### Find & Replace

`Ctrl+F` opens the search panel. Supports:
- **Fast, Optimized Searching**: Performance is optimized for massive scripts, using a single-pass O(N) scene context lookup.
- **Incremental List Rendering**: To prevent DOM overloading and application lag, the search panel uses infinite scrolling to render matches incrementally (50 items at a time) as you scroll or navigate.
- **Precise Scene Context**: Displays which Scene Heading each match belongs to.
- **Refinement Toggles**: Case-sensitive (`Aa`) and whole-word (`\b`) matching.
- **Flexible Replacing**: Replace single, replace selected (via checkboxes), or replace all.


### Right-click Menu

Right-clicking in the editor opens a context menu with actions that operate on the **pre-click selection** (captured before the click collapses it):
- Cut / Copy / Paste — uses the Tauri clipboard plugin
- Change case (Upper, Lower, Title)
- Toggle inline formatting (**bold**, *italic*, underline)
- Quick Tag, Park selection, Drop marker, Create task

### Dual Dialogue Indentation

When a character name ends with `^`, the line and its associated dialogue block are classified as **dual dialogue** and indented further right (character at `3.5in`, parenthetical at `2.9in`, dialogue at `2.3in`) to visually distinguish the second speaker in a side-by-side pair. The first speaker uses standard indentation.

### Scene Navigation

- **Outline view** in sidebar: click any scene to jump to it
- **Status bar**: shows current scene location; click to jump
- **Drag-to-reorder** scenes in the outline view
