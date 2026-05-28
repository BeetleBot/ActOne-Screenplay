#![allow(dead_code)]

mod export;
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

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, serde::Serialize, serde::Deserialize)]
pub enum MirrorOption {
    Always,
    ExportOnly,
    #[default]
    Off,
}

pub struct PdfExportConfig {
    pub paper_size: PaperSize,
    pub bold_scene_headings: bool,
    pub mirror_scene_numbers: MirrorOption,
    pub export_sections: bool,
    pub export_synopses: bool,
    pub export_font: String,
    pub revised_lines: Vec<bool>,
    pub export_title_page: bool,
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
        bold_scene_headings: config.bold_scene_headings,
        mirror_scene_numbers: config.mirror_scene_numbers,
        sections: config.export_sections,
        synopses: config.export_synopses,
        export_font: config.export_font,
        revised_lines: config.revised_lines,
        title_page: config.export_title_page,
    };
    exporter.export_to_file(&screenplay, path)
}
