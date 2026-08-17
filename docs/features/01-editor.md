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

### Right-Click Context Menu

Right-clicking opens a context menu with options:

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

`Ctrl+F` opens the search panel. Supports:
- **Fast, Optimized Searching**: Performance is optimized for massive scripts, using a single-pass O(N) scene context lookup.
- **Incremental List Rendering**: To prevent DOM overloading and application lag, the search panel uses infinite scrolling to render matches incrementally (50 items at a time) as you scroll or navigate.
- **Precise Scene Context**: Displays which Scene Heading each match belongs to.
- **Refinement Toggles**: Case-sensitive (`Aa`) and whole-word (`\b`) matching.
- **Flexible Replacing**: Replace single, replace selected (via checkboxes), or replace all.


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
