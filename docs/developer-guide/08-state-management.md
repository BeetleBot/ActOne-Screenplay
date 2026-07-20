# State Management

ActOne uses **React Context** for all state management. Each domain has a dedicated context provider with its own state and actions.

## Context Tree

The 6 core providers are nested inside `AppProviders`:

```
UIProvider
  └── CustomModalProvider
        └── FileProvider
              └── SnapshotProvider
                    └── EditorProvider
                          └── ParkingProvider
```

Two additional providers wrap `AppInner` in `App.tsx`:

```
AppProviders
  └── ThemeProvider
        └── SprintProvider
              └── AppInner
```

## Context Details

### UIContext (`src/context/UIContext.tsx`)

Manages UI chrome state and editor preferences:

| State | Type | Description |
|-------|------|-------------|
| `fontFamily` | `'courier-prime' \| 'courier-prime-sans'` | Editor font |
| `paperSize` | `'letter' \| 'a4'` | Paper size for export |
| `isZenMode` | `boolean` | Full-screen distraction-free mode |
| `typewriterMode` | `boolean` | Cursor-centered scroll mode |
| `activeTab` | `string` | Current sidebar tab ID |
| `zoomLevel` | `number` | Editor zoom percentage (50-400, step 10) |
| `appScale` | `number` | UI scale percentage (50-300, step 5) |
| `autocompleteEnabled` | `boolean` | Ghost text suggestions |
| `smartQuotesEnabled` | `boolean` | Auto curly quotes |
| `matchParenthesesEnabled` | `boolean` | Auto-close brackets |
| `activeRightPane` | `string \| null` | Right pane type ('search' \| 'ambient' \| null) |
| `rightPaneWidth` | `number` | Right pane width in px (240-700) |
| `autoSaveEnabled` | `boolean` | Auto-save toggle |
| `autoSaveInterval` | `number` | Auto-save interval in ms (default 300000) |
| `hideSyntaxEnabled` | `boolean` | Hide Fountain markup characters |
| `hideTagsEnabled` | `boolean` | Hide production tag decorations |
| `lineFocusEnabled` | `boolean` | Focus on active line |
| `fountainColorsEnabled` | `boolean` | Toggle syntax coloring |
| `iconStyle` | `'fill' \| 'duotone' \| 'regular'` | Phosphor icon weight |
| `activeAmbientTrack` | `string \| null` | Currently playing ambient track |
| `ambientVolume` | `number` | Ambient volume (0-1) |

### FileContext (`src/context/FileContext.tsx`)

Manages multi-tab file operations and document state:

| State | Type | Description |
|-------|------|-------------|
| `files` | `ScreenplayFile[]` | All open files |
| `activeFileId` | `string` | Currently active file ID |
| `filePath` | `string \| null` | Current file's path |
| `rawText` | `string` | Current file's text |
| `parsedDoc` | `FountainDocument` | Parsed screenplay document |
| `isSaving` | `boolean` | Save in progress flag |
| `recentFiles` | `RecentFile[]` | Recent files list (max 10) |
| `scripts` | `ScriptInfo[]` | Multi-script bundle scripts |
| `activeScriptIndex` | `number` | Active script index |
| `isBundle` | `boolean` | Whether current file is .actone bundle |
| `scriptFileName` | `string` | Active script file name |
| `activeScriptName` | `string` | Active script display name |
| `saveStatus` | `'idle' \| 'saving' \| 'saved'` | Save operation status |

| Action | Description |
|--------|-------------|
| `newFile(initialContent?)` | Create new screenplay |
| `openFile()` | Open file via dialog |
| `saveFile()` | Save current file |
| `saveFileAs()` | Save with new name |
| `selectFile(id)` | Switch active file tab |
| `closeFile(id, force?)` | Close a specific file |
| `closeOthers(id)` | Close all except specified |
| `closeAll()` | Close all open files |
| `openFilePath(path)` | Open a file by direct path |
| `setRawText(text)` | Update document text |
| `updateSettings(updater)` | Update settings in parsed doc |

**`ScreenplayFile` structure:**
```typescript
interface ScreenplayFile {
  id: string;
  filePath: string | null;
  rawText: string;
  parsedDoc: FountainDocument;
  isSaving: boolean;
  isDirty: boolean;
  savedText: string;
  scripts?: ScriptInfo[];
  activeScriptIndex?: number;
}
```

### EditorContext (`src/context/EditorContext.tsx`)

Bridges CodeMirror state to React and provides text manipulation actions:

| State | Type | Description |
|-------|------|-------------|
| `activeLineId` | `string \| null` | Current active line identifier |
| `activeLineNumber` | `number` | Current line number (0-indexed, -1 if none) |
| `selectedSceneId` | `string \| null` | Current scene identifier |
| `editorView` | `EditorView \| null` | CM6 view instance |

| Action | Description |
|--------|-------------|
| `setEditorView(view)` | Register the CM6 view |
| `updateLineText(lineIndex, newText)` | Replace a single line's text |
| `updateSettings(updater)` | Update document settings |
| `reorderScenes(startIndex, endIndex)` | Drag-and-drop scene reorder |
| `scrollToLine(lineIndex, noFocus?)` | Scroll editor to a specific line |
| `autoAddSceneNumbers()` | Auto-number all scenes (#1#, #2#, ...) |
| `clearSceneNumbers()` | Remove all scene numbers |
| `setActiveLineId(id)` | Track active line |
| `setActiveLineNumber(num)` | Track active line number |
| `setSelectedSceneId(id)` | Track selected scene |

### ThemeContext (`src/context/ThemeContext.tsx`)

Manages theme state across all windows:

| State | Type | Description |
|-------|------|-------------|
| `theme` | `string` | Active theme ID |
| `mode` | `'light' \| 'dark'` | Current color mode |
| `customThemes` | `CustomTheme[]` | User-created themes |

| Action | Description |
|--------|-------------|
| `setTheme(id)` | Switch theme, persists to localStorage & Rust backend |
| `toggleMode()` | Toggle light/dark (handles adaptive theme families) |
| `addCustomTheme(name, isDark, colors)` | Create and save a custom theme (returns id) |
| `updateCustomTheme(id, name, isDark, colors)` | Update existing custom theme |
| `deleteCustomTheme(id)` | Remove a custom theme |

### CustomModalContext (`src/context/CustomModalContext.tsx`)

Provides a declarative modal dialog system:

| Function | Description |
|----------|-------------|
| `showConfirm(options)` | Show confirmation dialog (returns Promise\<string\>) |
| `showPrompt(options)` | Show text input dialog (returns Promise\<string \| null\>) |
| `showAlert(options)` | Show alert dialog |

### SnapshotContext (`src/context/SnapshotContext.tsx`)

Manages file snapshots via Rust backend:

| State | Type | Description |
|-------|------|-------------|
| `snapshots` | `SnapshotInfo[]` | Current file's snapshots |
| `snapshotEnabled` | `boolean` | Feature toggle |

| Action | Description |
|--------|-------------|
| `createSnapshot(comment?)` | Create a new snapshot |
| `deleteSnapshot(id)` | Delete a snapshot |
| `restoreSnapshot(snapshot)` | Restore from snapshot |
| `refreshSnapshots()` | Reload snapshot list |

### ParkingContext (`src/context/ParkingContext.tsx`)

Manages the "parking" feature — stashing text snippets:

| State | Type | Description |
|-------|------|-------------|
| `parkedItems` | `ParkedItem[]` | Parked text snippets |

| Action | Description |
|--------|-------------|
| `addItem(text)` | Add a new parked item |
| `removeItem(id)` | Remove a specific item |

### SprintContext (`src/context/SprintContext.tsx`)

Writing sprint tracker:

| State | Type | Description |
|-------|------|-------------|
| `activeSprints` | `Record<string, SprintSession>` | Active sprint per file |
| `history` | `SprintSession[]` | Past sprint sessions |

| Action | Description |
|--------|-------------|
| `startSprint(fileId, durationMinutes, goal?)` | Start a new sprint |
| `stopSprint(fileId)` | Stop and save sprint |
| `getHistory()` | Return sprint history |

## Data Persistence

| Data | Storage | Mechanism |
|------|---------|-----------|
| UI preferences | `localStorage` | Theme ID, scale, sidebar width, font, paper size, etc. |
| Recent files | `localStorage` | Recent files list |
| Custom themes | `localStorage` | `actone-custom-themes` key |
| App preferences | Rust backend | `actone-prefs.json` |
| Theme state | Rust backend | `actone-theme.json` |
| File content | File system | Via Tauri IPC commands |
| Bundle metadata | `.actone` ZIP | Inside bundle (characters, todos, etc.) |
| Per-script settings | Inside bundle | Keyed by script filename |
