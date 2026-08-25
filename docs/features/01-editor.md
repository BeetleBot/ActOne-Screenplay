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

### Indic Script & Complex Typography Support

Integrated font fallback chain (`--font-editor-indic`) featuring bundled fonts for Malayalam (*Baloo Chettan 2*, *Mukta Malar*), Hindi/Marathi (*Mukta*), Telugu (*Hind Guntur*), Bengali (*Hind Siliguri*), Gujarati (*Hind Vadodara*), Kannada (*Baloo Tamma 2*), Punjabi (*Baloo Paaji 2*), and Odia (*Baloo Bhaina 2*). Includes descender underline spacing (`text-underline-offset: 3px`).

### Scrollbars & Chrome

Custom pill scrollbars are used app-wide — thin `6px` capsule thumbs with `9999px` radius, `scrollbar-width: thin`, and soft ambient hover. Papers, menus, and dialogs use the craft radius + shadow tokens from `DESIGN.md`.

### Right-Click Context Menu

Right-clicking opens a context menu (`8px` radius, ambient shadow) with options:

The menu is rendered inside the app so it follows the active ActOne theme while retaining compact native-style rows, keyboard navigation, hover selection, and submenu behavior.

**Muse** (when text is selected):
- **Look up** / **Synonyms**
- **Rephrase** → configured rephrase presets
- **Translate** → configured languages

When no text is selected, **Muse** provides **Translate Whole Script**.

**Clipboard Actions:**
- **Cut** / **Copy** / **Paste** — uses Tauri clipboard plugin (`@tauri-apps/plugin-clipboard-manager`)


**Scene:**
- **Highlight Scene** → submenu with 8 scene colors (Red, Orange, Yellow, Green, Blue, Purple, Pink, Clear)

**Markers:**
- **Drop Marker** → submenu with 11 marker colors (Blue, Brown, Cyan, Green, Magenta, Orange, Pink, Purple, Red, Yellow, Default)

**Formatting:**
- **Format** → submenu: Bold (`**`), Italic (`*`), Underline (`_`)

**Text:**
- **Transform Case** → submenu: UPPERCASE, Title Case, lowercase
- **Look Up Word** — opens Google search in browser

**Tasks & Parking:**
- **Create Task** — create a to-do item from selected text
- **Park Selection** — stash selected text for later

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

`Ctrl+F` opens the floating search panel — a paper card (`12px` radius, ambient shadow) with pill inputs. Supports:
- **Fast, Optimized Searching**: Single-pass O(N) scene context lookup.
- **Incremental List Rendering**: Infinite scroll rendering 50 matches at a time.
- **Precise Scene Context**: Shows which Scene Heading each match belongs to, with scene-number pill (`6px`) and highlighted hit (`3px` radius).
- **Pill Refinement Toggles** (`20px` radius): Case-sensitive (`Aa`), whole-word (`\b`), and regex (`.*`) matching. Active toggles show a soft primary tint.
- **Flexible Replacing**: Replace single, replace selected (via `4px` checkboxes), or replace all — actions are pill buttons (`20px`): outlined for single/selected, contained for All.
- **Visuals**: Pill Find/Replace inputs (`20px` radius, paper bg), match-count pill chip, result rows as `8px` rounded items with subtle hover, draggable left edge with rounded hover glow to resize.


### Dual Dialogue Indentation

When a character name ends with `^`, the line and its associated dialogue block are classified as **dual dialogue** and indented further right (character at `3.5in`, parenthetical at `2.9in`, dialogue at `2.3in`) to visually distinguish the second speaker in a side-by-side pair. The first speaker uses standard indentation.

### Scene Navigation

- **Keyboard shortcuts**: `Alt+↑` / `Alt+PageUp` jumps to the previous scene heading; `Alt+↓` / `Alt+PageDown` jumps to the next scene heading
- **Outline view** in sidebar: click any scene to jump to it
- **Status bar**: shows current scene location
- **Drag-to-reorder** scenes in the outline view

### Landing Pad (Empty Project State)

When a project has no scripts open, the Fountain editor is replaced by the **Landing Pad** view:
- Displays a clean prompt: *"Act One, Scene One. / Every screenplay starts here. Create your first script to begin writing."*
- Features a **"Create a new script"** button that prompts for the script title and instantly opens the editor.
- The sidebar feature tabs and Muse AI assistant are disabled until a script is created.

### Prose & Markdown Editor (Notepad & Scratchpad)

ActOne includes a rich Markdown & Prose editor with real-time inline decorations and smart typing mechanics:

- **Visible Syntax Highlighting**: Formatting symbols (`#`, `**`, `*`, `~~`, `` ` ``, `[ ]()`) stay visible with syntax color styling.
- **Stepped Blockquote Rails**: Leading `>` characters render a solid, stepped colored indicator bar sized at `1ch` per depth level, with the `>` markers embedded inside the rail.
- **Smart Nesting**: Typing `>` on an empty blockquote line automatically collapses trailing whitespace to keep quote markers grouped (`>> `, `>>> `).
- **Tab / Shift-Tab Indentation**:
  - **Blockquotes**: Pressing `Tab` increases nesting depth (`>` → `>>`); `Shift-Tab` decreases depth.
  - **Lists**: Pressing `Tab` indents list items by 2 spaces and starts sub-items (resetting ordered sub-items to start at `1.`).
  - **Sequential Re-numbering**: Pressing `Shift-Tab` or `Enter` on an empty sub-item un-indents back to the parent level and restores continuous numbering (e.g. continuing from `2. Second item` to `3. Third item`).
