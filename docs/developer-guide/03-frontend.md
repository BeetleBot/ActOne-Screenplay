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
