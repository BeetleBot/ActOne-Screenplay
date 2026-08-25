# Snapshots

The snapshot system provides file versioning — automatic and manual checkpoints of your screenplay, styled as rounded two-tier cards with pill controls.

## How It Works

Snapshots are copies of your file at specific points in time, stored in a snapshot directory.

### Snapshot Types

| Type | Created When | Retention |
|------|-------------|-----------|
| `auto` | Periodically (every few minutes) | Max 5–100 (default 20, configurable) |
| `on_save` | Every manual save | Max 5–100 (default 20, configurable) |
| `manual` | User-initiated | Kept until manually deleted |

### Storage Locations

Snapshots are stored in the active project's `.snapshots/` folder next to the project file by default. The folder contains the snapshot index and saved revisions. A custom path can be picked via **Settings → Snapshots → Browse…** (with Reset to Default). When snapshots are disabled, the panel shows a dashed `12px` empty state with an **Enable Snapshots** pill CTA.

## Snapshot Panel

**Sidebar — Snapshots panel** (pill inputs `20px`, pill tag filters `20px`, rounded cards) lists all snapshots for the current file:
- **Header row** (`8px 8px 0 0`): timestamp, file size, type badge
- **Sub-card** (`0 0 8px 8px`): comment, tags, colored dot
- **Filter pills** at the top (`20px` radius): MANUAL / SAVE / AUTO / custom tags — active pill uses primary accent
- Three-dot menu per snapshot: **Restore** (takes a safety snapshot first), **Open as New File** (read-only tab), **Delete**

## Key Actions

### Creating a Manual Snapshot
Pill comment + tag inputs at the top, then **New Snapshot** (full-width pill button, `20px` radius).

### Deleting / Restoring
Use the three-dot menu on each card. **Restore** replaces the current file with the snapshot (safety snapshot first). **Delete** removes permanently; old auto/on_save snapshots are auto-pruned at the retention limit.

## Opening Snapshots Folder

The panel includes a pill button (`6px`) to open the snapshot directory in the system file manager.
