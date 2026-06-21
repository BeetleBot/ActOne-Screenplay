use std::collections::{HashMap, HashSet};

use ratatui::{
    style::{Color, Modifier, Style},
    text::Span,
};

use crate::types::get_marker_color;

pub trait StringCaseExt {
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    fn to_uppercase_1to1(&self) -> String;
}

impl StringCaseExt for str {
    fn to_uppercase_1to1(&self) -> String {
        self.chars()
            .map(|c| {
                let mut upper = c.to_uppercase();
                let first = upper.next().unwrap_or(c);
                if upper.next().is_some() { c } else { first }
            })
            .collect()
    }
}

#[inline]
pub fn has_markup_bytes(text: &str) -> bool {
    text.as_bytes()
        .iter()
        .any(|&b| matches!(b, b'*' | b'_' | b'\\' | b'[' | b'/'))
}

bitflags::bitflags! {
    #[derive(Default, Clone, Copy, PartialEq, Eq)]
    pub struct StyleBits: u8 {
        const BOLD       = 1 << 0;
        const ITALIC     = 1 << 1;
        const UNDERLINED = 1 << 2;
        const NOTE       = 1 << 3;
        const BONEYARD   = 1 << 4;
        const HIDDEN     = 1 << 5;
    }
}

#[derive(Default, Clone)]
pub struct LineFormatting {
    /// Bitmask for each character position in the line.
    pub char_styles: Vec<StyleBits>,

    /// Specific colors for notes, keyed by character position.
    pub note_color: HashMap<usize, Color>,
}

impl LineFormatting {
    pub fn new(len: usize) -> Self {
        Self {
            char_styles: vec![StyleBits::default(); len],
            note_color: HashMap::new(),
        }
    }

    #[inline]
    pub fn has_style(&self, idx: usize, style: StyleBits) -> bool {
        self.char_styles.get(idx).is_some_and(|bits| bits.contains(style))
    }

    #[inline]
    pub fn add_style(&mut self, idx: usize, style: StyleBits) {
        if let Some(bits) = self.char_styles.get_mut(idx) {
            *bits |= style;
        }
    }

    #[inline]
    pub fn is_hidden(&self, idx: usize) -> bool {
        self.has_style(idx, StyleBits::HIDDEN)
    }
}

struct PairDef<'a> {
    open: &'a [char],
    close: &'a [char],
    hide_markers: bool,
}

fn find_pairs(
    len: usize,
    chars: &[char],
    skip: &mut HashSet<usize>,
    fmt: &mut LineFormatting,
    def: PairDef,
    apply: &mut dyn FnMut(usize, usize, &mut LineFormatting),
) {
    let mut i = 0;
    while i < len {
        if skip.contains(&i) {
            i += 1;
            continue;
        }
        let mut match_open = true;
        for (k, &c) in def.open.iter().enumerate() {
            if i + k >= len || chars[i + k] != c || skip.contains(&(i + k)) {
                match_open = false;
                break;
            }
        }
        if match_open {
            let mut j = i + def.open.len();
            while j < len {
                if skip.contains(&j) {
                    j += 1;
                    continue;
                }
                let mut match_close = true;
                for (k, &c) in def.close.iter().enumerate() {
                    if j + k >= len || chars[j + k] != c || skip.contains(&(j + k)) {
                        match_close = false;
                        break;
                    }
                }
                if match_close {
                    apply(i, j, fmt);
                    for k in 0..def.open.len() {
                        skip.insert(i + k);
                        if def.hide_markers {
                            fmt.add_style(i + k, StyleBits::HIDDEN);
                        }
                    }
                    for k in 0..def.close.len() {
                        skip.insert(j + k);
                        if def.hide_markers {
                            fmt.add_style(j + k, StyleBits::HIDDEN);
                        }
                    }
                    i = j + def.close.len() - 1;
                    break;
                }
                j += 1;
            }
        }
        i += 1;
    }
}

pub fn parse_formatting(text: &str, theme: &crate::theme::Theme) -> LineFormatting {
    if !has_markup_bytes(text) {
        return LineFormatting::default();
    }

    let chars: Vec<char> = text.chars().collect();
    let len = chars.len();
    let mut fmt = LineFormatting::new(len);
    let mut skip = HashSet::new();

    for (i, &c) in chars.iter().enumerate() {
        if c == '\\' && i + 1 < len {
            skip.insert(i);
            fmt.add_style(i, StyleBits::HIDDEN);
            skip.insert(i + 1);
        }
    }

    find_pairs(
        len,
        &chars,
        &mut skip,
        &mut fmt,
        PairDef { open: &['/', '*'][..], close: &['*', '/'][..], hide_markers: true },
        &mut |start, end, f| {
            for i in start..(end + 2) {
                f.add_style(i, StyleBits::BONEYARD);
            }
        },
    );

    find_pairs(
        len,
        &chars,
        &mut skip,
        &mut fmt,
        PairDef { open: &['[', '['][..], close: &[']', ']'][..], hide_markers: true },
        &mut |start, end, f| {
            let content: String = chars[start + 2..end].iter().collect();
            let color = get_marker_color(&content, theme);
            for i in start..(end + 2) {
                f.add_style(i, StyleBits::NOTE);
                if let Some(c) = color {
                    f.note_color.insert(i, c);
                }
            }
        },
    );

    find_pairs(
        len,
        &chars,
        &mut skip,
        &mut fmt,
        PairDef { open: &['*', '*', '*'][..], close: &['*', '*', '*'][..], hide_markers: true },
        &mut |start, end, f| {
            for i in (start + 3)..end {
                f.add_style(i, StyleBits::BOLD);
                f.add_style(i, StyleBits::ITALIC);
            }
        },
    );
    find_pairs(
        len,
        &chars,
        &mut skip,
        &mut fmt,
        PairDef { open: &['*', '*'][..], close: &['*', '*'][..], hide_markers: true },
        &mut |start, end, f| {
            for i in (start + 2)..end {
                f.add_style(i, StyleBits::BOLD);
            }
        },
    );
    find_pairs(
        len,
        &chars,
        &mut skip,
        &mut fmt,
        PairDef { open: &['*'][..], close: &['*'][..], hide_markers: true },
        &mut |start, end, f| {
            for i in (start + 1)..end {
                f.add_style(i, StyleBits::ITALIC);
            }
        },
    );
    find_pairs(
        len,
        &chars,
        &mut skip,
        &mut fmt,
        PairDef { open: &['_'][..], close: &['_'][..], hide_markers: true },
        &mut |start, end, f| {
            for i in (start + 1)..end {
                f.add_style(i, StyleBits::UNDERLINED);
            }
        },
    );

    fmt
}

#[derive(Debug, Clone, Copy, Default)]
pub struct RenderConfig {
    
    
    pub reveal_markup: bool,

    
    
    pub skip_markdown: bool,

    
    
    
    pub exclude_comments: bool,

    
    
    
    
    pub char_offset: usize,

    
    
    
    pub meta_key_end: usize,

    
    pub no_color: bool,

    
    pub no_formatting: bool,
    pub is_active: bool,
}

pub fn render_inline(
    text: &str,
    base: Style,
    fmt: &LineFormatting,
    cfg: RenderConfig,
    highlights: &HashSet<usize>,
    selection: &HashSet<usize>,
) -> Vec<Span<'static>> {
    if cfg.skip_markdown && !cfg.exclude_comments {
        return vec![Span::styled(text.to_string(), base)];
    }

    let chars: Vec<char> = text.chars().collect();
    let mut spans = Vec::new();
    let mut buf = String::new();
    let mut current_style = base;

    for (local_i, &c) in chars.iter().enumerate() {
        let global_i = cfg.char_offset + local_i;

        let styles = fmt.char_styles.get(global_i).copied().unwrap_or_default();

        if cfg.exclude_comments
            && (styles.contains(StyleBits::BONEYARD) || styles.contains(StyleBits::NOTE))
        {
            continue;
        }

        if !cfg.reveal_markup && styles.contains(StyleBits::HIDDEN) {
            continue;
        }

        let mut s = base;

        if !cfg.no_formatting {
            if styles.contains(StyleBits::BOLD) {
                s.add_modifier = s.add_modifier.union(Modifier::BOLD);
            }
            if styles.contains(StyleBits::ITALIC) || styles.contains(StyleBits::NOTE) {
                s.add_modifier = s.add_modifier.union(Modifier::ITALIC);
            }
            if styles.contains(StyleBits::UNDERLINED) {
                s.add_modifier = s.add_modifier.union(Modifier::UNDERLINED);
            }
        }

        if !cfg.no_color {
            let is_key = global_i < cfg.meta_key_end;

            if styles.contains(StyleBits::BONEYARD) {
                s.fg = Some(Color::DarkGray);
            } else if styles.contains(StyleBits::NOTE) {
                s.fg = Some(
                    fmt.note_color
                        .get(&global_i)
                        .copied()
                        .unwrap_or(base.fg.unwrap_or(Color::Green)),
                );
            } else if is_key {
                s.fg = Some(Color::DarkGray);
            }
        }

        if selection.contains(&global_i) {
            if cfg.no_color {
                s.add_modifier = s.add_modifier.union(Modifier::REVERSED);
            } else {
                s.bg = Some(Color::Cyan);
                s.fg = Some(Color::Black);
            }
        } else if highlights.contains(&global_i) {
            if cfg.no_color {
                s.fg = None;
                s.bg = None;
                s.add_modifier = s.add_modifier.union(Modifier::REVERSED);
            } else {
                s.bg = Some(Color::Yellow);
                s.fg = Some(Color::Black);

                s.sub_modifier = s.sub_modifier.union(Modifier::BOLD).union(Modifier::DIM);
            }
        }

        if s != current_style && !buf.is_empty() {
            spans.push(Span::styled(buf.clone(), current_style));
            buf.clear();
        }
        current_style = s;
        buf.push(c);
    }

    if !buf.is_empty() {
        spans.push(Span::styled(buf, current_style));
    }
    if spans.is_empty() {
        spans.push(Span::styled(String::new(), base));
    }
    spans
}

#[cfg(test)]
mod formatting_tests {
    use super::*;

    fn assert_upper_1to1(input: &str, expected: &str) {
        let result = input.to_uppercase_1to1();
        assert_eq!(
            result, expected,
            "Uppercase value mismatch for input '{}'",
            input
        );
        assert_eq!(
            input.chars().count(),
            result.chars().count(),
            "FATAL: Length invariant violated for input '{}'. Expected {} chars, got {}.",
            input,
            input.chars().count(),
            result.chars().count()
        );
    }

    #[test]
    fn test_parse_formatting_bold() {
        let fmt = parse_formatting("This is **bold** text.", &crate::theme::Theme::adaptive());
        assert!(!fmt.has_style(7, StyleBits::BOLD));
        assert!(!fmt.has_style(8, StyleBits::BOLD));
        assert!(fmt.has_style(10, StyleBits::BOLD));
        assert!(fmt.has_style(11, StyleBits::BOLD));
        assert!(fmt.has_style(12, StyleBits::BOLD));
        assert!(fmt.has_style(13, StyleBits::BOLD));
        assert!(!fmt.has_style(14, StyleBits::BOLD));
        assert!(!fmt.has_style(15, StyleBits::BOLD));
        assert!(fmt.has_style(8, StyleBits::HIDDEN));
        assert!(fmt.has_style(9, StyleBits::HIDDEN));
        assert!(fmt.has_style(14, StyleBits::HIDDEN));
        assert!(fmt.has_style(15, StyleBits::HIDDEN));
    }

    #[test]
    fn test_parse_formatting_italic() {
        let fmt = parse_formatting("An *italic* word.", &crate::theme::Theme::adaptive());
        assert!(fmt.has_style(4, StyleBits::ITALIC));
        assert!(fmt.has_style(9, StyleBits::ITALIC));
        assert!(fmt.has_style(3, StyleBits::HIDDEN));
        assert!(fmt.has_style(10, StyleBits::HIDDEN));
    }

    #[test]
    fn test_parse_formatting_underline() {
        let fmt = parse_formatting("An _underlined_ word.", &crate::theme::Theme::adaptive());
        assert!(fmt.has_style(4, StyleBits::UNDERLINED));
        assert!(fmt.has_style(13, StyleBits::UNDERLINED));
        assert!(fmt.has_style(3, StyleBits::HIDDEN));
        assert!(fmt.has_style(14, StyleBits::HIDDEN));
    }

    #[test]
    fn test_parse_formatting_bold_italic() {
        let fmt = parse_formatting("Some ***bold italic*** text.", &crate::theme::Theme::adaptive());
        assert!(fmt.has_style(8, StyleBits::BOLD));
        assert!(fmt.has_style(8, StyleBits::ITALIC));
        assert!(fmt.has_style(18, StyleBits::BOLD));
        assert!(fmt.has_style(18, StyleBits::ITALIC));
        assert!(fmt.has_style(5, StyleBits::HIDDEN));
        assert!(fmt.has_style(6, StyleBits::HIDDEN));
        assert!(fmt.has_style(7, StyleBits::HIDDEN));
        assert!(fmt.has_style(19, StyleBits::HIDDEN));
        assert!(fmt.has_style(20, StyleBits::HIDDEN));
        assert!(fmt.has_style(21, StyleBits::HIDDEN));
    }

    #[test]
    fn test_parse_formatting_escaped() {
        let fmt = parse_formatting("Not \\*italic\\*.", &crate::theme::Theme::adaptive());
        assert!(fmt.char_styles.iter().all(|s| !s.contains(StyleBits::ITALIC)));
        assert!(fmt.has_style(4, StyleBits::HIDDEN));
        assert!(fmt.has_style(12, StyleBits::HIDDEN));
    }

    #[test]
    fn test_parse_formatting_boneyard() {
        let fmt = parse_formatting("/*hidden*/", &crate::theme::Theme::adaptive());
        assert!(fmt.has_style(0, StyleBits::BONEYARD));
        assert!(fmt.has_style(1, StyleBits::BONEYARD));
        assert!(fmt.has_style(2, StyleBits::BONEYARD));
        assert!(fmt.has_style(8, StyleBits::BONEYARD));
        assert!(fmt.has_style(9, StyleBits::BONEYARD));
        assert!(fmt.has_style(0, StyleBits::HIDDEN));
    }

    #[test]
    fn test_parse_formatting_notes() {
        let fmt = parse_formatting("[[note text]]", &crate::theme::Theme::adaptive());
        assert!(fmt.has_style(0, StyleBits::NOTE));
        assert!(fmt.has_style(2, StyleBits::NOTE));
        assert!(fmt.has_style(11, StyleBits::NOTE));
        assert!(fmt.has_style(12, StyleBits::NOTE));
        assert!(fmt.has_style(0, StyleBits::HIDDEN));
    }

    #[test]
    fn test_parse_formatting_notes_with_color() {
        let fmt = parse_formatting("[[yellow note]]", &crate::theme::Theme::adaptive());
        assert!(fmt.has_style(5, StyleBits::NOTE));
        assert_eq!(fmt.note_color.get(&5), Some(&ratatui::style::Color::Yellow));
    }

    #[test]
    fn test_render_inline_no_markdown_skip() {
        let fmt = parse_formatting("**bold**", &crate::theme::Theme::adaptive());
        let cfg = RenderConfig {
            skip_markdown: true,
            ..Default::default()
        };
        let hl = HashSet::new();
        let sel = HashSet::new();
        let spans = render_inline("**bold**", Style::default(), &fmt, cfg, &hl, &sel);
        assert_eq!(spans.len(), 1);
        assert_eq!(spans[0].content, "**bold**");
    }

    #[test]
    fn test_render_inline_reveal_markup() {
        let fmt = parse_formatting("**bold**", &crate::theme::Theme::adaptive());
        let cfg = RenderConfig {
            reveal_markup: true,
            ..Default::default()
        };
        let hl = HashSet::new();
        let sel = HashSet::new();
        let spans = render_inline("**bold**", Style::default(), &fmt, cfg, &hl, &sel);
        let complete_text: String = spans.iter().map(|s| s.content.as_ref()).collect();
        assert_eq!(complete_text, "**bold**");
    }

    #[test]
    fn test_render_inline_hide_markup() {
        let fmt = parse_formatting("**bold**", &crate::theme::Theme::adaptive());
        let hl = HashSet::new();
        let spans = render_inline(
            "**bold**",
            Style::default(),
            &fmt,
            RenderConfig::default(),
            &hl,
            &HashSet::new(),
        );
        let complete_text: String = spans.iter().map(|s| s.content.as_ref()).collect();
        assert_eq!(complete_text, "bold");
    }

    #[test]
    fn test_render_inline_metadata_key_color() {
        let fmt = LineFormatting::default();
        let cfg = RenderConfig {
            meta_key_end: 7,
            ..Default::default()
        };
        let hl = HashSet::new();
        let spans = render_inline("Title: Text", Style::default(), &fmt, cfg, &hl, &HashSet::new());
        assert_eq!(spans[0].content, "Title: ");
        assert_eq!(spans[0].style.fg, Some(ratatui::style::Color::DarkGray));
        assert_eq!(spans[1].content, "Text");
        assert_eq!(spans[1].style.fg, None);
    }

    #[test]
    fn test_render_inline_no_color_only() {
        let fmt = parse_formatting("**bold text** with [[yellow note]]", &crate::theme::Theme::adaptive());
        let cfg = RenderConfig {
            reveal_markup: true,
            no_color: true,
            no_formatting: false,
            ..Default::default()
        };
        let hl = HashSet::new();

        let spans = render_inline(
            "**bold text** with [[yellow note]]",
            Style::default(),
            &fmt,
            cfg,
            &hl,
            &HashSet::new(),
        );

        let bold_span = spans.iter().find(|s| s.content.contains("bold")).unwrap();
        assert_eq!(
            bold_span.style.fg, None,
            "Bold span color should be stripped"
        );
        assert!(
            bold_span
                .style
                .add_modifier
                .contains(ratatui::style::Modifier::BOLD),
            "Bold modifier should remain"
        );

        let note_span = spans.iter().find(|s| s.content.contains("yellow")).unwrap();
        assert_eq!(note_span.style.fg, None, "Note color should be stripped");
        assert!(
            note_span
                .style
                .add_modifier
                .contains(ratatui::style::Modifier::ITALIC),
            "Note italic modifier should remain"
        );
    }

    #[test]
    fn test_render_inline_no_formatting_only() {
        let fmt = parse_formatting("**bold text** with [[yellow note]]", &crate::theme::Theme::adaptive());
        let cfg = RenderConfig {
            reveal_markup: true,
            no_color: false,
            no_formatting: true,
            ..Default::default()
        };
        let hl = HashSet::new();

        let spans = render_inline(
            "**bold text** with [[yellow note]]",
            Style::default(),
            &fmt,
            cfg,
            &hl,
            &HashSet::new(),
        );

        let bold_span = spans.iter().find(|s| s.content.contains("bold")).unwrap();
        assert_eq!(
            bold_span.style.add_modifier,
            ratatui::style::Modifier::empty(),
            "Bold modifier should be stripped"
        );

        let note_span = spans.iter().find(|s| s.content.contains("yellow")).unwrap();
        assert_eq!(
            note_span.style.add_modifier,
            ratatui::style::Modifier::empty(),
            "Note italic modifier should be stripped"
        );
        assert_eq!(
            note_span.style.fg,
            Some(ratatui::style::Color::Yellow),
            "Note color should remain"
        );
    }

    #[test]
    fn test_render_inline_no_color_and_no_formatting() {
        let fmt = parse_formatting("**bold text** with [[yellow note]]", &crate::theme::Theme::adaptive());
        let cfg = RenderConfig {
            reveal_markup: true,
            no_color: true,
            no_formatting: true,
            ..Default::default()
        };
        let hl = HashSet::new();

        let spans = render_inline(
            "**bold text** with [[yellow note]]",
            Style::default(),
            &fmt,
            cfg,
            &hl,
            &HashSet::new(),
        );

        for span in spans {
            assert_eq!(
                span.style,
                Style::default(),
                "Everything should be stripped down to default style"
            );
        }
    }

    #[test]
    fn test_render_inline_search_highlight_color() {
        let fmt = LineFormatting::default();
        let cfg = RenderConfig::default();

        let mut hl = HashSet::new();
        hl.extend(0..4);

        let base_style = Style::default()
            .add_modifier(Modifier::BOLD)
            .fg(Color::White);

        let spans = render_inline("test string", base_style, &fmt, cfg, &hl, &HashSet::new());

        let highlight_span = &spans[0];
        assert_eq!(highlight_span.content, "test");
        assert_eq!(highlight_span.style.bg, Some(Color::Yellow));
        assert_eq!(highlight_span.style.fg, Some(Color::Black));

        assert!(highlight_span.style.sub_modifier.contains(Modifier::BOLD));
    }

    #[test]
    fn test_render_inline_search_highlight_no_color() {
        let fmt = LineFormatting::default();
        let cfg = RenderConfig {
            no_color: true,
            ..Default::default()
        };

        let mut hl = HashSet::new();
        hl.extend(0..4);

        let spans = render_inline("test string", Style::default(), &fmt, cfg, &hl, &HashSet::new());

        let highlight_span = &spans[0];
        assert_eq!(highlight_span.style.bg, None);
        assert_eq!(highlight_span.style.fg, None);

        assert!(
            highlight_span
                .style
                .add_modifier
                .contains(Modifier::REVERSED)
        );
    }

    #[test]
    fn test_to_uppercase_1to1_ascii_and_latin() {
        assert_upper_1to1("hello", "HELLO");
        assert_upper_1to1("Hello World!", "HELLO WORLD!");
    }

    #[test]
    fn test_to_uppercase_1to1_cyrillic() {
        assert_upper_1to1("привет", "ПРИВЕТ");
        assert_upper_1to1("ёжик", "ЁЖИК");
    }

    #[test]
    fn test_to_uppercase_1to1_german_eszett() {
        assert_upper_1to1("straße", "STRAßE");
        assert_upper_1to1("groß", "GROß");
        assert_upper_1to1("weiß", "WEIß");
    }

    #[test]
    fn test_to_uppercase_1to1_typographic_ligatures() {
        assert_upper_1to1("ﬁnancial", "ﬁNANCIAL");
        assert_upper_1to1("ﬂight", "ﬂIGHT");
        assert_upper_1to1("baﬄe", "BAﬄE");
    }

    #[test]
    fn test_to_uppercase_1to1_emojis_and_zwj() {
        assert_upper_1to1("🦀 rust", "🦀 RUST");
        assert_upper_1to1("🧑‍🧑‍🧒‍🧒 family", "🧑‍🧑‍🧒‍🧒 FAMILY");
        assert_upper_1to1("🏳️‍🌈 pride", "🏳️‍🌈 PRIDE");
    }

    #[test]
    fn test_to_uppercase_1to1_greek_expanding() {
        assert_upper_1to1("αβγ", "ΑΒΓ");
        assert_upper_1to1("φαΐ", "ΦΑΐ");
    }

    #[test]
    fn test_to_uppercase_1to1_combining_diacritics() {
        assert_upper_1to1("áb́ć", "ÁB́Ć");
        assert_upper_1to1("приве́т", "ПРИВЕ́Т");
    }

    #[test]
    fn test_to_uppercase_1to1_dutch_ligature() {
        let input = "ĳsvogel";
        let result = input.to_uppercase_1to1();

        assert_eq!(
            input.chars().count(),
            result.chars().count(),
            "Length invariant failed for Dutch ligature"
        );

        assert!(result.ends_with("SVOGEL"));
    }

    #[test]
    fn test_render_inline_exclude_comments() {
        let fmt = parse_formatting("Action /* hidden */", &crate::theme::Theme::adaptive());
        let cfg = RenderConfig {
            exclude_comments: true,
            ..Default::default()
        };
        let hl = HashSet::new();

        let spans = render_inline("Action /* hidden */", Style::default(), &fmt, cfg, &hl, &HashSet::new());
        let text: String = spans.iter().map(|s| s.content.as_ref()).collect();
        assert_eq!(text, "Action ");
    }

    #[test]
    fn test_render_inline_boneyard_color() {
        let fmt = parse_formatting("/* boneyard */", &crate::theme::Theme::adaptive());
        let cfg = RenderConfig::default();
        let hl = HashSet::new();

        let spans = render_inline("/* boneyard */", Style::default(), &fmt, cfg, &hl, &HashSet::new());
        assert_eq!(spans[0].style.fg, Some(ratatui::style::Color::DarkGray));
    }

    #[test]
    fn test_parse_formatting_notes_with_strict_colors() {
        let fmt1 = parse_formatting("[[yellow note]]", &crate::theme::Theme::adaptive());
        assert_eq!(
            fmt1.note_color.get(&5),
            Some(&ratatui::style::Color::Yellow),
            "Yellow note must be mapped to Yellow color"
        );

        let fmt2 = parse_formatting("[[this is yellow]]", &crate::theme::Theme::adaptive());
        assert!(
            fmt2.note_color.is_empty(),
            "Color word inside the note text must be ignored"
        );

        let fmt3 = parse_formatting("[[marker red]]", &crate::theme::Theme::adaptive());
        assert_eq!(
            fmt3.note_color.get(&5),
            Some(&ratatui::style::Color::Red),
            "Marker prefix followed by Red must be Red"
        );
    }
}
