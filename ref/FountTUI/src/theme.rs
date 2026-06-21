use ratatui::style::{Color, Style, Modifier};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Theme {
    pub name: String,
    pub author: Option<String>,
    pub ui: AppTheme,
    pub syntax: SyntaxTheme,
    pub sidebar: SidebarTheme,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppTheme {
    pub background: Option<HexColor>,
    pub foreground: Option<HexColor>,
    
    pub normal_mode_bg: HexColor,
    pub command_mode_bg: HexColor,
    pub tree_mode_bg: HexColor,
    pub settings_mode_bg: HexColor,
    pub search_mode_bg: HexColor,
    
    pub status_bar_bg: Option<HexColor>,
    pub status_bar_fg: Option<HexColor>,
    
    pub selection_bg: HexColor,
    pub selection_fg: HexColor,
    pub search_highlight_bg: HexColor,
    pub search_highlight_fg: HexColor,
    
    pub shadow_color: Option<HexColor>,
    pub dim: HexColor,
    
    // Semantic Colors
    pub warning: HexColor,
    pub error: HexColor,
    pub success: HexColor,
    pub info: HexColor,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyntaxTheme {
    pub scene_heading: Option<HexColor>,
    pub character: Option<HexColor>,
    pub dialogue: Option<HexColor>,
    pub parenthetical: Option<HexColor>,
    pub transition: Option<HexColor>,
    pub action: Option<HexColor>,
    pub centered: Option<HexColor>,
    pub section: Option<HexColor>,
    pub synopsis: Option<HexColor>,
    pub note: Option<HexColor>,
    pub shot: Option<HexColor>,
    pub page_break: Option<HexColor>,
    pub metadata_key: Option<HexColor>,
    pub metadata_val: Option<HexColor>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SidebarTheme {
    pub background: Option<HexColor>,
    pub border: Option<HexColor>,
    pub item_selected_bg: Option<HexColor>,
    pub item_selected_fg: Option<HexColor>,
    pub item_dimmed: Option<HexColor>,
    pub section_header: Option<HexColor>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct HexColor(pub String);
    
impl HexColor {
    pub fn is_light(&self) -> bool {
        if self.0.starts_with('#') && let Ok((r, g, b)) = hex_to_rgb(&self.0) {
            let luminance = 0.299 * r as f32 + 0.587 * g as f32 + 0.114 * b as f32;
            return luminance > 128.0;
        }
        matches!(self.0.to_lowercase().as_str(), "white" | "yellow" | "lightcyan" | "lightgreen" | "lightyellow" | "lightblue" | "lightmagenta" | "lightred" | "cyan" | "silver")
    }
}

impl From<HexColor> for Color {
    fn from(val: HexColor) -> Self {
        if val.0.starts_with('#')
            && let Ok(c) = hex_to_rgb(&val.0) {
                return Color::Rgb(c.0, c.1, c.2);
            }
        match val.0.to_lowercase().as_str() {
            "black" => Color::Black,
            "red" => Color::Red,
            "green" => Color::Green,
            "yellow" => Color::Yellow,
            "blue" => Color::Blue,
            "magenta" => Color::Magenta,
            "cyan" => Color::Cyan,
            "gray" => Color::Gray,
            "darkgray" => Color::DarkGray,
            "lightred" => Color::LightRed,
            "lightgreen" => Color::LightGreen,
            "lightyellow" => Color::LightYellow,
            "lightblue" => Color::LightBlue,
            "lightmagenta" => Color::LightMagenta,
            "lightcyan" => Color::LightCyan,
            "white" => Color::White,
            _ => Color::Reset,
        }
    }
}

fn hex_to_rgb(hex: &str) -> Result<(u8, u8, u8), &'static str> {
    let hex = hex.trim_start_matches('#');
    if hex.len() != 6 {
        return Err("Invalid hex length");
    }
    let r = u8::from_str_radix(&hex[0..2], 16).map_err(|_| "Invalid hex")?;
    let g = u8::from_str_radix(&hex[2..4], 16).map_err(|_| "Invalid hex")?;
    let b = u8::from_str_radix(&hex[4..6], 16).map_err(|_| "Invalid hex")?;
    Ok((r, g, b))
}

impl Default for Theme {
    fn default() -> Self {
        Self::adaptive()
    }
}

impl Theme {
    pub fn is_dark(&self) -> bool {
        if let Some(bg) = &self.ui.background {
            !bg.is_light()
        } else {
            true // Default to dark if no background set (terminal default)
        }
    }

    pub fn adaptive() -> Self {
        Self {
            name: "Adaptive".to_string(),
            author: Some("Fount".to_string()),
            ui: AppTheme {
                background: None,
                foreground: None,
                normal_mode_bg: HexColor("blue".to_string()),
                command_mode_bg: HexColor("yellow".to_string()),
                tree_mode_bg: HexColor("lightcyan".to_string()),
                settings_mode_bg: HexColor("lightcyan".to_string()),
                search_mode_bg: HexColor("lightmagenta".to_string()),
                status_bar_bg: None,
                status_bar_fg: None,
                selection_bg: HexColor("white".to_string()),
                selection_fg: HexColor("black".to_string()),
                search_highlight_bg: HexColor("yellow".to_string()),
                search_highlight_fg: HexColor("black".to_string()),
                shadow_color: None,
                dim: HexColor("gray".to_string()),
                warning: HexColor("yellow".to_string()),
                error: HexColor("red".to_string()),
                success: HexColor("green".to_string()),
                info: HexColor("cyan".to_string()),
            },
            syntax: SyntaxTheme {
                scene_heading: None,
                character: None,
                dialogue: None,
                parenthetical: None,
                transition: None,
                action: None,
                centered: None,
                section: None,
                synopsis: None,
                note: None,
                shot: None,
                page_break: None,
                metadata_key: None,
                metadata_val: None,
            },
            sidebar: SidebarTheme {
                background: None,
                border: Some(HexColor("darkgray".to_string())),
                item_selected_bg: Some(HexColor("lightcyan".to_string())),
                item_selected_fg: Some(HexColor("black".to_string())),
                item_dimmed: Some(HexColor("darkgray".to_string())),
                section_header: Some(HexColor("lightcyan".to_string())),
            },
        }
    }

    pub fn nord() -> Self {
        Self {
            name: "Nord".to_string(),
            author: Some("Arctic Ice Studio".to_string()),
            ui: AppTheme {
                background: Some(HexColor("#2E3440".to_string())),
                foreground: Some(HexColor("#D8DEE9".to_string())),
                normal_mode_bg: HexColor("#81A1C1".to_string()),
                command_mode_bg: HexColor("#EBCB8B".to_string()),
                tree_mode_bg: HexColor("#88C0D0".to_string()),
                settings_mode_bg: HexColor("#88C0D0".to_string()),
                search_mode_bg: HexColor("#B48EAD".to_string()),
                status_bar_bg: Some(HexColor("#3B4252".to_string())),
                status_bar_fg: Some(HexColor("#D8DEE9".to_string())),
                selection_bg: HexColor("#4C566A".to_string()),
                selection_fg: HexColor("#ECEFF4".to_string()),
                search_highlight_bg: HexColor("#EBCB8B".to_string()),
                search_highlight_fg: HexColor("#2E3440".to_string()),
                shadow_color: Some(HexColor("#1E222A".to_string())),
                dim: HexColor("#4C566A".to_string()),
                warning: HexColor("#EBCB8B".to_string()),
                error: HexColor("#BF616A".to_string()),
                success: HexColor("#A3BE8C".to_string()),
                info: HexColor("#81A1C1".to_string()),
            },
            syntax: SyntaxTheme {
                scene_heading: Some(HexColor("#88C0D0".to_string())),
                character: Some(HexColor("#81A1C1".to_string())),
                dialogue: Some(HexColor("#D8DEE9".to_string())),
                parenthetical: Some(HexColor("#4C566A".to_string())),
                transition: Some(HexColor("#B48EAD".to_string())),
                action: Some(HexColor("#D8DEE9".to_string())),
                centered: Some(HexColor("#81A1C1".to_string())),
                section: Some(HexColor("#A3BE8C".to_string())),
                synopsis: Some(HexColor("#A3BE8C".to_string())),
                note: Some(HexColor("#A3BE8C".to_string())),
                shot: Some(HexColor("#EBCB8B".to_string())),
                page_break: Some(HexColor("#4C566A".to_string())),
                metadata_key: Some(HexColor("#5E81AC".to_string())),
                metadata_val: Some(HexColor("#D8DEE9".to_string())),
            },
            sidebar: SidebarTheme {
                background: Some(HexColor("#3B4252".to_string())),
                border: Some(HexColor("#4C566A".to_string())),
                item_selected_bg: Some(HexColor("#88C0D0".to_string())),
                item_selected_fg: Some(HexColor("#2E3440".to_string())),
                item_dimmed: Some(HexColor("#4C566A".to_string())),
                section_header: Some(HexColor("#88C0D0".to_string())),
            },
        }
    }

    pub fn solarized_dark() -> Self {
        Self {
            name: "Solarized Dark".to_string(),
            author: Some("Ethan Schoonover".to_string()),
            ui: AppTheme {
                background: Some(HexColor("#002B36".to_string())),
                foreground: Some(HexColor("#839496".to_string())),
                normal_mode_bg: HexColor("#268BD2".to_string()),
                command_mode_bg: HexColor("#B58900".to_string()),
                tree_mode_bg: HexColor("#2AA198".to_string()),
                settings_mode_bg: HexColor("#2AA198".to_string()),
                search_mode_bg: HexColor("#D33682".to_string()),
                status_bar_bg: Some(HexColor("#073642".to_string())),
                status_bar_fg: Some(HexColor("#839496".to_string())),
                selection_bg: HexColor("#073642".to_string()),
                selection_fg: HexColor("#93A1A1".to_string()),
                search_highlight_bg: HexColor("#B58900".to_string()),
                search_highlight_fg: HexColor("#002B36".to_string()),
                shadow_color: Some(HexColor("#001E26".to_string())),
                dim: HexColor("#586E75".to_string()),
                warning: HexColor("#B58900".to_string()),
                error: HexColor("#DC322F".to_string()),
                success: HexColor("#859900".to_string()),
                info: HexColor("#268BD2".to_string()),
            },
            syntax: SyntaxTheme {
                scene_heading: Some(HexColor("#2AA198".to_string())),
                character: Some(HexColor("#268BD2".to_string())),
                dialogue: Some(HexColor("#839496".to_string())),
                parenthetical: Some(HexColor("#586E75".to_string())),
                transition: Some(HexColor("#859900".to_string())),
                action: Some(HexColor("#839496".to_string())),
                centered: Some(HexColor("#268BD2".to_string())),
                section: Some(HexColor("#859900".to_string())),
                synopsis: Some(HexColor("#859900".to_string())),
                note: Some(HexColor("#859900".to_string())),
                shot: Some(HexColor("#B58900".to_string())),
                page_break: Some(HexColor("#073642".to_string())),
                metadata_key: Some(HexColor("#CB4B16".to_string())),
                metadata_val: Some(HexColor("#839496".to_string())),
            },
            sidebar: SidebarTheme {
                background: Some(HexColor("#073642".to_string())),
                border: Some(HexColor("#586E75".to_string())),
                item_selected_bg: Some(HexColor("#2AA198".to_string())),
                item_selected_fg: Some(HexColor("#002B36".to_string())),
                item_dimmed: Some(HexColor("#586E75".to_string())),
                section_header: Some(HexColor("#2AA198".to_string())),
            },
        }
    }

    pub fn dracula() -> Self {
        Self {
            name: "Dracula".to_string(),
            author: Some("Zeno Rocha".to_string()),
            ui: AppTheme {
                background: Some(HexColor("#282A36".to_string())),
                foreground: Some(HexColor("#F8F8F2".to_string())),
                normal_mode_bg: HexColor("#6272A4".to_string()),
                command_mode_bg: HexColor("#F1FA8C".to_string()),
                tree_mode_bg: HexColor("#8BE9FD".to_string()),
                settings_mode_bg: HexColor("#8BE9FD".to_string()),
                search_mode_bg: HexColor("#FF79C6".to_string()),
                status_bar_bg: Some(HexColor("#44475A".to_string())),
                status_bar_fg: Some(HexColor("#F8F8F2".to_string())),
                selection_bg: HexColor("#44475A".to_string()),
                selection_fg: HexColor("#F8F8F2".to_string()),
                search_highlight_bg: HexColor("#F1FA8C".to_string()),
                search_highlight_fg: HexColor("#282A36".to_string()),
                shadow_color: Some(HexColor("#191A21".to_string())),
                dim: HexColor("#6272A4".to_string()),
                warning: HexColor("#F1FA8C".to_string()),
                error: HexColor("#FF5555".to_string()),
                success: HexColor("#50FA7B".to_string()),
                info: HexColor("#8BE9FD".to_string()),
            },
            syntax: SyntaxTheme {
                scene_heading: Some(HexColor("#8BE9FD".to_string())),
                character: Some(HexColor("#BD93F9".to_string())),
                dialogue: Some(HexColor("#F8F8F2".to_string())),
                parenthetical: Some(HexColor("#6272A4".to_string())),
                transition: Some(HexColor("#FF79C6".to_string())),
                action: Some(HexColor("#F8F8F2".to_string())),
                centered: Some(HexColor("#BD93F9".to_string())),
                section: Some(HexColor("#50FA7B".to_string())),
                synopsis: Some(HexColor("#50FA7B".to_string())),
                note: Some(HexColor("#50FA7B".to_string())),
                shot: Some(HexColor("#FFB86C".to_string())),
                page_break: Some(HexColor("#44475A".to_string())),
                metadata_key: Some(HexColor("#BD93F9".to_string())),
                metadata_val: Some(HexColor("#F8F8F2".to_string())),
            },
            sidebar: SidebarTheme {
                background: Some(HexColor("#44475A".to_string())),
                border: Some(HexColor("#6272A4".to_string())),
                item_selected_bg: Some(HexColor("#8BE9FD".to_string())),
                item_selected_fg: Some(HexColor("#282A36".to_string())),
                item_dimmed: Some(HexColor("#6272A4".to_string())),
                section_header: Some(HexColor("#8BE9FD".to_string())),
            },
        }
    }

    pub fn gruvbox() -> Self {
        Self {
            name: "Gruvbox".to_string(),
            author: Some("Pavel Pertsev".to_string()),
            ui: AppTheme {
                background: Some(HexColor("#282828".to_string())),
                foreground: Some(HexColor("#EBDBB2".to_string())),
                normal_mode_bg: HexColor("#458588".to_string()),
                command_mode_bg: HexColor("#FABD2F".to_string()),
                tree_mode_bg: HexColor("#8EC07C".to_string()),
                settings_mode_bg: HexColor("#8EC07C".to_string()),
                search_mode_bg: HexColor("#D3869B".to_string()),
                status_bar_bg: Some(HexColor("#3C3836".to_string())),
                status_bar_fg: Some(HexColor("#EBDBB2".to_string())),
                selection_bg: HexColor("#3C3836".to_string()),
                selection_fg: HexColor("#EBDBB2".to_string()),
                search_highlight_bg: HexColor("#FABD2F".to_string()),
                search_highlight_fg: HexColor("#282828".to_string()),
                shadow_color: Some(HexColor("#1D2021".to_string())),
                dim: HexColor("#928374".to_string()),
                warning: HexColor("#FABD2F".to_string()),
                error: HexColor("#FB4934".to_string()),
                success: HexColor("#B8BB26".to_string()),
                info: HexColor("#83A598".to_string()),
            },
            syntax: SyntaxTheme {
                scene_heading: Some(HexColor("#8EC07C".to_string())),
                character: Some(HexColor("#83A598".to_string())),
                dialogue: Some(HexColor("#EBDBB2".to_string())),
                parenthetical: Some(HexColor("#928374".to_string())),
                transition: Some(HexColor("#FB4934".to_string())),
                action: Some(HexColor("#EBDBB2".to_string())),
                centered: Some(HexColor("#83A598".to_string())),
                section: Some(HexColor("#B8BB26".to_string())),
                synopsis: Some(HexColor("#B8BB26".to_string())),
                note: Some(HexColor("#B8BB26".to_string())),
                shot: Some(HexColor("#FE8019".to_string())),
                page_break: Some(HexColor("#3C3836".to_string())),
                metadata_key: Some(HexColor("#D65D0E".to_string())),
                metadata_val: Some(HexColor("#EBDBB2".to_string())),
            },
            sidebar: SidebarTheme {
                background: Some(HexColor("#3C3836".to_string())),
                border: Some(HexColor("#665C54".to_string())),
                item_selected_bg: Some(HexColor("#8EC07C".to_string())),
                item_selected_fg: Some(HexColor("#282828".to_string())),
                item_dimmed: Some(HexColor("#928374".to_string())),
                section_header: Some(HexColor("#8EC07C".to_string())),
            },
        }
    }

    pub fn moonlight() -> Self {
        Self {
            name: "Moonlight".to_string(),
            author: Some("Atomic".to_string()),
            ui: AppTheme {
                background: Some(HexColor("#191A21".to_string())),
                foreground: Some(HexColor("#D8DEE9".to_string())),
                normal_mode_bg: HexColor("#44475A".to_string()),
                command_mode_bg: HexColor("#FFB86C".to_string()),
                tree_mode_bg: HexColor("#8BE9FD".to_string()),
                settings_mode_bg: HexColor("#8BE9FD".to_string()),
                search_mode_bg: HexColor("#FF79C6".to_string()),
                status_bar_bg: Some(HexColor("#21222C".to_string())),
                status_bar_fg: Some(HexColor("#F8F8F2".to_string())),
                selection_bg: HexColor("#44475A".to_string()),
                selection_fg: HexColor("#F8F8F2".to_string()),
                search_highlight_bg: HexColor("#FFB86C".to_string()),
                search_highlight_fg: HexColor("#282A36".to_string()),
                shadow_color: Some(HexColor("#0D0E12".to_string())),
                dim: HexColor("#6272A4".to_string()),
                warning: HexColor("#FFB86C".to_string()),
                error: HexColor("#FF5555".to_string()),
                success: HexColor("#50FA7B".to_string()),
                info: HexColor("#8BE9FD".to_string()),
            },
            syntax: SyntaxTheme {
                scene_heading: Some(HexColor("#8BE9FD".to_string())),
                character: Some(HexColor("#BD93F9".to_string())),
                dialogue: Some(HexColor("#D8DEE9".to_string())),
                parenthetical: Some(HexColor("#6272A4".to_string())),
                transition: Some(HexColor("#FF79C6".to_string())),
                action: Some(HexColor("#D8DEE9".to_string())),
                centered: Some(HexColor("#BD93F9".to_string())),
                section: Some(HexColor("#50FA7B".to_string())),
                synopsis: Some(HexColor("#50FA7B".to_string())),
                note: Some(HexColor("#50FA7B".to_string())),
                shot: Some(HexColor("#FFB86C".to_string())),
                page_break: Some(HexColor("#44475A".to_string())),
                metadata_key: Some(HexColor("#BD93F9".to_string())),
                metadata_val: Some(HexColor("#D8DEE9".to_string())),
            },
            sidebar: SidebarTheme {
                background: Some(HexColor("#21222C".to_string())),
                border: Some(HexColor("#44475A".to_string())),
                item_selected_bg: Some(HexColor("#8BE9FD".to_string())),
                item_selected_fg: Some(HexColor("#282A36".to_string())),
                item_dimmed: Some(HexColor("#6272A4".to_string())),
                section_header: Some(HexColor("#8BE9FD".to_string())),
            },
        }
    }

    pub fn one_dark() -> Self {
        Self {
            name: "One Dark".to_string(),
            author: Some("Atom".to_string()),
            ui: AppTheme {
                background: Some(HexColor("#282C34".to_string())),
                foreground: Some(HexColor("#ABB2BF".to_string())),
                normal_mode_bg: HexColor("#61AFEF".to_string()),
                command_mode_bg: HexColor("#E5C07B".to_string()),
                tree_mode_bg: HexColor("#56B6C2".to_string()),
                settings_mode_bg: HexColor("#56B6C2".to_string()),
                search_mode_bg: HexColor("#C678DD".to_string()),
                status_bar_bg: Some(HexColor("#21252B".to_string())),
                status_bar_fg: Some(HexColor("#ABB2BF".to_string())),
                selection_bg: HexColor("#3E4451".to_string()),
                selection_fg: HexColor("#ABB2BF".to_string()),
                search_highlight_bg: HexColor("#E5C07B".to_string()),
                search_highlight_fg: HexColor("#282C34".to_string()),
                shadow_color: Some(HexColor("#181A1F".to_string())),
                dim: HexColor("#5C6370".to_string()),
                warning: HexColor("#E5C07B".to_string()),
                error: HexColor("#E06C75".to_string()),
                success: HexColor("#98C379".to_string()),
                info: HexColor("#61AFEF".to_string()),
            },
            syntax: SyntaxTheme {
                scene_heading: Some(HexColor("#56B6C2".to_string())),
                character: Some(HexColor("#61AFEF".to_string())),
                dialogue: Some(HexColor("#ABB2BF".to_string())),
                parenthetical: Some(HexColor("#5C6370".to_string())),
                transition: Some(HexColor("#C678DD".to_string())),
                action: Some(HexColor("#ABB2BF".to_string())),
                centered: Some(HexColor("#61AFEF".to_string())),
                section: Some(HexColor("#98C379".to_string())),
                synopsis: Some(HexColor("#98C379".to_string())),
                note: Some(HexColor("#98C379".to_string())),
                shot: Some(HexColor("#D19A66".to_string())),
                page_break: Some(HexColor("#3E4451".to_string())),
                metadata_key: Some(HexColor("#E06C75".to_string())),
                metadata_val: Some(HexColor("#ABB2BF".to_string())),
            },
            sidebar: SidebarTheme {
                background: Some(HexColor("#21252B".to_string())),
                border: Some(HexColor("#3E4451".to_string())),
                item_selected_bg: Some(HexColor("#56B6C2".to_string())),
                item_selected_fg: Some(HexColor("#282C34".to_string())),
                item_dimmed: Some(HexColor("#5C6370".to_string())),
                section_header: Some(HexColor("#56B6C2".to_string())),
            },
        }
    }

    pub fn catppuccin() -> Self {
        Self {
            name: "Catppuccin".to_string(),
            author: Some("Catppuccin Org".to_string()),
            ui: AppTheme {
                background: Some(HexColor("#1E1E2E".to_string())),
                foreground: Some(HexColor("#CDD6F4".to_string())),
                normal_mode_bg: HexColor("#89B4FA".to_string()),
                command_mode_bg: HexColor("#F9E2AF".to_string()),
                tree_mode_bg: HexColor("#89DCEB".to_string()),
                settings_mode_bg: HexColor("#89DCEB".to_string()),
                search_mode_bg: HexColor("#F5C2E7".to_string()),
                status_bar_bg: Some(HexColor("#181825".to_string())),
                status_bar_fg: Some(HexColor("#CDD6F4".to_string())),
                selection_bg: HexColor("#313244".to_string()),
                selection_fg: HexColor("#CDD6F4".to_string()),
                search_highlight_bg: HexColor("#F9E2AF".to_string()),
                search_highlight_fg: HexColor("#1E1E2E".to_string()),
                shadow_color: Some(HexColor("#11111B".to_string())),
                dim: HexColor("#6C7086".to_string()),
                warning: HexColor("#F9E2AF".to_string()),
                error: HexColor("#F38BA8".to_string()),
                success: HexColor("#A6E3A1".to_string()),
                info: HexColor("#89B4FA".to_string()),
            },
            syntax: SyntaxTheme {
                scene_heading: Some(HexColor("#89DCEB".to_string())),
                character: Some(HexColor("#89B4FA".to_string())),
                dialogue: Some(HexColor("#CDD6F4".to_string())),
                parenthetical: Some(HexColor("#6C7086".to_string())),
                transition: Some(HexColor("#CBA6F7".to_string())),
                action: Some(HexColor("#CDD6F4".to_string())),
                centered: Some(HexColor("#89B4FA".to_string())),
                section: Some(HexColor("#A6E3A1".to_string())),
                synopsis: Some(HexColor("#A6E3A1".to_string())),
                note: Some(HexColor("#A6E3A1".to_string())),
                shot: Some(HexColor("#FAB387".to_string())),
                page_break: Some(HexColor("#313244".to_string())),
                metadata_key: Some(HexColor("#F38BA8".to_string())),
                metadata_val: Some(HexColor("#CDD6F4".to_string())),
            },
            sidebar: SidebarTheme {
                background: Some(HexColor("#181825".to_string())),
                border: Some(HexColor("#313244".to_string())),
                item_selected_bg: Some(HexColor("#89DCEB".to_string())),
                item_selected_fg: Some(HexColor("#1E1E2E".to_string())),
                item_dimmed: Some(HexColor("#6C7086".to_string())),
                section_header: Some(HexColor("#89DCEB".to_string())),
            },
        }
    }

    pub fn monokai() -> Self {
        Self {
            name: "Monokai".to_string(),
            author: Some("Wimer Hazenberg".to_string()),
            ui: AppTheme {
                background: Some(HexColor("#272822".to_string())),
                foreground: Some(HexColor("#F8F8F2".to_string())),
                normal_mode_bg: HexColor("#66D9EF".to_string()),
                command_mode_bg: HexColor("#E6DB74".to_string()),
                tree_mode_bg: HexColor("#A6E22E".to_string()),
                settings_mode_bg: HexColor("#A6E22E".to_string()),
                search_mode_bg: HexColor("#F92672".to_string()),
                status_bar_bg: Some(HexColor("#1E1F1C".to_string())),
                status_bar_fg: Some(HexColor("#F8F8F2".to_string())),
                selection_bg: HexColor("#49483E".to_string()),
                selection_fg: HexColor("#F8F8F2".to_string()),
                search_highlight_bg: HexColor("#E6DB74".to_string()),
                search_highlight_fg: HexColor("#272822".to_string()),
                shadow_color: Some(HexColor("#141411".to_string())),
                dim: HexColor("#75715E".to_string()),
                warning: HexColor("#E6DB74".to_string()),
                error: HexColor("#F92672".to_string()),
                success: HexColor("#A6E22E".to_string()),
                info: HexColor("#66D9EF".to_string()),
            },
            syntax: SyntaxTheme {
                scene_heading: Some(HexColor("#A6E22E".to_string())),
                character: Some(HexColor("#66D9EF".to_string())),
                dialogue: Some(HexColor("#F8F8F2".to_string())),
                parenthetical: Some(HexColor("#75715E".to_string())),
                transition: Some(HexColor("#F92672".to_string())),
                action: Some(HexColor("#F8F8F2".to_string())),
                centered: Some(HexColor("#66D9EF".to_string())),
                section: Some(HexColor("#A6E22E".to_string())),
                synopsis: Some(HexColor("#A6E22E".to_string())),
                note: Some(HexColor("#A6E22E".to_string())),
                shot: Some(HexColor("#FD971F".to_string())),
                page_break: Some(HexColor("#49483E".to_string())),
                metadata_key: Some(HexColor("#AE81FF".to_string())),
                metadata_val: Some(HexColor("#F8F8F2".to_string())),
            },
            sidebar: SidebarTheme {
                background: Some(HexColor("#1E1F1C".to_string())),
                border: Some(HexColor("#49483E".to_string())),
                item_selected_bg: Some(HexColor("#A6E22E".to_string())),
                item_selected_fg: Some(HexColor("#272822".to_string())),
                item_dimmed: Some(HexColor("#75715E".to_string())),
                section_header: Some(HexColor("#66D9EF".to_string())),
            },
        }
    }

    pub fn solarized_light() -> Self {
        Self {
            name: "Solarized Light".to_string(),
            author: Some("Ethan Schoonover".to_string()),
            ui: AppTheme {
                background: Some(HexColor("#FDF6E3".to_string())),
                foreground: Some(HexColor("#657B83".to_string())),
                normal_mode_bg: HexColor("#268BD2".to_string()),
                command_mode_bg: HexColor("#B58900".to_string()),
                tree_mode_bg: HexColor("#2AA198".to_string()),
                settings_mode_bg: HexColor("#2AA198".to_string()),
                search_mode_bg: HexColor("#D33682".to_string()),
                status_bar_bg: Some(HexColor("#EEE8D5".to_string())),
                status_bar_fg: Some(HexColor("#657B83".to_string())),
                selection_bg: HexColor("#EEE8D5".to_string()),
                selection_fg: HexColor("#586E75".to_string()),
                search_highlight_bg: HexColor("#B58900".to_string()),
                search_highlight_fg: HexColor("#FDF6E3".to_string()),
                shadow_color: Some(HexColor("#E9E2D0".to_string())),
                dim: HexColor("#586E75".to_string()),
                warning: HexColor("#B58900".to_string()),
                error: HexColor("#DC322F".to_string()),
                success: HexColor("#859900".to_string()),
                info: HexColor("#268BD2".to_string()),
            },
            syntax: SyntaxTheme {
                scene_heading: Some(HexColor("#2AA198".to_string())),
                character: Some(HexColor("#268BD2".to_string())),
                dialogue: Some(HexColor("#000000".to_string())),
                parenthetical: Some(HexColor("#444444".to_string())),
                transition: Some(HexColor("#859900".to_string())),
                action: Some(HexColor("#000000".to_string())),
                centered: Some(HexColor("#268BD2".to_string())),
                section: Some(HexColor("#5F9F00".to_string())),
                synopsis: Some(HexColor("#444444".to_string())),
                note: Some(HexColor("#5F9F00".to_string())),
                shot: Some(HexColor("#B58900".to_string())),
                page_break: Some(HexColor("#586E75".to_string())),
                metadata_key: Some(HexColor("#CB4B16".to_string())),
                metadata_val: Some(HexColor("#000000".to_string())),
            },
            sidebar: SidebarTheme {
                background: Some(HexColor("#EEE8D5".to_string())),
                border: Some(HexColor("#586E75".to_string())),
                item_selected_bg: Some(HexColor("#2AA198".to_string())),
                item_selected_fg: Some(HexColor("#FDF6E3".to_string())),
                item_dimmed: Some(HexColor("#586E75".to_string())),
                section_header: Some(HexColor("#2AA198".to_string())),
            },
        }
    }

    pub fn paper() -> Self {
        Self {
            name: "Paper".to_string(),
            author: Some("Fount".to_string()),
            ui: AppTheme {
                background: Some(HexColor("#FFFFFF".to_string())),
                foreground: Some(HexColor("#1A1A1A".to_string())),
                normal_mode_bg: HexColor("#005F87".to_string()),
                command_mode_bg: HexColor("#D78700".to_string()),
                tree_mode_bg: HexColor("#008787".to_string()),
                settings_mode_bg: HexColor("#008787".to_string()),
                search_mode_bg: HexColor("#D75F87".to_string()),
                status_bar_bg: Some(HexColor("#EEEEEE".to_string())),
                status_bar_fg: Some(HexColor("#222222".to_string())),
                selection_bg: HexColor("#DADADA".to_string()),
                selection_fg: HexColor("#000000".to_string()),
                search_highlight_bg: HexColor("#FFFF00".to_string()),
                search_highlight_fg: HexColor("#000000".to_string()),
                shadow_color: Some(HexColor("#E0E0E0".to_string())),
                dim: HexColor("#555555".to_string()), // Darker for light mode
                warning: HexColor("#AF5F00".to_string()), // Darker yellow/orange
                error: HexColor("#D70000".to_string()),
                success: HexColor("#005F00".to_string()),
                info: HexColor("#005F87".to_string()),
            },
            syntax: SyntaxTheme {
                scene_heading: Some(HexColor("#005F87".to_string())),
                character: Some(HexColor("#005F87".to_string())),
                dialogue: Some(HexColor("#000000".to_string())),
                parenthetical: Some(HexColor("#111111".to_string())),
                transition: Some(HexColor("#D70000".to_string())),
                action: Some(HexColor("#000000".to_string())),
                centered: Some(HexColor("#005F87".to_string())),
                section: Some(HexColor("#005F00".to_string())),
                synopsis: Some(HexColor("#111111".to_string())),
                note: Some(HexColor("#005F00".to_string())),
                shot: Some(HexColor("#D78700".to_string())),
                page_break: Some(HexColor("#808080".to_string())),
                metadata_key: Some(HexColor("#AF0000".to_string())),
                metadata_val: Some(HexColor("#000000".to_string())),
            },
            sidebar: SidebarTheme {
                background: Some(HexColor("#F0F0F0".to_string())),
                border: Some(HexColor("#D0D0D0".to_string())),
                item_selected_bg: Some(HexColor("#005F87".to_string())),
                item_selected_fg: Some(HexColor("#FFFFFF".to_string())),
                item_dimmed: Some(HexColor("#222222".to_string())),
                section_header: Some(HexColor("#005F87".to_string())),
            },
        }
    }

    pub fn tokyo_night() -> Self {
        Self {
            name: "Tokyo Night".to_string(),
            author: Some("Enki".to_string()),
            ui: AppTheme {
                background: Some(HexColor("#1a1b26".to_string())),
                foreground: Some(HexColor("#a9b1d6".to_string())),
                normal_mode_bg: HexColor("#7aa2f7".to_string()),
                command_mode_bg: HexColor("#e0af68".to_string()),
                tree_mode_bg: HexColor("#7dcfff".to_string()),
                settings_mode_bg: HexColor("#7dcfff".to_string()),
                search_mode_bg: HexColor("#bb9af7".to_string()),
                status_bar_bg: Some(HexColor("#24283b".to_string())),
                status_bar_fg: Some(HexColor("#565f89".to_string())),
                selection_bg: HexColor("#33467C".to_string()),
                selection_fg: HexColor("#c0caf5".to_string()),
                search_highlight_bg: HexColor("#ff9e64".to_string()),
                search_highlight_fg: HexColor("#1a1b26".to_string()),
                shadow_color: Some(HexColor("#16161e".to_string())),
                dim: HexColor("#565f89".to_string()),
                warning: HexColor("#e0af68".to_string()),
                error: HexColor("#f7768e".to_string()),
                success: HexColor("#9ece6a".to_string()),
                info: HexColor("#7dcfff".to_string()),
            },
            syntax: SyntaxTheme {
                scene_heading: Some(HexColor("#7dcfff".to_string())),
                character: Some(HexColor("#bb9af7".to_string())),
                dialogue: Some(HexColor("#c0caf5".to_string())),
                parenthetical: Some(HexColor("#565f89".to_string())),
                transition: Some(HexColor("#9ece6a".to_string())),
                action: Some(HexColor("#a9b1d6".to_string())),
                centered: Some(HexColor("#bb9af7".to_string())),
                section: Some(HexColor("#9ece6a".to_string())),
                synopsis: Some(HexColor("#565f89".to_string())),
                note: Some(HexColor("#9ece6a".to_string())),
                shot: Some(HexColor("#e0af68".to_string())),
                page_break: Some(HexColor("#414868".to_string())),
                metadata_key: Some(HexColor("#f7768e".to_string())),
                metadata_val: Some(HexColor("#c0caf5".to_string())),
            },
            sidebar: SidebarTheme {
                background: Some(HexColor("#24283b".to_string())),
                border: Some(HexColor("#414868".to_string())),
                item_selected_bg: Some(HexColor("#7aa2f7".to_string())),
                item_selected_fg: Some(HexColor("#1a1b26".to_string())),
                item_dimmed: Some(HexColor("#565f89".to_string())),
                section_header: Some(HexColor("#7dcfff".to_string())),
            },
        }
    }

    pub fn rose_pine() -> Self {
        Self {
            name: "Rose Pine".to_string(),
            author: Some("Rosé Pine".to_string()),
            ui: AppTheme {
                background: Some(HexColor("#191724".to_string())),
                foreground: Some(HexColor("#e0def4".to_string())),
                normal_mode_bg: HexColor("#31748f".to_string()),
                command_mode_bg: HexColor("#f6c177".to_string()),
                tree_mode_bg: HexColor("#ebbcba".to_string()),
                settings_mode_bg: HexColor("#ebbcba".to_string()),
                search_mode_bg: HexColor("#c4a7e7".to_string()),
                status_bar_bg: Some(HexColor("#1f1d2e".to_string())),
                status_bar_fg: Some(HexColor("#908caa".to_string())),
                selection_bg: HexColor("#2a2837".to_string()),
                selection_fg: HexColor("#e0def4".to_string()),
                search_highlight_bg: HexColor("#eb6f92".to_string()),
                search_highlight_fg: HexColor("#191724".to_string()),
                shadow_color: Some(HexColor("#121019".to_string())),
                dim: HexColor("#6e6a86".to_string()),
                warning: HexColor("#f6c177".to_string()),
                error: HexColor("#eb6f92".to_string()),
                success: HexColor("#9ccfd8".to_string()),
                info: HexColor("#ebbcba".to_string()),
            },
            syntax: SyntaxTheme {
                scene_heading: Some(HexColor("#ebbcba".to_string())),
                character: Some(HexColor("#c4a7e7".to_string())),
                dialogue: Some(HexColor("#e0def4".to_string())),
                parenthetical: Some(HexColor("#908caa".to_string())),
                transition: Some(HexColor("#31748f".to_string())),
                action: Some(HexColor("#e0def4".to_string())),
                centered: Some(HexColor("#c4a7e7".to_string())),
                section: Some(HexColor("#9ccfd8".to_string())),
                synopsis: Some(HexColor("#908caa".to_string())),
                note: Some(HexColor("#9ccfd8".to_string())),
                shot: Some(HexColor("#f6c177".to_string())),
                page_break: Some(HexColor("#26233a".to_string())),
                metadata_key: Some(HexColor("#eb6f92".to_string())),
                metadata_val: Some(HexColor("#e0def4".to_string())),
            },
            sidebar: SidebarTheme {
                background: Some(HexColor("#1f1d2e".to_string())),
                border: Some(HexColor("#26233a".to_string())),
                item_selected_bg: Some(HexColor("#ebbcba".to_string())),
                item_selected_fg: Some(HexColor("#191724".to_string())),
                item_dimmed: Some(HexColor("#6e6a86".to_string())),
                section_header: Some(HexColor("#ebbcba".to_string())),
            },
        }
    }

    pub fn evergreen() -> Self {
        Self {
            name: "Evergreen".to_string(),
            author: Some("Fount".to_string()),
            ui: AppTheme {
                background: Some(HexColor("#0d1b13".to_string())),
                foreground: Some(HexColor("#d1d9d1".to_string())),
                normal_mode_bg: HexColor("#4f772d".to_string()),
                command_mode_bg: HexColor("#ecf39e".to_string()),
                tree_mode_bg: HexColor("#90a955".to_string()),
                settings_mode_bg: HexColor("#90a955".to_string()),
                search_mode_bg: HexColor("#31572c".to_string()),
                status_bar_bg: Some(HexColor("#132a13".to_string())),
                status_bar_fg: Some(HexColor("#4f772d".to_string())),
                selection_bg: HexColor("#31572c".to_string()),
                selection_fg: HexColor("#d1d9d1".to_string()),
                search_highlight_bg: HexColor("#ecf39e".to_string()),
                search_highlight_fg: HexColor("#0d1b13".to_string()),
                shadow_color: Some(HexColor("#060c08".to_string())),
                dim: HexColor("#4f772d".to_string()),
                warning: HexColor("#ecf39e".to_string()),
                error: HexColor("#bc4749".to_string()),
                success: HexColor("#a7c957".to_string()),
                info: HexColor("#90a955".to_string()),
            },
            syntax: SyntaxTheme {
                scene_heading: Some(HexColor("#90a955".to_string())),
                character: Some(HexColor("#ecf39e".to_string())),
                dialogue: Some(HexColor("#d1d9d1".to_string())),
                parenthetical: Some(HexColor("#4f772d".to_string())),
                transition: Some(HexColor("#31572c".to_string())),
                action: Some(HexColor("#d1d9d1".to_string())),
                centered: Some(HexColor("#ecf39e".to_string())),
                section: Some(HexColor("#4f772d".to_string())),
                synopsis: Some(HexColor("#4f772d".to_string())),
                note: Some(HexColor("#4f772d".to_string())),
                shot: Some(HexColor("#ecf39e".to_string())),
                page_break: Some(HexColor("#132a13".to_string())),
                metadata_key: Some(HexColor("#90a955".to_string())),
                metadata_val: Some(HexColor("#d1d9d1".to_string())),
            },
            sidebar: SidebarTheme {
                background: Some(HexColor("#132a13".to_string())),
                border: Some(HexColor("#31572c".to_string())),
                item_selected_bg: Some(HexColor("#4f772d".to_string())),
                item_selected_fg: Some(HexColor("#0d1b13".to_string())),
                item_dimmed: Some(HexColor("#4f772d".to_string())),
                section_header: Some(HexColor("#90a955".to_string())),
            },
        }
    }

    pub fn lilac() -> Self {
        Self {
            name: "Lilac".to_string(),
            author: Some("Fount".to_string()),
            ui: AppTheme {
                background: Some(HexColor("#f3e5f5".to_string())),
                foreground: Some(HexColor("#4a148c".to_string())),
                normal_mode_bg: HexColor("#7b1fa2".to_string()),
                command_mode_bg: HexColor("#6a1b9a".to_string()),
                tree_mode_bg: HexColor("#00acc1".to_string()),
                settings_mode_bg: HexColor("#00acc1".to_string()),
                search_mode_bg: HexColor("#d81b60".to_string()),
                status_bar_bg: Some(HexColor("#e1bee7".to_string())),
                status_bar_fg: Some(HexColor("#4a148c".to_string())),
                selection_bg: HexColor("#ce93d8".to_string()),
                selection_fg: HexColor("#4a148c".to_string()),
                search_highlight_bg: HexColor("#ffd54f".to_string()),
                search_highlight_fg: HexColor("#4a148c".to_string()),
                shadow_color: Some(HexColor("#cfd8dc".to_string())),
                dim: HexColor("#9c27b0".to_string()),
                warning: HexColor("#f57f17".to_string()),
                error: HexColor("#c62828".to_string()),
                success: HexColor("#2e7d32".to_string()),
                info: HexColor("#1565c0".to_string()),
            },
            syntax: SyntaxTheme {
                scene_heading: Some(HexColor("#7b1fa2".to_string())),
                character: Some(HexColor("#6a1b9a".to_string())),
                dialogue: Some(HexColor("#2a2a2a".to_string())),
                parenthetical: Some(HexColor("#9c27b0".to_string())),
                transition: Some(HexColor("#d81b60".to_string())),
                action: Some(HexColor("#333333".to_string())),
                centered: Some(HexColor("#6a1b9a".to_string())),
                section: Some(HexColor("#1b5e20".to_string())),
                synopsis: Some(HexColor("#9c27b0".to_string())),
                note: Some(HexColor("#2e7d32".to_string())),
                shot: Some(HexColor("#e65100".to_string())),
                page_break: Some(HexColor("#ce93d8".to_string())),
                metadata_key: Some(HexColor("#7b1fa2".to_string())),
                metadata_val: Some(HexColor("#4a148c".to_string())),
            },
            sidebar: SidebarTheme {
                background: Some(HexColor("#f8f0fb".to_string())),
                border: Some(HexColor("#e1bee7".to_string())),
                item_selected_bg: Some(HexColor("#7b1fa2".to_string())),
                item_selected_fg: Some(HexColor("#ffffff".to_string())),
                item_dimmed: Some(HexColor("#9c27b0".to_string())),
                section_header: Some(HexColor("#7b1fa2".to_string())),
            },
        }
    }

    pub fn is_light(&self) -> bool {
        if let Some(bg) = &self.ui.background {
            let hex = bg.0.trim_start_matches('#').to_lowercase();
            // Known light themes
            if hex == "ffffff" || hex == "fdf6e3" || hex == "paper" || hex == "solarized_light" {
                return true;
            }
            // Basic brightness check for hex colors
            if hex.len() == 6
                && let (Ok(r), Ok(g), Ok(b)) = (
                    u8::from_str_radix(&hex[0..2], 16),
                    u8::from_str_radix(&hex[2..4], 16),
                    u8::from_str_radix(&hex[4..6], 16),
                ) {
                    // Yiq brightness formula - Y = .299R + .587G + .114B
                    let brightness = ((r as u32 * 299) + (g as u32 * 587) + (b as u32 * 114)) / 1000;
                    return brightness > 150;
                }
        }
        self.name.to_lowercase().contains("light") || self.name.to_lowercase() == "paper"
    }

    pub fn primary_fg(&self) -> Color {
        self.ui.foreground.clone().map(Color::from).unwrap_or_else(|| {
            if self.is_light() { Color::Black } else { Color::White }
        })
    }

    pub fn primary_bg(&self) -> Color {
        self.ui.background.clone().map(Color::from).unwrap_or(Color::Reset)
    }

    pub fn normal_style(&self) -> Style {
        Style::default().fg(self.primary_fg()).bg(self.primary_bg())
    }

    pub fn warning_style(&self) -> Style {
        Style::default().fg(Color::from(self.ui.warning.clone()))
    }

    pub fn error_style(&self) -> Style {
        Style::default().fg(Color::from(self.ui.error.clone()))
    }

    pub fn success_style(&self) -> Style {
        Style::default().fg(Color::from(self.ui.success.clone()))
    }

    pub fn info_style(&self) -> Style {
        Style::default().fg(Color::from(self.ui.info.clone()))
    }

    pub fn secondary_style(&self) -> Style {
        let base = Style::default().fg(Color::from(self.ui.dim.clone()));
        if self.is_light() {
            base
        } else {
            base.add_modifier(Modifier::DIM)
        }
    }
}

pub struct ThemeManager {
    pub themes: HashMap<String, Theme>,
    pub current_theme: Theme,
}

impl Default for ThemeManager {
    fn default() -> Self {
        Self::new()
    }
}

impl ThemeManager {
    pub fn new() -> Self {
        let mut themes = HashMap::new();
        
        let mut add_theme = |theme: Theme| {
            themes.insert(theme.name.to_lowercase(), theme);
        };
        
        add_theme(Theme::adaptive());
        add_theme(Theme::nord());
        add_theme(Theme::solarized_dark());
        add_theme(Theme::dracula());
        add_theme(Theme::gruvbox());
        add_theme(Theme::moonlight());
        add_theme(Theme::one_dark());
        add_theme(Theme::catppuccin());
        add_theme(Theme::monokai());
        add_theme(Theme::solarized_light());
        add_theme(Theme::paper());
        add_theme(Theme::tokyo_night());
        add_theme(Theme::rose_pine());
        add_theme(Theme::evergreen());
        add_theme(Theme::lilac());
        
        Self {
            themes,
            current_theme: Theme::adaptive(),
        }
    }

    pub fn themes_dir() -> Option<PathBuf> {
        #[cfg(not(windows))]
        {
            let config_dir = std::env::var_os("XDG_CONFIG_HOME")
                .map(std::path::PathBuf::from)
                .unwrap_or_else(|| {
                    directories::BaseDirs::new()
                        .map(|base| base.home_dir().join(".config"))
                        .unwrap_or_default()
                });

            Some(config_dir.join("fount").join("themes"))
        }
        #[cfg(windows)]
        {
             directories::ProjectDirs::from("", "", "Fount")
                .map(|proj_dirs| proj_dirs.config_dir().join("themes"))
        }
    }

    pub fn load_user_themes(&mut self) {
        let Some(themes_dir) = Self::themes_dir() else { return; };
        
        if !themes_dir.exists() {
            let _ = fs::create_dir_all(&themes_dir);
            return;
        }

        if let Ok(entries) = fs::read_dir(themes_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().is_some_and(|ext| ext == "toml")
                    && let Ok(content) = fs::read_to_string(&path)
                        && let Ok(theme) = toml::from_str::<Theme>(&content) {
                            self.themes.insert(theme.name.to_lowercase(), theme);
                        }
            }
        }
    }

    pub fn set_theme(&mut self, name: &str) -> bool {
        if let Some(theme) = self.themes.get(&name.to_lowercase().replace(' ', "")) {
            self.current_theme = theme.clone();
            true
        } else {
            // Also try matching by name with spaces removed
            for theme in self.themes.values() {
                if theme.name.to_lowercase().replace(' ', "") == name.to_lowercase().replace(' ', "") {
                    self.current_theme = theme.clone();
                    return true;
                }
            }
            false
        }
    }

    pub fn list_themes(&self) -> Vec<String> {
        let mut names: Vec<String> = self.themes.values().map(|t| t.name.clone()).collect();
        names.sort();
        names
    }
}
