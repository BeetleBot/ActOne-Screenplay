use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Emitter;
use tauri::Manager;

pub struct AppPrefsState(pub Mutex<HashMap<String, String>>);

fn prefs_file_path(app: &tauri::AppHandle) -> PathBuf {
    app.path().app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("actone-prefs.json")
}

pub fn apply_app_icon(app: &tauri::AppHandle, use_dark: bool) -> Result<(), String> {
    let bytes = if use_dark {
        include_bytes!("../../assets/Logos And Icons/Logos/newlogodark.png") as &[u8]
    } else {
        include_bytes!("../../assets/Logos And Icons/Logos/newlogo.png") as &[u8]
    };

    // Parse the PNG bytes using the image crate
    let img = image::load_from_memory(bytes)
        .map_err(|e| format!("Failed to parse image bytes: {}", e))?
        .to_rgba8();
    
    let (width, height) = img.dimensions();
    let raw_rgba = img.into_raw();

    let image = tauri::image::Image::new_owned(raw_rgba, width, height);

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
pub fn set_app_prefs(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppPrefsState>,
    prefs: HashMap<String, String>,
) -> Result<(), String> {
    let mut current = state.0.lock().map_err(|e| e.to_string())?;
    for (k, v) in &prefs {
        current.insert(k.clone(), v.clone());
    }
    let merged = current.clone();
    drop(current);

    if let Some(icon_pref) = prefs.get("actone-app-icon") {
        let use_dark = icon_pref == "dark";
        let _ = apply_app_icon(&app, use_dark);
    }

    let file_path = prefs_file_path(&app);
    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string(&merged).map_err(|e| e.to_string())?;
    fs::write(&file_path, json).map_err(|e| e.to_string())?;

    app.emit("app-prefs:changed", merged).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn load_prefs(app: &tauri::AppHandle) -> HashMap<String, String> {
    let path = prefs_file_path(app);
    if path.exists() {
        fs::read_to_string(&path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default()
    } else {
        HashMap::new()
    }
}
