use std::io::Write;
use std::collections::HashMap;

use cosmic_text::FontSystem;
use krilla::{
    Document,
    destination::XyzDestination,
    geom::Point,
    outline::{Outline, OutlineNode},
    page::PageSettings,
    text::Font,
};

use crate::pdf::{
    Exporter, Screenplay, MirrorOption,
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
    pub bold_scene_headings: bool,
    pub mirror_scene_numbers: MirrorOption,
    pub export_font: String,
    pub revised_lines: Vec<bool>,
    pub title_page: bool,
}

impl Default for PdfExporter {
    fn default() -> Self {
        Self {
            synopses: false,
            sections: false,
            paper_size: PaperSize::default(),
            bold_scene_headings: false,
            mirror_scene_numbers: MirrorOption::default(),
            export_font: String::new(),
            revised_lines: Vec::new(),
            title_page: true,
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

impl Exporter for PdfExporter {
    fn file_extension(&self) -> &'static str {
        "pdf"
    }

    fn export(&self, screenplay: &Screenplay, writer: &mut dyn Write) -> std::io::Result<()> {
        let mut document = Document::new();
        let mut font_system = build_font_system();

        let courier = CourierFonts {
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
        };

        let noto = NotoFonts {
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
        };

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

impl PdfExporter {
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

        if has_title_page {
            if let Some(Span { start_line, .. }) = element_iter.peek() {
                page_breaks.push(*start_line);
            }
        }

        let mut content_page_idx = 0;

        while element_iter.peek().is_some() {
            let mut page = document.start_page_with(
                PageSettings::from_wh(layout_info.size.x as f32, layout_info.size.y as f32)
                    .ok_or_else(|| std::io::Error::other("invalid page dimensions"))?,
            );
            let mut surface = page.surface();
            let mut y_pos = top;

            if content_page_idx > 0 {
                if let Some(Span { start_line, .. }) = element_iter.peek() {
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

            while let Some(Span {
                start_line: _,
                end_line: _,
                inner: element,
            }) = element_iter.peek()
            {
                let mut is_skipped = false;
                match element {
                    Element::Synopsis(_) if !self.synopses => is_skipped = true,
                    Element::Section(_) if !self.sections => is_skipped = true,
                    _ => {}
                }
                if is_skipped {
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
                    let mut is_next_skipped = false;
                    match &span.inner {
                        Element::Synopsis(_) if !self.synopses => is_next_skipped = true,
                        Element::Section(_) if !self.sections => is_next_skipped = true,
                        _ => {}
                    }
                    if is_next_skipped {
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
                    Element::Heading { slug, number } => {
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
                            let mut is_skipped = false;
                            match &span.inner {
                                Element::Synopsis(_) if !self.synopses => is_skipped = true,
                                Element::Section(_) if !self.sections => is_skipped = true,
                                _ => {}
                            }
                            if is_skipped {
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
                        if self.bold_scene_headings {
                            for element in &mut slug_to_print.elements {
                                element.set_bold();
                            }
                        }

                        let mut temp_res = None;
                        write_element(
                            &mut ctx,
                            &slug_to_print,
                            &layout_info.margins.heading,
                            Alignment::LeftToRight,
                            false,
                            &mut temp_res,
                        )?;
                    }
                    Element::Action(s) => {
                        let overflowed = write_element(
                            &mut ctx,
                            s,
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
                        let premature_exit = write_dialogue(
                            &mut ctx,
                            dialogue,
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
                                    dialogue0,
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
                                    dialogue1,
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
                        for element in &mut s_styled.elements {
                            element.set_italic();
                        }
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
                        let mut temp_res = None;
                        let overflowed = write_element(
                            &mut ctx,
                            s,
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
                        let overflowed = write_element(
                            &mut ctx,
                            s,
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
                            let mut is_skipped = false;
                            match &span.inner {
                                Element::Synopsis(_) if !self.synopses => is_skipped = true,
                                Element::Section(_) if !self.sections => is_skipped = true,
                                _ => {}
                            }
                            if is_skipped {
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
                        if self.bold_scene_headings {
                            for element in &mut s_styled.elements {
                                element.set_bold();
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
                    Element::Synopsis(s) => {
                        if self.synopses {
                            let mut s_styled = s.clone();
                            for element in &mut s_styled.elements {
                                element.set_italic();
                                if self.export_font == "courier_prime_sans" {
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
                    Element::Section(s) => {
                        if self.sections {
                            let section_height = measure_element_height(
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
                                let mut is_skipped = false;
                                match &span.inner {
                                    Element::Synopsis(_) if !self.synopses => is_skipped = true,
                                    Element::Section(_) if !self.sections => is_skipped = true,
                                    _ => {}
                                }
                                if is_skipped {
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

                            let mut s_styled = s.clone();
                            s_styled.make_uppercase();
                            for element in &mut s_styled.elements {
                                element.set_bold();
                                if self.export_font == "courier_prime_sans" {
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

        let courier = CourierFonts {
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
        };

        let noto = NotoFonts {
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
        };

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

#[cfg(test)]
mod tests {
    use super::*;

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
        assert!(res.is_ok());
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
}

