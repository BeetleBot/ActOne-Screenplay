use crate::config::Config;
use crate::theme::Theme;
use ratatui::style::{Color, Modifier, Style};

pub const PAGE_WIDTH: u16 = 60;

/// Lines per page for US Letter paper: (792 - 144) / 12 - 1 = 53
pub const LINES_PER_PAGE_LETTER: usize = 53;

/// Lines per page for A4 paper: (842 - 144) / 12 - 1 = 57
pub const LINES_PER_PAGE_A4: usize = 57;

/// Returns the correct lines-per-page for the given paper size string.
pub fn lines_per_page(paper_size: &str) -> usize {
    if paper_size.eq_ignore_ascii_case("letter") {
        LINES_PER_PAGE_LETTER
    } else {
        LINES_PER_PAGE_A4
    }
}

#[derive(Clone, Copy)]
pub struct Fmt {
    
    pub indent: u16,

    
    pub width: u16,

    
    
    
    
    pub wrap_indent: Option<u16>,
}

impl Fmt {
    
    pub const fn new(indent: u16, width: u16) -> Self {
        Self {
            indent,
            width,
            wrap_indent: None,
        }
    }

    
    
    
    
    pub const fn new_with_wrap(indent: u16, width: u16, wrap_indent: u16) -> Self {
        Self {
            indent,
            width,
            wrap_indent: Some(wrap_indent),
        }
    }
}

pub const FMT_ACTION: Fmt = Fmt::new(0, 60);

pub const FMT_SCENE: Fmt = Fmt::new(0, 60);

pub const FMT_CHARACTER: Fmt = Fmt::new(20, 38);

pub const FMT_DIALOGUE: Fmt = Fmt::new(11, 35);

pub const FMT_PAREN: Fmt = Fmt::new_with_wrap(16, 28, 17);

pub const FMT_TRANSITION: Fmt = Fmt::new(0, 60);

pub const FMT_CENTERED: Fmt = Fmt::new(0, 60);

pub const FMT_LYRICS: Fmt = Fmt::new(0, 60);

pub const FMT_SECTION: Fmt = Fmt::new(0, 60);

pub const FMT_SYNOPSIS: Fmt = Fmt::new(0, 60);

pub const FMT_NOTE: Fmt = Fmt::new(0, 60);

pub const FMT_METADATA_KEY: Fmt = Fmt::new(10, 51);

pub const FMT_METADATA_VAL: Fmt = Fmt::new(12, 49);

pub const FMT_METADATA_TITLE: Fmt = Fmt::new(10, 51);

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LineType {
    
    Empty,

    
    MetadataTitle,

    
    MetadataKey,

    
    MetadataValue,

    
    SceneHeading,

    
    Action,

    
    Character,

    
    DualDialogueCharacter,

    
    Parenthetical,

    
    Dialogue,

    
    Transition,

    
    Centered,

    
    Lyrics,

    
    Section,

    
    Synopsis,

    
    Note,

    
    Boneyard,

    
    PageBreak,

    
    Shot,
}

impl LineType {
    
    pub fn fmt(self) -> Fmt {
        match self {
            Self::SceneHeading | Self::Shot => FMT_SCENE,
            Self::Character | Self::DualDialogueCharacter => FMT_CHARACTER,
            Self::Dialogue => FMT_DIALOGUE,
            Self::Parenthetical => FMT_PAREN,
            Self::Transition => FMT_TRANSITION,
            Self::Centered => FMT_CENTERED,
            Self::Lyrics => FMT_LYRICS,
            Self::Section => FMT_SECTION,
            Self::Synopsis => FMT_SYNOPSIS,
            Self::Note | Self::Boneyard => FMT_NOTE,
            Self::MetadataTitle => FMT_METADATA_TITLE,
            Self::MetadataKey => FMT_METADATA_KEY,
            Self::MetadataValue => FMT_METADATA_VAL,
            _ => FMT_ACTION,
        }
    }
}

pub fn base_style(lt: LineType, config: &Config, theme: &Theme) -> Style {
    let mut style = match lt {
        LineType::SceneHeading => {
            let mut s = Style::default();
            if config.heading_style.contains("bold") {
                s = s.add_modifier(Modifier::BOLD);
            }
            if config.heading_style.contains("underline") {
                s = s.add_modifier(Modifier::UNDERLINED);
            }
            if let Some(c) = &theme.syntax.scene_heading {
                s = s.fg(c.clone().into());
            }
            s
        }
        LineType::Shot => {
            let mut s = Style::default();
            if config.shot_style.contains("bold") {
                s = s.add_modifier(Modifier::BOLD);
            }
            if config.shot_style.contains("underline") {
                s = s.add_modifier(Modifier::UNDERLINED);
            }
            if let Some(c) = &theme.syntax.shot {
                s = s.fg(c.clone().into());
            }
            s
        }
        LineType::Character | LineType::DualDialogueCharacter => {
            let mut s = Style::default().add_modifier(Modifier::BOLD);
            if let Some(c) = &theme.syntax.character {
                s = s.fg(c.clone().into());
            }
            s
        }
        LineType::Parenthetical => {
            let mut s = Style::default();
            if theme.syntax.parenthetical.is_none() {
                s = s.add_modifier(Modifier::DIM);
            }
            if let Some(c) = &theme.syntax.parenthetical {
                s = s.fg(c.clone().into());
            }
            s
        }
        LineType::Dialogue => {
            let mut s = Style::default();
            if let Some(c) = &theme.syntax.dialogue {
                s = s.fg(c.clone().into());
            }
            s
        }
        LineType::Transition => {
            let mut s = Style::default();
            if let Some(c) = &theme.syntax.transition {
                s = s.fg(c.clone().into());
            }
            s
        }
        LineType::Centered => {
            let mut s = Style::default();
            if let Some(c) = &theme.syntax.centered {
                s = s.fg(c.clone().into());
            }
            s
        }
        LineType::Lyrics => {
            Style::default().add_modifier(Modifier::ITALIC)
        }
        LineType::Section => {
            let mut s = Style::default();
            if let Some(c) = &theme.syntax.section {
                s = s.fg(c.clone().into());
            }
            s
        }
        LineType::Synopsis => {
            let mut s = Style::default().add_modifier(Modifier::ITALIC);
            if let Some(c) = &theme.syntax.synopsis {
                s = s.fg(c.clone().into());
            }
            s
        }
        LineType::Note | LineType::Boneyard => {
            let mut s = Style::default();
            if let Some(c) = &theme.syntax.note {
                s = s.fg(c.clone().into());
            }
            s.add_modifier(Modifier::ITALIC)
        }
        LineType::MetadataTitle | LineType::MetadataKey | LineType::MetadataValue => {
            let mut s = Style::default();
            match lt {
                LineType::MetadataTitle => {
                    s = s.add_modifier(Modifier::BOLD);
                    if let Some(c) = &theme.ui.foreground {
                        s = s.fg(c.clone().into());
                    }
                }
                LineType::MetadataKey => {
                    if let Some(c) = theme.syntax.metadata_key.clone() {
                        s = s.fg(c.into());
                    }
                }
                LineType::MetadataValue => {
                    if let Some(c) = theme.syntax.metadata_val.clone() {
                        s = s.fg(c.into());
                    }
                }
                _ => {}
            }
            s
        }
        LineType::PageBreak => {
            let mut s = Style::default().add_modifier(Modifier::DIM);
            if let Some(c) = &theme.syntax.page_break {
                s = s.fg(c.clone().into());
            }
            s
        }
        LineType::Action | LineType::Empty => {
            let mut s = Style::default();
            if let Some(c) = theme.syntax.action.clone() {
                s = s.fg(c.into());
            }
            s
        }
    };

    if config.no_color {
        style.fg = None;
        style.bg = None;
        style.underline_color = None;
    }

    if config.no_formatting {
        style.add_modifier = Modifier::empty();
        style.sub_modifier = Modifier::empty();
    }

    style
}

pub fn get_marker_color(note_text: &str, theme: &Theme) -> Option<Color> {
    let note_text = note_text.trim();
    let lower_text = note_text.to_lowercase();
    let is_light = theme.is_light();

    // 1. Check for departmental keys first
    
    // Technical & FX (Blue)
    if lower_text.starts_with("sfx:") || lower_text.starts_with("vfx:") || lower_text.starts_with("music:") {
        return Some(if is_light { Color::Rgb(0, 95, 135) } else { Color::Blue });
    }
    
    // Physical Assets (Cyan)
    if lower_text.starts_with("props:") || lower_text.starts_with("wardrobe:") || lower_text.starts_with("makeup:") {
        return Some(if is_light { Color::Rgb(0, 135, 135) } else { Color::Cyan });
    }
    
    // Narrative & Talent (Green)
    if lower_text.starts_with("cast:") || lower_text.starts_with("subtext:") {
        return Some(if is_light { Color::Rgb(0, 135, 0) } else { Color::Green });
    }
    
    // Management & Workflow (Magenta)
    if lower_text.starts_with("scenestatus:") || lower_text.starts_with("tags:") {
        return Some(if is_light { Color::Rgb(135, 0, 135) } else { Color::Magenta });
    }
    
    // Directional (Yellow)
    if lower_text.starts_with("dnotes:") || lower_text.starts_with("scenetype:") {
        return Some(if is_light { Color::Rgb(135, 135, 0) } else { Color::Yellow });
    }

    // 2. Handle sceneclr: prefix by recursively calling with the stripped value
    if lower_text.starts_with("sceneclr:") {
        return get_marker_color(note_text["sceneclr:".len()..].trim(), theme);
    }

    // 3. Fallback to existing color name logic
    let mut words = note_text.split_whitespace();
    let first_word = words.next()?.to_lowercase();

    let color_from_str = |w: &str| -> Option<Color> {
        match w {
            "red" => Some(if is_light { Color::Rgb(175, 0, 0) } else { Color::Red }),
            "blue" => Some(if is_light { Color::Rgb(0, 95, 135) } else { Color::Blue }),
            "green" => Some(if is_light { Color::Rgb(0, 135, 0) } else { Color::Green }),
            "pink" | "magenta" => Some(if is_light { Color::Rgb(135, 0, 135) } else { Color::Magenta }),
            "cyan" | "teal" => Some(if is_light { Color::Rgb(0, 135, 135) } else { Color::Cyan }),
            "yellow" => Some(if is_light { Color::Rgb(135, 135, 0) } else { Color::Yellow }),
            "orange" | "brown" => Some(Color::Rgb(255, 165, 0)),
            "gray" | "grey" => Some(Color::Gray),
            _ => None,
        }
    };

    if first_word == "marker" {
        if let Some(second_word) = words.next()
            && let Some(c) = color_from_str(&second_word.to_lowercase())
        {
            return Some(c);
        }
        return Some(Color::Rgb(255, 165, 0));
    }

    color_from_str(&first_word)
}

#[cfg(test)]
mod types_tests {
    use super::*;
    use ratatui::style::{Color, Modifier};

    #[test]
    fn test_fmt_dimensions_action() {
        let fmt = LineType::Action.fmt();
        assert_eq!(fmt.indent, 0);
        assert_eq!(fmt.width, 60);
    }

    #[test]
    fn test_fmt_dimensions_character() {
        let fmt = LineType::Character.fmt();
        assert_eq!(fmt.indent, 20);
        assert_eq!(fmt.width, 38);
    }

    #[test]
    fn test_fmt_dimensions_dialogue() {
        let fmt = LineType::Dialogue.fmt();
        assert_eq!(fmt.indent, 11);
        assert_eq!(fmt.width, 35);
    }

    #[test]
    fn test_fmt_dimensions_parenthetical() {
        let fmt = LineType::Parenthetical.fmt();
        assert_eq!(fmt.indent, 16);
        assert_eq!(fmt.width, 28);
    }

    #[test]
    fn test_fmt_dimensions_metadata() {
        let fmt = LineType::MetadataKey.fmt();
        assert_eq!(fmt.indent, 10);
        assert_eq!(fmt.width, 51);
        let fmt_val = LineType::MetadataValue.fmt();
        assert_eq!(fmt_val.indent, 12);
        assert_eq!(fmt_val.width, 49);
    }

    #[test]
    fn test_base_style_default_heading() {
        let config = Config::default();
        let theme = Theme::default();
        let style = base_style(LineType::SceneHeading, &config, &theme);
        assert_eq!(style.fg, None);
        assert!(style.add_modifier.contains(Modifier::BOLD));
        assert!(!style.add_modifier.contains(Modifier::UNDERLINED));
    }

    #[test]
    fn test_base_style_custom_heading() {
        let config = Config {
            heading_style: "underline".to_string(),
            ..Config::default()
        };
        let theme = Theme::default();
        let style = base_style(LineType::SceneHeading, &config, &theme);
        assert!(!style.add_modifier.contains(Modifier::BOLD));
        assert!(style.add_modifier.contains(Modifier::UNDERLINED));
    }

    #[test]
    fn test_base_style_custom_shot() {
        let config = Config {
            shot_style: "bold underline".to_string(),
            ..Config::default()
        };
        let theme = Theme::default();
        let style = base_style(LineType::Shot, &config, &theme);
        assert!(style.add_modifier.contains(Modifier::BOLD));
        assert!(style.add_modifier.contains(Modifier::UNDERLINED));
    }

    #[test]
    fn test_base_style_character() {
        let config = Config::default();
        let theme = Theme::default();
        let style = base_style(LineType::Character, &config, &theme);
        assert_eq!(style.fg, None);
        assert!(style.add_modifier.contains(Modifier::BOLD));
    }

    #[test]
    fn test_base_style_lyrics() {
        let config = Config::default();
        let theme = Theme::default();
        let style = base_style(LineType::Lyrics, &config, &theme);
        assert!(style.add_modifier.contains(Modifier::ITALIC));
    }

    #[test]
    fn test_base_style_action_explicit_reset() {
        let config = Config::default();
        let theme = Theme::default();
        let style = base_style(LineType::Action, &config, &theme);
        assert_eq!(style.fg, None);
    }

    #[test]
    fn test_get_marker_color_basic() {
        assert_eq!(get_marker_color("red", &Theme::adaptive()), Some(Color::Red));
        assert_eq!(get_marker_color("blue text", &Theme::adaptive()), Some(Color::Blue));
        assert_eq!(get_marker_color("green background", &Theme::adaptive()), Some(Color::Green));
        assert_eq!(get_marker_color("magenta note", &Theme::adaptive()), Some(Color::Magenta));
        assert_eq!(get_marker_color("cyan marker", &Theme::adaptive()), Some(Color::Cyan));
        assert_eq!(get_marker_color("yellow", &Theme::adaptive()), Some(Color::Yellow));
        assert_eq!(get_marker_color("gray area", &Theme::adaptive()), Some(Color::Gray));
    }

    #[test]
    fn test_get_marker_color_aliases() {
        assert_eq!(get_marker_color("pink box", &Theme::adaptive()), Some(Color::Magenta));
        assert_eq!(get_marker_color("teal", &Theme::adaptive()), Some(Color::Cyan));
        assert_eq!(get_marker_color("orange", &Theme::adaptive()), Some(Color::Rgb(255, 165, 0)));
        assert_eq!(get_marker_color("brown", &Theme::adaptive()), Some(Color::Rgb(255, 165, 0)));
        assert_eq!(get_marker_color("grey", &Theme::adaptive()), Some(Color::Gray));
    }

    #[test]
    fn test_get_marker_color_fallback() {
        assert_eq!(
            get_marker_color("marker custom", &Theme::adaptive()),
            Some(Color::Rgb(255, 165, 0))
        );
        assert_eq!(get_marker_color("just a plain note", &Theme::adaptive()), None);
    }

    #[test]
    fn test_base_style_no_color_strips_color_only() {
        let config = Config {
            no_color: true,
            ..Config::default()
        };
        let theme = Theme::default();

        let style_heading = base_style(LineType::SceneHeading, &config, &theme);
        let style_char = base_style(LineType::Character, &config, &theme);
        let style_lyrics = base_style(LineType::Lyrics, &config, &theme);

        assert_eq!(style_heading.fg, None);
        assert_eq!(style_char.fg, None);
        assert_eq!(style_lyrics.fg, None);

        assert!(style_heading.add_modifier.contains(Modifier::BOLD));
        assert!(style_char.add_modifier.contains(Modifier::BOLD));
        assert!(style_lyrics.add_modifier.contains(Modifier::ITALIC));
    }

    #[test]
    fn test_base_style_no_formatting_strips_modifiers() {
        let config = Config {
            no_formatting: true,
            ..Config::default()
        };
        let theme = Theme::default();

        let style_heading = base_style(LineType::SceneHeading, &config, &theme);
        let style_char = base_style(LineType::Character, &config, &theme);
        let style_lyrics = base_style(LineType::Lyrics, &config, &theme);

        assert!(!style_heading.add_modifier.contains(Modifier::BOLD));
        assert!(!style_char.add_modifier.contains(Modifier::BOLD));
        assert!(!style_lyrics.add_modifier.contains(Modifier::ITALIC));

        assert_eq!(style_heading.fg, None);
        assert_eq!(style_char.fg, None);
        assert_eq!(style_lyrics.fg, None);
    }

    #[test]
    fn test_base_style_no_color_and_no_formatting() {
        let config = Config {
            no_color: true,
            no_formatting: true,
            ..Config::default()
        };
        let theme = Theme::default();

        let style_heading = base_style(LineType::SceneHeading, &config, &theme);
        let style_char = base_style(LineType::Character, &config, &theme);
        let style_lyrics = base_style(LineType::Lyrics, &config, &theme);

        assert_eq!(style_heading, Style::default());
        assert_eq!(style_char, Style::default());
        assert_eq!(style_lyrics, Style::default());
    }

    #[test]
    fn test_fmt_constructors() {
        let fmt1 = Fmt::new(5, 50);
        assert_eq!(fmt1.indent, 5);
        assert_eq!(fmt1.width, 50);
        assert_eq!(fmt1.wrap_indent, None);

        let fmt2 = Fmt::new_with_wrap(5, 50, 10);
        assert_eq!(fmt2.indent, 5);
        assert_eq!(fmt2.width, 50);
        assert_eq!(fmt2.wrap_indent, Some(10));
    }

    #[test]
    fn test_get_marker_color_strict_first_word() {
        assert_eq!(get_marker_color("red", &Theme::adaptive()), Some(Color::Red));
        assert_eq!(get_marker_color("red text here", &Theme::adaptive()), Some(Color::Red));
        assert_eq!(get_marker_color("blue background", &Theme::adaptive()), Some(Color::Blue));
        assert_eq!(get_marker_color("  green  ", &Theme::adaptive()), Some(Color::Green));
        assert_eq!(get_marker_color("magenta note", &Theme::adaptive()), Some(Color::Magenta));
        assert_eq!(get_marker_color("cyan marker", &Theme::adaptive()), Some(Color::Cyan));
        assert_eq!(get_marker_color("yellow", &Theme::adaptive()), Some(Color::Yellow));
        assert_eq!(get_marker_color("gray area", &Theme::adaptive()), Some(Color::Gray));
    }

    #[test]
    fn test_get_marker_color_ignores_inner_words() {
        assert_eq!(get_marker_color("this is red", &Theme::adaptive()), None);
        assert_eq!(get_marker_color("a blue note", &Theme::adaptive()), None);
        assert_eq!(get_marker_color("please make this green", &Theme::adaptive()), None);
        assert_eq!(get_marker_color("just a plain note", &Theme::adaptive()), None);
    }

    #[test]
    fn test_get_marker_color_marker_prefix() {
        assert_eq!(get_marker_color("marker", &Theme::adaptive()), Some(Color::Rgb(255, 165, 0)));
        assert_eq!(
            get_marker_color("marker custom text", &Theme::adaptive()),
            Some(Color::Rgb(255, 165, 0))
        );
        assert_eq!(get_marker_color("marker red", &Theme::adaptive()), Some(Color::Red));
        assert_eq!(get_marker_color("marker blue text", &Theme::adaptive()), Some(Color::Blue));
        assert_eq!(get_marker_color("marker teal something", &Theme::adaptive()), Some(Color::Cyan));
        assert_eq!(get_marker_color("  marker   pink  ", &Theme::adaptive()), Some(Color::Magenta));
    }
}
