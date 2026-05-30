use std::io::Write;

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

use super::layout::{PaperSize, FontFamily, LayoutInfo, Margin, get_margins, FONT_SIZE};
use super::elements::{Alignment, DrawContext, write_dialogue, write_element, write_element_custom_top_margin, glyph_span, break_points};
use super::title_page::write_titlepage;

/// Courier Prime font files compiled directly into the application for screenplay rendering.
/// Variants: Regular, Bold, Italic, BoldItalic, and their Sans equivalents.
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

impl Exporter for PdfExporter {
    fn file_extension(&self) -> &'static str {
        "pdf"
    }

    fn export(&self, screenplay: &Screenplay, writer: &mut dyn Write) -> std::io::Result<()> {
        let mut document = Document::new();

        let fonts = FontFamily {
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

        let layout_info = LayoutInfo {
            size: &self.paper_size,
            fonts: &fonts,
            export_font: &self.export_font,
            revised_lines: &self.revised_lines,
            margins: get_margins(&self.paper_size),
        };

        self.generate_pdf(&mut document, &layout_info, screenplay)?;

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
    ) -> std::io::Result<()> {
        let mut element_iter = screenplay.elements.iter().peekable();
        let mut page_idx = 0;

        let top = layout_info.size.top_margin();
        let bottom = layout_info.size.bottom_margin();
        let max_lines_per_page = (layout_info.size.y - (top + bottom)) / FONT_SIZE - 1;
        // If an element does not fit within a page this will be Some(index), where index is pointing
        // to the breakpoint in the breakpoint list which should be on the start of the next page.
        let mut residual_breakpoint_idx = None;
        let mut residual_dialogue_idx = None;

        let mut residual_dual_dialogue_idx = (None, None);
        let mut residual_dual_breakpoint_idx = (None, None);

        let mut outline = Outline::new();

        let has_title_page = self.title_page && screenplay.titlepage.is_some();
        if let (true, Some(t)) = (has_title_page, &screenplay.titlepage) {
            page_idx += 1;
            write_titlepage(t, layout_info, max_lines_per_page, document)?;
        }

        // Page loop, creates a new page and writes everything it can on it.
        while element_iter.peek().is_some() {
            let mut page = document.start_page_with(
                PageSettings::from_wh(layout_info.size.x as f32, layout_info.size.y as f32)
                    .ok_or_else(|| std::io::Error::other("invalid page dimensions"))?,
            );
            let mut surface = page.surface();
            let mut line_idx = 0;

            if (has_title_page && page_idx > 1) || (!has_title_page && page_idx > 0) {
                let mut p_line_idx = 0;
                let mut ctx = DrawContext {
                    layout_info,
                    surface: &mut surface,
                    line_index: &mut p_line_idx,
                    max_lines: 36,
                    is_revised: false,
                };
                let page_num_text: RichString = format!(
                    "{}.",
                    if has_title_page {
                        page_idx
                    } else {
                        page_idx + 1
                    }
                )
                .into();
                let residual_page_number = write_element_custom_top_margin(
                    &mut ctx,
                    &page_num_text,
                    &layout_info.margins.page_number,
                    &mut 0,
                    Alignment::RightToLeft,
                    36,
                    36,
                )?;

                if residual_page_number.is_some() {
                    return Err(std::io::Error::new(
                        std::io::ErrorKind::InvalidData,
                        "Page number exceeds available space.",
                    ));
                }
            }

            while let Some(Span {
                start_line: _,
                end_line: _,
                inner: element,
            }) = element_iter.peek()
            {
                if line_idx >= max_lines_per_page {
                    break;
                }

                let mut breakpoint_idx = match residual_breakpoint_idx {
                    Some(i) => {
                        if !matches!(element, Element::Dialogue(_)) {
                            residual_breakpoint_idx = std::option::Option::None;
                        }
                        i
                    }
                    std::option::Option::None => 0,
                };

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
                    line_index: &mut line_idx,
                    max_lines: max_lines_per_page,
                    is_revised,
                };

                macro_rules! write_element {
                    ($content:expr, $margin:expr, $text_direction:expr) => {
                        residual_breakpoint_idx = write_element(
                            &mut ctx,
                            $content,
                            $margin,
                            &mut breakpoint_idx,
                            $text_direction,
                        )?
                    };
                }

                match &element {
                    Element::Heading { slug, number } => {
                        let heading_lines = {
                            let span = glyph_span(
                                layout_info.size,
                                layout_info.margins.heading.left,
                                layout_info.margins.heading.right,
                            );
                            break_points(slug, span).len() + 1
                        };
                        let lines_remaining = max_lines_per_page.saturating_sub(*ctx.line_index);
                        if lines_remaining < heading_lines + 3 {
                            break;
                        }

                        if number.is_some() && self.mirror_scene_numbers != MirrorOption::Off {
                            let mut initial_line_index = *ctx.line_index;
                            let mut ctx_number = DrawContext {
                                layout_info,
                                surface: ctx.surface,
                                line_index: &mut initial_line_index,
                                max_lines: max_lines_per_page,
                                is_revised: ctx.is_revised,
                            };

                            let left_number_margin = Margin {
                                left: 54.0,
                                right: layout_info.size.x as f32
                                    - layout_info.margins.heading.left
                                    + 18.0,
                            };
                            let right_number_margin = Margin {
                                left: layout_info.size.x as f32
                                    - layout_info.size.page_right_margin()
                                    - 54.0,
                                right: layout_info.size.page_right_margin(),
                            };

                            let rich_number = &number.as_ref().unwrap().into();

                            write_element(
                                &mut ctx_number,
                                rich_number,
                                &left_number_margin,
                                &mut 0,
                                Alignment::LeftToRight,
                            )?;

                            if self.mirror_scene_numbers == MirrorOption::Mirror {
                                let mut initial_line_index_right = *ctx.line_index;
                                let mut ctx_number_right = DrawContext {
                                    layout_info,
                                    surface: ctx.surface,
                                    line_index: &mut initial_line_index_right,
                                    max_lines: max_lines_per_page,
                                    is_revised: ctx.is_revised,
                                };
                                write_element(
                                    &mut ctx_number_right,
                                    rich_number,
                                    &right_number_margin,
                                    &mut 0,
                                    Alignment::RightToLeft,
                                )?;
                            }
                        }
                        outline.push_child(OutlineNode::new(
                            slug.to_plain_string(),
                            XyzDestination::new(
                                page_idx,
                                Point {
                                    x: layout_info.margins.heading.left,
                                    y: (top + ((*ctx.line_index) * FONT_SIZE) - FONT_SIZE) as f32,
                                },
                            ),
                        ));
                        let mut slug_to_print = slug.clone();
                        if self.bold_scene_headings {
                            for element in &mut slug_to_print.elements {
                                element.set_bold();
                            }
                        }

                        write_element!(
                            &slug_to_print,
                            &layout_info.margins.heading,
                            Alignment::LeftToRight
                        );
                    }
                    Element::Action(s) => {
                        write_element!(s, &layout_info.margins.action, Alignment::LeftToRight);
                    }
                    Element::Dialogue(dialogue) => {
                        let premature_exit = write_dialogue(
                            &mut ctx,
                            dialogue,
                            &mut residual_dialogue_idx,
                            &mut residual_breakpoint_idx,
                            &layout_info.margins.dialogue,
                        )?;
                        if residual_dialogue_idx.is_some() || premature_exit {
                            break;
                        }
                    }
                    Element::DualDialogue(dialogue0, dialogue1) => {
                        let mut initial_line_index = *ctx.line_index;
                        let mut premature_exit = false;
                        if (residual_dual_dialogue_idx.0.is_none()
                            && residual_dual_dialogue_idx.1.is_none())
                            || residual_dual_dialogue_idx.0.is_some()
                        {
                            premature_exit = premature_exit
                                || write_dialogue(
                                    &mut ctx,
                                    dialogue0,
                                    &mut residual_dual_dialogue_idx.0,
                                    &mut residual_dual_breakpoint_idx.0,
                                    &layout_info.margins.dual_dialogue.left,
                                )?;
                        }
                        if (residual_dual_dialogue_idx.1.is_none()
                            && residual_dual_dialogue_idx.0.is_none())
                            || residual_dual_dialogue_idx.1.is_some()
                        {
                            let mut ctx_dual = DrawContext {
                                layout_info,
                                surface: ctx.surface,
                                line_index: &mut initial_line_index,
                                max_lines: max_lines_per_page,
                                is_revised: ctx.is_revised,
                            };
                            premature_exit = premature_exit
                                || write_dialogue(
                                    &mut ctx_dual,
                                    dialogue1,
                                    &mut residual_dual_dialogue_idx.1,
                                    &mut residual_dual_breakpoint_idx.1,
                                    &layout_info.margins.dual_dialogue.right,
                                )?;
                            *ctx.line_index = (*ctx.line_index).max(initial_line_index);
                        }
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
                        write_element!(
                            &s_styled,
                            &layout_info.margins.lyrics,
                            Alignment::Centered
                        );
                    }
                    Element::Transition(s) => {
                        write_element!(
                            s,
                            &layout_info.margins.transition,
                            Alignment::RightToLeft
                        );
                    }
                    Element::CenteredText(s) => {
                        write_element!(s, &layout_info.margins.centered, Alignment::Centered);
                    }
                    Element::Shot(s) => {
                        let mut s_styled = s.clone();
                        s_styled.make_uppercase();
                        if self.bold_scene_headings {
                            for element in &mut s_styled.elements {
                                element.set_bold();
                            }
                        }
                        write_element!(
                            &s_styled,
                            &layout_info.margins.action,
                            Alignment::LeftToRight
                        );
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
                            write_element!(
                                &s_styled,
                                &layout_info.margins.synopsis,
                                Alignment::LeftToRight
                            );
                        }
                    }
                    Element::Section(s) => {
                        if self.sections {
                            let mut s_styled = s.clone();
                            s_styled.make_uppercase();
                            for element in &mut s_styled.elements {
                                element.set_bold();
                                if self.export_font == "courier_prime_sans" {
                                    element.set_sans();
                                }
                            }
                            write_element!(
                                &s_styled,
                                &layout_info.margins.action,
                                Alignment::LeftToRight
                            );
                        }
                    }
                    Element::PageBreak => {
                        element_iter.next();
                        break;
                    }
                }

                line_idx += 1;

                if residual_breakpoint_idx.is_some() {
                    continue;
                }

                element_iter.next();
            }

            surface.finish();
            page.finish();
            page_idx += 1;
        }
        document.set_outline(outline);

        Ok(())
    }
}
