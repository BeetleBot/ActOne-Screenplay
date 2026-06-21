use clap::Parser;
use std::fs;
use std::path::PathBuf;

const DEFAULT_CONFIG: &str = r#"## Fount configuration file
## Place this file at ~/.config/fount/fount.conf
##
## Use "set <option>" to enable a boolean option or assign a value.
## Use "unset <option>" to disable a boolean option.

## Editor View

# Show scene numbers in the left margin.
set show_scene_numbers

# Show page numbers on the right side of the screen.
set show_page_numbers

# Mirror scene numbers to the right margin instead of page numbers.
# Available values: "always" (editor and export), "export" (export only), "off"
set mirror_scene_numbers "export"

# Automatically hide Fountain markup when the cursor is not
# on the current line.
set hide_markup

# Highlight active action line (or nearest action line above)
# in bright white color.
unset highlight_active_action

# Typewriter mode (forces the active line to stay in the exact
# vertical center of the terminal at all times).
unset typewriter_mode

# Focus mode
unset focus_mode

## Editor Behavior

# Auto-complete scene headings (INT./EXT.) and character names.
set autocomplete

# Automatically append (CONT'D) to a character name when they speak
# consecutively.
set auto_contd

# Automatically insert paragraph breaks (double newlines) after Action,
# Dialogue, and similar elements.
set auto_paragraph_breaks

# Automatically insert a closing parenthesis when typing an opening one.
set match_parentheses

# Automatically close paired elements such as [[]], /**/, and ****.
set close_elements

# Insert a blank Title Page template when creating a new file.
unset auto_title_page

## Formatting

# The string appended to a character name when they speak consecutively.
set contd_extension "(CONT'D)"

# Allow action blocks to be split across pages.
# Use "unset break_actions" to keep action blocks on a single page.
set break_actions

# Open the file with the cursor at the end
unset goto_end

# Styling applied to scene headings. Available values: "bold",
# "underline", "bold underline"
set heading_style "bold"

# Number of blank lines before a scene heading. Set to 2 for double
# spacing before each new scene.
set heading_spacing 1

# Styling applied to shots (e.g. !! CLOSE UP). Available values: "bold",
# "underline", "bold underline"
set shot_style "bold"

## Display & Terminal

# Disable all terminal colors. Fount will still render bold, italic,
# and underline modifiers if supported by your terminal. Fount tries
# to detect color support automatically.
unset no_color

# Disable all text formatting (bold, italic, underline).
unset no_formatting

# Force output of ANSI color escape codes, even if Fount detects
# that your terminal does not support them.
unset force_ansi

# Force output of ASCII characters instead of Unicode (e.g., for page
# break lines). Useful for older terminals. Fount will try to detect
# Unicode support automatically.
unset force_ascii

# Enable terminal-compatible icons and symbols.
# (Note: These are now standard characters that work on all systems).
set use_nerd_fonts

## PDF Export

# Paper size for PDF export. Available values: "a4", "letter"
set paper_size "a4"

# Force scene numbers to be generated in PDF export even if they
# are not explicitly numbered in the Fountain source.
unset force_scene_numbers

# Render scene headings in bold for exports (PDF/HTML).
set export_bold_scene_headings
"#;

#[derive(Clone, Debug, PartialEq, Eq, Default)]
pub enum MirrorOption {
    
    Off,

    
    Always,

    
    #[default]
    ExportOnly,
}

#[derive(Parser, Debug, Default, Clone)]
#[command(name = "fount", author, version, about, long_about = None)]
pub struct Cli {
    #[arg(num_args = 0..)]
    pub files: Vec<PathBuf>,
}

#[derive(Clone, Debug)]
pub struct Config {
    
    pub show_scene_numbers: bool,

    
    
    pub show_page_numbers: bool,

    
    
    pub hide_markup: bool,

    
    pub autocomplete: bool,

    
    
    pub auto_contd: bool,

    
    
    pub auto_paragraph_breaks: bool,

    
    pub auto_title_page: bool,

    
    pub typewriter_mode: bool,

    
    pub focus_mode: bool,

    pub highlight_active_action: bool,

    
    
    
    
    pub break_actions: bool,

    
    pub goto_end: bool,

    
    
    pub no_color: bool,

    
    
    pub no_formatting: bool,

    
    
    pub force_ascii: bool,

    
    
    pub force_ansi: bool,

    
    pub mirror_scene_numbers: MirrorOption,

    
    
    pub contd_extension: String,

    
    
    pub heading_style: String,

    
    
    pub heading_spacing: usize,

    
    
    pub shot_style: String,

    
    pub auto_save: bool,

    
    pub auto_save_interval: u64,

    /// PDF paper size
    pub paper_size: String,

    /// Force scene numbers in PDF export
    pub force_scene_numbers: bool,

    /// Export scene headings in bold
    pub export_bold_scene_headings: bool,

    /// Selected export format
    pub export_format: String,

    /// Selected report format
    pub report_format: String,

    /// Include title page in PDF/Fountain exports
    pub include_title_page: bool,

    /// When ON, scene numbers in text are frozen — no automatic re-indexing.
    pub production_lock: bool,

    /// Selected theme name
    pub theme: String,

    /// Whether to use Nerd Font icons
    pub use_nerd_fonts: bool,

    /// Mac Mode: Auto-compatibility for Apple_Terminal
    pub mac_mode: bool,

    /// Windows Mode
    pub windows_mode: bool,

    /// Legacy Windows Console (conhost)
    pub legacy_windows: bool,

    /// Include sections in exports
    pub export_sections: bool,

    /// Include synopses in exports
    pub export_synopses: bool,

    /// Include production tags in exports
    pub export_production_tags: bool,

    /// Font for PDF export
    pub export_font: String,

    /// Show line numbers in the gutter
    pub show_line_numbers: bool,

    /// Show production tags in the editor
    pub show_production_tags: bool,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            show_scene_numbers: true,
            show_page_numbers: true,
            hide_markup: true,

            autocomplete: true,
            auto_contd: true,
            auto_paragraph_breaks: true,
            auto_title_page: false,
            typewriter_mode: true,
            focus_mode: false,
            highlight_active_action: false,
            break_actions: true,
            goto_end: false,

            contd_extension: "(CONT'D)".to_string(),
            heading_style: "bold".to_string(),
            heading_spacing: 1,
            shot_style: "bold".to_string(),

            auto_save: false,
            auto_save_interval: 30,

            no_color: false,
            no_formatting: false,
            force_ascii: false,
            force_ansi: false,

            mirror_scene_numbers: MirrorOption::ExportOnly,

            paper_size: "a4".to_string(),
            force_scene_numbers: false,
            export_bold_scene_headings: true,
            export_format: "pdf".to_string(),
            report_format: "csv_scene".to_string(),
            include_title_page: true,
            production_lock: false,
            theme: "Adaptive".to_string(),
            use_nerd_fonts: !cfg!(windows),
            mac_mode: false,
            windows_mode: false,
            legacy_windows: false,
            export_sections: false,
            export_synopses: false,
            export_production_tags: true,
            export_font: "courier_prime".to_string(),
            show_line_numbers: true,
            show_production_tags: false,
        }
    }
}

impl Config {
    
    
    
    
    
    
    pub fn parse_config_str(&mut self, content: &str) {
        for line in content.lines() {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') {
                continue;
            }
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 2 {
                let cmd = parts[0];
                let key = parts[1];
                let val = if parts.len() > 2 {
                    parts[2..].join(" ").trim_matches('"').to_string()
                } else {
                    String::new()
                };

                if cmd == "set" {
                    match key {
                        "show_scene_numbers" => self.show_scene_numbers = true,
                        "show_page_numbers" => self.show_page_numbers = true,
                        "hide_markup" => self.hide_markup = true,
                        "autocomplete" => self.autocomplete = true,
                        "auto_contd" => self.auto_contd = true,
                        "auto_paragraph_breaks" => self.auto_paragraph_breaks = true,
                        "auto_title_page" => self.auto_title_page = true,
                        "typewriter_mode" | "typewriter" => self.typewriter_mode = true,
                        "highlight_active_action" => self.highlight_active_action = true,
                        "focus_mode" => self.focus_mode = true,
                        "break_actions" => self.break_actions = true,
                        "goto_end" => self.goto_end = true,
                        "mirror_scene_numbers" => {
                            self.mirror_scene_numbers = match val.as_str() {
                                "export" => MirrorOption::ExportOnly,
                                "off" | "false" => MirrorOption::Off,
                                _ => MirrorOption::Always,
                            };
                        }
                        "contd_extension" => self.contd_extension = val,
                        "heading_style" => self.heading_style = val,
                        "heading_spacing" => {
                            if let Ok(v) = val.parse() {
                                self.heading_spacing = v
                            }
                        }
                        "shot_style" => self.shot_style = val,
                        "auto_save" => self.auto_save = true,
                        "auto_save_interval" => {
                            if let Ok(v) = val.parse() {
                                self.auto_save_interval = v
                            }
                        }
                        "no_color" => self.no_color = true,
                        "no_formatting" => self.no_formatting = true,
                        "force_ascii" => self.force_ascii = true,
                        "force_ansi" => self.force_ansi = true,
                        "paper_size" => self.paper_size = val,
                        "export_bold_scene_headings" => self.export_bold_scene_headings = true,
                        "export_format" => self.export_format = val,
                        "report_format" => self.report_format = val,
                        "include_title_page" => self.include_title_page = true,
                        "theme" => self.theme = val,
                        "use_nerd_fonts" => self.use_nerd_fonts = true,
                        "export_sections" => self.export_sections = true,
                        "export_synopses" => self.export_synopses = true,
                        "export_production_tags" | "export_prodtags" => self.export_production_tags = true,
                        "export_font" => self.export_font = val,
                        "line_numbers" => self.show_line_numbers = true,
                        "prodtags" => self.show_production_tags = true,
                        _ => {}
                    }
                } else if cmd == "unset" {
                    match key {
                        "show_scene_numbers" => self.show_scene_numbers = false,
                        "show_page_numbers" => self.show_page_numbers = false,
                        "hide_markup" => self.hide_markup = false,
                        "autocomplete" => self.autocomplete = false,
                        "auto_contd" => self.auto_contd = false,
                        "auto_paragraph_breaks" => self.auto_paragraph_breaks = false,
                        "auto_title_page" => self.auto_title_page = false,
                        "typewriter_mode" | "typewriter" => self.typewriter_mode = false,
                        "highlight_active_action" => self.highlight_active_action = false,
                        "focus_mode" => self.focus_mode = false,
                        "break_actions" => self.break_actions = false,
                        "goto_end" => self.goto_end = false,
                        "mirror_scene_numbers" => self.mirror_scene_numbers = MirrorOption::Off,
                        "auto_save" => self.auto_save = false,
                        "no_color" => self.no_color = false,
                        "no_formatting" => self.no_formatting = false,
                        "force_ascii" => self.force_ascii = false,
                        "force_ansi" => self.force_ansi = false,
                        "use_nerd_fonts" => self.use_nerd_fonts = false,
                        "force_scene_numbers" => self.force_scene_numbers = false,
                        "export_bold_scene_headings" => self.export_bold_scene_headings = false,
                        "include_title_page" => self.include_title_page = false,
                        "export_sections" => self.export_sections = false,
                        "export_synopses" => self.export_synopses = false,
                        "export_production_tags" | "export_prodtags" => self.export_production_tags = false,
                        "line_numbers" => self.show_line_numbers = false,
                        "prodtags" => self.show_production_tags = false,
                        _ => {}
                    }
                }
            }
        }
    }

    
    
    
    
    
    
    
    
    
    
    
    
    pub fn config_path() -> Option<PathBuf> {
        #[cfg(windows)]
        {
            directories::ProjectDirs::from("", "", "Fount")
                .map(|proj_dirs| proj_dirs.config_dir().join("fount.conf"))
        }
        #[cfg(not(windows))]
        {
            let config_dir = std::env::var_os("XDG_CONFIG_HOME")
                .map(std::path::PathBuf::from)
                .unwrap_or_else(|| {
                    directories::BaseDirs::new()
                        .map(|base| base.home_dir().join(".config"))
                        .unwrap_or_default()
                });

            Some(config_dir.join("fount").join("fount.conf"))
        }
    }

    pub fn save_setting(key: &str, value: bool) -> std::io::Result<()> {
        let path = Self::config_path().ok_or_else(|| {
            std::io::Error::new(std::io::ErrorKind::NotFound, "Config path not found")
        })?;
        if !path.exists() {
            return Ok(());
        }

        let content = std::fs::read_to_string(&path)?;
        let mut lines: Vec<String> = content.lines().map(|s| s.to_string()).collect();
        let mut found = false;

        let search_prefix_set = format!("set {}", key);
        let search_prefix_unset = format!("unset {}", key);

        let new_line = if value {
            format!("set {}", key)
        } else {
            format!("unset {}", key)
        };

        for line in &mut lines {
            let trimmed = line.trim();
            // Match exact `set key` or `unset key` or starting with `set key ` (e.g. if it had value like `set paper_size "a4"`)
            if trimmed == search_prefix_set
                || trimmed == search_prefix_unset
                || trimmed.starts_with(&format!("{} ", search_prefix_set))
            {
                // We keep indentation? Not super necessary, usually it's none
                *line = new_line.clone();
                found = true;
                break;
            }
        }

        if !found {
            lines.push(new_line);
        }

        std::fs::write(&path, lines.join("\n"))?;
        Ok(())
    }

    pub fn save_string_setting(key: &str, value: &str) -> std::io::Result<()> {
        let path = Self::config_path().ok_or_else(|| {
            std::io::Error::new(std::io::ErrorKind::NotFound, "Config path not found")
        })?;
        if !path.exists() {
            return Ok(());
        }

        let content = std::fs::read_to_string(&path)?;
        let mut lines: Vec<String> = content.lines().map(|s| s.to_string()).collect();
        let mut found = false;

        let search_prefix = format!("set {}", key);
        let new_line = format!("set {} \"{}\"", key, value);

        for line in &mut lines {
            let trimmed = line.trim();
            if trimmed.starts_with(&search_prefix) {
                *line = new_line.clone();
                found = true;
                break;
            }
        }

        if !found {
            lines.push(new_line);
        }

        std::fs::write(&path, lines.join("\n"))?;
        Ok(())
    }

    pub fn load(_cli: &Cli) -> Self {
        let mut config = Self::default();

        let config_path = Self::config_path();

        if let Some(path) = config_path {
            if !path.exists() {
                if let Some(parent) = path.parent() {
                    let _ = fs::create_dir_all(parent);
                }
                #[cfg(windows)]
                let default_content = DEFAULT_CONFIG.replace("set use_nerd_fonts", "unset use_nerd_fonts");
                #[cfg(not(windows))]
                let default_content = DEFAULT_CONFIG.to_string();

                let _ = fs::write(&path, default_content);
            }

            if let Ok(content) = fs::read_to_string(&path) {
                config.parse_config_str(&content);
            }
        }

        if config.export_font.is_empty() {
            config.export_font = "courier_prime".to_string();
        }

        if config.export_format.is_empty() {
            config.export_format = "pdf".to_string();
        }

        let supports_color = supports_color::on(supports_color::Stream::Stdout).is_some();

        if config.force_ansi {
            config.no_color = false;
        } else if !supports_color {
            config.no_color = true;
        }

        // --- Mac Mode Detection ---
        let term_prog = std::env::var("TERM_PROGRAM").unwrap_or_default();
        if term_prog == "Apple_Terminal" {
            config.mac_mode = true;
            // Force safe defaults for the basic Mac terminal
            config.no_color = true;
            config.force_ascii = true;
            config.use_nerd_fonts = false;
        }

        // --- Windows Mode Detection ---
        #[cfg(target_os = "windows")]
        {
            config.windows_mode = true;
            let is_modern_terminal = std::env::var("WT_SESSION").is_ok() || std::env::var("WT_PROFILE_ID").is_ok();
            
            if !is_modern_terminal {
                config.legacy_windows = true;
            }
        }

        config
    }
}

#[cfg(test)]
mod config_tests {
    use super::*;

    #[test]
    fn test_config_default_values() {
        let config = Config::default();

        assert!(config.show_scene_numbers);
        assert!(config.show_page_numbers);
        assert!(config.hide_markup);
        assert!(config.typewriter_mode);
        assert!(!config.focus_mode);
        assert!(config.autocomplete);
        assert!(config.auto_contd);
        assert!(config.auto_paragraph_breaks);
        assert!(!config.auto_title_page);
        assert!(config.break_actions);
        assert!(!config.goto_end);
        assert_eq!(config.contd_extension, "(CONT'D)");
        assert_eq!(config.heading_style, "bold");
        assert_eq!(config.heading_spacing, 1);
        assert_eq!(config.shot_style, "bold");
        assert!(!config.no_color);
        assert!(!config.no_formatting);
        assert!(!config.force_ascii);
        assert!(!config.force_ansi);
    }

    #[test]
    fn test_config_parsing_appearance_flags() {
        let mut config = Config::default();

        let mock_file_content = "
            set no_color
            set no_formatting
            set force_ascii
            set force_ansi
        ";

        config.parse_config_str(mock_file_content);

        assert!(config.no_color, "no_color should be set by parsing");
        assert!(
            config.no_formatting,
            "no_formatting should be set by parsing"
        );
        assert!(config.force_ascii, "force_ascii should be set by parsing");
        assert!(config.force_ansi, "force_ansi should be set by parsing");
    }

    #[test]
    fn test_config_parsing_behavior_flags() {
        let mut config = Config::default();

        let mock_file_content = "
            set typewriter_mode
            set goto_end
            unset break_actions
        ";

        config.parse_config_str(mock_file_content);

        assert!(
            config.typewriter_mode,
            "typewriter_mode should be set by parsing"
        );
        assert!(config.goto_end, "goto_end should be set by parsing");
        assert!(
            !config.break_actions,
            "break_actions should be unset by parsing"
        );
    }

    #[test]
    fn test_force_ansi_overrides_no_color() {
        let mut config = Config {
            no_color: true,
            force_ansi: true,
            ..Default::default()
        };
        
        // Simulating the logic in load()
        if config.force_ansi {
            config.no_color = false;
        }
        
        assert!(!config.no_color);
        assert!(config.force_ansi);
    }
}
