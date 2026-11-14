use std::collections::HashMap;
use std::io::Write;

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
    ElementFormat, ElementFormats, Exporter, MirrorOption, Screenplay,
    rich_string::RichString,
    screenplay::{Element, Span},
};

use super::elements::{Alignment, DrawContext, write_dialogue, write_element};
use super::layout::{
    AllFonts, CourierFonts, IndicFonts, LINE_HEIGHT, LayoutInfo, Margin, PaperSize, SymbolFonts,
    get_margins,
};
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

const NOTO_FONTS: [&[u8]; 33] = [
    // 0-15: Existing fonts (kept for backward compatibility)
    include_bytes!("fonts/MuktaMalar-Regular.ttf"), // 0 - Tamil
    include_bytes!("fonts/MuktaMalar-Bold.ttf"),    // 1
    include_bytes!("fonts/Mukta-Regular.ttf"),      // 2 - Hindi
    include_bytes!("fonts/Mukta-Bold.ttf"),         // 3
    include_bytes!("fonts/NotoSansTelugu-Regular.ttf"), // 4 - Telugu
    include_bytes!("fonts/NotoSansTelugu-Bold.ttf"), // 5
    include_bytes!("fonts/NotoSansMalayalam-Regular.ttf"), // 6 - Malayalam
    include_bytes!("fonts/NotoSansMalayalam-Bold.ttf"), // 7
    include_bytes!("fonts/NotoSansKannada-Regular.ttf"), // 8 - Kannada
    include_bytes!("fonts/NotoSansKannada-Bold.ttf"), // 9
    include_bytes!("fonts/NotoSansBengali-Regular.ttf"), // 10 - Bengali
    include_bytes!("fonts/NotoSansBengali-Bold.ttf"), // 11
    include_bytes!("fonts/MuktaVaani-Regular.ttf"), // 12 - Gujarati
    include_bytes!("fonts/MuktaVaani-Bold.ttf"),    // 13
    include_bytes!("fonts/MuktaMahee-Regular.ttf"), // 14 - Punjabi
    include_bytes!("fonts/MuktaMahee-Bold.ttf"),    // 15
    // 16-31: Indian language fonts
    include_bytes!("fonts/HindGuntur-Regular.ttf"), // 16 - Telugu
    include_bytes!("fonts/HindGuntur-Bold.ttf"),    // 17
    include_bytes!("fonts/HindSiliguri-Regular.ttf"), // 18 - Bengali
    include_bytes!("fonts/HindSiliguri-Bold.ttf"),  // 19
    include_bytes!("fonts/HindVadodara-Regular.ttf"), // 20 - Gujarati
    include_bytes!("fonts/HindVadodara-Bold.ttf"),  // 21
    include_bytes!("fonts/BalooTamma2-Regular.ttf"), // 22 - Kannada
    include_bytes!("fonts/BalooTamma2-Bold.ttf"),   // 23
    include_bytes!("fonts/BalooChettan2-Regular.ttf"), // 24 - Malayalam
    include_bytes!("fonts/BalooChettan2-Bold.ttf"), // 25
    include_bytes!("fonts/BalooPaaji2-Regular.ttf"), // 26 - Punjabi
    include_bytes!("fonts/BalooPaaji2-Bold.ttf"),   // 27
    include_bytes!("fonts/BalooBhaina2-Regular.ttf"), // 28 - Oriya
    include_bytes!("fonts/BalooBhaina2-Bold.ttf"),  // 29
    include_bytes!("fonts/NotoSansTamil-Regular.ttf"), // 30 - Tamil alt (user preference)
    include_bytes!("fonts/NotoSansTamil-Bold.ttf"), // 31
    include_bytes!("fonts/NotoSansSymbols2-Regular.ttf"), // 32 - Symbol fallback
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
    pub scene_page_breaks: bool,
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
    pub auto_contd: bool,
    pub script_fonts: HashMap<String, String>,
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
            scene_page_breaks: false,
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
            auto_contd: true,
            script_fonts: HashMap::new(),
        }
    }
}

fn build_font_system() -> FontSystem {
    super::shared::build_font_system()
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

fn load_indic_fonts() -> std::io::Result<IndicFonts> {
    Ok(IndicFonts {
        mukta_malar_regular: Font::new(NOTO_FONTS[0].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load mukta malar regular"))?,
        mukta_malar_bold: Font::new(NOTO_FONTS[1].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load mukta malar bold"))?,
        mukta_regular: Font::new(NOTO_FONTS[2].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load mukta regular"))?,
        mukta_bold: Font::new(NOTO_FONTS[3].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load mukta bold"))?,
        noto_sans_telugu_regular: Font::new(NOTO_FONTS[4].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load noto sans telugu regular"))?,
        noto_sans_telugu_bold: Font::new(NOTO_FONTS[5].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load noto sans telugu bold"))?,
        noto_sans_malayalam_regular: Font::new(NOTO_FONTS[6].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load noto sans malayalam regular"))?,
        noto_sans_malayalam_bold: Font::new(NOTO_FONTS[7].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load noto sans malayalam bold"))?,
        noto_sans_kannada_regular: Font::new(NOTO_FONTS[8].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load noto sans kannada regular"))?,
        noto_sans_kannada_bold: Font::new(NOTO_FONTS[9].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load noto sans kannada bold"))?,
        noto_sans_bengali_regular: Font::new(NOTO_FONTS[10].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load noto sans bengali regular"))?,
        noto_sans_bengali_bold: Font::new(NOTO_FONTS[11].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load noto sans bengali bold"))?,
        noto_sans_gujarati_regular: Font::new(NOTO_FONTS[12].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load noto sans gujarati regular"))?,
        noto_sans_gujarati_bold: Font::new(NOTO_FONTS[13].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load noto sans gujarati bold"))?,
        noto_sans_gurmukhi_regular: Font::new(NOTO_FONTS[14].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load noto sans gurmukhi regular"))?,
        noto_sans_gurmukhi_bold: Font::new(NOTO_FONTS[15].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load noto sans gurmukhi bold"))?,
        hind_guntur_regular: Font::new(NOTO_FONTS[16].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load hind guntur regular"))?,
        hind_guntur_bold: Font::new(NOTO_FONTS[17].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load hind guntur bold"))?,
        hind_siliguri_regular: Font::new(NOTO_FONTS[18].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load hind siliguri regular"))?,
        hind_siliguri_bold: Font::new(NOTO_FONTS[19].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load hind siliguri bold"))?,
        hind_vadodara_regular: Font::new(NOTO_FONTS[20].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load hind vadodara regular"))?,
        hind_vadodara_bold: Font::new(NOTO_FONTS[21].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load hind vadodara bold"))?,
        baloo_tamma_2_regular: Font::new(NOTO_FONTS[22].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load baloo tamma 2 regular"))?,
        baloo_tamma_2_bold: Font::new(NOTO_FONTS[23].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load baloo tamma 2 bold"))?,
        baloo_chettan_2_regular: Font::new(NOTO_FONTS[24].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load baloo chettan 2 regular"))?,
        baloo_chettan_2_bold: Font::new(NOTO_FONTS[25].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load baloo chettan 2 bold"))?,
        baloo_paaji_2_regular: Font::new(NOTO_FONTS[26].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load baloo paaji 2 regular"))?,
        baloo_paaji_2_bold: Font::new(NOTO_FONTS[27].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load baloo paaji 2 bold"))?,
        baloo_bhaina_2_regular: Font::new(NOTO_FONTS[28].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load baloo bhaina 2 regular"))?,
        baloo_bhaina_2_bold: Font::new(NOTO_FONTS[29].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load baloo bhaina 2 bold"))?,
        noto_sans_tamil_regular: Font::new(NOTO_FONTS[30].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load noto sans tamil regular"))?,
        noto_sans_tamil_bold: Font::new(NOTO_FONTS[31].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load noto sans tamil bold"))?,
    })
}

fn load_symbol_fonts() -> std::io::Result<SymbolFonts> {
    Ok(SymbolFonts {
        regular: Font::new(NOTO_FONTS[32].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load symbol font"))?,
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
        let indic = load_indic_fonts()?;
        let symbols = load_symbol_fonts()?;

        let all_fonts = AllFonts {
            courier,
            indic,
            symbols,
        };

        let layout_info = LayoutInfo {
            size: &self.paper_size,
            fonts: &all_fonts,
            export_font: &self.export_font,
            revised_lines: &self.revised_lines,
            margins: get_margins(&self.paper_size),
            script_fonts: &self.script_fonts,
        };

        self.generate_pdf(&mut document, &layout_info, screenplay, &mut font_system)
            .map(|_| ())?;

        let pdf = document.finish().map_err(|e| {
            eprintln!("document.finish() failed with error: {:?}", e);
            std::io::Error::other("failed to create pdf")
        })?;
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
            if format.bold {
                element.set_bold();
            }
            if format.italic {
                element.set_italic();
            }
            if format.underline {
                element.set_underline();
            }
        }
    }

    /// Use the same text styles for preflight and drawing; font changes affect wrapping.
    fn formatted_element(&self, element: &Element) -> Element {
        use crate::pdf::screenplay::{Dialogue, DialogueElement};
        let format_dialogue = |d: &mut Dialogue| {
            self.apply_format(&mut d.character, &self.element_formats.character);
            if let Some(ext) = &mut d.extension {
                self.apply_format(ext, &self.element_formats.character);
            }
            for el in &mut d.elements {
                match el {
                    DialogueElement::Parenthetical(s) => {
                        self.apply_format(s, &self.element_formats.parenthetical)
                    }
                    DialogueElement::Line(s) => {
                        self.apply_format(s, &self.element_formats.dialogue)
                    }
                }
            }
        };
        let mut element = element.clone();
        match &mut element {
            Element::Heading { slug, .. } => {
                slug.make_uppercase();
                self.apply_format(slug, &self.element_formats.scene_heading);
            }
            Element::Shot(s) => {
                s.make_uppercase();
                self.apply_format(s, &self.element_formats.shot);
            }
            Element::Transition(s) => {
                s.make_uppercase();
                self.apply_format(s, &self.element_formats.transition);
            }
            Element::Action(s) => self.apply_format(s, &self.element_formats.action),
            Element::Lyrics(s) => self.apply_format(s, &self.element_formats.lyrics),
            Element::CenteredText(s) => self.apply_format(s, &self.element_formats.centered_text),
            Element::Dialogue(d) => format_dialogue(d),
            Element::DualDialogue(left, right) => {
                format_dialogue(left);
                format_dialogue(right);
            }
            Element::Synopsis(s) => {
                for span in &mut s.elements {
                    span.set_italic();
                }
            }
            Element::Section { text, depth } => {
                text.make_uppercase();
                for span in &mut text.elements {
                    span.set_bold();
                    if *depth == 1 {
                        span.set_underline();
                    }
                }
            }
            Element::PageBreak => {}
        }
        element
    }

    fn keeps_with_next(element: &Element) -> bool {
        matches!(
            element,
            Element::Heading { .. } | Element::Shot(_) | Element::Section { .. }
        )
    }

    /// Include every heading in a chain, actual inter-element gaps, and the next
    /// block's smallest legal fragment. Explicit page breaks remain authoritative.
    fn required_group_height<'a>(
        &self,
        elements: impl Iterator<Item = &'a Span<Element>>,
        font_system: &mut FontSystem,
        layout: &LayoutInfo,
        last_speaking_character: &str,
    ) -> f32 {
        let mut height = 0.0;
        let mut elements = elements
            .filter(|span| !self.is_element_skipped(&span.inner))
            .peekable();
        while let Some(span) = elements.next() {
            let mut element = self.formatted_element(&span.inner);
            if let Element::Dialogue(d) = &mut element {
                let name = d.character.to_plain_string().trim().to_uppercase();
                let extension = d
                    .extension
                    .as_ref()
                    .map(|e| e.to_plain_string())
                    .unwrap_or_default();
                if self.auto_contd
                    && name == last_speaking_character
                    && !name.contains("CONT'D")
                    && !extension.to_uppercase().contains("CONT'D")
                {
                    d.extension = Some(if extension.is_empty() {
                        "CONT'D".into()
                    } else {
                        format!("{}) (CONT'D", extension).into()
                    });
                    if let Some(ext) = &mut d.extension {
                        self.apply_format(ext, &self.element_formats.character);
                    }
                }
            }
            if matches!(element, Element::PageBreak) {
                break;
            }
            let minimum = super::elements::min_required_height_with_space(
                &element,
                font_system,
                layout,
                layout.size.printable_height() - height,
            );
            if Self::keeps_with_next(&element) || minimum == 0.0 {
                height +=
                    super::elements::measure_full_element_height(&element, font_system, layout);
                if elements
                    .peek()
                    .is_some_and(|next| !matches!(next.inner, Element::PageBreak))
                {
                    height += LINE_HEIGHT;
                }
            } else {
                let reserve = elements
                    .peek()
                    .filter(|next| matches!(next.inner, Element::Transition(_)))
                    .map(|next| {
                        LINE_HEIGHT
                            + super::elements::measure_full_element_height(
                                &self.formatted_element(&next.inner),
                                font_system,
                                layout,
                            )
                    })
                    .unwrap_or(0.0);
                let full =
                    super::elements::measure_full_element_height(&element, font_system, layout)
                        + reserve;
                height += if reserve > 0.0 && height + full <= layout.size.printable_height() {
                    full
                } else {
                    super::elements::min_required_height_with_space(
                        &element,
                        font_system,
                        layout,
                        layout.size.printable_height() - height - reserve,
                    ) + reserve
                };
                break;
            }
        }
        height
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
        let mut residual_element_idx: Option<usize> = None;
        let mut last_speaking_character = String::new();

        let mut outline = Outline::new();
        let mut font_cache = HashMap::new();

        let mut page_breaks = Vec::new();

        let has_title_page = self.title_page && screenplay.titlepage.is_some();
        if let (true, Some(t)) = (has_title_page, &screenplay.titlepage) {
            page_idx += 1;
            write_titlepage(t, layout_info, document, font_system, &mut font_cache)?;
        }

        if has_title_page && let Some(Span { start_line, .. }) = element_iter.peek() {
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
                    encoder
                        .write_image(
                            img.as_bytes(),
                            img.width(),
                            img.height(),
                            img.color().into(),
                        )
                        .ok()?;
                    Image::from_png(png_buf.into(), false).ok()
                })()
            } else {
                std::fs::read(&self.watermark_center_image_path)
                    .ok()
                    .and_then(|bytes| {
                        let is_png = self
                            .watermark_center_image_path
                            .to_lowercase()
                            .ends_with(".png");
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
            let page_start_state = (
                element_iter.len(),
                residual_element_idx,
                residual_dialogue_idx,
                residual_dual_dialogue_idx,
            );
            let mut page = document.start_page_with(
                PageSettings::from_wh(layout_info.size.x, layout_info.size.y)
                    .ok_or_else(|| std::io::Error::other("invalid page dimensions"))?,
            );
            let mut surface = page.surface();
            let mut y_pos = top;

            if content_page_idx > 0
                && let Some(span) = element_iter.peek()
            {
                let start_line = span.start_line;
                let mut break_line = start_line;
                if let Some(res_idx) = residual_element_idx {
                    let element = self.formatted_element(&span.inner);
                    let content_and_margin = match &element {
                        Element::Action(s) => Some((s, &layout_info.margins.action)),
                        Element::Lyrics(s) => Some((s, &layout_info.margins.lyrics)),
                        Element::CenteredText(s) => Some((s, &layout_info.margins.centered)),
                        Element::Synopsis(s) => Some((s, &layout_info.margins.synopsis)),
                        _ => None,
                    };
                    if let Some((content, margin)) = content_and_margin {
                        let shaped = super::elements::shape_rich_string(
                            font_system,
                            content,
                            margin.content_width(layout_info.size),
                            super::layout::FONT_SIZE,
                            layout_info.export_font,
                            layout_info.script_fonts,
                        );
                        break_line += shaped
                            .lines
                            .get(res_idx)
                            .map(|line| line.source_line)
                            .unwrap_or(0);
                    }
                } else if let Some((el_idx, _)) = residual_dialogue_idx {
                    // Each dialogue element comes from one physical source line;
                    // a soft-wrapped continuation stays on that same source line.
                    break_line = start_line + 1 + el_idx;
                } else if let Some((el_idx, _)) = residual_dual_dialogue_idx.0 {
                    break_line = start_line + 1 + el_idx;
                } else if let Some((el_idx, _)) = residual_dual_dialogue_idx.1
                    && let Element::DualDialogue(_, right) = &span.inner
                {
                    // The second cue follows the first speech and intervening blank
                    // lines, so it cannot be anchored relative to the first cue.
                    let right_cue = span.end_line.saturating_sub(right.elements.len());
                    break_line = right_cue + 1 + el_idx;
                }
                let break_line = break_line.clamp(span.start_line, span.end_line);
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
                let mut pn_y = top - (LINE_HEIGHT * 2.0);
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

            draw_watermarks(
                &mut surface,
                font_system,
                layout_info,
                self,
                center_image.as_ref(),
            );

            let mut follows_heading = false;
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

                if Self::keeps_with_next(element) {
                    let required = self.required_group_height(
                        element_iter.clone(),
                        font_system,
                        layout_info,
                        &last_speaking_character,
                    );
                    if required > layout_info.size.printable_height() {
                        return Err(std::io::Error::new(
                            std::io::ErrorKind::InvalidData,
                            "Heading and following content cannot fit together on a page.",
                        ));
                    }
                    if required > max_y - y_pos {
                        break;
                    }
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

                let mut transition_reserve = 0.0;
                if let Some(Element::Transition(_)) = next_non_skipped {
                    transition_reserve = LINE_HEIGHT
                        + super::elements::measure_full_element_height(
                            &self.formatted_element(next_non_skipped.unwrap()),
                            font_system,
                            layout_info,
                        );
                    let pair_height = super::elements::measure_full_element_height(
                        &self.formatted_element(element),
                        font_system,
                        layout_info,
                    ) + transition_reserve;
                    if y_pos > top
                        && !follows_heading
                        && residual_element_idx.is_none()
                        && residual_dialogue_idx.is_none()
                        && residual_dual_dialogue_idx == (None, None)
                        && pair_height <= layout_info.size.printable_height()
                        && max_y - y_pos < pair_height
                    {
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
                    max_y: max_y - transition_reserve,
                    is_revised,
                    font_system,
                    font_cache: &mut font_cache,
                };

                match &element {
                    Element::Heading {
                        slug,
                        number,
                        color,
                    } => {
                        if self.scene_page_breaks && *ctx.y_position > top {
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
                                right: layout_info.size.x - layout_info.margins.heading.left + 18.0,
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
                        if residual_dialogue_idx.is_none() {
                            let char_name =
                                dialogue.character.to_plain_string().trim().to_uppercase();
                            let ext_str = dialogue
                                .extension
                                .as_ref()
                                .map(|e| e.to_plain_string().to_uppercase())
                                .unwrap_or_default();
                            let has_contd =
                                ext_str.contains("CONT'D") || char_name.contains("CONT'D");
                            if self.auto_contd
                                && !char_name.is_empty()
                                && char_name == last_speaking_character
                                && !has_contd
                            {
                                if let Some(ext) = &dialogue.extension {
                                    dialogue_styled.extension =
                                        Some(format!("{}) (CONT'D", ext.to_plain_string()).into());
                                } else {
                                    dialogue_styled.extension = Some("CONT'D".into());
                                }
                            }
                        }
                        self.apply_format(
                            &mut dialogue_styled.character,
                            &self.element_formats.character,
                        );
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
                        let dialogue_start_y = *ctx.y_position;
                        let premature_exit = write_dialogue(
                            &mut ctx,
                            &dialogue_styled,
                            &mut residual_dialogue_idx,
                            &layout_info.margins.dialogue,
                            follows_heading,
                        )?;
                        if *ctx.y_position > dialogue_start_y {
                            last_speaking_character =
                                dialogue.character.to_plain_string().trim().to_uppercase();
                        }
                        if residual_dialogue_idx.is_some() || premature_exit {
                            break;
                        }
                    }
                    Element::DualDialogue(dialogue0, dialogue1) => {
                        last_speaking_character = String::new();
                        let saved_y = *ctx.y_position;
                        let mut premature_exit = false;

                        let mut d0_styled = dialogue0.clone();
                        self.apply_format(
                            &mut d0_styled.character,
                            &self.element_formats.character,
                        );
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
                        self.apply_format(
                            &mut d1_styled.character,
                            &self.element_formats.character,
                        );
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
                            let min_dual_height = super::elements::min_required_height_with_space(
                                &Element::DualDialogue(d0_styled.clone(), d1_styled.clone()),
                                ctx.font_system,
                                layout_info,
                                if follows_heading {
                                    ctx.max_y - *ctx.y_position
                                } else {
                                    ctx.max_y - top
                                },
                            );
                            let remaining = ctx.max_y - *ctx.y_position;
                            if remaining < min_dual_height {
                                break;
                            }
                        }

                        let continuing = residual_dual_dialogue_idx != (None, None);
                        let draw_left = !continuing || residual_dual_dialogue_idx.0.is_some();
                        let draw_right = !continuing || residual_dual_dialogue_idx.1.is_some();
                        if draw_left {
                            premature_exit |= write_dialogue(
                                &mut ctx,
                                &d0_styled,
                                &mut residual_dual_dialogue_idx.0,
                                &layout_info.margins.dual_dialogue.left,
                                follows_heading,
                            )?;
                        }
                        let left_end_y = *ctx.y_position;
                        *ctx.y_position = saved_y;
                        if draw_right {
                            premature_exit |= write_dialogue(
                                &mut ctx,
                                &d1_styled,
                                &mut residual_dual_dialogue_idx.1,
                                &layout_info.margins.dual_dialogue.right,
                                follows_heading,
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

                follows_heading = Self::keeps_with_next(element);
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
            if page_start_state
                == (
                    element_iter.len(),
                    residual_element_idx,
                    residual_dialogue_idx,
                    residual_dual_dialogue_idx,
                )
            {
                return Err(std::io::Error::new(
                    std::io::ErrorKind::InvalidData,
                    "Screenplay element cannot fit on a page with the selected font and margins.",
                ));
            }
            page_idx += 1;
        }

        document.set_outline(outline);

        Ok(page_breaks)
    }

    pub fn get_page_breaks(&self, screenplay: &Screenplay) -> std::io::Result<Vec<usize>> {
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

        let layout_info = LayoutInfo {
            size: &self.paper_size,
            fonts: &all_fonts,
            export_font: &self.export_font,
            revised_lines: &self.revised_lines,
            margins: get_margins(&self.paper_size),
            script_fonts: &self.script_fonts,
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

fn draw_watermarks(
    surface: &mut krilla::surface::Surface,
    font_system: &mut FontSystem,
    layout_info: &LayoutInfo,
    exporter: &PdfExporter,
    center_image: Option<&Image>,
) {
    let page_width = layout_info.size.x;
    let page_height = layout_info.size.y;
    let font_size = 10.0;

    // 1. Header Watermark
    if exporter.watermark_header_enabled
        && !exporter.watermark_header_text.is_empty()
        && let Some(opacity_norm) =
            krilla::num::NormalizedF32::new(exporter.watermark_header_opacity)
    {
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

    // 2. Footer Watermark
    if exporter.watermark_footer_enabled
        && !exporter.watermark_footer_text.is_empty()
        && let Some(opacity_norm) =
            krilla::num::NormalizedF32::new(exporter.watermark_footer_opacity)
    {
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
            } else if exporter.watermark_center_type == "text"
                && !exporter.watermark_center_text.is_empty()
            {
                // Draw Text Center Watermark
                let font = layout_info.fonts.courier.bold.clone();
                let center_font_size = 48.0;
                let width = measure_text_width(
                    font_system,
                    &exporter.watermark_center_text,
                    center_font_size,
                );

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
    fn wrapped_page_breaks_reference_real_source_lines() {
        let exporter = PdfExporter {
            paper_size: super::super::layout::LETTER,
            title_page: false,
            ..Default::default()
        };
        let action = format!("!{}", "action words ".repeat(2000));
        let dialogue = format!("BOB\n{}", "spoken words ".repeat(2000));
        let right_dialogue = format!(
            "BOB\nLeft speech.\n\nALICE ^\n{}",
            "right speech ".repeat(2000)
        );
        for (source, expected_line) in [(action, 1), (dialogue, 2), (right_dialogue, 5)] {
            let screenplay = crate::pdf::parse(&source);
            let breaks = exporter.get_page_breaks(&screenplay).unwrap();
            assert!(breaks.len() > 1, "fixture must span several pages");
            assert!(
                breaks.iter().all(|line| *line == expected_line),
                "expected source line {expected_line}, got {breaks:?}"
            );
        }
    }

    #[test]
    fn orphan_heading_moves_with_three_line_action_in_actual_export_pagination() {
        for (paper, count) in [
            (super::super::layout::LETTER, 25),
            (super::super::layout::A4, 27),
        ] {
            let source = format!(
                "{}INT. ROOM - DAY\n\nOne action line.\nTwo action lines.\nThree action lines.\n",
                "Filler paragraph.\n\n".repeat(count)
            );
            let screenplay = crate::pdf::parse(&source);
            let heading_line = screenplay
                .elements
                .iter()
                .find(|span| matches!(span.inner, Element::Heading { .. }))
                .unwrap()
                .start_line;
            let exporter = PdfExporter {
                paper_size: paper,
                title_page: false,
                ..Default::default()
            };
            assert_eq!(
                exporter.get_page_breaks(&screenplay).unwrap(),
                [heading_line]
            );
        }
    }

    #[test]
    fn oversized_unsplittable_heading_returns_error_instead_of_empty_page_loop() {
        let screenplay = crate::pdf::parse(&format!(
            ".{}\n\nAction.\n",
            "OVERLONG HEADING ".repeat(1000)
        ));
        let exporter = PdfExporter {
            title_page: false,
            ..Default::default()
        };
        assert!(exporter.get_page_breaks(&screenplay).is_err());
    }

    #[test]
    fn test_logo_png_decode() {
        let fountain_text = r#"
.SCENE 1
CHARACTER
Hello world.
"#;
        let screenplay = crate::pdf::parse(fountain_text);
        let tmp = std::env::temp_dir().join("actone-test-logo.png");
        std::fs::write(&tmp, include_bytes!("../../../../src/assets/logo.png")).unwrap();
        let exporter = PdfExporter {
            watermark_center_enabled: true,
            watermark_center_type: "image".to_string(),
            watermark_center_image_path: tmp.to_string_lossy().to_string(),
            watermark_center_opacity: 0.4,
            ..Default::default()
        };
        let mut out = Vec::new();
        let res = exporter.export(&screenplay, &mut out);
        let _ = std::fs::remove_file(&tmp);
        assert!(res.is_ok(), "logo watermark export failed: {:?}", res.err());
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

    #[test]
    fn test_scene_page_breaks() {
        let mut text = String::from(".SCENE 1\n\n");
        for i in 1..=40 {
            text.push_str(&format!("Action line {}.\n", i));
        }
        text.push_str("\n.SCENE 2\n\nAction line 41.\n");
        let screenplay = crate::pdf::parse(&text);

        let scene2_line = screenplay
            .elements
            .iter()
            .filter(|span| matches!(&span.inner, Element::Heading { .. }))
            .nth(1)
            .expect("expected two scene headings")
            .start_line;

        let exporter_off = PdfExporter {
            title_page: false,
            scene_page_breaks: false,
            ..Default::default()
        };
        let breaks_off = exporter_off.get_page_breaks(&screenplay).unwrap();

        let exporter_on = PdfExporter {
            title_page: false,
            scene_page_breaks: true,
            ..Default::default()
        };
        let breaks_on = exporter_on.get_page_breaks(&screenplay).unwrap();

        assert!(
            breaks_off.iter().all(|b| *b != scene2_line),
            "scene 2 should not force a page break when option is off, got breaks {:?}",
            breaks_off
        );
        assert!(
            breaks_on.contains(&scene2_line),
            "scene 2 should start a new page when option is on, got breaks {:?}",
            breaks_on
        );
        assert!(breaks_on.len() > breaks_off.len());
    }

    #[test]
    fn test_auto_contd_export() {
        let content =
            "INT. ROOM - DAY\n\nJOHN\nFirst line.\n\nAction happens.\n\nJOHN\nSecond line.";
        let screenplay = crate::pdf::parse(content);

        let exporter_on = PdfExporter {
            title_page: false,
            auto_contd: true,
            ..Default::default()
        };
        let mut out_on = Vec::new();
        assert!(exporter_on.export(&screenplay, &mut out_on).is_ok());

        let exporter_off = PdfExporter {
            title_page: false,
            auto_contd: false,
            ..Default::default()
        };
        let mut out_off = Vec::new();
        assert!(exporter_off.export(&screenplay, &mut out_off).is_ok());
    }

    #[test]
    fn test_bee_detective_export() {
        let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../Test-Files/BeeDetective.fountain");
        let content = std::fs::read_to_string(path).expect("Read BeeDetective.fountain failed");
        let screenplay = crate::pdf::parse(&content);
        let exporter = PdfExporter {
            title_page: true,
            ..Default::default()
        };
        let mut out = Vec::new();
        let res = exporter.export(&screenplay, &mut out);
        if let Err(e) = res {
            panic!("test_bee_detective_export failed with error: {:?}", e);
        }
    }

    #[test]
    // Extracted geometry and painting assertions run in tests/pdf-layout/check.mjs.
    fn test_dual_dialogue_export_smoke() {
        let dual_dialogue = r#"
.SCENE 1

BOB
I speak on the left side of the screen.

ALICE ^
And I speak simultaneously on the right!
"#;
        let screenplay = crate::pdf::parse(dual_dialogue);
        let exporter = PdfExporter {
            title_page: false,
            ..Default::default()
        };
        let mut out = Vec::new();
        let res = exporter.export(&screenplay, &mut out);
        assert!(
            res.is_ok(),
            "Dual dialogue must export cleanly: {:?}",
            res.err()
        );
        let breaks = exporter.get_page_breaks(&screenplay).unwrap();
        assert_eq!(
            breaks.len(),
            0,
            "Short dual dialogue must fit within a single page"
        );

        let out_str = String::from_utf8_lossy(&out);
        assert!(out.starts_with(b"%PDF-"), "Must have PDF magic bytes");
        assert!(
            out_str.contains("/Type /Page"),
            "PDF must contain /Type /Page object"
        );
        assert!(
            out_str.contains("/MediaBox"),
            "PDF must define standard page MediaBox"
        );
    }

    #[test]
    fn test_watermark_center_text_export_smoke() {
        let text = ".SCENE 1\n\nACTION LINE.\n";
        let screenplay = crate::pdf::parse(text);
        let exporter = PdfExporter {
            title_page: false,
            watermark_center_enabled: true,
            watermark_center_text: "CONFIDENTIAL REVIEW".to_string(),
            watermark_center_opacity: 0.35,
            ..Default::default()
        };
        let mut out = Vec::new();
        let res = exporter.export(&screenplay, &mut out);
        assert!(
            res.is_ok(),
            "Watermarked export must succeed: {:?}",
            res.err()
        );
        assert!(
            out.len() > 1000,
            "PDF with watermark must generate substantive body"
        );
        let out_str = String::from_utf8_lossy(&out);
        assert!(
            out.starts_with(b"%PDF-"),
            "Watermark PDF must have valid PDF header"
        );
        assert!(
            out_str.contains("/Type /Page"),
            "Watermarked document must contain page object"
        );
    }
}
