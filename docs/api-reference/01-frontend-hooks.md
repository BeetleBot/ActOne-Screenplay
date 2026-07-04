# Frontend Hooks API

## `useKeyboardShortcuts`

**File:** `src/hooks/useKeyboardShortcuts.ts`

Registers global keyboard shortcuts for the application.

```typescript
function useKeyboardShortcuts(): void;
```

All shortcuts are listed in the keyboard shortcuts feature doc.

## `useNativeAppBehavior`

**File:** `src/hooks/useNativeAppBehavior.ts`

Handles native application behavior — window controls, drag regions, system event listeners.

```typescript
function useNativeAppBehavior(): void;
```

## `useModals`

**File:** `src/hooks/useModals.ts`

Manages in-app React modals (Command Palette, Export modal, Structure Templates, etc.). These are rendered as MUI Dialog overlays within the same window, not as separate Tauri windows.

```typescript
function useModals(): {
    isPaletteOpen: boolean;
    showExportModal: boolean;
    showStructureModal: boolean;
    togglePalette: () => void;
    openExportModal: () => void;
    closeExportModal: () => void;
    openStructureModal: () => void;
    closeStructureModal: () => void;
};
```

## `useModalWindows`

**File:** `src/hooks/useModalWindows.ts`

Hook for standalone modal windows (Settings, Help, etc.). Manages the lifecycle of a window loaded via `?modal=` parameter — handles window close events, focus, and communication with the main window via Tauri events.

```typescript
function useModalWindows(): {
    openSettingsWindow: (tab?: string) => void;
    openHelpWindow: () => void;
    openTagManagerWindow: () => void;
    openThemeManagerWindow: () => void;
    openXrayWindow: () => void;
    closeAllWindows: () => Promise<void>;
};
```

### `closeAllWindows`

Closes all open modal sub-windows (settings, help, tag-manager, theme-manager, xray) by looking them up via `WebviewWindow.getByLabel()`. Called automatically by `App.tsx` during window close (X button / Alt+F4) and when the last editor tab is closed (just before destroying the editor window and opening the welcome screen).
