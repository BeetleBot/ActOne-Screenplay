# Fountain Parser

ActOne has **two Fountain parsers** — one in TypeScript for the frontend editor and one in Rust for PDF/FDX/FadeIn export.

## Frontend Parser (`src/parser/FountainParser.ts`)

Located at `src/parser/FountainParser.ts` (~800 lines). A standalone TypeScript parser that converts raw Fountain text into a structured document.

### Line Types (25+)

| LineType | Description | Example |
|----------|-------------|---------|
| `SceneHeading` | Scene header | `INT. HOUSE - DAY` |
| `Action` | Description | `He walks to the door.` |
| `Character` | Character cue | `SHARANYA` |
| `Dialogue` | Dialogue line | `Hello.` |
| `Parenthetical` | Wryly | `(angry)` |
| `Transition` | CUT TO: | `CUT TO:` |
| `Lyrics` | Song lyric | `~La la la` |
| `CenteredText` | Centered | `>The End<` |
| `Shot` | Camera shot | `!!CLOSE UP` |
| `Section` | Section header | `# Act One` |
| `Synopsis` | Synopsis line | `= The hero begins` |
| `PageBreak` | Page break | `===` |
| `DualDialogue` | Side-by-side | `CHARACTER ^` |
| `Boneyard` | Comment | `/* hidden */` |
| `Note` | Annotation | `[[fix this]]` |
| `Marker` | Margin marker | `*` prefix in certain contexts |
| `ForcedAction` | Force as action | `!He runs` |
| `ForcedHeading` | Force as heading | `.INT. SOMEWHERE` |
| `ForcedCharacter` | Force as character | `@HELEN` |
| `ForcedTransition` | Force as transition | `>CUT TO BLACK<` |
| `Empty` | Blank line | |
| `TitlePageKey` | Title page field | `Title: My Script` |
| `TitlePageValue` | Title page value | (indented continuation) |

### Parser Algorithm

The parser is a **line-by-line state machine** that:

1. Preprocesses: strips boneyards (`/* ... */`), notes (`[[ ... ]]`), normalizes line endings
2. Detects title page block (key:value pairs before first blank line)
3. Iterates through remaining lines, classifying each using priority rules:
   - Sections (`#` prefix), page breaks (`===`), synopsis (`=`), shots (`!!`), forced elements first
   - Then: centered text, lyrics, headings, transitions, character/dialogue starts
   - Fallback: action blocks

### Serialization

`serializeScreenplay()` writes the parsed document back to Fountain text, useful for formatting/cleanup operations.

## Rust Parser (`src-tauri/src/pdf/parser/`)

Located across 14 files in `src-tauri/src/pdf/parser/`. A reimplementation of the Fountain parser in Rust for PDF export.

### Modules

| Module | File | Purpose |
|--------|------|---------|
| `mod.rs` | Main state machine + public `parse()` function |
| `preprocessor.rs` | Boneyard/note stripping, tab normalization |
| `heading.rs` | Scene heading parsing |
| `action.rs` | Action block parsing |
| `dialogue.rs` | Character, parenthetical, dialogue, dual dialogue |
| `transition.rs` | Transition detection |
| `centered.rs` | Centered text `>text<` |
| `lyrics.rs` | Lyrics `~` prefix |
| `shot.rs` | Shot `!!` prefix |
| `section.rs` | Section `#` prefix |
| `synopsis.rs` | Synopsis `=` prefix |
| `page_break.rs` | Page break `===` |
| `forced_action.rs` | Forced action `!` prefix |
| `title_page.rs` | Title page key:value parsing |

### Differences from Frontend Parser

The Rust parser produces a different AST (`Screenplay` struct with `Span<Element>` elements), designed for PDF layout rather than editor display. It preserves source line numbers in each `Span<T>` for accurate page break tracking.
