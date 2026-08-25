# Todos & Markers

## To-Do Items

**Sidebar Tab 5** (Tasks — Tools group) — A task list integrated with the screenplay, styled as rounded rows.

### Creating Tasks
- **Pill input** (`20px` radius) at the top of the Tasks panel — type and press `Enter`
- Select text in the editor → Right-click → **Create Task**
- Tasks can also be created via the editor context menu

### Task Management
- **Rounded rows** (`8px` radius, `6px` for completed muted rows) with circular checkboxes and spring animation
- Check/uncheck to mark completion (moves to collapsible "Completed (N)" section with strikethrough)
- Storyline-like tags shown as rounded `4px` pills on task rows
- Delete individual tasks (X button); keyboard nav `↑`/`↓`, `Space`/`Enter`, `Delete`
- All tasks saved as a `todos` array in the document settings (persisted to `.actone` bundle)

### Use Cases
- Scene rewrite reminders
- Production notes (props, locations, cast)
- Revision tracking
- Collaboration notes

## Markers

**Sidebar Tab 4** (Markers — Tools group) — Margin markers for production tracking, shown as rounded cards.

### Creating Markers
- Right-click in the editor → **Drop Marker** → select a color
- A prompt asks for a description; the marker is inserted as `[[marker color: description]]`
- 11 marker colors available: Blue, Brown, Cyan, Green, Magenta, Orange, Pink, Purple, Red, Yellow, Default (Orange)

### Marker Panel
Lists all markers as **rounded cards** (`6px` radius with sub-card `0 0 6px 6px`):
- Color-coded with active card border + shadow
- **Pill search** (`20px` radius) + **filter popover** (tune icon with active-count badge, `4px` chips)
- Each card: line-number + scene-number tags (`4px` pills), description, sub-card with scene context + storyline chips
- Click to jump to marker location in the editor; keyboard nav `↑`/`↓`, `Enter`

### Markers in Export
Markers (`[[marker ...]]`) are always stripped from PDF, FDX, and FadeIn exports — they are for the writer's eyes only.

### Use Cases
- Marking scenes for revision
- Production script marking
- Highlighting specific lines for review
- Continuity notes
