# Snapshot Commands

Implementation: `src-tauri/src/snapshots.rs`. Scheduling, pending-edit capture and panel state remain in `src/context/SnapshotContext.tsx` and `FileContext.tsx`.

## SnapshotInfo

The result uses snake_case fields: `id`, `filename`, `snapshot_path`, `created_at`, `snapshot_type`, `comment`, `file_size`, and `custom_tag`. Comments and tags are strings, defaulting to empty. IDs contain UTC date/time plus subsecond precision; callers must treat them as opaque identifiers.

## create_snapshot

```typescript
invoke<SnapshotInfo>("create_snapshot", {
  filePath,
  comment: null,
  snapshotType: "manual", // manual | auto | on_save
  customTag: null,
  project: { scripts, settings }, // native bundle packing
  content: null,                 // live plain-text alternative
  bytes: null,                   // retained byte-payload compatibility
});
```

Project payloads are packed by Rust on a blocking worker. Creation, listing/recovery, and deletion use background workers so compression and disk operations do not block the desktop event loop. Otherwise bytes take precedence over text; with no payload, the command copies the saved disk file. Frontend capture errors must propagate to snapshot error handling rather than silently falling back to a stale disk copy. Live unsaved edits are captured even if autosave is disabled.

Storage currently always uses `.snapshots/<project-stem>_<extension>/` next to the project, with an `index.json`. Frontend location/custom-path preferences do not currently change this native path; do not infer otherwise from the settings fields.

Creation, listing/recovery, and deletion serialize index mutations. Index replacement is atomic. Rapid snapshots use distinct filenames. Retention publishes the replacement index before removing pruned files, preserving existing revisions if index replacement fails. Auto/on_save snapshots share the configured retention limit; manual snapshots are retained. A zero retention limit disables pruning.

## Other Commands

- `get_snapshots({ filePath })`: reads indexed snapshots, or an empty array when disabled/absent; recovers a missing/damaged index from timestamp-named revision files.
- `delete_snapshot({ filePath, snapshotId })`: commits index removal before deleting the revision. A failed index replacement preserves the revision. File deletion errors restore the original index and reject; an already missing file simply has its stale entry removed.
- `get_snapshot_folder_path({ filePath })`: returns the project's snapshot root.
- `open_folder({ path })`: validates the snapshot-folder path before opening/creating it.

Opening a snapshot from the panel calls `openSnapshotAsNewProject`, producing a new unsaved editable project. No in-place restore command or read-only snapshot editor is implemented.

Coverage includes live text/bundle payloads, concurrent creation, rapid IDs, retention, failed index replacement, folder validation and frontend payload capture.

## Index recovery

Missing indexes are rebuilt from recognized timestamp-named revision files. Invalid JSON indexes are preserved byte-for-byte in a unique `index.corrupt-<pid>-<nanoseconds>.json` backup before replacement. Read/permission errors are surfaced rather than treated as empty history. Recovery never extracts archive entries or uses arbitrary filenames as revisions.

Recovered snapshots are marked manual with the comment `Recovered snapshot`, preserving them from automatic retention. Dates are inferred from filenames; original comments, tags, and automatic/manual classifications cannot be reconstructed from the revision bytes. Recovery persists the repaired index before a new revision is written, avoiding duplicate entries. Tests cover damaged/missing indexes, backup preservation, retention protection, and deletion/index/file failure ordering.
