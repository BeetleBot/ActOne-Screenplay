use actone_lib::pdf::{self, Exporter, PdfExporter};
fn main() {
    let input = std::path::PathBuf::from(std::env::args_os().nth(1).expect("input Fountain file"));
    let output = std::path::PathBuf::from(std::env::args_os().nth(2).expect("output PDF file"));
    let source = std::fs::read_to_string(&input)
        .unwrap()
        .replace("\r\n", "\n");
    let exporter = PdfExporter {
        paper_size: pdf::LETTER,
        export_font: "courier_prime".into(),
        title_page: true,
        ..Default::default()
    };
    let mut bytes = Vec::new();
    exporter.export(&pdf::parse(&source), &mut bytes).unwrap();
    std::fs::write(&output, &bytes).unwrap();
    println!("{}: {} bytes", output.display(), bytes.len());
}
