#![allow(clippy::too_many_arguments)]
//! PDF exporter for Markdown (prose) documents.
//!
//! Renders a [`ProseDoc`] with the same krilla pipeline and watermark
//! machinery as the Fountain exporter.

use std::collections::HashMap;
use std::io::Write;

use base64::Engine;
use cosmic_text::FontSystem;
use krilla::{
    Document,
    color::luma,
    geom::{PathBuilder, Point, Rect},
    page::PageSettings,
    paint::{Fill, Paint, Stroke},
};

use crate::pdf::{
    export::{
        elements::{
            DrawContext, ShapedLine, draw_shaped_line, line_height_for_line, shape_rich_string,
        },
        layout::{AllFonts, LayoutInfo, PaperSize, get_margins},
        shared::{
            WatermarkSettings, build_font_system, draw_watermarks, load_center_image,
            load_courier_fonts, load_indic_fonts, load_symbol_fonts, measure_text_width,
        },
    },
    rich_string::RichString,
};

use super::ast::{Align, Block, ListItem, parse};

/// Indent per list nesting level.
const LIST_INDENT: f32 = 18.0;
/// Blockquote indent.
const QUOTE_INDENT: f32 = 10.0;
/// Code block font size.
const CODE_SIZE: f32 = 9.5;
/// Code line height.
const CODE_LINE_H: f32 = CODE_SIZE * 1.35;
/// Code block horizontal padding.
const CODE_PAD_H: f32 = 10.0;
/// Code block vertical padding.
const CODE_PAD_V: f32 = 8.0;
/// Table cell font size.
const TABLE_SIZE: f32 = 10.0;
/// Table cell horizontal padding.
const TABLE_PAD_H: f32 = 6.0;
/// Residual render state for blocks split across pages.
enum Residual {
    None,
    Paragraph {
        rs: RichString,
        line: usize,
    },
    Code {
        text: String,
        line: usize,
    },
    Table {
        alignments: Vec<Align>,
        header: Vec<RichString>,
        rows: Vec<Vec<RichString>>,
        row: usize,
        col_w: f32,
        header_drawn: bool,
    },
    List {
        ordered: bool,
        start: u64,
        items: Vec<ListItem>,
        item_idx: usize,
    },
}

/// Result of drawing a block.
enum DrawOutcome {
    /// Block finished; caller should advance to the next block.
    Done,
    /// The page is full; the block was either not drawn or is partially drawn
    /// with a residual set.
    PageFull,
}

pub struct ProsePdfExporter {
    pub prose_style: Option<String>,
    pub paper_size: PaperSize,
    pub export_font: String,
    pub watermark_header_enabled: bool,
    pub watermark_header_text: String,
    pub watermark_header_opacity: f32,
    pub watermark_footer_enabled: bool,
    pub watermark_footer_text: String,
    pub watermark_footer_opacity: f32,
    pub watermark_center_enabled: bool,
    pub watermark_center_type: String,
    pub watermark_center_text: String,
    pub watermark_center_image_path: String,
    pub watermark_center_opacity: f32,
    pub watermark_center_grayscale: bool,
    pub script_fonts: HashMap<String, String>,
}

impl Default for ProsePdfExporter {
    fn default() -> Self {
        Self {
            prose_style: Some("classic".to_string()),
            paper_size: PaperSize::default(),
            export_font: String::new(),
            watermark_header_enabled: false,
            watermark_header_text: String::new(),
            watermark_header_opacity: 1.0,
            watermark_footer_enabled: false,
            watermark_footer_text: String::new(),
            watermark_footer_opacity: 1.0,
            watermark_center_enabled: false,
            watermark_center_type: "text".to_string(),
            watermark_center_text: String::new(),
            watermark_center_image_path: String::new(),
            watermark_center_opacity: 0.4,
            watermark_center_grayscale: false,
            script_fonts: HashMap::new(),
        }
    }
}

impl ProsePdfExporter {
    fn style(&self) -> super::styles::ProseStyle {
        super::styles::prose_style(self.prose_style.as_deref().unwrap_or("classic"))
    }

    fn heading_metrics(&self, level: u8) -> (f32, f32, f32) {
        let style = self.style();
        let index = level.clamp(1, 6) as usize - 1;
        (
            style.heading_sizes[index],
            style.heading_before[index],
            style.heading_after[index],
        )
    }

    fn trailing_gap(&self, block: &Block) -> f32 {
        match block {
            Block::Paragraph(_) => self.style().paragraph_gap(),
            Block::Heading { level, .. } => self.heading_metrics(*level).2,
            Block::RawHtml(_) | Block::FootnoteDefinition { .. } => 0.0,
            _ => self.style().block_gap(),
        }
    }

    fn line_gap(&self, size: f32) -> f32 {
        if self.style().manuscript && (size - TABLE_SIZE).abs() < 0.01 {
            2.0
        } else {
            self.style().line_gap
        }
    }

    fn text_width(
        &self,
        ctx: &mut DrawContext<'_, '_>,
        rs: &RichString,
        width: f32,
        size: f32,
    ) -> f32 {
        let shaped = shape_rich_string(
            ctx.font_system,
            rs,
            width,
            size,
            ctx.layout_info.export_font,
            ctx.layout_info.script_fonts,
        );
        shaped
            .lines
            .iter()
            .map(|line| line.width)
            .fold(0.0_f32, f32::max)
    }

    fn measure_rich(
        &self,
        ctx: &mut DrawContext<'_, '_>,
        rs: &RichString,
        width: f32,
        size: f32,
    ) -> std::io::Result<f32> {
        measure_rich(ctx, rs, width, size, self.line_gap(size))
    }

    fn write_rich_block(
        &self,
        ctx: &mut DrawContext<'_, '_>,
        rs: &RichString,
        x: f32,
        width: f32,
        size: f32,
        residual: &mut Option<usize>,
        annotations: &mut Vec<krilla::annotation::Annotation>,
    ) -> std::io::Result<bool> {
        write_rich_block(
            ctx,
            rs,
            x,
            width,
            size,
            residual,
            annotations,
            self.line_gap(size),
        )
    }

    pub fn export(&self, markdown_text: &str, writer: &mut dyn Write) -> std::io::Result<()> {
        self.export_with_page_breaks(markdown_text, writer)
            .map(|_| ())
    }

    /// One-based source block lines for each page after the first. A block split
    /// across pages can repeat its source line; page counts still match the PDF.
    pub fn export_with_page_breaks(
        &self,
        markdown_text: &str,
        writer: &mut dyn Write,
    ) -> std::io::Result<Vec<usize>> {
        let mut document = Document::new();
        let mut font_system = build_font_system();
        let courier = load_courier_fonts()?;
        let indic = load_indic_fonts()?;
        let symbols = load_symbol_fonts()?;
        let all_fonts = AllFonts {
            courier,
            indic,
            symbols,
        };

        let effective_font = if let Some(style) = self.prose_style.as_deref() {
            super::styles::prose_style(style).font.to_string()
        } else if self.export_font.is_empty() || self.export_font == "Courier Prime" {
            self.style().font.to_string()
        } else {
            self.export_font.clone()
        };

        let layout_info = LayoutInfo {
            size: &self.paper_size,
            fonts: &all_fonts,
            export_font: &effective_font,
            revised_lines: &[],
            margins: get_margins(&self.paper_size),
            script_fonts: &self.script_fonts,
        };

        let breaks =
            self.generate_pdf(&mut document, &layout_info, markdown_text, &mut font_system)?;

        let pdf = document.finish().map_err(|e| {
            eprintln!("document.finish() failed with error: {:?}", e);
            std::io::Error::other("failed to create pdf")
        })?;
        writer.write_all(&pdf)?;
        Ok(breaks)
    }

    fn to_watermark_settings(&self) -> WatermarkSettings {
        WatermarkSettings {
            header_enabled: self.watermark_header_enabled,
            header_text: self.watermark_header_text.clone(),
            header_opacity: self.watermark_header_opacity,
            footer_enabled: self.watermark_footer_enabled,
            footer_text: self.watermark_footer_text.clone(),
            footer_opacity: self.watermark_footer_opacity,
            center_enabled: self.watermark_center_enabled,
            center_type: self.watermark_center_type.clone(),
            center_text: self.watermark_center_text.clone(),
            center_image_path: self.watermark_center_image_path.clone(),
            center_opacity: self.watermark_center_opacity,
            center_grayscale: self.watermark_center_grayscale,
        }
    }

    fn generate_pdf(
        &self,
        document: &mut Document,
        layout_info: &LayoutInfo,
        markdown_text: &str,
        font_system: &mut FontSystem,
    ) -> std::io::Result<Vec<usize>> {
        let doc = parse(markdown_text);

        // Footnotes are rendered at the end of the document.
        let mut blocks: Vec<Block> = Vec::new();
        let mut footnotes: Vec<&Block> = Vec::new();
        let mut source_lines = Vec::new();
        for (index, block) in doc.blocks.iter().enumerate() {
            if let Block::FootnoteDefinition { .. } = block {
                footnotes.push(block);
            } else {
                blocks.push(block.clone());
                source_lines.push(doc.source_lines[index]);
            }
        }
        if !footnotes.is_empty() {
            blocks.push(Block::HorizontalRule);
            for note in footnotes {
                if let Block::FootnoteDefinition {
                    label,
                    blocks: inner,
                } = note
                {
                    let mut text = RichString::new();
                    let mut lead: RichString = format!("[{label}] ").into();
                    text.append(std::mem::take(&mut lead));
                    for b in inner {
                        if let Block::Paragraph(p) = b {
                            text.append(p.clone());
                        }
                    }
                    blocks.push(Block::Paragraph(text));
                }
            }
        }

        source_lines.resize(blocks.len(), markdown_text.lines().count().max(1));
        let mut page_breaks = Vec::new();

        let top = layout_info.size.top_margin();
        let max_y = layout_info.size.y - layout_info.size.bottom_margin();
        let content_width = layout_info.size.x - 2.0 * self.style().margin;

        let watermark_settings = self.to_watermark_settings();
        let center_image = load_center_image(&watermark_settings);

        let mut font_cache = HashMap::new();
        let mut page_idx = 0;
        let mut block_idx = 0;
        let mut resid = Residual::None;
        let total = blocks.len();
        let mut first_page = true;

        while first_page || block_idx < total || !matches!(resid, Residual::None) {
            if !first_page {
                page_breaks.push(source_lines.get(block_idx).copied().unwrap_or(1));
            }
            first_page = false;
            let mut page = document.start_page_with(
                PageSettings::from_wh(layout_info.size.x, layout_info.size.y)
                    .ok_or_else(|| std::io::Error::other("invalid page dimensions"))?,
            );
            let mut surface = page.surface();
            let mut y_pos = top;

            let mut page_annots = Vec::new();
            let mut ctx = DrawContext {
                layout_info,
                surface: &mut surface,
                y_position: &mut y_pos,
                max_y,
                is_revised: false,
                font_system,
                font_cache: &mut font_cache,
            };

            let mut page_full = false;
            while !page_full {
                if *ctx.y_position >= max_y {
                    break;
                }
                match resid {
                    Residual::None => {
                        if block_idx >= total {
                            break;
                        }
                        match self.draw_block(
                            &mut ctx,
                            &blocks,
                            block_idx,
                            content_width,
                            0.0,
                            &mut resid,
                            &mut page_annots,
                        )? {
                            DrawOutcome::Done => block_idx += 1,
                            DrawOutcome::PageFull => page_full = true,
                        }
                    }
                    Residual::Paragraph {
                        ref rs,
                        ref mut line,
                    } => {
                        let mut res = Some(*line);
                        let more = self.write_rich_block(
                            &mut ctx,
                            rs,
                            self.style().margin,
                            content_width,
                            self.style().body_size,
                            &mut res,
                            &mut page_annots,
                        )?;
                        if more {
                            *line = res.unwrap();
                            page_full = true;
                        } else {
                            *ctx.y_position += self.style().paragraph_gap();
                            resid = Residual::None;
                            block_idx += 1;
                        }
                    }
                    Residual::Code {
                        ref text,
                        ref mut line,
                    } => {
                        let (more, drawn) =
                            self.draw_code_lines(&mut ctx, text, content_width, *line)?;
                        *line += drawn;
                        if more {
                            page_full = true;
                        } else {
                            *ctx.y_position += self.style().block_gap();
                            resid = Residual::None;
                            block_idx += 1;
                        }
                    }
                    Residual::Table {
                        ref alignments,
                        ref header,
                        ref rows,
                        ref mut row,
                        col_w,
                        ref mut header_drawn,
                    } => {
                        let (hdr_drawn, drawn) = self.draw_table_part(
                            &mut ctx,
                            alignments,
                            header,
                            rows,
                            *row,
                            col_w,
                            *header_drawn,
                            &mut page_annots,
                        )?;
                        *header_drawn = hdr_drawn;
                        *row += drawn;
                        if *row < rows.len() {
                            page_full = true;
                        } else {
                            *ctx.y_position += self.style().block_gap();
                            resid = Residual::None;
                            block_idx += 1;
                        }
                    }
                    Residual::List {
                        ordered,
                        start,
                        ref items,
                        ref mut item_idx,
                    } => {
                        let (more_remain, drawn) = self.draw_list_part(
                            &mut ctx,
                            items,
                            ordered,
                            start,
                            *item_idx,
                            content_width,
                            0.0,
                            &mut page_annots,
                        )?;
                        *item_idx += drawn;
                        if more_remain && *item_idx < items.len() {
                            page_full = true;
                        } else {
                            *ctx.y_position +=
                                self.style().block_gap() - self.style().paragraph_gap();
                            resid = Residual::None;
                            block_idx += 1;
                        }
                    }
                }
            }

            let page_num = (page_idx + 1).to_string();
            let pn_width = measure_text_width(font_system, &page_num, 10.0);
            surface.draw_text(
                Point::from_xy(
                    (layout_info.size.x - pn_width) / 2.0,
                    layout_info.size.y - 42.0,
                ),
                layout_info.fonts.courier.regular.clone(),
                10.0,
                &page_num,
                false,
                krilla::text::TextDirection::LeftToRight,
            );

            draw_watermarks(
                &mut surface,
                font_system,
                layout_info,
                &watermark_settings,
                center_image.as_ref(),
            );

            surface.finish();
            for annot in page_annots {
                page.add_annotation(annot);
            }
            page.finish();
            page_idx += 1;
        }

        Ok(page_breaks)
    }

    /// Draws a block. The block itself is unsplittable; paragraphs, code
    /// blocks and tables split across pages through residuals.
    fn draw_block(
        &self,
        ctx: &mut DrawContext<'_, '_>,
        blocks: &[Block],
        block_idx: usize,
        content_width: f32,
        x_offset: f32,
        residual: &mut Residual,
        annotations: &mut Vec<krilla::annotation::Annotation>,
    ) -> std::io::Result<DrawOutcome> {
        let block = &blocks[block_idx];
        let x = self.style().margin + x_offset;
        let is_top = *ctx.y_position <= ctx.layout_info.size.top_margin() + 0.1;
        match block {
            Block::Heading { level, content } => {
                let (size, requested_before, after) = self.heading_metrics(*level);
                let before = if is_top || block_idx == 0 {
                    0.0
                } else {
                    (requested_before - self.trailing_gap(&blocks[block_idx - 1])).max(0.0)
                };
                let mut rs = content.clone();
                for el in &mut rs.elements {
                    el.set_bold();
                }
                let height = self.measure_rich(ctx, &rs, content_width, size)?;
                // Heading orphan rule: Look ahead to the next block so the heading is never alone at bottom
                let lookahead = if block_idx + 1 < blocks.len() {
                    let next = &blocks[block_idx + 1];
                    let next_h = self.measure_block(ctx, next, content_width)?;
                    next_h.min(36.0)
                } else {
                    0.0
                };
                if !is_top && *ctx.y_position + before + height + after + lookahead > ctx.max_y {
                    return Ok(DrawOutcome::PageFull);
                }
                *ctx.y_position += before;
                let text_w = self.text_width(ctx, &rs, content_width, size);
                let heading_x =
                    if *level == 1 && self.style().center_title && text_w < content_width {
                        x + (content_width - text_w) / 2.0
                    } else {
                        x
                    };
                let mut res = None;
                self.write_rich_block(
                    ctx,
                    &rs,
                    heading_x,
                    content_width,
                    size,
                    &mut res,
                    annotations,
                )?;
                *ctx.y_position += after;
                Ok(DrawOutcome::Done)
            }
            Block::Image { url, .. } => {
                let image = load_prose_image(url)?;
                let (width, height) = prose_image_size(
                    &image,
                    content_width,
                    self.page_printable_height() - self.style().block_gap(),
                );
                if !is_top && *ctx.y_position + height > ctx.max_y {
                    return Ok(DrawOutcome::PageFull);
                }
                ctx.surface
                    .push_transform(&krilla::geom::Transform::from_translate(
                        x + (content_width - width) / 2.0,
                        *ctx.y_position,
                    ));
                ctx.surface.draw_image(
                    image,
                    krilla::geom::Size::from_wh(width, height)
                        .ok_or_else(|| std::io::Error::other("Invalid image size"))?,
                );
                ctx.surface.pop();
                *ctx.y_position += height + self.style().block_gap();
                Ok(DrawOutcome::Done)
            }
            Block::Paragraph(rs) => {
                // Monospaced whitespace provides a first-line-only indent without narrowing later lines.
                // Keep chapter/section openings and non-narrative containers flush.
                let mut paragraph = RichString::new();
                if self.style().manuscript
                    && x_offset.abs() < 0.01
                    && block_idx > 0
                    && matches!(blocks[block_idx - 1], Block::Paragraph(_))
                {
                    let mut indent: RichString = " ".repeat(self.style().indent_spaces).into();
                    for element in &mut indent.elements {
                        element.set_mono();
                    }
                    paragraph.append(indent);
                }
                paragraph.append(rs.clone());
                let rs = &paragraph;
                let height = self.measure_rich(ctx, rs, content_width, self.style().body_size)?;
                if *ctx.y_position + height <= ctx.max_y {
                    let mut res = None;
                    self.write_rich_block(
                        ctx,
                        rs,
                        x,
                        content_width,
                        self.style().body_size,
                        &mut res,
                        annotations,
                    )?;
                    *ctx.y_position += self.style().paragraph_gap();
                    Ok(DrawOutcome::Done)
                } else if !is_top && height <= self.page_printable_height() {
                    Ok(DrawOutcome::PageFull)
                } else {
                    let mut res = None;
                    let more = self.write_rich_block(
                        ctx,
                        rs,
                        x,
                        content_width,
                        self.style().body_size,
                        &mut res,
                        annotations,
                    )?;
                    if more && let Some(line) = res {
                        *residual = Residual::Paragraph {
                            rs: rs.clone(),
                            line,
                        };
                        Ok(DrawOutcome::PageFull)
                    } else {
                        *ctx.y_position += self.style().paragraph_gap();
                        Ok(DrawOutcome::Done)
                    }
                }
            }
            Block::List {
                ordered,
                start,
                items,
            } => {
                let (more_remain, drawn) = self.draw_list_part(
                    ctx,
                    items,
                    *ordered,
                    *start,
                    0,
                    content_width,
                    x_offset,
                    annotations,
                )?;
                if more_remain && drawn < items.len() {
                    *residual = Residual::List {
                        ordered: *ordered,
                        start: *start,
                        items: items.clone(),
                        item_idx: drawn,
                    };
                    Ok(DrawOutcome::PageFull)
                } else {
                    *ctx.y_position += self.style().block_gap() - self.style().paragraph_gap();
                    Ok(DrawOutcome::Done)
                }
            }
            Block::Blockquote(inner) => {
                let total_h = self.measure_blocks(ctx, inner, content_width - QUOTE_INDENT)?;
                let first_h = if let Some(first_b) = inner.first() {
                    self.measure_block(ctx, first_b, content_width - QUOTE_INDENT)?
                } else {
                    20.0
                };
                if !is_top
                    && *ctx.y_position + total_h > ctx.max_y
                    && *ctx.y_position + first_h.min(30.0) > ctx.max_y
                {
                    return Ok(DrawOutcome::PageFull);
                }
                let y0 = *ctx.y_position;
                self.draw_blocks(
                    ctx,
                    inner,
                    content_width - QUOTE_INDENT,
                    x_offset + QUOTE_INDENT,
                    annotations,
                )?;
                *ctx.y_position += self.style().block_gap() - self.style().paragraph_gap();
                let y1 = *ctx.y_position;
                // Exclude the shared trailing blank line from the quote marker.
                let bar_top = y0;
                let bar_bottom = (y1 - self.style().block_gap() + 1.5)
                    .max(bar_top + self.style().body_size * 0.8);
                self.fill_rect(
                    ctx,
                    self.style().margin + x_offset + 1.0,
                    bar_top,
                    1.5,
                    bar_bottom - bar_top,
                    160,
                )?;
                Ok(DrawOutcome::Done)
            }
            Block::CodeBlock { text, .. } => {
                let lines = text.lines().count().max(1);
                let height = lines as f32 * CODE_LINE_H + 2.0 * CODE_PAD_V;
                if *ctx.y_position + height <= ctx.max_y {
                    self.draw_code_block(ctx, text, content_width, lines)?;
                    *ctx.y_position += self.style().block_gap();
                    Ok(DrawOutcome::Done)
                } else if !is_top && height <= self.page_printable_height() {
                    Ok(DrawOutcome::PageFull)
                } else {
                    let (more, drawn) = self.draw_code_lines(ctx, text, content_width, 0)?;
                    if more {
                        *residual = Residual::Code {
                            text: text.clone(),
                            line: drawn,
                        };
                        Ok(DrawOutcome::PageFull)
                    } else {
                        *ctx.y_position += self.style().block_gap();
                        Ok(DrawOutcome::Done)
                    }
                }
            }
            Block::Table {
                alignments,
                header,
                rows,
            } => {
                let col_w = content_width / alignments.len().max(1) as f32;
                let height = self.measure_table(ctx, header, rows, col_w)?;
                if *ctx.y_position + height <= ctx.max_y {
                    self.draw_table(ctx, alignments, header, rows, col_w, annotations)?;
                    *ctx.y_position += self.style().block_gap();
                    Ok(DrawOutcome::Done)
                } else if !is_top && height <= self.page_printable_height() {
                    Ok(DrawOutcome::PageFull)
                } else {
                    let (header_drawn, drawn_rows) = self.draw_table_part(
                        ctx,
                        alignments,
                        header,
                        rows,
                        0,
                        col_w,
                        false,
                        annotations,
                    )?;
                    if drawn_rows < rows.len() || !header_drawn {
                        *residual = Residual::Table {
                            alignments: alignments.clone(),
                            header: header.clone(),
                            rows: rows.clone(),
                            row: drawn_rows,
                            col_w,
                            header_drawn,
                        };
                        Ok(DrawOutcome::PageFull)
                    } else {
                        *ctx.y_position += self.style().block_gap();
                        Ok(DrawOutcome::Done)
                    }
                }
            }
            Block::HorizontalRule => {
                if !is_top && *ctx.y_position + 0.7 > ctx.max_y {
                    return Ok(DrawOutcome::PageFull);
                }
                self.draw_hr(ctx, x, content_width)?;
                *ctx.y_position += 0.7 + self.style().block_gap();
                Ok(DrawOutcome::Done)
            }
            Block::RawHtml(_) => Ok(DrawOutcome::Done),
            Block::FootnoteDefinition { .. } => Ok(DrawOutcome::Done),
        }
    }

    fn measure_blocks(
        &self,
        ctx: &mut DrawContext<'_, '_>,
        blocks: &[Block],
        content_width: f32,
    ) -> std::io::Result<f32> {
        let mut total = 0.0;
        for block in blocks {
            total += self.measure_block(ctx, block, content_width)?;
        }
        Ok(total)
    }

    fn measure_block(
        &self,
        ctx: &mut DrawContext<'_, '_>,
        block: &Block,
        content_width: f32,
    ) -> std::io::Result<f32> {
        match block {
            Block::Heading { level, content } => {
                let (size, before, after) = self.heading_metrics(*level);
                let mut rs = content.clone();
                for el in &mut rs.elements {
                    el.set_bold();
                }
                Ok(self.measure_rich(ctx, &rs, content_width, size)? + before + after)
            }
            Block::Image { url, .. } => {
                let image = load_prose_image(url)?;
                Ok(prose_image_size(
                    &image,
                    content_width,
                    self.page_printable_height() - self.style().block_gap(),
                )
                .1 + self.style().block_gap())
            }
            Block::Paragraph(rs) => {
                Ok(
                    self.measure_rich(ctx, rs, content_width, self.style().body_size)?
                        + self.style().paragraph_gap(),
                )
            }
            Block::List { items, .. } => Ok(self.measure_list(ctx, items, content_width, 0)?
                + self.style().block_gap()
                - self.style().paragraph_gap()),
            Block::Blockquote(inner) => Ok(self.measure_blocks(
                ctx,
                inner,
                content_width - QUOTE_INDENT,
            )? + self.style().block_gap()
                - self.style().paragraph_gap()),
            Block::CodeBlock { text, .. } => {
                let lines = text.lines().count().max(1);
                Ok(lines as f32 * CODE_LINE_H + 2.0 * CODE_PAD_V + self.style().block_gap())
            }
            Block::Table {
                alignments,
                header,
                rows,
            } => {
                let col_w = content_width / alignments.len().max(1) as f32;
                Ok(self.measure_table(ctx, header, rows, col_w)? + self.style().block_gap())
            }
            Block::HorizontalRule => Ok(0.7 + self.style().block_gap()),
            Block::RawHtml(_) => Ok(0.0),
            Block::FootnoteDefinition { .. } => Ok(0.0),
        }
    }

    fn draw_blocks(
        &self,
        ctx: &mut DrawContext<'_, '_>,
        blocks: &[Block],
        content_width: f32,
        x_offset: f32,
        annotations: &mut Vec<krilla::annotation::Annotation>,
    ) -> std::io::Result<()> {
        let mut dummy = Residual::None;
        for i in 0..blocks.len() {
            let _ = self.draw_block(
                ctx,
                blocks,
                i,
                content_width,
                x_offset,
                &mut dummy,
                annotations,
            )?;
        }
        Ok(())
    }

    fn measure_list_item(
        &self,
        ctx: &mut DrawContext<'_, '_>,
        item: &ListItem,
        content_width: f32,
        level: u8,
    ) -> std::io::Result<f32> {
        let mut total = 0.0;
        if item.blocks.is_empty() {
            total += self.style().body_size + 4.0;
        } else {
            for block in &item.blocks {
                total += match block {
                    Block::List { items, .. } => {
                        self.measure_list(ctx, items, content_width, level + 1)?
                    }
                    _ => self.measure_block(ctx, block, content_width - LIST_INDENT)?,
                };
            }
        }
        Ok(total)
    }

    fn measure_list(
        &self,
        ctx: &mut DrawContext<'_, '_>,
        items: &[ListItem],
        content_width: f32,
        level: u8,
    ) -> std::io::Result<f32> {
        let mut total = 0.0;
        for item in items {
            total += self.measure_list_item(ctx, item, content_width, level)?;
        }
        Ok(total)
    }

    fn draw_list(
        &self,
        ctx: &mut DrawContext<'_, '_>,
        items: &[ListItem],
        ordered: bool,
        start: u64,
        content_width: f32,
        x_offset: f32,
        annotations: &mut Vec<krilla::annotation::Annotation>,
    ) -> std::io::Result<()> {
        let _ = self.draw_list_part(
            ctx,
            items,
            ordered,
            start,
            0,
            content_width,
            x_offset,
            annotations,
        )?;
        Ok(())
    }

    fn draw_list_part(
        &self,
        ctx: &mut DrawContext<'_, '_>,
        items: &[ListItem],
        ordered: bool,
        start: u64,
        start_item: usize,
        content_width: f32,
        x_offset: f32,
        annotations: &mut Vec<krilla::annotation::Annotation>,
    ) -> std::io::Result<(bool, usize)> {
        let marker_x = self.style().margin + x_offset;
        let mut number = start + start_item as u64;
        let mut drawn = 0;
        let is_top = *ctx.y_position <= ctx.layout_info.size.top_margin() + 0.1;

        for item in items.iter().skip(start_item) {
            let item_h = self.measure_list_item(ctx, item, content_width, 0)?;
            let item_at_top = is_top && drawn == 0;
            if !item_at_top && *ctx.y_position + item_h > ctx.max_y && drawn > 0 {
                return Ok((true, drawn));
            }
            if !item_at_top && *ctx.y_position + item_h.min(24.0) > ctx.max_y {
                return Ok((true, drawn));
            }

            let marker_y = *ctx.y_position;

            if let Some(checked) = item.checked {
                let side = 8.5;
                let mid_y = marker_y - self.style().body_size * 0.30;
                let y_top = mid_y - side / 2.0;
                let y_bot = mid_y + side / 2.0;
                let x0 = marker_x + 1.0;
                let x1 = x0 + side;
                self.stroke_rect(ctx, x0, y_top, side, side, 110, 0.85)?;
                if checked {
                    ctx.surface.set_stroke(Some(Stroke {
                        paint: Paint::from(luma::Color::new(40)),
                        width: 1.1,
                        ..Stroke::default()
                    }));
                    let mut pb = PathBuilder::new();
                    pb.move_to(x0 + side * 0.18, mid_y + side * 0.05);
                    pb.line_to(x0 + side * 0.42, y_bot - side * 0.16);
                    pb.line_to(x1 - side * 0.12, y_top + side * 0.14);
                    if let Some(path) = pb.finish() {
                        ctx.surface.draw_path(&path);
                    }
                    ctx.surface.set_stroke(None);
                }
            } else {
                let marker = if ordered {
                    let s = format!("{number}.");
                    number += 1;
                    s
                } else {
                    "•".to_string()
                };
                let marker_rs: RichString = marker.into();

                let mut marker_ctx = DrawContext {
                    layout_info: ctx.layout_info,
                    surface: ctx.surface,
                    y_position: &mut marker_y.clone(),
                    max_y: ctx.max_y,
                    is_revised: false,
                    font_system: ctx.font_system,
                    font_cache: ctx.font_cache,
                };
                let mut res = None;
                self.write_rich_block(
                    &mut marker_ctx,
                    &marker_rs,
                    marker_x,
                    LIST_INDENT,
                    self.style().body_size,
                    &mut res,
                    annotations,
                )?;
            }

            if item.blocks.is_empty() {
                *ctx.y_position += self.style().body_size + 4.0;
            } else {
                for block in &item.blocks {
                    if let Block::List {
                        ordered: o,
                        start: s,
                        items: inner,
                    } = block
                    {
                        self.draw_list(
                            ctx,
                            inner,
                            *o,
                            *s,
                            content_width,
                            x_offset + LIST_INDENT,
                            annotations,
                        )?;
                    } else {
                        let single_slice = [block.clone()];
                        let mut dummy = Residual::None;
                        self.draw_block(
                            ctx,
                            &single_slice,
                            0,
                            content_width - LIST_INDENT,
                            x_offset + LIST_INDENT,
                            &mut dummy,
                            annotations,
                        )?;
                    }
                }
            }
            drawn += 1;
        }
        let _ = items.len();
        Ok((false, drawn))
    }

    fn measure_table(
        &self,
        ctx: &mut DrawContext<'_, '_>,
        header: &[RichString],
        rows: &[Vec<RichString>],
        col_w: f32,
    ) -> std::io::Result<f32> {
        let mut total = self.table_row_height(ctx, header, col_w)?;
        for row in rows {
            total += self.table_row_height(ctx, row, col_w)?;
        }
        Ok(total)
    }

    fn table_row_height(
        &self,
        ctx: &mut DrawContext<'_, '_>,
        cells: &[RichString],
        col_w: f32,
    ) -> std::io::Result<f32> {
        let mut max_h = 0.0;
        let text_w = col_w - 2.0 * TABLE_PAD_H;
        for cell in cells {
            let h = self.measure_rich(ctx, cell, text_w, TABLE_SIZE)?;
            if h > max_h {
                max_h = h;
            }
        }
        Ok(max_h + 2.0 * self.style().table_padding)
    }

    fn draw_table(
        &self,
        ctx: &mut DrawContext<'_, '_>,
        alignments: &[Align],
        header: &[RichString],
        rows: &[Vec<RichString>],
        col_w: f32,
        annotations: &mut Vec<krilla::annotation::Annotation>,
    ) -> std::io::Result<()> {
        let mut y0 = *ctx.y_position;
        self.draw_table_row(ctx, alignments, header, col_w, y0, true, annotations)?;
        for row in rows {
            y0 = *ctx.y_position;
            self.draw_table_row(ctx, alignments, row, col_w, y0, false, annotations)?;
        }
        Ok(())
    }

    /// Draws as many table rows as fit. Returns `(header_drawn, rows_drawn)`.
    /// Automatically reprints the header when splitting across pages.
    fn draw_table_part(
        &self,
        ctx: &mut DrawContext<'_, '_>,
        alignments: &[Align],
        header: &[RichString],
        rows: &[Vec<RichString>],
        start_row: usize,
        col_w: f32,
        header_drawn: bool,
        annotations: &mut Vec<krilla::annotation::Annotation>,
    ) -> std::io::Result<(bool, usize)> {
        let mut drawn = 0;
        if !header_drawn {
            self.draw_table_row(
                ctx,
                alignments,
                header,
                col_w,
                *ctx.y_position,
                true,
                annotations,
            )?;
        }
        for row in rows.iter().skip(start_row) {
            let h = self.table_row_height(ctx, row, col_w)?;
            if *ctx.y_position + h > ctx.max_y && (start_row + drawn > 0 || header_drawn) {
                break;
            }
            if *ctx.y_position + h > ctx.max_y && !header_drawn {
                break;
            }
            self.draw_table_row(
                ctx,
                alignments,
                row,
                col_w,
                *ctx.y_position,
                false,
                annotations,
            )?;
            drawn += 1;
        }
        Ok((true, drawn))
    }

    fn draw_table_row(
        &self,
        ctx: &mut DrawContext<'_, '_>,
        alignments: &[Align],
        cells: &[RichString],
        col_w: f32,
        row_y: f32,
        is_header: bool,
        annotations: &mut Vec<krilla::annotation::Annotation>,
    ) -> std::io::Result<()> {
        let num_cols = cells.len();
        let total_w = col_w * num_cols as f32;
        let row_h = self.table_row_height(ctx, cells, col_w)?;
        let start_x = self.style().margin;

        if is_header {
            self.fill_rect(
                ctx,
                start_x,
                row_y,
                total_w,
                row_h,
                self.style().table_header_gray,
            )?;
        }

        let text_w = col_w - 2.0 * TABLE_PAD_H;
        let mut x = start_x;
        for (i, cell) in cells.iter().enumerate() {
            let mut styled_cell = cell.clone();
            if is_header {
                for el in &mut styled_cell.elements {
                    el.set_bold();
                }
            }
            let h = self.measure_rich(ctx, &styled_cell, text_w, TABLE_SIZE)?;
            let text_width = self.text_width(ctx, &styled_cell, text_w, TABLE_SIZE);
            let align = alignments.get(i).copied().unwrap_or(Align::Left);
            let shift = match align {
                Align::Center => ((text_w - text_width).max(0.0) / 2.0).min(text_w),
                Align::Right => (text_w - text_width).max(0.0),
                Align::Left | Align::None => 0.0,
            };
            let mut y = row_y
                + self.style().table_padding
                + (row_h - 2.0 * self.style().table_padding - h).max(0.0) / 2.0;
            let mut inner_ctx = DrawContext {
                layout_info: ctx.layout_info,
                surface: ctx.surface,
                y_position: &mut y,
                max_y: row_y + row_h,
                is_revised: false,
                font_system: ctx.font_system,
                font_cache: ctx.font_cache,
            };
            let mut res = None;
            self.write_rich_block(
                &mut inner_ctx,
                &styled_cell,
                x + TABLE_PAD_H + shift,
                text_w,
                TABLE_SIZE,
                &mut res,
                annotations,
            )?;

            // Right vertical divider
            self.stroke_line(ctx, x + col_w, row_y, x + col_w, row_y + row_h, 215, 0.5)?;
            x += col_w;
        }

        // Left outer border
        self.stroke_line(ctx, start_x, row_y, start_x, row_y + row_h, 215, 0.5)?;

        // Top border if header
        if is_header {
            self.stroke_line(ctx, start_x, row_y, start_x + total_w, row_y, 160, 1.0)?;
        }

        // Bottom border
        let bottom_gray = if is_header { 170 } else { 215 };
        let bottom_width = if is_header { 0.8 } else { 0.5 };
        self.stroke_line(
            ctx,
            start_x,
            row_y + row_h,
            start_x + total_w,
            row_y + row_h,
            bottom_gray,
            bottom_width,
        )?;

        *ctx.y_position = row_y + row_h;
        Ok(())
    }

    fn draw_hr(&self, ctx: &mut DrawContext<'_, '_>, x: f32, width: f32) -> std::io::Result<()> {
        let y = *ctx.y_position;
        if let Some(rect) = Rect::from_xywh(x, y, width, 0.7) {
            let mut pb = PathBuilder::new();
            pb.push_rect(rect);
            pb.close();
            if let Some(path) = pb.finish() {
                ctx.surface.draw_path(&path);
            }
        }
        Ok(())
    }

    /// Draws a code block with a light gray background and border.
    fn draw_code_block(
        &self,
        ctx: &mut DrawContext<'_, '_>,
        text: &str,
        content_width: f32,
        lines: usize,
    ) -> std::io::Result<()> {
        let height = lines as f32 * CODE_LINE_H + 2.0 * CODE_PAD_V;
        let y = *ctx.y_position;
        self.fill_rect(ctx, self.style().margin, y, content_width, height, 246)?;
        self.stroke_rect(
            ctx,
            self.style().margin,
            y,
            content_width,
            height,
            215,
            0.75,
        )?;
        *ctx.y_position = y + CODE_PAD_V + CODE_SIZE * 0.85;
        self.draw_code_lines(ctx, text, content_width, 0)?;
        *ctx.y_position = y + height;
        Ok(())
    }

    /// Draws code lines starting from `start_line`. Returns `(more_remain, lines_drawn)`.
    fn draw_code_lines(
        &self,
        ctx: &mut DrawContext<'_, '_>,
        text: &str,
        content_width: f32,
        start_line: usize,
    ) -> std::io::Result<(bool, usize)> {
        let lines: Vec<&str> = text.lines().collect();
        let mut drawn = 0;
        let text_x = self.style().margin + CODE_PAD_H;
        let text_width = content_width - 2.0 * CODE_PAD_H;
        for line in lines.iter().skip(start_line) {
            if *ctx.y_position + CODE_LINE_H > ctx.max_y && drawn > 0 {
                break;
            }
            let mut rs: RichString = (*line).into();
            for el in &mut rs.elements {
                el.set_mono();
            }
            let shaped = shape_rich_string(
                ctx.font_system,
                &rs,
                text_width,
                CODE_SIZE,
                ctx.layout_info.export_font,
                ctx.layout_info.script_fonts,
            );
            if let Some(shaped_line) = shaped.lines.first() {
                draw_shaped_line(ctx, shaped_line, text_x, *ctx.y_position, CODE_SIZE);
            }
            *ctx.y_position += CODE_LINE_H;
            drawn += 1;
        }
        let more = start_line + drawn < lines.len();
        Ok((more, drawn))
    }

    fn page_printable_height(&self) -> f32 {
        self.paper_size.y - self.paper_size.top_margin() - self.paper_size.bottom_margin()
    }

    fn fill_rect(
        &self,
        ctx: &mut DrawContext<'_, '_>,
        x: f32,
        y: f32,
        w: f32,
        h: f32,
        gray: u8,
    ) -> std::io::Result<()> {
        if let Some(rect) = Rect::from_xywh(x, y, w, h) {
            ctx.surface.set_fill(Some(Fill {
                paint: Paint::from(luma::Color::new(gray)),
                ..Fill::default()
            }));
            let mut pb = PathBuilder::new();
            pb.push_rect(rect);
            pb.close();
            if let Some(path) = pb.finish() {
                ctx.surface.draw_path(&path);
            }
            ctx.surface.set_fill(None);
        }
        Ok(())
    }

    fn stroke_rect(
        &self,
        ctx: &mut DrawContext<'_, '_>,
        x: f32,
        y: f32,
        w: f32,
        h: f32,
        gray: u8,
        width: f32,
    ) -> std::io::Result<()> {
        if let Some(rect) = Rect::from_xywh(x, y, w, h) {
            ctx.surface.set_stroke(Some(Stroke {
                paint: Paint::from(luma::Color::new(gray)),
                width,
                ..Stroke::default()
            }));
            let mut pb = PathBuilder::new();
            pb.push_rect(rect);
            pb.close();
            if let Some(path) = pb.finish() {
                ctx.surface.draw_path(&path);
            }
            ctx.surface.set_stroke(None);
        }
        Ok(())
    }

    fn stroke_line(
        &self,
        ctx: &mut DrawContext<'_, '_>,
        x1: f32,
        y1: f32,
        x2: f32,
        y2: f32,
        gray: u8,
        width: f32,
    ) -> std::io::Result<()> {
        ctx.surface.set_stroke(Some(Stroke {
            paint: Paint::from(luma::Color::new(gray)),
            width,
            ..Stroke::default()
        }));
        let mut pb = PathBuilder::new();
        pb.move_to(x1, y1);
        pb.line_to(x2, y2);
        if let Some(path) = pb.finish() {
            ctx.surface.draw_path(&path);
        }
        ctx.surface.set_stroke(None);
        Ok(())
    }
}

/// Measures the rendered height of a rich string at the given width.
fn measure_rich(
    ctx: &mut DrawContext<'_, '_>,
    rs: &RichString,
    width: f32,
    font_size: f32,
    line_gap: f32,
) -> std::io::Result<f32> {
    let shaped = shape_rich_string(
        ctx.font_system,
        rs,
        width,
        font_size,
        ctx.layout_info.export_font,
        ctx.layout_info.script_fonts,
    );
    let mut total = 0.0;
    for line in &shaped.lines {
        total += line_height_for_line(line, ctx.font_system, font_size) + line_gap;
    }
    Ok(total)
}

fn collect_line_annotations(
    line: &ShapedLine,
    x: f32,
    y: f32,
    font_size: f32,
    annotations: &mut Vec<krilla::annotation::Annotation>,
) {
    for (lx, lw, url) in &line.link_ranges {
        if *lw > 0.0 {
            if let Some(rect) = Rect::from_xywh(x + lx, y - font_size * 0.85, *lw, font_size * 1.1)
            {
                let clean_url = if !url.contains("://") && !url.starts_with("mailto:") {
                    format!("https://{url}")
                } else {
                    url.clone()
                };
                let link_action = krilla::action::LinkAction::new(clean_url);
                let action = krilla::action::Action::Link(link_action);
                let target = krilla::annotation::Target::Action(action);
                let link_annot = krilla::annotation::LinkAnnotation::new(rect, target);
                let annot = krilla::annotation::Annotation::new_link(link_annot, None);
                annotations.push(annot);
            }
        }
    }
}

/// Draws a rich string at a fixed x position, wrapping at the given width.
/// Splits across pages via the residual line index. Returns `true` when more
/// lines remain and the page is full.
fn write_rich_block(
    ctx: &mut DrawContext<'_, '_>,
    rs: &RichString,
    x: f32,
    width: f32,
    font_size: f32,
    residual: &mut Option<usize>,
    annotations: &mut Vec<krilla::annotation::Annotation>,
    line_gap: f32,
) -> std::io::Result<bool> {
    let shaped = shape_rich_string(
        ctx.font_system,
        rs,
        width,
        font_size,
        ctx.layout_info.export_font,
        ctx.layout_info.script_fonts,
    );
    let start = residual.unwrap_or(0);
    if start >= shaped.lines.len() {
        *residual = None;
        return Ok(false);
    }
    let mut drawn = 0;
    for line in shaped.lines.iter().skip(start) {
        let lh = line_height_for_line(line, ctx.font_system, font_size) + line_gap;
        if *ctx.y_position + lh > ctx.max_y && drawn > 0 {
            break;
        }
        let baseline = *ctx.y_position + font_size * 0.85;
        draw_shaped_line(ctx, line, x, baseline, font_size);
        collect_line_annotations(line, x, baseline, font_size, annotations);
        *ctx.y_position += lh;
        drawn += 1;
    }
    if start + drawn >= shaped.lines.len() {
        *residual = None;
        Ok(false)
    } else {
        *residual = Some(start + drawn);
        Ok(true)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn render(text: &str) -> std::io::Result<Vec<u8>> {
        let exporter = ProsePdfExporter::default();
        let mut buf = std::io::Cursor::new(Vec::new());
        exporter.export(text, &mut buf)?;
        Ok(buf.into_inner())
    }

    #[test]
    fn exports_heading_and_paragraph() {
        let bytes = render("# Title\n\nHello world.\n").unwrap();
        assert!(bytes.starts_with(b"%PDF"));
        assert!(bytes.len() > 500);
    }

    #[test]
    fn exports_list_and_table() {
        let bytes = render("- a\n- b\n\n| H |\n| - |\n| c |\n").unwrap();
        assert!(bytes.starts_with(b"%PDF"));
    }

    #[test]
    fn exports_empty_document() {
        let bytes = render("").unwrap();
        assert!(bytes.starts_with(b"%PDF"));
    }

    #[test]
    fn test_checklist_and_blockquote() {
        let md =
            "> Quote here\n\n- [x] Done task\n- [ ] Pending task\n\n```rust\nlet a = 1;\n```\n";
        let bytes = render(md).unwrap();
        assert!(bytes.starts_with(b"%PDF"));
    }

    #[test]
    fn test_md_file_export() {
        if let Ok(md) = std::fs::read_to_string("Test-Files/mdtest/md.md") {
            let bytes = render(&md).unwrap();
            assert!(bytes.starts_with(b"%PDF"));
        }
    }

    #[test]
    fn test_sample_document_export() {
        if let Ok(md) = std::fs::read_to_string("sample_document.md") {
            let bytes = render(&md).unwrap();
            assert!(bytes.starts_with(b"%PDF"));
        }
    }

    #[test]
    fn test_clickable_links_export() {
        let md = "Check out [OpenAI](https://openai.com) and [Google](https://google.com) today.";
        let bytes = render(md).unwrap();
        assert!(bytes.starts_with(b"%PDF"));
        let pdf_str = String::from_utf8_lossy(&bytes);
        assert!(pdf_str.contains("/URI (https://openai.com)") || pdf_str.contains("openai.com"));
    }
}

fn load_prose_image(url: &str) -> std::io::Result<krilla::image::Image> {
    let (prefix, encoded) = url
        .split_once(',')
        .ok_or_else(|| std::io::Error::other("Invalid prose image"))?;
    if !matches!(
        prefix,
        "data:image/png;base64" | "data:image/jpeg;base64" | "data:image/webp;base64"
    ) {
        return Err(std::io::Error::other(
            "Choose a PNG, JPEG or WebP image for PDF export",
        ));
    }
    if encoded.len() > 56 * 1024 * 1024 {
        return Err(std::io::Error::other("Prose image exceeds size limit"));
    }
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(encoded)
        .map_err(std::io::Error::other)?;
    let mut reader = image::ImageReader::new(std::io::Cursor::new(&bytes)).with_guessed_format()?;
    let mut limits = image::Limits::default();
    limits.max_image_width = Some(20000);
    limits.max_image_height = Some(20000);
    limits.max_alloc = Some(160 * 1024 * 1024);
    reader.limits(limits);
    use image::ImageDecoder;
    let mut decoder = reader.into_decoder().map_err(std::io::Error::other)?;
    let orientation = decoder.orientation().map_err(std::io::Error::other)?;
    let mut decoded = image::DynamicImage::from_decoder(decoder).map_err(std::io::Error::other)?;
    decoded.apply_orientation(orientation);
    let mut png = std::io::Cursor::new(Vec::new());
    decoded
        .write_to(&mut png, image::ImageFormat::Png)
        .map_err(std::io::Error::other)?;
    krilla::image::Image::from_png(png.into_inner().into(), false)
        .map_err(|e| std::io::Error::other(format!("Could not load prose image: {:?}", e)))
}
fn prose_image_size(image: &krilla::image::Image, width: f32, height: f32) -> (f32, f32) {
    let (w, h) = image.size();
    let scale = (width / w as f32).min(height / h as f32).min(0.75);
    (w as f32 * scale, h as f32 * scale)
}

#[cfg(test)]
mod imported_image_tests {
    use super::*;
    #[test]
    fn loads_embedded_image_and_preserves_aspect_ratio() {
        let mut bytes = std::io::Cursor::new(Vec::new());
        image::DynamicImage::new_rgba8(80, 40)
            .write_to(&mut bytes, image::ImageFormat::Png)
            .unwrap();
        let url = format!(
            "data:image/png;base64,{}",
            base64::engine::general_purpose::STANDARD.encode(bytes.into_inner())
        );
        let image = load_prose_image(&url).unwrap();
        assert_eq!(prose_image_size(&image, 30.0, 100.0), (30.0, 15.0));
        let mut pdf = Vec::new();
        ProsePdfExporter::default()
            .export(&format!("Before\n\n![Picture]({url})\n\nAfter"), &mut pdf)
            .unwrap();
        assert!(pdf.starts_with(b"%PDF"));
        assert!(pdf.windows(6).any(|bytes| bytes == b"/Image"));
        assert!(load_prose_image("data:image/png;base64,YQ==").is_err());
    }
}

#[cfg(test)]
mod image_layout_tests {
    use super::*;

    #[test]
    fn fitted_images_preserve_proportions_without_upscaling() {
        use image::ImageEncoder;
        for (w, h) in [(1200, 400), (400, 1600), (100, 50)] {
            let mut bytes = Vec::new();
            image::codecs::png::PngEncoder::new(&mut bytes)
                .write_image(
                    &vec![100; (w * h * 3) as usize],
                    w,
                    h,
                    image::ExtendedColorType::Rgb8,
                )
                .unwrap();
            let image = krilla::image::Image::from_png(bytes.into(), false).unwrap();
            for style in ["classic", "manuscript", "treatment", "modern", "literary"] {
                let preset = super::super::styles::prose_style(style);
                for paper in [crate::pdf::A4, crate::pdf::LETTER] {
                    let width = paper.x - 2.0 * preset.margin;
                    let height =
                        paper.y - paper.top_margin() - paper.bottom_margin() - preset.block_gap();
                    let (actual_w, actual_h) = prose_image_size(&image, width, height);
                    assert!(actual_w <= width + 0.01 && actual_h <= height + 0.01);
                    assert!((actual_w / actual_h - w as f32 / h as f32).abs() < 0.001);
                    assert!(actual_w <= w as f32 * 0.75 + 0.01);
                }
            }
        }
    }
}
