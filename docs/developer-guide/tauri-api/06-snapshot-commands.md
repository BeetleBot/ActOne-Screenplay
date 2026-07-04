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
});
```

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

## `delete_snapshot`

Deletes a specific snapshot.

```typescript
invoke<void>("delete_snapshot", {
    filePath: string,
    snapshotId: string,
});
```

---

## `restore_snapshot`

Restores a file from a snapshot (copies snapshot content back to original location).

```typescript
invoke<void>("restore_snapshot", {
    filePath: string,
    snapshotPath: string,
});
```

---

## `get_snapshot_folder_path`

Returns the snapshot directory path for a given file.

```typescript
invoke<string>("get_snapshot_folder_path", { filePath: string });
```

---

## `open_folder`

Opens a folder in the system file manager.

```typescript
invoke<void>("open_folder", { path: string });
```

**Platform behavior:**
- **Windows:** `explorer <path>`
- **macOS:** `open <path>`
- **Linux:** `xdg-open <path>`
