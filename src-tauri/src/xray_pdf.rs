//! Compose the visual X-Ray atlas from bounded, locally rendered PNG pages.
use base64::Engine;
use krilla::{Document, geom::Size, image::Image, page::PageSettings};

pub fn generate(pages: Vec<String>) -> Result<Vec<u8>, String> {
    if pages.is_empty() || pages.len() > 120 {
        return Err("The atlas must contain between 1 and 120 pages.".into());
    }
    if pages.iter().map(String::len).sum::<usize>() > 128 * 1024 * 1024 {
        return Err("The atlas is too large to export in one file.".into());
    }
    let mut document = Document::new();
    for encoded in pages {
        let bytes = base64::engine::general_purpose::STANDARD.decode(encoded)
            .map_err(|_| "An atlas page could not be decoded.")?;
        // Read dimensions before decoding image pixels, avoiding oversized image allocations.
        let reader = image::ImageReader::with_format(std::io::Cursor::new(&bytes), image::ImageFormat::Png);
        let (width, height) = reader.into_dimensions().map_err(|_| "An atlas page is not a valid PNG.")?;
        if width == 0 || height == 0 || width > 2000 || height > 3000 {
            return Err("An atlas page has unsupported dimensions.".into());
        }
        let image = Image::from_png(bytes.into(), false).map_err(|_| "An atlas page could not be rendered.")?;
        let mut page = document.start_page_with(PageSettings::from_wh(595.0, 841.5).unwrap());
        let mut surface = page.surface();
        surface.draw_image(image, Size::from_wh(595.0, 841.5).unwrap());
        surface.finish();
        page.finish();
    }
    document.finish().map_err(|_| "The atlas PDF could not be created.".into())
}

#[tauri::command]
pub async fn export_xray_pdf(pages: Vec<String>, file_name: String) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let bytes = generate(pages)?;
        let stem: String = file_name.chars().map(|c| if c.is_control() || "<>:\"/\\|?*".contains(c) { '_' } else { c }).take(100).collect();
        let name = if stem.trim().is_empty() { "Untitled" } else { stem.trim() };
        let Some(mut path) = rfd::FileDialog::new().add_filter("PDF analysis", &["pdf"])
            .set_file_name(format!("{name} - X-Ray.pdf")).save_file() else { return Ok(None); };
        path.set_extension("pdf");
        crate::write_file_atomically(&path, bytes).map_err(|_| "The PDF could not be saved. Choose another location and try again.".to_string())?;
        Ok(Some(path.to_string_lossy().into_owned()))
    }).await.map_err(|_| "The PDF export could not finish.".to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;
    fn png() -> String {
        let image = image::DynamicImage::new_rgb8(8, 8);
        let mut bytes = std::io::Cursor::new(Vec::new());
        image.write_to(&mut bytes, image::ImageFormat::Png).unwrap();
        base64::engine::general_purpose::STANDARD.encode(bytes.into_inner())
    }
    #[test]
    fn creates_a_multipage_pdf() {
        let pdf = generate(vec![png(), png()]).unwrap();
        assert!(pdf.starts_with(b"%PDF-"));
        assert!(pdf.ends_with(b"%%EOF"));
        assert!(pdf.len() > 100);
    }
    #[test]
    fn rejects_empty_invalid_and_excessive_inputs() {
        assert!(generate(vec![]).is_err());
        assert!(generate(vec!["not base64".into()]).is_err());
        assert!(generate(vec!["YWJj".into()]).is_err());
        assert!(generate(vec![String::new(); 121]).is_err());
    }
}
