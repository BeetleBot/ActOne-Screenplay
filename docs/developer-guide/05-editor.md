# CodeMirror 6 Editor

The editor is the core of ActOne. It uses **CodeMirror 6** with custom extensions for Fountain screenplay syntax highlighting, autocomplete, and interaction.

## Architecture

```
FountainEditor.tsx (React shell)
  └── useCodeMirror.ts (custom hook)
        ├── EditorView (CM6 core)
        ├── fountainSyntax.ts (StateField → line type classification + decorations)
        ├── inlineAutocomplete.ts (ghost text suggestions)
        ├── emptyLineSelection.ts (ViewPlugin for blank line selection)
        └── built-in extensions (history, keymaps, search, close brackets)
```

## Editor Hook (`useCodeMirror.ts`)

Located at `src/editor/useCodeMirror.ts` (~720 lines). This custom React hook manages the full CodeMirror lifecycle:

- Creates `EditorView` instance
- Configures all extensions (static + dynamic via compartments)
- Links editor state to React contexts (`EditorContext`, `FileContext`)
- Syncs text changes back to `FileContext.rawText`
- Manages selection tracking
- Implements smart quotes
- Handles Tab key for cycling line prefixes
- Handles Enter key for dialogue auto-indent
- Controls Zen mode, typewriter scroll, and active line highlighting

### Compartments (dynamic configurations)

| Compartment | Toggles |
|-------------|---------|
| `themeCompartment` | Light/dark theme |
| `fontSizeCompartment` | Font size |
| `keymapCompartment` | Custom keybindings |
| `languageCompartment` | Fountain syntax |
| `typewriterCompartment` | Typewriter scroll mode |
| `readOnlyCompartment` | Read-only mode |
| `placeholderCompartment` | Placeholder text |

## Fountain Syntax (`fountainSyntax.ts`)

Located at `src/editor/fountainSyntax.ts` (~480 lines). Implements a custom `StateField` that:

1. Parses each line using the frontend parser on every document change
2. Classifies lines into 25+ `LineType` values
3. Applies decorations (colors, styling) based on the active theme
4. Highlights scene numbers, markers, colors, boneyard comments, notes

## Inline Autocomplete (`inlineAutocomplete.ts`)

Located at `src/editor/inlineAutocomplete.ts` (~430 lines). Provides ghost-text autocomplete for:

- Character names (from character list + document)
- Location extensions (INT./EXT.)
- Scene/section names
- Transition keywords

Uses a custom `ViewPlugin` with a ghost text widget displayed inline.

## Empty Line Selection (`emptyLineSelection.ts`)

Located at `src/editor/emptyLineSelection.ts` (~40 lines). A `ViewPlugin` that renders a single-character-width selection marker on empty lines within the current selection range, matching Windows native selection behavior on both platforms.

## Key Features

### Smart Quotes
Auto-converts straight quotes to curly quotes during typing.

### Tab-to-Cycle
Pressing Tab on a line cycles through Fountain prefixes (empty → `INT.` → `EXT.` → etc.).

### Enter Indentation
Pressing Enter in a character name creates a `(V.O.)`-style parenthetical; pressing Enter after dialogue continues as dialogue.

### Right-Click Context Menu
Provides quick actions:
- Insert marker
- Set scene color
- Add/remove note
- Transform case
- Look up word
- Park selection
- Tag scene
- Create task from line

### Zen Mode
Full-screen distraction-free writing mode.

### Typewriter Mode
Keeps the cursor vertically centered — the page scrolls around the cursor instead of letting it drift.

## Clipboard and Selection Core Fixes

To achieve a seamless native app writing experience, several core adjustments were made to CodeMirror event interceptors and layout coordinates:

### 1. Clipboard Context Actions (Copy, Cut, Paste)
Due to standard browser sandbox restrictions on clipboards, context menu actions (right-click menu) often fail. We resolved this by:
*   Integrating `navigator.clipboard` APIs directly inside layout actions.
*   Forcing clipboard updates into the system ring buffer so native OS level clipboard registers (Ctrl+C, Ctrl+X, Ctrl+V) sync perfectly with toolbar actions.

### 2. Shift+Click Range Selection
Fixed a selection bug where holding Shift and clicking down selected text all the way to the end of the document. We resolved this by standardizing selection anchors inside click event listeners and ensuring CodeMirror's internal drag-select filters do not cascade mouse positions past bounding viewports.

### 3. Click Coordinate & Jumping Calibrations
Fixed an alignment bug where clicking on Line 3 mapped the cursor to Line 2 (and clicking on Line 2 fell on Line 1). This occurred due to padding and line-height offsets in the CSS layer. By matching the logical line height precisely with the DOM element heights inside `index.css` and aligning margins inside the editor's scroll-wrapper, click mappings now align perfectly on target lines.

