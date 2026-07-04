# Autocomplete (Ghost Text)

ActOne provides inline ghost-text autocomplete for screenplay elements.

## Sources

### Character Names

- Collected from the character list (`characters.json` in `.actone` bundles)
- Auto-detected from all-uppercase character cue lines in the document
- Includes gender information from character metadata

### Location Extensions

- `INT.`, `EXT.`, `INT./EXT.`, `I.E.`, `EST.`
- Dynamic suggestions based on partial input

### Scene/Section Names

- Previously typed scene headings
- Section headers from the document

### Transition Keywords

- `CUT TO:`, `FADE IN:`, `FADE OUT:`
- `FADE TO BLACK.`, `DISSOLVE TO:`, `SMASH CUT TO:`
- `MATCH CUT TO:` and other common transitions

## Interaction

| Key | Behavior |
|-----|----------|
| `Tab` | Accept ghost text suggestion |
| `Enter` | Accept ghost text suggestion |
| `ArrowDown` | Show dropdown with alternatives |
| `Escape` | Dismiss suggestion |
| Continue typing | Suggestion recalculates automatically |

## Visual

Ghost text appears as a semi-transparent continuation of the current word, rendered inline at the cursor position. When multiple suggestions are available, pressing ArrowDown opens a dropdown list.

## Configuration

Autocomplete can be toggled in **Settings → Editor → Enable Autocomplete**.
