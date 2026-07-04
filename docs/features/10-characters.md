# Character Management

**Sidebar Tab 3** — The character panel extracts and manages character information from your screenplay.

## Character List

The panel automatically detects all characters in the document by scanning for all-uppercase character cue lines (excluding known non-character words like `INT.`, `EXT.`, `CUT TO`, etc.).

For each character:
- **Name** displayed in uppercase
- **Gender indicator** pill (cycle through Male / Female / Other / Unknown)
- Click to jump to the character's first line in the editor

## Gender Data

Character gender information is:
- Stored in `characters.json` within the `.actone` bundle
- Used by the autocomplete system to provide context
- Usable for production breakdowns and analysis

## Character Sources

The character list populates autocomplete suggestions — as you type a character name in the editor, previously used names appear as ghost text suggestions.

## Use Cases

- Tracking character appearances
- Ensuring consistent character naming
- Production breakdowns by gender
- Dialogue distribution analysis
