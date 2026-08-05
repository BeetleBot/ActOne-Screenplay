# Command Palette

`Ctrl+K` opens the command palette — a fuzzy-searchable list of all available commands.

## Features

- **Fuzzy search**: Type any part of a command name to find it
- **Keyboard navigation**: Arrow keys to select, Enter to execute
- **Category grouping**: Commands are logically grouped
- **Theming**: Follows the active theme

## Available Commands

### File
- New Screenplay
- Open Screenplay
- Save
- Save As
- Close Tab
- Export PDF
- Export FDX
- Export FadeIn
- Export Fountain
- Export CSV

### Edit
- Undo / Redo
- Cut / Copy / Paste
- Find / Replace
- Select All
- Toggle Bold / Italic / Underline

### View
- Toggle Sidebar
- Toggle Zen Mode
- Toggle Typewriter Mode
- Switch to Editor View
- Zoom In / Zoom Out / Reset Zoom

### Navigation
- Go to Scene...
- Go to Line...
- Go to Page...

### Sidebar
- Show Outline
- Show Scripts
- Show Characters
- Show Statistics
- Show Notepad
- Show Markers
- Show Tasks
- Show Sprint
- Show Parking

### Tools
- Fix Formatting
- Open Settings
- Open Help Guide
- Open Theme Manager
- Open Tag Manager
- Open X-Ray Analysis
- Import Structure Template
- Edit Title Page
- Renumber Scenes

## Implementation

Uses **fuse.js** for fuzzy string matching against a command definition list. Each command has:
- `id`: unique identifier
- `title`: display name
- `category`: grouping category
- `keywords`: additional search terms
- `action`: callback function
- `shortcut`: optional keyboard shortcut display
