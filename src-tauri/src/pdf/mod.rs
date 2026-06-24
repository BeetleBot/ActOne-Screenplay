mod export;
mod fdx;
mod parser;

pub mod rich_string;
pub mod screenplay;
pub use self::screenplay::Screenplay;

pub use self::export::Exporter;
pub use self::export::ExporterExt;
pub use self::export::layout::A4;
pub use self::export::layout::LETTER;
pub use self::export::layout::PaperSize;
pub use self::export::pdf::PdfExporter;
pub use self::fdx::export as export_to_fdx;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, serde::Serialize, serde::Deserialize)]
pub enum MirrorOption {
    #[default]
    Off,
    LeftSide,
    Mirror,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ElementFormat {
    pub bold: bool,
    pub italic: bool,
    pub underline: bool,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ElementFormats {
    pub scene_heading: ElementFormat,
    pub action: ElementFormat,
    pub character: ElementFormat,
    pub parenthetical: ElementFormat,
    pub dialogue: ElementFormat,
    pub lyrics: ElementFormat,
    pub transition: ElementFormat,
    pub shot: ElementFormat,
    pub centered_text: ElementFormat,
}

impl Default for ElementFormats {
    fn default() -> Self {
        Self {
            scene_heading: ElementFormat { bold: true, italic: false, underline: false },
            action: ElementFormat { bold: false, italic: false, underline: false },
            character: ElementFormat { bold: false, italic: false, underline: false },
            parenthetical: ElementFormat { bold: false, italic: false, underline: false },
            dialogue: ElementFormat { bold: false, italic: false, underline: false },
            lyrics: ElementFormat { bold: false, italic: false, underline: false },
            transition: ElementFormat { bold: false, italic: false, underline: false },
            shot: ElementFormat { bold: true, italic: false, underline: false },
            centered_text: ElementFormat { bold: false, italic: false, underline: false },
        }
    }
}

pub struct PdfExportConfig {
    pub paper_size: PaperSize,
    pub element_formats: ElementFormats,
    pub mirror_scene_numbers: MirrorOption,
    pub export_sections: bool,
    pub export_synopses: bool,
    pub export_font: String,
    pub revised_lines: Vec<bool>,
    pub export_title_page: bool,
    pub export_scene_colors: bool,
}

pub fn parse(src: &str) -> Screenplay {
    parser::parse(src)
}

pub fn export_to_pdf(
    fountain_text: &str,
    path: &std::path::Path,
    config: PdfExportConfig,
) -> std::io::Result<()> {
    let screenplay = parse(fountain_text);
    let exporter = PdfExporter {
        paper_size: config.paper_size,
        element_formats: config.element_formats,
        mirror_scene_numbers: config.mirror_scene_numbers,
        sections: config.export_sections,
        synopses: config.export_synopses,
        export_font: config.export_font,
        revised_lines: config.revised_lines,
        title_page: config.export_title_page,
        scene_colors: config.export_scene_colors,
    };
    exporter.export_to_file(&screenplay, path)
}

pub fn generate_pdf_bytes(
    fountain_text: &str,
    config: PdfExportConfig,
) -> std::io::Result<Vec<u8>> {
    let screenplay = parse(fountain_text);
    let exporter = PdfExporter {
        paper_size: config.paper_size,
        element_formats: config.element_formats,
        mirror_scene_numbers: config.mirror_scene_numbers,
        sections: config.export_sections,
        synopses: config.export_synopses,
        export_font: config.export_font,
        revised_lines: config.revised_lines,
        title_page: config.export_title_page,
        scene_colors: config.export_scene_colors,
    };
    let mut bytes = std::io::Cursor::new(Vec::new());
    exporter.export(&screenplay, &mut bytes)?;
    Ok(bytes.into_inner())
}

pub fn get_page_breaks(
    fountain_text: &str,
    config: PdfExportConfig,
) -> std::io::Result<Vec<usize>> {
    let screenplay = parse(fountain_text);
    let exporter = PdfExporter {
        paper_size: config.paper_size,
        element_formats: config.element_formats,
        mirror_scene_numbers: config.mirror_scene_numbers,
        sections: config.export_sections,
        synopses: config.export_synopses,
        export_font: config.export_font,
        revised_lines: config.revised_lines,
        title_page: config.export_title_page,
        scene_colors: config.export_scene_colors,
    };
    exporter.get_page_breaks(&screenplay)
}
