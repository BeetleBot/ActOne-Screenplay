use actone_lib::pdf::{self, Exporter, PdfExporter};
fn main() {
    let directory = std::path::PathBuf::from(std::env::args_os().nth(1).expect("output directory"));
    std::fs::create_dir_all(&directory).unwrap();
    let source = ".SCENE ONE\n\nBOB\nLeft dialogue.\n\nALICE ^\nRight dialogue.\n";
    for (name, paper, watermark) in [
        ("letter", pdf::LETTER, false),
        ("a4", pdf::A4, false),
        ("watermark", pdf::LETTER, true),
    ] {
        let exporter = PdfExporter {
            paper_size: paper,
            title_page: false,
            watermark_center_enabled: watermark,
            watermark_center_type: "text".into(),
            watermark_center_text: "CONFIDENTIAL".into(),
            watermark_center_opacity: 0.35,
            ..Default::default()
        };
        let mut bytes = Vec::new();
        exporter.export(&pdf::parse(source), &mut bytes).unwrap();
        std::fs::write(directory.join(format!("{name}.pdf")), bytes).unwrap();
    }
}
