use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use serde::{Deserialize, Serialize};
use tauri::Emitter;
use tauri::Manager;

#[derive(Clone, Serialize, Deserialize)]
pub struct ThemeState {
    theme_id: String,
    app_scale: u32,
    custom_themes: String,
}

impl Default for ThemeState {
    fn default() -> Self {
        Self {
            theme_id: "light".to_string(),
            app_scale: 100,
            custom_themes: "[]".to_string(),
        }
    }
}

struct ThemeConfig(Mutex<ThemeState>);

fn theme_file_path(app: &tauri::AppHandle) -> PathBuf {
    app.path().app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("actone-theme.json")
}

#[tauri::command]
fn get_theme_state(state: tauri::State<'_, ThemeConfig>) -> ThemeState {
    state.0.lock().unwrap_or_else(|e| e.into_inner()).clone()
}

#[tauri::command]
fn set_theme_state(
    app: tauri::AppHandle,
    state: tauri::State<'_, ThemeConfig>,
    theme_id: Option<String>,
    app_scale: Option<u32>,
    custom_themes: Option<String>,
) -> Result<(), String> {
    let mut current = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(id) = theme_id { current.theme_id = id; }
    if let Some(scale) = app_scale { current.app_scale = scale; }
    if let Some(themes) = custom_themes { current.custom_themes = themes; }
    let saved = current.clone();
    drop(current);

    let file_path = theme_file_path(&app);
    if let Some(parent) = file_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string(&saved).map_err(|e| e.to_string())?;
    std::fs::write(&file_path, json).map_err(|e| e.to_string())?;

    app.emit("theme:state-changed", saved).map_err(|e| e.to_string())?;
    Ok(())
}

static CLI_ARGS_READ: AtomicBool = AtomicBool::new(false);

pub mod pdf;
mod structures;
mod font_cache;
mod app_prefs;
mod snapshots;

#[tauri::command]
fn open_file_dialog() -> Option<serde_json::Value> {
    let file = rfd::FileDialog::new()
        .add_filter("ActOne & Fountain", &["actone", "fountain", "txt"])
        .add_filter("All Files", &["*"])
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
    element_formats: String,
    mirror_scene_numbers: String,
    export_sections: bool,
    export_synopses: bool,
    export_title_page: bool,
    export_scene_colors: Option<bool>,
    revised_lines: Vec<bool>,
    watermark_header_enabled: Option<bool>,
    watermark_header_text: Option<String>,
    watermark_header_opacity: Option<f32>,
    watermark_footer_enabled: Option<bool>,
    watermark_footer_text: Option<String>,
    watermark_footer_opacity: Option<f32>,
    watermark_center_enabled: Option<bool>,
    watermark_center_type: Option<String>,
    watermark_center_text: Option<String>,
    watermark_center_image_path: Option<String>,
    watermark_center_opacity: Option<f32>,
    watermark_center_grayscale: Option<bool>,
    script_fonts: Option<String>,
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
    let formats: pdf::ElementFormats = serde_json::from_str(&element_formats).unwrap_or_default();
    let config = pdf::PdfExportConfig {
        paper_size: paper,
        element_formats: formats,
        mirror_scene_numbers: mirror,
        export_sections,
        export_synopses,
        export_font,
        revised_lines,
        export_title_page,
        export_scene_colors: export_scene_colors.unwrap_or(false),
        watermark_header_enabled: watermark_header_enabled.unwrap_or(false),
        watermark_header_text: watermark_header_text.unwrap_or_default(),
        watermark_header_opacity: watermark_header_opacity.unwrap_or(1.0),
        watermark_footer_enabled: watermark_footer_enabled.unwrap_or(false),
        watermark_footer_text: watermark_footer_text.unwrap_or_default(),
        watermark_footer_opacity: watermark_footer_opacity.unwrap_or(1.0),
        watermark_center_enabled: watermark_center_enabled.unwrap_or(false),
        watermark_center_type: watermark_center_type.unwrap_or_else(|| "text".to_string()),
        watermark_center_text: watermark_center_text.unwrap_or_default(),
        watermark_center_image_path: watermark_center_image_path.unwrap_or_default(),
        watermark_center_opacity: watermark_center_opacity.unwrap_or(0.4),
        watermark_center_grayscale: watermark_center_grayscale.unwrap_or(false),
        script_fonts: serde_json::from_str(&script_fonts.unwrap_or_default()).unwrap_or_default(),
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
    element_formats: String,
    mirror_scene_numbers: String,
    export_sections: bool,
    export_synopses: bool,
    export_title_page: bool,
    export_scene_colors: Option<bool>,
    revised_lines: Vec<bool>,
    watermark_header_enabled: Option<bool>,
    watermark_header_text: Option<String>,
    watermark_header_opacity: Option<f32>,
    watermark_footer_enabled: Option<bool>,
    watermark_footer_text: Option<String>,
    watermark_footer_opacity: Option<f32>,
    watermark_center_enabled: Option<bool>,
    watermark_center_type: Option<String>,
    watermark_center_text: Option<String>,
    watermark_center_image_path: Option<String>,
    watermark_center_opacity: Option<f32>,
    watermark_center_grayscale: Option<bool>,
    script_fonts: Option<String>,
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
    let formats: pdf::ElementFormats = serde_json::from_str(&element_formats).unwrap_or_default();
    let config = pdf::PdfExportConfig {
        paper_size: paper,
        element_formats: formats,
        mirror_scene_numbers: mirror,
        export_sections,
        export_synopses,
        export_font,
        revised_lines,
        export_title_page,
        export_scene_colors: export_scene_colors.unwrap_or(false),
        watermark_header_enabled: watermark_header_enabled.unwrap_or(false),
        watermark_header_text: watermark_header_text.unwrap_or_default(),
        watermark_header_opacity: watermark_header_opacity.unwrap_or(1.0),
        watermark_footer_enabled: watermark_footer_enabled.unwrap_or(false),
        watermark_footer_text: watermark_footer_text.unwrap_or_default(),
        watermark_footer_opacity: watermark_footer_opacity.unwrap_or(1.0),
        watermark_center_enabled: watermark_center_enabled.unwrap_or(false),
        watermark_center_type: watermark_center_type.unwrap_or_else(|| "text".to_string()),
        watermark_center_text: watermark_center_text.unwrap_or_default(),
        watermark_center_image_path: watermark_center_image_path.unwrap_or_default(),
        watermark_center_opacity: watermark_center_opacity.unwrap_or(0.4),
        watermark_center_grayscale: watermark_center_grayscale.unwrap_or(false),
        script_fonts: serde_json::from_str(&script_fonts.unwrap_or_default()).unwrap_or_default(),
    };
    pdf::get_page_breaks(&fountain_text, config).ok()
}

#[tauri::command]
fn select_watermark_image() -> Option<String> {
    let file = rfd::FileDialog::new()
        .add_filter("Image File", &["png", "jpg", "jpeg", "bmp"])
        .pick_file()?;
    Some(file.to_string_lossy().to_string())
}

#[tauri::command]
fn pick_directory() -> Option<String> {
    let dir = rfd::FileDialog::new().pick_folder()?;
    Some(dir.to_string_lossy().to_string())
}

#[tauri::command]
fn get_fonts_for_script(
    state: tauri::State<'_, Mutex<font_cache::FontCache>>,
    script: String,
) -> Vec<String> {
    state.lock().map(|mut cache| cache.fonts_for_script(&script)).unwrap_or_default()
}

#[tauri::command]
fn get_detected_scripts(text: String) -> Vec<String> {
    font_cache::detect_scripts(&text)
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
fn generate_pdf_bytes(
    fountain_text: String,
    paper_size: String,
    font_family: String,
    element_formats: String,
    mirror_scene_numbers: String,
    export_sections: bool,
    export_synopses: bool,
    export_title_page: bool,
    export_scene_colors: Option<bool>,
    revised_lines: Vec<bool>,
    watermark_header_enabled: Option<bool>,
    watermark_header_text: Option<String>,
    watermark_header_opacity: Option<f32>,
    watermark_footer_enabled: Option<bool>,
    watermark_footer_text: Option<String>,
    watermark_footer_opacity: Option<f32>,
    watermark_center_enabled: Option<bool>,
    watermark_center_type: Option<String>,
    watermark_center_text: Option<String>,
    watermark_center_image_path: Option<String>,
    watermark_center_opacity: Option<f32>,
    watermark_center_grayscale: Option<bool>,
    script_fonts: Option<String>,
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
    let formats: pdf::ElementFormats = serde_json::from_str(&element_formats).unwrap_or_default();
    let config = pdf::PdfExportConfig {
        paper_size: paper,
        element_formats: formats,
        mirror_scene_numbers: mirror,
        export_sections,
        export_synopses,
        export_font,
        revised_lines,
        export_title_page,
        export_scene_colors: export_scene_colors.unwrap_or(false),
        watermark_header_enabled: watermark_header_enabled.unwrap_or(false),
        watermark_header_text: watermark_header_text.unwrap_or_default(),
        watermark_header_opacity: watermark_header_opacity.unwrap_or(1.0),
        watermark_footer_enabled: watermark_footer_enabled.unwrap_or(false),
        watermark_footer_text: watermark_footer_text.unwrap_or_default(),
        watermark_footer_opacity: watermark_footer_opacity.unwrap_or(1.0),
        watermark_center_enabled: watermark_center_enabled.unwrap_or(false),
        watermark_center_type: watermark_center_type.unwrap_or_else(|| "text".to_string()),
        watermark_center_text: watermark_center_text.unwrap_or_default(),
        watermark_center_image_path: watermark_center_image_path.unwrap_or_default(),
        watermark_center_opacity: watermark_center_opacity.unwrap_or(0.4),
        watermark_center_grayscale: watermark_center_grayscale.unwrap_or(false),
        script_fonts: serde_json::from_str(&script_fonts.unwrap_or_default()).unwrap_or_default(),
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
fn export_fadein(fountain_text: String) -> Option<String> {
    let file = rfd::FileDialog::new()
        .add_filter("Fade In File", &["fadein"])
        .save_file()?;

    let screenplay = pdf::parse(&fountain_text);
    let fadein_xml = pdf::export_to_fadein(&screenplay);
    let packed = pdf::fadein_pack::pack(&fadein_xml);
    if fs::write(&file, &packed).is_ok() {
        return Some(file.to_string_lossy().to_string());
    }
    None
}

#[tauri::command]
fn generate_fadein_bytes(fountain_text: String) -> Vec<u8> {
    let screenplay = pdf::parse(&fountain_text);
    let fadein_xml = pdf::export_to_fadein(&screenplay);
    pdf::fadein_pack::pack(&fadein_xml)
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
            families.sort_by_key(|a| a.to_lowercase());
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

#[derive(Serialize)]
pub struct StoreUpdateInfo {
    update_available: bool,
}

#[tauri::command]
async fn check_for_store_update() -> Result<StoreUpdateInfo, String> {
    #[cfg(all(target_os = "windows", not(debug_assertions)))]
    {
        use windows::Services::Store::StoreContext;
        let context = StoreContext::GetDefault().map_err(|e| e.to_string())?;
        let updates = context
            .GetAppAndOptionalStorePackageUpdatesAsync()
            .map_err(|e| e.to_string())?
            .await
            .map_err(|e| e.to_string())?;
        let count = updates.Size().map_err(|e| e.to_string())?;
        Ok(StoreUpdateInfo {
            update_available: count > 0,
        })
    }

    #[cfg(any(not(target_os = "windows"), debug_assertions))]
    {
        Ok(StoreUpdateInfo {
            update_available: false,
        })
    }
}

#[tauri::command]
async fn install_store_update() -> Result<String, String> {
    #[cfg(all(target_os = "windows", not(debug_assertions)))]
    {
        Ok("ms-windows-store://pdp/?productid=9PJMKR0937KK".to_string())
    }

    #[cfg(any(not(target_os = "windows"), debug_assertions))]
    {
        Err("Store is only available on Windows builds".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(move |app| {
            #[cfg(all(target_os = "windows", not(debug_assertions)))]
            {
                use windows::Services::Store::StoreContext;
                let check_license = || -> Result<bool, String> {
                    pollster::block_on(async {
                        let context = StoreContext::GetDefault().map_err(|e| e.to_string())?;
                        let app_license = context.GetAppLicenseAsync()
                            .map_err(|e| e.to_string())?
                            .await
                            .map_err(|e| e.to_string())?;
                        let is_active = app_license.IsActive().map_err(|e| e.to_string())?;
                        Ok::<_, String>(is_active)
                    })
                };

                match check_license() {
                    Ok(false) | Err(_) => {
                        rfd::MessageDialog::new()
                            .set_title("License Verification Failed")
                            .set_description("This copy of ActOne did not pass Microsoft Store license validation. Please uninstall this application and download it again from the official Microsoft Store.")
                            .set_level(rfd::MessageLevel::Error)
                            .show();
                        std::process::exit(1);
                    }
                    _ => {}
                }
            }

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
            app.manage(Mutex::new(font_cache::FontCache::new()));

            let handle = app.handle();
            let theme_path = theme_file_path(handle);
            let theme_state = if theme_path.exists() {
                std::fs::read_to_string(&theme_path)
                    .ok()
                    .and_then(|s| serde_json::from_str(&s).ok())
                    .unwrap_or_default()
            } else {
                ThemeState::default()
            };
            app.manage(ThemeConfig(Mutex::new(theme_state)));

            let prefs = app_prefs::load_prefs(handle);
            app.manage(app_prefs::AppPrefsState(Mutex::new(prefs)));

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
            export_fadein,
            pick_directory,
            generate_pdf_bytes,
            read_file_content,
            read_file_binary,
            file_exists,
            save_file_binary,
            structures::get_structures,
            structures::get_structure_template,
            get_theme_state,
            set_theme_state,
            get_system_fonts,
            get_page_breaks,
            get_cli_args,
            generate_fdx_string,
            generate_fadein_bytes,
            import_fountain_dialog,
            check_microsoft_store_license,
            check_for_store_update,
            install_store_update,
            select_watermark_image,
            get_fonts_for_script,
            get_detected_scripts,
            app_prefs::get_app_prefs,
            app_prefs::set_app_prefs,
            snapshots::create_snapshot,
            snapshots::get_snapshots,
            snapshots::delete_snapshot,
            snapshots::restore_snapshot,
            snapshots::get_snapshot_folder_path,
            snapshots::open_folder,
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