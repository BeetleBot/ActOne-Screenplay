//! PDF exporter for Markdown (prose) documents.
//!
//! Renders a [`ProseDoc`] with the same krilla pipeline and watermark
//! machinery as the Fountain exporter.

use std::collections::HashMap;
use std::io::Write;
use std::path::PathBuf;

use cosmic_text::FontSystem;
use krilla::{
    Document,
    color::luma,
    geom::{PathBuilder, Point, Rect},
    image::Image,
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

/// Margin on each side of prose content, in points (1 inch).
const PROSE_MARGIN: f32 = 72.0;
/// Base body font size.
const BODY_SIZE: f32 = 11.0;
/// Extra spacing added after each rendered line.
const LINE_GAP: f32 = 4.0;
/// Spacing after a paragraph.
const PARA_GAP: f32 = 6.0;
/// Spacing after other blocks.
const BLOCK_GAP: f32 = 10.0;
/// Indent per list nesting level.
const LIST_INDENT: f32 = 18.0;
/// Blockquote indent.
const QUOTE_INDENT: f32 = 16.0;
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
/// Table cell vertical padding.
const TABLE_PAD_V: f32 = 4.0;
/// Spacing around images.
const IMAGE_GAP: f32 = 10.0;

/// Residual render state for blocks split across pages.
enum Residual {
    None,
    Paragraph { rs: RichString, line: usize },
    Code { text: String, line: usize },
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
    /// Image bytes keyed by the `src` attribute as written in the Markdown.
    pub images: HashMap<String, Vec<u8>>,
    /// Directory used to resolve relative image paths that are not in `images`.
    pub base_dir: Option<PathBuf>,
    pub image_cache: std::cell::RefCell<HashMap<String, Option<Image>>>,
}

impl Default for ProsePdfExporter {
    fn default() -> Self {
        Self {
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
            images: HashMap::new(),
            base_dir: None,
            image_cache: std::cell::RefCell::new(HashMap::new()),
        }
    }
}

impl ProsePdfExporter {
    pub fn export(&self, markdown_text: &str, writer: &mut dyn Write) -> std::io::Result<()> {
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

        let effective_font = if self.export_font.is_empty() || self.export_font == "Courier Prime" {
            "Times New Roman".to_string()
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

        self.generate_pdf(&mut document, &layout_info, markdown_text, &mut font_system)?;

        let pdf = document.finish().map_err(|e| {
            eprintln!("document.finish() failed with error: {:?}", e);
            std::io::Error::other("failed to create pdf")
        })?;
        writer.write_all(&pdf)
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
    ) -> std::io::Result<()> {
        let doc = parse(markdown_text);

        // Footnotes are rendered at the end of the document.
        let mut blocks: Vec<Block> = Vec::new();
        let mut footnotes: Vec<&Block> = Vec::new();
        for block in &doc.blocks {
            if let Block::FootnoteDefinition { .. } = block {
                footnotes.push(block);
            } else {
                blocks.push(block.clone());
            }
        }
        if !footnotes.is_empty() {
            blocks.push(Block::HorizontalRule);
            for note in footnotes {
                if let Block::FootnoteDefinition { label, blocks: inner } = note {
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

        let top = layout_info.size.top_margin();
        let max_y = layout_info.size.y - layout_info.size.bottom_margin();
        let content_width = layout_info.size.x - 2.0 * PROSE_MARGIN;

        let watermark_settings = self.to_watermark_settings();
        let center_image = load_center_image(&watermark_settings);

        let mut font_cache = HashMap::new();
        let mut page_idx = 0;
        let mut block_idx = 0;
        let mut resid = Residual::None;
        let total = blocks.len();
        let mut first_page = true;

        while first_page || block_idx < total || !matches!(resid, Residual::None) {
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
                        match self.draw_block(&mut ctx, &blocks, block_idx, content_width, 0.0, &mut resid, &mut page_annots)? {
                            DrawOutcome::Done => block_idx += 1,
                            DrawOutcome::PageFull => page_full = true,
                        }
                    }
                    Residual::Paragraph { ref rs, ref mut line } => {
                        let mut res = Some(*line);
                        let more = write_rich_block(
                            &mut ctx,
                            rs,
                            PROSE_MARGIN,
                            content_width,
                            BODY_SIZE,
                            &mut res,
                            &mut page_annots,
                        )?;
                        if more {
                            *line = res.unwrap();
                            page_full = true;
                        } else {
                            *ctx.y_position += PARA_GAP;
                            resid = Residual::None;
                            block_idx += 1;
                        }
                    }
                    Residual::Code { ref text, ref mut line } => {
                        let (more, drawn) = self.draw_code_lines(&mut ctx, text, content_width, *line)?;
                        *line += drawn;
                        if more {
                            page_full = true;
                        } else {
                            *ctx.y_position += BLOCK_GAP;
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
                            *ctx.y_position += BLOCK_GAP;
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
                            *ctx.y_position += BLOCK_GAP;
                            resid = Residual::None;
                            block_idx += 1;
                        }
                    }
                }
            }

            let page_num = (page_idx + 1).to_string();
            let pn_width = measure_text_width(font_system, &page_num, 10.0);
            surface.draw_text(
                Point::from_xy((layout_info.size.x - pn_width) / 2.0, layout_info.size.y - 42.0),
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

        Ok(())
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
        let x = PROSE_MARGIN + x_offset;
        let is_top = *ctx.y_position <= ctx.layout_info.size.top_margin() + 0.1;
        match block {
            Block::Heading { level, content } => {
                let (size, before, after) = heading_metrics(*level);
                let mut rs = content.clone();
                for el in &mut rs.elements {
                    el.set_bold();
                }
                let height = measure_rich(ctx, &rs, content_width, size)?;
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
                let plain = rs.to_plain_string();
                let text_w = measure_text_width(ctx.font_system, &plain, size);
                let heading_x = if *level == 1 && text_w < content_width {
                    x + (content_width - text_w) / 2.0
                } else {
                    x
                };
                let mut res = None;
                write_rich_block(ctx, &rs, heading_x, content_width, size, &mut res, annotations)?;
                *ctx.y_position += after;
                Ok(DrawOutcome::Done)
            }
            Block::Paragraph(rs) => {
                let height = measure_rich(ctx, rs, content_width, BODY_SIZE)?;
                if *ctx.y_position + height <= ctx.max_y {
                    let mut res = None;
                    write_rich_block(ctx, rs, x, content_width, BODY_SIZE, &mut res, annotations)?;
                    *ctx.y_position += PARA_GAP;
                    Ok(DrawOutcome::Done)
                } else if !is_top && height <= self.page_printable_height() {
                    Ok(DrawOutcome::PageFull)
                } else {
                    let mut res = None;
                    let more = write_rich_block(ctx, rs, x, content_width, BODY_SIZE, &mut res, annotations)?;
                    if more && let Some(line) = res {
                        *residual = Residual::Paragraph {
                            rs: rs.clone(),
                            line,
                        };
                        Ok(DrawOutcome::PageFull)
                    } else {
                        *ctx.y_position += PARA_GAP;
                        Ok(DrawOutcome::Done)
                    }
                }
            }
            Block::List { ordered, start, items } => {
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
                    *ctx.y_position += BLOCK_GAP;
                    Ok(DrawOutcome::Done)
                }
            }
            Block::Blockquote(inner) => {
                let first_h = if let Some(first_b) = inner.first() {
                    self.measure_block(ctx, first_b, content_width - QUOTE_INDENT)?
                } else {
                    20.0
                };
                if !is_top && *ctx.y_position + first_h.min(30.0) > ctx.max_y {
                    return Ok(DrawOutcome::PageFull);
                }
                let y0 = *ctx.y_position;
                self.draw_blocks(ctx, inner, content_width - QUOTE_INDENT, x_offset + QUOTE_INDENT, annotations)?;
                let y1 = *ctx.y_position;
                let bar_top = y0 - 7.0;
                let bar_bottom = (y1 - 4.0).max(bar_top + 12.0);
                self.fill_rect(ctx, PROSE_MARGIN + x_offset + 2.0, bar_top, 1.5, bar_bottom - bar_top, 190)?;
                *ctx.y_position += BLOCK_GAP;
                Ok(DrawOutcome::Done)
            }
            Block::CodeBlock { text, .. } => {
                let lines = text.lines().count().max(1);
                let height = lines as f32 * CODE_LINE_H + 2.0 * CODE_PAD_V;
                if *ctx.y_position + height <= ctx.max_y {
                    self.draw_code_block(ctx, text, content_width, lines)?;
                    *ctx.y_position += BLOCK_GAP;
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
                        *ctx.y_position += BLOCK_GAP;
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
                    *ctx.y_position += BLOCK_GAP;
                    Ok(DrawOutcome::Done)
                } else if !is_top && height <= self.page_printable_height() {
                    Ok(DrawOutcome::PageFull)
                } else {
                    let (header_drawn, drawn_rows) =
                        self.draw_table_part(ctx, alignments, header, rows, 0, col_w, false, annotations)?;
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
                        *ctx.y_position += BLOCK_GAP;
                        Ok(DrawOutcome::Done)
                    }
                }
            }
            Block::HorizontalRule => {
                if !is_top && *ctx.y_position + 16.0 > ctx.max_y {
                    return Ok(DrawOutcome::PageFull);
                }
                self.draw_hr(ctx, x, content_width)?;
                *ctx.y_position += 16.0;
                Ok(DrawOutcome::Done)
            }
            Block::Image { src, alt } => {
                let img = self.load_image(src);
                let height = if let Some(img) = &img {
                    self.image_height(img, content_width)
                } else {
                    160.0
                } + IMAGE_GAP;
                if !is_top && *ctx.y_position + height > ctx.max_y {
                    return Ok(DrawOutcome::PageFull);
                }
                self.draw_image(ctx, img.as_ref(), alt, x, content_width)?;
                *ctx.y_position += IMAGE_GAP;
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
                let (size, before, after) = heading_metrics(*level);
                let mut rs = content.clone();
                for el in &mut rs.elements {
                    el.set_bold();
                }
                Ok(measure_rich(ctx, &rs, content_width, size)? + before + after)
            }
            Block::Paragraph(rs) => Ok(measure_rich(ctx, rs, content_width, BODY_SIZE)? + PARA_GAP),
            Block::List { items, .. } => {
                Ok(self.measure_list(ctx, items, content_width, 0)? + BLOCK_GAP)
            }
            Block::Blockquote(inner) => {
                Ok(self.measure_blocks(ctx, inner, content_width - QUOTE_INDENT)? + 4.0)
            }
            Block::CodeBlock { text, .. } => {
                let lines = text.lines().count().max(1);
                Ok(lines as f32 * CODE_LINE_H + 2.0 * CODE_PAD_V + BLOCK_GAP)
            }
            Block::Table {
                alignments, header, rows,
            } => {
                let col_w = content_width / alignments.len().max(1) as f32;
                Ok(self.measure_table(ctx, header, rows, col_w)? + BLOCK_GAP)
            }
            Block::HorizontalRule => Ok(16.0),
            Block::Image { src, alt } => {
                let img = self.load_image(src);
                let h = if let Some(img) = &img {
                    self.image_height(img, content_width)
                } else {
                    160.0
                };
                let _ = alt;
                Ok(h + IMAGE_GAP)
            }
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
            let _ = self.draw_block(ctx, blocks, i, content_width, x_offset, &mut dummy, annotations)?;
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
            total += BODY_SIZE + 4.0;
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
        let _ = self.draw_list_part(ctx, items, ordered, start, 0, content_width, x_offset, annotations)?;
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
        let marker_x = PROSE_MARGIN + x_offset;
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
                let mid_y = marker_y - BODY_SIZE * 0.30;
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
                write_rich_block(&mut marker_ctx, &marker_rs, marker_x, LIST_INDENT, BODY_SIZE, &mut res, annotations)?;
            }

            if item.blocks.is_empty() {
                *ctx.y_position += BODY_SIZE + 4.0;
            } else {
                for block in &item.blocks {
                    if let Block::List {
                        ordered: o,
                        start: s,
                        items: inner,
                    } = block
                    {
                        self.draw_list(ctx, inner, *o, *s, content_width, x_offset + LIST_INDENT, annotations)?;
                    } else {
                        let single_slice = [block.clone()];
                        let mut dummy = Residual::None;
                        self.draw_block(ctx, &single_slice, 0, content_width - LIST_INDENT, x_offset + LIST_INDENT, &mut dummy, annotations)?;
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
            let h = measure_rich(ctx, cell, text_w, TABLE_SIZE)?;
            if h > max_h {
                max_h = h;
            }
        }
        Ok(max_h + 2.0 * TABLE_PAD_V)
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
            self.draw_table_row(ctx, alignments, header, col_w, *ctx.y_position, true, annotations)?;
        }
        for row in rows.iter().skip(start_row) {
            let h = self.table_row_height(ctx, row, col_w)?;
            if *ctx.y_position + h > ctx.max_y && (start_row + drawn > 0 || header_drawn) {
                break;
            }
            if *ctx.y_position + h > ctx.max_y && !header_drawn {
                break;
            }
            self.draw_table_row(ctx, alignments, row, col_w, *ctx.y_position, false, annotations)?;
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
        let start_x = PROSE_MARGIN;

        if is_header {
            self.fill_rect(ctx, start_x, row_y, total_w, row_h, 245)?;
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
            let h = measure_rich(ctx, &styled_cell, text_w, TABLE_SIZE)?;
            let plain = styled_cell.to_plain_string();
            let text_width = measure_text_width(ctx.font_system, &plain, TABLE_SIZE);
            let align = alignments.get(i).copied().unwrap_or(Align::Left);
            let shift = match align {
                Align::Center => ((text_w - text_width).max(0.0) / 2.0).min(text_w),
                Align::Right => (text_w - text_width).max(0.0),
                Align::Left | Align::None => 0.0,
            };
            let mut y = row_y + TABLE_PAD_V + TABLE_SIZE * 0.85 + (row_h - 2.0 * TABLE_PAD_V - h).max(0.0) / 2.0;
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
            write_rich_block(&mut inner_ctx, &styled_cell, x + TABLE_PAD_H + shift, text_w, TABLE_SIZE, &mut res, annotations)?;

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
        self.stroke_line(ctx, start_x, row_y + row_h, start_x + total_w, row_y + row_h, bottom_gray, bottom_width)?;

        *ctx.y_position = row_y + row_h;
        Ok(())
    }

    fn draw_hr(&self, ctx: &mut DrawContext<'_, '_>, x: f32, width: f32) -> std::io::Result<()> {
        let y = *ctx.y_position + 8.0;
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
        self.fill_rect(ctx, PROSE_MARGIN, y, content_width, height, 246)?;
        self.stroke_rect(ctx, PROSE_MARGIN, y, content_width, height, 215, 0.75)?;
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
        let text_x = PROSE_MARGIN + CODE_PAD_H;
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

    fn image_dimensions(&self, img: &Image, content_width: f32) -> (f32, f32) {
        let (w, h) = img.size();
        let max_prose_img_w = (content_width * 0.70).min(320.0);
        let max_prose_img_h = (self.page_printable_height() * 0.35).min(220.0);
        let scale = (max_prose_img_w / w as f32)
            .min(max_prose_img_h / h as f32)
            .min(1.0);
        (w as f32 * scale, h as f32 * scale)
    }

    fn image_height(&self, img: &Image, content_width: f32) -> f32 {
        self.image_dimensions(img, content_width).1
    }

    fn page_printable_height(&self) -> f32 {
        self.paper_size.y - self.paper_size.top_margin() - self.paper_size.bottom_margin()
    }

    fn draw_image(
        &self,
        ctx: &mut DrawContext<'_, '_>,
        img: Option<&Image>,
        alt: &str,
        _x: f32,
        content_width: f32,
    ) -> std::io::Result<()> {
        let y = *ctx.y_position;
        if let Some(img) = img {
            let (dw, dh) = self.image_dimensions(img, content_width);
            let img_x = PROSE_MARGIN + (content_width - dw).max(0.0) / 2.0;
            if let Some(size) = krilla::geom::Size::from_wh(dw, dh) {
                ctx.surface
                    .push_transform(&krilla::geom::Transform::from_translate(img_x, y));
                ctx.surface.draw_image(img.clone(), size);
                ctx.surface.pop();
            }
            *ctx.y_position = y + dh;
        } else {
            let (dw, dh) = (content_width.min(320.0), 100.0);
            let img_x = PROSE_MARGIN + (content_width - dw).max(0.0) / 2.0;
            self.fill_rect(ctx, img_x, y, dw, dh, 238)?;
            self.stroke_rect(ctx, img_x, y, dw, dh, 210, 0.75)?;
            let label = if alt.is_empty() { "image" } else { alt };
            let rs: RichString = format!("[{label}]").into();
            let label_h = measure_rich(ctx, &rs, dw - 24.0, BODY_SIZE)?;
            let mut y2 = y + (dh - label_h) / 2.0;
            let mut inner_ctx = DrawContext {
                layout_info: ctx.layout_info,
                surface: ctx.surface,
                y_position: &mut y2,
                max_y: y + dh,
                is_revised: false,
                font_system: ctx.font_system,
                font_cache: ctx.font_cache,
            };
            let mut res = None;
            let mut dummy_annots = Vec::new();
            write_rich_block(
                &mut inner_ctx,
                &rs,
                img_x + 12.0,
                dw - 24.0,
                BODY_SIZE,
                &mut res,
                &mut dummy_annots,
            )?;
            *ctx.y_position = y + dh;
        }
        Ok(())
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

    fn load_image(&self, src: &str) -> Option<Image> {
        if let Some(cached) = self.image_cache.borrow().get(src) {
            return cached.clone();
        }
        let img = self.get_image_bytes(src).and_then(|b| decode_image(&b));
        self.image_cache.borrow_mut().insert(src.to_string(), img.clone());
        img
    }

    fn get_image_bytes(&self, src: &str) -> Option<Vec<u8>> {
        let raw_src = src.trim().trim_matches(|c| c == '<' || c == '>' || c == '"' || c == '\'');
        if raw_src.starts_with("data:") {
            if let Some(comma_idx) = raw_src.find(',') {
                let base64_str = &raw_src[comma_idx + 1..];
                use base64::Engine;
                return base64::engine::general_purpose::STANDARD
                    .decode(base64_str.trim())
                    .ok();
            }
        }

        let clean_query = raw_src.split('?').next().unwrap_or(raw_src);
        let clean_hash = clean_query.split('#').next().unwrap_or(clean_query);

        let decoded_src = percent_decode_str(clean_hash);
        let clean_src = strip_prefixes(clean_hash);
        let clean_decoded = strip_prefixes(&decoded_src);
        let filename_src = std::path::Path::new(clean_src)
            .file_name()
            .and_then(|f| f.to_str())
            .unwrap_or(clean_src);
        let filename_decoded = std::path::Path::new(clean_decoded)
            .file_name()
            .and_then(|f| f.to_str())
            .unwrap_or(clean_decoded);

        let filename_src_lower = filename_src.to_lowercase();
        let filename_decoded_lower = filename_decoded.to_lowercase();
        let clean_src_lower = clean_src.to_lowercase();
        let clean_decoded_lower = clean_decoded.to_lowercase();

        let candidates = [
            clean_hash.to_string(),
            decoded_src.clone(),
            clean_src.to_string(),
            clean_decoded.to_string(),
            filename_src.to_string(),
            filename_decoded.to_string(),
            format!("files/assets/{clean_src}"),
            format!("files/assets/{clean_decoded}"),
            format!("files/assets/{filename_src}"),
            format!("files/assets/{filename_decoded}"),
            format!("assets/{clean_src}"),
            format!("assets/{clean_decoded}"),
            format!("assets/{filename_src}"),
            format!("assets/{filename_decoded}"),
        ];

        for (k, v) in &self.images {
            let k_clean = strip_prefixes(k);
            let k_file = std::path::Path::new(k_clean)
                .file_name()
                .and_then(|f| f.to_str())
                .unwrap_or(k_clean);
            let k_lower = k.to_lowercase();
            let k_clean_lower = k_clean.to_lowercase();
            let k_file_lower = k_file.to_lowercase();

            if k == clean_hash
                || k == &decoded_src
                || k_clean == clean_src
                || k_clean == clean_decoded
                || k_file == filename_src
                || k_file == filename_decoded
                || k_lower == clean_src_lower
                || k_clean_lower == clean_src_lower
                || k_clean_lower == clean_decoded_lower
                || k_file_lower == filename_src_lower
                || k_file_lower == filename_decoded_lower
                || k_clean_lower.ends_with(&filename_src_lower)
                || filename_src_lower.ends_with(&k_file_lower)
            {
                return Some(v.clone());
            }
        }

        for cand in &candidates {
            if let Some(bytes) = self.images.get(cand) {
                return Some(bytes.clone());
            }
        }

        if self.images.len() == 1 {
            return self.images.values().next().cloned();
        }

        // Direct absolute path check
        for p_str in &[clean_src, clean_decoded, clean_hash, &decoded_src] {
            let p = std::path::Path::new(p_str);
            if p.is_absolute() && p.exists() {
                if let Ok(bytes) = std::fs::read(p) {
                    return Some(bytes);
                }
            }
        }

        if let Some(base) = &self.base_dir {
            let mut dirs = vec![base.clone()];
            if let Some(p) = base.parent() {
                dirs.push(p.to_path_buf());
                if let Some(gp) = p.parent() {
                    dirs.push(gp.to_path_buf());
                }
            }
            for d in dirs {
                for cand in &candidates {
                    let p = d.join(cand);
                    if p.exists() {
                        if let Ok(bytes) = std::fs::read(&p) {
                            return Some(bytes);
                        }
                    }
                }
            }
        }

        if let Ok(cwd) = std::env::current_dir() {
            for cand in &candidates {
                let p = cwd.join(cand);
                if p.exists() {
                    if let Ok(bytes) = std::fs::read(&p) {
                        return Some(bytes);
                    }
                }
            }
        }

        None
    }
}

fn strip_prefixes(mut s: &str) -> &str {
    loop {
        let prev = s;
        s = s
            .trim_start_matches("asset://localhost/")
            .trim_start_matches("asset://")
            .trim_start_matches("https://asset.localhost/")
            .trim_start_matches("http://asset.localhost/")
            .trim_start_matches("files/assets/")
            .trim_start_matches("assets/")
            .trim_start_matches('/')
            .trim_start_matches("./");
        if s == prev {
            break;
        }
    }
    s
}

fn percent_decode_str(s: &str) -> String {
    let mut result = Vec::new();
    let bytes = s.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let Ok(hex) = u8::from_str_radix(&s[i + 1..i + 3], 16) {
                result.push(hex);
                i += 3;
                continue;
            }
        }
        result.push(bytes[i]);
        i += 1;
    }
    String::from_utf8(result).unwrap_or_else(|_| s.to_string())
}

fn decode_image(bytes: &[u8]) -> Option<Image> {
    if bytes.starts_with(b"\x89PNG") {
        if let Ok(img) = Image::from_png(bytes.to_vec().into(), false) {
            return Some(img);
        }
    }
    if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
        if let Ok(img) = Image::from_jpeg(bytes.to_vec().into(), false) {
            return Some(img);
        }
    }
    if bytes.starts_with(b"GIF8") {
        if let Ok(img) = Image::from_gif(bytes.to_vec().into(), false) {
            return Some(img);
        }
    }
    if let Ok(mut dyn_img) = image::load_from_memory(bytes) {
        if dyn_img.width() > 1600 || dyn_img.height() > 1600 {
            dyn_img = dyn_img.resize(1600, 1600, image::imageops::FilterType::Triangle);
        }
        let rgba = dyn_img.to_rgba8();
        let mut png_buf = Vec::new();
        use image::ImageEncoder;
        let encoder = image::codecs::png::PngEncoder::new_with_quality(
            &mut png_buf,
            image::codecs::png::CompressionType::Fast,
            image::codecs::png::FilterType::NoFilter,
        );
        if encoder
            .write_image(
                rgba.as_raw(),
                rgba.width(),
                rgba.height(),
                image::ExtendedColorType::Rgba8,
            )
            .is_ok()
        {
            if let Ok(img) = Image::from_png(png_buf.into(), false) {
                return Some(img);
            }
        }
    }
    None
}

fn heading_metrics(level: u8) -> (f32, f32, f32) {
    match level {
        1 => (18.0, 16.0, 8.0),
        2 => (14.0, 14.0, 6.0),
        3 => (12.0, 12.0, 4.0),
        4 => (11.0, 10.0, 3.0),
        5 => (10.0, 8.0, 2.0),
        _ => (9.5, 6.0, 2.0),
    }
}

/// Measures the rendered height of a rich string at the given width.
fn measure_rich(
    ctx: &mut DrawContext<'_, '_>,
    rs: &RichString,
    width: f32,
    font_size: f32,
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
        total += line_height_for_line(line, ctx.font_system, font_size) + LINE_GAP;
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
            if let Some(rect) = Rect::from_xywh(x + lx, y - font_size * 0.85, *lw, font_size * 1.1) {
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
        let lh = line_height_for_line(line, ctx.font_system, font_size) + LINE_GAP;
        if *ctx.y_position + lh > ctx.max_y && drawn > 0 {
            break;
        }
        draw_shaped_line(ctx, line, x, *ctx.y_position, font_size);
        collect_line_annotations(line, x, *ctx.y_position, font_size, annotations);
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
    fn test_strip_prefixes() {
        assert_eq!(strip_prefixes("asset://files/assets/pic.png"), "pic.png");
        assert_eq!(strip_prefixes("https://asset.localhost/files/assets/pic.png"), "pic.png");
        assert_eq!(strip_prefixes("./files/assets/pic.png"), "pic.png");
        assert_eq!(strip_prefixes("files/assets/pic.png"), "pic.png");
        assert_eq!(strip_prefixes("assets/pic.png"), "pic.png");
        assert_eq!(strip_prefixes("pic.png"), "pic.png");
    }

    #[test]
    fn exports_with_asset_image() {
        use image::ImageEncoder;
        let mut exporter = ProsePdfExporter::default();
        let img_buf = image::RgbaImage::new(2, 2);
        let mut png_bytes = Vec::new();
        image::codecs::png::PngEncoder::new(&mut png_bytes)
            .write_image(&img_buf, 2, 2, image::ExtendedColorType::Rgba8)
            .unwrap();
        exporter.images.insert("pic.png".to_string(), png_bytes);
        let mut buf = std::io::Cursor::new(Vec::new());
        exporter.export("![My Image](asset://files/assets/pic.png)", &mut buf).unwrap();
        let bytes = buf.into_inner();
        assert!(bytes.starts_with(b"%PDF"));
    }

    #[test]
    fn test_checklist_and_blockquote() {
        let md = "> Quote here\n\n- [x] Done task\n- [ ] Pending task\n\n```rust\nlet a = 1;\n```\n";
        let bytes = render(md).unwrap();
        assert!(bytes.starts_with(b"%PDF"));
    }

    #[test]
    fn test_md_file_export() {
        let md = std::fs::read_to_string("/home/nkr/Projects/Iyal-Inc Family/ActOne-Screenplay/Test-Files/mdtest/md.md").unwrap();
        let bytes = render(&md).unwrap();
        assert!(bytes.starts_with(b"%PDF"));
    }

    #[test]
    fn test_sample_document_export() {
        let md = std::fs::read_to_string("/home/nkr/Projects/Iyal-Inc Family/ActOne-Screenplay/sample_document.md").unwrap();
        let bytes = render(&md).unwrap();
        assert!(bytes.starts_with(b"%PDF"));
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
