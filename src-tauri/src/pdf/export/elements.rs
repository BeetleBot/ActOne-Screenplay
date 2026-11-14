use cosmic_text::{Attrs, Buffer, Family, FontSystem, Metrics, Shaping, Weight};
use krilla::{
    geom::{PathBuilder, Point, Rect, Transform},
    surface::Surface,
};
use std::collections::HashMap;

use crate::pdf::{
    rich_string::RichString,
    screenplay::{Dialogue, DialogueElement, Element},
};

use super::layout::{AllFonts, DialogueMargins, FONT_SIZE, LayoutInfo, Margin, PaperSize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Alignment {
    LeftToRight,
    RightToLeft,
    Centered,
}

pub struct DrawContext<'a, 'b> {
    pub layout_info: &'a LayoutInfo<'a>,
    pub surface: &'a mut Surface<'b>,
    pub y_position: &'a mut f32,
    pub max_y: f32,
    pub is_revised: bool,
    pub font_system: &'a mut FontSystem,
    pub font_cache: &'a mut HashMap<cosmic_text::fontdb::ID, krilla::text::Font>,
}

#[allow(dead_code)]
fn measure_line_width(font_system: &mut FontSystem, text: &str, font_size: f32) -> f32 {
    let metrics = Metrics::new(font_size, font_size);
    let mut buffer = Buffer::new(font_system, metrics);
    let mut buffer = buffer.borrow_with(font_system);
    buffer.set_size(Some(f32::MAX), Some(font_size * 2.0));
    let attrs = Attrs::new().family(Family::Name("Courier Prime"));
    buffer.set_text(text, attrs, Shaping::Advanced);

    let mut width = 0.0_f32;
    for run in buffer.layout_runs() {
        for glyph in run.glyphs.iter() {
            width = width.max(glyph.x + glyph.w);
        }
    }
    width
}

pub struct KrillaGlyphWrapper {
    pub glyph_id: u32,
    pub start: usize,
    pub end: usize,
    pub x_advance: f32,
    pub x_offset: f32,
    pub y_offset: f32,
}

impl krilla::text::Glyph for KrillaGlyphWrapper {
    fn glyph_id(&self) -> krilla::text::GlyphId {
        krilla::text::GlyphId::new(self.glyph_id)
    }

    fn text_range(&self) -> std::ops::Range<usize> {
        self.start..self.end
    }

    fn x_advance(&self, size: f32) -> f32 {
        self.x_advance * size
    }

    fn x_offset(&self, size: f32) -> f32 {
        self.x_offset * size
    }

    fn y_offset(&self, size: f32) -> f32 {
        self.y_offset * size
    }

    fn y_advance(&self, _size: f32) -> f32 {
        0.0
    }

    fn location(&self) -> Option<krilla::surface::Location> {
        None
    }
}

pub struct ShapedRun {
    pub font_id: cosmic_text::fontdb::ID,
    pub glyphs: Vec<KrillaGlyphWrapper>,
    pub text: String,
    pub x_offset: f32,
    pub paragraph_family: String,
    pub is_italic: bool,
}

pub struct ShapedLine {
    /// Zero-based hard source line; soft wrapping does not advance this index.
    pub source_line: usize,
    pub runs: Vec<ShapedRun>,
    pub width: f32,
    pub underline_ranges: Vec<(f32, f32)>,
    pub strike_ranges: Vec<(f32, f32)>,
    pub highlight_ranges: Vec<(f32, f32)>,
    pub link_ranges: Vec<(f32, f32, String)>,
}

pub struct ShapedParagraph {
    pub lines: Vec<ShapedLine>,
}

fn adjust_and_rebuild_run(
    plain: &str,
    font_id: cosmic_text::fontdb::ID,
    mut glyphs: Vec<KrillaGlyphWrapper>,
    x_offset: f32,
    paragraph_family: &str,
    is_italic: bool,
) -> ShapedRun {
    if glyphs.is_empty() {
        return ShapedRun {
            font_id,
            glyphs,
            text: String::new(),
            x_offset,
            paragraph_family: paragraph_family.to_string(),
            is_italic,
        };
    }
    let min_start = glyphs.iter().map(|g| g.start).min().unwrap();
    let max_end = glyphs.iter().map(|g| g.end).max().unwrap();
    let text = plain.get(min_start..max_end).unwrap_or("").to_string();

    for g in &mut glyphs {
        g.start = g.start.saturating_sub(min_start);
        g.end = g.end.saturating_sub(min_start);
    }

    ShapedRun {
        font_id,
        glyphs,
        text,
        x_offset,
        paragraph_family: paragraph_family.to_string(),
        is_italic,
    }
}

#[allow(dead_code)]
pub fn contains_indic(s: &str) -> bool {
    s.chars().any(|c| matches!(c as u32, 0x0900..=0x0D7F))
}

fn script_family_for_text(text: &str) -> Option<&'static str> {
    for c in text.chars() {
        let val = c as u32;
        match val {
            0x0B80..=0x0BFF => return Some("Mukta Malar"),
            0x0C00..=0x0C7F => return Some("Hind Guntur"),
            0x0980..=0x09FF => return Some("Hind Siliguri"),
            0x0A80..=0x0AFF => return Some("Hind Vadodara"),
            0x0C80..=0x0CFF => return Some("Baloo Tamma 2"),
            0x0D00..=0x0D7F => return Some("Baloo Chettan 2"),
            0x0A00..=0x0A7F => return Some("Baloo Paaji 2"),
            0x0B00..=0x0B7F => return Some("Baloo Bhaina 2"),
            0x0900..=0x097F => return Some("Mukta"),
            _ => {}
        }
    }
    None
}

fn user_family_for_text(text: &str, script_fonts: &HashMap<String, String>) -> Option<String> {
    for c in text.chars() {
        let val = c as u32;
        let script = match val {
            0x0B80..=0x0BFF => "tamil",
            0x0C00..=0x0C7F => "telugu",
            0x0980..=0x09FF => "bengali",
            0x0A80..=0x0AFF => "gujarati",
            0x0C80..=0x0CFF => "kannada",
            0x0D00..=0x0D7F => "malayalam",
            0x0A00..=0x0A7F => "gurmukhi",
            0x0B00..=0x0B7F => "oriya",
            0x0900..=0x097F => "devanagari",
            _ => continue,
        };
        if let Some(font) = script_fonts.get(script)
            && !font.is_empty()
        {
            return Some(font.clone());
        }
    }
    None
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum ScriptType {
    English,
    Indic,
    Neutral,
}

fn split_indices_by_script(text: &str) -> Vec<(usize, usize, bool)> {
    if text.is_empty() {
        return vec![];
    }

    let chars: Vec<char> = text.chars().collect();
    let mut char_indices: Vec<usize> = text.char_indices().map(|(idx, _)| idx).collect();
    char_indices.push(text.len());

    let mut types = vec![ScriptType::Neutral; chars.len()];

    for (i, &c) in chars.iter().enumerate() {
        let val = c as u32;
        if c.is_ascii_alphabetic() {
            types[i] = ScriptType::English;
        } else if (0x0900..=0x0D7F).contains(&val) {
            types[i] = ScriptType::Indic;
        }
    }

    let first_non_neutral = types.iter().find(|&&t| t != ScriptType::Neutral).copied();
    let default_type = first_non_neutral.unwrap_or(ScriptType::English);

    let mut last_type = default_type;
    for i in 0..chars.len() {
        if types[i] == ScriptType::Neutral {
            types[i] = last_type;
        } else {
            last_type = types[i];
        }
    }

    let mut ranges = Vec::new();
    if chars.is_empty() {
        return ranges;
    }

    let mut start_idx = 0;
    let mut current_is_english = types[0] == ScriptType::English;

    for i in 1..chars.len() {
        let is_eng = types[i] == ScriptType::English;
        if is_eng != current_is_english {
            ranges.push((char_indices[start_idx], char_indices[i], current_is_english));
            start_idx = i;
            current_is_english = is_eng;
        }
    }
    ranges.push((
        char_indices[start_idx],
        char_indices[chars.len()],
        current_is_english,
    ));

    ranges
}

pub(crate) fn shape_rich_string(
    font_system: &mut FontSystem,
    content: &RichString,
    max_width: f32,
    font_size: f32,
    export_font: &str,
    script_fonts: &HashMap<String, String>,
) -> ShapedParagraph {
    let plain = content.to_plain_string();
    if plain.is_empty() {
        return ShapedParagraph { lines: vec![] };
    }

    let is_sans =
        export_font == "courier_prime_sans" || content.elements.iter().any(|e| e.is_sans());
    let base_family = if is_sans {
        "Courier Prime Sans"
    } else if !export_font.is_empty() && export_font != "courier_prime" {
        export_font
    } else {
        "Courier Prime"
    };
    let family_name = user_family_for_text(&plain, script_fonts)
        .or_else(|| script_family_for_text(&plain).map(String::from))
        .unwrap_or_else(|| base_family.to_string());

    // Build italic span map: (byte_start, byte_end) for each italic region
    let mut italic_spans: Vec<(usize, usize)> = Vec::new();
    // Build underline span map: (byte_start, byte_end) for each underlined region
    let mut underline_spans: Vec<(usize, usize)> = Vec::new();
    // Build strikethrough span map: (byte_start, byte_end) for each struck region
    let mut strike_spans: Vec<(usize, usize)> = Vec::new();
    // Build highlight span map: (byte_start, byte_end) for each highlighted region
    let mut highlight_spans: Vec<(usize, usize)> = Vec::new();
    // Build link span map: (byte_start, byte_end, url)
    let mut link_spans: Vec<(usize, usize, String)> = Vec::new();
    let mut span_offset = 0;
    for element in &content.elements {
        let byte_len = element.text.len();
        if byte_len > 0 {
            if element.is_italic() {
                italic_spans.push((span_offset, span_offset + byte_len));
            }
            if element.is_underline() {
                underline_spans.push((span_offset, span_offset + byte_len));
            }
            if element.is_strike() {
                strike_spans.push((span_offset, span_offset + byte_len));
            }
            if element.is_highlight() {
                highlight_spans.push((span_offset, span_offset + byte_len));
            }
            if let Some(url) = &element.link_url {
                link_spans.push((span_offset, span_offset + byte_len, url.clone()));
            }
        }
        span_offset += byte_len;
    }

    let metrics = Metrics::new(font_size, font_size);
    let mut buffer = Buffer::new(font_system, metrics);
    let mut buffer = buffer.borrow_with(font_system);
    buffer.set_size(Some(max_width), None);

    let default_attrs = Attrs::new().family(Family::Name(&family_name));

    // Per-element formatting using set_rich_text
    let mut spans: Vec<(&str, Attrs)> = Vec::new();
    for element in &content.elements {
        let mut base_attrs = default_attrs;
        if element.is_bold() {
            base_attrs = base_attrs.weight(Weight::BOLD);
        }
        if element.is_mono() {
            base_attrs = base_attrs.family(Family::Name("Courier Prime"));
        }

        let ranges = split_indices_by_script(&element.text);
        for (start, end, is_eng) in ranges {
            let substring = &element.text[start..end];
            let mut attrs = base_attrs;
            if is_eng {
                if !element.is_mono() {
                    attrs = attrs.family(Family::Name(base_family));
                }
                if element.is_italic() {
                    attrs = attrs.style(cosmic_text::Style::Italic);
                }
            } else {
                attrs = attrs.family(Family::Name(&family_name));
                // Explicitly keep Normal style for Indic fonts so cosmic-text doesn't fall back to Courier Prime Italic
                attrs = attrs.style(cosmic_text::Style::Normal);
            }
            spans.push((substring, attrs));
        }
    }
    buffer.set_rich_text(spans, default_attrs, Shaping::Advanced);

    // cosmic-text glyph ranges are relative to each hard source line, whereas
    // RichString attributes and PDF text ranges refer to the complete string.
    let mut offset = 0;
    let source_line_offsets: Vec<usize> = plain
        .split_inclusive('\n')
        .map(|line| {
            let start = offset;
            offset += line.len();
            start
        })
        .collect();
    let mut lines = Vec::new();
    for run in buffer.layout_runs() {
        let source_offset = source_line_offsets
            .get(run.line_i)
            .copied()
            .unwrap_or(plain.len());
        let line_width = run.glyphs.iter().fold(0.0_f32, |acc, g| acc.max(g.x + g.w));

        let mut runs_in_line = Vec::new();
        let mut current_font_id = None;
        let mut current_glyphs = Vec::new();
        let mut current_start_x = 0.0;
        let mut current_is_italic = false;
        let mut underline_x_ranges: Vec<(f32, f32)> = Vec::new();
        let mut strike_x_ranges: Vec<(f32, f32)> = Vec::new();
        let mut highlight_x_ranges: Vec<(f32, f32)> = Vec::new();
        let mut link_x_ranges: Vec<(f32, f32, String)> = Vec::new();

        for glyph in run.glyphs.iter() {
            let mut start = source_offset + glyph.start;
            let mut end = source_offset + glyph.end;
            while start > 0 && !plain.is_char_boundary(start) {
                start -= 1;
            }
            while end < plain.len() && !plain.is_char_boundary(end) {
                end += 1;
            }

            let glyph_is_italic = italic_spans
                .iter()
                .any(|(it_start, it_end)| start < *it_end && end > *it_start);

            if current_font_id.is_none() {
                current_font_id = Some(glyph.font_id);
                current_start_x = glyph.x;
                current_is_italic = glyph_is_italic;
            } else if Some(glyph.font_id) != current_font_id || glyph_is_italic != current_is_italic
            {
                let font_id = current_font_id.unwrap();
                let run_obj = adjust_and_rebuild_run(
                    &plain,
                    font_id,
                    current_glyphs,
                    current_start_x,
                    &family_name,
                    current_is_italic,
                );
                runs_in_line.push(run_obj);

                current_font_id = Some(glyph.font_id);
                current_glyphs = Vec::new();
                current_start_x = glyph.x;
                current_is_italic = glyph_is_italic;
            }

            // Check if this glyph falls within any underline span
            let glyph_is_underlined = underline_spans
                .iter()
                .any(|(ul_start, ul_end)| start < *ul_end && end > *ul_start);
            if glyph_is_underlined {
                underline_x_ranges.push((glyph.x, glyph.w));
            }

            // Check if this glyph falls within any strikethrough span
            let glyph_is_struck = strike_spans
                .iter()
                .any(|(st_start, st_end)| start < *st_end && end > *st_start);
            if glyph_is_struck {
                strike_x_ranges.push((glyph.x, glyph.w));
            }

            let glyph_is_highlighted = highlight_spans
                .iter()
                .any(|(hl_start, hl_end)| start < *hl_end && end > *hl_start);
            if glyph_is_highlighted {
                highlight_x_ranges.push((glyph.x, glyph.w));
            }

            // Check if this glyph falls within any link span
            for (l_start, l_end, url) in &link_spans {
                if start < *l_end && end > *l_start {
                    link_x_ranges.push((glyph.x, glyph.w, url.clone()));
                }
            }

            current_glyphs.push(KrillaGlyphWrapper {
                glyph_id: glyph.glyph_id as u32,
                start,
                end,
                x_advance: glyph.w / glyph.font_size,
                x_offset: glyph.x_offset,
                y_offset: glyph.y_offset,
            });
        }

        if let Some(font_id) = current_font_id {
            let run_obj = adjust_and_rebuild_run(
                &plain,
                font_id,
                current_glyphs,
                current_start_x,
                &family_name,
                current_is_italic,
            );
            runs_in_line.push(run_obj);
        }

        // Merge overlapping/adjacent underline x-ranges
        underline_x_ranges.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap());
        let mut merged: Vec<(f32, f32)> = Vec::new();
        for (x, w) in underline_x_ranges {
            if let Some(last) = merged.last_mut() {
                let last_end = last.0 + last.1;
                if x <= last_end + 0.5 {
                    last.1 = (x + w - last.0).max(last.1);
                } else {
                    merged.push((x, w));
                }
            } else {
                merged.push((x, w));
            }
        }

        // Merge overlapping/adjacent strikethrough x-ranges
        strike_x_ranges.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap());
        let mut merged_strike: Vec<(f32, f32)> = Vec::new();
        for (x, w) in strike_x_ranges {
            if let Some(last) = merged_strike.last_mut() {
                let last_end = last.0 + last.1;
                if x <= last_end + 0.5 {
                    last.1 = (x + w - last.0).max(last.1);
                } else {
                    merged_strike.push((x, w));
                }
            } else {
                merged_strike.push((x, w));
            }
        }

        // Merge overlapping/adjacent highlight x-ranges
        highlight_x_ranges.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap());
        let mut merged_highlight: Vec<(f32, f32)> = Vec::new();
        for (x, w) in highlight_x_ranges {
            if let Some(last) = merged_highlight.last_mut() {
                let last_end = last.0 + last.1;
                if x <= last_end + 0.5 {
                    last.1 = (x + w - last.0).max(last.1);
                } else {
                    merged_highlight.push((x, w));
                }
            } else {
                merged_highlight.push((x, w));
            }
        }

        // Merge overlapping/adjacent link x-ranges
        link_x_ranges.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap());
        let mut merged_links: Vec<(f32, f32, String)> = Vec::new();
        for (x, w, url) in link_x_ranges {
            if let Some(last) = merged_links.last_mut() {
                let last_end = last.0 + last.1;
                if last.2 == url && x <= last_end + 0.5 {
                    last.1 = (x + w - last.0).max(last.1);
                } else {
                    merged_links.push((x, w, url));
                }
            } else {
                merged_links.push((x, w, url));
            }
        }

        lines.push(ShapedLine {
            source_line: run.line_i,
            runs: runs_in_line,
            width: line_width,
            underline_ranges: merged,
            strike_ranges: merged_strike,
            highlight_ranges: merged_highlight,
            link_ranges: merged_links,
        });
    }

    if lines.is_empty() && !plain.is_empty() {
        let font_id = font_system
            .db()
            .faces()
            .next()
            .map(|f| f.id)
            .unwrap_or(cosmic_text::fontdb::ID::dummy());
        lines.push(ShapedLine {
            source_line: 0,
            runs: vec![ShapedRun {
                font_id,
                glyphs: vec![],
                text: plain,
                x_offset: 0.0,
                paragraph_family: family_name.clone(),
                is_italic: false,
            }],
            width: 0.0,
            underline_ranges: vec![],
            strike_ranges: vec![],
            highlight_ranges: vec![],
            link_ranges: vec![],
        });
    }

    ShapedParagraph { lines }
}

pub fn get_krilla_font(
    face_info: &cosmic_text::fontdb::FaceInfo,
    all_fonts: &AllFonts,
    font_cache: &mut HashMap<cosmic_text::fontdb::ID, krilla::text::Font>,
    text: &str,
    script_fonts: &HashMap<String, String>,
    paragraph_family: &str,
) -> krilla::text::Font {
    let is_bold = face_info.weight.0 >= 700;
    let is_italic = face_info.style == cosmic_text::fontdb::Style::Italic
        || face_info.style == cosmic_text::fontdb::Style::Oblique;

    // Glyph IDs belong to the shaped face. Never substitute an Indic face
    // for punctuation shaped in a bundled prose family.
    let is_prose_face = face_info.families.iter().any(|(name, _)| {
        matches!(
            name.as_str(),
            "Literata" | "Source Serif 4" | "Source Sans 3" | "EB Garamond" | "Inter"
        )
    });
    let is_neutral_run = !is_prose_face
        && !text.is_empty()
        && text.chars().all(|c| {
            let val = c as u32;
            !c.is_ascii_alphabetic() && !((0x0900..=0x0D7F).contains(&val))
        });

    let is_indic_para = paragraph_family != "Courier Prime"
        && paragraph_family != "Courier Prime Sans"
        && !paragraph_family.is_empty();

    let family = if is_neutral_run && is_indic_para {
        paragraph_family
    } else {
        face_info
            .families
            .first()
            .map(|f| f.0.as_str())
            .unwrap_or("")
    };

    if !(is_neutral_run && is_indic_para)
        && let Some(font) = font_cache.get(&face_info.id)
    {
        return font.clone();
    }

    let user_override = text.chars().find_map(|c| {
        let val = c as u32;
        let script = match val {
            0x0B80..=0x0BFF => "tamil",
            0x0C80..=0x0CFF => "kannada",
            0x0900..=0x097F => "devanagari",
            0x0C00..=0x0C7F => "telugu",
            0x0D00..=0x0D7F => "malayalam",
            0x0980..=0x09FF => "bengali",
            0x0A80..=0x0AFF => "gujarati",
            0x0A00..=0x0A7F => "gurmukhi",
            0x0B00..=0x0B7F => "oriya",
            _ => return None,
        };
        if script_fonts.contains_key(script) {
            Some(script)
        } else {
            None
        }
    });

    if user_override.is_none() && !(is_neutral_run && is_indic_para) {
        for c in text.chars() {
            let val = c as u32;
            if c == '₹' {
                return all_fonts.symbols.regular.clone();
            } else if (0x0B80..=0x0BFF).contains(&val) {
                return if is_bold {
                    all_fonts.indic.mukta_malar_bold.clone()
                } else {
                    all_fonts.indic.mukta_malar_regular.clone()
                };
            } else if (0x0C80..=0x0CFF).contains(&val) {
                return if is_bold {
                    all_fonts.indic.baloo_tamma_2_bold.clone()
                } else {
                    all_fonts.indic.baloo_tamma_2_regular.clone()
                };
            } else if (0x0900..=0x097F).contains(&val) {
                return if is_bold {
                    all_fonts.indic.mukta_bold.clone()
                } else {
                    all_fonts.indic.mukta_regular.clone()
                };
            } else if (0x0C00..=0x0C7F).contains(&val) {
                return if is_bold {
                    all_fonts.indic.hind_guntur_bold.clone()
                } else {
                    all_fonts.indic.hind_guntur_regular.clone()
                };
            } else if (0x0D00..=0x0D7F).contains(&val) {
                return if is_bold {
                    all_fonts.indic.baloo_chettan_2_bold.clone()
                } else {
                    all_fonts.indic.baloo_chettan_2_regular.clone()
                };
            } else if (0x0980..=0x09FF).contains(&val) {
                return if is_bold {
                    all_fonts.indic.hind_siliguri_bold.clone()
                } else {
                    all_fonts.indic.hind_siliguri_regular.clone()
                };
            } else if (0x0A80..=0x0AFF).contains(&val) {
                return if is_bold {
                    all_fonts.indic.hind_vadodara_bold.clone()
                } else {
                    all_fonts.indic.hind_vadodara_regular.clone()
                };
            } else if (0x0A00..=0x0A7F).contains(&val) {
                return if is_bold {
                    all_fonts.indic.baloo_paaji_2_bold.clone()
                } else {
                    all_fonts.indic.baloo_paaji_2_regular.clone()
                };
            } else if (0x0B00..=0x0B7F).contains(&val) {
                return if is_bold {
                    all_fonts.indic.baloo_bhaina_2_bold.clone()
                } else {
                    all_fonts.indic.baloo_bhaina_2_regular.clone()
                };
            }
        }
    }

    let font = match family {
        "Courier Prime" => match (is_bold, is_italic) {
            (false, false) => all_fonts.courier.regular.clone(),
            (true, false) => all_fonts.courier.bold.clone(),
            (false, true) => all_fonts.courier.italic.clone(),
            (true, true) => all_fonts.courier.bold_italic.clone(),
        },
        "Courier Prime Sans" => match (is_bold, is_italic) {
            (false, false) => all_fonts.courier.sans_regular.clone(),
            (true, false) => all_fonts.courier.sans_bold.clone(),
            (false, true) => all_fonts.courier.sans_italic.clone(),
            (true, true) => all_fonts.courier.sans_bold_italic.clone(),
        },
        "Mukta Malar" => {
            if is_bold {
                all_fonts.indic.mukta_malar_bold.clone()
            } else {
                all_fonts.indic.mukta_malar_regular.clone()
            }
        }
        "Noto Sans Devanagari" | "Mukta" => {
            if is_bold {
                all_fonts.indic.mukta_bold.clone()
            } else {
                all_fonts.indic.mukta_regular.clone()
            }
        }
        "Noto Sans Telugu" => {
            if is_bold {
                all_fonts.indic.noto_sans_telugu_bold.clone()
            } else {
                all_fonts.indic.noto_sans_telugu_regular.clone()
            }
        }
        "Noto Sans Malayalam" => {
            if is_bold {
                all_fonts.indic.noto_sans_malayalam_bold.clone()
            } else {
                all_fonts.indic.noto_sans_malayalam_regular.clone()
            }
        }
        "Noto Sans Kannada" => {
            if is_bold {
                all_fonts.indic.noto_sans_kannada_bold.clone()
            } else {
                all_fonts.indic.noto_sans_kannada_regular.clone()
            }
        }
        "Noto Sans Bengali" => {
            if is_bold {
                all_fonts.indic.noto_sans_bengali_bold.clone()
            } else {
                all_fonts.indic.noto_sans_bengali_regular.clone()
            }
        }
        "Noto Sans Gujarati" | "Mukta Vaani" => {
            if is_bold {
                all_fonts.indic.noto_sans_gujarati_bold.clone()
            } else {
                all_fonts.indic.noto_sans_gujarati_regular.clone()
            }
        }
        "Noto Sans Gurmukhi" | "Mukta Mahee" => {
            if is_bold {
                all_fonts.indic.noto_sans_gurmukhi_bold.clone()
            } else {
                all_fonts.indic.noto_sans_gurmukhi_regular.clone()
            }
        }
        "Hind Guntur" => {
            if is_bold {
                all_fonts.indic.hind_guntur_bold.clone()
            } else {
                all_fonts.indic.hind_guntur_regular.clone()
            }
        }
        "Hind Siliguri" => {
            if is_bold {
                all_fonts.indic.hind_siliguri_bold.clone()
            } else {
                all_fonts.indic.hind_siliguri_regular.clone()
            }
        }
        "Hind Vadodara" => {
            if is_bold {
                all_fonts.indic.hind_vadodara_bold.clone()
            } else {
                all_fonts.indic.hind_vadodara_regular.clone()
            }
        }
        "Baloo Tamma 2" => {
            if is_bold {
                all_fonts.indic.baloo_tamma_2_bold.clone()
            } else {
                all_fonts.indic.baloo_tamma_2_regular.clone()
            }
        }
        "Baloo Chettan 2" => {
            if is_bold {
                all_fonts.indic.baloo_chettan_2_bold.clone()
            } else {
                all_fonts.indic.baloo_chettan_2_regular.clone()
            }
        }
        "Baloo Paaji 2" => {
            if is_bold {
                all_fonts.indic.baloo_paaji_2_bold.clone()
            } else {
                all_fonts.indic.baloo_paaji_2_regular.clone()
            }
        }
        "Baloo Bhaina 2" => {
            if is_bold {
                all_fonts.indic.baloo_bhaina_2_bold.clone()
            } else {
                all_fonts.indic.baloo_bhaina_2_regular.clone()
            }
        }
        "Noto Sans Tamil" => {
            if is_bold {
                all_fonts.indic.noto_sans_tamil_bold.clone()
            } else {
                all_fonts.indic.noto_sans_tamil_regular.clone()
            }
        }
        "Noto Sans Symbols 2" => all_fonts.symbols.regular.clone(),
        _ => {
            let loaded = match &face_info.source {
                cosmic_text::fontdb::Source::File(path) => {
                    let is_unsupported_format = path.to_string_lossy().contains(".ttc")
                        || path.to_string_lossy().contains(".otc");
                    if is_unsupported_format {
                        None
                    } else {
                        std::fs::read(path).ok().and_then(|bytes| {
                            krilla::text::Font::new(bytes.into(), face_info.index)
                        })
                    }
                }
                cosmic_text::fontdb::Source::Binary(data) => {
                    krilla::text::Font::new(data.as_ref().as_ref().to_vec().into(), face_info.index)
                }
                _ => None,
            };
            loaded.unwrap_or_else(|| all_fonts.symbols.regular.clone())
        }
    };

    if !(is_neutral_run && is_indic_para) {
        font_cache.insert(face_info.id, font.clone());
    }
    font
}

pub(crate) fn draw_shaped_line(
    ctx: &mut DrawContext<'_, '_>,
    line: &ShapedLine,
    x: f32,
    y: f32,
    font_size: f32,
) {
    if !line.highlight_ranges.is_empty() {
        ctx.surface.set_fill(Some(krilla::paint::Fill {
            paint: krilla::color::rgb::Color::new(255, 243, 128).into(),
            opacity: krilla::num::NormalizedF32::new(0.55).unwrap(),
            rule: Default::default(),
        }));
        for (hl_x, hl_width) in &line.highlight_ranges {
            if *hl_width > 0.0
                && let Some(r) = Rect::from_xywh(
                    x + hl_x - 1.0,
                    y - font_size * 0.78,
                    hl_width + 2.0,
                    font_size * 1.05,
                )
            {
                let mut pb = PathBuilder::new();
                pb.push_rect(r);
                pb.close();
                if let Some(path) = pb.finish() {
                    ctx.surface.draw_path(&path);
                }
            }
        }
        ctx.surface.set_fill(None);
    }
    for run in &line.runs {
        if let Some(face_info) = ctx.font_system.db().face(run.font_id) {
            let krilla_font = get_krilla_font(
                face_info,
                ctx.layout_info.fonts,
                ctx.font_cache,
                &run.text,
                ctx.layout_info.script_fonts,
                &run.paragraph_family,
            );
            let run_start_x = x + run.x_offset;
            let need_synthetic_italic = run.is_italic && !run.text.is_ascii();

            if need_synthetic_italic {
                // Apply a horizontal skew matrix relative to (run_start_x, y) for synthetic italic / oblique text
                let skew_x = -0.22_f32; // ~12.4 degrees rightward slant
                let shear_transform = Transform::from_row(1.0, 0.0, skew_x, 1.0, -skew_x * y, 0.0);
                ctx.surface.push_transform(&shear_transform);
            }

            ctx.surface.draw_glyphs(
                Point::from_xy(run_start_x, y),
                &run.glyphs,
                krilla_font,
                &run.text,
                font_size,
                false, // outlined
            );

            if need_synthetic_italic {
                ctx.surface.pop();
            }
        }
    }

    for (ul_x, ul_width) in &line.underline_ranges {
        if *ul_width > 0.0
            && let Some(r) = Rect::from_xywh(x + ul_x, y + 1.2, *ul_width, 0.5)
        {
            let mut pb = PathBuilder::new();
            pb.push_rect(r);
            pb.close();
            if let Some(path) = pb.finish() {
                ctx.surface.draw_path(&path);
            }
        }
    }

    for (st_x, st_width) in &line.strike_ranges {
        if *st_width > 0.0
            && let Some(r) = Rect::from_xywh(x + st_x, y - 0.28 * font_size, *st_width, 0.6)
        {
            let mut pb = PathBuilder::new();
            pb.push_rect(r);
            pb.close();
            if let Some(path) = pb.finish() {
                ctx.surface.draw_path(&path);
            }
        }
    }
}

#[allow(dead_code)]
fn rich_string_substring(rs: &RichString, start_char: usize, end_char: usize) -> RichString {
    let mut out = RichString::new();
    let mut current_char_idx = 0;

    for element in &rs.elements {
        let el_len = element.text.chars().count();
        if current_char_idx + el_len <= start_char {
            current_char_idx += el_len;
            continue;
        }

        let start_in_element = start_char.saturating_sub(current_char_idx);
        let end_in_element = std::cmp::min(el_len, end_char.saturating_sub(current_char_idx));

        let substring_text: String = element
            .text
            .chars()
            .skip(start_in_element)
            .take(end_in_element - start_in_element)
            .collect();
        if !substring_text.is_empty() {
            let mut new_element = crate::pdf::rich_string::core::Element::new(substring_text);
            new_element.attributes = element.attributes;
            out.elements.push(new_element);
        }

        current_char_idx += el_len;
        if current_char_idx >= end_char {
            break;
        }
    }
    out
}

#[allow(dead_code)]
pub fn split_rich_string_into_sentences(rs: &RichString) -> Vec<RichString> {
    let plain = rs.to_plain_string();
    let mut sentences = Vec::new();
    let mut start_idx = 0;

    let chars: Vec<char> = plain.chars().collect();
    let mut i = 0;
    while i < chars.len() {
        let c = chars[i];
        if (c == '.' || c == '?' || c == '!' || c == '…')
            && (i + 1 == chars.len() || chars[i + 1].is_whitespace())
        {
            let end_idx = i + 1;
            sentences.push(rich_string_substring(rs, start_idx, end_idx));
            start_idx = end_idx;
        }
        i += 1;
    }
    if start_idx < chars.len() {
        sentences.push(rich_string_substring(rs, start_idx, chars.len()));
    }
    sentences
}

fn line_ends_with_sentence_punctuation(line: &ShapedLine) -> bool {
    let text: String = line.runs.iter().map(|run| run.text.as_str()).collect();
    let text = text
        .trim_end()
        .trim_end_matches(['"', '\'', '\u{201d}', '\u{2019}', ')', ']']);
    text.ends_with([
        '.', '?', '!', '\u{0964}', '\u{0965}', '\u{3002}', '\u{ff1f}', '\u{ff01}',
    ])
}

pub fn measure_full_element_height(
    el: &Element,
    font_system: &mut cosmic_text::FontSystem,
    layout_info: &LayoutInfo,
) -> f32 {
    match el {
        Element::Heading { slug, .. } => measure_element_height(
            font_system,
            slug,
            &layout_info.margins.heading,
            layout_info.size,
            layout_info.export_font,
            layout_info.script_fonts,
        ),
        Element::Action(s) => measure_element_height(
            font_system,
            s,
            &layout_info.margins.action,
            layout_info.size,
            layout_info.export_font,
            layout_info.script_fonts,
        ),
        Element::Dialogue(d) => dialogue_layout(
            d,
            None,
            &layout_info.margins.dialogue,
            font_system,
            layout_info,
        )
        .full_height(),
        Element::DualDialogue(d0, d1) => {
            let left = dialogue_layout(
                d0,
                None,
                &layout_info.margins.dual_dialogue.left,
                font_system,
                layout_info,
            )
            .full_height();
            let right = dialogue_layout(
                d1,
                None,
                &layout_info.margins.dual_dialogue.right,
                font_system,
                layout_info,
            )
            .full_height();
            left.max(right)
        }
        Element::Lyrics(s) => measure_element_height(
            font_system,
            s,
            &layout_info.margins.lyrics,
            layout_info.size,
            layout_info.export_font,
            layout_info.script_fonts,
        ),
        Element::Transition(s) => measure_element_height(
            font_system,
            s,
            &layout_info.margins.transition,
            layout_info.size,
            layout_info.export_font,
            layout_info.script_fonts,
        ),
        Element::CenteredText(s) => measure_element_height(
            font_system,
            s,
            &layout_info.margins.centered,
            layout_info.size,
            layout_info.export_font,
            layout_info.script_fonts,
        ),
        Element::Shot(s) => measure_element_height(
            font_system,
            s,
            &layout_info.margins.action,
            layout_info.size,
            layout_info.export_font,
            layout_info.script_fonts,
        ),
        Element::Synopsis(s) => measure_element_height(
            font_system,
            s,
            &layout_info.margins.synopsis,
            layout_info.size,
            layout_info.export_font,
            layout_info.script_fonts,
        ),
        Element::Section { text, .. } => measure_element_height(
            font_system,
            text,
            &layout_info.margins.action,
            layout_info.size,
            layout_info.export_font,
            layout_info.script_fonts,
        ),
        Element::PageBreak => 0.0,
    }
}

pub fn min_required_height_with_space(
    el: &Element,
    font_system: &mut FontSystem,
    layout_info: &LayoutInfo,
    page_height: f32,
) -> f32 {
    let margin = match el {
        Element::Action(_) | Element::Shot(_) | Element::Section { .. } => {
            &layout_info.margins.action
        }
        Element::Lyrics(_) => &layout_info.margins.lyrics,
        Element::CenteredText(_) => &layout_info.margins.centered,
        Element::Synopsis(_) => &layout_info.margins.synopsis,
        Element::Dialogue(d) => {
            return dialogue_layout(
                d,
                None,
                &layout_info.margins.dialogue,
                font_system,
                layout_info,
            )
            .minimum_height(page_height);
        }
        Element::DualDialogue(d0, d1) => {
            let left = dialogue_layout(
                d0,
                None,
                &layout_info.margins.dual_dialogue.left,
                font_system,
                layout_info,
            );
            let right = dialogue_layout(
                d1,
                None,
                &layout_info.margins.dual_dialogue.right,
                font_system,
                layout_info,
            );
            let height = left.full_height().max(right.full_height());
            return if height <= page_height {
                height
            } else {
                left.minimum_height(page_height)
                    .max(right.minimum_height(page_height))
            };
        }
        _ => return measure_full_element_height(el, font_system, layout_info),
    };
    let content = match el {
        Element::Action(s)
        | Element::Lyrics(s)
        | Element::CenteredText(s)
        | Element::Synopsis(s) => s,
        _ => return measure_full_element_height(el, font_system, layout_info),
    };
    let shaped = shape_rich_string(
        font_system,
        content,
        margin.content_width(layout_info.size),
        FONT_SIZE,
        layout_info.export_font,
        layout_info.script_fonts,
    );
    // The writer cannot split a paragraph of three lines or fewer.
    let minimum_lines = if shaped.lines.len() <= 3 {
        shaped.lines.len()
    } else {
        2
    };
    shaped
        .lines
        .iter()
        .take(minimum_lines)
        .map(|line| line_height_for_line(line, font_system, FONT_SIZE))
        .sum()
}

struct DialogueLayoutLine {
    element_index: usize,
    line_index: usize,
    shaped: ShapedLine,
    height: f32,
    spoken: bool,
}

struct DialogueLayout {
    name: RichString,
    name_height: f32,
    more_height: f32,
    lines: Vec<DialogueLayoutLine>,
}

impl DialogueLayout {
    fn full_height(&self) -> f32 {
        self.name_height + self.lines.iter().map(|line| line.height).sum::<f32>()
    }

    // Returns legal fragment endings across the whole speech, not each source line.
    // Parentheticals cannot end a fragment; both pages need two spoken lines.
    fn split_points(&self, sentences_only: bool) -> Vec<(usize, f32)> {
        let total_spoken = self.lines.iter().filter(|line| line.spoken).count();
        let mut spoken = 0;
        let mut height = self.name_height + self.more_height;
        let mut points = Vec::new();
        for (index, line) in self.lines.iter().enumerate() {
            height += line.height;
            spoken += usize::from(line.spoken);
            if line.spoken
                && spoken >= 2
                && total_spoken - spoken >= 2
                && (!sentences_only || line_ends_with_sentence_punctuation(&line.shaped))
            {
                points.push((index + 1, height));
            }
        }
        points
    }

    fn minimum_height(&self, page_height: f32) -> f32 {
        let full = self.full_height();
        let sentence = self
            .split_points(true)
            .into_iter()
            .map(|(_, height)| height)
            .find(|height| *height <= page_height);
        if let Some(height) = sentence {
            full.min(height)
        } else if full <= page_height {
            full
        } else {
            self.split_points(false)
                .first()
                .map(|(_, height)| *height)
                .unwrap_or(full)
        }
    }

    fn lines_that_fit(&self, available: f32, fresh_page: bool) -> usize {
        if self.full_height() <= available {
            return self.lines.len();
        }
        let sentence = self
            .split_points(true)
            .into_iter()
            .rev()
            .find(|(_, height)| *height <= available);
        if let Some((count, _)) = sentence {
            return count;
        }
        // Retry on a fresh page before breaking an oversized sentence at a line boundary.
        if fresh_page {
            return self
                .split_points(false)
                .into_iter()
                .rev()
                .find(|(_, height)| *height <= available)
                .map(|(count, _)| count)
                .unwrap_or(0);
        }
        0
    }
}

fn dialogue_layout(
    dialogue: &Dialogue,
    residual: Option<(usize, usize)>,
    margins: &DialogueMargins,
    font_system: &mut FontSystem,
    layout: &LayoutInfo,
) -> DialogueLayout {
    let mut name = dialogue.character.clone();
    name.make_uppercase();
    if let Some(ext) = &dialogue.extension {
        name.append(" (".into());
        name.append(ext.clone());
        name.append(")".into());
    }
    if residual.is_some() && !name.to_plain_string().to_uppercase().contains("CONT'D") {
        name.append(" (CONT'D)".into());
    }
    let name_height = measure_element_height(
        font_system,
        &name,
        &margins.character,
        layout.size,
        layout.export_font,
        layout.script_fonts,
    );
    let more_height = measure_element_height(
        font_system,
        &"(MORE)".into(),
        &margins.character,
        layout.size,
        layout.export_font,
        layout.script_fonts,
    );
    let (start_element, start_line) = residual.unwrap_or((0, 0));
    let mut lines = Vec::new();
    for (element_index, element) in dialogue.elements.iter().enumerate().skip(start_element) {
        let (content, margin, spoken) = match element {
            DialogueElement::Parenthetical(s) => (s, &margins.parenthetical, false),
            DialogueElement::Line(s) => (s, &margins.line, true),
        };
        let shaped = shape_rich_string(
            font_system,
            content,
            margin.content_width(layout.size),
            FONT_SIZE,
            layout.export_font,
            layout.script_fonts,
        );
        for (line_index, shaped) in shaped.lines.into_iter().enumerate() {
            if element_index == start_element && line_index < start_line {
                continue;
            }
            let height = line_height_for_line(&shaped, font_system, FONT_SIZE);
            lines.push(DialogueLayoutLine {
                element_index,
                line_index,
                shaped,
                height,
                spoken,
            });
        }
    }
    DialogueLayout {
        name,
        name_height,
        more_height,
        lines,
    }
}

pub fn write_element(
    ctx: &mut DrawContext<'_, '_>,
    content: &RichString,
    margin: &Margin,
    alignment: Alignment,
    can_split: bool,
    residual: &mut Option<usize>,
) -> std::io::Result<bool> {
    write_element_sized(
        ctx, content, margin, alignment, can_split, residual, FONT_SIZE,
    )
}

pub fn write_element_sized(
    ctx: &mut DrawContext<'_, '_>,
    content: &RichString,
    margin: &Margin,
    alignment: Alignment,
    can_split: bool,
    residual: &mut Option<usize>,
    font_size: f32,
) -> std::io::Result<bool> {
    let max_width = margin.content_width(ctx.layout_info.size);
    let shaped = shape_rich_string(
        ctx.font_system,
        content,
        max_width,
        font_size,
        ctx.layout_info.export_font,
        ctx.layout_info.script_fonts,
    );

    let start_line = residual.unwrap_or(0);
    let total_lines = shaped.lines.len();

    if start_line >= total_lines {
        *residual = None;
        return Ok(false);
    }

    let mut total_height = 0.0;
    for line in shaped.lines.iter().skip(start_line) {
        total_height += line_height_for_line(line, ctx.font_system, font_size);
    }
    let fits = *ctx.y_position + total_height <= ctx.max_y;

    let remaining_lines = total_lines - start_line;
    let lines_to_draw = if fits {
        remaining_lines
    } else if !can_split {
        0
    } else {
        let mut available = 0;
        let mut accumulated_h = 0.0;
        let remaining_space = ctx.max_y - *ctx.y_position;
        for line in shaped.lines.iter().skip(start_line) {
            let lh = line_height_for_line(line, ctx.font_system, font_size);
            if accumulated_h + lh <= remaining_space {
                accumulated_h += lh;
                available += 1;
            } else {
                break;
            }
        }

        if remaining_lines <= 3 {
            0
        } else if available < 2 {
            0
        } else {
            if remaining_lines - available < 2 {
                available = remaining_lines - 2;
            }
            let mut split_at_sentence = None;
            let min_k = 1;
            let max_k = available - 1;
            if max_k >= min_k {
                for k in (min_k..=max_k).rev() {
                    let absolute_line_idx = start_line + k;
                    if absolute_line_idx < total_lines {
                        let line = &shaped.lines[absolute_line_idx];
                        if line_ends_with_sentence_punctuation(line) {
                            split_at_sentence = Some(k + 1);
                            break;
                        }
                    }
                }
            }
            if let Some(count) = split_at_sentence {
                count
            } else {
                available
            }
        }
    };

    for line in shaped.lines.iter().skip(start_line).take(lines_to_draw) {
        let x = match alignment {
            Alignment::LeftToRight => margin.left,
            Alignment::RightToLeft => ctx.layout_info.size.x - margin.right - line.width,
            Alignment::Centered => (ctx.layout_info.size.x - line.width) / 2.0,
        };

        draw_shaped_line(ctx, line, x, *ctx.y_position, font_size);

        if ctx.is_revised {
            ctx.surface.draw_text(
                Point::from_xy(ctx.layout_info.size.x - 36.0, *ctx.y_position),
                ctx.layout_info.fonts.courier.bold.clone(),
                FONT_SIZE,
                "*",
                false,
                krilla::text::TextDirection::LeftToRight,
            );
        }

        let lh = line_height_for_line(line, ctx.font_system, font_size);
        *ctx.y_position += lh;
    }

    if fits || start_line + lines_to_draw >= total_lines {
        *residual = None;
        Ok(false)
    } else {
        *residual = Some(start_line + lines_to_draw);
        Ok(true)
    }
}
pub fn line_height_for_line(
    line: &ShapedLine,
    font_system: &cosmic_text::FontSystem,
    font_size: f32,
) -> f32 {
    let mut max_lh = font_size;
    for run in &line.runs {
        let run_lh = font_system
            .db()
            .with_face_data(run.font_id, |data, index| {
                if let Ok(parsed) = cosmic_text::ttf_parser::Face::parse(data, index) {
                    let asc = parsed.ascender() as f32;
                    let desc = parsed.descender() as f32;
                    let gap = parsed.line_gap() as f32;
                    let upem = parsed.units_per_em() as f32;
                    if upem > 0.0 {
                        let factor = (asc.max(0.0) - desc.min(0.0) + gap.max(0.0)) / upem;
                        return factor * 0.72 * font_size;
                    }
                }
                font_size
            })
            .unwrap_or(font_size);
        if run_lh > max_lh {
            max_lh = run_lh;
        }
    }
    max_lh
}

pub fn measure_element_height(
    font_system: &mut FontSystem,
    content: &RichString,
    margin: &Margin,
    size: &PaperSize,
    export_font: &str,
    script_fonts: &HashMap<String, String>,
) -> f32 {
    measure_element_height_sized(
        font_system,
        content,
        margin,
        size,
        export_font,
        script_fonts,
        FONT_SIZE,
    )
}

pub fn measure_element_height_sized(
    font_system: &mut FontSystem,
    content: &RichString,
    margin: &Margin,
    size: &PaperSize,
    export_font: &str,
    script_fonts: &HashMap<String, String>,
    font_size: f32,
) -> f32 {
    let max_width = margin.content_width(size);
    let shaped = shape_rich_string(
        font_system,
        content,
        max_width,
        font_size,
        export_font,
        script_fonts,
    );
    let mut total_height = 0.0;
    for line in &shaped.lines {
        total_height += line_height_for_line(line, font_system, font_size);
    }
    total_height
}

pub fn write_dialogue(
    ctx: &mut DrawContext<'_, '_>,
    dialogue: &Dialogue,
    residual_dialogue: &mut Option<(usize, usize)>,
    dialogue_margins: &DialogueMargins,
    follows_heading: bool,
) -> std::io::Result<bool> {
    let layout = dialogue_layout(
        dialogue,
        *residual_dialogue,
        dialogue_margins,
        ctx.font_system,
        ctx.layout_info,
    );
    let fresh_page = *ctx.y_position <= ctx.layout_info.size.top_margin();
    let count = layout.lines_that_fit(
        ctx.max_y - *ctx.y_position,
        fresh_page
            || follows_heading
            || layout.full_height() > ctx.max_y - ctx.layout_info.size.top_margin(),
    );
    if count == 0 && !layout.lines.is_empty() {
        if fresh_page {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                "Dialogue cannot fit on a page while keeping its cue, parentheticals and two spoken lines together.",
            ));
        }
        return Ok(true);
    }
    if layout.name_height > ctx.max_y - *ctx.y_position {
        return Err(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            "Character name cannot be longer than a whole page.",
        ));
    }
    let mut residual = None;
    write_element(
        ctx,
        &layout.name,
        &dialogue_margins.character,
        Alignment::LeftToRight,
        false,
        &mut residual,
    )?;
    for line in layout.lines.iter().take(count) {
        let margin = if line.spoken {
            &dialogue_margins.line
        } else {
            &dialogue_margins.parenthetical
        };
        draw_shaped_line(ctx, &line.shaped, margin.left, *ctx.y_position, FONT_SIZE);
        if ctx.is_revised {
            ctx.surface.draw_text(
                Point::from_xy(ctx.layout_info.size.x - 36.0, *ctx.y_position),
                ctx.layout_info.fonts.courier.bold.clone(),
                FONT_SIZE,
                "*",
                false,
                krilla::text::TextDirection::LeftToRight,
            );
        }
        *ctx.y_position += line.height;
    }
    if count < layout.lines.len() {
        let next = &layout.lines[count];
        *residual_dialogue = Some((next.element_index, next.line_index));
        // Space for the entire marker was reserved before choosing the split.
        write_element(
            ctx,
            &"(MORE)".into(),
            &dialogue_margins.character,
            Alignment::LeftToRight,
            false,
            &mut residual,
        )?;
        Ok(true)
    } else {
        *residual_dialogue = None;
        Ok(false)
    }
}

#[cfg(test)]
mod pagination_tests {
    use super::*;

    fn speech(rows: &[(&str, bool)]) -> DialogueLayout {
        let mut fonts = super::super::shared::build_font_system();
        let lines = rows
            .iter()
            .enumerate()
            .map(|(index, (text, spoken))| {
                let mut shaped = shape_rich_string(
                    &mut fonts,
                    &(*text).into(),
                    432.0,
                    FONT_SIZE,
                    "courier_prime",
                    &HashMap::new(),
                );
                DialogueLayoutLine {
                    element_index: index,
                    line_index: 0,
                    shaped: shaped.lines.remove(0),
                    height: 12.0,
                    spoken: *spoken,
                }
            })
            .collect();
        DialogueLayout {
            name: "BOB".into(),
            name_height: 12.0,
            more_height: 12.0,
            lines,
        }
    }

    #[test]
    fn speech_split_counts_spoken_lines_across_source_elements() {
        let layout = speech(&[
            ("One.", true),
            ("Two.", true),
            ("Three.", true),
            ("Four.", true),
            ("Five.", true),
        ]);
        assert_eq!(layout.lines_that_fit(72.0, false), 5); // Full speech needs no MORE.
        assert_eq!(layout.lines_that_fit(60.0, false), 3); // Three + MORE, two continue.
        assert_eq!(layout.lines_that_fit(48.0, false), 2);
        assert_eq!(layout.lines_that_fit(36.0, false), 0); // A cue + one line is not a split.
    }

    #[test]
    fn parentheticals_never_end_a_fragment_or_count_as_spoken_lines() {
        let layout = speech(&[
            ("One.", true),
            ("Two.", true),
            ("(quietly)", false),
            ("Three.", true),
            ("Four.", true),
        ]);
        assert_eq!(layout.lines_that_fit(60.0, false), 2);
        assert_eq!(
            layout
                .split_points(false)
                .iter()
                .map(|(count, _)| *count)
                .collect::<Vec<_>>(),
            [2]
        );
    }

    #[test]
    fn sentence_boundaries_win_over_later_mid_sentence_lines() {
        let layout = speech(&[
            ("One", true),
            ("Two.", true),
            ("Three", true),
            ("Four", true),
            ("Five.", true),
        ]);
        assert_eq!(layout.lines_that_fit(60.0, false), 2);
        let short = speech(&[("One", true), ("Two", true), ("Three", true)]);
        assert_eq!(short.lines_that_fit(36.0, false), 0);
        assert_eq!(short.lines_that_fit(48.0, true), 3);
    }

    #[test]
    fn oversized_sentence_fallback_still_leaves_two_lines_each_side() {
        let layout = speech(&[
            ("One", true),
            ("Two", true),
            ("Three", true),
            ("Four", true),
            ("Five", true),
        ]);
        assert_eq!(layout.lines_that_fit(60.0, false), 0);
        assert_eq!(layout.lines_that_fit(60.0, true), 3);
        assert_eq!(layout.minimum_height(60.0), 48.0);
    }

    #[test]
    fn sentence_endings_allow_closing_quotes_and_indic_punctuation() {
        for text in ["Done.\"", "Done!\u{201d}", "Done\u{0964}", "Done\u{3002}"] {
            let layout = speech(&[(text, true)]);
            assert!(
                line_ends_with_sentence_punctuation(&layout.lines[0].shaped),
                "{text}"
            );
        }
    }
}

#[cfg(test)]
mod pagination_properties {
    use super::*;

    #[test]
    fn every_selected_fragment_obeys_bounds_and_spoken_line_invariants() {
        for seed in 0..100_usize {
            let mut layout = DialogueLayout {
                name: "BOB".into(),
                name_height: 12.0 + (seed % 3) as f32 * 12.0,
                more_height: 12.0,
                lines: Vec::new(),
            };
            for index in 0..(4 + seed % 47) {
                let spoken = (index * 17 + seed) % 5 != 0;
                layout.lines.push(DialogueLayoutLine {
                    element_index: index,
                    line_index: 0,
                    height: 12.0 + (index % 3) as f32 * 1.25,
                    spoken,
                    shaped: ShapedLine {
                        source_line: 0,
                        runs: vec![ShapedRun {
                            font_id: cosmic_text::fontdb::ID::dummy(),
                            glyphs: vec![],
                            text: if index % 3 == 0 { "End." } else { "word" }.into(),
                            x_offset: 0.0,
                            paragraph_family: "Courier Prime".into(),
                            is_italic: false,
                        }],
                        width: 40.0,
                        underline_ranges: vec![],
                        strike_ranges: vec![],
                        highlight_ranges: vec![],
                        link_ranges: vec![],
                    },
                });
            }
            for available in (0..720).step_by(3) {
                for allow_fallback in [false, true] {
                    let count = layout.lines_that_fit(available as f32, allow_fallback);
                    assert!(count <= layout.lines.len());
                    if count == 0 {
                        continue;
                    }
                    let partial = count < layout.lines.len();
                    let height = layout.name_height
                        + layout
                            .lines
                            .iter()
                            .take(count)
                            .map(|line| line.height)
                            .sum::<f32>()
                        + if partial { layout.more_height } else { 0.0 };
                    assert!(
                        height <= available as f32,
                        "seed={seed}, available={available}, count={count}"
                    );
                    if partial {
                        assert!(
                            layout.lines[count - 1].spoken,
                            "must not end on a parenthetical"
                        );
                        assert!(
                            layout.lines[..count]
                                .iter()
                                .filter(|line| line.spoken)
                                .count()
                                >= 2
                        );
                        assert!(
                            layout.lines[count..]
                                .iter()
                                .filter(|line| line.spoken)
                                .count()
                                >= 2
                        );
                        if !allow_fallback {
                            assert!(line_ends_with_sentence_punctuation(
                                &layout.lines[count - 1].shaped
                            ));
                        }
                    }
                }
            }
        }
    }
}

#[cfg(test)]
mod multiline_shaping_tests {
    use super::*;

    #[test]
    fn hard_source_lines_keep_distinct_text_and_global_style_ranges() {
        let mut fonts = super::super::shared::build_font_system();
        let content: RichString = "First row.\n**Second row.**\n*Third row.*".into();
        let shaped = shape_rich_string(
            &mut fonts,
            &content,
            432.0,
            FONT_SIZE,
            "courier_prime",
            &HashMap::new(),
        );
        let texts: Vec<String> = shaped
            .lines
            .iter()
            .map(|line| line.runs.iter().map(|run| run.text.as_str()).collect())
            .collect();
        assert_eq!(texts, ["First row.", "Second row.", "Third row."]);
        assert!(!shaped.lines[0].runs.iter().any(|run| run.is_italic));
        assert!(shaped.lines[2].runs.iter().all(|run| run.is_italic));
    }

    #[test]
    fn wrapped_lines_after_a_hard_newline_preserve_utf8_text_once() {
        let mut fonts = super::super::shared::build_font_system();
        let source = "Alpha starts here.\nCaf\u{00e9} continues with many words that wrap across several lines.\nOmega ends here.";
        let shaped = shape_rich_string(
            &mut fonts,
            &source.into(),
            100.0,
            FONT_SIZE,
            "courier_prime",
            &HashMap::new(),
        );
        let actual: String = shaped
            .lines
            .iter()
            .flat_map(|line| line.runs.iter())
            .map(|run| run.text.as_str())
            .collect();
        let compact = |text: &str| {
            text.chars()
                .filter(|c| !c.is_whitespace())
                .collect::<String>()
        };
        assert_eq!(compact(&actual), compact(source));
    }
}
