mod export;
mod parser;

pub mod rich_string;
pub mod screenplay;
pub use self::screenplay::Screenplay;

pub use self::export::Exporter;
pub use self::export::ExporterExt;
pub use self::export::pdf::A4;
pub use self::export::pdf::LETTER;
pub use self::export::pdf::PaperSize;
pub use self::export::pdf::PdfExporter;

/// Parses a Fountain source string into a [Screenplay] structure.
///
/// Preprocesses the source text by removing
/// comments and normalizing tabs to spaces.
pub fn parse(src: impl AsRef<str>) -> Screenplay {
    parser::parse(src.as_ref())
}

/// Parses a Fountain source file into a [Screenplay] structure.
pub fn parse_reader(mut r: impl std::io::Read) -> std::io::Result<Screenplay> {
    let mut src = String::new();
    r.read_to_string(&mut src)?;
    Ok(parser::parse(&src))
}

pub struct PdfExportConfig {
    pub paper_size: PaperSize,
    pub bold_scene_headings: bool,
    pub mirror_scene_numbers: crate::config::MirrorOption,
    pub export_sections: bool,
    pub export_synopses: bool,
    pub export_font: String,
    pub revised_lines: Vec<bool>,
}

/// Exports Fountain text to a PDF file.
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
    };
    exporter.export_to_file(&screenplay, path)
}
