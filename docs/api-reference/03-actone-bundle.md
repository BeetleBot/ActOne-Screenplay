# .actone Bundle Format

**Implementation:** `src/utils/actone.ts` (176 lines)

The `.actone` format is ActOne's native project bundle — a ZIP archive containing one or more Fountain scripts plus metadata files, prefixed with a 4-byte magic header.

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
├── marker.json                    # Line markers
├── muse.json                      # Muse prompt chat sessions (v0.4.0+; legacy: prompt.json)

[4-byte magic header: "ACT1"]
```

## Format Details

### Magic Header

All `.actone` files start with 4 bytes: `0x41 0x43 0x54 0x31` (`ACT1`). This distinguishes them from generic ZIP files and prevents file-transfer apps (e.g., WhatsApp) from misidentifying them as plain ZIP archives.

**Legacy format** (pre-0.3.0): Magic was appended at the end of the file. `unpackActoneBundle` still recognizes both positions for backward compatibility.

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

### muse.json

Muse chat sessions stored in the bundle:

```json
{
    "conversations": [],
    "activeConversationId": null
}
```

- Legacy bundles may contain `prompt.json` instead; it is migrated on unpack.
- Note: the current Muse implementation keeps live chat sessions in `localStorage` (`actone_ai_chat::<path>`) and does not yet write them back into `muse.json`; the file is part of the bundle format and migration path only.

## API

### `unpackActoneBundle`

```typescript
function unpackActoneBundle(
    bytes: Uint8Array,
    bundleName?: string
): ActoneBundle;
```

**Input:** Raw bytes of a `.actone` file (ACT1 header + ZIP data).

**Returns:**
```typescript
interface ActoneBundle {
    scripts: ScriptInfo[];
    settings: Record<string, any>;
}
```

**Logic:**
1. Checks for `ACT1` magic at start (new format) or end (legacy); strips it
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
3. Prepends `ACT1` magic header
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

**Magic position:** Pre-0.3.0 files have the `ACT1` magic appended at the end. The unpacker checks both positions — start (new) first, then end (legacy), then treats the entire input as raw ZIP if no magic is found.

**Pre-multi-script bundles:**
- One `ScriptInfo` is created with `name` = bundle filename minus extension
- `fileName` = `"document.fountain"`
- On save, upgrades to the new format automatically

When saving:
- If only one script and it was a legacy format, maintains `document.fountain` name
- Otherwise creates `fountain.json` manifest

**production_tags.json Migration:**
- Legacy files stored tags in a flat `{ tags: [], definitions: [] }` structure or a hybrid structure.
- `unpackActoneBundle` automatically migrates this to a strictly script-keyed structure (`{ "scriptName.fountain": { tags: [], definitions: [] } }`) upon loading.
