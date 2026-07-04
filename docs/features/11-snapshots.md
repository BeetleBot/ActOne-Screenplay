# Snapshots

The snapshot system provides file versioning — automatic and manual checkpoints of your screenplay.

## How It Works

Snapshots are copies of your file at specific points in time, stored in a snapshot directory.

### Snapshot Types

| Type | Created When | Retention |
|------|-------------|-----------|
| `auto` | Periodically (every few minutes) | Max 20 (configurable) |
| `on_save` | Every manual save | Max 20 (configurable) |
| `manual` | User-initiated | Kept until manually deleted |

### Storage Locations

Configured in Settings → Snapshots:
- **Project** (`project`): `.snapshots/` folder next to your screenplay file
- **App Data** (`appdata`): `{app_data_dir}/snapshots/`
- **Custom** (`custom`): User-specified directory

## Snapshot Panel

**Sidebar — Snapshots panel** lists all snapshots for the current file:
- Timestamp and type indicator
- File size
- Optional comment and custom tag
- **Restore** button (copies snapshot content back to original)
- **Delete** button

## Key Actions

### Creating a Manual Snapshot
Click **Create Snapshot** in the snapshots panel. Optionally add a comment or custom tag.

### Restoring from Snapshot
Click **Restore** on any snapshot. The snapshot content is copied back to the original file location.

### Deleting Snapshots
Click **Delete** on individual snapshots. Old auto/on_save snapshots are automatically pruned.

## Opening Snapshots Folder

The snapshots panel includes a button to open the snapshot directory in the system file manager.
