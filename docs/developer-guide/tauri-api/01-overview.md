# Tauri API Overview

ActOne uses **Tauri v2** for desktop integration. The Rust backend exposes 30+ IPC commands accessible from the frontend via `@tauri-apps/api/core` `invoke()` function.

## Command Registration

All commands are registered in `src-tauri/src/lib.rs` via `tauri::generate_handler![]` macro:

```rust
.invoke_handler(tauri::generate_handler![
    open_file_dialog,
    save_file_dialog,
    save_file_content,
    read_file_content,
    // ... 30+ commands
])
```

## Calling Commands from Frontend

```typescript
import { invoke } from "@tauri-apps/api/core";

// Simple command
const content = await invoke<string>("read_file_content", { path: "/path/to/file" });

// Command with optional return
const result = await invoke<string | null>("save_file_dialog", { content: "fountain text" });
if (result) {
    console.log("Saved to:", result);
}
```

## Cross-Window Events

```typescript
import { emit, listen } from "@tauri-apps/api/event";

// Emit event
await emit("some-event", { payload: "data" });

// Listen for event
const unlisten = await listen<string>("some-event", (event) => {
    console.log("Received:", event.payload);
});
// Clean up listener
unlisten();
```

## Window Management

```typescript
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

const appWindow = getCurrentWebviewWindow();

// Window operations
await appWindow.close();
await appWindow.minimize();
await appWindow.maximize();
await appWindow.setFullscreen(true);
await appWindow.center();
await appWindow.setSize({ width: 800, height: 600 });

// Create new window
const modalWin = new WebviewWindow("settings", {
    url: "/?modal=settings",
    width: 900,
    height: 700,
    center: true,
    decorations: true,
    resizable: true,
});
```

### Sub-window Lifecycle

The app uses 5 sub-windows: `settings`, `help`, `tag-manager`, `theme-manager`, `xray`. They are created via `useModalWindows` hook as standalone Tauri `WebviewWindow` instances.

**Close behavior:**
- Closing the main editor window (X button / Alt+F4) closes all sub-windows first via `closeAllWindows()` before destroying the main window.
- Closing the last editor tab creates a new welcome window, closes all sub-windows, then destroys the editor window.
- Sub-windows are tracked in a `windowsRef` Map in `useModalWindows` to prevent duplicates.

## Capabilities & Permissions

Defined in `src-tauri/capabilities/default.json`. All application windows have:

```
core:default
opener:default
core:window:allow-*
core:webview:allow-*
```

This grants full window management and webview creation permissions.
