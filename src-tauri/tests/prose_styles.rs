use actone_lib::pdf::{ProsePdfExporter, prose::styles::prose_style};

const STYLES: [&str; 5] = ["classic", "manuscript", "treatment", "modern", "literary"];

#[test]
fn prose_styles_embed_their_fonts_and_paginate_the_rendered_pdf() {
    let paragraph =
        "The rain had stopped by morning. **Mira opened the door**, and *listened to the street*. "
            .repeat(6);
    let source = format!(
        "# The Quiet Street\n\n## Morning\n\n{}\n\n> A voice from the courtyard.\n\n- A letter\n- A key\n\n| Name | Role |\n| --- | --- |\n| Mira | Traveller |\n\n```text\nA note on the table\n```\n\n{}",
        paragraph,
        (paragraph.clone() + "\n\n").repeat(25)
    );
    let pages = regex::Regex::new(r"/Type\s*/Page\b").unwrap();
    let mut page_counts = Vec::new();
    let mut layouts = Vec::new();
    for id in STYLES {
        let exporter = ProsePdfExporter {
            prose_style: Some(id.into()),
            ..Default::default()
        };
        let mut bytes = Vec::new();
        let breaks = exporter
            .export_with_page_breaks(&source, &mut bytes)
            .unwrap();
        if let Ok(directory) = std::env::var("ACTONE_PROSE_STYLE_SAMPLES") {
            std::fs::create_dir_all(&directory).unwrap();
            std::fs::write(
                std::path::Path::new(&directory).join(format!("{id}.pdf")),
                &bytes,
            )
            .unwrap();
        }
        let pdf = String::from_utf8_lossy(&bytes);
        let page_count = pages.find_iter(&pdf).count();
        assert_eq!(page_count, breaks.len() + 1, "{id}: rendered pagination");
        assert!(page_count > 1);
        let font = prose_style(id)
            .font
            .replace("courier_prime", "CourierPrime")
            .replace(' ', "");
        assert!(pdf.contains(&font), "{id}: missing embedded font {font}");
        assert!(
            breaks
                .iter()
                .all(|line| *line > 0 && *line <= source.lines().count())
        );
        let mut preview_bytes = Vec::new();
        exporter.export(&source, &mut preview_bytes).unwrap();
        assert_eq!(bytes, preview_bytes, "{id}: preview/save render parity");
        page_counts.push(page_count);
        layouts.push(breaks);
    }
    assert!(
        page_counts[1] > page_counts[0],
        "Manuscript must use more pages than Classic"
    );
    assert_ne!(
        layouts[3], layouts[4],
        "Modern and Literary must have distinct page boundaries"
    );
}

#[test]
fn classic_is_default_and_empty_documents_have_one_page() {
    let exporter = ProsePdfExporter::default();
    assert_eq!(exporter.prose_style.as_deref(), Some("classic"));
    assert!(
        exporter
            .export_with_page_breaks("", &mut Vec::new())
            .unwrap()
            .is_empty()
    );
}

fn image_url(format: image::ImageFormat, width: u32, height: u32) -> String {
    use base64::Engine;
    let image = image::DynamicImage::ImageRgb8(image::RgbImage::from_fn(width, height, |x, y| {
        if x < width / 2 {
            image::Rgb([30, 90, 170])
        } else if y < height / 2 {
            image::Rgb([230, 165, 60])
        } else {
            image::Rgb([70, 150, 100])
        }
    }));
    let mut bytes = std::io::Cursor::new(Vec::new());
    image.write_to(&mut bytes, format).unwrap();
    let mime = match format {
        image::ImageFormat::Jpeg => "jpeg",
        image::ImageFormat::WebP => "webp",
        _ => "png",
    };
    format!(
        "data:image/{mime};base64,{}",
        base64::engine::general_purpose::STANDARD.encode(bytes.into_inner())
    )
}

#[test]
fn all_styles_embed_images_and_move_oversize_portraits_to_a_fresh_page() {
    let wide = image_url(image::ImageFormat::Png, 1200, 400);
    let tall = image_url(image::ImageFormat::Jpeg, 400, 1600);
    let small = image_url(image::ImageFormat::WebP, 160, 80);
    let source = format!(
        "# Image Layout\n\n![Landscape]({wide})\n\nA landscape image above.\n\n![Portrait]({tall})\n\n![Small image]({small})\n\nText after the images."
    );
    for style in STYLES {
        let exporter = ProsePdfExporter {
            prose_style: Some(style.into()),
            ..Default::default()
        };
        let mut bytes = Vec::new();
        let breaks = exporter
            .export_with_page_breaks(&source, &mut bytes)
            .unwrap();
        let pdf = String::from_utf8_lossy(&bytes);
        assert!(
            pdf.contains("/Subtype /Image"),
            "{style}: image data must be embedded"
        );
        assert!(
            breaks.len() >= 1,
            "{style}: full-height portrait must move to another page"
        );
        let mut preview = Vec::new();
        exporter.export(&source, &mut preview).unwrap();
        assert_eq!(bytes, preview, "{style}: image preview/save parity");
        if let Ok(directory) = std::env::var("ACTONE_PROSE_STYLE_SAMPLES") {
            std::fs::write(
                std::path::Path::new(&directory).join(format!("{style}-images.pdf")),
                bytes,
            )
            .unwrap();
        }
    }
}

#[test]
fn corrupt_imported_images_return_an_error() {
    let exporter = ProsePdfExporter::default();
    assert!(
        exporter
            .export(
                "![Broken](data:image/png;base64,bm90IGFuIGltYWdl)",
                &mut Vec::new()
            )
            .is_err()
    );
}

#[test]
fn multilingual_text_exports_in_every_style() {
    for style in STYLES {
        let exporter = ProsePdfExporter {
            prose_style: Some(style.into()),
            ..Default::default()
        };
        exporter.export("# Notes\n\nதமிழ் नमस्ते **bold** and *italic*.\n\n| Character | Role |\n|---|---|\n| Alice | Lead |\n\n[Reference](https://example.com)", &mut Vec::new()).unwrap_or_else(|error| panic!("{style}: {error}"));
    }
}

#[test]
fn extra_source_blank_lines_do_not_change_pdf_spacing() {
    let image = image_url(image::ImageFormat::Png, 320, 120);
    let blocks = [
        "# A Heading".to_string(),
        "A paragraph.".to_string(),
        format!("![image1]({image})"),
        "- First item\n- Second item".to_string(),
        "| Column |\n| --- |\n| Value |".to_string(),
        "## Another Heading".to_string(),
        "A final paragraph.".to_string(),
    ];
    for style in STYLES {
        let exporter = ProsePdfExporter {
            prose_style: Some(style.into()),
            ..Default::default()
        };
        let mut compact = Vec::new();
        let mut sparse = Vec::new();
        exporter.export(&blocks.join("\n\n"), &mut compact).unwrap();
        exporter
            .export(&blocks.join("\n\n\n\n\n\n"), &mut sparse)
            .unwrap();
        assert_eq!(
            compact, sparse,
            "{style}: source whitespace must not add export gaps"
        );
        if let Ok(directory) = std::env::var("ACTONE_PROSE_STYLE_SAMPLES") {
            std::fs::write(
                std::path::Path::new(&directory).join(format!("{style}-spacing.pdf")),
                compact,
            )
            .unwrap();
        }
    }
}
