use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::SystemTime;
use std::time::UNIX_EPOCH;

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
        "{:04}{:02}{:02}_{:02}{:02}{:02}",
        y, m, d, hours, minutes, seconds
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

fn load_index(dir: &Path) -> IndexFile {
    let path = dir.join("index.json");
    if path.exists() {
        fs::read_to_string(&path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or(IndexFile {
                version: 1,
                file_path: String::new(),
                snapshots: vec![],
            })
    } else {
        IndexFile {
            version: 1,
            file_path: String::new(),
            snapshots: vec![],
        }
    }
}

fn save_index(dir: &Path, index: &IndexFile) -> Result<(), String> {
    fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    let json = serde_json::to_string_pretty(index).map_err(|e| e.to_string())?;
    fs::write(dir.join("index.json"), json).map_err(|e| e.to_string())
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

    let ext = source
        .extension()
        .map(|e| e.to_string_lossy().to_string())
        .unwrap_or_else(|| "actone".to_string());
    let (id, iso) = format_timestamp();
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

    let mut index = load_index(&dir);
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

            // Physically delete files
            for &idx in to_remove {
                let path = PathBuf::from(&index.snapshots[idx].snapshot_path);
                if path.exists() {
                    let _ = fs::remove_file(path);
                }
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

    Ok(info)
}

#[tauri::command]
pub fn create_snapshot(
    _app: tauri::AppHandle,
    state: tauri::State<'_, crate::app_prefs::AppPrefsState>,
    file_path: String,
    comment: Option<String>,
    snapshot_type: Option<String>,
    custom_tag: Option<String>,
    content: Option<String>,
    bytes: Option<Vec<u8>>,
) -> Result<SnapshotInfo, String> {
    create_snapshot_impl(&state, &file_path, comment, snapshot_type, custom_tag, content, bytes)
}

#[tauri::command]
pub fn get_snapshots(
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

    let index = load_index(&dir);
    Ok(index.snapshots)
}

#[tauri::command]
pub fn delete_snapshot(
    app: tauri::AppHandle,
    state: tauri::State<'_, crate::app_prefs::AppPrefsState>,
    file_path: String,
    snapshot_id: String,
) -> Result<(), String> {
    if !app_prefs_enabled(&state) {
        return Err("Snapshots are disabled".to_string());
    }

    let dir = snapshot_dir(&app, &file_path, &state);
    let mut index = load_index(&dir);

    let pos = index
        .snapshots
        .iter()
        .position(|s| s.id == snapshot_id)
        .ok_or_else(|| "Snapshot not found".to_string())?;

    let snapshot = &index.snapshots[pos];
    let _ = fs::remove_file(&snapshot.snapshot_path);

    index.snapshots.remove(pos);
    save_index(&dir, &index)?;

    Ok(())
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

        let temp_dir = std::env::temp_dir().join(format!("actone_test_snap_{}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis()));
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
        ).expect("Live snapshot creation should succeed");

        assert_eq!(snapshot.snapshot_type, "manual");
        assert_eq!(snapshot.comment, "Manual live snapshot");
        assert!(snapshot.file_size > 0);

        let saved_content = fs::read_to_string(&snapshot.snapshot_path).expect("Snapshot file should exist on disk");
        assert_eq!(saved_content, live_text);

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_create_snapshot_with_live_bundle_bytes() {
        use std::collections::HashMap;
        use std::sync::Mutex;

        let temp_dir = std::env::temp_dir().join(format!("actone_test_snap_bytes_{}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis()));
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
        ).expect("Live binary bundle snapshot should succeed");

        assert_eq!(snapshot.snapshot_type, "auto");
        assert_eq!(snapshot.file_size, mock_zip_bytes.len() as u64);

        let read_bytes = fs::read(&snapshot.snapshot_path).expect("Binary snapshot should exist on disk");
        assert_eq!(read_bytes, mock_zip_bytes);

        let _ = fs::remove_dir_all(&temp_dir);
    }
}
