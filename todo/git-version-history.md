# Toggleable Git-Based Version History — Implementation Plan

## Overview

Project-level toggle to enable/disable version history. When enabled, a real
`.git` repository is initialized in a hidden `.versions/` folder next to the
`.actone` file. Only the **Fountain text** (not the binary ZIP) is tracked,
making git diffs readable. When disabled, the folder can be kept (paused) or
deleted.

---

## Workflow (Layman)

```
[User opens project]
    → Version History toggle is OFF (default)
    → ActOne works exactly as now. Zero overhead.

[User enables "Version History" in Project Settings]
    → .versions/ folder created next to .actone
    → .git repo initialized inside it
    → Every Ctrl+S (save) = auto git commit
    → Sidebar shows new "Versions" tab with timeline

[User edits, hits Ctrl+S]
    → Saves .actone normally
    → Writes .fountain text to .versions/MyScript.fountain
    → git add + git commit with default message "2026-06-29 15:30"

[User opens "Versions" tab]
    → Scrollable timeline: each commit with date + message
    → Click any version: see diff against current
    → Click "Revert": restore that version

[User disables Version History]
    → Confirmation: "Keep .versions/ (paused) or Delete?"
    → Sidebar tab disappears
    → Saves no longer auto-commit
```

---

## File-by-File Plan

### Rust Backend (`src-tauri/`)

#### 1. Add `git2` dependency — `src-tauri/Cargo.toml`

```toml
git2 = "0.19"
```

`libgit2` is a C library. `git2` is a Rust wrapper. ~20MB extra binary size at
shipping.

#### 2. New module — `src-tauri/src/versioning.rs`

All version-control Tauri commands:

| Command | Description |
|---------|-------------|
| `enable_version_history(project_dir: String)` | init `.versions/.git`, write initial `.fountain` text |
| `disable_version_history(project_dir: String, keep_files: bool)` | stop tracking, optionally delete `.versions/` |
| `commit_version(project_dir: String, script_name: String, fountain_text: String, message: Option<String>)` | write text, git add, git commit |
| `get_version_log(project_dir: String) -> Vec<CommitInfo>` | `git log` as structured data |
| `get_version_diff(project_dir: String, script_name: String, commit_id: String) -> Vec<DiffHunk>` | `git diff` between commit and current |
| `revert_to_version(project_dir: String, script_name: String, commit_id: String) -> String` | checkout file at commit, return text |
| `is_version_history_enabled(project_dir: String) -> bool` | check `.versions/.git` exists |

**Internal structure:**

```rust
// src-tauri/src/versioning.rs

use git2::Repository;
use serde::Serialize;

#[derive(Serialize)]
struct CommitInfo {
    id: String,         // short hash, e.g. "a1b2c3d"
    timestamp: String,  // ISO 8601
    message: String,    // commit message
}

#[derive(Serialize)]
struct DiffHunk {
    old_start: u32,
    old_lines: u32,
    new_start: u32,
    new_lines: u32,
    header: String,
    lines: Vec<DiffLine>,
}

#[derive(Serialize)]
struct DiffLine {
    origin: char,  // '+', '-', ' '
    content: String,
}

fn versions_dir(project_dir: &str) -> PathBuf {
    PathBuf::from(project_dir).parent().unwrap_or(PathBuf::from("."))
        .join(".versions")
}

fn open_repo(project_dir: &str) -> Result<Repository, String> {
    let path = versions_dir(project_dir);
    Repository::open(&path).map_err(|e| e.message().to_string())
}
```

#### 3. Register in `src-tauri/src/lib.rs`

```rust
mod versioning;

.invoke_handler(tauri::generate_handler![
    // ... existing commands ...
    versioning::enable_version_history,
    versioning::disable_version_history,
    versioning::commit_version,
    versioning::get_version_log,
    versioning::get_version_diff,
    versioning::revert_to_version,
    versioning::is_version_history_enabled,
])
```

### Frontend

#### 4. Settings — `src/components/SettingsModal.tsx`

Add a toggle to the General settings section:

```
┌─ GENERAL ──────────────────────────┐
│                                    │
│  ☐ Enable Version History          │
│    Track every save as a version.   │
│    Creates .versions/ folder next   │
│    to the project file.            │
│                                    │
└────────────────────────────────────┘
```

Stored in `parsedDoc.settings.versionHistoryEnabled` (boolean, false by default).
Persists in `.actone` bundle settings.

#### 5. New Sidebar Tab — `src/components/Sidebar/VersionView.tsx`

A new sidebar tab (alongside Scripts, Outline, Markers) shown only when
`versionHistoryEnabled` is true.

**UI design:**

```
┌─ VERSIONS ────────────────────────┐
│  [   Save Version   ]             │
│  ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔  │  ← opens a small popover for
│                                   │     commit message
│  All scripts (23 versions)        │
│  ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔  │
│                                   │
│  ● 15:32  Fixed dialogue pacing   │  ← click = compare
│  ● 15:28  Added new scene         │
│  ● 15:15  (autosave)             │  ← no user message
│  ● 14:50  First draft done        │
│  ● 14:20  (autosave)             │
│  ...                              │
└───────────────────────────────────┘
```

**States:**
- Loading: fetch `get_version_log`
- Empty: "No versions yet. Enabling version history tracks every save."
- List: scrollable commit timeline with relative timestamps
- Click: either expand an inline diff preview, or open the full diff viewer

#### 6. Diff Viewer — `src/components/Sidebar/VersionDiff.tsx`

A full-height panel that replaces or overlays the sidebar content when a version
is selected for comparison.

```
┌─ COMPARING: 15:32 ────────────────┐
│  "Fixed dialogue pacing"          │
│                                   │
│  ┌───────────────────────────────┐│
│  │   INT. HOUSE - DAY (unchanged)││  ← grey
│  │                               ││
│  │  + She pauses, then laughs.   ││  ← green background
│  │  - She pauses.                ││  ← red background + strikethrough
│  │    He nods slowly. (unchanged) ││  ← white/normal
│  └───────────────────────────────┘│
│                                   │
│  [ Restore this version ]         │
│  [ Back to versions ]             │
└───────────────────────────────────┘
```

**Implementation approach:**
- Call `get_version_diff` with the selected commit ID
- Iterate `DiffHunk` → `DiffLine` → render each line with appropriate styling
- Highlight lines: `origin '+'` → green bg, `origin '-'` → red bg + strikethrough
- Regular lines: `origin ' '` → normal text color

#### 7. Status Bar — `src/components/StatusBar.tsx`

Add a small version counter next to the existing file stats when enabled:

```
Ep 29.fountain  │  23 versions  │  Editor  │  100%  │  21 chars
```

Only visible when `versionHistoryEnabled` is true. Click → open Versions tab.

#### 8. Soft Save Integration — `src/context/FileContext.tsx`

Modify the `saveFile` function (or a new hook) to auto-commit after saving:

```typescript
// Inside saveFile, after successful write:
if (parsedDoc?.settings?.versionHistoryEnabled) {
  const dir = filePath?.replace(/[\\/][^\\/]+$/, "") || "";
  const msg = `save at ${new Date().toLocaleTimeString()}`;
  invoke("commit_version", {
    projectDir: dir,
    scriptName: activeScriptName + ".fountain",
    fountainText: rawText,
    message: msg,
  }).catch(e => logger.warn("versioning", "Auto-commit failed", e));
}
```

#### 9. Activity Bar — `src/components/ActivityBar.tsx`

Add a new icon for "Versions" tab. Only shown when version history is enabled.
Uses a git-branch or clock-history icon.

### Data Flow

```
User → SettingsModal → Toggle ON
       → parsedDoc.settings.versionHistoryEnabled = true
       → invoke("enable_version_history", { projectDir })

User → writes → Ctrl+S
       → saveFile() → writes .actone
       → check versionHistoryEnabled → invoke("commit_version", { text, message })

User → ActivityBar → "Versions" tab
       → VersionView → invoke("get_version_log") → render timeline

User → click version → VersionDiff
       → invoke("get_version_diff", { commitId }) → render inline diff

User → click Restore → invoke("revert_to_version", { commitId })
       → push text into editor (save current first as version)
```

### File Index

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `src-tauri/Cargo.toml` | edit | Add `git2` dependency |
| 2 | `src-tauri/src/versioning.rs` | **new** | All versioning Tauri commands |
| 3 | `src-tauri/src/lib.rs` | edit | Register `mod versioning;` + commands |
| 4 | `src/components/SettingsModal.tsx` | edit | Add toggle switch |
| 5 | `src/components/VersionView.tsx` | **new** | Sidebar timeline panel |
| 6 | `src/components/VersionDiff.tsx` | **new** | Inline diff viewer panel |
| 7 | `src/components/StatusBar.tsx` | edit | Version counter indicator |
| 8 | `src/components/ActivityBar.tsx` | edit | Versions tab icon (conditional) |
| 9 | `src/components/ModalManager.tsx` | edit | Render VersionView in activity bar |
| 10 | `src/context/FileContext.tsx` | edit | Auto-commit on save |
| 11 | `src/components/Icons.tsx` | edit | New git-branch or history icon |

---

## Implementation Order

1. **Cargo.toml** — add `git2`
2. **versioning.rs** — all Rust logic (init, commit, log, diff, revert)
3. **lib.rs** — register module + commands
4. **SettingsModal.tsx** — add toggle
5. **Icons.tsx** — add versions icon
6. **VersionView.tsx** — timeline UI
7. **VersionDiff.tsx** — diff viewer UI
8. **ActivityBar.tsx** — conditional tab
9. **ModalManager.tsx** — wire up
10. **StatusBar.tsx** — version counter
11. **FileContext.tsx** — auto-commit on save
12. **Build, test, verify**

---

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Git repo location | `.versions/` next to `.actone` | Hidden, portable with project |
| Tracked content | `.fountain` text (not ZIP) | Readable git diffs |
| Commit trigger | Every `Ctrl+S` (save) | No extra user action for normal flow |
| Explicit commit | "Save Version" button with optional message | Milestone marker |
| Toggle | Project-level, off by default | No overhead for simple projects |
| Local only | No push/pull/remote | Git remote is a separate future feature |
| Diff format | Inline unified diff (green/red lines) | Familiar, simple to render |
| Backup before revert | Always save current state first | Nothing is ever lost |
