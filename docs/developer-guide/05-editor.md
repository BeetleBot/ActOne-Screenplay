# CodeMirror 6 Editor

The editor is the core of ActOne. It uses **CodeMirror 6** with custom extensions for Fountain screenplay syntax highlighting, autocomplete, and interaction.

## Architecture

### Document switching

`FileContext.setActiveScript` flushes pending edits and selects the destination
immediately. Screenplays publish lightweight derived state while a deferred task
calls `parseScreenplayAsync` (the parser Worker, with its existing synchronous
fallback). This task is held in `pendingPreparationRef` until the keyed editor
loading gate calls `prepareDocument` after the editor has mounted and painted. `isDocumentLoading` identifies these pending lines. Sequence, filename,
and source checks prevent late results replacing a newer revision or selection.
Parse failures end the loading state with an error; selecting the document again
retries. Returning to a project with an unfinished parse restarts that work.

`DocumentLoadingGate`, keyed by project/document, shows an embedded spinning
ActOne logo before mounting the editor. Two animation frames let the loading view
paint before synchronous editor setup. The editor displays source text before
background screenplay parsing and page estimates complete.
Prose uses the same initial loading frame. Canvas keeps the logo visible through
lazy module and drawing-data loading. The loader stays within the editor, leaves
project navigation available, and respects reduced-motion preferences.

There are no document-switch caches for parsed results, native page breaks, or
CodeMirror states. Each visit builds a fresh editor; cursor and scroll positions
still restore through `editorPosition`, while undo history resets on switching.
The editor uses the Fountain parser's lightweight page estimates; `FileContext` does not request native PDF layout when opening, switching, or editing documents. Exact pagination belongs to PDF preview/export. Canvas views remount and validate drawing data;
the save bridge serializes only after a drawing/settings change.

The desktop `get_page_breaks` command is asynchronous and runs PDF/font layout
on `tauri::async_runtime::spawn_blocking`, keeping that CPU work off the desktop
event loop. The document loader portals an inline SVG into `.editor-container`,
outside the paper's scroll and padding, and stays visible until after editor mount
and a paint opportunity. It does not depend on a CSS mask asset resolving.

```
FountainEditor.tsx (React shell)
  └── useCodeMirror.ts (custom hook)
        ├── EditorView (CM6 core)
        ├── fountainSyntax.ts (StateField → line type classification + decorations)
        ├── inlineAutocomplete.ts (ghost text suggestions)
        ├── emptyLineSelection.ts (ViewPlugin for blank line selection)
        ├── cursorLayer (custom layer → drawn blinking caret)
        └── built-in extensions (history, keymaps, search, close brackets)
```

## Editor Hook (`useCodeMirror.ts`)

Located at `src/editor/useCodeMirror.ts` (~720 lines). Returns a `ViewRef` (via `useRef`) rather than the view directly. This custom React hook manages the full CodeMirror lifecycle:

- Creates `EditorView` instance
- Configures all extensions (static + dynamic via compartments)
- Links editor state to React contexts (`EditorContext`, `FileContext`)
- Syncs text changes back to `FileContext.rawText`
- Keeps the current CodeMirror document pending during the short sync debounce and serializes it once when publishing the change
- Flushes pending editor changes before saving, switching documents, or closing a document
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

## Custom Cursor Layer (`useCodeMirror.ts`)

Defined at the top of `src/editor/useCodeMirror.ts` (~45 lines). A cursor-only CodeMirror layer that replaces the built-in `drawSelection()` extension:

- `layer({ above: true, class: "cm-cursorLayer" })` draws `.cm-cursor` rectangles (`cm-cursor-primary` for the main range, `cm-cursor-secondary` for additional empty ranges) via `RectangleMarker.forRange`.
- The native caret is hidden with `caretColor: transparent` on both `&` and `.cm-content`, so the only caret visible is the drawn one, which is recreated on every selection transaction and blinks on a 1200ms cycle.
- Selection rendering is intentionally untouched: native `::selection` continues to provide text-highlight rendering, so the editor never shows CodeMirror's `.cm-selectionBackground` decorations.

Why: WebKitGTK (Linux) leaves stale native caret paint at the previous cursor position during rapid keyboard navigation, producing a visible duplicate caret. A drawn layer eliminates the ghost on Linux while behaving identically to the native caret on Windows WebView2. `drawSelection()` is not used because its `nativeSelectionHidden` theme would replace native `::selection` highlighting with opaque CodeMirror selection blocks.

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
Due to standard browser sandbox restrictions on clipboards, right-click actions must use the same application clipboard path as keyboard and toolbar actions. The themed HTML context menu calls the editor actions directly, and we resolved this by:
*   Integrating `navigator.clipboard` APIs directly inside layout actions.
*   Forcing clipboard updates into the system ring buffer so native OS level clipboard registers (Ctrl+C, Ctrl+X, Ctrl+V) sync perfectly with toolbar actions.

### 2. Shift+Click Range Selection
Fixed a selection bug where holding Shift and clicking down selected text all the way to the end of the document. We resolved this by standardizing selection anchors inside click event listeners and ensuring CodeMirror's internal drag-select filters do not cascade mouse positions past bounding viewports.

### 3. Click Coordinate & Jumping Calibrations
Fixed an alignment bug where clicking on Line 3 mapped the cursor to Line 2 (and clicking on Line 2 fell on Line 1). This occurred due to padding and line-height offsets in the CSS layer. By matching the logical line height precisely with the DOM element heights inside `index.css` and aligning margins inside the editor's scroll-wrapper, click mappings now align perfectly on target lines.

## Prose & Markdown Editor (`inline-preview.ts`)

Located at `src/editor/markdown/inline-preview.ts` (~1050 lines) with accompanying styles in `src/prose-editor.css`. Provides a rich live-preview Markdown editing experience:

- **Visible Syntax Highlighting**: Unlike pure previewers that hide markdown tokens, all syntax markers (`#`, `**`, `*`, `~~`, `` ` ``, `[ ]()`, `>`) remain visible and are decorated with subtle syntax classes (`.cm-prose-*-mark`).
- **Stepped Blockquote Rails**: Traverses blockquote AST nodes and applies depth classes (`.cm-prose-blockquote-depth-0` through `depth-7`). The solid left rail width scales with character depth (`1ch`, `2ch`, etc.), embedding the `>` tokens directly inside the bar.
- **Smart Blockquote Continuation**: `handleBlockquoteEnter` preserves nesting levels and exits to a clean line on double-Enter. `blockquoteInputHandler` collapses intermediate spaces when typing `>` on an empty quote prefix.
- **List & Quote Indentation**: `handleMarkdownTab` and `handleMarkdownShiftTab` handle `Tab` / `Shift-Tab` key events to nest/un-nest blockquotes and list items, with `getNextOrderedListNumber` dynamically resolving sequential parent numbers.


Hidden sidebar views are unmounted, so Outline only builds while its pane is visible.
Timeline is mounted only when enabled, outside Zen mode, with an eligible screenplay.
Closed Search/UrAI pane contents unmount immediately while their shell can animate out.
Command-palette document lists are built only for the open category. Snapshot history
queries require a mounted Snapshots panel; automatic snapshot creation does not.
Status-bar filter lists build only while their menu is open; script word/page statistics wait for deferred parsing. X-Ray data is sent only to a visible X-Ray window.

## Collapsible Sections & Structure Lines

Located in `src/editor/fountainFold.ts` and `src/editor/structureLines.ts`.

- **Fountain Fold Engine (`fountainFold.ts`)**:
  - `getFountainFoldRange`: Evaluates the Fountain structural hierarchy:
    - Section (`#`): Collapses all nested content until the next act. Screenplay structure has only two levels: `#` acts and `##` sequences. Legacy deeper prefixes use sequence behavior, not additional levels.
    - Sub-section (`##`): Collapses until the next sub-section or parent section.
    - Scene (`LINE_HEADING`): Collapses scene body lines until the next scene heading or any section header.
  - Registers `fountainFoldService` with CodeMirror's `foldService` facet.
  - `fountainFoldTogglePlugin`: Renders clickable chevron widgets (`.cm-fountain-fold-toggle`) at `line.from` for section and scene headings. Controls are absolutely positioned in the margin and do not consume text width.
  - `fountainFoldCodeExtension`: Configures `codeFolding` with custom badges displaying the collapsed line count.

- **Structure Lines & Margin Channels (`structureLines.ts`)**:
  - Implements a dedicated CodeMirror `layer` drawing vertical scope rails in the paper's 1.5-inch left margin.
  - Three-channel margin layout:
    - **Channel 1 (Outer Margin: -96px, -88px, -80px)**: Section, Sub-section, and Scene vertical rails. Offsets scale with `--zoom`.
    - **Channel 2 (Mid Margin: -18px to -45px)**: Reserved for Scene Number labels (`[data-scene-number]`).
    - **Channel 3 (0px)**: Standard screenplay text margin.
  - When Structure Lines are enabled, `# ACT I` and `## SEQUENCE 1` hang into the margin (`.cm-structure-lines-active`).
  - When Structure Lines are disabled, sections and scenes align evenly on the exact same left line (`margin-left: 0`).


### Structure regression checks

- `npm test -- src/editor/structureLines.test.ts src/editor/fountainFold.test.ts` covers classification propagation, unchanged-line-count replacements, section-depth changes, deterministic edit sequences and two-level fold boundaries.
- `npm run test:editor-structure` starts an isolated Vite page and headless Edge using WebDriver. Requires Edge plus `msedgedriver` at `node_modules/.desktop-tools/bin/msedgedriver.exe` (or set `EDGE_DRIVER`). It uses the actual editor extensions and stylesheet, with real layout measurements at 75%, 100%, 150% and 200% zoom. Checks include text alignment, rail coordinates, live enable/disable, nested fold preservation, chevron interaction and placeholder expansion. Results and failure screenshots go to `node_modules/.structure-results/`.
- The browser harness verifies Chromium layout; it does not replace native WebView2 or Linux WebKitGTK smoke testing.

Scope rails are spaced 8px apart at 100% zoom. Act and sequence text begins 24px to the right of its matching rail. Fold controls sit to the left of scene numbers, using the actual label length to reserve space. Rails expose native hover tooltips: act/sequence names, or the scene number followed by its heading. Marker equality includes the label so heading edits refresh tooltip text even when geometry stays unchanged.
