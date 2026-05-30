use std::fs;

pub mod pdf;
mod structures;

#[tauri::command]
fn open_file_dialog() -> Option<serde_json::Value> {
    let file = rfd::FileDialog::new()
        .add_filter("ActOne Bundle", &["actone"])
        .add_filter("Fountain Screenplays", &["fountain", "txt"])
        .pick_file()?;
        
    let path_str = file.to_string_lossy().to_string();
    if path_str.ends_with(".actone") {
        return Some(serde_json::json!({
            "path": path_str,
            "content": ""
        }));
    }

    let content = fs::read_to_string(&file).ok()?;
    Some(serde_json::json!({
        "path": path_str,
        "content": content
    }))
}

#[tauri::command]
fn save_file_content(path: String, content: String) -> Result<(), String> {
    fs::write(path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_file_dialog(content: String) -> Option<String> {
    let file = rfd::FileDialog::new()
        .add_filter("ActOne Bundle", &["actone"])
        .add_filter("Fountain Screenplays", &["fountain"])
        .save_file()?;
        
    let mut file_path = file;
    if file_path.extension().is_none() {
        file_path.set_extension("actone");
    }

    let path = file_path.to_string_lossy().to_string();
    if path.ends_with(".actone") {
        return Some(path);
    }

    if fs::write(&file_path, content).is_ok() {
        return Some(path);
    }
    None
}

#[tauri::command]
fn read_file_binary(path: String) -> Result<Vec<u8>, String> {
    fs::read(path).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_file_binary(path: String, bytes: Vec<u8>) -> Result<(), String> {
    fs::write(path, bytes).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_pdf_dialog(bytes: Vec<u8>) -> Option<String> {
    let file = rfd::FileDialog::new()
        .add_filter("PDF Document", &["pdf"])
        .save_file()?;
        
    if fs::write(&file, bytes).is_ok() {
        return Some(file.to_string_lossy().to_string());
    }
    None
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
fn export_pdf(
    fountain_text: String,
    paper_size: String,
    font_family: String,
    bold_scene_headings: bool,
    mirror_scene_numbers: String,
    export_sections: bool,
    export_synopses: bool,
    export_title_page: bool,
    revised_lines: Vec<bool>,
) -> Option<String> {
    let file = rfd::FileDialog::new()
        .add_filter("PDF Document", &["pdf"])
        .save_file()?;
        
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
        revised_lines,
        export_title_page,
    };
    if pdf::export_to_pdf(&fountain_text, &file, config).is_ok() {
        return Some(file.to_string_lossy().to_string());
    }
    None
}

#[tauri::command]
fn export_fountain(content: String) -> Option<String> {
    let file = rfd::FileDialog::new()
        .add_filter("Fountain Screenplay", &["fountain"])
        .save_file()?;

    if fs::write(&file, &content).is_ok() {
        return Some(file.to_string_lossy().to_string());
    }
    None
}

#[tauri::command]
fn read_file_content(path: String) -> Result<String, String> {
    fs::read_to_string(path).map_err(|e| e.to_string())
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
            read_file_content,
            read_file_binary,
            save_file_binary,
            structures::get_structures,
            structures::get_structure_template
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}