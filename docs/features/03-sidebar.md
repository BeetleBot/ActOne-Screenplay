# Sidebar Panels

The **Activity Bar** is a slim **46px** vertical dock with **4px** inset padding on the left, organized into grouped tool sections. Press `Ctrl+\` to toggle sidebar visibility. The active tool uses a soft pill background with the theme accent — the old left-side vertical accent bar is no longer used. Each icon sits in a `38×38px` rounded square (`8px` radius).

## Header Tabs & Window Chrome

The **Header Bar** (46px, transparent background) hosts **floating pill tabs** (`20px` radius, `140–220px` width) with an active primary dot + amber dirty dot and a circular close affordance. The **Title Bar** for secondary windows is transparent with minimal `28px` rounded window controls. See `DESIGN.md` §5.

## Outline (Tab 1 — Content Group)

Shows the screenplay structure as **rounded scene cards** (`6px` radius, soft shadow when active, no left-side accent bars):

- **Sections** (`#`, `##`) as collapsible groups with `6px` rounded headers
- **Scene cards**: header row (monospace scene-number badge + heading), truncated italic synopsis, and tag pills (character/time-of-day/storyline as `4px` rounded chips with soft shadow in a sub-card)
- **Pill search filter** (`20px` radius) at the top — instant filtering by text, location, or character
- **Filter popover** (tune icon with active-count badge): filter by scene color or storyline with count badges
- **Drag-and-drop** reordering via the grab handle (six-dot, `14px`) with blue ghost + insertion line
- Click any card to jump to that line in the editor
- Header menu (`⋯`) controls **Outline font size**: Small / Normal / Large

For prose documents (`.md`), the panel switches to **Table of Contents** listing Markdown headings. *Characters & Statistics* live in the X-Ray Analysis window (Status Bar bar-chart icon), not inside Outline.

## Scripts (Tab 2 — Content Group)

Lists all scripts in the current `.actone` project as **rounded cards** (`8px` radius, drag handle + file-type tag):

- **Pill search** (`20px` radius) to filter script names
- Click to switch active script (active card shows `action.selected` with border glow)
- `[+]` button to add a new script (prompts for name)
- `⋮` menu per script: Rename, Duplicate, Move Up/Down, Delete
- **Export All** button (pill, `6px`) to export each script individually
- Drag-and-drop reordering of scripts
- When a project has no scripts (Landing Pad state), the Scripts pane is automatically opened and active, while other feature tabs are greyed out until a script is created.

## Notepad (Tab 3 — Content Group)

Rich Markdown & Prose scratchpad for notes, treatments, and beat sheets. Content is saved in the `.actone` bundle. Features live inline Markdown preview, stepped blockquote rails, and smart list indentation. When plain `.fountain` is open, it prompts to save as `.actone` to unlock.

## Markers (Tab 4 — Tools Group)

Shows all margin markers (`[[marker …]]`) as **rounded cards** with sub-cards:

- Color-coded by marker type (blue, brown, cyan, green, magenta, orange, pink, purple, red, yellow)
- **Pill search** (`20px` radius) + **filter popover** (tune icon with badge count) by color with count chips (`4px`)
- Each card: line-number tag + scene-number badge (`4px` pills), description title, sub-card with scene context and storyline chips
- Click to jump to marker location
- Add markers from the editor right-click → Drop Marker

## Tasks (Tab 5 — Tools Group)

To-do list integrated with the screenplay (rounded rows `8px`):

- **Pill input** (`20px` radius) to add tasks; `Enter` to create
- Create tasks from editor lines (right-click → "Create Task")
- Circular checkboxes with spring animation; completed items move to a muted collapsible section (`6px`)
- Delete individual tasks; keyboard nav `↑`/`↓`, `Space`/`Enter`, `Delete`
- Tasks saved as `todos` array in the document settings (persisted to `.actone` bundle)

## Snapshots (Tab 6 — Tools Group)

File versioning panel (see Snapshots feature doc). Pill filters (`20px`) by tag type, two-tier cards (`8px` header + sub-card), pill inputs/buttons, and a dashed `12px` empty state when disabled.

## Sprint (Tab 7 — Tools Group)

Writing sprint tracker (see Sprint feature doc). Pill preset durations (`20px`), custom minutes field (`8px`), circular progress ring, metric pills, pill Start/Finish/Cancel buttons, history & leaderboard with `8px` rounded rows and `10px` stats banner.

## Parking (Tab 8 — Tools Group)

Temporary text storage (see Parking feature doc). Park selected text (right-click or panel button) and click a parked card to reinsert at cursor. Rounded card layout.

## Quick Settings

The gear icon at the bottom of the activity bar opens a Quick Settings popover with pill scrollbars and rounded corners:
- **Editor Preferences**: Typewriter Mode, Hide Fountain Markup, Syntax Colors toggles
- **Theme**: Grid of theme swatches organized by category (Classic, Catppuccin, Pitch, Pastel, Custom), including adaptive variants — tiles are `6px` rounded with soft shadow, plus "Open Theme Manager" link
- **Layout & Page**: Letter/A4 paper size toggle
- **Full Settings**: Opens the Settings window (five pill-segmented tabs)

## Sidebar Width & Panes

- The left sidebar is resizable by dragging the divider between the sidebar and the editor (200px–800px range).
- The right **Find & Replace** pane is a floating paper card (`12px` radius, ambient shadow) with a subtle rounded divider that glows on hover drag. Pill inputs/toggles and `8px` result rows. Drag its left edge to resize.
