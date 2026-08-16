use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::sync::OnceLock;
use std::io::Write;
use serde::{Deserialize, Serialize};
use tauri::Emitter;
use tauri::Manager;
#[cfg(target_os = "windows")]
use tauri_plugin_prevent_default::PlatformOptions;
use tauri_plugin_window_state::{AppHandleExt, StateFlags};

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
static PANIC_LOG_PATH: OnceLock<PathBuf> = OnceLock::new();

fn install_panic_hook(path: PathBuf) {
    let _ = PANIC_LOG_PATH.set(path);
    std::panic::set_hook(Box::new(|panic| {
        let path = PANIC_LOG_PATH.get().cloned().unwrap_or_else(|| PathBuf::from("actone-panics.log"));
        if let Some(parent) = path.parent() { let _ = fs::create_dir_all(parent); }
        if let Ok(mut file) = fs::OpenOptions::new().create(true).append(true).open(path) {
            let _ = writeln!(file, "{panic}\n");
        }
    }));
}

pub mod pdf;
mod structures;
mod font_cache;
mod app_prefs;
mod snapshots;
mod ollama;
mod spellcheck;

#[tauri::command]
fn open_file_dialog() -> Option<serde_json::Value> {
    let file = rfd::FileDialog::new()
        .add_filter("ActOne Projects", &["actone", "zip"])
        .pick_file()?;

    let path_str = file.to_string_lossy().to_string();
    Some(serde_json::json!({
        "path": path_str,
        "content": ""
    }))
}

#[tauri::command]
fn import_fountain_dialog() -> Option<serde_json::Value> {
    import_script_dialog(None)
}

#[tauri::command]
fn import_script_dialog(format: Option<String>) -> Option<serde_json::Value> {
    let mut dialog = rfd::FileDialog::new();
    match format.as_deref() {
        Some("fdx") => {
            dialog = dialog.add_filter("Final Draft (.fdx)", &["fdx"]);
        }
        Some("fadein") => {
            dialog = dialog.add_filter("Fade In (.fadein)", &["fadein"]);
        }
        Some("fountain") => {
            dialog = dialog.add_filter("Fountain (.fountain, .txt)", &["fountain", "txt", "spmd"]);
        }
        _ => {
            dialog = dialog
                .add_filter("All Supported Scripts", &["fdx", "fadein", "fountain", "txt", "spmd"])
                .add_filter("Final Draft (.fdx)", &["fdx"])
                .add_filter("Fade In (.fadein)", &["fadein"])
                .add_filter("Fountain (.fountain, .txt)", &["fountain", "txt", "spmd"]);
        }
    }
    let file = dialog.pick_file()?;
    let path_str = file.to_string_lossy().to_string();
    let name = file
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Untitled")
        .to_string();
    let ext = file
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_lowercase();
    Some(serde_json::json!({
        "path": path_str,
        "name": name,
        "extension": ext
    }))
}

fn write_file_atomically<P: AsRef<std::path::Path>, C: AsRef<[u8]>>(path: P, data: C) -> Result<(), String> {
    let path = path.as_ref();
    let parent = path.parent().unwrap_or_else(|| std::path::Path::new(""));
    let temp_name = format!(
        ".{}.tmp",
        path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("temp_save")
    );
    let temp_path = parent.join(temp_name);
    
    fs::write(&temp_path, data).map_err(|e| e.to_string())?;
    
    if let Err(e) = fs::rename(&temp_path, path) {
        let _ = fs::remove_file(&temp_path);
        return Err(e.to_string());
    }
    
    Ok(())
}

#[tauri::command]
fn save_file_content(path: String, content: String) -> Result<(), String> {
    write_file_atomically(path, content)
}

#[tauri::command]
fn save_file_dialog(content: String, default_name: Option<String>) -> Option<String> {
    let mut dialog = rfd::FileDialog::new()
        .add_filter("ActOne Bundle", &["actone"])
        .add_filter("Fountain Screenplays", &["fountain"]);

    if let Some(ref name) = default_name {
        let clean = name.trim();
        if !clean.is_empty() {
            let suggested = if clean.to_ascii_lowercase().ends_with(".actone") || clean.to_ascii_lowercase().ends_with(".fountain") {
                clean.to_string()
            } else {
                format!("{}.actone", clean)
            };
            dialog = dialog.set_file_name(&suggested);
        }
    }

    let file = dialog.save_file()?;
        
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

    if write_file_atomically(&file_path, content).is_ok() {
        return Some(path);
    }
    None
}

#[tauri::command]
fn save_theme_dialog(content: String, default_name: String) -> Option<String> {
    let file = rfd::FileDialog::new()
        .add_filter("ActOne Theme", &["actheme"])
        .set_file_name(&default_name)
        .save_file()?;
    let mut file_path = file;
    file_path.set_extension("actheme");
    let path = file_path.to_string_lossy().to_string();
    if fs::write(&file_path, content).is_ok() {
        return Some(path);
    }
    None
}

#[tauri::command]
fn import_theme_dialog() -> Option<serde_json::Value> {
    let file = rfd::FileDialog::new()
        .add_filter("ActOne Theme", &["actheme"])
        .pick_file()?;
    let path_str = file.to_string_lossy().to_string();
    let content = fs::read_to_string(&file).ok()?;
    Some(serde_json::json!({
        "path": path_str,
        "content": content
    }))
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
    write_file_atomically(path, bytes)
}

#[tauri::command]
fn get_sample_bundle() -> Vec<u8> {
    include_bytes!("../samples/BeeDetectiveTour.actone").to_vec()
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
    scene_page_breaks: Option<bool>,
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
    default_directory: Option<String>,
) -> Option<String> {
    let mut dialog = rfd::FileDialog::new();
    if let Some(dir) = &default_directory {
        dialog = dialog.set_directory(dir);
    }
    let file = dialog.add_filter("PDF Document", &["pdf"]).save_file()?;
        
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
        scene_page_breaks: scene_page_breaks.unwrap_or(false),
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
    scene_page_breaks: Option<bool>,
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
        scene_page_breaks: scene_page_breaks.unwrap_or(false),
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
    scene_page_breaks: Option<bool>,
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
        scene_page_breaks: scene_page_breaks.unwrap_or(false),
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
fn export_fountain(content: String, default_directory: Option<String>) -> Option<String> {
    let mut dialog = rfd::FileDialog::new();
    if let Some(dir) = &default_directory {
        dialog = dialog.set_directory(dir);
    }
    let file = dialog.add_filter("Fountain Screenplay", &["fountain"]).save_file()?;

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
fn export_fdx(fountain_text: String, default_directory: Option<String>) -> Option<String> {
    let mut dialog = rfd::FileDialog::new();
    if let Some(dir) = &default_directory {
        dialog = dialog.set_directory(dir);
    }
    let file = dialog.add_filter("Final Draft File", &["fdx"]).save_file()?;

    let screenplay = pdf::parse(&fountain_text);
    let fdx_content = pdf::export_to_fdx(&screenplay);
    if fs::write(&file, &fdx_content).is_ok() {
        return Some(file.to_string_lossy().to_string());
    }
    None
}

#[tauri::command]
fn export_fadein(fountain_text: String, default_directory: Option<String>) -> Option<String> {
    let mut dialog = rfd::FileDialog::new();
    if let Some(dir) = &default_directory {
        dialog = dialog.set_directory(dir);
    }
    let file = dialog.add_filter("Fade In File", &["fadein"]).save_file()?;

    let screenplay = pdf::parse(&fountain_text);
    let fadein_xml = pdf::export_to_fadein(&screenplay);
    let packed = pdf::fadein_pack::pack(&fadein_xml).ok()?;
    if fs::write(&file, &packed).is_ok() {
        return Some(file.to_string_lossy().to_string());
    }
    None
}

#[tauri::command]
fn generate_fadein_bytes(fountain_text: String) -> Result<Vec<u8>, String> {
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

#[tauri::command]
fn get_target_os() -> String {
    std::env::consts::OS.to_string()
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
async fn install_store_update() -> Result<(), String> {
    let url = "https://apps.microsoft.com/detail/9PJMKR0937KK";
    #[cfg(target_os = "windows")]
    {
        let target_url = if cfg!(debug_assertions) {
            url
        } else {
            "ms-windows-store://pdp/?productid=9PJMKR0937KK"
        };
        std::process::Command::new("cmd")
            .args(&["/C", "start", "", target_url])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_http::init())
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_denylist(&[
                    "welcome",
                    "settings",
                    "help",
                    "theme-manager",
                    "xray",
                    "tutorials",
                    "crash-report",
                ])
                .build(),
        )
        .plugin({
            let prevent = tauri_plugin_prevent_default::Builder::new();
            #[cfg(target_os = "windows")]
            let prevent = prevent.platform(
                PlatformOptions::new()
                    .browser_accelerator_keys(false)
                    .general_autofill(false)
                    .password_autosave(false)
                    .default_script_dialogs(false)
                    .built_in_error_page(false)
                    .swipe_navigation(false)
            );
            prevent.build()
        })
        .setup(move |app| {
            let panic_path = app.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("."))
                .join("actone-panics.log");
            install_panic_hook(panic_path);
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
            if let Some(icon_pref) = prefs.get("actone-app-icon") {
                let use_dark = icon_pref == "dark";
                let _ = app_prefs::apply_app_icon(handle, use_dark);
            }
            app.manage(app_prefs::AppPrefsState(Mutex::new(prefs)));
            app.manage(Mutex::new(spellcheck::SpellcheckState::new()));

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
            import_script_dialog,
            check_microsoft_store_license,
             get_system_info,
             send_error_report,
             flush_pending_panics,
             reload_window,
             restart_app,
             get_target_os,
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
            snapshots::get_snapshot_folder_path,
            snapshots::open_folder,
            save_theme_dialog,
            import_theme_dialog,
            get_sample_bundle,
            ollama::ollama_check,
            ollama::ollama_list_models,
            ollama::ollama_chat,
            ollama::cancel_ollama_chat,
            spellcheck::spellcheck_init,
            spellcheck::spellcheck_set_language,
            spellcheck::spellcheck_check_text,
            spellcheck::spellcheck_suggest,
            spellcheck::spellcheck_add_word,
            spellcheck::spellcheck_remove_word,
            spellcheck::spellcheck_ignore_word,
            spellcheck::spellcheck_get_custom_words,
            spellcheck::spellcheck_clear_custom_words,
            spellcheck::spellcheck_download_dict,
            spellcheck::spellcheck_delete_dict,
            spellcheck::spellcheck_get_installed,
            spellcheck::spellcheck_get_available,
        ]);

    builder
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            match event {
                tauri::RunEvent::ExitRequested { .. } => {
                    // Persist window state before exit (plugin's RunEvent::Exit save
                    // never fires on Windows due to the explicit process::exit below)
                    let _ = app_handle.save_window_state(StateFlags::all());

                    // Cancel all active background AI/streaming processes
                    ollama::cancel_all_sessions();

                    // Flush any pending crash/panic logs
                    let _ = flush_pending_panics();

                    #[cfg(target_os = "windows")]
                    {
                        // Cleanly terminate process to prevent tao event-loop runner panic after Destroyed state
                        std::process::exit(0);
                    }
                }
                #[cfg(any(target_os = "macos", target_os = "ios", target_os = "android"))]
                tauri::RunEvent::Opened { urls } => {
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
                        let _ = _app_handle.emit("file-opened", filtered);
                    }
                }
                _ => {}
            }
        });
}

#[derive(Serialize)]
pub struct SystemInfo {
    os: String,
    os_version: String,
    architecture: String,
    cpu_model: String,
    cpu_count: usize,
    total_memory_mb: u64,
    available_memory_mb: u64,
}

#[tauri::command]
fn get_system_info() -> SystemInfo {
    let mut system = sysinfo::System::new_all();
    system.refresh_all();
    SystemInfo {
        os: std::env::consts::OS.to_string(),
        os_version: sysinfo::System::long_os_version().unwrap_or_else(|| "unknown".to_string()),
        architecture: std::env::consts::ARCH.to_string(),
        cpu_model: system.cpus().first().map(|cpu| cpu.brand().to_string()).unwrap_or_else(|| "unknown".to_string()),
        cpu_count: system.cpus().len(),
        total_memory_mb: system.total_memory() / 1024 / 1024,
        available_memory_mb: system.available_memory() / 1024 / 1024,
    }
}

#[tauri::command]
async fn send_error_report(webhook_url: String, payload: String) -> Result<(), String> {
    reqwest::Client::new()
        .post(webhook_url)
        .header("Content-Type", "application/json")
        .body(payload)
        .send()
        .await
        .map_err(|error| error.to_string())?
        .error_for_status()
        .map(|_| ())
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn flush_pending_panics() -> Result<String, String> {
    let path = PANIC_LOG_PATH.get().cloned().unwrap_or_else(|| PathBuf::from("actone-panics.log"));
    if !path.exists() { return Ok(String::new()); }
    let content = fs::read_to_string(&path).map_err(|error| error.to_string())?;
    let _ = fs::remove_file(path);
    Ok(content)
}

#[tauri::command]
fn reload_window(app: tauri::AppHandle, label: String) -> Result<(), String> {
    let target = if label.is_empty() { "main".to_string() } else { label };
    let webview = app
        .get_webview_window(&target)
        .ok_or_else(|| format!("window '{target}' not found"))?;
    webview.eval("window.location.reload()").map_err(|error| error.to_string())
}

#[tauri::command]
fn restart_app(app: tauri::AppHandle) {
    app.restart();
}
