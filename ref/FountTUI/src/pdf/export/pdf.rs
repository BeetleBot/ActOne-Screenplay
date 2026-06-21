use std::io::Write;

use krilla::{
    Document,
    destination::XyzDestination,
    geom::{PathBuilder, Point, Rect},
    outline::{Outline, OutlineNode},
    page::PageSettings,
    surface::Surface,
    text::Font,
};

use crate::config::MirrorOption;
use crate::pdf::{
    Exporter, Screenplay,
    rich_string::RichString,
    screenplay::{Dialogue, DialogueElement, Element, Span, TitlePage},
};

const FONT_SIZE: usize = 12;
const FONT_WIDTH: f32 = 7.2;

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

struct FontFamily {
    pub regular: Font,
    pub bold: Font,
    pub italic: Font,
    pub bold_italic: Font,
    pub sans_regular: Font,
    pub sans_bold: Font,
    pub sans_italic: Font,
    pub sans_bold_italic: Font,
}

pub struct PaperSize {
    pub x: usize,
    pub y: usize,
}

pub const A4: PaperSize = PaperSize { x: 595, y: 842 };
pub const LETTER: PaperSize = PaperSize { x: 612, y: 792 };

impl Default for PaperSize {
    fn default() -> Self {
        A4
    }
}

impl PaperSize {
    fn top_margin(&self) -> usize {
        72
    }

    fn bottom_margin(&self) -> usize {
        72
    }

    fn page_left_margin(&self) -> f32 {
        108.0
    }

    fn page_right_margin(&self) -> f32 {
        self.x as f32 - 540.0
    }
}

struct Margin {
    pub left: f32,
    pub right: f32,
}

struct DialogueMargins {
    pub character: Margin,
    pub parenthetical: Margin,
    pub line: Margin,
}

struct DualDialogueMargins {
    pub left: DialogueMargins,
    pub right: DialogueMargins,
}

struct Margins {
    pub heading: Margin,
    pub action: Margin,
    pub dialogue: DialogueMargins,
    pub dual_dialogue: DualDialogueMargins,
    pub lyrics: Margin,
    pub transition: Margin,
    pub centered: Margin,
    pub synopsis: Margin,
    pub page_number: Margin,
}

fn get_margins(size: &PaperSize) -> Margins {
    let page_left = size.page_left_margin();
    let page_right = size.page_right_margin();
    let page_w = size.x as f32;
    let half_page = page_w / 2.0;

    Margins {
        heading: Margin {
            left: page_left,
            right: page_right,
        },
        action: Margin {
            left: page_left,
            right: page_right,
        },
        dialogue: DialogueMargins {
            character: Margin {
                left: 266.4,
                right: page_w - 410.4,
            },
            parenthetical: Margin {
                left: 223.2,
                right: page_w - 396.0,
            },
            line: Margin {
                left: 180.0,
                right: page_w - 432.0,
            },
        },
        dual_dialogue: DualDialogueMargins {
            left: DialogueMargins {
                character: Margin {
                    left: 198.0,
                    right: 288.0,
                },
                parenthetical: Margin {
                    left: 162.0,
                    right: 324.0,
                },
                line: Margin {
                    left: 144.0,
                    right: 288.0,
                },
            },
            right: DialogueMargins {
                character: Margin {
                    left: half_page + 90.0,
                    right: page_right,
                },
                parenthetical: Margin {
                    left: half_page + 54.0,
                    right: page_right + 18.0,
                },
                line: Margin {
                    left: half_page + 36.0,
                    right: page_right,
                },
            },
        },
        lyrics: Margin {
            left: 144.0,
            right: page_w - 432.0,
        },
        transition: Margin {
            left: page_left,
            right: page_right,
        },
        centered: Margin {
            left: 144.0,
            right: page_w - 432.0,
        },
        synopsis: Margin {
            left: page_left,
            right: page_right,
        },
        page_number: Margin {
            left: page_left,
            right: page_right,
        },
    }
}

struct LayoutInfo<'a> {
    pub size: &'a PaperSize,
    pub fonts: &'a FontFamily,
    pub export_font: &'a str,
    pub revised_lines: &'a [bool],
    pub margins: Margins,
}

#[derive(Default)]
pub struct PdfExporter {
    pub synopses: bool,
    pub sections: bool,
    pub paper_size: PaperSize,
    pub bold_scene_headings: bool,
    pub mirror_scene_numbers: MirrorOption,
    pub export_font: String,
    pub revised_lines: Vec<bool>,
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

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
enum Alignment {
    LeftToRight,
    RightToLeft,
    Centered,
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

        if let Some(t) = &screenplay.titlepage {
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

            if (screenplay.titlepage.is_none() && page_idx > 0)
                || (screenplay.titlepage.is_some() && page_idx > 1)
            {
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
                    if screenplay.titlepage.is_some() {
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

                        if number.is_some() {
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

                            if self.mirror_scene_numbers != MirrorOption::Off {
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
                        s_styled.to_uppercase();
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
                            s_styled.to_uppercase();
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

struct DrawContext<'a, 'b> {
    layout_info: &'a LayoutInfo<'a>,
    surface: &'a mut Surface<'b>,
    line_index: &'a mut usize,
    max_lines: usize,
    is_revised: bool,
}

fn write_dialogue(
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

fn write_element(
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

fn write_element_custom_top_margin(
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

struct LineDrawOptions<'a> {
    pub x: f32,
    pub y: f32,
    pub text_direction: Alignment,
    pub margin: &'a Margin,
}

fn write_line(
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

const TITLE_TOP_MARGIN: f32 = 72.0;
const TITLE_BOTTOM_MARGIN: f32 = 72.0;
const TITLE_SIDE_MARGIN: f32 = 72.0;

fn write_titlepage(
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

fn glyph_span(size: &PaperSize, left_margin: f32, right_margin: f32) -> usize {
    ((size.x as f32 - (left_margin + right_margin)) / FONT_WIDTH) as usize
}

#[derive(Debug, PartialEq, Eq, Clone, Hash)]
enum BreakType {
    NewLine,
    BreakWord,
}

#[derive(Debug, PartialEq, Eq, Clone, Hash)]
struct BreakPoint {
    pub index: usize,
    pub break_type: BreakType,
}

fn break_points(content: &RichString, span: usize) -> Vec<BreakPoint> {
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
