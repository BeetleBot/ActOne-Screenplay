use std::collections::HashMap;
use cosmic_text::FontSystem;
use krilla::{Document, page::PageSettings};

use crate::pdf::{rich_string::RichString, screenplay::TitlePage};

use super::layout::{LayoutInfo, Margin, LINE_HEIGHT};
use super::elements::{Alignment, DrawContext, write_element, measure_element_height};

pub const TITLE_TOP_MARGIN: f32 = 72.0;
pub const TITLE_BOTTOM_MARGIN: f32 = 72.0;
pub const TITLE_SIDE_MARGIN: f32 = 72.0;

pub fn write_titlepage(
    titlepage: &TitlePage,
    layout_info: &LayoutInfo,
    document: &mut Document,
    font_system: &mut FontSystem,
    font_cache: &mut HashMap<cosmic_text::fontdb::ID, krilla::text::Font>,
) -> std::io::Result<()> {
    let mut page = document.start_page_with(
        PageSettings::from_wh(layout_info.size.x, layout_info.size.y)
            .ok_or_else(|| std::io::Error::other("invalid page dimensions"))?,
    );
    let mut surface = page.surface();
    let mut temp_res = None;

    let content_width = layout_info.size.x - 2.0 * TITLE_SIDE_MARGIN;
    let title_margin = Margin {
        left: TITLE_SIDE_MARGIN,
        right: TITLE_SIDE_MARGIN,
    };

    let title_block_y = TITLE_TOP_MARGIN + 20.0 * LINE_HEIGHT;
    let page_max_y = layout_info.size.y - TITLE_BOTTOM_MARGIN;
    let mut y_pos = title_block_y;

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
                y_position: &mut y_pos,
                max_y: page_max_y,
                is_revised: false,
                font_system,
                font_cache,
            };
            write_element(&mut ctx, &styled, &title_margin, Alignment::Centered, false, &mut temp_res)?;
        }
    }

    y_pos += LINE_HEIGHT;

    if !titlepage.credit.is_empty() {
        for s in &titlepage.credit {
            let mut ctx = DrawContext {
                layout_info,
                surface: &mut surface,
                y_position: &mut y_pos,
                max_y: page_max_y,
                is_revised: false,
                font_system,
                font_cache,
            };
            write_element(&mut ctx, s, &title_margin, Alignment::Centered, false, &mut temp_res)?;
        }
    }

    if !titlepage.authors.is_empty() {
        for s in &titlepage.authors {
            let mut ctx = DrawContext {
                layout_info,
                surface: &mut surface,
                y_position: &mut y_pos,
                max_y: page_max_y,
                is_revised: false,
                font_system,
                font_cache,
            };
            write_element(&mut ctx, s, &title_margin, Alignment::Centered, false, &mut temp_res)?;
        }
    }

    if !titlepage.source.is_empty() {
        y_pos += LINE_HEIGHT;
        for s in &titlepage.source {
            let mut ctx = DrawContext {
                layout_info,
                surface: &mut surface,
                y_position: &mut y_pos,
                max_y: page_max_y,
                is_revised: false,
                font_system,
                font_cache,
            };
            write_element(&mut ctx, s, &title_margin, Alignment::Centered, false, &mut temp_res)?;
        }
    }

    let bottom_block_y = 440.0_f32;
    let bottom_max_y = layout_info.size.y - TITLE_BOTTOM_MARGIN - 48.0;

    let left_col_width = content_width * 0.65 - 10.0;
    let right_col_width = content_width * 0.35 - 10.0;

    let left_margin = Margin {
        left: TITLE_SIDE_MARGIN,
        right: layout_info.size.x - TITLE_SIDE_MARGIN - left_col_width,
    };
    let right_margin = Margin {
        left: layout_info.size.x - TITLE_SIDE_MARGIN - right_col_width,
        right: TITLE_SIDE_MARGIN,
    };

    let left_elements: Vec<&Vec<RichString>> = [&titlepage.contact, &titlepage.notes]
        .iter()
        .filter(|v| !v.is_empty())
        .copied()
        .collect();

    let mut left_total_height = 0.0_f32;
    for (i, lines) in left_elements.iter().enumerate() {
        if i > 0 {
            left_total_height += LINE_HEIGHT;
        }
        for s in *lines {
            left_total_height += measure_element_height(
                font_system,
                s,
                &left_margin,
                layout_info.size,
                layout_info.export_font,
                layout_info.script_fonts,
            );
        }
    }

    let mut right_total_height = 0.0_f32;
    if !titlepage.draft_date.is_empty() {
        for s in &titlepage.draft_date {
            right_total_height += measure_element_height(
                font_system,
                s,
                &right_margin,
                layout_info.size,
                layout_info.export_font,
                layout_info.script_fonts,
            );
        }
    }

    let available_bottom_height = bottom_max_y - bottom_block_y;
    let mut left_y = bottom_block_y + (available_bottom_height - left_total_height).max(0.0);
    let mut right_y = bottom_block_y + (available_bottom_height - right_total_height).max(0.0);

    let mut first_left = true;
    for lines in &left_elements {
        if !first_left {
            left_y += LINE_HEIGHT;
        }
        first_left = false;
        for s in *lines {
            let mut ctx = DrawContext {
                layout_info,
                surface: &mut surface,
                y_position: &mut left_y,
                max_y: bottom_max_y,
                is_revised: false,
                font_system,
                font_cache,
            };
            write_element(&mut ctx, s, &left_margin, Alignment::LeftToRight, false, &mut temp_res)?;
        }
    }

    if !titlepage.draft_date.is_empty() {
        for s in &titlepage.draft_date {
            let mut ctx = DrawContext {
                layout_info,
                surface: &mut surface,
                y_position: &mut right_y,
                max_y: bottom_max_y,
                is_revised: false,
                font_system,
                font_cache,
            };
            write_element(&mut ctx, s, &right_margin, Alignment::RightToLeft, false, &mut temp_res)?;
        }
    }

    surface.finish();
    page.finish();
    Ok(())
}
