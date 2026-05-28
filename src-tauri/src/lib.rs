use std::fs;

mod pdf;
mod structures;

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

#[tauri::command]
fn export_pdf(
    fountain_text: String,
    paper_size: String,
    font_family: String,
    bold_scene_headings: bool,
    mirror_scene_numbers: String,
    export_sections: bool,
    export_synopses: bool,
    export_title_page: bool,
) -> Option<String> {
    let file = rfd::FileDialog::new()
        .add_filter("PDF Document", &["pdf"])
        .save_file();
        
    if let Some(path) = file {
        let paper = if paper_size == "letter" {
            pdf::LETTER
        } else {
            pdf::A4
        };
        let export_font = if font_family == "courier-prime-sans" {
            "courier_prime_sans".to_string()
        } else {
            "courier_prime".to_string()
        };
        let mirror = match mirror_scene_numbers.as_str() {
            "always" => pdf::MirrorOption::Always,
            "export_only" => pdf::MirrorOption::ExportOnly,
            _ => pdf::MirrorOption::Off,
        };
        let config = pdf::PdfExportConfig {
            paper_size: paper,
            bold_scene_headings,
            mirror_scene_numbers: mirror,
            export_sections,
            export_synopses,
            export_font,
            revised_lines: vec![],
            export_title_page,
        };
        if let Ok(_) = pdf::export_to_pdf(&fountain_text, &path, config) {
            return Some(path.to_string_lossy().to_string());
        }
    }
    None
}

#[tauri::command]
fn export_fountain(content: String) -> Option<String> {
    let file = rfd::FileDialog::new()
        .add_filter("Fountain Screenplay", &["fountain"])
        .save_file();

    if let Some(path) = file {
        if let Ok(_) = fs::write(&path, &content) {
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
            save_pdf_dialog,
            export_pdf,
            export_fountain,
            structures::get_structures
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

