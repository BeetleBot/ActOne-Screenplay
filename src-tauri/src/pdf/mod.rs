mod export;
pub mod fadein;
pub mod fadein_pack;
mod fdx;
mod parser;
pub mod prose;
pub use self::prose::export::ProsePdfExporter;
pub mod rich_string;
pub mod screenplay;
pub use self::screenplay::Screenplay;

use std::collections::HashMap;

pub use self::export::Exporter;
pub use self::export::ExporterExt;
pub use self::export::layout::A4;
pub use self::export::layout::LETTER;
pub use self::export::layout::PaperSize;
pub use self::export::pdf::PdfExporter;
pub use self::fadein::export as export_to_fadein;
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
            scene_heading: ElementFormat {
                bold: true,
                italic: false,
                underline: false,
            },
            action: ElementFormat {
                bold: false,
                italic: false,
                underline: false,
            },
            character: ElementFormat {
                bold: false,
                italic: false,
                underline: false,
            },
            parenthetical: ElementFormat {
                bold: false,
                italic: false,
                underline: false,
            },
            dialogue: ElementFormat {
                bold: false,
                italic: false,
                underline: false,
            },
            lyrics: ElementFormat {
                bold: false,
                italic: false,
                underline: false,
            },
            transition: ElementFormat {
                bold: false,
                italic: false,
                underline: false,
            },
            shot: ElementFormat {
                bold: true,
                italic: false,
                underline: false,
            },
            centered_text: ElementFormat {
                bold: false,
                italic: false,
                underline: false,
            },
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
    pub script_fonts: HashMap<String, String>,
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
        scene_page_breaks: config.scene_page_breaks,
        watermark_header_enabled: config.watermark_header_enabled,
        watermark_header_text: config.watermark_header_text,
        watermark_header_opacity: config.watermark_header_opacity,
        watermark_footer_enabled: config.watermark_footer_enabled,
        watermark_footer_text: config.watermark_footer_text,
        watermark_footer_opacity: config.watermark_footer_opacity,
        watermark_center_enabled: config.watermark_center_enabled,
        watermark_center_type: config.watermark_center_type,
        watermark_center_text: config.watermark_center_text,
        watermark_center_image_path: config.watermark_center_image_path,
        watermark_center_opacity: config.watermark_center_opacity,
        watermark_center_grayscale: config.watermark_center_grayscale,
        script_fonts: config.script_fonts.clone(),
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
        scene_page_breaks: config.scene_page_breaks,
        watermark_header_enabled: config.watermark_header_enabled,
        watermark_header_text: config.watermark_header_text,
        watermark_header_opacity: config.watermark_header_opacity,
        watermark_footer_enabled: config.watermark_footer_enabled,
        watermark_footer_text: config.watermark_footer_text,
        watermark_footer_opacity: config.watermark_footer_opacity,
        watermark_center_enabled: config.watermark_center_enabled,
        watermark_center_type: config.watermark_center_type,
        watermark_center_text: config.watermark_center_text,
        watermark_center_image_path: config.watermark_center_image_path,
        watermark_center_opacity: config.watermark_center_opacity,
        watermark_center_grayscale: config.watermark_center_grayscale,
        script_fonts: config.script_fonts.clone(),
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
        scene_page_breaks: config.scene_page_breaks,
        watermark_header_enabled: config.watermark_header_enabled,
        watermark_header_text: config.watermark_header_text,
        watermark_header_opacity: config.watermark_header_opacity,
        watermark_footer_enabled: config.watermark_footer_enabled,
        watermark_footer_text: config.watermark_footer_text,
        watermark_footer_opacity: config.watermark_footer_opacity,
        watermark_center_enabled: config.watermark_center_enabled,
        watermark_center_type: config.watermark_center_type,
        watermark_center_text: config.watermark_center_text,
        watermark_center_image_path: config.watermark_center_image_path,
        watermark_center_opacity: config.watermark_center_opacity,
        watermark_center_grayscale: config.watermark_center_grayscale,
        script_fonts: config.script_fonts.clone(),
    };
    exporter.get_page_breaks(&screenplay)
}
