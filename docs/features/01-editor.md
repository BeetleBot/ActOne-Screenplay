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
- Text search with live highlighting
- Case-sensitive toggle
- Regex mode toggle
- Replace single / replace all

### Scene Navigation

- **Outline view** in sidebar: click any scene to jump to it
- **Status bar**: shows current scene location; click to jump
- **Drag-to-reorder** scenes in the outline view
