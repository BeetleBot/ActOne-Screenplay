use krilla::{
    geom::{PathBuilder, Point, Rect},
    surface::Surface,
};

use crate::pdf::{
    rich_string::RichString,
    screenplay::{Dialogue, DialogueElement},
};

use super::layout::{LayoutInfo, Margin, DialogueMargins, FONT_SIZE, FONT_WIDTH, PaperSize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Alignment {
    LeftToRight,
    RightToLeft,
    Centered,
}

pub struct DrawContext<'a, 'b> {
    pub layout_info: &'a LayoutInfo<'a>,
    pub surface: &'a mut Surface<'b>,
    pub line_index: &'a mut usize,
    pub max_lines: usize,
    pub is_revised: bool,
}

pub fn write_dialogue(
    ctx: &mut DrawContext<'_, '_>,
    dialogue: &Dialogue,
    residual_dialogue: &mut Option<usize>,
    residual_index: &mut Option<usize>,
    dialogue_margins: &DialogueMargins,
) -> std::io::Result<bool> {
    let mut character_name = dialogue.character.clone();
    match (*residual_dialogue, &dialogue.extension) {
        (Some(_), _) => {
            character_name.append(" (CONT'D)".into());
        }
        (std::option::Option::None, Some(ext)) => {
            character_name.append(" (".into());
            character_name.append(ext.clone());
            character_name.append(")".into());
        }
        _ => (),
    };
    let span = glyph_span(
        ctx.layout_info.size,
        dialogue_margins.character.left,
        dialogue_margins.character.right,
    );
    let name_lines_count = break_points(&character_name, span).len() + 1;

    if name_lines_count >= ctx.max_lines {
        return Err(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            "Character name cannot be longer than a whole page.",
        ));
    }

    if *ctx.line_index + name_lines_count + 1 >= ctx.max_lines {
        return Ok(true);
    }

    write_element(
        ctx,
        &character_name,
        &dialogue_margins.character,
        &mut 0,
        Alignment::LeftToRight,
    )?;

    let mut dialogue_index = residual_dialogue.unwrap_or(0);
    while dialogue_index < dialogue.elements.len() {
        if *ctx.line_index >= ctx.max_lines {
            *residual_dialogue = Some(dialogue_index);
            write_element_custom_top_margin(
                ctx,
                &"(MORE)".into(),
                &dialogue_margins.character,
                &mut 0,
                Alignment::LeftToRight,
                ctx.layout_info.size.top_margin(),
                ctx.max_lines + 1,
            )?;

            return Ok(true);
        }
        let mut breakpoint_index = match *residual_index {
            Some(i) => {
                *residual_index = std::option::Option::None;
                i
            }
            std::option::Option::None => 0,
        };

        let (content, margin) = match &dialogue.elements[dialogue_index] {
            DialogueElement::Parenthetical(s) => (s, &dialogue_margins.parenthetical),
            DialogueElement::Line(s) => (s, &dialogue_margins.line),
        };

        *residual_index = write_element(
            ctx,
            content,
            margin,
            &mut breakpoint_index,
            Alignment::LeftToRight,
        )?;

        if residual_index.is_some() {
            continue;
        }

        dialogue_index += 1;
    }

    *residual_dialogue = std::option::Option::None;
    Ok(false)
}

pub fn write_element(
    ctx: &mut DrawContext<'_, '_>,
    content: &RichString,
    margin: &Margin,
    breakpoint_index: &mut usize,
    text_direction: Alignment,
) -> std::io::Result<Option<usize>> {
    write_element_custom_top_margin(
        ctx,
        content,
        margin,
        breakpoint_index,
        text_direction,
        ctx.layout_info.size.top_margin(),
        ctx.max_lines,
    )
}

pub fn write_element_custom_top_margin(
    ctx: &mut DrawContext<'_, '_>,
    content: &RichString,
    margin: &Margin,
    breakpoint_index: &mut usize,
    text_direction: Alignment,
    top_margin: usize,
    local_max_lines: usize,
) -> std::io::Result<Option<usize>> {
    let left_margin = margin.left;
    let right_margin = margin.right;
    let span = glyph_span(ctx.layout_info.size, left_margin, right_margin);
    let breakpoints = break_points(content, span);
    while *breakpoint_index <= breakpoints.len() {
        if *ctx.line_index >= local_max_lines {
            return Ok(Some(*breakpoint_index));
        }

        let start_index = if *breakpoint_index == 0 {
            0
        } else {
            breakpoints[*breakpoint_index - 1].index
        };
        write_line(
            ctx,
            LineDrawOptions {
                x: left_margin,
                y: (FONT_SIZE * *ctx.line_index + top_margin) as f32,
                text_direction,
                margin,
            },
            content,
            start_index,
            breakpoints.get(*breakpoint_index),
        )?;
        *breakpoint_index += 1;
        *ctx.line_index += 1;
    }
    Ok(std::option::Option::None)
}

pub struct LineDrawOptions<'a> {
    pub x: f32,
    pub y: f32,
    pub text_direction: Alignment,
    pub margin: &'a Margin,
}

pub fn write_line(
    ctx: &mut DrawContext<'_, '_>,
    options: LineDrawOptions,
    content: &RichString,
    mut start_index: usize,
    breakpoint: Option<&BreakPoint>,
) -> std::io::Result<()> {
    let mut x = options.x;
    let y = options.y;
    let text_direction = options.text_direction;
    let margin = options.margin;

    match content.get_char(start_index) {
        Some(c) => {
            if c == '\n' {
                start_index += 1
            }
        }
        std::option::Option::None => {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                "Could not get character from source.",
            ));
        }
    }

    let (breakpoint_index, break_word) = match breakpoint {
        Some(b) => (b.index, b.break_type == BreakType::BreakWord),
        std::option::Option::None => (content.char_count(), false),
    };

    match text_direction {
        Alignment::LeftToRight => (),
        Alignment::RightToLeft => {
            let line_length = breakpoint_index - start_index;
            let line_span = line_length as f32 * FONT_WIDTH;
            x = ctx.layout_info.size.x as f32 - margin.right - line_span;
        }
        Alignment::Centered => {
            let line_length = breakpoint_index - start_index;
            let line_span = (line_length as f32 / 2.0) * FONT_WIDTH;
            x = (ctx.layout_info.size.x as f32 / 2.0) - line_span;
        }
    }

    let mut glyph_index = 0;
    while start_index < breakpoint_index {
        let (string_element, relative_index) = match content.get_element_from_index(start_index) {
            Some(res) => res,
            std::option::Option::None => {
                return Err(std::io::Error::new(
                    std::io::ErrorKind::InvalidData,
                    "Could not get rich string element.",
                ));
            }
        };

        let element_length = string_element.text.chars().count();

        let relative_break_index =
            if breakpoint_index - start_index >= element_length - relative_index {
                element_length
            } else {
                breakpoint_index - (start_index - relative_index)
            };
        let is_sans = if ctx.layout_info.export_font == "courier_prime_sans" {
            true
        } else {
            string_element.is_sans()
        };

        let font = if is_sans {
            match (string_element.is_bold(), string_element.is_italic()) {
                (false, false) => &ctx.layout_info.fonts.sans_regular,
                (true, false) => &ctx.layout_info.fonts.sans_bold,
                (false, true) => &ctx.layout_info.fonts.sans_italic,
                (true, true) => &ctx.layout_info.fonts.sans_bold_italic,
            }
        } else {
            match (string_element.is_bold(), string_element.is_italic()) {
                (false, false) => &ctx.layout_info.fonts.regular,
                (true, false) => &ctx.layout_info.fonts.bold,
                (false, true) => &ctx.layout_info.fonts.italic,
                (true, true) => &ctx.layout_info.fonts.bold_italic,
            }
        };
        let start_byte_index = string_element
            .text
            .char_indices()
            .nth(relative_index)
            .map(|(i, _)| i)
            .unwrap_or(0);
        let end_byte_index = string_element
            .text
            .char_indices()
            .nth(relative_break_index)
            .map_or(string_element.text.len(), |(i, _)| i);

        ctx.surface.draw_text(
            Point::from_xy(x + (glyph_index as f32 * FONT_WIDTH), y),
            font.clone(),
            FONT_SIZE as f32,
            &string_element.text[start_byte_index..end_byte_index],
            false,
            krilla::text::TextDirection::LeftToRight,
        );

        let glyphs_written = relative_break_index - relative_index;

        if string_element.is_underline() {
            let underline = {
                let mut pb = PathBuilder::new();
                let r = Rect::from_xywh(
                    x + (glyph_index as f32 * FONT_WIDTH),
                    y + 1.2,
                    glyphs_written as f32 * FONT_WIDTH,
                    0.5,
                )
                .ok_or_else(|| std::io::Error::other("invalid underline rect"))?;
                pb.push_rect(r);
                pb.close();
                pb.finish()
                    .ok_or_else(|| std::io::Error::other("failed to build underline path"))?
            };
            ctx.surface.draw_path(&underline);
        }

        glyph_index += glyphs_written;
        start_index += glyphs_written;
    }

    if break_word {
        ctx.surface.draw_text(
            Point::from_xy(x + (glyph_index as f32 * FONT_WIDTH), y),
            ctx.layout_info.fonts.regular.clone(),
            FONT_SIZE as f32,
            "-",
            false,
            krilla::text::TextDirection::LeftToRight,
        );
    }

    if ctx.is_revised {
        ctx.surface.draw_text(
            Point::from_xy(ctx.layout_info.size.x as f32 - 36.0, y),
            ctx.layout_info.fonts.bold.clone(),
            FONT_SIZE as f32,
            "*",
            false,
            krilla::text::TextDirection::LeftToRight,
        );
    }

    Ok(())
}

pub fn glyph_span(size: &PaperSize, left_margin: f32, right_margin: f32) -> usize {
    ((size.x as f32 - (left_margin + right_margin)) / FONT_WIDTH) as usize
}

#[derive(Debug, PartialEq, Eq, Clone, Hash)]
pub enum BreakType {
    NewLine,
    BreakWord,
}

#[derive(Debug, PartialEq, Eq, Clone, Hash)]
pub struct BreakPoint {
    pub index: usize,
    pub break_type: BreakType,
}

pub fn break_points(content: &RichString, span: usize) -> Vec<BreakPoint> {
    debug_assert!(span >= 2);

    let mut brekpoints = Vec::with_capacity(content.char_count() / span + 1);
    let mut last_whitespace_char = (0, 0);
    let mut line_len = 0;
    for (i, glyph) in content.iter().enumerate() {
        line_len += 1;
        if glyph == '\n' {
            brekpoints.push(BreakPoint {
                index: i,
                break_type: BreakType::NewLine,
            });
            line_len = 0;
            continue;
        }

        if glyph.is_whitespace() || glyph == '-' {
            last_whitespace_char = (brekpoints.len() + 1, i);
            continue;
        }

        if line_len >= span {
            if brekpoints.len() + 1 != last_whitespace_char.0 {
                brekpoints.push(BreakPoint {
                    index: i,
                    break_type: BreakType::BreakWord,
                });
                line_len = 0;
                continue;
            }

            brekpoints.push(BreakPoint {
                index: last_whitespace_char.1 + 1,
                break_type: BreakType::NewLine,
            });
            line_len = i - last_whitespace_char.1;
        }
    }
    brekpoints
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn breaks_simple() {
        let mut rs = RichString::new();
        rs.push_str("hello world");

        let breakpoints = break_points(&rs, 6);
        let correct = vec![BreakPoint {
            index: 6,
            break_type: BreakType::NewLine,
        }];

        assert_eq!(breakpoints, correct);
    }

    #[test]
    fn breaks_simple_with_newline() {
        let mut rs = RichString::new();
        rs.push_str("hello\nworld");

        let breakpoints = break_points(&rs, 100);
        let correct = vec![BreakPoint {
            index: 5,
            break_type: BreakType::NewLine,
        }];

        assert_eq!(breakpoints, correct);
    }

    #[test]
    fn breaks_simple_breakword() {
        let mut rs = RichString::new();
        rs.push_str("helloworld");

        let breakpoints = break_points(&rs, 6);
        let correct = vec![BreakPoint {
            index: 5,
            break_type: BreakType::BreakWord,
        }];

        assert_eq!(breakpoints, correct);
    }

    #[test]
    fn breaks_simple_utilizing_hyphen() {
        let mut rs = RichString::new();
        rs.push_str("hello-world");

        let breakpoints = break_points(&rs, 7);
        let correct = vec![BreakPoint {
            index: 6,
            break_type: BreakType::NewLine,
        }];

        assert_eq!(breakpoints, correct);
    }

    #[test]
    fn breaks_rich() {
        let mut rs = RichString::new();
        rs.push_str("he**ll**o wor*ld*");

        let breakpoints = break_points(&rs, 6);
        let correct = vec![BreakPoint {
            index: 6,
            break_type: BreakType::NewLine,
        }];

        assert_eq!(breakpoints, correct);
    }

    #[test]
    fn breaks_rich_longer() {
        let mut rs = RichString::new();
        rs.push_str("Bosse går till **affären** och köper lite mjölk, vilket han tycker är väldigt gott att äta.");

        let breakpoints = break_points(&rs, 60);
        let correct = vec![BreakPoint {
            index: 56,
            break_type: BreakType::NewLine,
        }];

        assert_eq!(breakpoints, correct);
    }
}