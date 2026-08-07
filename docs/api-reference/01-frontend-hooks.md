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

Hook for standalone Tauri sub-windows (Settings, Help, Theme Manager, X-Ray, and Tutorials). Manages the lifecycle of windows loaded via `?modal=` parameter — handles window close events, focus tracking, and deduplication.

```typescript
function useModalWindows(): {
  openSettingsWindow: (tab?: string) => void;
  openHelpWindow: (articleId?: string) => void;
  openThemeManagerWindow: () => void;
  openXrayWindow: () => void;
  openTutorialsWindow: () => void;
  closeAllWindows: () => Promise<void>;
};
```

### `closeAllWindows`

Closes all open modal sub-windows (settings, help, theme-manager, xray, tutorials) by looking them up via `WebviewWindow.getByLabel()`. Called automatically by `App.tsx` during window close (X button / Alt+F4) and when the last editor tab is closed (just before destroying the editor window and opening the welcome screen).

### Sub-window Lifecycle

- **Deduplication**: Each window label is tracked in a `windowsRef` Map to prevent duplicate instances.
- **Close behavior**: Closing the main editor window triggers `closeAllWindows()` before destroying the main window. Closing the last editor tab reopens the welcome window and destroys the editor.
- **Resilience**: All Tauri API calls are wrapped in try/catch; the hook falls back gracefully in browser dev mode.

## AI Hooks (v0.4.0+)

### `useAIChat(getParsedDoc, filePath, activeFileId, ...)`

Manages a file-scoped Muse chat session, provider streaming, screenplay context, and the current JSON/text tool loop. The current composer does not implement `@` command autocomplete or command mode.

```typescript
function useAIChat(
  getParsedDoc: () => FountainDocument | null,
  filePath: string | null,
  activeFileId: string,
  activeLineNumber?: number,
  replaceSceneText?: (sceneNumber: number, newFountainText: string) => boolean,
  updateSettings?: (updater: (previous: Record<string, unknown>) => Record<string, unknown>) => void,
  openXrayWindow?: () => void,
  scriptFileName?: string,
): AIChatResult;
```

Returns:

| Return | Type | Description |
|--------|------|-------------|
| `sessions` | `ChatSession[]` | All stored sessions for the current file |
| `activeSessionId` | `string` | Currently active session ID |
| `activeSession` | `ChatSession \| undefined` | Active session object |
| `turns` | `ChatTurn[]` | Messages in the active session |
| `streaming` | `boolean` | True while a response is being generated |
| `error` | `string \| null` | Last error message |
| `send(text, display?)` | `(text: string, display?: string) => Promise<void>` | Send a message and stream the response |
| `stop()` | `() => void` | Abort the current streaming response |
| `newSession()` | `() => void` | Create a new empty session |
| `selectSession(id)` | `(id: string) => void` | Switch to a different session |
| `deleteSession(id)` | `(id: string) => void` | Delete a session |
| `clear()` | `() => void` | Clear the active session |
| `retry()` | `() => void` | Send the latest user turn again |

`ChatTurn` may contain `thinking` and `toolCalls`. A tool step includes its name, arguments, status, result, and optional pending scene-apply data.

The current tool loop can execute up to eight provider iterations. The advertised tools are declared in `src/lib/aiTools.ts` and include screenplay reads, scene drafting, scene tagging, project notes, character profiles, and X-Ray opening. `replace_scene` creates a pending review card; other mutating tools currently apply through the supplied callbacks.

### `usePromptConfig()`

Reactive AI configuration reader using `useSyncExternalStore`. Returns:

```typescript
interface PromptConfig {
  provider: "none" | "ollama" | "openai-compatible";
  model: string;
  systemPrompt: string;
  rephrasePresets: { name: string; prompt: string }[];
  chatTemp: number;
  rephraseTemp: number;
  translateLanguages: string[];
  translatePrompt: string;
  translateTemp: number;
  apiEndpoint: string;
  apiKey: string;
  apiModel: string;
  ollamaUrl: string;
}
```

Configuration is persisted in localStorage. Use `setPromptConfigField(key, value)` for supported fields and call `notifyConfigChange()` after direct storage updates. The hook does not currently expose or apply command-specific `@write-scene`, `@q`, `@lookup`, or `@synonyms` instructions.

### `notifyConfigChange()`

Manually triggers all `usePromptConfig` subscribers to re-read from localStorage. Settings uses it after API entry selection and API list changes. Direct updates to every provider field should also notify subscribers when the update is expected to be visible in another window.

### `createAIProvider(config)`

Factory that returns an `AIProvider` instance based on config:
- `"openai-compatible"` → `OpenAICompatibleProvider(endpoint, apiKey, model)`
- `"ollama"` → `OllamaProvider(ollamaUrl, model)`
- `"none"` → `null`

`OpenAICompatibleProvider.chat()` streams SSE data from the configured endpoint. `OllamaProvider.chat()` uses the Rust proxy and Tauri events in desktop mode and `/api/chat` in browser mode. Both accept an `AbortSignal`, temperature, and an `onChunk` callback.

### `fetchModels(provider)`

Fetches available model names from Ollama (`/api/tags`) with 3-second timeout. Returns `string[]`. Returns empty array for OpenAI-compatible (models are managed via the API list).

### `checkProviderAvailability()`

Pings the Ollama server to check if it's running. Returns `boolean`. Currently only checks Ollama. Returns false for other providers.
