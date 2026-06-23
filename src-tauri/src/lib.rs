use std::fs;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::Emitter;

static CLI_ARGS_READ: AtomicBool = AtomicBool::new(false);

pub mod pdf;
mod structures;

#[tauri::command]
fn open_file_dialog() -> Option<serde_json::Value> {
    let file = rfd::FileDialog::new()
        .add_filter("ActOne Bundle", &["actone"])
        .add_filter("Fountain Screenplays", &["fountain", "txt"])
        .pick_file()?;

    let path_str = file.to_string_lossy().to_string();
    if path_str.to_ascii_lowercase().ends_with(".actone") {
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
fn import_fountain_dialog() -> Option<serde_json::Value> {
    let file = rfd::FileDialog::new()
        .add_filter("Fountain Files", &["fountain", "txt"])
        .pick_file()?;
    let path_str = file.to_string_lossy().to_string();
    let content = fs::read_to_string(&file).ok()?;
    Some(serde_json::json!({ "path": path_str, "content": content }))
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
    if let Some(ext) = file_path.extension() {
        if ext.to_string_lossy().to_ascii_lowercase() == "actone" {
            file_path.set_extension("actone");
        }
    } else {
        file_path.set_extension("actone");
    }

    let path = file_path.to_string_lossy().to_string();
    if path.to_ascii_lowercase().ends_with(".actone") {
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
fn file_exists(path: String) -> bool {
    std::path::Path::new(&path).exists()
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
    } else if font_family == "courier-prime" {
        "courier_prime".to_string()
    } else {
        font_family
    };
    let mirror = match mirror_scene_numbers.as_str() {
        "left_side" => pdf::MirrorOption::LeftSide,
        "mirror" => pdf::MirrorOption::Mirror,
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
#[allow(clippy::too_many_arguments)]
fn get_page_breaks(
    fountain_text: String,
    paper_size: String,
    font_family: String,
    bold_scene_headings: bool,
    mirror_scene_numbers: String,
    export_sections: bool,
    export_synopses: bool,
    export_title_page: bool,
    revised_lines: Vec<bool>,
) -> Option<Vec<usize>> {
    let paper = if paper_size == "letter" {
        pdf::LETTER
    } else {
        pdf::A4
    };
    let export_font = if font_family == "courier-prime-sans" {
        "courier_prime_sans".to_string()
    } else if font_family == "courier-prime" {
        "courier_prime".to_string()
    } else {
        font_family
    };
    let mirror = match mirror_scene_numbers.as_str() {
        "left_side" => pdf::MirrorOption::LeftSide,
        "mirror" => pdf::MirrorOption::Mirror,
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
    pdf::get_page_breaks(&fountain_text, config).ok()
}

#[tauri::command]
fn pick_directory() -> Option<String> {
    let dir = rfd::FileDialog::new().pick_folder()?;
    Some(dir.to_string_lossy().to_string())
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
fn generate_pdf_bytes(
    fountain_text: String,
    paper_size: String,
    font_family: String,
    bold_scene_headings: bool,
    mirror_scene_numbers: String,
    export_sections: bool,
    export_synopses: bool,
    export_title_page: bool,
    revised_lines: Vec<bool>,
) -> Option<Vec<u8>> {
    let paper = if paper_size == "letter" {
        pdf::LETTER
    } else {
        pdf::A4
    };
    let export_font = if font_family == "courier-prime-sans" {
        "courier_prime_sans".to_string()
    } else if font_family == "courier-prime" {
        "courier_prime".to_string()
    } else {
        font_family
    };
    let mirror = match mirror_scene_numbers.as_str() {
        "left_side" => pdf::MirrorOption::LeftSide,
        "mirror" => pdf::MirrorOption::Mirror,
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
    pdf::generate_pdf_bytes(&fountain_text, config).ok()
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
fn export_csv(content: String) -> Option<String> {
    let file = rfd::FileDialog::new()
        .add_filter("CSV Spreadsheet", &["csv"])
        .save_file()?;

    let mut file_path = file;
    if file_path.extension().is_none() {
        file_path.set_extension("csv");
    }

    if fs::write(&file_path, &content).is_ok() {
        return Some(file_path.to_string_lossy().to_string());
    }
    None
}

#[tauri::command]
fn export_fdx(fountain_text: String) -> Option<String> {
    let file = rfd::FileDialog::new()
        .add_filter("Final Draft File", &["fdx"])
        .save_file()?;

    let screenplay = pdf::parse(&fountain_text);
    let fdx_content = pdf::export_to_fdx(&screenplay);
    if fs::write(&file, &fdx_content).is_ok() {
        return Some(file.to_string_lossy().to_string());
    }
    None
}

#[tauri::command]
fn generate_fdx_string(fountain_text: String) -> String {
    let screenplay = pdf::parse(&fountain_text);
    pdf::export_to_fdx(&screenplay)
}

#[tauri::command]
fn read_file_content(path: String) -> Result<String, String> {
    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_system_fonts() -> Result<Vec<String>, String> {
    use font_kit::source::SystemSource;
    let source = SystemSource::new();
    match source.all_families() {
        Ok(mut families) => {
            families.sort_by(|a, b| a.to_lowercase().cmp(&b.to_lowercase()));
            Ok(families)
        }
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn get_cli_args() -> Vec<String> {
    if CLI_ARGS_READ.swap(true, Ordering::SeqCst) {
        return vec![];
    }
    let args: Vec<String> = std::env::args().skip(1).collect();
    args.into_iter()
        .filter(|p| {
            let lp = p.to_ascii_lowercase();
            lp.ends_with(".actone") || lp.ends_with(".fountain") || lp.ends_with(".txt")
        })
        .collect()
}

#[tauri::command]
async fn check_microsoft_store_license() -> Result<bool, String> {
    #[cfg(all(target_os = "windows", not(debug_assertions)))]
    {
        use windows::Services::Store::StoreContext;
        let context = StoreContext::GetDefault().map_err(|e| e.to_string())?;
        let app_license = context.GetAppLicenseAsync()
            .map_err(|e| e.to_string())?
            .await
            .map_err(|e| e.to_string())?;

        let is_active = app_license.IsActive().map_err(|e| e.to_string())?;
        Ok(is_active)
    }

    #[cfg(any(not(target_os = "windows"), debug_assertions))]
    {
        Ok(true)
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(move |app| {

            let args: Vec<String> = std::env::args().skip(1).collect();
            let filtered: Vec<String> = args.into_iter()
                .filter(|p| {
                    let lp = p.to_ascii_lowercase();
                    lp.ends_with(".actone") || lp.ends_with(".fountain") || lp.ends_with(".txt")
                })
                .collect();
            if !filtered.is_empty() {
                let _ = app.emit("file-opened", filtered);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            open_file_dialog,
            save_file_content,
            save_file_dialog,
            save_pdf_dialog,
            export_pdf,
            export_fountain,
            export_csv,
            export_fdx,
            pick_directory,
            generate_pdf_bytes,
            read_file_content,
            read_file_binary,
            file_exists,
            save_file_binary,
            structures::get_structures,
            structures::get_structure_template,
            get_system_fonts,
            get_page_breaks,
            get_cli_args,
            generate_fdx_string,
            import_fountain_dialog,
            check_microsoft_store_license
        ]);

    builder
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app_handle, _event| {
            #[cfg(any(target_os = "macos", target_os = "ios", target_os = "android"))]
            if let tauri::RunEvent::Opened { urls } = event {
                let paths: Vec<String> = urls.iter()
                    .map(|u| {
                        let s = u.as_str();
                        s.strip_prefix("file://").unwrap_or(s).to_string()
                    })
                    .collect();
                let filtered: Vec<String> = paths.into_iter()
                    .filter(|p| {
                        let lp = p.to_ascii_lowercase();
                        lp.ends_with(".actone") || lp.ends_with(".fountain") || lp.ends_with(".txt")
                    })
                    .collect();
                if !filtered.is_empty() {
                    let _ = app_handle.emit("file-opened", filtered);
                }
            }
        });
}