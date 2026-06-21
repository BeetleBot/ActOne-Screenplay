pub mod methods;
pub mod shortcuts;
use std::{
    collections::HashSet,
    fs, io,
    path::{Path, PathBuf},
    time::{Duration, Instant},
};

pub mod snapshot;
pub mod sprint;

use ratatui::{layout::Rect, style::Color, widgets::{ListState, TableState}};

use crate::{
    config::{Cli, Config},
    layout::VisualRow,
    theme::{Theme, ThemeManager},
    types::LineType,
};

#[derive(Clone, Debug, Default)]
pub struct SceneTreeItem {
    pub line_idx: usize,
    pub label: String,
    pub is_section: bool,
    pub scene_num: Option<String>,
    pub synopses: Vec<String>,
    pub color: Option<Color>,
    pub children: Vec<SceneTreeItem>,
}

#[derive(Clone, Debug, Default)]
pub struct StructureBeat {
    pub label: String,
    pub description: String,
}

#[derive(Clone, Debug, Default)]
pub struct Structure {
    pub name: String,
    pub description: String,
    pub beats: Vec<StructureBeat>,
}

#[derive(Clone, Debug, Default)]
pub struct CharacterItem {
    pub name: String,
    pub scenes_count: usize,
    pub dialogue_blocks: usize,
    pub word_count: usize,
    pub appears_in_scenes: Vec<(String, usize)>,
    pub is_expanded: bool,
}

#[derive(Clone, Debug)]
pub enum EnsembleItem {
    CharacterHeader(usize),             // index into character_stats
    Stat(String, Option<String>, bool), // (Text, Hint, is_last_in_tree)
    SceneLink(String, usize, bool),     // (Text, line_idx, is_last_in_tree)
    Separator,
}

#[derive(Clone)]

pub struct HistoryState {
    pub lines: Vec<String>,
    pub revised_lines: Vec<bool>,
    pub cursor_y: usize,

    pub cursor_x: usize,
}

#[derive(PartialEq, Clone, Default)]

pub enum LastEdit {
    #[default]
    None,

    Insert,

    Delete,

    Cut,

    Other,
}

#[derive(PartialEq, Debug, Clone, Copy)]
pub enum AppMode {
    Normal,

    Search,

    PromptSave,

    PromptFilename,

    SceneTree,

    CharacterNavigator,

    SettingsPane,

    Shortcuts,

    ExportPane,

    Command,

    Home,
    FilePicker,
    Snapshots,
    SprintStat,
    XRay,
    IndexCards,
    ReplaceOne,
    ReplaceAll,
    StructurePicker,
    ThemePicker,
    MetadataAutocomplete,
}

#[derive(Clone, Debug)]
pub struct XRayCharacter {
    pub name: String,
    pub word_count: usize,
    pub dialogue_lines: usize,
    pub percentage: f32,
}

#[derive(Clone, Debug)]
pub struct XRayScene {
    pub label: String,
    pub scene_num: Option<String>,
    pub page_count: f32,
    pub is_over_limit: bool,
    pub line_idx: usize,
    pub action_lines: usize,
    pub dialogue_lines: usize,
}

#[derive(Clone, Debug)]
pub struct PacingBlock {
    pub page: usize,
    pub action_lines: usize,
    pub dialogue_lines: usize,
}

#[derive(Clone, Debug)]
pub struct XRayData {
    pub characters: Vec<XRayCharacter>,
    pub total_dialogue_words: usize,
    pub total_words: usize,
    pub scenes: Vec<XRayScene>,
    pub pacing_map: Vec<PacingBlock>,
    pub global_breakdown: std::collections::BTreeMap<String, std::collections::BTreeSet<String>>,
    pub scene_breakdown: Vec<XRaySceneBreakdown>,
    pub interaction_matrix: std::collections::HashMap<(String, String), usize>,
}

#[derive(Clone, Debug)]
pub struct XRaySceneBreakdown {
    pub label: String,
    pub scene_num: Option<String>,
    pub breakdown: std::collections::BTreeMap<String, std::collections::BTreeSet<String>>,
}

#[derive(PartialEq, Debug, Clone, Default)]
pub enum FilePickerAction {
    #[default]
    Open,
    Save,
    ExportReport,
    ExportScript,
    ExportSprints,
}

#[derive(Clone, Debug)]
pub enum GoalType {
    Sprint {
        start_time: Instant,
        duration: Duration,
        start_words: usize,
        start_lines: usize,
    },
}

pub struct FilePickerState {
    pub current_dir: PathBuf,
    pub items: Vec<PathBuf>,
    pub list_state: ListState,
    pub action: FilePickerAction,
    pub filename_input: String,
    pub extension_filter: Vec<String>,
    pub show_overwrite_confirm: bool,
    pub overwrite_confirmed: bool,
    pub naming_mode: bool,
    pub target_path: Option<PathBuf>,
    pub name_input_touched: bool,
}

#[derive(Clone, Default)]
pub struct BufferState {
    pub lines: Vec<String>,

    pub types: Vec<LineType>,

    pub layout: Vec<VisualRow>,

    /// Cached visual rows per logical line.
    pub layout_cache: Vec<Vec<VisualRow>>,

    pub file: Option<PathBuf>,

    pub dirty: bool,

    pub is_tutorial: bool,

    pub cursor_y: usize,

    pub cursor_x: usize,

    pub target_visual_x: u16,

    pub scroll: usize,

    pub characters: HashSet<String>,

    pub locations: HashSet<String>,

    pub undo_stack: Vec<HistoryState>,

    pub redo_stack: Vec<HistoryState>,

    pub last_edit: LastEdit,

    pub last_snapshot_time: Option<std::time::Instant>,
    pub revision_mode: bool,
    pub revised_lines: Vec<bool>,
}

pub struct App {
    pub config: Config,

    pub buffers: Vec<BufferState>,

    pub current_buf_idx: usize,

    pub has_multiple_buffers: bool,

    pub lines: Vec<String>,

    pub types: Vec<LineType>,

    pub layout: Vec<VisualRow>,

    /// Cached visual rows per logical line for the active buffer.
    pub layout_cache: Vec<Vec<VisualRow>>,

    pub file: Option<PathBuf>,

    pub dirty: bool,

    pub is_tutorial: bool,

    pub cursor_y: usize,

    pub cursor_x: usize,

    pub target_visual_x: u16,

    pub visible_height: usize,

    pub scroll: usize,

    pub characters: HashSet<String>,

    pub locations: HashSet<String>,

    pub suggestion: Option<String>,

    pub undo_stack: Vec<HistoryState>,

    pub redo_stack: Vec<HistoryState>,

    pub last_edit: LastEdit,
    pub revision_mode: bool,
    pub revised_lines: Vec<bool>,

    pub metadata: crate::metadata::MetadataStore,

    pub mode: AppMode,
    pub previous_mode: AppMode,

    pub exit_after_save: bool,
    pub last_command: String,

    pub filename_input: String,

    pub status_msg: Option<String>,

    pub cut_buffer: Option<String>,

    pub search_query: String,

    pub last_search: String,

    pub show_search_highlight: bool,

    pub compiled_search_regex: Option<regex::Regex>,
    pub search_matches: Vec<(usize, usize)>,
    pub current_match_idx: Option<usize>,

    pub scenes: Vec<SceneTreeItem>,
    pub collapsed_sections: std::collections::HashSet<usize>,
    pub nav_original_pos: Option<(usize, usize)>,

    pub selected_scene: usize,

    pub selected_character: usize,

    pub character_stats: Vec<CharacterItem>,

    pub ensemble_items: Vec<EnsembleItem>,

    pub selected_ensemble_idx: usize,

    pub ensemble_state: ListState,

    pub selected_setting: usize,
    pub metadata_suggestions: Vec<String>,
    pub metadata_state: ListState,
    pub metadata_query: String,

    pub selected_export_option: usize,

    pub sidebar_area: Rect,

    pub settings_area: Rect,

    pub tree_state: ListState,

    pub shortcuts_state: TableState,
    pub shortcuts_query: String,
    pub is_shortcuts_searching: bool,
    pub shortcuts_selected_tab: usize,

    pub command_input: String,

    pub command_error: bool,

    pub selection_anchor: Option<(usize, usize)>,

    pub home_selected: usize,
    pub file_picker: Option<FilePickerState>,

    pub theme: Theme,
    pub theme_manager: ThemeManager,

    pub snapshot_manager: snapshot::SnapshotManager,
    pub snapshots: Vec<snapshot::Snapshot>,
    pub snapshot_list_state: TableState,
    pub last_snapshot_time: Option<std::time::Instant>,

    pub active_goal: Option<GoalType>,

    pub sprint_manager: sprint::SprintManager,
    pub sprint_history: Vec<sprint::SprintRecord>,
    pub sprint_stats_state: TableState,
    pub flash_timer: Option<Instant>,
    pub recent_files: Vec<PathBuf>,

    pub xray_data: Option<XRayData>,
    pub xray_scroll: usize,
    pub xray_tab: usize,
    pub xray_breakdown_idx: usize,
    pub xray_breakdown_state: ListState,
    pub xray_dialogue_state: TableState,
    pub xray_scene_state: TableState,
    pub save_indicator_timer: Option<Instant>,
    pub status_timer: Option<Instant>,

    pub selected_card_idx: usize,
    pub card_is_moving: bool,
    pub is_card_editing: bool,
    pub is_heading_editing: bool,
    pub active_card_field: usize,
    pub is_card_field_writing: bool,
    pub card_input_buffer: String,
    pub card_row_offset: usize,
    pub index_cards: Vec<crate::app::methods::index_cards::IndexCard>,
    pub export_tab: usize,
    pub show_quick_help: bool,
    pub structures: Vec<Structure>,
    pub structure_selected: usize,
    pub theme_picker_state: ListState,
}

impl Drop for App {
    fn drop(&mut self) {
        #[cfg(not(test))]
        if std::thread::panicking() {
            self.emergency_save();
        }
    }
}

impl App {
    pub fn new(cli: Cli) -> Self {
        let config = Config::load(&cli);

        let mut files = Vec::new();
        if !cli.files.is_empty() {
            let mut seen = std::collections::HashSet::new();
            for path in cli.files {
                let normalized = path.canonicalize().unwrap_or_else(|_| path.clone());
                if seen.insert(normalized) {
                    files.push(Some(path));
                }
            }
        }

        let mut buffers = Vec::new();
        for path in files {
            let mut is_new_or_empty = false;
            let mut revision_mode = false;
            let mut revised_indices = Vec::new();
            let lines = match &path {
                Some(p) if p.exists() => {
                    let text = fs::read_to_string(p)
                        .unwrap_or_default()
                        .replace('\t', "    ");
                    if text.trim().is_empty() {
                        is_new_or_empty = true;
                        vec![String::new()]
                    } else {
                        let (ls, mode, revs) = App::parse_content_with_metadata(&text);
                        revision_mode = mode;
                        revised_indices = revs;
                        ls
                    }
                }
                _ => {
                    is_new_or_empty = true;
                    vec![String::new()]
                }
            };

            let mut buf = BufferState {
                lines,
                file: path,
                revision_mode,
                ..Default::default()
            };
            buf.revised_lines = vec![false; buf.lines.len()];
            for idx in revised_indices {
                if idx < buf.revised_lines.len() {
                    buf.revised_lines[idx] = true;
                }
            }

            if is_new_or_empty && config.auto_title_page {
                buf.lines = vec![
                    "Title: Untitled".to_string(),
                    "Credit: Written by".to_string(),
                    "Author: ".to_string(),
                    "Draft date: ".to_string(),
                    "Contact: ".to_string(),
                    "".to_string(),
                    "".to_string(),
                ];
                buf.revised_lines = vec![false; buf.lines.len()];
                buf.cursor_y = buf.lines.len() - 1;
                buf.dirty = true;
            } else if config.goto_end {
                buf.cursor_y = buf.lines.len().saturating_sub(1);
                buf.cursor_x = buf.lines[buf.cursor_y].chars().count();
            }
            buffers.push(buf);
        }

        let has_multiple_buffers = buffers.len() > 1;

        let initial_mode = if buffers.is_empty() {
            AppMode::Home
        } else {
            AppMode::Normal
        };

        let mut app = Self {
            config,
            buffers,
            current_buf_idx: 0,
            has_multiple_buffers,

            lines: Vec::new(),
            types: Vec::new(),
            layout: Vec::new(),
            file: None,
            dirty: false,
            is_tutorial: false,
            cursor_y: 0,
            cursor_x: 0,
            target_visual_x: 0,
            visible_height: 0,
            scroll: 0,
            characters: HashSet::new(),
            locations: HashSet::new(),
            suggestion: None,
            undo_stack: Vec::new(),
            redo_stack: Vec::new(),
            revision_mode: false,
            revised_lines: Vec::new(),
            metadata: crate::metadata::MetadataStore::new(),
            last_edit: LastEdit::None,

            mode: initial_mode,
            previous_mode: initial_mode,
            exit_after_save: false,
            last_command: String::new(),
            layout_cache: Vec::new(),
            filename_input: String::new(),

            status_msg: None,
            cut_buffer: None,
            search_query: String::new(),
            last_search: String::new(),
            show_search_highlight: false,
            compiled_search_regex: None,
            search_matches: Vec::new(),
            current_match_idx: None,
            scenes: Vec::new(),
            collapsed_sections: std::collections::HashSet::new(),
            nav_original_pos: None,
            selected_scene: 0,
            selected_character: 0,
            character_stats: Vec::new(),
            ensemble_items: Vec::new(),
            selected_ensemble_idx: 0,
            ensemble_state: ListState::default(),
            selected_setting: 0,
            metadata_suggestions: Vec::new(),
            metadata_state: ListState::default(),
            metadata_query: String::new(),
            selected_export_option: 0,
            sidebar_area: Rect::default(),
            settings_area: Rect::default(),
            tree_state: ListState::default(),
            shortcuts_state: TableState::default(),
            shortcuts_query: String::new(),
            is_shortcuts_searching: false,
            shortcuts_selected_tab: 0,
            command_input: String::new(),
            command_error: false,
            selection_anchor: None,
            home_selected: 0,
            file_picker: None,

            theme: Theme::default(),
            theme_manager: ThemeManager::new(),

            snapshot_manager: snapshot::SnapshotManager::new(),
            snapshots: Vec::new(),
            snapshot_list_state: TableState::default(),
            last_snapshot_time: None,
            active_goal: None,
            sprint_manager: sprint::SprintManager::new(),
            sprint_history: Vec::new(),
            sprint_stats_state: TableState::default(),
            flash_timer: None,
            recent_files: Vec::new(),

            xray_data: None,
            xray_scroll: 0,
            xray_tab: 0,
            xray_breakdown_idx: 0,
            xray_breakdown_state: ListState::default(),
            xray_dialogue_state: TableState::default(),
            xray_scene_state: TableState::default(),
            save_indicator_timer: None,
            status_timer: None,

            selected_card_idx: 0,
            card_is_moving: false,
            is_card_editing: false,
            is_heading_editing: false,
            active_card_field: 0,
            is_card_field_writing: false,
            card_input_buffer: String::new(),
            card_row_offset: 0,
            index_cards: Vec::new(),
            export_tab: 0,
            show_quick_help: false,
            structures: Vec::new(),
            structure_selected: 0,
            theme_picker_state: ListState::default(),
        };

        app.load_structures();

        app.load_recent_files();

        app.theme_manager.load_user_themes();
        if !app.config.theme.is_empty() {
            app.theme_manager.set_theme(&app.config.theme);
            app.theme = app.theme_manager.current_theme.clone();
        }

        if !app.buffers.is_empty() {
            let mut first_buf = std::mem::take(&mut app.buffers[0]);
            app.swap_buffer(&mut first_buf);

            app.parse_document();
            app.update_autocomplete();
            app.update_layout();
            app.target_visual_x = app.current_visual_x();
        }

        app
    }

    pub fn swap_buffer(&mut self, other: &mut BufferState) {
        std::mem::swap(&mut self.lines, &mut other.lines);
        std::mem::swap(&mut self.types, &mut other.types);
        std::mem::swap(&mut self.layout, &mut other.layout);
        std::mem::swap(&mut self.layout_cache, &mut other.layout_cache);
        std::mem::swap(&mut self.file, &mut other.file);
        std::mem::swap(&mut self.dirty, &mut other.dirty);
        std::mem::swap(&mut self.is_tutorial, &mut other.is_tutorial);
        std::mem::swap(&mut self.cursor_y, &mut other.cursor_y);
        std::mem::swap(&mut self.cursor_x, &mut other.cursor_x);
        std::mem::swap(&mut self.target_visual_x, &mut other.target_visual_x);
        std::mem::swap(&mut self.scroll, &mut other.scroll);
        std::mem::swap(&mut self.characters, &mut other.characters);
        std::mem::swap(&mut self.locations, &mut other.locations);
        std::mem::swap(&mut self.undo_stack, &mut other.undo_stack);
        std::mem::swap(&mut self.redo_stack, &mut other.redo_stack);
        std::mem::swap(&mut self.last_edit, &mut other.last_edit);
        std::mem::swap(&mut self.last_snapshot_time, &mut other.last_snapshot_time);
        std::mem::swap(&mut self.revision_mode, &mut other.revision_mode);
        std::mem::swap(&mut self.revised_lines, &mut other.revised_lines);
    }

    pub fn switch_buffer(&mut self, next_idx: usize) {
        if self.buffers.is_empty() || next_idx >= self.buffers.len() {
            return;
        }

        // If switching to the same buffer, we only return early if the app state
        // is already populated (i.e. lines is not empty).
        if next_idx == self.current_buf_idx && !self.lines.is_empty() {
            return;
        }

        // Only save current state if it contains actual buffer data
        if !self.lines.is_empty() {
            let mut current_state = BufferState::default();
            self.swap_buffer(&mut current_state);
            self.buffers[self.current_buf_idx] = current_state;
        }

        self.current_buf_idx = next_idx;

        let mut next_state = std::mem::take(&mut self.buffers[self.current_buf_idx]);

        self.swap_buffer(&mut next_state);

        self.parse_document();
        self.update_autocomplete();
        self.update_layout();
        self.target_visual_x = self.current_visual_x();

        let file_name = self
            .file
            .as_ref()
            .and_then(|p| p.file_name())
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_else(|| "New File".to_string());

        let line_count = self.lines.len();
        let line_word = if line_count == 1 { "line" } else { "lines" };

        self.set_status(&format!("{} -- {} {}", file_name, line_count, line_word));
    }

    pub fn switch_next_buffer(&mut self) {
        if self.buffers.len() <= 1 { return; }
        let next = (self.current_buf_idx + 1) % self.buffers.len();
        self.switch_buffer(next);
    }

    pub fn switch_prev_buffer(&mut self) {
        if self.buffers.len() <= 1 { return; }
        let prev = if self.current_buf_idx == 0 {
            self.buffers.len() - 1
        } else {
            self.current_buf_idx - 1
        };
        self.switch_buffer(prev);
    }

    /// Resets all editor fields when no buffer is active.
    pub fn clear_current_state(&mut self) {
        self.lines = Vec::new();
        self.types = Vec::new();
        self.layout = Vec::new();
        self.file = None;
        self.dirty = false;
        self.cursor_y = 0;
        self.cursor_x = 0;
        self.characters.clear();
        self.locations.clear();
        self.undo_stack.clear();
        self.redo_stack.clear();
        self.revision_mode = false;
        self.revised_lines.clear();
        self.last_edit = LastEdit::None;
        self.status_msg = None;
        self.command_input.clear();
        self.command_error = false;
    }

    pub fn mark_line_revised(&mut self, y: usize) {
        if self.revision_mode {
            if self.revised_lines.len() <= y {
                self.revised_lines.resize(self.lines.len(), false);
            }
            if y < self.revised_lines.len() {
                self.revised_lines[y] = true;
            }
        }
    }

    pub fn close_current_buffer(&mut self) -> bool {
        if self.buffers.is_empty() {
            return false;
        }

        if self.buffers.len() <= 1 {
            self.buffers.clear();
            self.clear_current_state();
            self.mode = AppMode::Home;
            return false;
        }

        self.buffers.remove(self.current_buf_idx);
        if self.current_buf_idx >= self.buffers.len() {
            self.current_buf_idx = self.buffers.len() - 1;
        }

        let mut dummy = BufferState::default();
        self.swap_buffer(&mut dummy);

        let mut next_state = std::mem::take(&mut self.buffers[self.current_buf_idx]);
        self.swap_buffer(&mut next_state);

        self.parse_document();
        self.update_autocomplete();
        self.update_layout();
        self.target_visual_x = self.current_visual_x();

        let file_name = self
            .file
            .as_ref()
            .and_then(|p| p.file_name())
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_else(|| "New File".to_string());
        let line_count = self.lines.len();
        let line_word = if line_count == 1 { "line" } else { "lines" };
        self.set_status(&format!("{} -- {} {}", file_name, line_count, line_word));

        false
    }


    /// Strips a trailing `#num#` tag from a scene heading line if present.
    fn strip_scene_number_from_line(line: &str) -> &str {
        let trimmed = line.trim_end();
        if trimmed.ends_with('#')
            && let Some(open) = trimmed[..trimmed.len() - 1].rfind('#') {
                let inner = &trimmed[open + 1..trimmed.len() - 1];
                if !inner.is_empty() && !inner.contains(' ') {
                    return trimmed[..open].trim_end();
                }
            }
        line
    }

    /// Extracts the `#tag#` inner value from a scene heading, if present.
    fn extract_scene_tag(line: &str) -> Option<String> {
        let trimmed = line.trim_end();
        if trimmed.ends_with('#')
            && let Some(open) = trimmed[..trimmed.len() - 1].rfind('#') {
                let inner = &trimmed[open + 1..trimmed.len() - 1];
                if !inner.is_empty() && !inner.contains(' ') {
                    return Some(inner.to_string());
                }
            }
        None
    }

    /// Generates the next alphabetical suffix label after the given list.
    /// e.g., given `["A", "B"]` returns `"C"`. After `"Z"` returns `"AA"`.
    fn next_suffix_label(existing: &[String]) -> String {
        if existing.is_empty() {
            return "A".to_string();
        }
        // Find the "highest" suffix alphabetically
        let Some(max_suffix) = existing.iter().max() else {
            return "A".to_string();
        };
        Self::increment_suffix(max_suffix)
    }

    /// Increments an alphabetical suffix: A→B, Z→AA, AZ→BA, etc.
    fn increment_suffix(s: &str) -> String {
        let mut chars: Vec<char> = s.chars().collect();
        let mut carry = true;
        for i in (0..chars.len()).rev() {
            if carry {
                if chars[i] == 'Z' {
                    chars[i] = 'A';
                    // carry remains true
                } else {
                    chars[i] = (chars[i] as u8 + 1) as char;
                    carry = false;
                }
            }
        }
        if carry {
            chars.insert(0, 'A');
        }
        chars.into_iter().collect()
    }

    /// Calculates what scene-number integer a given scene index should receive,
    /// walking all scene headings up to `target_idx` and applying the same
    /// cascading logic used by the full renumber pass.
    fn compute_scene_number_for(&self, target_line_idx: usize) -> usize {
        let mut count = 1usize;
        for i in 0..self.lines.len() {
            if self.types[i] != LineType::SceneHeading {
                continue;
            }
            let base = Self::strip_scene_number_from_line(&self.lines[i]);
            // Check if a non-integer override is already present
            let existing: Option<&str> = {
                let t = self.lines[i].trim_end();
                if let Some(stripped) = t.strip_suffix('#') {
                    stripped.rfind('#').and_then(|o| {
                        let inner = &stripped[o + 1..];
                        if !inner.is_empty() && !inner.contains(' ') {
                            Some(inner)
                        } else {
                            None
                        }
                    })
                } else {
                    None
                }
            };
            if i == target_line_idx {
                // If the existing tag is non-integer (custom lock like 14B) keep count as-is
                if let Some(num) = existing
                    && !num.chars().all(|c| c.is_ascii_digit()) {
                        return count; // will be ignored by caller
                    }
                return count;
            }
            // Advance count only for scenes that consume an integer slot
            let _ = base;
            if let Some(num) = existing {
                if num.chars().all(|c| c.is_ascii_digit()) {
                    count += 1;
                }
                // non-integer overrides don't consume a slot
            } else {
                count += 1;
            }
        }
        count
    }

    /// Inserts a Fountain title page block at the very top of the buffer.
    /// If a title page already exists (first non-empty line is metadata), warns
    /// the user instead of duplicating it.
    pub fn insert_title_page(&mut self) {
        // Check if a title page already exists by looking at the first
        // non-empty line's type after a fresh parse.
        self.parse_document();
        let first_content = self.types.iter().find(|t| **t != LineType::Empty);
        if let Some(lt) = first_content
            && matches!(
                lt,
                LineType::MetadataTitle | LineType::MetadataKey | LineType::MetadataValue
            ) {
                self.set_error("Title page already exists");
                return;
            }

        let title_lines = vec![
            "Title: Untitled".to_string(),
            "Credit: Written by".to_string(),
            "Author: ".to_string(),
            "Draft date: ".to_string(),
            "Contact: ".to_string(),
            "".to_string(),
        ];
        let count = title_lines.len();

        // Splice the title block before line 0
        for (i, line) in title_lines.into_iter().enumerate() {
            self.lines.insert(i, line);
        }

        // Re-parse so the new metadata lines get their correct types
        self.parse_document();

        // Place cursor at the end of "Title: Untitled" so the user can
        // immediately start editing the title value.
        self.cursor_y = 0;
        self.cursor_x = "Title: Untitled".chars().count();

        // Adjust the selection anchor if one was active — it now points
        // `count` lines further down.
        if let Some((ay, ax)) = self.selection_anchor {
            self.selection_anchor = Some((ay + count, ax));
        }

        self.dirty = true;
        self.set_status("Title page inserted");
    }

    // ── Selection Helpers ────────────────────────────────────────────────────

    /// Select entire document.
    pub fn select_all(&mut self) {
        self.selection_anchor = Some((0, 0));
        let last_line = self.lines.len().saturating_sub(1);
        self.cursor_y = last_line;
        self.cursor_x = self.lines[last_line].chars().count();
    }

    pub fn execute_command(
        &mut self,
        text_changed: &mut bool,
        cursor_moved: &mut bool,
        update_target_x: &mut bool,
    ) -> io::Result<bool> {
        let input = self.command_input.trim().to_string();
        if !input.is_empty() {
            self.last_command = input.clone();
        }
        self.command_input.clear();
        self.mode = AppMode::Normal;
        self.command_error = false;

        if input.is_empty() {
            return Ok(false);
        }

        // 1. Numeric jump (e.g. :50)
        if let Ok(line_num) = input.parse::<usize>() {
            self.cursor_y = (line_num.saturating_sub(1)).min(self.lines.len().saturating_sub(1));
            self.cursor_x = 0;
            *update_target_x = true;
            *cursor_moved = true;
            return Ok(false);
        }

        let parts: Vec<&str> = input.split_whitespace().collect();
        let cmd = parts[0];
        let args = &parts[1..];

        match cmd {
            "theme" | "t" => {
                let theme_name = args.join(" ");
                if !theme_name.is_empty() {
                    if self.theme_manager.set_theme(&theme_name) {
                        self.theme = self.theme_manager.current_theme.clone();
                        self.config.theme = self.theme.name.clone();
                        let _ = crate::config::Config::save_string_setting("theme", &self.theme.name);
                        self.set_status(&format!("Theme set to {}", self.theme.name));
                        self.update_layout();
                    } else {
                        self.set_error(&format!("Theme not found: {}", theme_name));
                    }
                } else {
                    self.mode = AppMode::ThemePicker;
                    let themes = self.theme_manager.list_themes();
                    let current_idx = themes.iter().position(|t| t == &self.theme.name).unwrap_or(0);
                    self.theme_picker_state.select(Some(current_idx));
                }
            }
            "w" => {
                if let Some(path_str) = args.first() {
                    if let Err(e) = self.save_as(PathBuf::from(path_str)) {
                        self.set_error(&format!("Error saving: {}", e));
                    }
                } else if self.file.is_some() {
                    if let Err(e) = self.save() {
                        self.set_error(&format!("Error saving: {}", e));
                    }
                } else {
                    // Open picker for unnamed buffer save
                    self.open_file_picker(
                        FilePickerAction::Save,
                        vec!["fountain".to_string()],
                        Some("unnamed.fountain".to_string()),
                    );
                }
            }
            "ww" => {
                let default_name = self
                    .file
                    .as_ref()
                    .and_then(|p| p.file_name())
                    .map(|n| n.to_string_lossy().into_owned())
                    .unwrap_or_else(|| "unnamed.fountain".to_string());

                self.open_file_picker(
                    FilePickerAction::Save,
                    vec!["fountain".to_string()],
                    Some(default_name),
                );
            }
            "q" => {
                if self.dirty && !self.is_tutorial {
                    self.set_error("Unsaved changes. Use /q! or /wq");
                } else {
                    self.close_current_buffer();
                }
            }
            "q!" => {
                self.close_current_buffer();
            }
            "ex" => {
                return Ok(true);
            }
            "wq" => {
                if self.file.is_some() {
                    if let Err(e) = self.save() {
                        self.set_error(&format!("Error saving: {}", e));
                        return Ok(false);
                    }
                    if self.close_current_buffer() {
                        return Ok(true);
                    }
                } else if let Some(path_str) = args.first() {
                    if let Err(e) = self.save_as(PathBuf::from(path_str)) {
                        self.set_error(&format!("Error saving: {}", e));
                        return Ok(false);
                    }
                    if self.close_current_buffer() {
                        return Ok(true);
                    }
                } else {
                    self.set_error("No filename");
                }
            }
            "set" => {
                if args.len() >= 2 {
                    let opt = args[0];
                    let val_str = args[1].to_lowercase();
                    let val = val_str == "on" || val_str == "true";
                    match opt {
                        "markup" => self.config.hide_markup = !val,
                        "pagenums" => self.config.show_page_numbers = val,
                        "scenenums" => self.config.show_scene_numbers = val,
                        "contd" => self.config.auto_contd = val,
                        "typewriter" => self.config.typewriter_mode = val,
                        "autosave" => self.config.auto_save = val,
                        "autocomplete" => self.config.autocomplete = val,
                        "autobreaks" => self.config.auto_paragraph_breaks = val,
                        "focus" => self.config.focus_mode = val,
                        "highlight" => self.config.highlight_active_action = val,
                        "line" | "linenums" => self.config.show_line_numbers = val,
                        "prodtags" => self.config.show_production_tags = val,
                        _ => self.set_error(&format!("Unknown option: {}", opt)),
                    }
                    *text_changed = true;
                } else if args.len() == 1 {
                    // Toggle syntax: /set focus
                    let opt = args[0];
                    match opt {
                        "markup" => self.config.hide_markup = !self.config.hide_markup,
                        "pagenums" => {
                            self.config.show_page_numbers = !self.config.show_page_numbers
                        }
                        "scenenums" => {
                            self.config.show_scene_numbers = !self.config.show_scene_numbers
                        }
                        "contd" => self.config.auto_contd = !self.config.auto_contd,
                        "typewriter" => {
                            self.config.typewriter_mode = !self.config.typewriter_mode
                        }
                        "autosave" => self.config.auto_save = !self.config.auto_save,
                        "autocomplete" => self.config.autocomplete = !self.config.autocomplete,
                        "autobreaks" => {
                            self.config.auto_paragraph_breaks = !self.config.auto_paragraph_breaks
                        }
                        "focus" => self.config.focus_mode = !self.config.focus_mode,
                        "highlight" => self.config.highlight_active_action = !self.config.highlight_active_action,
                        "line" | "linenums" => {
                            self.config.show_line_numbers = !self.config.show_line_numbers
                        }
                        "prodtags" => {
                            self.config.show_production_tags = !self.config.show_production_tags
                        }
                        _ => self.set_error(&format!("Unknown option: {}", opt)),
                    }
                    *text_changed = true;
                } else if args.is_empty() {
                    self.mode = AppMode::SettingsPane;
                    self.selected_setting = 0;
                }
            }
            "snap" => {
                self.open_snapshots();
            }
            "ic" => {
                self.mode = AppMode::IndexCards;
            }
            "editor" | "ed" => {
                self.mode = AppMode::Normal;
            }
            "ud" => {
                if self.undo() {
                    self.set_status("Undo applied");
                    *update_target_x = true;
                    *text_changed = true;
                    *cursor_moved = true;
                } else {
                    self.set_error("Nothing to undo");
                }
            }
            "rd" => {
                if self.redo() {
                    self.set_status("Redo applied");
                    *update_target_x = true;
                    *text_changed = true;
                    *cursor_moved = true;
                } else {
                    self.set_error("Nothing to redo");
                }
            }
            "pos" => {
                self.report_cursor_position();
            }
            "revision" => {
                if let Some(sub) = args.first() {
                    match *sub {
                        "on" => {
                            self.revision_mode = true;
                            if self.revised_lines.len() != self.lines.len() {
                                self.revised_lines = vec![false; self.lines.len()];
                            }
                            self.set_status("Revision mode ON");
                        }
                        "off" => {
                            self.revision_mode = false;
                            self.set_status("Revision mode OFF");
                        }
                        "bake" | "lock" => {
                            self.revised_lines = vec![false; self.lines.len()];
                            self.revision_mode = false;
                            self.set_status("All revisions approved and locked");
                            self.update_layout();
                        }
                        _ => self.set_error("Use /revision on, off, or bake"),
                    }
                } else {
                    self.set_status(&format!(
                        "Revision mode is {}",
                        if self.revision_mode { "ON" } else { "OFF" }
                    ));
                }
            }
            // :injectnum  (auto) or  :injectnum14B  (custom tag)
            s if s.starts_with("injectnum") => {
                let mut tag_part = &s[9..];
                if tag_part.is_empty() && !args.is_empty() {
                    tag_part = args[0];
                }
                if tag_part.is_empty() {
                    self.inject_scene_number_tag(None);
                } else {
                    self.inject_scene_number_tag(Some(tag_part));
                }
                *text_changed = true;
            }
            // Jump to line number: /123
            s if s.chars().all(|c| c.is_ascii_digit()) => {
                if let Ok(line_num) = s.parse::<usize>() {
                    let target = line_num.saturating_sub(1);
                    self.cursor_y = target.min(self.lines.len().saturating_sub(1));
                    self.cursor_x = 0;
                    *cursor_moved = true;
                    *update_target_x = true;
                }
            }
            // Jump to scene number: /s50 or /s 50
            _ if cmd.starts_with('s') && (cmd.len() == 1 || cmd[1..].chars().all(|c| c.is_ascii_digit())) => {
                let scene_num_str = if cmd.len() > 1 {
                    &cmd[1..]
                } else {
                    args.first().unwrap_or(&"")
                };

                if let Ok(num) = scene_num_str.parse::<usize>() {
                    if let Some(row) = self.layout.iter().find(|r| {
                        r.line_type == crate::types::LineType::SceneHeading
                            && r.scene_num
                                .as_ref()
                                .map(|n| n.trim_matches('#').parse::<usize>().unwrap_or(0))
                                == Some(num)
                    }) {
                        self.cursor_y = row.line_idx;
                        self.cursor_x = 0;
                        *cursor_moved = true;
                        *update_target_x = true;
                        self.set_status(&format!("Jumped to scene {}", num));
                    } else {
                        self.set_error(&format!("Scene {} not found", num));
                    }
                }
            }
            "addtitle" => {
                self.insert_title_page();
                *text_changed = true;
                *cursor_moved = true;
                *update_target_x = true;
            }
            "renum" => {
                if self.config.production_lock {
                    self.auto_number_locked_scenes();
                    self.set_status("Production lock active. Sub-scene numbers generated.");
                } else {
                    self.renumber_all_scenes();
                    self.set_status("Scenes renumbered");
                }
                *text_changed = true;
            }
            "clearnum" => {
                self.strip_all_scene_numbers();
                self.set_status("All the scene numbers are cleared now");
                *text_changed = true;
            }
            "clean" => {
                self.clean_script();
                *text_changed = true;
                *cursor_moved = true;
            }
            "locknum" => {
                self.config.production_lock = true;
                self.set_status("Production lock ENABLED");
                *text_changed = true;
            }
            "unlocknum" => {
                self.config.production_lock = false;
                self.set_status("Production lock DISABLED");
            }
            "search" => {
                if let Some(query) = args.first() {
                    self.search_query = query.to_string();
                    self.execute_search();
                    *cursor_moved = true;
                    *update_target_x = true;
                } else {
                    self.search_query.clear();
                    self.show_search_highlight = true;
                    self.update_search_regex();
                    self.mode = AppMode::Search;
                }
            }
            "copy" => {
                self.copy_to_clipboard();
            }
            "cut" => {
                if self.selection_anchor.is_some() {
                    self.cut_to_clipboard();
                } else {
                    self.cut_line();
                    self.set_status("Line cut");
                }
                *update_target_x = true;
                *text_changed = true;
                *cursor_moved = true;
            }
            "paste" => {
                self.paste_from_clipboard();
                *update_target_x = true;
                *text_changed = true;
                *cursor_moved = true;
            }
            "selectall" => {
                self.select_all();
                *cursor_moved = true;
            }
            "home" => {
                self.mode = AppMode::Home;
                self.home_selected = 0;
            }
            "o" => {
                let path_arg = args.first().map(|p| PathBuf::from(*p));
                if let Some(path) = path_arg {
                    // Direct open if path provided
                    let path_ref: &Path = path.as_ref();
                    match std::fs::read_to_string::<&Path>(path_ref) {
                        Ok(content) => {
                            let lines: Vec<String> = content
                                .replace('\t', "    ")
                                .lines()
                                .map(str::to_string)
                                .collect();
                            let lines = if lines.is_empty() {
                                vec![String::new()]
                            } else {
                                lines
                            };
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
                            self.parse_document();
                            self.update_autocomplete();
                            self.update_layout();
                            let name = path
                                .file_name()
                                .map(|n| n.to_string_lossy().into_owned())
                                .unwrap_or_default();
                            self.set_status(&format!("Opened: {}", name));
                            *text_changed = true;
                            *cursor_moved = true;
                        }
                        Err(e) => self.set_error(&format!("Error opening file: {}", e)),
                    }
                } else {
                    // Open picker if no path provided
                    self.open_file_picker(
                        FilePickerAction::Open,
                        vec!["fountain".to_string()],
                        None,
                    );
                }
            }
            "bn" => {
                self.switch_next_buffer();
                *update_target_x = true;
                *text_changed = true;
                *cursor_moved = true;
            }
            "bp" => {
                self.switch_prev_buffer();
                *update_target_x = true;
                *text_changed = true;
                *cursor_moved = true;
            }
            "newfile" | "new" => {
                let lines = vec![String::new()];
                let revised_lines = vec![false; lines.len()];
                let new_buf = BufferState {
                    lines,
                    revised_lines,
                    ..Default::default()
                };
                self.buffers.push(new_buf);
                let new_idx = self.buffers.len() - 1;
                self.has_multiple_buffers = true;
                self.switch_buffer(new_idx);
                self.set_status("New file opened");
                *text_changed = true;
                *cursor_moved = true;
            }
            "export" => {
                self.mode = AppMode::ExportPane;
                self.selected_export_option = 0;
            }
            "sprint" => {
                if self.active_goal.is_some() {
                    self.set_error("A sprint is already active! Cancel it first with /cancelsprint.");
                } else if let Some(arg) = args.first() {
                    if let Ok(minutes) = arg.parse::<u64>() {
                        self.active_goal = Some(GoalType::Sprint {
                            start_time: Instant::now(),
                            duration: Duration::from_secs(minutes * 60),
                            start_words: self.total_word_count(),
                            start_lines: self.lines.len(),
                        });
                        self.set_status(&format!("Sprint started! ({} minutes)", minutes));
                    } else {
                        self.set_error("Usage: /sprint [minutes]");
                    }
                } else {
                    self.set_error("Usage: /sprint [minutes]");
                }
            }
            "cancelsprint" => {
                if self.active_goal.is_some() {
                    self.active_goal = None;
                    self.set_status("Sprint cancelled");
                } else {
                    self.set_error("No active sprint to cancel");
                }
            }
            "sprintstat" => {
                self.open_sprint_stats();
            }
            "tree" | "treeview" => {
                self.open_scene_tree();
            }
            "xray" => {
                self.compute_xray();
            }
            "structure" => {
                if self.structures.is_empty() {
                    self.load_structures();
                }
                if self.structures.is_empty() {
                    self.set_error("No structures found");
                } else {
                    self.previous_mode = self.mode;
                    self.mode = AppMode::StructurePicker;
                    self.structure_selected = 0;
                    self.set_status("Select a structure to import");
                }
            }
            "prodtags" => {
                self.config.show_production_tags = !self.config.show_production_tags;
                let status = if self.config.show_production_tags { "ENABLED" } else { "DISABLED" };
                self.set_status(&format!("Production tags visibility {}", status));
                *text_changed = true;
            }
            _ => {
                self.set_error(&format!("Unknown command: /{}", cmd));
            }
        }

        Ok(false)
    }

    pub fn open_sprint_stats(&mut self) {
        if let Ok(records) = self.sprint_manager.get_records() {
            self.sprint_history = records;
            self.sprint_history.reverse(); // Newest first
            self.mode = AppMode::SprintStat;
            if !self.sprint_history.is_empty() {
                self.sprint_stats_state.select(Some(0));
            }
        } else {
            self.set_error("Could not load sprint history.");
        }
    }

    pub fn export_sprint_data(&mut self) {
        let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S").to_string();
        let default_name = format!("sprint_report_{}.csv", timestamp);
        self.open_file_picker(
            FilePickerAction::ExportSprints,
            vec!["csv".to_string()],
            Some(default_name),
        );
    }
    pub fn parse_content_with_metadata(text: &str) -> (Vec<String>, bool, Vec<usize>) {
        let mut lines: Vec<String> = text.lines().map(str::to_string).collect();
        let mut revision_mode = false;
        let mut revised_indices = Vec::new();

        if lines.len() >= 4 {
            let last_idx = lines.len() - 1;
            if lines[last_idx].trim() == "*/" {
                let mut metadata_lines = Vec::new();
                let mut start_idx = None;

                for i in (0..lines.len()).rev() {
                    if lines[i].trim() == "/*" {
                        start_idx = Some(i);
                        break;
                    }
                    metadata_lines.push(lines[i].clone());
                }

                if let Some(start) = start_idx {
                    let mut found_metadata = false;
                    for line in metadata_lines {
                        if line.contains("FOUNT_REVISIONS:") {
                            let parts: Vec<&str> = line.split(':').collect();
                            if parts.len() > 1 {
                                for idx_str in parts[1].split(',') {
                                    if let Ok(idx) = idx_str.trim().parse::<usize>() {
                                        revised_indices.push(idx);
                                    }
                                }
                                found_metadata = true;
                            }
                        } else if line.contains("REVISION_MODE:") {
                            let parts: Vec<&str> = line.split(':').collect();
                            if parts.len() > 1 {
                                let val = parts[1].trim().to_uppercase();
                                revision_mode = val == "ON" || val == "TRUE";
                                found_metadata = true;
                            }
                        }
                    }

                    if found_metadata {
                        lines.drain(start..);
                        if let Some(last) = lines.last() && last.trim().is_empty() {
                            lines.pop();
                        }
                    }
                }
            }
        }

        if lines.is_empty() {
            lines.push(String::new());
        }

        (lines, revision_mode, revised_indices)
    }

    pub fn get_visible_scenes(&self) -> Vec<(SceneTreeItem, usize)> {
        let mut visible = Vec::new();
        fn flatten(item: &SceneTreeItem, depth: usize, out: &mut Vec<(SceneTreeItem, usize)>, collapsed: &HashSet<usize>) {
            out.push((item.clone(), depth));
            if !collapsed.contains(&item.line_idx) {
                for child in &item.children {
                    flatten(child, depth + 1, out, collapsed);
                }
            }
        }
        for scene in &self.scenes {
            flatten(scene, 0, &mut visible, &self.collapsed_sections);
        }
        visible
    }
}

pub mod file_picker;
pub mod input;
pub mod ui;

#[cfg(test)]
mod tests;
