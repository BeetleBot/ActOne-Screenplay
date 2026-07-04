# Frontend Contexts API

## FileContext

**File:** `src/context/FileContext.tsx`

```typescript
// Provider
<FileProvider>
    {children}
</FileProvider>

// Hook
const fileCtx = useFileContext();
```

### State

```typescript
interface FileContextValue {
    rawText: string;
    filePath: string | null;
    fileName: string;
    isDirty: boolean;
    scripts: ScriptInfo[];
    activeScriptIndex: number;
    recentFiles: RecentFile[];
}
```

### Actions

```typescript
newFile(): Promise<void>;
openFile(): Promise<void>;
saveFile(): Promise<void>;
saveFileAs(): Promise<void>;
closeFile(discard?: boolean): Promise<void>;

setActiveScript(index: number): void;
addScript(name?: string): void;
renameScript(index: number, newName: string): void;
deleteScript(index: number): void;

setRawText(text: string): void;
```

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
const editorCtx = useEditorContext();
```

### State

```typescript
interface EditorContextValue {
    editorView: EditorView | null;
    cursorOffset: number;
    selectedRange: { from: number; to: number };
    currentLine: number;
    currentSceneIndex: number;
}
```

### Actions

```typescript
setEditorView(view: EditorView | null): void;
setCursorOffset(offset: number): void;
setSelectedRange(range: { from: number; to: number }): void;
setCurrentLine(line: number): void;
setCurrentSceneIndex(index: number): void;
```

## UIContext

**File:** `src/context/UIContext.tsx`

```typescript
const uiCtx = useUIContext();
```

### State

```typescript
interface UIContextValue {
    activeTab: string;
    viewMode: 'editor' | 'planning';
    zenMode: boolean;
    zoomLevel: number;
    sidebarWidth: number;
    rightPaneOpen: boolean;
    rightPaneContent: string | null;
}
```

### Actions

```typescript
setActiveTab(tab: string): void;
setViewMode(mode: 'editor' | 'planning'): void;
setZenMode(enabled: boolean): void;
setZoomLevel(level: number): void;
setSidebarWidth(width: number): void;
setRightPaneOpen(open: boolean): void;
setRightPaneContent(content: string | null): void;
```

## ThemeContext

**File:** `src/context/ThemeContext.tsx`

```typescript
const themeCtx = useThemeContext();
```

### State

```typescript
interface ThemeContextValue {
    themeId: string;
    appScale: number;
    customThemes: CustomTheme[];
    fountainColorsEnabled: boolean;
    isDark: boolean;
    muiTheme: Theme;
    fountainColors: Record<string, string>;
}
```

### Actions

```typescript
setThemeId(id: string): Promise<void>;
setAppScale(scale: number): Promise<void>;
setCustomThemes(themes: CustomTheme[]): Promise<void>;
setFountainColorsEnabled(enabled: boolean): void;
```

## CustomModalContext

**File:** `src/context/CustomModalContext.tsx`

```typescript
const modalCtx = useCustomModalContext();
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
const snapshotCtx = useSnapshotContext();
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
const sprintCtx = useSprintContext();
```

### State

```typescript
interface SprintContextValue {
    isActive: boolean;
    goal: number;
    elapsed: number;
    wordCount: number;
    history: SprintSession[];
}
```

### Actions

```typescript
startSprint(): void;
pauseSprint(): void;
resumeSprint(): void;
stopSprint(): void;
setGoal(words: number): void;
```

## ParkingContext

**File:** `src/context/ParkingContext.tsx`

```typescript
const parkingCtx = useParkingContext();
```

### State

```typescript
interface ParkingContextValue {
    parkedItems: ParkedItem[];
}
```

### Actions

```typescript
parkText(text: string, sourceLine?: number): void;
unparkItem(id: string): void;
clearAll(): void;
```
