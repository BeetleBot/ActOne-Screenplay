use std::io::Write;
use std::collections::HashMap;

use cosmic_text::FontSystem;
use image::ImageEncoder;
use krilla::{
    Document,
    destination::XyzDestination,
    geom::Point,
    image::Image,
    outline::{Outline, OutlineNode},
    page::PageSettings,
    text::Font,
};

use crate::pdf::{
    Exporter, Screenplay, MirrorOption, ElementFormat, ElementFormats,
    rich_string::RichString,
    screenplay::{Element, Span},
};

use super::layout::{PaperSize, CourierFonts, NotoFonts, AllFonts, LayoutInfo, Margin, get_margins, LINE_HEIGHT};
use super::elements::{Alignment, DrawContext, write_dialogue, write_element, measure_element_height};
use super::title_page::write_titlepage;

const FONTS: [&[u8]; 8] = [
    include_bytes!("fonts/CourierPrime-Regular.ttf"),
    include_bytes!("fonts/CourierPrime-Bold.ttf"),
    include_bytes!("fonts/CourierPrime-Italic.ttf"),
    include_bytes!("fonts/CourierPrime-BoldItalic.ttf"),
    include_bytes!("fonts/CourierPrimeSans-Regular.ttf"),
    include_bytes!("fonts/CourierPrimeSans-Bold.ttf"),
    include_bytes!("fonts/CourierPrimeSans-Italic.ttf"),
    include_bytes!("fonts/CourierPrimeSans-BoldItalic.ttf"),
];

const NOTO_FONTS: [&[u8]; 16] = [
    include_bytes!("fonts/MuktaMalar-Regular.ttf"),
    include_bytes!("fonts/MuktaMalar-Bold.ttf"),
    include_bytes!("fonts/Mukta-Regular.ttf"),
    include_bytes!("fonts/Mukta-Bold.ttf"),
    include_bytes!("fonts/NotoSansTelugu-Regular.ttf"),
    include_bytes!("fonts/NotoSansTelugu-Bold.ttf"),
    include_bytes!("fonts/NotoSansMalayalam-Regular.ttf"),
    include_bytes!("fonts/NotoSansMalayalam-Bold.ttf"),
    include_bytes!("fonts/NotoSansKannada-Regular.ttf"),
    include_bytes!("fonts/NotoSansKannada-Bold.ttf"),
    include_bytes!("fonts/NotoSansBengali-Regular.ttf"),
    include_bytes!("fonts/NotoSansBengali-Bold.ttf"),
    include_bytes!("fonts/MuktaVaani-Regular.ttf"),
    include_bytes!("fonts/MuktaVaani-Bold.ttf"),
    include_bytes!("fonts/MuktaMahee-Regular.ttf"),
    include_bytes!("fonts/MuktaMahee-Bold.ttf"),
];

pub struct PdfExporter {
    pub synopses: bool,
    pub sections: bool,
    pub paper_size: PaperSize,
    pub element_formats: ElementFormats,
    pub mirror_scene_numbers: MirrorOption,
    pub export_font: String,
    pub revised_lines: Vec<bool>,
    pub title_page: bool,
    pub scene_colors: bool,
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
}

impl Default for PdfExporter {
    fn default() -> Self {
        Self {
            synopses: false,
            sections: false,
            paper_size: PaperSize::default(),
            element_formats: ElementFormats::default(),
            mirror_scene_numbers: MirrorOption::default(),
            export_font: String::new(),
            revised_lines: Vec::new(),
            title_page: true,
            scene_colors: false,
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
        }
    }
}

fn build_font_system() -> FontSystem {
    let mut db = cosmic_text::fontdb::Database::new();
    for data in FONTS {
        db.load_font_data(data.to_vec());
    }
    for data in NOTO_FONTS {
        db.load_font_data(data.to_vec());
    }
    FontSystem::new_with_locale_and_db("en-US".to_string(), db)
}

fn load_courier_fonts() -> std::io::Result<CourierFonts> {
    Ok(CourierFonts {
        regular: Font::new(FONTS[0].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load regular font"))?,
        bold: Font::new(FONTS[1].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load bold font"))?,
        italic: Font::new(FONTS[2].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load italic font"))?,
        bold_italic: Font::new(FONTS[3].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load bold-italic font"))?,
        sans_regular: Font::new(FONTS[4].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load sans regular font"))?,
        sans_bold: Font::new(FONTS[5].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load sans bold font"))?,
        sans_italic: Font::new(FONTS[6].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load sans italic font"))?,
        sans_bold_italic: Font::new(FONTS[7].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load sans bold-italic font"))?,
    })
}

fn load_noto_fonts() -> std::io::Result<NotoFonts> {
    Ok(NotoFonts {
        tamil_regular: Font::new(NOTO_FONTS[0].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load tamil regular font"))?,
        tamil_bold: Font::new(NOTO_FONTS[1].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load tamil bold font"))?,
        devanagari_regular: Font::new(NOTO_FONTS[2].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load devanagari regular font"))?,
        devanagari_bold: Font::new(NOTO_FONTS[3].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load devanagari bold font"))?,
        telugu_regular: Font::new(NOTO_FONTS[4].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load telugu regular font"))?,
        telugu_bold: Font::new(NOTO_FONTS[5].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load telugu bold font"))?,
        malayalam_regular: Font::new(NOTO_FONTS[6].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load malayalam regular font"))?,
        malayalam_bold: Font::new(NOTO_FONTS[7].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load malayalam bold font"))?,
        kannada_regular: Font::new(NOTO_FONTS[8].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load kannada regular font"))?,
        kannada_bold: Font::new(NOTO_FONTS[9].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load kannada bold font"))?,
        bengali_regular: Font::new(NOTO_FONTS[10].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load bengali regular font"))?,
        bengali_bold: Font::new(NOTO_FONTS[11].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load bengali bold font"))?,
        gujarati_regular: Font::new(NOTO_FONTS[12].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load gujarati regular font"))?,
        gujarati_bold: Font::new(NOTO_FONTS[13].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load gujarati bold font"))?,
        gurmukhi_regular: Font::new(NOTO_FONTS[14].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load gurmukhi regular font"))?,
        gurmukhi_bold: Font::new(NOTO_FONTS[15].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load gurmukhi bold font"))?,
    })
}

impl Exporter for PdfExporter {
    fn file_extension(&self) -> &'static str {
        "pdf"
    }

    fn export(&self, screenplay: &Screenplay, writer: &mut dyn Write) -> std::io::Result<()> {
        let mut document = Document::new();
        let mut font_system = build_font_system();
        let courier = load_courier_fonts()?;
        let noto = load_noto_fonts()?;

        let all_fonts = AllFonts { courier, noto };

        let layout_info = LayoutInfo {
            size: &self.paper_size,
            fonts: &all_fonts,
            export_font: &self.export_font,
            revised_lines: &self.revised_lines,
            margins: get_margins(&self.paper_size),
        };

        self.generate_pdf(&mut document, &layout_info, screenplay, &mut font_system).map(|_| ())?;

        let pdf = document
            .finish()
            .map_err(|_| std::io::Error::other("failed to create pdf"))?;
        writer.write_all(&pdf)
    }
}

fn parse_hex_color(s: &str) -> Option<(u8, u8, u8)> {
    let s = s.trim();
    if !s.starts_with('#') {
        return None;
    }
    let hex = &s[1..];
    if hex.len() == 3 {
        let r = u8::from_str_radix(&hex[0..1], 16).ok()? * 17;
        let g = u8::from_str_radix(&hex[1..2], 16).ok()? * 17;
        let b = u8::from_str_radix(&hex[2..3], 16).ok()? * 17;
        Some((r, g, b))
    } else if hex.len() == 6 {
        let r = u8::from_str_radix(&hex[0..2], 16).ok()?;
        let g = u8::from_str_radix(&hex[2..4], 16).ok()?;
        let b = u8::from_str_radix(&hex[4..6], 16).ok()?;
        Some((r, g, b))
    } else {
        None
    }
}

fn color_name_to_rgb(name: &str) -> Option<(u8, u8, u8)> {
    match name.trim().to_lowercase().as_str() {
        "red" => Some((255, 0, 0)),
        "blue" => Some((0, 0, 255)),
        "green" => Some((0, 128, 0)),
        "pink" => Some((255, 192, 203)),
        "magenta" => Some((255, 0, 255)),
        "gray" => Some((128, 128, 128)),
        "purple" => Some((128, 0, 128)),
        "cyan" => Some((0, 255, 255)),
        "teal" => Some((0, 128, 128)),
        "yellow" => Some((255, 255, 0)),
        "orange" => Some((255, 165, 0)),
        "brown" => Some((165, 42, 42)),
        hex if hex.starts_with('#') => parse_hex_color(hex),
        _ => None,
    }
}

impl PdfExporter {
    fn apply_format(&self, rs: &mut RichString, format: &ElementFormat) {
        for element in &mut rs.elements {
            if format.bold { element.set_bold(); }
            if format.italic { element.set_italic(); }
            if format.underline { element.set_underline(); }
        }
    }

    fn is_element_skipped(&self, element: &Element) -> bool {
        matches!(
            (element, self.synopses, self.sections),
            (Element::Synopsis(_), false, _) | (Element::Section { .. }, _, false)
        )
    }

    fn generate_pdf(
        &self,
        document: &mut Document,
        layout_info: &LayoutInfo,
        screenplay: &Screenplay,
        font_system: &mut FontSystem,
    ) -> std::io::Result<Vec<usize>> {
        let mut element_iter = screenplay.elements.iter().peekable();
        let mut page_idx = 0;

        let top = layout_info.size.top_margin();
        let max_y = layout_info.size.y - layout_info.size.bottom_margin();

        let mut residual_dialogue_idx = None;
        let mut residual_dual_dialogue_idx = (None, None);
        let mut residual_element_idx = None;

        let mut outline = Outline::new();
        let mut font_cache = HashMap::new();

        let mut page_breaks = Vec::new();

        let has_title_page = self.title_page && screenplay.titlepage.is_some();
        if let (true, Some(t)) = (has_title_page, &screenplay.titlepage) {
            page_idx += 1;
            write_titlepage(t, layout_info, document, font_system, &mut font_cache)?;
        }

        if has_title_page
            && let Some(Span { start_line, .. }) = element_iter.peek() {
                page_breaks.push(*start_line);
            }

        let mut content_page_idx = 0;

        let center_image = if self.watermark_center_enabled
            && self.watermark_center_type == "image"
            && !self.watermark_center_image_path.is_empty()
        {
            if self.watermark_center_grayscale {
                (|| -> Option<Image> {
                    let bytes = std::fs::read(&self.watermark_center_image_path).ok()?;
                    let img = image::load_from_memory(&bytes).ok()?.grayscale();
                    let mut png_buf = Vec::new();
                    let encoder = image::codecs::png::PngEncoder::new(&mut png_buf);
                    encoder.write_image(img.as_bytes(), img.width(), img.height(), img.color().into()).ok()?;
                    Image::from_png(png_buf.into(), false).ok()
                })()
            } else {
                std::fs::read(&self.watermark_center_image_path).ok().and_then(|bytes| {
                    let is_png = self.watermark_center_image_path.to_lowercase().ends_with(".png");
                    if is_png {
                        Image::from_png(bytes.into(), false).ok()
                    } else {
                        Image::from_jpeg(bytes.into(), false).ok()
                    }
                })
            }
        } else {
            None
        };

        while element_iter.peek().is_some() {
            let mut page = document.start_page_with(
                PageSettings::from_wh(layout_info.size.x, layout_info.size.y)
                    .ok_or_else(|| std::io::Error::other("invalid page dimensions"))?,
            );
            let mut surface = page.surface();
            let mut y_pos = top;

            if content_page_idx > 0
                && let Some(Span { start_line, .. }) = element_iter.peek() {
                    let mut break_line = *start_line;
                    if let Some(res_idx) = residual_element_idx {
                        break_line = start_line + res_idx;
                    } else if let Some((el_idx, res_idx)) = residual_dialogue_idx {
                        break_line = start_line + 1 + el_idx + res_idx;
                    } else if let Some((el_idx, res_idx)) = residual_dual_dialogue_idx.0 {
                        break_line = start_line + 1 + el_idx + res_idx;
                    } else if let Some((el_idx, res_idx)) = residual_dual_dialogue_idx.1 {
                        break_line = start_line + 1 + el_idx + res_idx;
                    }
                    page_breaks.push(break_line);
                }
            content_page_idx += 1;

            if (has_title_page && page_idx > 1) || (!has_title_page && page_idx > 0) {
                let page_num_text: RichString = format!(
                    "{}.",
                    if has_title_page {
                        page_idx
                    } else {
                        page_idx + 1
                    }
                )
                .into();
                let mut pn_y = top - LINE_HEIGHT;
                let mut pn_ctx = DrawContext {
                    layout_info,
                    surface: &mut surface,
                    y_position: &mut pn_y,
                    max_y: top,
                    is_revised: false,
                    font_system,
                    font_cache: &mut font_cache,
                };
                let mut temp_res = None;
                write_element(
                    &mut pn_ctx,
                    &page_num_text,
                    &layout_info.margins.page_number,
                    Alignment::RightToLeft,
                    false,
                    &mut temp_res,
                )?;
            }

            draw_watermarks(&mut surface, font_system, layout_info, self, center_image.as_ref());

            while let Some(Span {
                start_line: _,
                end_line: _,
                inner: element,
            }) = element_iter.peek()
            {
                if self.is_element_skipped(element) {
                    element_iter.next();
                    continue;
                }

                if y_pos >= max_y {
                    break;
                }

                let mut peek_next_iter = element_iter.clone();
                peek_next_iter.next();
                let mut next_non_skipped = None;
                while let Some(span) = peek_next_iter.peek() {
                    if self.is_element_skipped(&span.inner) {
                        peek_next_iter.next();
                    } else {
                        next_non_skipped = Some(&span.inner);
                        break;
                    }
                }

                if let Some(Element::Transition(trans_rich_str)) = next_non_skipped {
                    let current_height = super::elements::measure_full_element_height(
                        element,
                        font_system,
                        layout_info,
                    );
                    let trans_height = super::elements::measure_element_height(
                        font_system,
                        trans_rich_str,
                        &layout_info.margins.transition,
                        layout_info.size,
                        layout_info.export_font,
                    );
                    let remaining = max_y - y_pos;
                    if y_pos > top && remaining < current_height + trans_height {
                        break;
                    }
                }

                let is_revised = match element_iter.peek() {
                    Some(span) => (span.start_line..=span.end_line).any(|i| {
                        layout_info
                            .revised_lines
                            .get(i.saturating_sub(1))
                            .cloned()
                            .unwrap_or(false)
                    }),
                    None => false,
                };

                let mut ctx = DrawContext {
                    layout_info,
                    surface: &mut surface,
                    y_position: &mut y_pos,
                    max_y,
                    is_revised,
                    font_system,
                    font_cache: &mut font_cache,
                };

                match &element {
                    Element::Heading { slug, number, color } => {
                        let heading_height = measure_element_height(
                            ctx.font_system,
                            slug,
                            &layout_info.margins.heading,
                            layout_info.size,
                            layout_info.export_font,
                        );
                        let mut peek_next_iter = element_iter.clone();
                        peek_next_iter.next();
                        let mut next_element = None;
                        while let Some(span) = peek_next_iter.peek() {
                            if self.is_element_skipped(&span.inner) {
                                peek_next_iter.next();
                            } else {
                                next_element = Some(&span.inner);
                                break;
                            }
                        }
                        let min_next_height = if let Some(el) = next_element {
                            super::elements::min_required_height_for_lookahead(
                                el,
                                ctx.font_system,
                                layout_info,
                            )
                        } else {
                            0.0
                        };

                        let remaining = max_y - *ctx.y_position;
                        if remaining < heading_height + min_next_height {
                            break;
                        }

                        let mut custom_color_applied = false;
                        if self.scene_colors
                            && let Some(c_name) = color
                            && let Some((r, g, b)) = color_name_to_rgb(c_name)
                        {
                            ctx.surface.set_fill(Some(krilla::paint::Fill {
                                paint: krilla::color::rgb::Color::new(r, g, b).into(),
                                opacity: krilla::num::NormalizedF32::new(1.0).unwrap(),
                                rule: Default::default(),
                            }));
                            custom_color_applied = true;
                        }

                        if number.is_some() && self.mirror_scene_numbers != MirrorOption::Off {
                            let rich_number: RichString = number.as_ref().unwrap().into();
                            let left_number_margin = Margin {
                                left: 54.0,
                                right: layout_info.size.x
                                    - layout_info.margins.heading.left
                                    + 18.0,
                            };
                            let right_number_margin = Margin {
                                left: layout_info.size.x
                                    - layout_info.size.page_right_margin()
                                    - 54.0,
                                right: layout_info.size.page_right_margin(),
                            };

                            let saved_y = *ctx.y_position;
                            let mut temp_res = None;
                            write_element(
                                &mut ctx,
                                &rich_number,
                                &left_number_margin,
                                Alignment::LeftToRight,
                                false,
                                &mut temp_res,
                            )?;
                            *ctx.y_position = saved_y;

                            if self.mirror_scene_numbers == MirrorOption::Mirror {
                                let mut temp_res = None;
                                write_element(
                                    &mut ctx,
                                    &rich_number,
                                    &right_number_margin,
                                    Alignment::RightToLeft,
                                    false,
                                    &mut temp_res,
                                )?;
                                *ctx.y_position = saved_y;
                            }
                        }

                        outline.push_child(OutlineNode::new(
                            slug.to_plain_string().to_uppercase(),
                            XyzDestination::new(
                                page_idx,
                                Point {
                                    x: layout_info.margins.heading.left,
                                    y: *ctx.y_position,
                                },
                            ),
                        ));

                        let mut slug_to_print = slug.clone();
                        slug_to_print.make_uppercase();
                        self.apply_format(&mut slug_to_print, &self.element_formats.scene_heading);

                        let mut temp_res = None;
                        write_element(
                            &mut ctx,
                            &slug_to_print,
                            &layout_info.margins.heading,
                            Alignment::LeftToRight,
                            false,
                            &mut temp_res,
                        )?;

                        if custom_color_applied {
                            ctx.surface.set_fill(Some(krilla::paint::Fill {
                                paint: krilla::color::rgb::Color::new(0, 0, 0).into(),
                                opacity: krilla::num::NormalizedF32::new(1.0).unwrap(),
                                rule: Default::default(),
                            }));
                        }
                    }
                    Element::Action(s) => {
                        let mut s_styled = s.clone();
                        self.apply_format(&mut s_styled, &self.element_formats.action);
                        let overflowed = write_element(
                            &mut ctx,
                            &s_styled,
                            &layout_info.margins.action,
                            Alignment::LeftToRight,
                            true,
                            &mut residual_element_idx,
                        )?;
                        if overflowed {
                            break;
                        }
                    }
                    Element::Dialogue(dialogue) => {
                        let mut dialogue_styled = dialogue.clone();
                        self.apply_format(&mut dialogue_styled.character, &self.element_formats.character);
                        if let Some(ext) = &mut dialogue_styled.extension {
                            self.apply_format(ext, &self.element_formats.character);
                        }
                        for el in &mut dialogue_styled.elements {
                            match el {
                                crate::pdf::screenplay::DialogueElement::Parenthetical(s) => {
                                    self.apply_format(s, &self.element_formats.parenthetical);
                                }
                                crate::pdf::screenplay::DialogueElement::Line(s) => {
                                    self.apply_format(s, &self.element_formats.dialogue);
                                }
                            }
                        }
                        let premature_exit = write_dialogue(
                            &mut ctx,
                            &dialogue_styled,
                            &mut residual_dialogue_idx,
                            &layout_info.margins.dialogue,
                        )?;
                        if residual_dialogue_idx.is_some() || premature_exit {
                            break;
                        }
                    }
                    Element::DualDialogue(dialogue0, dialogue1) => {
                        let saved_y = *ctx.y_position;
                        let mut premature_exit = false;

                        let mut d0_styled = dialogue0.clone();
                        self.apply_format(&mut d0_styled.character, &self.element_formats.character);
                        if let Some(ext) = &mut d0_styled.extension {
                            self.apply_format(ext, &self.element_formats.character);
                        }
                        for el in &mut d0_styled.elements {
                            match el {
                                crate::pdf::screenplay::DialogueElement::Parenthetical(s) => {
                                    self.apply_format(s, &self.element_formats.parenthetical);
                                }
                                crate::pdf::screenplay::DialogueElement::Line(s) => {
                                    self.apply_format(s, &self.element_formats.dialogue);
                                }
                            }
                        }

                        let mut d1_styled = dialogue1.clone();
                        self.apply_format(&mut d1_styled.character, &self.element_formats.character);
                        if let Some(ext) = &mut d1_styled.extension {
                            self.apply_format(ext, &self.element_formats.character);
                        }
                        for el in &mut d1_styled.elements {
                            match el {
                                crate::pdf::screenplay::DialogueElement::Parenthetical(s) => {
                                    self.apply_format(s, &self.element_formats.parenthetical);
                                }
                                crate::pdf::screenplay::DialogueElement::Line(s) => {
                                    self.apply_format(s, &self.element_formats.dialogue);
                                }
                            }
                        }

                        if residual_dual_dialogue_idx.0.is_none()
                            && residual_dual_dialogue_idx.1.is_none()
                        {
                            let h0 = super::elements::min_required_height_for_lookahead(
                                &Element::Dialogue(dialogue0.clone()),
                                ctx.font_system,
                                layout_info,
                            );
                            let h1 = super::elements::min_required_height_for_lookahead(
                                &Element::Dialogue(dialogue1.clone()),
                                ctx.font_system,
                                layout_info,
                            );
                            let min_dual_height = h0.max(h1);
                            let remaining = max_y - *ctx.y_position;
                            if remaining < min_dual_height {
                                break;
                            }
                        }

                        if (residual_dual_dialogue_idx.0.is_none()
                            && residual_dual_dialogue_idx.1.is_none())
                            || residual_dual_dialogue_idx.0.is_some()
                        {
                            premature_exit = premature_exit
                                || write_dialogue(
                                    &mut ctx,
                                    &d0_styled,
                                    &mut residual_dual_dialogue_idx.0,
                                    &layout_info.margins.dual_dialogue.left,
                                )?;
                        }
                        let left_end_y = *ctx.y_position;

                        if (residual_dual_dialogue_idx.1.is_none()
                            && residual_dual_dialogue_idx.0.is_none())
                            || residual_dual_dialogue_idx.1.is_some()
                        {
                            *ctx.y_position = saved_y;
                            premature_exit = premature_exit
                                || write_dialogue(
                                    &mut ctx,
                                    &d1_styled,
                                    &mut residual_dual_dialogue_idx.1,
                                    &layout_info.margins.dual_dialogue.right,
                                )?;
                        }
                        *ctx.y_position = (*ctx.y_position).max(left_end_y);

                        if residual_dual_dialogue_idx.0.is_some()
                            || residual_dual_dialogue_idx.1.is_some()
                            || premature_exit
                        {
                            break;
                        }
                    }
                    Element::Lyrics(s) => {
                        let mut s_styled = s.clone();
                        self.apply_format(&mut s_styled, &self.element_formats.lyrics);
                        let overflowed = write_element(
                            &mut ctx,
                            &s_styled,
                            &layout_info.margins.lyrics,
                            Alignment::Centered,
                            true,
                            &mut residual_element_idx,
                        )?;
                        if overflowed {
                            break;
                        }
                    }
                    Element::Transition(s) => {
                        let mut s_styled = s.clone();
                        s_styled.make_uppercase();
                        self.apply_format(&mut s_styled, &self.element_formats.transition);
                        let mut temp_res = None;
                        let overflowed = write_element(
                            &mut ctx,
                            &s_styled,
                            &layout_info.margins.transition,
                            Alignment::RightToLeft,
                            false,
                            &mut temp_res,
                        )?;
                        if overflowed {
                            break;
                        }
                    }
                    Element::CenteredText(s) => {
                        let mut s_styled = s.clone();
                        self.apply_format(&mut s_styled, &self.element_formats.centered_text);
                        let overflowed = write_element(
                            &mut ctx,
                            &s_styled,
                            &layout_info.margins.centered,
                            Alignment::Centered,
                            true,
                            &mut residual_element_idx,
                        )?;
                        if overflowed {
                            break;
                        }
                    }
                    Element::Shot(s) => {
                        let shot_height = measure_element_height(
                            ctx.font_system,
                            s,
                            &layout_info.margins.action,
                            layout_info.size,
                            layout_info.export_font,
                        );
                        let mut peek_next_iter = element_iter.clone();
                        peek_next_iter.next();
                        let mut next_element = None;
                        while let Some(span) = peek_next_iter.peek() {
                            if self.is_element_skipped(&span.inner) {
                                peek_next_iter.next();
                            } else {
                                next_element = Some(&span.inner);
                                break;
                            }
                        }
                        let min_next_height = if let Some(el) = next_element {
                            super::elements::min_required_height_for_lookahead(
                                el,
                                ctx.font_system,
                                layout_info,
                            )
                        } else {
                            0.0
                        };

                        let remaining = max_y - *ctx.y_position;
                        if remaining < shot_height + min_next_height {
                            break;
                        }

                        let mut s_styled = s.clone();
                        s_styled.make_uppercase();
                        self.apply_format(&mut s_styled, &self.element_formats.shot);
                        let mut temp_res = None;
                        let overflowed = write_element(
                            &mut ctx,
                            &s_styled,
                            &layout_info.margins.action,
                            Alignment::LeftToRight,
                            false,
                            &mut temp_res,
                        )?;
                        if overflowed {
                            break;
                        }
                    }
                    Element::Synopsis(s) => {
                        if self.synopses {
                            let mut s_styled = s.clone();
                            for element in &mut s_styled.elements {
                                element.set_italic();
                            }
                            if self.export_font == "courier_prime_sans" {
                                for element in &mut s_styled.elements {
                                    element.set_sans();
                                }
                            }
                            let overflowed = write_element(
                                &mut ctx,
                                &s_styled,
                                &layout_info.margins.synopsis,
                                Alignment::LeftToRight,
                                true,
                                &mut residual_element_idx,
                            )?;
                            if overflowed {
                                break;
                            }
                        }
                    }
                    Element::Section { text, depth } => {
                        if self.sections {
                            let section_height = measure_element_height(
                                ctx.font_system,
                                text,
                                &layout_info.margins.action,
                                layout_info.size,
                                layout_info.export_font,
                            );
                            let mut peek_next_iter = element_iter.clone();
                            peek_next_iter.next();
                            let mut next_element = None;
                            while let Some(span) = peek_next_iter.peek() {
                                if self.is_element_skipped(&span.inner) {
                                    peek_next_iter.next();
                                } else {
                                    next_element = Some(&span.inner);
                                    break;
                                }
                            }
                            let min_next_height = if let Some(el) = next_element {
                                super::elements::min_required_height_for_lookahead(
                                    el,
                                    ctx.font_system,
                                    layout_info,
                                )
                            } else {
                                0.0
                            };

                            let remaining = max_y - *ctx.y_position;
                            if remaining < section_height + min_next_height {
                                break;
                            }

                            let mut s_styled = text.clone();
                            s_styled.make_uppercase();
                            for element in &mut s_styled.elements {
                                element.set_bold();
                                if depth == &1 {
                                    element.set_underline();
                                }
                            }
                            if self.export_font == "courier_prime_sans" {
                                for element in &mut s_styled.elements {
                                    element.set_sans();
                                }
                            }
                            let mut temp_res = None;
                            let overflowed = write_element(
                                &mut ctx,
                                &s_styled,
                                &layout_info.margins.action,
                                Alignment::LeftToRight,
                                false,
                                &mut temp_res,
                            )?;
                            if overflowed {
                                break;
                            }
                        }
                    }
                    Element::PageBreak => {
                        element_iter.next();
                        break;
                    }
                }

                y_pos += LINE_HEIGHT;

                if residual_dialogue_idx.is_some()
                    || residual_dual_dialogue_idx.0.is_some()
                    || residual_dual_dialogue_idx.1.is_some()
                    || residual_element_idx.is_some()
                {
                    continue;
                }

                element_iter.next();
            }

            surface.finish();
            page.finish();
            page_idx += 1;
        }

        document.set_outline(outline);

        Ok(page_breaks)
    }

    pub fn get_page_breaks(&self, screenplay: &Screenplay) -> std::io::Result<Vec<usize>> {
        let mut document = Document::new();
        let mut font_system = build_font_system();
        let courier = load_courier_fonts()?;
        let noto = load_noto_fonts()?;
        let all_fonts = AllFonts { courier, noto };

        let layout_info = LayoutInfo {
            size: &self.paper_size,
            fonts: &all_fonts,
            export_font: &self.export_font,
            revised_lines: &self.revised_lines,
            margins: get_margins(&self.paper_size),
        };

        self.generate_pdf(&mut document, &layout_info, screenplay, &mut font_system)
    }
}

fn measure_text_width(font_system: &mut FontSystem, text: &str, font_size: f32) -> f32 {
    use cosmic_text::{Attrs, Buffer, Family, Metrics, Shaping};
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

fn draw_watermarks<'a>(
    surface: &mut krilla::surface::Surface,
    font_system: &mut FontSystem,
    layout_info: &LayoutInfo,
    exporter: &PdfExporter,
    center_image: Option<&'a Image>,
) {
    let page_width = layout_info.size.x;
    let page_height = layout_info.size.y;
    let font_size = 10.0;

    // 1. Header Watermark
    if exporter.watermark_header_enabled && !exporter.watermark_header_text.is_empty() {
        if let Some(opacity_norm) = krilla::num::NormalizedF32::new(exporter.watermark_header_opacity) {
            surface.push_opacity(opacity_norm);
            let font = layout_info.fonts.courier.regular.clone();
            let width = measure_text_width(font_system, &exporter.watermark_header_text, font_size);
            let x_pos = (page_width - width) / 2.0;
            surface.draw_text(
                Point::from_xy(x_pos, 36.0),
                font,
                font_size,
                &exporter.watermark_header_text,
                false,
                krilla::text::TextDirection::LeftToRight,
            );
            surface.pop();
        }
    }

    // 2. Footer Watermark
    if exporter.watermark_footer_enabled && !exporter.watermark_footer_text.is_empty() {
        if let Some(opacity_norm) = krilla::num::NormalizedF32::new(exporter.watermark_footer_opacity) {
            surface.push_opacity(opacity_norm);
            let font = layout_info.fonts.courier.regular.clone();
            let width = measure_text_width(font_system, &exporter.watermark_footer_text, font_size);
            let x_pos = (page_width - width) / 2.0;
            surface.draw_text(
                Point::from_xy(x_pos, page_height - 36.0),
                font,
                font_size,
                &exporter.watermark_footer_text,
                false,
                krilla::text::TextDirection::LeftToRight,
            );
            surface.pop();
        }
    }

    // 3. Center Watermark
    if exporter.watermark_center_enabled {
        let opacity = exporter.watermark_center_opacity; // normalized f32 0.1 to 1.0
        if let Some(opacity_normalized) = krilla::num::NormalizedF32::new(opacity) {
            surface.push_opacity(opacity_normalized);

            if exporter.watermark_center_type == "image" {
                if let Some(image) = center_image {
                    let img_size = image.size();
                    let max_w = 300.0;
                    let max_h = 300.0;
                    let aspect = img_size.0 as f32 / img_size.1 as f32;
                    let (w, h) = if aspect > 1.0 {
                        (max_w, max_w / aspect)
                    } else {
                        (max_h * aspect, max_h)
                    };
                    let x = (page_width - w) / 2.0;
                    let y = (page_height - h) / 2.0;
                    if let Some(size) = krilla::geom::Size::from_wh(w, h) {
                        surface.push_transform(&krilla::geom::Transform::from_translate(x, y));
                        surface.draw_image(image.clone(), size);
                        surface.pop();
                    }
                }
            } else if exporter.watermark_center_type == "text" && !exporter.watermark_center_text.is_empty() {
                // Draw Text Center Watermark
                let font = layout_info.fonts.courier.bold.clone();
                let center_font_size = 48.0;
                let width = measure_text_width(font_system, &exporter.watermark_center_text, center_font_size);
                
                let x = (page_width - width) / 2.0;
                let y = page_height / 2.0;

                let cx = page_width / 2.0;
                let cy = page_height / 2.0;
                
                let transform = krilla::geom::Transform::from_rotate_at(-45.0, cx, cy);

                surface.push_transform(&transform);
                surface.draw_text(
                    Point::from_xy(x, y),
                    font,
                    center_font_size,
                    &exporter.watermark_center_text,
                    false,
                    krilla::text::TextDirection::LeftToRight,
                );
                surface.pop();
            }

            surface.pop(); // Pop opacity
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_logo_png_decode() {
        let fountain_text = r#"
.SCENE 1
CHARACTER
Hello world.
"#;
        let screenplay = crate::pdf::parse(fountain_text);
        let exporter = PdfExporter {
            watermark_center_enabled: true,
            watermark_center_type: "image".to_string(),
            watermark_center_image_path: "C:\\Users\\nkr\\Documents\\Projects\\ActOne Family\\ActOneCode\\src\\assets\\logo.png".to_string(),
            watermark_center_opacity: 0.4,
            ..Default::default()
        };
        let mut out = Vec::new();
        let res = exporter.export(&screenplay, &mut out);
        eprintln!("Full export with PNG result: {:?}", res.is_ok());
        if let Err(e) = res {
            eprintln!("Export Error details: {:?}", e);
        }
    }

    #[test]
    fn test_indic_pdf_export() {
        let fountain_text = r#"
.SCENE 1 (TAMIL)

CHARACTER
தமிழ் தட்டச்சு சோதனை.

CHARACTER (CONT'D)
This is a test of parenthetical and normal text:
(parenthetical text here)
"#;
        let screenplay = crate::pdf::parse(fountain_text);
        let exporter = PdfExporter {
            title_page: false,
            ..Default::default()
        };
        let mut out = Vec::new();
        let res = exporter.export(&screenplay, &mut out);
        if let Err(e) = res {
            panic!("test_indic_pdf_export failed with error: {:?}", e);
        }
    }

    #[test]
    fn test_transition_lookahead_breaks() {
        let fountain_text = r#"
.SCENE 1

Action line 1.
Action line 2.
Action line 3.
Action line 4.
Action line 5.
Action line 6.
Action line 7.
Action line 8.
Action line 9.
Action line 10.
Action line 11.
Action line 12.
Action line 13.
Action line 14.
Action line 15.
Action line 16.
Action line 17.
Action line 18.
Action line 19.
Action line 20.
Action line 21.
Action line 22.
Action line 23.
Action line 24.
Action line 25.
Action line 26.
Action line 27.
Action line 28.
Action line 29.
Action line 30.
Action line 31.
Action line 32.
Action line 33.
Action line 34.
Action line 35.
Action line 36.
Action line 37.
Action line 38.
Action line 39.
Action line 40.
Action line 41.
Action line 42.
Action line 43.
Action line 44.
Action line 45.
Action line 46.
Action line 47.
Action line 48.
Action line 49.
Action line 50.

> CUT TO:
"#;
        let screenplay = crate::pdf::parse(fountain_text);
        let exporter = PdfExporter {
            title_page: false,
            ..Default::default()
        };
        let page_breaks = exporter.get_page_breaks(&screenplay);
        assert!(page_breaks.is_ok());
    }

    #[test]
    fn test_scene_color_export() {
        let fountain_text = r#"
.SCENE 1 [[red]]

This is action.
"#;
        let screenplay = crate::pdf::parse(fountain_text);
        
        // Assert parser extracted the color
        match &screenplay.elements[0].inner {
            crate::pdf::screenplay::Element::Heading { color, slug, .. } => {
                assert_eq!(color.as_deref(), Some("red"));
                assert_eq!(slug.to_plain_string(), "SCENE 1");
            }
            _ => panic!("Expected heading"),
        }

        let exporter = PdfExporter {
            title_page: false,
            scene_colors: true,
            ..Default::default()
        };
        let mut out = Vec::new();
        let res = exporter.export(&screenplay, &mut out);
        assert!(res.is_ok());
    }
}

