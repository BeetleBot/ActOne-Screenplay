use actone_lib::actone::*;
pub use actone_lib::file_formats;
use serde_json::{Value, json};

#[path = "../src/actone/ipc_tests.rs"]
mod ipc_tests;

#[test]
fn screenplay_pdf_bytes_match_existing_file_renderer() {
    use actone_lib::pdf;
    let dir = std::env::temp_dir().join(format!("actone_pdf_parity_{}",std::process::id()));
    std::fs::create_dir_all(&dir).unwrap();
    let source = "Title: Compatibility\nAuthor: ActOne\n\n# ACT ONE\n\n= A synopsis\n\nINT. ROOM - DAY #1# [[blue]]\n\n@ALICE\n(quietly)\nHello, **world**.\n\n@BOB ^\nவணக்கம். नमस्ते.\n\n> CUT TO:\n\nEXT. STREET - NIGHT #2#\n\nA final action.\n";
    for letter in [true,false] {
        for sans in [true,false] {
            let config = || pdf::PdfExportConfig {
                paper_size: if letter {pdf::LETTER} else {pdf::A4},element_formats:pdf::ElementFormats::default(),
                mirror_scene_numbers:pdf::MirrorOption::Mirror, export_sections:true,export_synopses:true,
                export_font:if sans {"courier_prime_sans"} else {"courier_prime"}.into(),revised_lines:vec![],
                export_title_page:true,export_scene_colors:true,scene_page_breaks:true,auto_contd:true,
                watermark_header_enabled:true,watermark_header_text:"Private draft".into(),watermark_header_opacity:0.4,
                watermark_footer_enabled:true,watermark_footer_text:"Review copy".into(),watermark_footer_opacity:0.3,
                watermark_center_enabled:true,watermark_center_type:"text".into(),watermark_center_text:"DRAFT".into(),
                watermark_center_image_path:String::new(),watermark_center_opacity:0.2,watermark_center_grayscale:false,
                script_fonts:Default::default(),
            };
            let path = dir.join(format!("{letter}-{sans}.pdf"));
            pdf::export_to_pdf(source,&path,config()).unwrap();
            let generated = pdf::generate_pdf_bytes(source,config()).unwrap();
            assert!(generated == std::fs::read(path).unwrap(),"PDF rendering changed: letter={letter}, sans={sans}");
            assert!(generated.starts_with(b"%PDF-"));
        }
    }
    std::fs::remove_dir_all(dir).unwrap();
}

#[test]
fn prose_pdf_memory_and_existing_file_output_match() {
    use actone_lib::pdf::ProsePdfExporter;
    let source = "# Notes\n\nதமிழ் नमस्ते **bold** and *italic*.\n\n| Character | Role |\n|---|---|\n| Alice | Lead |\n\n[Reference](https://example.com)\n\n```text\nA code block\n```\n";
    let path = std::env::temp_dir().join(format!("actone_prose_parity_{}.pdf",std::process::id()));
    let exporter = ProsePdfExporter::default();
    // Prose's public renderer accepts a Write sink, exactly as used by native export.
    let mut old = std::fs::File::create(&path).unwrap();
    exporter.export(source,&mut old).unwrap();
    drop(old);
    let mut bytes = Vec::new();
    exporter.export(source,&mut bytes).unwrap();
    assert!(bytes == std::fs::read(&path).unwrap(), "Prose PDF rendering changed");
    std::fs::remove_file(path).unwrap();
}
