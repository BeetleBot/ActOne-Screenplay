# Command Palette

`Ctrl+K` opens the command palette — a fuzzy-searchable list of all available commands.

## Features

- **Fuzzy search**: Type any part of a command name to find it
- **Keyboard navigation**: Arrow keys to select, Enter to execute
- **Category grouping**: Commands are logically grouped
- **Theming**: Follows the active theme

## Available Commands

The palette groups commands by category (defined in `src/components/CommandPalette.tsx`).

### File
- New Screenplay
- Open Screenplay...
- Import Screenplay...
- Save Screenplay
- Save Screenplay As...
- Close Active File
- Export...

### Edit
- Undo / Redo
- Cut / Copy / Paste
- Find in Screenplay
- Enable / Disable Spellcheck

### View
- Enable / Disable Typewriter Mode
- Enable / Disable Zen Mode
- Enable / Disable Focus Mode
- Zoom In / Zoom Out / Reset Editor Scale
- Reset Interface Scale
- Show / Hide Fountain Markup
- Open X-Ray Analysis...
- Show Snapshots

### Format
- Fix Formatting
- Edit Title Page...
- Import Structure Template...
- Renumber Scene Headings
- Clear Scene Numbers

### Settings
- Open Settings...
- Open Spellcheck Settings...
- Set Font: Courier Prime / Courier Prime Sans
- Set Paper Size: US Letter / A4
- Open Theme Manager...

### Help
- About ActOne
- Help Guide
- Interactive Tutorial...
- Fountain Syntax Guide (fountain.io)
- Report a Bug (Discord)

## Implementation

Uses **fuse.js** for fuzzy string matching against a command definition list. Each command has:
- `id`: unique identifier
- `title`: display name
- `category`: grouping category
- `keywords`: additional search terms
- `action`: callback function
- `shortcut`: optional keyboard shortcut display
