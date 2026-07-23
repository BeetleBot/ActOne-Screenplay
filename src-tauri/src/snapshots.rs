use std::fs;
use std::path::{Path, PathBuf};
use std::time::SystemTime;
use std::time::UNIX_EPOCH;
use serde::{Deserialize, Serialize};
use tauri::Manager;

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
    let duration = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default();
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
        if remaining < days_in_year { break; }
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
        if remaining < md as i64 { break; }
        remaining -= md as i64;
        m += 1;
    }
    let d = remaining + 1;

    let id = format!("{:04}{:02}{:02}_{:02}{:02}{:02}",
        y, m, d, hours, minutes, seconds);

    let iso = format!("{:04}-{:02}-{:02}T{:02}:{:02}:{:02}.{:03}Z",
        y, m, d, hours, minutes, seconds, millis);

    (id, iso)
}

fn is_leap(year: i64) -> bool {
    (year % 4 == 0 && year % 100 != 0) || year % 400 == 0
}

fn sanitize_folder_name(file_path: &str) -> String {
    let path = Path::new(file_path);
    let stem = path.file_stem().unwrap_or_default().to_string_lossy();
    let ext = path.extension().map(|e| e.to_string_lossy().to_string()).unwrap_or_default();
    if ext.is_empty() {
        stem.to_string()
    } else {
        format!("{}_{}", stem, ext)
    }
}

fn snapshot_root<A: tauri::Runtime>(
    app: &tauri::AppHandle<A>,
    file_path: &str,
    state: &crate::app_prefs::AppPrefsState,
) -> PathBuf {
    let prefs = state.0.lock().unwrap_or_else(|e| e.into_inner());
    let location = prefs.get("actone-snapshot-location").map(|s| s.as_str()).unwrap_or("project");
    let custom_path = prefs.get("actone-snapshot-custom-path").cloned().unwrap_or_default();

    match location {
        "project" => {
            Path::new(file_path).parent().unwrap_or(Path::new(".")).join(".snapshots")
        }
        "custom" if !custom_path.is_empty() => {
            PathBuf::from(&custom_path)
        }
        _ => {
            app.path().app_data_dir()
                .unwrap_or_else(|_| PathBuf::from("."))
                .join("snapshots")
        }
    }
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
    state.0.lock()
        .map(|p| p.get("actone-snapshots-enabled").map(|s| s == "true").unwrap_or(false))
        .unwrap_or(false)
}

#[tauri::command]
pub fn create_snapshot(
    app: tauri::AppHandle,
    state: tauri::State<'_, crate::app_prefs::AppPrefsState>,
    file_path: String,
    comment: Option<String>,
    snapshot_type: Option<String>,
    custom_tag: Option<String>,
) -> Result<SnapshotInfo, String> {
    if !app_prefs_enabled(&state) {
        return Err("Snapshots are disabled".to_string());
    }

    let source = Path::new(&file_path);
    if !source.exists() {
        return Err("File does not exist".to_string());
    }

    let dir = snapshot_dir(&app, &file_path, &state);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    let ext = source.extension()
        .map(|e| e.to_string_lossy().to_string())
        .unwrap_or_else(|| "actone".to_string());
    let (id, iso) = format_timestamp();
    let filename = format!("{}.{}", id, ext);
    let dest = dir.join(&filename);

    fs::copy(source, &dest).map_err(|e| e.to_string())?;

    let file_size = fs::metadata(&dest).map(|m| m.len()).unwrap_or(0);

    let mut index = load_index(&dir);
    // Use dunce for cross-platform path canonicalization
    let canonical_source = dunce::canonicalize(source)
        .unwrap_or_else(|_| source.to_path_buf());
    let canonical_dest = dunce::canonicalize(&dest)
        .unwrap_or_else(|_| dest.clone());
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
    let max_retention = state.0.lock()
        .map(|p| p.get("actone-snapshot-max-retention")
            .and_then(|s| s.parse::<usize>().ok())
            .unwrap_or(20))
        .unwrap_or(20);

    if max_retention > 0 {
        let mut auto_indices: Vec<usize> = index.snapshots.iter().enumerate()
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
            let to_remove_set: std::collections::HashSet<usize> = to_remove.iter().cloned().collect();
            index.snapshots = index.snapshots.into_iter().enumerate()
                .filter(|(i, _)| !to_remove_set.contains(i))
                .map(|(_, s)| s)
                .collect();
        }
    }

    save_index(&dir, &index)?;

    Ok(info)
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

    let pos = index.snapshots.iter().position(|s| s.id == snapshot_id)
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
    let dir = snapshot_dir(&app, &file_path, &state);
    Ok(dir.to_string_lossy().to_string())
}

#[tauri::command]
pub fn open_folder(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if !p.exists() {
        let _ = fs::create_dir_all(p);
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}
