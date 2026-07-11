use std::io::{Cursor, Write};
use zip::write::SimpleFileOptions;
use zip::ZipWriter;

pub fn pack(xml: &str) -> Result<Vec<u8>, String> {
    let mut buffer = Cursor::new(Vec::new());
    {
        let mut zip = ZipWriter::new(&mut buffer);
        let options = SimpleFileOptions::default();
        zip.start_file("document.xml", options)
            .map_err(|e| e.to_string())?;
        zip.write_all(xml.as_bytes())
            .map_err(|e| e.to_string())?;
        zip.finish().map_err(|e| e.to_string())?;
    }
    Ok(buffer.into_inner())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pack_returns_ok_for_valid_xml() {
        let result = pack("<document><paragraph>Hi</paragraph></document>");
        assert!(result.is_ok());
        let bytes = result.unwrap();
        assert!(bytes.len() > 4);
        assert_eq!(&bytes[0..2], b"PK");
    }
}
