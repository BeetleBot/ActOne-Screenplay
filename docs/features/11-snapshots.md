# Snapshots

The snapshot system provides file versioning — automatic and manual checkpoints of your screenplay.

## How It Works

Snapshots are copies of your file at specific points in time, stored in a snapshot directory.

### Snapshot Types

| Type | Created When | Retention |
|------|-------------|-----------|
| `auto` | Periodically (every few minutes) | Max 10 (configurable) |
| `on_save` | Every manual save | Max 10 (configurable) |
| `manual` | User-initiated | Kept until manually deleted |

### Storage Locations

Snapshots are stored in the active project's `.snapshots/` folder next to the project file. The folder contains the snapshot index and the saved revisions.

## Snapshot Panel

**Sidebar — Snapshots panel** lists all snapshots for the current file:
- Timestamp and type indicator
- File size
- Optional comment and custom tag
- **Open as New File** (opens the snapshot content in a new editor tab)
- **Delete** button

## Key Actions

### Creating a Manual Snapshot
Click **Create Snapshot** in the snapshots panel. Optionally add a comment or custom tag.

### Deleting Snapshots
Click **Delete** on individual snapshots. Old auto/on_save snapshots are automatically pruned.

## Opening Snapshots Folder

The snapshots panel includes a button to open the snapshot directory in the system file manager.
