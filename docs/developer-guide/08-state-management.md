# State Management

ActOne uses **React Context** for all state management. Each domain has a dedicated context provider with its own state and actions.

## Context Tree

```
UIProvider
  └── CustomModalProvider
        └── FileProvider
              └── SnapshotProvider
                    └── EditorProvider
                          └── ParkingProvider
```

## Context Details

### UIContext (`src/context/UIContext.tsx`)

Manages UI chrome state:

| State | Type | Description |
|-------|------|-------------|
| `activeTab` | `string` | Current sidebar tab ID |
| `viewMode` | `'editor' \| 'planning'` | Current view |
| `zenMode` | `boolean` | Full-screen editor mode |
| `zoomLevel` | `number` | Editor zoom percentage |
| `sidebarWidth` | `number` | Sidebar width in pixels |
| `rightPaneOpen` | `boolean` | Right pane visibility |

### FileContext (`src/context/FileContext.tsx`)

Manages file operations and document state:

| State | Type | Description |
|-------|------|-------------|
| `rawText` | `string` | Current document text |
| `filePath` | `string \| null` | Current file path |
| `isDirty` | `boolean` | Unsaved changes flag |
| `scripts` | `ScriptInfo[]` | Multi-script bundle scripts |
| `activeScriptIndex` | `number` | Active script index |
| `recentFiles` | `RecentFile[]` | Recent files list |

| Action | Description |
|--------|-------------|
| `newFile()` | Create new screenplay |
| `openFile()` | Open file via dialog |
| `saveFile()` | Save current file |
| `saveFileAs()` | Save with new name |
| `setActiveScript(idx)` | Switch active script |
| `addScript(name?)` | Add script to bundle |
| `renameScript(idx, name)` | Rename script |
| `deleteScript(idx)` | Remove script |
| `closeFile()` | Close current file |

### EditorContext (`src/context/EditorContext.tsx`)

Bridges CodeMirror state to React:

| State | Type | Description |
|-------|------|-------------|
| `editorView` | `EditorView \| null` | CM6 view instance |
| `cursorOffset` | `number` | Current cursor position |
| `selectedRange` | `{from, to}` | Current selection |
| `currentLine` | `number` | Current line number |
| `currentSceneIndex` | `number` | Current scene index |

### ThemeContext (`src/context/ThemeContext.tsx`)

Manages theme state across all windows:

| State | Type | Description |
|-------|------|-------------|
| `themeId` | `string` | Active theme ID |
| `appScale` | `number` | UI scale percentage |
| `customThemes` | `CustomTheme[]` | User-created themes |
| `fountainColorsEnabled` | `boolean` | Syntax color toggle |

Theme changes are persisted via the `set_theme_state` Rust command and broadcast to all windows via `theme:state-changed` events.

### CustomModalContext (`src/context/CustomModalContext.tsx`)

Provides a declarative modal system:

| Function | Description |
|----------|-------------|
| `showConfirm(options)` | Show confirmation dialog (returns Promise) |
| `showPrompt(options)` | Show text input dialog (returns Promise) |
| `showAlert(options)` | Show alert dialog |

### SnapshotContext (`src/context/SnapshotContext.tsx`)

Manages file snapshots via Rust backend:

| State | Type | Description |
|-------|------|-------------|
| `snapshots` | `SnapshotInfo[]` | Current file's snapshots |
| `snapshotEnabled` | `boolean` | Feature toggle |

### ParkingContext (`src/context/ParkingContext.tsx`)

Manages the "parking" feature — stashing text snippets:

| State | Type | Description |
|-------|------|-------------|
| `parkedItems` | `ParkedItem[]` | Parked text snippets |

### SprintContext (`src/context/SprintContext.tsx`)

Writing sprint tracker:

| State | Type | Description |
|-------|------|-------------|
| `isActive` | `boolean` | Sprint in progress |
| `goal` | `number` | Word count goal |
| `elapsed` | `number` | Elapsed seconds |
| `wordCount` | `number` | Words written this sprint |
| `history` | `SprintSession[]` | Past sprint sessions |

## Data Persistence

| Data | Storage | Mechanism |
|------|---------|-----------|
| UI preferences | `localStorage` | Theme ID, scale, sidebar width |
| Recent files | `localStorage` | Recent files list |
| Custom themes | Rust backend | `actone-theme.json` |
| App preferences | Rust backend | `actone-prefs.json` |
| File content | File system | Via Tauri IPC commands |
| Bundle metadata | `.actone` ZIP | Inside bundle (characters, todos, etc.) |
| Per-script settings | Inside bundle | Keyed by script filename |
