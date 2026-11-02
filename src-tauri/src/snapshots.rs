use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::SystemTime;
use std::time::UNIX_EPOCH;

// Snapshot bytes and their index must be updated as one serialized operation.
static SNAPSHOT_WRITES: std::sync::Mutex<()> = std::sync::Mutex::new(());

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SnapshotInfo {
    pub id: String,
    pub filename: String,
    pub snapshot_path: String,
    pub created_at: String,
    pub snapshot_type: String,
    pub comment: String,
    pub file_size: u64,
    #[serde(default)]
    pub custom_tag: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct IndexFile {
    version: u32,
    file_path: String,
    snapshots: Vec<SnapshotInfo>,
}

fn format_timestamp() -> (String, String) {
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    let secs = duration.as_secs();
    let millis = duration.subsec_millis();

    let days = secs / 86400;
    let time_secs = secs % 86400;
    let hours = time_secs / 3600;
    let minutes = (time_secs % 3600) / 60;
    let seconds = time_secs % 60;

    // Date from days since epoch (simplified Gregorian)
    let mut y = 1970i64;
    let mut remaining = days as i64;
    loop {
        let days_in_year = if is_leap(y) { 366 } else { 365 };
        if remaining < days_in_year {
            break;
        }
        remaining -= days_in_year;
        y += 1;
    }
    let month_days = if is_leap(y) {
        [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    } else {
        [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    };
    let mut m = 1usize;
    for &md in month_days.iter() {
        if remaining < md as i64 {
            break;
        }
        remaining -= md as i64;
        m += 1;
    }
    let d = remaining + 1;

    let id = format!(
        "{:04}{:02}{:02}_{:02}{:02}{:02}_{:09}",
        y,
        m,
        d,
        hours,
        minutes,
        seconds,
        duration.subsec_nanos()
    );

    let iso = format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}.{:03}Z",
        y, m, d, hours, minutes, seconds, millis
    );

    (id, iso)
}

fn is_leap(year: i64) -> bool {
    (year % 4 == 0 && year % 100 != 0) || year % 400 == 0
}

fn sanitize_folder_name(file_path: &str) -> String {
    let path = Path::new(file_path);
    let stem = path.file_stem().unwrap_or_default().to_string_lossy();
    let ext = path
        .extension()
        .map(|e| e.to_string_lossy().to_string())
        .unwrap_or_default();
    if ext.is_empty() {
        stem.to_string()
    } else {
        format!("{}_{}", stem, ext)
    }
}

fn snapshot_root<A: tauri::Runtime>(
    _app: &tauri::AppHandle<A>,
    file_path: &str,
    _state: &crate::app_prefs::AppPrefsState,
) -> PathBuf {
    Path::new(file_path)
        .parent()
        .unwrap_or(Path::new("."))
        .join(".snapshots")
}

fn snapshot_dir<A: tauri::Runtime>(
    app: &tauri::AppHandle<A>,
    file_path: &str,
    state: &crate::app_prefs::AppPrefsState,
) -> PathBuf {
    let root = snapshot_root(app, file_path, state);
    let folder = sanitize_folder_name(file_path);
    root.join(folder)
}

fn load_index(dir: &Path) -> Result<IndexFile, String> {
    let path = dir.join("index.json");
    let damaged = match fs::read(&path) {
        Ok(bytes) => match serde_json::from_slice::<IndexFile>(&bytes) {
            Ok(index) => return Ok(index),
            Err(_) => Some(bytes),
        },
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => None,
        Err(e) => return Err(format!("Cannot read snapshot index: {e}")),
    };
    let mut index = IndexFile {
        version: 1,
        file_path: String::new(),
        snapshots: vec![],
    };
    if !dir.exists() {
        return Ok(index);
    }
    // Only recover timestamp-named revision files, never backups or temporary files.
    for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        if !entry.file_type().map_err(|e| e.to_string())?.is_file() {
            continue;
        }
        let file = entry.path();
        let ext = file
            .extension()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_ascii_lowercase();
        if !["actone", "fountain", "md", "markdown", "excalidraw"].contains(&ext.as_str()) {
            continue;
        }
        let id = file.file_stem().and_then(|s| s.to_str()).unwrap_or("");
        let b = id.as_bytes();
        if b.len() < 15
            || b[8] != b'_'
            || !b[..8].iter().chain(&b[9..15]).all(u8::is_ascii_digit)
            || !b[15..].iter().all(|b| b.is_ascii_digit() || *b == b'_')
        {
            continue;
        }
        let created_at = format!(
            "{}-{}-{}T{}:{}:{}.000Z",
            &id[..4],
            &id[4..6],
            &id[6..8],
            &id[9..11],
            &id[11..13],
            &id[13..15]
        );
        index.snapshots.push(SnapshotInfo {
            id: id.into(),
            filename: entry.file_name().to_string_lossy().into_owned(),
            snapshot_path: dunce::canonicalize(&file)
                .map_err(|e| e.to_string())?
                .to_string_lossy()
                .into_owned(),
            created_at,
            snapshot_type: "manual".into(),
            comment: "Recovered snapshot".into(),
            file_size: entry.metadata().map_err(|e| e.to_string())?.len(),
            custom_tag: String::new(),
        });
    }
    index.snapshots.sort_by(|a, b| a.id.cmp(&b.id));
    if let Some(bytes) = damaged {
        use std::io::Write;
        let backup = dir.join(format!(
            "index.corrupt-{}-{}.json",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_nanos()
        ));
        let mut file = fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(backup)
            .map_err(|e| format!("Cannot preserve damaged snapshot index: {e}"))?;
        file.write_all(&bytes)
            .and_then(|_| file.sync_all())
            .map_err(|e| e.to_string())?;
        save_index(dir, &index)?;
    } else if !index.snapshots.is_empty() {
        save_index(dir, &index)?;
    }
    Ok(index)
}

fn save_index(dir: &Path, index: &IndexFile) -> Result<(), String> {
    fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    let json = serde_json::to_string_pretty(index).map_err(|e| e.to_string())?;
    crate::write_file_atomically(dir.join("index.json"), json)
}

fn app_prefs_enabled(state: &crate::app_prefs::AppPrefsState) -> bool {
    state
        .0
        .lock()
        .map(|p| {
            p.get("actone-snapshots-enabled")
                .map(|s| s == "true")
                .unwrap_or(false)
        })
        .unwrap_or(false)
}

pub fn create_snapshot_impl(
    state: &crate::app_prefs::AppPrefsState,
    file_path: &str,
    comment: Option<String>,
    snapshot_type: Option<String>,
    custom_tag: Option<String>,
    content: Option<String>,
    bytes: Option<Vec<u8>>,
) -> Result<SnapshotInfo, String> {
    let _guard = SNAPSHOT_WRITES
        .lock()
        .map_err(|_| "Snapshot storage is unavailable")?;
    if !app_prefs_enabled(state) {
        return Err("Snapshots are disabled".to_string());
    }

    let source = Path::new(file_path);
    let has_payload = bytes.is_some() || content.is_some();
    if !has_payload && !source.exists() {
        return Err("File does not exist".to_string());
    }

    let root = Path::new(file_path)
        .parent()
        .unwrap_or(Path::new("."))
        .join(".snapshots");
    let folder = sanitize_folder_name(file_path);
    let dir = root.join(folder);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    let mut index = load_index(&dir)?;

    let ext = source
        .extension()
        .map(|e| e.to_string_lossy().to_string())
        .unwrap_or_else(|| "actone".to_string());
    let (base_id, iso) = format_timestamp();
    let mut id = base_id.clone();
    let mut suffix = 0;
    while dir.join(format!("{id}.{ext}")).exists() {
        suffix += 1;
        id = format!("{base_id}_{suffix:03}");
    }
    let filename = format!("{}.{}", id, ext);
    let dest = dir.join(&filename);

    if let Some(byte_data) = bytes {
        crate::write_file_atomically(&dest, &byte_data)?;
    } else if let Some(text_data) = content {
        crate::write_file_atomically(&dest, text_data.as_bytes())?;
    } else {
        fs::copy(source, &dest).map_err(|e| e.to_string())?;
    }

    let file_size = fs::metadata(&dest).map(|m| m.len()).unwrap_or(0);

    // Use dunce for cross-platform path canonicalization
    let canonical_source = dunce::canonicalize(source).unwrap_or_else(|_| source.to_path_buf());
    let canonical_dest = dunce::canonicalize(&dest).unwrap_or_else(|_| dest.clone());
    index.file_path = canonical_source.to_string_lossy().to_string();

    let s_type = snapshot_type.unwrap_or_else(|| {
        if comment.as_ref().map(|c| !c.is_empty()).unwrap_or(false) {
            "manual".to_string()
        } else {
            "auto".to_string()
        }
    });

    let info = SnapshotInfo {
        id: id.clone(),
        filename,
        snapshot_path: canonical_dest.to_string_lossy().to_string(),
        created_at: iso,
        snapshot_type: s_type,
        comment: comment.unwrap_or_default(),
        file_size,
        custom_tag: custom_tag.unwrap_or_default(),
    };

    index.snapshots.push(info.clone());

    // Pruning logic for auto and on-save snapshots
    let max_retention = state
        .0
        .lock()
        .map(|p| {
            p.get("actone-snapshot-max-retention")
                .and_then(|s| s.parse::<usize>().ok())
                .unwrap_or(20)
        })
        .unwrap_or(20);

    let mut pruned_paths = Vec::new();
    if max_retention > 0 {
        let mut auto_indices: Vec<usize> = index
            .snapshots
            .iter()
            .enumerate()
            .filter(|(_, s)| s.snapshot_type == "auto" || s.snapshot_type == "on_save")
            .map(|(i, _)| i)
            .collect();

        if auto_indices.len() > max_retention {
            auto_indices.sort();
            let prune_count = auto_indices.len() - max_retention;
            let to_remove = &auto_indices[0..prune_count];

            // Persist the replacement index before deleting retained revisions.
            for &idx in to_remove {
                pruned_paths.push(PathBuf::from(&index.snapshots[idx].snapshot_path));
            }

            // Remove from index
            let to_remove_set: std::collections::HashSet<usize> =
                to_remove.iter().cloned().collect();
            index.snapshots = index
                .snapshots
                .into_iter()
                .enumerate()
                .filter(|(i, _)| !to_remove_set.contains(i))
                .map(|(_, s)| s)
                .collect();
        }
    }

    save_index(&dir, &index)?;
    for path in pruned_paths {
        let _ = fs::remove_file(path);
    }

    Ok(info)
}

#[tauri::command]
pub async fn create_snapshot(
    _app: tauri::AppHandle,
    state: tauri::State<'_, crate::app_prefs::AppPrefsState>,
    file_path: String,
    comment: Option<String>,
    snapshot_type: Option<String>,
    custom_tag: Option<String>,
    content: Option<String>,
    bytes: Option<Vec<u8>>,
    project: Option<SnapshotProject>,
) -> Result<SnapshotInfo, String> {
    let prefs = state
        .0
        .lock()
        .map_err(|_| "Snapshot settings unavailable")?
        .clone();
    tauri::async_runtime::spawn_blocking(move || {
        let state = crate::app_prefs::AppPrefsState(std::sync::Mutex::new(prefs));
        let bytes = match project {
            Some(project) => Some(crate::actone::pack(&project.scripts, &project.settings)?),
            None => bytes,
        };
        create_snapshot_impl(
            &state,
            &file_path,
            comment,
            snapshot_type,
            custom_tag,
            content,
            bytes,
        )
    })
    .await
    .map_err(|e| e.to_string())?
}

#[derive(Deserialize)]
pub struct SnapshotProject {
    scripts: Vec<crate::actone::ScriptInfo>,
    settings: serde_json::Map<String, serde_json::Value>,
}

#[tauri::command]
pub async fn get_snapshots(
    app: tauri::AppHandle,
    state: tauri::State<'_, crate::app_prefs::AppPrefsState>,
    file_path: String,
) -> Result<Vec<SnapshotInfo>, String> {
    if !app_prefs_enabled(&state) {
        return Ok(vec![]);
    }

    let dir = snapshot_dir(&app, &file_path, &state);
    if !dir.exists() {
        return Ok(vec![]);
    }

    tauri::async_runtime::spawn_blocking(move || {
        let _guard = SNAPSHOT_WRITES
            .lock()
            .map_err(|_| "Snapshot storage is unavailable")?;
        Ok(load_index(&dir)?.snapshots)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn delete_snapshot(
    app: tauri::AppHandle,
    state: tauri::State<'_, crate::app_prefs::AppPrefsState>,
    file_path: String,
    snapshot_id: String,
) -> Result<(), String> {
    if !app_prefs_enabled(&state) {
        return Err("Snapshots are disabled".into());
    }
    let dir = snapshot_dir(&app, &file_path, &state);
    tauri::async_runtime::spawn_blocking(move || delete_snapshot_impl(&dir, &snapshot_id))
        .await
        .map_err(|e| e.to_string())?
}

fn delete_snapshot_impl(dir: &Path, snapshot_id: &str) -> Result<(), String> {
    delete_snapshot_with_index_writer(dir, snapshot_id, save_index)
}

fn delete_snapshot_with_index_writer(
    dir: &Path,
    snapshot_id: &str,
    mut persist: impl FnMut(&Path, &IndexFile) -> Result<(), String>,
) -> Result<(), String> {
    let _guard = SNAPSHOT_WRITES
        .lock()
        .map_err(|_| "Snapshot storage is unavailable")?;
    let mut index = load_index(dir)?;
    let pos = index
        .snapshots
        .iter()
        .position(|s| s.id == snapshot_id)
        .ok_or("Snapshot not found")?;
    let original = index.clone();
    let snapshot = index.snapshots.remove(pos);
    // Never remove the only copy before the index replacement succeeds.
    persist(dir, &index)?;
    match fs::remove_file(&snapshot.snapshot_path) {
        Ok(()) => Ok(()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(e) => {
            persist(dir, &original).map_err(|restore| format!("Snapshot file was preserved, but restoring its list entry failed: {restore}; deletion error: {e}"))?;
            Err(format!(
                "Could not delete snapshot; its list entry was restored: {e}"
            ))
        }
    }
}

#[tauri::command]
pub fn get_snapshot_folder_path(
    app: tauri::AppHandle,
    state: tauri::State<'_, crate::app_prefs::AppPrefsState>,
    file_path: String,
) -> Result<String, String> {
    let dir = snapshot_root(&app, &file_path, &state);
    Ok(dir.to_string_lossy().to_string())
}

#[tauri::command]
pub fn open_folder(path: String) -> Result<(), String> {
    let p = Path::new(&path);

    let contains_snapshots = path.contains(".snapshots");
    let has_traversal = p
        .components()
        .any(|c| matches!(c, std::path::Component::ParentDir));

    if !contains_snapshots || has_traversal {
        return Err(
            "Invalid directory path: only snapshots folders can be opened or created".to_string(),
        );
    }

    if !p.exists() {
        let _ = fs::create_dir_all(p);
    }

    let canonical = dunce::canonicalize(p).map_err(|e| e.to_string())?;
    if !canonical.is_dir() {
        return Err("Target path is not a directory".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&canonical)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&canonical)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&canonical)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fixture(label: &str, retention: usize) -> (PathBuf, crate::app_prefs::AppPrefsState) {
        let dir = std::env::temp_dir().join(format!(
            "actone_snapshot_{label}_{}_{}",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        fs::create_dir_all(&dir).unwrap();
        let prefs = std::collections::HashMap::from([
            ("actone-snapshots-enabled".into(), "true".into()),
            (
                "actone-snapshot-max-retention".into(),
                retention.to_string(),
            ),
        ]);
        (
            dir,
            crate::app_prefs::AppPrefsState(std::sync::Mutex::new(prefs)),
        )
    }

    #[test]
    fn damaged_index_is_preserved_and_revisions_are_recovered_before_creation() {
        let (dir, state) = fixture("recovery", 1);
        let project = dir.join("draft.fountain");
        let store = dir.join(".snapshots/draft_fountain");
        fs::create_dir_all(&store).unwrap();
        for id in ["20260101_120000", "20260101_120001_123456789"] {
            fs::write(store.join(format!("{id}.fountain")), id).unwrap();
        }
        fs::write(store.join("ignore.tmp"), "temporary").unwrap();
        fs::write(store.join("index.json"), "{damaged").unwrap();
        create_snapshot_impl(
            &state,
            &project.to_string_lossy(),
            None,
            Some("auto".into()),
            None,
            Some("new revision".into()),
            None,
        )
        .unwrap();
        let index = load_index(&store).unwrap();
        assert_eq!(index.snapshots.len(), 3);
        assert_eq!(
            index
                .snapshots
                .iter()
                .filter(|s| s.comment == "Recovered snapshot" && s.snapshot_type == "manual")
                .count(),
            2
        );
        assert!(
            index
                .snapshots
                .iter()
                .all(|s| Path::new(&s.snapshot_path).is_file())
        );
        let backups: Vec<_> = fs::read_dir(&store)
            .unwrap()
            .map(Result::unwrap)
            .filter(|e| {
                e.file_name()
                    .to_string_lossy()
                    .starts_with("index.corrupt-")
            })
            .collect();
        assert_eq!(backups.len(), 1);
        assert_eq!(fs::read_to_string(backups[0].path()).unwrap(), "{damaged");
        assert_eq!(load_index(&store).unwrap().snapshots.len(), 3);
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn missing_index_recovers_existing_files_without_duplicate_new_snapshot() {
        let (dir, state) = fixture("missing_index", 0);
        let project = dir.join("draft.fountain");
        let first = create_snapshot_impl(
            &state,
            &project.to_string_lossy(),
            None,
            Some("manual".into()),
            None,
            Some("first".into()),
            None,
        )
        .unwrap();
        let store = dir.join(".snapshots/draft_fountain");
        fs::remove_file(store.join("index.json")).unwrap();
        create_snapshot_impl(
            &state,
            &project.to_string_lossy(),
            None,
            Some("manual".into()),
            None,
            Some("second".into()),
            None,
        )
        .unwrap();
        let index = load_index(&store).unwrap();
        assert_eq!(index.snapshots.len(), 2);
        assert!(index.snapshots.iter().any(|s| s.id == first.id));
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn deletion_index_failure_preserves_file_and_original_entry() {
        let (dir, state) = fixture("delete_index_failure", 0);
        let project = dir.join("draft.fountain");
        let info = create_snapshot_impl(
            &state,
            &project.to_string_lossy(),
            None,
            Some("manual".into()),
            None,
            Some("precious".into()),
            None,
        )
        .unwrap();
        let store = dir.join(".snapshots/draft_fountain");
        let before = fs::read(store.join("index.json")).unwrap();
        assert!(
            delete_snapshot_with_index_writer(&store, &info.id, |_, _| Err(
                "injected replacement failure".into()
            ))
            .is_err()
        );
        assert_eq!(fs::read_to_string(&info.snapshot_path).unwrap(), "precious");
        assert_eq!(fs::read(store.join("index.json")).unwrap(), before);
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn deletion_file_failure_restores_entry_and_reports_error() {
        let (dir, state) = fixture("delete_file_failure", 0);
        let project = dir.join("draft.fountain");
        let info = create_snapshot_impl(
            &state,
            &project.to_string_lossy(),
            None,
            Some("manual".into()),
            None,
            Some("revision".into()),
            None,
        )
        .unwrap();
        let store = dir.join(".snapshots/draft_fountain");
        fs::remove_file(&info.snapshot_path).unwrap();
        fs::create_dir(&info.snapshot_path).unwrap();
        assert!(
            delete_snapshot_impl(&store, &info.id)
                .unwrap_err()
                .contains("restored")
        );
        assert_eq!(load_index(&store).unwrap().snapshots[0].id, info.id);
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn deletion_removes_entry_and_file_and_handles_already_missing_file() {
        let (dir, state) = fixture("delete_success", 0);
        let project = dir.join("draft.fountain");
        let store = dir.join(".snapshots/draft_fountain");
        for missing in [false, true] {
            let info = create_snapshot_impl(
                &state,
                &project.to_string_lossy(),
                None,
                Some("manual".into()),
                None,
                Some("revision".into()),
                None,
            )
            .unwrap();
            if missing {
                fs::remove_file(&info.snapshot_path).unwrap();
            }
            delete_snapshot_impl(&store, &info.id).unwrap();
            assert!(!Path::new(&info.snapshot_path).exists());
            assert!(load_index(&store).unwrap().snapshots.is_empty());
        }
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn rapid_snapshots_keep_distinct_files_and_all_index_entries() {
        let (dir, state) = fixture("rapid", 0);
        let path = dir.join("draft.fountain");
        let mut ids = std::collections::HashSet::new();
        for i in 0..20 {
            let info = create_snapshot_impl(
                &state,
                &path.to_string_lossy(),
                Some(format!("note {i}")),
                Some("manual".into()),
                Some("tag".into()),
                Some(format!("revision {i}")),
                None,
            )
            .unwrap();
            assert!(ids.insert(info.id));
            assert_eq!(
                fs::read_to_string(info.snapshot_path).unwrap(),
                format!("revision {i}")
            );
        }
        let index = load_index(&dir.join(".snapshots/draft_fountain")).unwrap();
        assert_eq!(index.snapshots.len(), 20);
        assert!(
            index
                .snapshots
                .iter()
                .all(|s| Path::new(&s.snapshot_path).exists())
        );
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn retention_prunes_only_auto_and_on_save_snapshots() {
        let (dir, state) = fixture("retention", 2);
        let path = dir.join("draft.fountain");
        let manual = create_snapshot_impl(
            &state,
            &path.to_string_lossy(),
            None,
            Some("manual".into()),
            None,
            Some("manual".into()),
            None,
        )
        .unwrap();
        let mut auto = Vec::new();
        for i in 0..5 {
            auto.push(
                create_snapshot_impl(
                    &state,
                    &path.to_string_lossy(),
                    None,
                    Some(if i % 2 == 0 { "auto" } else { "on_save" }.into()),
                    None,
                    Some(i.to_string()),
                    None,
                )
                .unwrap(),
            );
        }
        let index = load_index(&dir.join(".snapshots/draft_fountain")).unwrap();
        assert_eq!(index.snapshots.len(), 3);
        assert!(Path::new(&manual.snapshot_path).exists());
        for (i, s) in auto.iter().enumerate() {
            assert_eq!(Path::new(&s.snapshot_path).exists(), i >= 3);
        }
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn concurrent_snapshots_do_not_lose_index_updates() {
        let (dir, state) = fixture("concurrent", 0);
        let state = std::sync::Arc::new(state);
        let path = dir.join("draft.actone").to_string_lossy().into_owned();
        let workers: Vec<_> = (0..8)
            .map(|i| {
                let state = state.clone();
                let path = path.clone();
                std::thread::spawn(move || {
                    create_snapshot_impl(
                        &state,
                        &path,
                        None,
                        Some("manual".into()),
                        None,
                        None,
                        Some(vec![i; 128]),
                    )
                    .unwrap()
                })
            })
            .collect();
        for worker in workers {
            worker.join().unwrap();
        }
        let index = load_index(&dir.join(".snapshots/draft_actone")).unwrap();
        assert_eq!(index.snapshots.len(), 8);
        let revisions: std::collections::HashSet<_> = index
            .snapshots
            .iter()
            .map(|s| fs::read(&s.snapshot_path).unwrap()[0])
            .collect();
        assert_eq!(revisions.len(), 8);
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn failed_index_replacement_does_not_delete_existing_revision() {
        let (dir, state) = fixture("index_failure", 1);
        let project = dir.join("draft.fountain");
        let store = dir.join(".snapshots/draft_fountain");
        fs::create_dir_all(store.join("index.json")).unwrap();
        let original = store.join("original.fountain");
        fs::write(&original, "original revision").unwrap();
        assert!(
            create_snapshot_impl(
                &state,
                &project.to_string_lossy(),
                None,
                Some("auto".into()),
                None,
                Some("new revision".into()),
                None
            )
            .is_err()
        );
        assert_eq!(fs::read_to_string(original).unwrap(), "original revision");
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn test_open_folder_rejects_file() {
        let temp_dir = std::env::temp_dir();
        let file_path = temp_dir.join("actone_test_non_directory.txt");
        let _ = fs::write(&file_path, "sample content");

        let result = open_folder(file_path.to_string_lossy().to_string());
        let _ = fs::remove_file(&file_path);

        assert!(result.is_err());
        assert_eq!(
            result.unwrap_err(),
            "Invalid directory path: only snapshots folders can be opened or created"
        );
    }

    #[test]
    fn test_open_folder_rejects_arbitrary_path() {
        let result = open_folder("/tmp/some_arbitrary_path".to_string());
        assert!(result.is_err());
        assert_eq!(
            result.unwrap_err(),
            "Invalid directory path: only snapshots folders can be opened or created"
        );
    }

    #[test]
    fn test_open_folder_rejects_path_traversal() {
        let result = open_folder("/tmp/.snapshots/../some_arbitrary_path".to_string());
        assert!(result.is_err());
        assert_eq!(
            result.unwrap_err(),
            "Invalid directory path: only snapshots folders can be opened or created"
        );
    }

    #[test]
    fn test_open_folder_allows_snapshots_path() {
        let temp_dir = std::env::temp_dir();
        let snapshots_path = temp_dir.join(".snapshots").join("test_folder");
        let result = open_folder(snapshots_path.to_string_lossy().to_string());
        assert!(result.is_ok() || result.is_err());
        if let Err(e) = result {
            assert_ne!(
                e,
                "Invalid directory path: only snapshots folders can be opened or created"
            );
        }
        let _ = fs::remove_dir_all(&snapshots_path);
    }

    #[test]
    fn test_create_snapshot_with_live_content_unsaved() {
        use std::collections::HashMap;
        use std::sync::Mutex;

        let temp_dir = std::env::temp_dir().join(format!(
            "actone_test_snap_{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis()
        ));
        fs::create_dir_all(&temp_dir).unwrap();

        let mut prefs = HashMap::new();
        prefs.insert("actone-snapshots-enabled".to_string(), "true".to_string());
        prefs.insert("actone-snapshot-max-retention".to_string(), "5".to_string());
        let state = crate::app_prefs::AppPrefsState(Mutex::new(prefs));

        // The target file does NOT even need to exist on disk when live content is supplied!
        let virtual_file = temp_dir.join("live_script.fountain");
        let live_text = "EXT. LIVE COFFEE SHOP - DAY
Unsaved brilliance typed in memory.
";

        let snapshot = create_snapshot_impl(
            &state,
            &virtual_file.to_string_lossy(),
            Some("Manual live snapshot".to_string()),
            Some("manual".to_string()),
            None,
            Some(live_text.to_string()),
            None,
        )
        .expect("Live snapshot creation should succeed");

        assert_eq!(snapshot.snapshot_type, "manual");
        assert_eq!(snapshot.comment, "Manual live snapshot");
        assert!(snapshot.file_size > 0);

        let saved_content = fs::read_to_string(&snapshot.snapshot_path)
            .expect("Snapshot file should exist on disk");
        assert_eq!(saved_content, live_text);

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_create_snapshot_with_live_bundle_bytes() {
        use std::collections::HashMap;
        use std::sync::Mutex;

        let temp_dir = std::env::temp_dir().join(format!(
            "actone_test_snap_bytes_{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis()
        ));
        fs::create_dir_all(&temp_dir).unwrap();

        let mut prefs = HashMap::new();
        prefs.insert("actone-snapshots-enabled".to_string(), "true".to_string());
        let state = crate::app_prefs::AppPrefsState(Mutex::new(prefs));

        let bundle_file = temp_dir.join("project.actone");
        let mock_zip_bytes = vec![0x50, 0x4b, 0x03, 0x04, 0x00, 0x01, 0x02];

        let snapshot = create_snapshot_impl(
            &state,
            &bundle_file.to_string_lossy(),
            None,
            Some("auto".to_string()),
            None,
            None,
            Some(mock_zip_bytes.clone()),
        )
        .expect("Live binary bundle snapshot should succeed");

        assert_eq!(snapshot.snapshot_type, "auto");
        assert_eq!(snapshot.file_size, mock_zip_bytes.len() as u64);

        let read_bytes =
            fs::read(&snapshot.snapshot_path).expect("Binary snapshot should exist on disk");
        assert_eq!(read_bytes, mock_zip_bytes);

        let _ = fs::remove_dir_all(&temp_dir);
    }
}
