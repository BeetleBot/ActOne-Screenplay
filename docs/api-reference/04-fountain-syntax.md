# Fountain Syntax Reference

Fountain is a plain-text markup language for screenplays. ActOne supports the full Fountain specification with extensions.

## Elements

### Scene Headings

```fountain
INT. HOUSE - DAY
EXT. BEACH - SUNSET

INT./EXT. CAR - NIGHT     # Interior/Exterior hybrid
```

- Starts with `INT`, `EXT`, `INT./EXT`, `I.E.`, or `EST` (case-insensitive)
- Followed by a period/dot and space
- **Forced heading:** `.ANY TEXT HERE`
- **Scene numbers:** `INT. SCENE #42#` (appended with `#...#`)

### Action

```fountain
He walks to the door and opens it.
The wind howls outside.
```

- Any line that doesn't match another pattern
- Consecutive action lines are merged into a block

### Character

```fountain
SHARANYA
VIKRAM (V.O.)
HELEN (CONT'D)
```

- All-uppercase line before dialogue
- Optional extension in parentheses: `(V.O.)`, `(O.S.)`, `(CONT'D)`
- **Forced character:** `@CHARACTER NAME`

### Dialogue

```fountain
SHARANYA
Hello, Vikram. How are you?
```

- Text following a character cue
- Continues until blank line or another element

### Parenthetical

```fountain
VIKRAM
(angry)
I'm fine.
```

- Wrylies and direction in parentheses
- Placed between character cue and dialogue

### Dual Dialogue

```fountain
SHARANYA
Hello.

VIKRAM ^
Hi.
```

- Indicated by `^` after character name
- Both characters' dialogue appears side-by-side in PDF

### Transition

```fountain
CUT TO:
FADE IN:
FADE OUT.
FADE TO BLACK.
SMASH CUT TO:
DISSOLVE TO:
```

- Ends with `TO:` or `TO.`, or is a common transition
- Must be all uppercase
- **Forced transition:** `>TRANSITION TEXT`

### Lyrics

```fountain
~La la la, sing a song
~La la la, all day long
```

- Prefix `~` at start of line

### Centered Text

```fountain
>THE END<
```

- `>text<` format

### Shot

```fountain
!!CLOSE UP ON THE DOOR
！！CLOSE UP ON THE DOOR   (full-width punctuation)
```

- Prefix `!!` or `！！` (full-width)

### Section

```fountain
# Act One
## Sequence 1
### Scene Group A
```

- `#` prefix, depth indicated by `##`, `###`, etc.

### Synopsis

```fountain
= The hero begins their journey
= This is a key turning point
```

- `=` prefix
- Displayed in outline view

### Page Break

```fountain
===
====
```

- Three or more `=` signs on a line

### Forced Elements

```fountain
!Force this as action      # Force Action
.Force this as heading     # Force Scene Heading
@CHARACTER                 # Force Character
>TRANSITION TEXT           # Force Transition
```

### Boneyard (Comments)

```fountain
/* This is a comment */
/* Multi-line
   comments are supported */
```

- `/* ... */` syntax
- Hidden from all output

### Notes

```fountain
[[This is a note]]
[[color: red]]Highlighted note[[/color]]
```

- `[[ ... ]]` syntax
- Visible in editor, excluded from export
- Supports `[[color: ...]]` tags for colored notes

### Emphasis (Bold / Italic / Underline)

```fountain
*italic*
**bold**
***bold italic***
_underline_
__underline__
```

- Follows CommonMark delimiter rules
- Asterisks for italic/bold, underscores for underline

### Title Page

```fountain
Title: My Screenplay
Credit: Written by
Author: John Smith
Source: Based on true events
Draft Date: 2024-01-15
Contact: john@example.com
Notes:
    A note about this screenplay
```

- Key: value pairs at the top of the file
- Separated from content by a blank line
- Values can span multiple lines with 3+ space indentation

## Extended Features (ActOne-specific)

### Scene Colors

```fountain
INT. HOUSE - DAY [[color: red]]
INT. CAR - NIGHT [[color: #FF5733]]
```

- Color tags in `[[color: ...]]` syntax
- Supported in scene headings
- Rendered in outline view and PDF export

### Markers

- `*` or custom marker symbols at line start in certain contexts
- Displayed as colored circles in the editor gutter
- Used for production tracking

### Tags

- Scene colors via `[[color: ...]]` and storyline membership via `[[storyline ...]]` on scene headings
- Legacy production tag metadata remains parseable from `production_tags.json` in `.actone` bundles
- The dedicated Tag Manager window was removed
