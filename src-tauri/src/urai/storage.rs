use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use tauri::Manager;
fn location(window: &tauri::WebviewWindow, key: &str) -> Result<std::path::PathBuf, String> {
    if key.is_empty() || key.len() > 8192 {
        return Err("Invalid conversation identity.".into());
    }
    let hash = format!("{:x}", Sha256::digest(key.as_bytes()));
    let dir = window
        .app_handle()
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("urai-conversations");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join(format!("{hash}.json")))
}
#[tauri::command]
pub fn urai_load_sessions(
    window: tauri::WebviewWindow,
    key: String,
) -> Result<Option<Value>, String> {
    let path = location(&window, &key)?;
    if !path.exists() {
        return Ok(None);
    }
    let data: Value = serde_json::from_slice(&std::fs::read(path).map_err(|e| e.to_string())?)
        .map_err(|_| "Invalid conversation file.")?;
    if data["key"] != key {
        return Err("Conversation identity mismatch.".into());
    }
    Ok(Some(data["sessions"].clone()))
}
#[tauri::command]
pub fn urai_save_sessions(
    window: tauri::WebviewWindow,
    key: String,
    sessions: Value,
) -> Result<(), String> {
    if !sessions.is_array() {
        return Err("Invalid conversations.".into());
    }
    let text = serde_json::to_string(&json!({"key":key,"sessions":sessions}))
        .map_err(|e| e.to_string())?;
    if text.len() > 16 * 1024 * 1024 {
        return Err(
            "Conversation storage limit reached. Export or clear older conversations.".into(),
        );
    }
    super::super::write_file_atomically(&location(&window, &key)?, text)
}
