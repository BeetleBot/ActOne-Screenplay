use std::path::{Path, PathBuf};
use std::fs;
use crate::app::{App, FilePickerState, FilePickerAction, AppMode};
use ratatui::widgets::ListState;
use directories::UserDirs;

impl App {
    pub fn open_file_picker(&mut self, action: FilePickerAction, filter: Vec<String>, initial_filename: Option<String>) {
        let default_dir = self.get_default_directory();
        
        if self.is_gui_available() {
            let filter_strs: Vec<&str> = filter.iter().map(|s| s.as_str()).collect();
            let result = match action {
                FilePickerAction::Open => {
                    native_dialog::FileDialog::new()
                        .set_location(&default_dir)
                        .add_filter("Fountain Files", &filter_strs)
                        .show_open_single_file()
                }
                FilePickerAction::Save | FilePickerAction::ExportScript | FilePickerAction::ExportReport | FilePickerAction::ExportSprints => {
                    let mut dlg = native_dialog::FileDialog::new()
                        .set_location(&default_dir);
                    if !filter_strs.is_empty() {
                        dlg = dlg.add_filter("Files", &filter_strs);
                    }
                    if let Some(ref name) = initial_filename {
                        dlg = dlg.set_filename(name);
                    }
                    dlg.show_save_single_file()
                }
            };

            match result {
                Ok(Some(path)) => {
                    // Set file_picker state briefly so handle_file_picker_choice knows the action.
                    self.file_picker = Some(FilePickerState {
                        current_dir: default_dir.clone(),
                        items: vec![],
                        list_state: ListState::default(),
                        action: action.clone(),
                        filename_input: String::new(),
                        extension_filter: filter.clone(),
                        show_overwrite_confirm: false,
                        overwrite_confirmed: false,
                        naming_mode: false,
                        target_path: None,
                        name_input_touched: false,
                    });
                    if let Err(e) = self.handle_file_picker_choice(path) {
                        self.set_error(&format!("Error: {}", e));
                    }
                    return;
                }
                Ok(None) => {
                    // User cancelled the dialog
                    return;
                }
                Err(_) => {
                    // Native dialog failed (e.g. zenity not installed) — fall through to TUI picker
                }
            }
        }

        // FALLBACK: TUI Picker
        let only_dirs = action != FilePickerAction::Open;
        let items = get_dir_items(&default_dir, only_dirs);
        let mut list_state = ListState::default();
        if !items.is_empty() {
            list_state.select(Some(0));
        }

        // Prefill filename stem instead of the full initial_filename
        let mut initial_name = String::new();
        if let Some(ref name) = initial_filename {
            let path = Path::new(name);
            initial_name = path.file_stem().map(|s| s.to_string_lossy().into_owned()).unwrap_or_else(|| name.clone());
        }
        
        self.file_picker = Some(FilePickerState {
            current_dir: default_dir,
            items,
            list_state,
            action,
            filename_input: initial_name,
            extension_filter: filter,
            show_overwrite_confirm: false,
            overwrite_confirmed: false,
            naming_mode: false,
            target_path: None,
            name_input_touched: false,
        });
        self.mode = AppMode::FilePicker;
    }

    fn is_gui_available(&self) -> bool {
        #[cfg(target_os = "linux")]
        {
            std::env::var("DISPLAY").is_ok() || std::env::var("WAYLAND_DISPLAY").is_ok()
        }
        #[cfg(not(target_os = "linux"))]
        {
            true
        }
    }

    fn get_default_directory(&self) -> PathBuf {
        if let Some(p) = self.file.as_ref().and_then(|p| p.parent())
            && !p.as_os_str().is_empty() {
                if let Ok(abs_p) = std::fs::canonicalize(p) {
                    let abs_str = abs_p.to_string_lossy();
                    if let Some(stripped) = abs_str.strip_prefix(r"\\?\") {
                        return PathBuf::from(stripped);
                    }
                    return abs_p;
                }
                return p.to_path_buf();
            }

        if let Some(dirs) = UserDirs::new() {
            #[cfg(target_os = "linux")]
            {
                return dirs.home_dir().to_path_buf();
            }
            #[cfg(not(target_os = "linux"))]
            {
                return dirs.document_dir()
                    .map(|p| p.to_path_buf())
                    .unwrap_or_else(|| dirs.home_dir().to_path_buf());
            }
        }

        if let Ok(curr) = std::env::current_dir()
            && let Ok(abs_p) = std::fs::canonicalize(curr) {
                let abs_str = abs_p.to_string_lossy();
                if let Some(stripped) = abs_str.strip_prefix(r"\\?\") {
                    return PathBuf::from(stripped);
                }
                return abs_p;
            }
        PathBuf::from(".")
    }

    pub fn file_picker_enter(&mut self) -> Result<bool, Box<dyn std::error::Error>> {
        let mut action_to_take = None;

        if let Some(ref mut state) = self.file_picker {
            if state.action != FilePickerAction::Open {
                if state.naming_mode {
                    let mut filename = state.filename_input.trim().to_string();
                    if !filename.is_empty() {
                        let ext = state.extension_filter.first().cloned().unwrap_or_else(|| "fountain".to_string());
                        let suffix = format!(".{}", ext);
                        if !filename.ends_with(&suffix) {
                            filename.push_str(&suffix);
                        }
                        let final_path = state.current_dir.join(filename);

                        // Check for overwrite
                        if final_path.exists() {
                            state.show_overwrite_confirm = true;
                            state.target_path = Some(final_path);
                            state.overwrite_confirmed = false;
                        } else {
                            action_to_take = Some(final_path);
                        }
                    }
                } else {
                    let selected_idx = state.list_state.selected().unwrap_or(0);
                    if selected_idx < state.items.len() {
                        let path = state.items[selected_idx].clone();
                        if path.is_dir() {
                            state.current_dir = path;
                            let only_dirs = state.action != FilePickerAction::Open;
                            state.items = get_dir_items(&state.current_dir, only_dirs);
                            state.list_state.select(Some(0));
                        }
                    }
                }
            } else {
                let selected_idx = state.list_state.selected().unwrap_or(0);
                if selected_idx < state.items.len() {
                    let path = state.items[selected_idx].clone();
                    if path.is_dir() {
                        state.current_dir = path;
                        let only_dirs = state.action != FilePickerAction::Open;
                        state.items = get_dir_items(&state.current_dir, only_dirs);
                        state.list_state.select(Some(0));
                    } else {
                        action_to_take = Some(path);
                    }
                }
            }
        }

        if let Some(path) = action_to_take {
            return self.handle_file_picker_choice(path);
        }
        Ok(false)
    }

    pub fn handle_file_picker_choice(&mut self, path: PathBuf) -> Result<bool, Box<dyn std::error::Error>> {
        let action = if let Some(ref s) = self.file_picker { s.action.clone() } else { return Ok(false); };
        self.file_picker = None;
        self.mode = AppMode::Normal;

        match action {
            FilePickerAction::Open => {
                match std::fs::read_to_string(&path) {
                    Ok(content) => {
                        let lines: Vec<String> = content.lines().map(|s| s.to_string()).collect();
                        let lines = if lines.is_empty() { vec![String::new()] } else { lines };
                        let revised_lines = vec![false; lines.len()];
                        let new_buf = crate::app::BufferState {
                            lines,
                            file: Some(path.clone()),
                            revised_lines,
                            ..Default::default()
                        };
                        self.buffers.push(new_buf);
                        let new_idx = self.buffers.len() - 1;
                        self.has_multiple_buffers = self.buffers.len() > 1;
                        self.switch_buffer(new_idx);
                        self.add_recent_file(path.clone());
                        self.parse_document();
                        self.update_autocomplete();
                        self.update_layout();
                        let name = path.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_default();
                        self.set_status(&format!("Opened: {}", name));
                    }
                    Err(e) => {
                        self.set_error(&format!("Could not read file: {}", e));
                    }
                }
            }
            FilePickerAction::Save => {
                if let Err(e) = self.save_as(path) {
                    self.set_error(&format!("Could not save file: {}", e));
                }
            }
            FilePickerAction::ExportScript => {
                let result = match self.config.export_format.as_str() {
                    "fountain" => self.export_fountain(&path),
                    _ => self.export_pdf(&path),
                };
                match result {
                    Ok(_) => self.set_status(&format!("Exported to {}", path.display())),
                    Err(e) => self.set_status(&format!("Error exporting: {}", e)),
                }
            }
            FilePickerAction::ExportReport => {
                let result = match self.config.report_format.as_str() {
                    "csv_char" => self.export_character_csv(&path),
                    "csv_location" => self.export_location_csv(&path),
                    "csv_notes" => self.export_note_csv(&path),
                    "csv_breakdown" => self.export_breakdown_csv(&path),
                    "txt_dialogue" => self.export_dialogue_txt(&path),
                    _ => self.export_scene_csv(&path),
                };
                match result {
                    Ok(_) => self.set_status(&format!("Exported to {}", path.display())),
                    Err(e) => self.set_status(&format!("Error exporting: {}", e)),
                }
            }
            FilePickerAction::ExportSprints => {
                if let Err(e) = self.sprint_manager.export_csv(&path) {
                    self.set_error(&format!("Export failed: {}", e));
                } else {
                    self.set_status(&format!("Exported sprint data to {}", path.display()));
                }
            }
        }
        Ok(false)
    }
}

pub fn get_dir_items(path: &Path, only_dirs: bool) -> Vec<PathBuf> {
    let mut items = Vec::new();
    
    // Add parent directory ".." if it exists
    if let Some(parent) = path.parent() {
        items.push(parent.to_path_buf());
    }

    if let Ok(entries) = fs::read_dir(path) {
        let mut entries_vec: Vec<_> = entries
            .filter_map(|e| e.ok())
            .map(|e| e.path())
            .filter(|p| {
                let name = p.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_default();
                if name.starts_with('.') {
                    return false;
                }
                if only_dirs {
                    p.is_dir()
                } else {
                    true
                }
            })
            .collect();
        
        // Sort: directories first, then files
        entries_vec.sort_by(|a, b| {
            let a_is_dir = a.is_dir();
            let b_is_dir = b.is_dir();
            if a_is_dir && !b_is_dir {
                std::cmp::Ordering::Less
            } else if !a_is_dir && b_is_dir {
                std::cmp::Ordering::Greater
            } else {
                a.file_name().cmp(&b.file_name())
            }
        });
        
        items.extend(entries_vec);
    }
    
    items
}
