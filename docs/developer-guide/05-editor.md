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

Located at `src/editor/useCodeMirror.ts` (~500 lines). This custom React hook manages the full CodeMirror lifecycle:

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

Located at `src/editor/fountainSyntax.ts` (~400 lines). Implements a custom `StateField` that:

1. Parses each line using the frontend parser on every document change
2. Classifies lines into 25+ `LineType` values
3. Applies decorations (colors, styling) based on the active theme
4. Highlights scene numbers, markers, colors, boneyard comments, notes

## Inline Autocomplete (`inlineAutocomplete.ts`)

Located at `src/editor/inlineAutocomplete.ts` (~200 lines). Provides ghost-text autocomplete for:

- Character names (from character list + document)
- Location extensions (INT./EXT.)
- Scene/section names
- Transition keywords

Uses a custom `ViewPlugin` with a ghost text widget displayed inline.

## Empty Line Selection (`emptyLineSelection.ts`)

Located at `src/editor/emptyLineSelection.ts` (~80 lines). A `ViewPlugin` that handles selection behavior on blank lines — ensuring users can easily select and interact with empty lines (which CodeMirror normally treats as invisible).

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
