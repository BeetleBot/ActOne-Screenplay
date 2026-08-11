# Frontend Contexts API

## FileContext

**File:** `src/context/FileContext.tsx`

```typescript
// Provider
<FileProvider>
    {children}
</FileProvider>

// Hook
const fileCtx = useFile();
```

### State

```typescript
interface FileContextValue {
    files: ScreenplayFile[];
    activeFileId: string;
    filePath: string | null;
    rawText: string;
    parsedDoc: FountainDocument;
    isSaving: boolean;
    scripts: ScriptInfo[];
    activeScriptIndex: number;
    isBundle: boolean;
    scriptFileName: string;
    activeScriptName: string;
    saveStatus: 'idle' | 'saving' | 'saved';
    recentFiles: RecentFile[];
}

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

### Actions

```typescript
newFile(initialContent?: string): void;
openFile(): Promise<void>;
saveFile(): Promise<void>;
saveFileAs(): Promise<string | null>;
selectFile(id: string): void;
closeFile(id: string, force?: boolean): Promise<void>;
closeOthers(id: string): Promise<void>;
closeAll(): Promise<void>;
openFilePath(path: string): Promise<void>;
setRawText(text: string): void;
updateSettings(updater: SettingsUpdater): void;

setActiveScript(index: number): void;
addScript(name?: string): void;
renameScript(index: number, newName: string): void;
duplicateScript(index: number, name?: string): Promise<string | null>;
deleteScript(index: number): void;
```

`duplicateScript` copies the script at `index`, inserting the copy right after it and making it active. The copy is named `name` when provided (made unique with a ` (n)` suffix on collision); otherwise it falls back to the source name with a ` (n)` suffix.

### ScriptInfo

```typescript
interface ScriptInfo {
    name: string;
    fileName: string;
    content: string;
    savedContent: string;
}
```

### RecentFile

```typescript
interface RecentFile {
    path: string;
    name: string;
    timestamp: number;
}
```

## EditorContext

**File:** `src/context/EditorContext.tsx`

```typescript
const editorCtx = useEditor();
```

### State

```typescript
interface EditorContextValue {
    activeLineId: string | null;
    activeLineNumber: number;
    selectedSceneId: string | null;
    editorView: EditorView | null;
}
```

### Actions

```typescript
setEditorView(view: EditorView | null): void;
setActiveLineId(id: string | null): void;
setActiveLineNumber(num: number): void;
setSelectedSceneId(id: string | null): void;
updateLineText(lineIndex: number, newText: string): void;
updateSettings(updater: SettingsUpdater): void;
reorderScenes(startIndex: number, endIndex: number): void;
scrollToLine(lineIndex: number, noFocus?: boolean): void;
scrollToScene(direction: "next" | "prev"): void;
autoAddSceneNumbers(): void;
clearSceneNumbers(): void;
```

## CursorContext

**File:** `src/context/CursorContext.tsx`

```typescript
const cursorCtx = useCursor();
```

### State

```typescript
interface CursorContextValue {
    activeLineId: string | null;
    activeLineNumber: number;
    selectedSceneId: string | null;
}
```

### Actions

```typescript
setActiveLineId(id: string | null): void;
setActiveLineNumber(num: number): void;
setSelectedSceneId(id: string | null): void;
```

## UIContext

**File:** `src/context/UIContext.tsx`

```typescript
const uiCtx = useUI();
```

### State

```typescript
interface UIContextValue {
    fontFamily: 'courier-prime' | 'courier-prime-sans';
    paperSize: 'letter' | 'a4';
    isZenMode: boolean;
    typewriterMode: boolean;
    activeTab: string;
    zoomLevel: number;
    appScale: number;
    autocompleteEnabled: boolean;
    smartQuotesEnabled: boolean;
    matchParenthesesEnabled: boolean;
    activeRightPane: string | null;
    rightPaneWidth: number;
    autoSaveEnabled: boolean;
    autoSaveInterval: number;
    hideSyntaxEnabled: boolean;
    hideTagsEnabled: boolean;
    lineFocusEnabled: boolean;
    fountainColorsEnabled: boolean;
    iconStyle: 'fill' | 'duotone' | 'regular';
    activeAmbientTrack: string | null;
    ambientVolume: number;
    aiStatus: string | null;
    translationState: 'idle' | 'running' | 'paused' | 'cancelled';
}
```

### Actions

```typescript
setFontFamily(font: 'courier-prime' | 'courier-prime-sans'): void;
setPaperSize(size: 'letter' | 'a4'): void;
setIsZenMode(enabled: boolean): void;
setTypewriterMode(enabled: boolean): void;
setActiveTab(tab: string): void;
setZoomLevel(level: number): void;
setAppScale(scale: number): void;
setAutocompleteEnabled(enabled: boolean): void;
setSmartQuotesEnabled(enabled: boolean): void;
setMatchParenthesesEnabled(enabled: boolean): void;
setActiveRightPane(pane: string | null): void;
setRightPaneWidth(w: number): void;
setAutoSaveEnabled(enabled: boolean): void;
setAutoSaveInterval(interval: number): void;
setHideSyntaxEnabled(enabled: boolean): void;
setHideTagsEnabled(enabled: boolean): void;
setLineFocusEnabled(enabled: boolean): void;
setFountainColorsEnabled(enabled: boolean): void;
setIconStyle(style: 'fill' | 'duotone' | 'regular'): void;
playAmbientTrack(track: string): void;
stopAmbientTrack(): void;
setAmbientVolume(vol: number): void;
setAiStatus(status: string | null): void;
setTranslationState(state: 'idle' | 'running' | 'paused' | 'cancelled'): void;
registerTranslationAbort(controller: AbortController | null): void;
cancelTranslation(): void;
```

## ThemeContext

**File:** `src/context/ThemeContext.tsx`

```typescript
const themeCtx = useTheme();
```

### State

```typescript
interface ThemeContextValue {
    theme: string;
    mode: 'light' | 'dark';
    customThemes: CustomTheme[];
}
```

### Actions

```typescript
setTheme(id: string): void;
toggleMode(): void;
addCustomTheme(name: string, isDark: boolean, colors: ThemeColors): string;
updateCustomTheme(id: string, name: string, isDark: boolean, colors: ThemeColors): void;
deleteCustomTheme(id: string): void;
```

## CustomModalContext

**File:** `src/context/CustomModalContext.tsx`

```typescript
const modalCtx = useCustomModal();
```

### Actions

```typescript
showConfirm(options: ConfirmOptions): Promise<boolean>;
showPrompt(options: PromptOptions): Promise<string | null>;
showAlert(options: AlertOptions): Promise<void>;
```

### Options

```typescript
interface ConfirmOptions { title: string; message: string; confirmLabel?: string; cancelLabel?: string; }
interface PromptOptions { title: string; message: string; placeholder?: string; defaultValue?: string; }
interface AlertOptions { title: string; message: string; }
```

## SnapshotContext

**File:** `src/context/SnapshotContext.tsx`

```typescript
const snapshotCtx = useSnapshots();
```

### State

```typescript
interface SnapshotContextValue {
    snapshots: SnapshotInfo[];
    snapshotEnabled: boolean;
}
```

### Actions

```typescript
createSnapshot(comment?: string): Promise<void>;
deleteSnapshot(id: string): Promise<void>;
restoreSnapshot(snapshot: SnapshotInfo): Promise<void>;
refreshSnapshots(): Promise<void>;
```

## SprintContext

**File:** `src/context/SprintContext.tsx`

```typescript
const sprintCtx = useSprint();
```

### State

```typescript
interface SprintContextValue {
    activeSprints: Record<string, SprintSession>;
    history: SprintSession[];
}
```

### Actions

```typescript
startSprint(fileId: string, durationMinutes: number, goal?: number): void;
stopSprint(fileId: string): void;
getHistory(): SprintSession[];
```

## ParkingContext

**File:** `src/context/ParkingContext.tsx`

```typescript
const parkingCtx = useParking();
```

### State

```typescript
interface ParkingContextValue {
    parkedItems: ParkedItem[];
}
```

### Actions

```typescript
addItem(text: string): void;
removeItem(id: string): void;
```
