# Todos & Markers

## To-Do Items

**Sidebar Tab 5** (Tasks) — A task list integrated with the screenplay.

### Creating Tasks
- Select text in the editor → Right-click → **Create Task**
- Tasks can also be created via right-click → **Tag** → Quick Tag (Ctrl+right-click)

### Task Management
- Check/uncheck to mark completion
- Delete individual tasks
- All tasks saved as a `todos` array in the document settings (persisted to `.actone` bundle)

### Use Cases
- Scene rewrite reminders
- Production notes (props, locations, cast)
- Revision tracking
- Collaboration notes

## Markers

**Sidebar Tab 4** (Markers) — Margin markers for production tracking.

### Creating Markers
- Right-click in the editor → **Drop Marker** → select a color
- A prompt asks for a description; the marker is inserted as `[[marker color: description]]`
- 11 marker colors available: Blue, Brown, Cyan, Green, Magenta, Orange, Pink, Purple, Red, Yellow, Default (Orange)

### Marker Panel
Lists all markers in the document:
- Color-coded by marker type
- Click to jump to marker location in the editor
- Delete individual markers

### Markers in Export
Markers (`[[marker ...]]`) are always stripped from PDF, FDX, and FadeIn exports — they are for the writer's eyes only.

### Use Cases
- Marking scenes for revision
- Production script marking
- Highlighting specific lines for review
- Continuity notes
