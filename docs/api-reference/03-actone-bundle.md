# .actone Bundle Format

**Implementation:** `src/utils/actone.ts` (176 lines)

The `.actone` format is ActOne's native project bundle — a ZIP archive containing one or more Fountain scripts plus metadata files, with a 4-byte magic trailer.

## File Structure

```
MyScreenplay.actone
├── fountain.json                  # Script manifest (multi-script bundles)
├── Act One.fountain               # User-named scripts
├── Act Two.fountain
├── settings.json                  # App settings for this bundle
├── characters.json                # Character list with genders
├── todos.json                     # To-do items
├── parking.json                   # Parked text snippets
├── notepad.json                   # Notepad content
├── sprint_data.json               # Sprint history
├── production_tags.json           # Production tags/categories
└── marker.json                    # Line markers

[4-byte magic trailer: "ACT1"]
```

## Format Details

### Magic Trailer

All `.actone` files end with 4 bytes: `0x41 0x43 0x54 0x31` (`ACT1`). This distinguishes them from generic ZIP files.

### fountain.json (Manifest)

```json
[
    { "name": "Act One", "file": "Act One.fountain" },
    { "name": "Act Two", "file": "Act Two.fountain" }
]
```

**Legacy format** (before multi-script support): No `fountain.json`. A single `document.fountain` entry exists directly in the ZIP.

### settings.json

```json
{
    "Act One.fountain": {
        "paperSize": "Letter",
        "sceneNumbering": true
    }
}
```

Settings are keyed per script filename. When migrated from legacy format, settings are keyed by `"document.fountain"`.

### characters.json

```json
[
    { "name": "SHARANYA", "gender": "female" },
    { "name": "VIKRAM", "gender": "male" }
]
```

## API

### `unpackActoneBundle`

```typescript
function unpackActoneBundle(
    bytes: Uint8Array,
    bundleName?: string
): ActoneBundle;
```

**Input:** Raw bytes of a `.actone` file (ZIP + ACT1 trailer).

**Returns:**
```typescript
interface ActoneBundle {
    scripts: ScriptInfo[];
    settings: Record<string, any>;
}
```

**Logic:**
1. Strips trailing `ACT1` magic bytes
2. Inflates ZIP using `fflate`
3. Looks for `fountain.json`:
   - **Found:** Reads manifest, extracts each `.fountain` file
   - **Not found (legacy):** Extracts `document.fountain`, creates one `ScriptInfo` with name = bundle filename
4. Reads all metadata files (characters, todos, etc.)
5. Returns bundled data

### `packActoneBundle`

```typescript
function packActoneBundle(
    scripts: ScriptInfo[],
    settings: Record<string, any>
): Uint8Array;
```

**Input:** Scripts array + settings object.

**Output:** Raw bytes ready to write as `.actone` file.

**Logic:**
1. Creates `fountain.json` manifest from scripts
2. Deflates all files into ZIP using `fflate`
3. Appends `ACT1` magic trailer
4. Returns full bytes

### `ScriptInfo`

```typescript
interface ScriptInfo {
    name: string;          // Display name (e.g., "Act One")
    fileName: string;      // File name in ZIP (e.g., "Act One.fountain")
    content: string;       // Current text content
    savedContent: string;  // Last saved text content (for dirty tracking)
}
```

## Legacy Compatibility

When opening a legacy `.actone` (pre-multi-script):
- One `ScriptInfo` is created with `name` = bundle filename minus extension
- `fileName` = `"document.fountain"`
- On save, upgrades to the new format automatically

When saving:
- If only one script and it was a legacy format, maintains `document.fountain` name
- Otherwise creates `fountain.json` manifest
