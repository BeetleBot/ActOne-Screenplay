# Snapshot Commands

Snapshots provide file versioning. Managed by `src-tauri/src/snapshots.rs`.

## SnapshotInfo Structure

```typescript
interface SnapshotInfo {
    id: string;              // "YYYYMMDD_HHMMSS"
    filename: string;        // Original filename
    snapshotPath: string;    // Path to snapshot file
    createdAt: string;       // ISO 8601 timestamp
    snapshotType: string;    // "auto" | "manual" | "on_save"
    comment: string | null;  // User comment
    fileSize: number;        // File size in bytes
    customTag: string | null;// Custom tag
}
```

## `create_snapshot`

Creates a snapshot of the current file.

```typescript
invoke<SnapshotInfo>("create_snapshot", {
    filePath: string,
    comment?: string,
    snapshotType?: string,     // "auto" | "manual" | "on_save"
    customTag?: string,
    content?: string | null,   // Live in-memory text payload (for text/fountain files)
    bytes?: number[] | null,   // Live in-memory zipped bundle payload (for .actone bundles)
});
```

If `bytes` or `content` is provided, `create_snapshot` writes the live in-memory editor state directly to the snapshot target. This guarantees periodic or manual snapshots capture unsaved typing even when Auto-Save is turned off. If neither payload is passed, it falls back to copying the saved file from disk.

**Snapshot location** (determined by app prefs):
- `"project"`: `.snapshots/` directory next to the file
- `"custom"`: User-specified directory
- `"appdata"`: `<app_data_dir>/snapshots/`

**Retention:** Auto-prunes oldest `auto`/`on_save` snapshots when count exceeds `actone-snapshot-max-retention` (default 20).

---

## `get_snapshots`

Lists all snapshots for a given file.

```typescript
invoke<SnapshotInfo[]>("get_snapshots", { filePath: string });
```

---
