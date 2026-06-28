use std::io::{Cursor, Write};
use zip::write::SimpleFileOptions;
use zip::ZipWriter;

pub fn pack(xml: &str) -> Vec<u8> {
    let mut buffer = Cursor::new(Vec::new());
    {
        let mut zip = ZipWriter::new(&mut buffer);
        let options = SimpleFileOptions::default();
        zip.start_file("document.xml", options)
            .expect("Failed to create document.xml in fadein archive");
        zip.write_all(xml.as_bytes())
            .expect("Failed to write XML to fadein archive");
        zip.finish().expect("Failed to finalize fadein archive");
    }
    buffer.into_inner()
}
