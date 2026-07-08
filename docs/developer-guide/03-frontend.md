# Frontend Architecture

## Entry Point

**`src/main.tsx`** renders `<App />` inside a `BrowserRouter`. If the URL contains a `?modal=` query parameter, it renders a standalone modal window component instead:

| Param | Component |
|-------|-----------|
| _(none)_ | `<App />` |
| `?modal=settings` | `<SettingsWindow />` |
| `?modal=help` | `<HelpWindow />` |
| `?modal=tag-manager` | `<TagManagerWindow />` |
| `?modal=theme-manager` | `<ThemeManagerWindow />` |
| `?modal=xray` | `<XrayWindow />` |

Global error handlers (`window.onerror`, `unhandledrejection`) are wired at startup.

## Component Tree

```
App
  AppProviders (8 contexts nested)
    AppInner
      ErrorBoundary
        MainLayout
          HeaderBar (tabs, window controls, title)
          ActivityBar (sidebar icons, zoom slider, settings gear)
          Workspace
            SidebarViews (routes to 8 sidebar panels)
            FountainEditor (CodeMirror 6 container)
            SearchPanel / RightPane (optional)
          StatusBar (word/char/page count, sprint, scene info, script switcher)
        ModalManager
          CommandPalette
          ExportModal
          StructureImportModal
          TitlePageEditorModal
```

## State Management

ActOne uses **React Context** (not Zustand — the earlier analysis was incorrect). There are 8 context providers:

| Context | File | Purpose |
|---------|------|---------|
| `UIProvider` | `UIContext.tsx` | View mode, zoom level, zen mode, sidebar state |
| `CustomModalProvider` | `CustomModalContext.tsx` | `confirm()`-style modal dialogs |
| `FileProvider` | `FileContext.tsx` | File open/save/close, CRLF normalization, script management |
| `SnapshotProvider` | `SnapshotContext.tsx` | Snapshot creation, listing, restoration |
| `EditorProvider` | `EditorContext.tsx` | CodeMirror editor state (view, text, selection) |
| `ParkingProvider` | `ParkingContext.tsx` | Parking feature — stashing snippets |
| `ThemeProvider` | `ThemeContext.tsx` | Theme state and synchronization across windows |
| `SprintProvider` | `SprintContext.tsx` | Sprint tracking — word count goals |

**Nesting order** (in `AppProviders.tsx`):
```
UIProvider
  CustomModalProvider
    FileProvider
      SnapshotProvider
        EditorProvider
          ParkingProvider
```

## Key Components

### Layout Shell

| Component | File | Purpose |
|-----------|------|---------|
| `MainLayout` | `layout/MainLayout.tsx` | Grid layout combining HeaderBar, ActivityBar, Workspace, StatusBar |
| `HeaderBar` | `layout/HeaderBar.tsx` | File tabs, window controls, multi-window actions |
| `ActivityBar` | `layout/ActivityBar.tsx` | Sidebar icon tabs (Outline, Scripts, Characters, Statistics, Notepad, Markers, Tasks, Sprint, Parking) + zoom slider + settings |
| `StatusBar` | `layout/StatusBar.tsx` | Word/char/page count, sprint tracker, scene location, script switcher |
| `Workspace` | `layout/Workspace.tsx` | Routes sidebar panels and editor |
| `SidebarViews` | `SidebarViews.tsx` | Routes active sidebar tab to correct panel |

### Editor

| Component | File | Purpose |
|-----------|------|---------|
| `FountainEditor` | `FountainEditor.tsx` | Editor shell — context menus, drag-drop, right-click actions |
| `OutlineView` | `OutlineView.tsx` | Scene/section outline tree with drag-reorder, colors, numbers |
| `SearchPanel` | `SearchPanel.tsx` | Find/replace panel (Ctrl+F) |

### Modals

| Component | File | Purpose |
|-----------|------|---------|
| `ExportModal` | `ExportModal.tsx` | PDF/FDX/FadeIn/CSV/Fountain export with watermark settings |
| `CommandPalette` | `CommandPalette.tsx` | Fuzzy-search command palette (Ctrl+K) |
| `StructureImportModal` | `StructureImportModal.tsx` | Import story structure templates |
| `TitlePageEditorModal` | `TitlePageEditorModal.tsx` | Edit title page fields |
| `ModalManager` | `ModalManager.tsx` | Coordinates modal rendering |

### Feature Panels (Sidebar tabs)

| Panel | File | Purpose |
|-------|------|---------|
| `OutlineView` | `OutlineView.tsx` | Scene/section tree |
| `ScriptsView` | `ScriptsView.tsx` | Multi-script bundle management |
| `TodoView` | `TodoView.tsx` | To-do items |
| `MarkerView` | `MarkerView.tsx` | Line markers |
| `SprintView` | `SprintView.tsx` | Writing sprint tracker |
| `SnapshotsPanel` | `SnapshotsPanel.tsx` | File snapshots/versions |
| `TagManagerWindow` | `TagManagerWindow.tsx` | Scene tag CRUD |
| `ThemeManagerWindow` | `ThemeManagerWindow.tsx` | Custom theme editor |

### Separate Windows (rendered standalone via `?modal=`)

# Frontend Architecture

## Entry Point

**`src/main.tsx`** renders `<App />` inside a `BrowserRouter`. If the URL contains a `?modal=` query parameter, it renders a standalone modal window component instead:

| Param | Component |
|-------|-----------|
| _(none)_ | `<App />` |
| `?modal=settings` | `<SettingsWindow />` |
| `?modal=help` | `<HelpWindow />` |
| `?modal=tag-manager` | `<TagManagerWindow />` |
| `?modal=theme-manager` | `<ThemeManagerWindow />` |
| `?modal=xray` | `<XrayWindow />` |

Global error handlers (`window.onerror`, `unhandledrejection`) are wired at startup.

## Component Tree

```
App
  AppProviders (8 contexts nested)
    AppInner
      ErrorBoundary
        MainLayout
          HeaderBar (tabs, window controls, title)
          ActivityBar (sidebar icons, zoom slider, settings gear)
          Workspace
            SidebarViews (routes to 8 sidebar panels)
            FountainEditor (CodeMirror 6 container)
            SearchPanel / RightPane (optional)
          StatusBar (word/char/page count, sprint, scene info, script switcher)
        ModalManager
          CommandPalette
          ExportModal
          StructureImportModal
          TitlePageEditorModal
```

## State Management

ActOne uses **React Context** (not Zustand — the earlier analysis was incorrect). There are 8 context providers:

| Context | File | Purpose |
|---------|------|---------|
| `UIProvider` | `UIContext.tsx` | View mode, zoom level, zen mode, sidebar state |
| `CustomModalProvider` | `CustomModalContext.tsx` | `confirm()`-style modal dialogs |
| `FileProvider` | `FileContext.tsx` | File open/save/close, CRLF normalization, script management |
| `SnapshotProvider` | `SnapshotContext.tsx` | Snapshot creation, listing, restoration |
| `EditorProvider` | `EditorContext.tsx` | CodeMirror editor state (view, text, selection) |
| `ParkingProvider` | `ParkingContext.tsx` | Parking feature — stashing snippets |
| `ThemeProvider` | `ThemeContext.tsx` | Theme state and synchronization across windows |
| `SprintProvider` | `SprintContext.tsx` | Sprint tracking — word count goals |

**Nesting order** (in `AppProviders.tsx`):
```
UIProvider
  CustomModalProvider
    FileProvider
      SnapshotProvider
        EditorProvider
          ParkingProvider
```

## Key Components

### Layout Shell

| Component | File | Purpose |
|-----------|------|---------|
| `MainLayout` | `layout/MainLayout.tsx` | Grid layout combining HeaderBar, ActivityBar, Workspace, StatusBar |
| `HeaderBar` | `layout/HeaderBar.tsx` | File tabs, window controls, multi-window actions |
| `ActivityBar` | `layout/ActivityBar.tsx` | Sidebar icon tabs (Outline, Scripts, Characters, Statistics, Notepad, Markers, Tasks, Sprint, Parking) + zoom slider + settings |
| `StatusBar` | `layout/StatusBar.tsx` | Word/char/page count, sprint tracker, scene location, script switcher |
| `Workspace` | `layout/Workspace.tsx` | Routes sidebar panels and editor |
| `SidebarViews` | `SidebarViews.tsx` | Routes active sidebar tab to correct panel |

### Editor

| Component | File | Purpose |
|-----------|------|---------|
| `FountainEditor` | `FountainEditor.tsx` | Editor shell — context menus, drag-drop, right-click actions |
| `OutlineView` | `OutlineView.tsx` | Scene/section outline tree with drag-reorder, colors, numbers |
| `SearchPanel` | `SearchPanel.tsx` | Find/replace panel (Ctrl+F) |

### Modals

| Component | File | Purpose |
|-----------|------|---------|
| `ExportModal` | `ExportModal.tsx` | PDF/FDX/FadeIn/CSV/Fountain export with watermark settings |
| `CommandPalette` | `CommandPalette.tsx` | Fuzzy-search command palette (Ctrl+K) |
| `StructureImportModal` | `StructureImportModal.tsx` | Import story structure templates |
| `TitlePageEditorModal` | `TitlePageEditorModal.tsx` | Edit title page fields |
| `ModalManager` | `ModalManager.tsx` | Coordinates modal rendering |

### Feature Panels (Sidebar tabs)

| Panel | File | Purpose |
|-------|------|---------|
| `OutlineView` | `OutlineView.tsx` | Scene/section tree |
| `ScriptsView` | `ScriptsView.tsx` | Multi-script bundle management |
| `TodoView` | `TodoView.tsx` | To-do items |
| `MarkerView` | `MarkerView.tsx` | Line markers |
| `SprintView` | `SprintView.tsx` | Writing sprint tracker |
| `SnapshotsPanel` | `SnapshotsPanel.tsx` | File snapshots/versions |
| `TagManagerWindow` | `TagManagerWindow.tsx` | Scene tag CRUD |
| `ThemeManagerWindow` | `ThemeManagerWindow.tsx` | Custom theme editor |

### Separate Windows (rendered standalone via `?modal=`)

| Window | File | Purpose |
|--------|------|---------|
| `SettingsWindow` | `SettingsWindow.tsx` | All app settings |
| `HelpWindow` | `HelpWindow.tsx` | 47 help articles in 8 categories |
| `XrayWindow` | `XrayWindow.tsx` | Screenplay analysis dashboard |

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

