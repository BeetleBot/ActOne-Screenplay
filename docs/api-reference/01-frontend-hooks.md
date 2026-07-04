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

Manages modal window state — opening/closing settings, help, tag manager, theme manager, xray windows.

```typescript
function useModals(): {
    openSettings: () => void;
    openHelp: () => void;
    openTagManager: () => void;
    openThemeManager: () => void;
    openXray: () => void;
};
```

Each function opens a new Tauri `WebviewWindow` with the corresponding `?modal=` URL parameter.

## `useModalWindows`

**File:** `src/hooks/useModalWindows.ts`

Hook for standalone modal windows (Settings, Help, etc.). Manages the lifecycle of a window loaded via `?modal=` parameter — handles window close events, focus, and communication with the main window via Tauri events.
