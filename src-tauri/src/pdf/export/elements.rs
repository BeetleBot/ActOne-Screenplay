use std::collections::HashMap;
use cosmic_text::{Attrs, Buffer, Family, FontSystem, Metrics, Shaping, Weight};
use krilla::{
    geom::{PathBuilder, Point, Rect},
    surface::Surface,
};

use crate::pdf::{
    rich_string::RichString,
    screenplay::{Dialogue, DialogueElement},
};

use super::layout::{AllFonts, LayoutInfo, Margin, DialogueMargins, FONT_SIZE, LINE_HEIGHT, PaperSize};

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
}

pub struct ShapedLine {
    pub runs: Vec<ShapedRun>,
    pub width: f32,
    pub is_underline: bool,
}

pub struct ShapedParagraph {
    pub lines: Vec<ShapedLine>,
}

fn adjust_and_rebuild_run(
    plain: &str,
    font_id: cosmic_text::fontdb::ID,
    mut glyphs: Vec<KrillaGlyphWrapper>,
    x_offset: f32,
) -> ShapedRun {
    if glyphs.is_empty() {
        return ShapedRun {
            font_id,
            glyphs,
            text: String::new(),
            x_offset,
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
    }
}

pub fn contains_indic(s: &str) -> bool {
    s.chars().any(|c| matches!(c as u32, 0x0900..=0x0D7F))
}

fn shape_rich_string(
    font_system: &mut FontSystem,
    content: &RichString,
    max_width: f32,
    font_size: f32,
    export_font: &str,
) -> ShapedParagraph {
    let plain = content.to_plain_string();
    if plain.is_empty() {
        return ShapedParagraph { lines: vec![] };
    }

    let is_bold = content.elements.first().map_or(false, |e| e.is_bold());
    let is_italic = content.elements.first().map_or(false, |e| e.is_italic());
    let is_underline = content.elements.first().map_or(false, |e| e.is_underline());
    let is_sans = export_font == "courier_prime_sans"
        || content.elements.first().map_or(false, |e| e.is_sans());

    let family_name = if is_sans {
        "Courier Prime Sans"
    } else {
        "Courier Prime"
    };

    let metrics = Metrics::new(font_size, font_size);
    let mut buffer = Buffer::new(font_system, metrics);
    let mut buffer = buffer.borrow_with(font_system);
    buffer.set_size(Some(max_width), None);

    let weight = if is_bold {
        Weight::BOLD
    } else {
        Weight::NORMAL
    };
    let style = if is_italic {
        cosmic_text::Style::Italic
    } else {
        cosmic_text::Style::Normal
    };

    let attrs = Attrs::new()
        .family(Family::Name(family_name))
        .weight(weight)
        .style(style);

    buffer.set_text(&plain, attrs, Shaping::Advanced);

    let mut lines = Vec::new();
    for run in buffer.layout_runs() {
        let line_width = run.glyphs.iter().fold(0.0_f32, |acc, g| acc.max(g.x + g.w));
        
        let mut runs_in_line = Vec::new();
        let mut current_font_id = None;
        let mut current_glyphs = Vec::new();
        let mut current_start_x = 0.0;

        for glyph in run.glyphs.iter() {
            if current_font_id.is_none() {
                current_font_id = Some(glyph.font_id);
                current_start_x = glyph.x;
            } else if Some(glyph.font_id) != current_font_id {
                let font_id = current_font_id.unwrap();
                let run_obj = adjust_and_rebuild_run(&plain, font_id, current_glyphs, current_start_x);
                runs_in_line.push(run_obj);

                current_font_id = Some(glyph.font_id);
                current_glyphs = Vec::new();
                current_start_x = glyph.x;
            }

            current_glyphs.push(KrillaGlyphWrapper {
                glyph_id: glyph.glyph_id as u32,
                start: glyph.start,
                end: glyph.end,
                x_advance: glyph.w / glyph.font_size,
                x_offset: glyph.x_offset,
                y_offset: glyph.y_offset,
            });
        }

        if let Some(font_id) = current_font_id {
            let run_obj = adjust_and_rebuild_run(&plain, font_id, current_glyphs, current_start_x);
            runs_in_line.push(run_obj);
        }

        lines.push(ShapedLine {
            runs: runs_in_line,
            width: line_width,
            is_underline,
        });
    }

    if lines.is_empty() && !plain.is_empty() {
        // Fallback single run if somehow layout_runs was empty
        let font_id = font_system.db().faces().next().map(|f| f.id).unwrap_or(cosmic_text::fontdb::ID::dummy());
        lines.push(ShapedLine {
            runs: vec![ShapedRun {
                font_id,
                glyphs: vec![],
                text: plain,
                x_offset: 0.0,
            }],
            width: 0.0,
            is_underline,
        });
    }

    ShapedParagraph { lines }
}

pub fn get_krilla_font(
    face_info: &cosmic_text::fontdb::FaceInfo,
    all_fonts: &AllFonts,
    font_cache: &mut HashMap<cosmic_text::fontdb::ID, krilla::text::Font>,
    text: &str,
) -> krilla::text::Font {
    let is_bold = face_info.weight.0 >= 700;

    for c in text.chars() {
        let val = c as u32;
        if val >= 0x0B80 && val <= 0x0BFF {
            return if is_bold { all_fonts.noto.tamil_bold.clone() } else { all_fonts.noto.tamil_regular.clone() };
        } else if val >= 0x0C80 && val <= 0x0CFF {
            return if is_bold { all_fonts.noto.kannada_bold.clone() } else { all_fonts.noto.kannada_regular.clone() };
        } else if val >= 0x0900 && val <= 0x097F {
            return if is_bold { all_fonts.noto.devanagari_bold.clone() } else { all_fonts.noto.devanagari_regular.clone() };
        } else if val >= 0x0C00 && val <= 0x0C7F {
            return if is_bold { all_fonts.noto.telugu_bold.clone() } else { all_fonts.noto.telugu_regular.clone() };
        } else if val >= 0x0D00 && val <= 0x0D7F {
            return if is_bold { all_fonts.noto.malayalam_bold.clone() } else { all_fonts.noto.malayalam_regular.clone() };
        } else if val >= 0x0980 && val <= 0x09FF {
            return if is_bold { all_fonts.noto.bengali_bold.clone() } else { all_fonts.noto.bengali_regular.clone() };
        } else if val >= 0x0A80 && val <= 0x0AFF {
            return if is_bold { all_fonts.noto.gujarati_bold.clone() } else { all_fonts.noto.gujarati_regular.clone() };
        } else if val >= 0x0A00 && val <= 0x0A7F {
            return if is_bold { all_fonts.noto.gurmukhi_bold.clone() } else { all_fonts.noto.gurmukhi_regular.clone() };
        }
    }

    if let Some(font) = font_cache.get(&face_info.id) {
        return font.clone();
    }

    let family = face_info.families.first().map(|f| f.0.as_str()).unwrap_or("");
    let is_italic = face_info.style == cosmic_text::fontdb::Style::Italic || face_info.style == cosmic_text::fontdb::Style::Oblique;

    let font = match family {
        "Courier Prime" => {
            match (is_bold, is_italic) {
                (false, false) => all_fonts.courier.regular.clone(),
                (true, false) => all_fonts.courier.bold.clone(),
                (false, true) => all_fonts.courier.italic.clone(),
                (true, true) => all_fonts.courier.bold_italic.clone(),
            }
        }
        "Courier Prime Sans" => {
            match (is_bold, is_italic) {
                (false, false) => all_fonts.courier.sans_regular.clone(),
                (true, false) => all_fonts.courier.sans_bold.clone(),
                (false, true) => all_fonts.courier.sans_italic.clone(),
                (true, true) => all_fonts.courier.sans_bold_italic.clone(),
            }
        }
        "Noto Sans Tamil" | "Mukta Malar" => {
            if is_bold { all_fonts.noto.tamil_bold.clone() } else { all_fonts.noto.tamil_regular.clone() }
        }
        "Noto Sans Devanagari" | "Mukta" => {
            if is_bold { all_fonts.noto.devanagari_bold.clone() } else { all_fonts.noto.devanagari_regular.clone() }
        }
        "Noto Sans Telugu" => {
            if is_bold { all_fonts.noto.telugu_bold.clone() } else { all_fonts.noto.telugu_regular.clone() }
        }
        "Noto Sans Malayalam" => {
            if is_bold { all_fonts.noto.malayalam_bold.clone() } else { all_fonts.noto.malayalam_regular.clone() }
        }
        "Noto Sans Kannada" => {
            if is_bold { all_fonts.noto.kannada_bold.clone() } else { all_fonts.noto.kannada_regular.clone() }
        }
        "Noto Sans Bengali" => {
            if is_bold { all_fonts.noto.bengali_bold.clone() } else { all_fonts.noto.bengali_regular.clone() }
        }
        "Noto Sans Gujarati" | "Mukta Vaani" => {
            if is_bold { all_fonts.noto.gujarati_bold.clone() } else { all_fonts.noto.gujarati_regular.clone() }
        }
        "Noto Sans Gurmukhi" | "Mukta Mahee" => {
            if is_bold { all_fonts.noto.gurmukhi_bold.clone() } else { all_fonts.noto.gurmukhi_regular.clone() }
        }
        _ => {
            let loaded = match &face_info.source {
                cosmic_text::fontdb::Source::File(path) => {
                    std::fs::read(path).ok().and_then(|bytes| {
                        krilla::text::Font::new(bytes.into(), face_info.index)
                    })
                }
                _ => None,
            };
            loaded.unwrap_or_else(|| all_fonts.courier.regular.clone())
        }
    };

    font_cache.insert(face_info.id, font.clone());
    font
}

fn draw_shaped_line(
    ctx: &mut DrawContext<'_, '_>,
    line: &ShapedLine,
    x: f32,
    y: f32,
    font_size: f32,
) {
    for run in &line.runs {
        if let Some(face_info) = ctx.font_system.db().face(run.font_id) {
            let krilla_font = get_krilla_font(face_info, ctx.layout_info.fonts, ctx.font_cache, &run.text);
            
            let run_start_x = x + run.x_offset;
            ctx.surface.draw_glyphs(
                Point::from_xy(run_start_x, y),
                &run.glyphs,
                krilla_font,
                &run.text,
                font_size,
                false, // outlined
            );
        }
    }

    if line.is_underline {
        if let Some(r) = Rect::from_xywh(x, y + 1.2, line.width, 0.5) {
            let mut pb = PathBuilder::new();
            pb.push_rect(r);
            pb.close();
            if let Some(path) = pb.finish() {
                ctx.surface.draw_path(&path);
            }
        }
    }
}

pub fn write_element(
    ctx: &mut DrawContext<'_, '_>,
    content: &RichString,
    margin: &Margin,
    alignment: Alignment,
) -> std::io::Result<bool> {
    let max_width = margin.content_width(ctx.layout_info.size);
    let font_size = FONT_SIZE;
    let shaped = shape_rich_string(
        ctx.font_system,
        content,
        max_width,
        font_size,
        ctx.layout_info.export_font,
    );

    let total_height = shaped.lines.len() as f32 * LINE_HEIGHT;
    let fits = *ctx.y_position + total_height <= ctx.max_y;

    let lines_to_draw = if fits {
        shaped.lines.len()
    } else {
        let available = ((ctx.max_y - *ctx.y_position) / LINE_HEIGHT) as usize;
        available
    };

    for line in shaped.lines.iter().take(lines_to_draw) {
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

        *ctx.y_position += LINE_HEIGHT;
    }

    Ok(!fits)
}

pub fn measure_element_height(
    font_system: &mut FontSystem,
    content: &RichString,
    margin: &Margin,
    size: &PaperSize,
    export_font: &str,
) -> f32 {
    let max_width = margin.content_width(size);
    let font_size = FONT_SIZE;
    let shaped = shape_rich_string(font_system, content, max_width, font_size, export_font);
    shaped.lines.len() as f32 * LINE_HEIGHT
}

pub fn write_dialogue(
    ctx: &mut DrawContext<'_, '_>,
    dialogue: &Dialogue,
    residual_dialogue: &mut Option<usize>,
    dialogue_margins: &DialogueMargins,
) -> std::io::Result<bool> {
    let mut character_name = dialogue.character.clone();
    match (*residual_dialogue, &dialogue.extension) {
        (Some(_), _) => {
            character_name.append(" (CONT'D)".into());
        }
        (None, Some(ext)) => {
            character_name.append(" (".into());
            character_name.append(ext.clone());
            character_name.append(")".into());
        }
        _ => (),
    };

    let name_height = measure_element_height(
        ctx.font_system,
        &character_name,
        &dialogue_margins.character,
        ctx.layout_info.size,
        ctx.layout_info.export_font,
    );

    if name_height >= ctx.max_y - ctx.layout_info.size.top_margin() {
        return Err(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            "Character name cannot be longer than a whole page.",
        ));
    }

    if *ctx.y_position + name_height + LINE_HEIGHT >= ctx.max_y {
        return Ok(true);
    }

    write_element(
        ctx,
        &character_name,
        &dialogue_margins.character,
        Alignment::LeftToRight,
    )?;

    let mut dialogue_index = residual_dialogue.unwrap_or(0);
    while dialogue_index < dialogue.elements.len() {
        if *ctx.y_position >= ctx.max_y {
            *residual_dialogue = Some(dialogue_index);
            let saved_max = ctx.max_y;
            ctx.max_y = saved_max + LINE_HEIGHT;
            write_element(
                ctx,
                &"(MORE)".into(),
                &dialogue_margins.character,
                Alignment::LeftToRight,
            )?;
            ctx.max_y = saved_max;
            return Ok(true);
        }

        let (content, margin) = match &dialogue.elements[dialogue_index] {
            DialogueElement::Parenthetical(s) => (s, &dialogue_margins.parenthetical),
            DialogueElement::Line(s) => (s, &dialogue_margins.line),
        };

        let overflowed = write_element(ctx, content, margin, Alignment::LeftToRight)?;

        if overflowed {
            *residual_dialogue = Some(dialogue_index);
            let saved_max = ctx.max_y;
            ctx.max_y = saved_max + LINE_HEIGHT;
            write_element(
                ctx,
                &"(MORE)".into(),
                &dialogue_margins.character,
                Alignment::LeftToRight,
            )?;
            ctx.max_y = saved_max;
            return Ok(true);
        }

        dialogue_index += 1;
    }

    *residual_dialogue = None;
    Ok(false)
}