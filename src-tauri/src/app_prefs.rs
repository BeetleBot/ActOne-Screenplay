use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};
use tauri::{Emitter, Manager};

pub struct AppPrefsState(pub Mutex<HashMap<String, String>>);
// Resolve storage once at startup. Tests supply an isolated location through the same state.
pub struct PrefsStorage(pub PathBuf);
static HELD_ICONS: OnceLock<Mutex<Vec<tauri::image::Image>>> = OnceLock::new();

pub fn prefs_file_path<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> PathBuf {
    if let Some(storage) = app.try_state::<PrefsStorage>() {
        return storage.0.clone();
    }
    app.path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("actone-prefs.json")
}

pub fn apply_app_icon<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    use_dark: bool,
) -> Result<(), String> {
    let bytes = if use_dark {
        include_bytes!("../../assets/Logos And Icons/Logos/newlogodark.png") as &[u8]
    } else {
        include_bytes!("../../assets/Logos And Icons/Logos/newlogo.png") as &[u8]
    };
    let img = image::load_from_memory(bytes)
        .map_err(|e| format!("Failed to parse image bytes: {}", e))?
        .to_rgba8();
    let (width, height) = img.dimensions();
    let image = tauri::image::Image::new_owned(img.into_raw(), width, height);
    // Native windows may retain the icon after this call returns.
    let icons_mutex = HELD_ICONS.get_or_init(|| Mutex::new(Vec::new()));
    if let Ok(mut guard) = icons_mutex.lock() {
        guard.push(image.clone());
        if guard.len() > 5 {
            guard.remove(0);
        }
    }
    for window in app.webview_windows().values() {
        let _ = window.set_icon(image.clone());
    }
    Ok(())
}

#[tauri::command]
pub fn get_app_prefs(state: tauri::State<'_, AppPrefsState>) -> HashMap<String, String> {
    state.0.lock().unwrap_or_else(|e| e.into_inner()).clone()
}

#[tauri::command]
pub fn set_app_prefs<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    state: tauri::State<'_, AppPrefsState>,
    prefs: HashMap<String, String>,
) -> Result<(), String> {
    let mut current = state.0.lock().map_err(|e| e.to_string())?;
    let mut merged = current.clone();
    merged.extend(prefs.clone());
    let file_path = prefs_file_path(&app);
    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string(&merged).map_err(|e| e.to_string())?;
    // Hold the lock through persistence so concurrent windows cannot overwrite a newer commit.
    crate::write_file_atomically(&file_path, json)?;
    *current = merged.clone();
    drop(current);
    app.emit("app-prefs:changed", merged)
        .map_err(|e| e.to_string())?;
    if let Some(icon_pref) = prefs.get("actone-app-icon") {
        let _ = apply_app_icon(&app, icon_pref == "dark");
    }
    Ok(())
}

pub fn load_prefs<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> HashMap<String, String> {
    fs::read_to_string(prefs_file_path(app))
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}
