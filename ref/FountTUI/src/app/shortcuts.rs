use ratatui::style::Color;
use crate::theme::Theme;

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum ShortcutColor {
    Accent,
    Success,
    Warning,
    Error,
    Info,
    Dim,
}

impl ShortcutColor {
    pub fn resolve(&self, theme: &Theme) -> Color {
        match self {
            ShortcutColor::Accent => Color::from(theme.ui.normal_mode_bg.clone()),
            ShortcutColor::Success => Color::from(theme.ui.success.clone()),
            ShortcutColor::Warning => Color::from(theme.ui.warning.clone()),
            ShortcutColor::Error => Color::from(theme.ui.error.clone()),
            ShortcutColor::Info => Color::from(theme.ui.info.clone()),
            ShortcutColor::Dim => Color::from(theme.ui.dim.clone()),
        }
    }
}

#[derive(Clone, Debug)]
pub struct Shortcut {
    pub category: &'static str,
    pub key: &'static str,
    pub label: &'static str,
    pub desc: &'static str,
    pub color: ShortcutColor,
}

macro_rules! sc {
    ($cat:expr, $key:expr, $label:expr, $desc:expr, $color:ident) => {
        Shortcut {
            category: $cat,
            key: $key,
            label: $label,
            desc: $desc,
            color: ShortcutColor::$color,
        }
    };
}

pub fn get_all_shortcuts() -> Vec<Shortcut> {
    vec![
        // ── Essential Controls ──
        sc!("Essential Controls", "/", "Command bar", "Open command entry", Accent),
        sc!("Essential Controls", "Alt+/", "Command history", "Last run command", Dim),
        sc!("Essential Controls", "F1", "Cheat sheet", "Show this help", Info),
        sc!("Essential Controls", "Esc", "Back / Cancel", "Cancel or close", Warning),
        sc!("Essential Controls", "^P", "Settings pane", "Toggle settings menu", Accent),
        sc!("Essential Controls", "^E", "Export pane", "Export & reports menu", Accent),
        sc!("Essential Controls", "^S", "Save", "Quick save buffer", Success),
        sc!("Essential Controls", "^O", "Open", "Open file picker", Accent),
        sc!("Essential Controls", "^N", "New file", "Create empty buffer", Success),
        sc!("Essential Controls", "^F", "Search", "Find in current buffer", Info),
        sc!("Essential Controls", "^T", "Scene Tree", "Jump to scenes", Info),
        sc!("Essential Controls", "Tab", "Toggle Section", "Collapse section (Tree mode)", Info),
        sc!("Essential Controls", "^L", "Ensemble", "Character stats", Info),
        sc!("Essential Controls", "Tab", "Autocomplete", "Accept suggestion", Accent),
        sc!("Essential Controls", "/theme", "Theme Picker", "Open selection modal", Accent),
        sc!("Essential Controls", "/editor", "Normal editor", "Return to editor", Dim),

        // ── Edit & History ──
        sc!("Edit & History", "^Z", "Quick Undo", "Undo last edit", Warning),
        sc!("Edit & History", "^Shift+Z", "Quick Redo", "Redo last edit", Warning),
        sc!("Edit & History", "^A", "Select all", "Highlight all text", Accent),
        sc!("Edit & History", "Shift+Arrow", "Extend selection", "Select char/line", Accent),
        sc!("Edit & History", "Shift+Home", "Select to start", "Select to line start", Accent),
        sc!("Edit & History", "Shift+End", "Select to end", "Select to line end", Accent),
        sc!("Edit & History", "^C", "Copy", "Copy to clipboard", Success),
        sc!("Edit & History", "^X", "Cut", "Cut to clipboard", Warning),
        sc!("Edit & History", "^V", "Paste", "Paste from clipboard", Success),

        // ── File & Project ──
        sc!("File & Project", "/w", "Save", "Save script", Success),
        sc!("File & Project", "/ww", "Save As", "Save with new name", Success),
        sc!("File & Project", "/o [path]", "Open file", "Load fountain file", Accent),
        sc!("File & Project", "/new", "New file", "Create fresh buffer", Success),
        sc!("File & Project", "/bn", "Next buffer", "Switch next script", Info),
        sc!("File & Project", "/bp", "Prev buffer", "Switch prev script", Info),
        sc!("File & Project", "^PgDn", "Switch Next", "Buffer swap forward", Info),
        sc!("File & Project", "^PgUp", "Switch Prev", "Buffer swap backward", Info),
        sc!("File & Project", "/q", "Close", "Close buffer", Error),
        sc!("File & Project", "/q!", "Force close", "Close without saving", Error),
        sc!("File & Project", "/wq", "Save & close", "Write then close", Success),
        sc!("File & Project", "/ex", "Exit app", "Close all buffers", Error),
        sc!("File & Project", "/home", "Start screen", "Welcome dashboard", Accent),

        // ── Search & Replace ──
        sc!("Search & Replace", "/search [q]", "Search text", "Find and highlight", Info),
        sc!("Search & Replace", "Alt+Up", "Prev match", "Jump to prev match", Info),
        sc!("Search & Replace", "Alt+Down", "Next match", "Jump to next match", Info),
        sc!("Search & Replace", "r", "Replace", "Replace current match", Warning),
        sc!("Search & Replace", "R", "Replace All", "Replace all matches", Error),

        // ── Navigation & Motion ──
        sc!("Navigation & Motion", "/[line]", "Jump to line", "Go to line number", Info),
        sc!("Navigation & Motion", "/s[num]", "Jump to scene", "Go to scene number", Info),
        sc!("Navigation & Motion", "^Left/Right", "Jump by word", "Move by whole words", Accent),
        sc!("Navigation & Motion", "^Backspace", "Delete word ←", "Remove word behind", Warning),
        sc!("Navigation & Motion", "^Delete", "Delete word →", "Remove word ahead", Warning),
        sc!("Navigation & Motion", "Home / End", "Line edges", "Start or end of line", Dim),
        sc!("Navigation & Motion", "PgUp / PgDn", "Scroll page", "Full screen scroll", Dim),
        sc!("Navigation & Motion", "/pos", "Cursor position", "Line/Col status", Info),

        // ── Production Tools ──
        sc!("Production Tools", "/snap", "Snapshots", "Browse auto-saves", Info),
        sc!("Production Tools", "/xray", "Visual analysis", "Pacing & char charts", Info),
        sc!("Production Tools", "/ic", "Index cards", "Scene grid mode", Info),
        sc!("Production Tools", "Shift+Left/Right", "Move Index Card", "Swap selected card horizontally", Accent),
        sc!("Production Tools", "Up / Down", "Navigate Modal", "Move between fields in card modal", Info),
        sc!("Production Tools", "Enter", "Edit/Save Field", "Toggle field editing in card modal", Info),
        sc!("Production Tools", "s", "Add Synopsis", "Append new synopsis inside card modal", Success),
        sc!("Production Tools", "d", "Delete Synopsis", "Remove selected synopsis inside card modal", Error),
        sc!("Production Tools", "/structure", "Structure templates", "Import story beats", Info),
        sc!("Production Tools", "/prodtags", "Production Tags", "Toggle metadata visibility", Success),
        sc!("Production Tools", "/renum", "Renumber", "Update all numbers", Warning),
        sc!("Production Tools", "/clearnum", "Clear numbers", "Strip all scene tags", Error),
        sc!("Production Tools", "/injectnum", "Tag scene", "Number current scene", Success),
        sc!("Production Tools", "/locknum", "Prod. Lock", "Lock scene numbers", Warning),
        sc!("Production Tools", "/unlocknum", "Unlock", "Unlock scene numbers", Success),
        sc!("Production Tools", "/addtitle", "Title page", "Insert title block", Success),
        sc!("Production Tools", "/revision on", "Start tracking", "Track changes (*)", Success),
        sc!("Production Tools", "/revision off", "Stop tracking", "Stop change tracking", Warning),
        sc!("Production Tools", "/revision bake", "Approve all", "Finalize revisions", Error),

        // ── Settings ──
        sc!("Settings", "/set focus", "Zen mode", "Distraction-free UI", Accent),
        sc!("Settings", "/set typewriter", "Center cursor", "Center active line", Accent),
        sc!("Settings", "/set markup", "Show markup", "Toggle syntax hints", Accent),
        sc!("Settings", "/set pagenums", "Page numbers", "Show page counts", Accent),
        sc!("Settings", "/set scenenums", "Scene numbers", "Show scene tags", Accent),
        sc!("Settings", "/set contd", "Auto (CONT'D)", "Auto character labels", Accent),
        sc!("Settings", "/set autosave", "Auto-save", "30s background save", Accent),
        sc!("Settings", "/set autocomplete", "Autocomplete", "Character/scene hints", Accent),
        sc!("Settings", "/set autobreaks", "Smart breaks", "Auto-paragraph spacing", Accent),
        sc!("Settings", "/set line", "Line numbers", "Show leftmost gutter", Accent),
    ]
}

pub fn get_categories(shortcuts: &[Shortcut]) -> Vec<String> {
    let mut categories: Vec<String> = Vec::new();
    for s in shortcuts {
        if !categories.contains(&s.category.to_string()) {
            categories.push(s.category.to_string());
        }
    }
    categories
}

pub fn shortcuts_in_category<'a>(shortcuts: &'a [Shortcut], category: &str) -> Vec<&'a Shortcut> {
    shortcuts.iter().filter(|s| s.category == category).collect()
}

pub fn filter_shortcuts<'a>(shortcuts: &'a [Shortcut], query: &str) -> Vec<&'a Shortcut> {
    let q = query.to_lowercase();
    shortcuts
        .iter()
        .filter(|s| {
            s.key.to_lowercase().contains(&q)
                || s.label.to_lowercase().contains(&q)
                || s.desc.to_lowercase().contains(&q)
                || s.category.to_lowercase().contains(&q)
        })
        .collect()
}
