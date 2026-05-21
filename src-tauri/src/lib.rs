use std::fs;

#[tauri::command]
fn open_file_dialog() -> Option<serde_json::Value> {
    let file = rfd::FileDialog::new()
        .add_filter("Fountain Screenplays", &["fountain", "txt"])
        .pick_file();
        
    if let Some(path) = file {
        if let Ok(content) = fs::read_to_string(&path) {
            return Some(serde_json::json!({
                "path": path.to_string_lossy(),
                "content": content
            }));
        }
    }
    None
}

#[tauri::command]
fn save_file_content(path: String, content: String) -> Result<(), String> {
    fs::write(path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_file_dialog(content: String) -> Option<String> {
    let file = rfd::FileDialog::new()
        .add_filter("Fountain Screenplays", &["fountain"])
        .save_file();
        
    if let Some(path) = file {
        if let Ok(_) = fs::write(&path, content) {
            return Some(path.to_string_lossy().to_string());
        }
    }
    None
}

#[tauri::command]
fn save_pdf_dialog(bytes: Vec<u8>) -> Option<String> {
    let file = rfd::FileDialog::new()
        .add_filter("PDF Document", &["pdf"])
        .save_file();
        
    if let Some(path) = file {
        if let Ok(_) = fs::write(&path, bytes) {
            return Some(path.to_string_lossy().to_string());
        }
    }
    None
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            open_file_dialog,
            save_file_content,
            save_file_dialog,
            save_pdf_dialog
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

