# Frontend Architecture

## Entry Point

**`src/main.tsx`** renders the appropriate root component based on URL query parameters:

| Param | Component |
|-------|-----------|
| _(none)_ | `<App />` |
| `?modal=settings` | `<SettingsWindow />` |
| `?modal=help` | `<HelpWindow />` |
| `?modal=tag-manager` | `<TagManagerWindow />` |
| `?modal=theme-manager` | `<ThemeManagerWindow />` |
| `?modal=xray` | `<XrayWindow />` |
| `?modal=tutorials` | `<TutorialsWindow />` |

Global error handlers (`window.onerror`, `unhandledrejection`) are wired at startup. All windows share the same `index.css`.

## Component Tree (Editor Window)

```
App
  AppProviders (6 contexts nested)
    ThemeProvider
      SprintProvider
        AppInner
          ErrorBoundary
            MainLayout
              HeaderBar (file tabs, window controls, update notification)
              ActivityBar (8 sidebar icons, command palette, quick settings menu)
              Workspace
                SidebarViews (routes 8 sidebar panels)
                FountainEditor (CodeMirror 6 container)
                SearchPanel / AmbientPanel (optional right panes)
              StatusBar (word/char/page count, sprint, scene info, script switcher, xray, ambient)
            ModalManager
              CommandPalette
              ExportModal
              StructureImportModal
              TitlePageEditorModal
            OnboardingTour (active tour overlay)
```

## State Management

ActOne uses **React Context** for all state management. There are 6 context providers in `AppProviders` plus 2 more in the App root:

### AppProviders (nested in order)

| Context | File | Purpose |
|---------|------|---------|
| `UIProvider` | `UIContext.tsx` | View mode, zoom level, zen mode, font/paper/editor prefs, ambient audio, icon style |
| `CustomModalProvider` | `CustomModalContext.tsx` | `confirm()`-style modal dialogs |
| `FileProvider` | `FileContext.tsx` | Multi-tab file open/save/close, CRLF normalization, script management |
| `SnapshotProvider` | `SnapshotContext.tsx` | Snapshot creation, listing, restoration |
| `EditorProvider` | `EditorContext.tsx` | CodeMirror editor state (view, line tracking, scene reordering) |
| `ParkingProvider` | `ParkingContext.tsx` | Parking feature — stashing snippets |

### Wrapped outside AppProviders (in App.tsx)

| Context | File | Purpose |
|---------|------|---------|
| `ThemeProvider` | `ThemeContext.tsx` | Theme selection, mode toggling, custom theme CRUD |
| `SprintProvider` | `SprintContext.tsx` | Sprint tracking — timed writing sessions |

**Nesting order** (in `App.tsx`):
```
AppProviders
  └── ThemeProvider
        └── SprintProvider
              └── AppInner
```

## Key Components

### Layout Shell

| Component | File | Purpose |
|-----------|------|---------|
| `MainLayout` | `layout/MainLayout.tsx` | Grid layout combining HeaderBar, ActivityBar, Workspace, StatusBar |
| `HeaderBar` | `layout/HeaderBar.tsx` | Multi-file tabs, window controls, themed context menu (close/close others/close all), update banner |
| `ActivityBar` | `layout/ActivityBar.tsx` | Command palette button, 8 sidebar icon tabs, quick settings menu with theme picker |
| `StatusBar` | `layout/StatusBar.tsx` | Word/char/page count, sprint tracker, scene location, script switcher, save status, xray button, ambient indicator |
| `Workspace` | `layout/Workspace.tsx` | Routes sidebar panels and editor, manages right pane (search/ambient) |

### Sidebar Panels (8 tabs)

| Tab ID | Component | Purpose |
|--------|-----------|---------|
| `outline` | `OutlineView.tsx` | Scene/section tree with drag-reorder, colors, numbers |
| `scripts` | `ScriptsView.tsx` | Multi-script bundle management |
| `notepad` | Inline in `SidebarViews.tsx` | Document-wide scratchpad for notes |
| `markers` | `MarkerView.tsx` | Line markers list |
| `todo` | `TodoView.tsx` | To-do items |
| `snapshots` | `SnapshotsPanel.tsx` | File snapshots/versions |
| `sprint` | `SprintView.tsx` | Writing sprint tracker |
| `parking` | Inline in `SidebarViews.tsx` | Parked text snippets |

### Editor

| Component | File | Purpose |
|-----------|------|---------|
| `FountainEditor` | `FountainEditor.tsx` | Editor shell — themed context menus, drag-drop, right-click actions, tag/format/transform menus |
| `ContextMenu` | `ContextMenu.tsx` | Compact themed context-menu portal with hover/focus selection, submenus, viewport clamping, and keyboard navigation |
| `OutlineView` | `OutlineView.tsx` | Scene/section outline tree with drag-reorder, colors, numbers |
| `SearchPanel` | `SearchPanel.tsx` | Find/replace panel (Ctrl+F) |
| `AmbientPanel` | `AmbientPanel.tsx` | Ambient sound selection panel |

### Modals

| Component | File | Purpose |
|-----------|------|---------|
| `ExportModal` | `ExportModal.tsx` | PDF/FDX/FadeIn/CSV/Fountain export with watermark settings |
| `CommandPalette` | `CommandPalette.tsx` | Fuzzy-search command palette (Ctrl+K) |
| `StructureImportModal` | `StructureImportModal.tsx` | Import story structure templates |
| `TitlePageEditorModal` | `TitlePageEditorModal.tsx` | Edit title page fields |
| `ModalManager` | `ModalManager.tsx` | Coordinates modal rendering |

### Separate Windows (rendered standalone via `?modal=`)

| Window | File | Purpose |
|--------|------|---------|
| `SettingsWindow` | `SettingsWindow.tsx` | All app settings |
| `HelpWindow` | `HelpWindow.tsx` | 47 help articles in 8 categories |
| `XrayWindow` | `XrayWindow.tsx` | Screenplay analysis dashboard |
| `TutorialsWindow` | `TutorialsWindow.tsx` | Interactive tutorial launcher |
| `TagManagerWindow` | `TagManagerWindow.tsx` | Scene tag CRUD |
| `ThemeManagerWindow` | `ThemeManagerWindow.tsx` | Custom theme editor |

## Audio System

ActOne uses an asset-based audio engine for ambient sounds:
- **MP3 Assets**: Replaced the legacy procedural generation engine (Tone.js) with high-quality bundled MP3 assets for better performance and reliability.
- **Offline Capable**: All sound assets are bundled natively within the app (`~10MB`), ensuring full offline functionality without external network requests.

## Find & Replace Optimization

To ensure a smooth user experience on low-spec computers when searching massive screenplay scripts, several key optimizations were introduced to `SearchPanel.tsx`:
- **Single-Pass Scene Context Tracking**: Rather than performing a nested backward-scan for every match to identify its parent scene heading (which is $O(M \times N)$ complexity), we maintain a forward-moving `headingCursor`. Since CodeMirror returns search matches sequentially in document order, we advance this cursor along with the matches, dropping the search complexity to $O(M + N)$.
- **Incremental DOM Rendering (Infinite Scroll)**: Rendering thousands of DOM nodes simultaneously freezes weaker systems. We implemented a lightweight Infinite Scroll mechanism inside the standard MUI `<List>` wrapper using React `useCallback` refs and an `IntersectionObserver`. It renders 50 items initially and loads 50 more as the user scrolls to the bottom or keyboard-navigates past the visible threshold, keeping memory usage low and rendering instant.

## Icon System (Phosphor Icons)

ActOne uses `@phosphor-icons/react` for all system icons, replacing the legacy hardcoded SVG path definitions.
- **Factory Wrapper (`createPhosphorIcon`)**: Defined in `src/components/Icons.tsx`. It bridges Phosphor icon components into Material UI's `SvgIcon` so they fully support MUI's `sx` styling prop (for dynamic sizing, theme-dependent colors, margins, etc.).
- **Dynamic Styling**: The wrapper queries `UIContext` (specifically the `iconStyle` state) to dynamically control the rendering style. The application supports three modes: `duotone` (Dual Tone), `fill` (Solid), and `regular` (Stroke).
- **Standalone Mode Resilience**: Since secondary windows (like `SettingsWindow`, `HelpWindow`, etc.) run in separate processes without a root React Context, calling `useUI()` directly would crash the DOM render. To prevent this, the wrapper catches context lookup errors and falls back to reading the icon weight directly from `localStorage`, ensuring robust standalone window rendering.

## Multi-Tab File Management

FileContext supports multiple open files simultaneously, each tracked by a unique `id`:
- Files are displayed as tabs in the `HeaderBar`
- Right-click tab context menu: Close, Close Others, Close All
- Middle-click to close a tab
- Tabs show a dirty indicator (small filled circle) when unsaved changes exist
- The `StatusBar` shows the active file name and save status ("Saving..."/"Saved")
- On close of the last editor tab: automatically reopens the welcome window
- On window close with dirty files: prompts Save & Exit / Close Anyway / Cancel

## Clipboards & Selection Core Fixes

To achieve a seamless native app writing experience, several core adjustments were made to CodeMirror event interceptors and layout coordinates. These fixes are documented in `05-editor.md`.
