# Character Management

Character tracking lives in the **X-Ray Analysis** window (Status Bar bar-chart icon or Command Palette → "Open X-Ray Analysis…"), not as an inline Outline sub-tab.

## Character List (X-Ray → Characters mode)

The X-Ray window automatically detects all characters by scanning for all-uppercase character cue lines (excluding non-character words like `INT.`, `EXT.`, `CUT TO`, etc.) and shows a data-dense list sorted by frequency. Switch to the **Characters** mode at the top of the X-Ray window (transparent TitleBar, `28px` rounded window controls).

For each character:
- **Name** displayed in uppercase with dialogue line count and role
- **Gender indicator** pill (Male / Female / Non-binary / Unknown) — click a row to edit gender/role inline; persisted to `characters.json` in the `.actone` bundle
- Click to jump to the character's first line; the Dialogue-by-Gender chart in X-Ray's Statistics mode visualizes the distribution

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
