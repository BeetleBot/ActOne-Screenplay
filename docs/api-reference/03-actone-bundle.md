# .actone Bundle Format

**Implementation:** `src/utils/actone.ts`

The `.actone` format is ActOne's native multi-document project bundle — a ZIP archive containing one or more Screenplay (`.fountain`) and Prose (`.md`) documents plus per-document metadata files, prefixed with a 4-byte magic header.

## File Structure

```
MyProject.actone
├── project.json                   # Document manifest (screenplays & prose)
├── files/                         # Document files directory
│   ├── Act One.fountain           # Screenplay document
│   ├── Act Two.fountain
│   └── Research Notes.md          # Prose document
├── settings.json                  # Workspace preferences & character profiles
├── characters.json                # Character list & gender assignments
├── todos.json                     # Per-document to-do checklists
├── parking.json                   # Per-document parked text snippets
├── notepad.json                   # Per-document scratchpad notes
├── sprint_data.json               # Writing sprint history & statistics
├── production_tags.json           # Per-document scene/production tags
├── marker.json                    # Line markers
└── muse.json                      # Muse AI prompt chat sessions

[4-byte magic header: "ACT1"]
```

## Format Details

### Magic Header

All `.actone` files start with 4 bytes: `0x41 0x43 0x54 0x31` (`ACT1`). This distinguishes them from generic ZIP files and prevents file-transfer apps from misidentifying them as plain ZIP archives.

**Legacy format** (pre-0.3.0): Magic was appended at the end of the file. `unpackActoneBundle` recognizes both start and end positions for full backward compatibility.

### `project.json` (Manifest)

```json
[
  { "name": "Act One", "file": "files/Act One.fountain", "type": "fountain" },
  { "name": "Act Two", "file": "files/Act Two.fountain", "type": "fountain" },
  { "name": "Research Notes", "file": "files/Research Notes.md", "type": "markdown" }
]
```

### Document Files (`files/`)

All screenplay and prose files reside under the `files/` folder inside the archive. When unpacking legacy bundles with flat root paths (e.g., `"57.fountain"`), ActOne normalizes them to `"files/57.fountain"` and transparently upgrades them upon save.

### Metadata Isolation & Migration

All document-specific metadata (`notepad`, `todos`, `parking`, `genders`, `characterProfiles`, and `productionTags`) is keyed by document file path:
- **On Document Rename**: All metadata keys are automatically migrated to the new file path via `migrateSettingsKey()`.
- **On Document Deletion**: Orphaned keys are cleaned up in memory via `removeSettingsKey()` and filtered on pack via `resolvePerScript()`.

### `characters.json`

```json
{
  "files/Act One.fountain": {
    "SHARANYA": "female",
    "VIKRAM": "male"
  }
}
```

### `todos.json`

```json
{
  "files/Act One.fountain": [
    { "id": "todo-1", "text": "Polish dialogue in scene 3", "completed": false, "createdAt": "2026-08-27T10:00:00.000Z" }
  ]
}
```

### `muse.json`

Muse AI chat sessions stored in the bundle:

```json
{
  "conversations": [],
  "activeConversationId": null
}
```

Legacy bundles containing `prompt.json` are automatically migrated on unpack.

---

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
  promptChats?: ActonePromptChats;
  isLegacy: boolean;
}
```

### `packActoneBundle` / `packActoneBundleAsync`

```typescript
function packActoneBundle(
  scripts: ScriptInfo[],
  settings: Record<string, any>
): Uint8Array;

function packActoneBundleAsync(
  scripts: ScriptInfo[],
  settings: Record<string, any>
): Promise<Uint8Array>;
```

**Input:** Scripts array + settings object.
**Output:** Raw bytes ready to write atomically as `.actone` file.

### `ScriptInfo`

```typescript
interface ScriptInfo {
  name: string;          // Display name (e.g., "Act One")
  fileName: string;      // Canonical path in ZIP (e.g., "files/Act One.fountain")
  content: string;       // Current text content
  savedContent: string;  // Last saved text content (for dirty tracking)
  type?: "fountain" | "markdown"; // Document type
}
```

---

## Legacy Compatibility & Auto-Upgrade

1. **Gen 1 (Pre-0.3.0)**: Trailing `ACT1` magic + single `document.fountain`. Unpacks and auto-upgrades to Gen 3.
2. **Gen 2 (0.3.0 - 0.4.0)**: `fountain.json` manifest with flat files. Unpacks and normalizes to `files/`.
3. **Gen 3 (Current)**: `project.json` manifest with multi-document (`.fountain` & `.md`) support in `files/`, atomic saves, and per-document metadata isolation.
