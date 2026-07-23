# Frontend Hooks API

## `useKeyboardShortcuts`

**File:** `src/hooks/useKeyboardShortcuts.ts`

Registers global keyboard shortcuts for the application.

```typescript
interface ShortcutActions {
  newFile: () => void;
  openFile: () => void;
  saveFile: () => void;
  saveFileAs: () => void;
  closeFile: () => void;
  togglePalette: () => void;
  exportPDF: () => void;
  toggleSidebar: () => void;
  toggleZenMode: () => void;
  getEditorView: () => EditorView | null;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  interfaceScaleIn?: () => void;
  interfaceScaleOut?: () => void;
  resetInterfaceScale?: () => void;
  openSettings?: () => void;
  openHelp?: () => void;
  toggleSearch: () => void;
  toggleSnapshotsPanel?: () => void;
  isDisabled?: boolean;
}

function useKeyboardShortcuts(actions: ShortcutActions): void;
```

All shortcuts are listed in the keyboard shortcuts feature doc.

## `useNativeAppBehavior`

**File:** `src/hooks/useNativeAppBehavior.ts`

Handles native application behavior — window controls, drag regions, system event listeners, file drop handling.

```typescript
function useNativeAppBehavior(
  handleDropFiles: (paths: string[]) => void,
  setIsDraggingOver: (dragging: boolean) => void
): void;
```

## `useModals`

**File:** `src/hooks/useModals.ts`

Manages in-app React modals (Command Palette, Export modal, Structure Templates, Title Page Editor). These are rendered as MUI Dialog overlays within the same window, not as separate Tauri windows.

```typescript
function useModals(): ModalState & ModalActions & {
  isModalActive: boolean;
  togglePalette: () => void;
};

interface ModalState {
  isPaletteOpen: boolean;
  showExportModal: boolean;
  showStructureModal: boolean;
  showTitlePageModal: boolean;
}

interface ModalActions {
  setIsPaletteOpen: (v: boolean) => void;
  setShowExportModal: (v: boolean) => void;
  setShowStructureModal: (v: boolean) => void;
  setShowTitlePageModal: (v: boolean) => void;
}
```

## `useModalWindows`

**File:** `src/hooks/useModalWindows.ts`

Hook for standalone Tauri sub-windows (Settings, Help, Tag Manager, Theme Manager, X-Ray, Tutorials). Manages the lifecycle of windows loaded via `?modal=` parameter — handles window close events, focus tracking, and deduplication.

```typescript
function useModalWindows(): {
  openSettingsWindow: (tab?: string) => void;
  openHelpWindow: () => void;
  openTagManagerWindow: (maximize?: boolean) => void;
  openThemeManagerWindow: () => void;
  openXrayWindow: () => void;
  openTutorialsWindow: () => void;
  closeAllWindows: () => Promise<void>;
};
```

### `closeAllWindows`

Closes all open modal sub-windows (settings, help, tag-manager, theme-manager, xray, tutorials) by looking them up via `WebviewWindow.getByLabel()`. Called automatically by `App.tsx` during window close (X button / Alt+F4) and when the last editor tab is closed (just before destroying the editor window and opening the welcome screen).

### Sub-window Lifecycle

- **Deduplication**: Each window label is tracked in a `windowsRef` Map to prevent duplicate instances.
- **Close behavior**: Closing the main editor window triggers `closeAllWindows()` before destroying the main window. Closing the last editor tab reopens the welcome window and destroys the editor.
- **Resilience**: All Tauri API calls are wrapped in try/catch; the hook falls back gracefully in browser dev mode.

## AI Hooks (v0.4.0+)

### `useAIChat(filePath, activeFileId)`

Per-file AI chat sessions with streaming and @command support. Returns:

| Return | Type | Description |
|--------|------|-------------|
| `sessions` | `ChatSession[]` | All stored sessions for the current file |
| `activeSessionId` | `string \| null` | Currently active session ID |
| `turns` | `ChatTurn[]` | Messages in the active session |
| `streaming` | `boolean` | True while a response is being generated |
| `error` | `string \| null` | Last error message |
| `send(text, action?)` | `(text: string, action?: string) => void` | Send a message (optionally with @command action) |
| `stop()` | `() => void` | Abort the current streaming response |
| `newSession()` | `() => void` | Create a new empty session |
| `selectSession(id)` | `(id: string) => void` | Switch to a different session |
| `clear()` | `() => void` | Clear the active session |

### `usePromptConfig()`

Reactive AI configuration reader using `useSyncExternalStore`. Returns a `PromptConfig` object with all AI settings (provider, model, apiEndpoint, apiKey, apiModel, systemPrompt, temperature settings, Ollama URL, and @command instructions). Written via `setPromptConfigField(key, value)` and `notifyConfigChange()`.

### `notifyConfigChange()`

Manually triggers all `usePromptConfig` subscribers to re-read from localStorage. Used by SettingsWindow when modifying API list entries via `selectApi`, `addApi`, `removeApi`.

### `createAIProvider(config)`

Factory that returns an `AIProvider` instance based on config:
- `"openai-compatible"` → `OpenAICompatibleProvider(endpoint, apiKey, model)`
- `"ollama"` → `OllamaProvider(ollamaUrl, model)`
- `"none"` → `null`

### `fetchModels(provider)`

Fetches available model names from Ollama (`/api/tags`) with 3-second timeout. Returns `string[]`. Returns empty array for OpenAI-compatible (models are managed via the API list).

### `checkProviderAvailability()`

Pings the Ollama server to check if it's running. Returns `boolean`. Currently only checks Ollama. Returns false for other providers.
