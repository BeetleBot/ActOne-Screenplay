# Sidebar Panels

The activity bar on the left side provides access to **8 sidebar panels**. Press `Ctrl+\` to toggle sidebar visibility.

## Command Palette Button

At the top of the activity bar, a solid ActOne logo button opens the Command Palette (`Ctrl+K`). It has a bounce animation on click.

## Outline (Tab 1)

Shows a tree view of the screenplay structure:

- **Sections** (`#`, `##`, `###`) as collapsible groups
- **Scene headings** with scene numbers and color indicators
- **Synopsis lines** displayed beneath their scene
- **Drag-and-drop** reordering of scenes (rearranges the document text)
- Click any entry to jump to that line in the editor
- **Characters & Statistics** are accessible as inline tab headers within the Outline view (not separate sidebar tabs)

## Scripts (Tab 2)

Lists all scripts in the current `.actone` project:

- Click to switch active script
- `[+]` button to add a new script (prompts for name)
- `⋮` menu per script: Rename, Delete
- **Export All** button to export each script individually
- When a project has no scripts (Landing Pad state), the Scripts pane is automatically opened and active, while other feature tabs are greyed out until a script is created.

## Notepad (Tab 3)

A simple scratchpad for notes and ideas. Content is saved in the `.actone` bundle as a per-script setting (`notepad` key).

- Shows a banner prompting to save as `.actone` if the file isn't already a bundle
- Free-form text area with placeholder hints

## Markers (Tab 4)

Shows all margin markers placed in the document:

- Color-coded by marker type (blue, brown, cyan, green, magenta, orange, pink, purple, red, yellow)
- Click to jump to marker location
- Add markers from the editor right-click context menu

## Tasks (Tab 5)

To-do list integrated with the screenplay:

- Create tasks from editor lines (right-click → "Create Task")
- Check/uncheck completion
- Delete tasks
- Tasks saved as `todos` array in the document settings

## Snapshots (Tab 6)

File versioning panel (see Snapshots feature doc). Lists all snapshots with timestamps, types, and file sizes.

## Sprint (Tab 7)

Writing sprint tracker (see Sprint feature doc). Set goals, start/pause/resume/stop timed writing sessions.

## Parking (Tab 8)

Temporary text storage (see Parking feature doc). Park selected text and click to reinsert.

## Quick Settings

The gear icon at the bottom of the activity bar opens a Quick Settings menu with:
- **Editor Preferences**: Typewriter Mode, Hide Fountain Markup, Syntax Colors toggles
- **Theme**: Grid of theme swatches organized by category (Classic, Catppuccin, Pitch, Pastel, Custom), including adaptive variants, with "Open Theme Manager" button
- **Layout & Page**: Letter/A4 paper size toggle
- **Full Settings**: Opens the Settings window

## Sidebar Width

The sidebar is resizable by dragging the divider between the sidebar and the editor (200px–800px range).
