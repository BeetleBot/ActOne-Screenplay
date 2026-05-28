use krilla::{Document, page::PageSettings};

use crate::pdf::{rich_string::RichString, screenplay::TitlePage};

use super::layout::{LayoutInfo, Margin, FONT_SIZE};
use super::elements::{Alignment, DrawContext, break_points, glyph_span, write_element_custom_top_margin};

pub const TITLE_TOP_MARGIN: f32 = 72.0;
pub const TITLE_BOTTOM_MARGIN: f32 = 72.0;
pub const TITLE_SIDE_MARGIN: f32 = 72.0;

pub fn write_titlepage(
    titlepage: &TitlePage,
    layout_info: &LayoutInfo,
    _max_lines: usize,
    document: &mut Document,
) -> std::io::Result<()> {
    let mut page = document.start_page_with(
        PageSettings::from_wh(layout_info.size.x as f32, layout_info.size.y as f32)
            .ok_or_else(|| std::io::Error::other("invalid page dimensions"))?,
    );
    let mut surface = page.surface();

    let content_width = layout_info.size.x as f32 - 2.0 * TITLE_SIDE_MARGIN;
    let title_margin = Margin {
        left: TITLE_SIDE_MARGIN,
        right: TITLE_SIDE_MARGIN,
    };

    let top_block_y = TITLE_TOP_MARGIN;
    let title_offset_lines = 20;
    let mut line_idx = title_offset_lines;
    let page_max_lines =
        ((layout_info.size.y as f32 - TITLE_TOP_MARGIN - TITLE_BOTTOM_MARGIN) / FONT_SIZE as f32)
            as usize;

    if !titlepage.title.is_empty() {
        for s in &titlepage.title {
            let mut styled = s.clone();
            for element in &mut styled.elements {
                element.text = element.text.to_uppercase();
                element.set_bold();
            }
            let mut ctx = DrawContext {
                layout_info,
                surface: &mut surface,
                line_index: &mut line_idx,
                max_lines: page_max_lines,
                is_revised: false,
            };
            write_element_custom_top_margin(
                &mut ctx,
                &styled,
                &title_margin,
                &mut 0,
                Alignment::Centered,
                top_block_y as usize,
                page_max_lines,
            )?;
        }
    }

    line_idx += 1;

    if !titlepage.credit.is_empty() {
        for s in &titlepage.credit {
            let mut ctx = DrawContext {
                layout_info,
                surface: &mut surface,
                line_index: &mut line_idx,
                max_lines: page_max_lines,
                is_revised: false,
            };
            write_element_custom_top_margin(
                &mut ctx,
                s,
                &title_margin,
                &mut 0,
                Alignment::Centered,
                top_block_y as usize,
                page_max_lines,
            )?;
        }
    }

    if !titlepage.authors.is_empty() {
        for s in &titlepage.authors {
            let mut ctx = DrawContext {
                layout_info,
                surface: &mut surface,
                line_index: &mut line_idx,
                max_lines: page_max_lines,
                is_revised: false,
            };
            write_element_custom_top_margin(
                &mut ctx,
                s,
                &title_margin,
                &mut 0,
                Alignment::Centered,
                top_block_y as usize,
                page_max_lines,
            )?;
        }
    }

    if !titlepage.source.is_empty() {
        line_idx += 1;
        for s in &titlepage.source {
            let mut ctx = DrawContext {
                layout_info,
                surface: &mut surface,
                line_index: &mut line_idx,
                max_lines: page_max_lines,
                is_revised: false,
            };
            write_element_custom_top_margin(
                &mut ctx,
                s,
                &title_margin,
                &mut 0,
                Alignment::Centered,
                top_block_y as usize,
                page_max_lines,
            )?;
        }
    }

    let bottom_block_y = 440.0_f32;
    let available_bottom_height =
        layout_info.size.y as f32 - bottom_block_y - TITLE_BOTTOM_MARGIN - 48.0;
    let bottom_max_lines = (available_bottom_height / FONT_SIZE as f32) as usize;

    let left_col_width = content_width * 0.65 - 10.0;
    let right_col_width = content_width * 0.35 - 10.0;

    let left_margin = Margin {
        left: TITLE_SIDE_MARGIN,
        right: layout_info.size.x as f32 - TITLE_SIDE_MARGIN - left_col_width,
    };
    let right_margin = Margin {
        left: layout_info.size.x as f32 - TITLE_SIDE_MARGIN - right_col_width,
        right: TITLE_SIDE_MARGIN,
    };

    let left_elements: Vec<&Vec<RichString>> = [&titlepage.contact, &titlepage.notes]
        .iter()
        .filter(|v| !v.is_empty())
        .copied()
        .collect();

    let mut left_total_lines = 0;
    for (i, lines) in left_elements.iter().enumerate() {
        if i > 0 {
            left_total_lines += 1;
        }
        for s in *lines {
            left_total_lines +=
                1 + break_points(s, glyph_span(layout_info.size, left_margin.left, left_margin.right)).len();
        }
    }

    let mut right_total_lines = 0;
    if !titlepage.draft_date.is_empty() {
        for s in &titlepage.draft_date {
            right_total_lines +=
                1 + break_points(s, glyph_span(layout_info.size, right_margin.left, right_margin.right)).len();
        }
    }

    let mut left_line_idx = bottom_max_lines.saturating_sub(left_total_lines);
    let mut right_line_idx = bottom_max_lines.saturating_sub(right_total_lines);

    let mut first_left = true;
    for lines in &left_elements {
        if !first_left {
            left_line_idx += 1;
        }
        first_left = false;
        for s in *lines {
            let mut ctx = DrawContext {
                layout_info,
                surface: &mut surface,
                line_index: &mut left_line_idx,
                max_lines: bottom_max_lines,
                is_revised: false,
            };
            write_element_custom_top_margin(
                &mut ctx,
                s,
                &left_margin,
                &mut 0,
                Alignment::LeftToRight,
                bottom_block_y as usize,
                bottom_max_lines,
            )?;
        }
    }

    if !titlepage.draft_date.is_empty() {
        for s in &titlepage.draft_date {
            let mut ctx = DrawContext {
                layout_info,
                surface: &mut surface,
                line_index: &mut right_line_idx,
                max_lines: bottom_max_lines,
                is_revised: false,
            };
            write_element_custom_top_margin(
                &mut ctx,
                s,
                &right_margin,
                &mut 0,
                Alignment::RightToLeft,
                bottom_block_y as usize,
                bottom_max_lines,
            )?;
        }
    }

    surface.finish();
    page.finish();
    Ok(())
}
