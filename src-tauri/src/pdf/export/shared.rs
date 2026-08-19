//! Shared PDF rendering primitives used by both the Fountain exporter and the
//! Markdown (prose) exporter. Font loading, watermark drawing, page numbers and
//! text measurement live here so both exporters share one krilla pipeline.

use cosmic_text::FontSystem;
use image::ImageEncoder;
use krilla::{
    geom::Point,
    image::Image,
    surface::Surface,
    text::Font,
};

use super::layout::{CourierFonts, IndicFonts, LayoutInfo, SymbolFonts};

const FONTS: [&[u8]; 8] = [
    include_bytes!("fonts/CourierPrime-Regular.ttf"),
    include_bytes!("fonts/CourierPrime-Bold.ttf"),
    include_bytes!("fonts/CourierPrime-Italic.ttf"),
    include_bytes!("fonts/CourierPrime-BoldItalic.ttf"),
    include_bytes!("fonts/CourierPrimeSans-Regular.ttf"),
    include_bytes!("fonts/CourierPrimeSans-Bold.ttf"),
    include_bytes!("fonts/CourierPrimeSans-Italic.ttf"),
    include_bytes!("fonts/CourierPrimeSans-BoldItalic.ttf"),
];

const NOTO_FONTS: [&[u8]; 33] = [
    // 0-15: Existing fonts (kept for backward compatibility)
    include_bytes!("fonts/MuktaMalar-Regular.ttf"), // 0 - Tamil
    include_bytes!("fonts/MuktaMalar-Bold.ttf"),    // 1
    include_bytes!("fonts/Mukta-Regular.ttf"),      // 2 - Hindi
    include_bytes!("fonts/Mukta-Bold.ttf"),         // 3
    include_bytes!("fonts/NotoSansTelugu-Regular.ttf"), // 4 - Telugu
    include_bytes!("fonts/NotoSansTelugu-Bold.ttf"), // 5
    include_bytes!("fonts/NotoSansMalayalam-Regular.ttf"), // 6 - Malayalam
    include_bytes!("fonts/NotoSansMalayalam-Bold.ttf"), // 7
    include_bytes!("fonts/NotoSansKannada-Regular.ttf"), // 8 - Kannada
    include_bytes!("fonts/NotoSansKannada-Bold.ttf"), // 9
    include_bytes!("fonts/NotoSansBengali-Regular.ttf"), // 10 - Bengali
    include_bytes!("fonts/NotoSansBengali-Bold.ttf"), // 11
    include_bytes!("fonts/MuktaVaani-Regular.ttf"), // 12 - Gujarati
    include_bytes!("fonts/MuktaVaani-Bold.ttf"),    // 13
    include_bytes!("fonts/MuktaMahee-Regular.ttf"), // 14 - Punjabi
    include_bytes!("fonts/MuktaMahee-Bold.ttf"),    // 15
    // 16-31: Indian language fonts
    include_bytes!("fonts/HindGuntur-Regular.ttf"), // 16 - Telugu
    include_bytes!("fonts/HindGuntur-Bold.ttf"),    // 17
    include_bytes!("fonts/HindSiliguri-Regular.ttf"), // 18 - Bengali
    include_bytes!("fonts/HindSiliguri-Bold.ttf"),  // 19
    include_bytes!("fonts/HindVadodara-Regular.ttf"), // 20 - Gujarati
    include_bytes!("fonts/HindVadodara-Bold.ttf"),  // 21
    include_bytes!("fonts/BalooTamma2-Regular.ttf"), // 22 - Kannada
    include_bytes!("fonts/BalooTamma2-Bold.ttf"),   // 23
    include_bytes!("fonts/BalooChettan2-Regular.ttf"), // 24 - Malayalam
    include_bytes!("fonts/BalooChettan2-Bold.ttf"), // 25
    include_bytes!("fonts/BalooPaaji2-Regular.ttf"), // 26 - Punjabi
    include_bytes!("fonts/BalooPaaji2-Bold.ttf"),   // 27
    include_bytes!("fonts/BalooBhaina2-Regular.ttf"), // 28 - Oriya
    include_bytes!("fonts/BalooBhaina2-Bold.ttf"),  // 29
    include_bytes!("fonts/NotoSansTamil-Regular.ttf"), // 30 - Tamil alt (user preference)
    include_bytes!("fonts/NotoSansTamil-Bold.ttf"), // 31
    include_bytes!("fonts/NotoSansSymbols2-Regular.ttf"), // 32 - Symbol fallback
];

/// Watermark configuration shared between the Fountain and prose exporters.
#[derive(Debug, Clone)]
pub struct WatermarkSettings {
    pub header_enabled: bool,
    pub header_text: String,
    pub header_opacity: f32,
    pub footer_enabled: bool,
    pub footer_text: String,
    pub footer_opacity: f32,
    pub center_enabled: bool,
    pub center_type: String,
    pub center_text: String,
    pub center_image_path: String,
    pub center_opacity: f32,
    pub center_grayscale: bool,
}

impl Default for WatermarkSettings {
    fn default() -> Self {
        Self {
            header_enabled: false,
            header_text: String::new(),
            header_opacity: 1.0,
            footer_enabled: false,
            footer_text: String::new(),
            footer_opacity: 1.0,
            center_enabled: false,
            center_type: "text".to_string(),
            center_text: String::new(),
            center_image_path: String::new(),
            center_opacity: 0.4,
            center_grayscale: false,
        }
    }
}

pub fn build_font_system() -> FontSystem {
    let mut db = cosmic_text::fontdb::Database::new();
    for data in FONTS {
        db.load_font_data(data.to_vec());
    }
    for data in NOTO_FONTS {
        db.load_font_data(data.to_vec());
    }
    db.load_system_fonts();
    FontSystem::new_with_locale_and_db("en-US".to_string(), db)
}

pub fn load_courier_fonts() -> std::io::Result<CourierFonts> {
    Ok(CourierFonts {
        regular: Font::new(FONTS[0].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load regular font"))?,
        bold: Font::new(FONTS[1].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load bold font"))?,
        italic: Font::new(FONTS[2].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load italic font"))?,
        bold_italic: Font::new(FONTS[3].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load bold-italic font"))?,
        sans_regular: Font::new(FONTS[4].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load sans regular font"))?,
        sans_bold: Font::new(FONTS[5].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load sans bold font"))?,
        sans_italic: Font::new(FONTS[6].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load sans italic font"))?,
        sans_bold_italic: Font::new(FONTS[7].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load sans bold-italic font"))?,
    })
}

pub fn load_indic_fonts() -> std::io::Result<IndicFonts> {
    Ok(IndicFonts {
        mukta_malar_regular: Font::new(NOTO_FONTS[0].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load mukta malar regular"))?,
        mukta_malar_bold: Font::new(NOTO_FONTS[1].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load mukta malar bold"))?,
        mukta_regular: Font::new(NOTO_FONTS[2].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load mukta regular"))?,
        mukta_bold: Font::new(NOTO_FONTS[3].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load mukta bold"))?,
        noto_sans_telugu_regular: Font::new(NOTO_FONTS[4].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load noto sans telugu regular"))?,
        noto_sans_telugu_bold: Font::new(NOTO_FONTS[5].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load noto sans telugu bold"))?,
        noto_sans_malayalam_regular: Font::new(NOTO_FONTS[6].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load noto sans malayalam regular"))?,
        noto_sans_malayalam_bold: Font::new(NOTO_FONTS[7].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load noto sans malayalam bold"))?,
        noto_sans_kannada_regular: Font::new(NOTO_FONTS[8].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load noto sans kannada regular"))?,
        noto_sans_kannada_bold: Font::new(NOTO_FONTS[9].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load noto sans kannada bold"))?,
        noto_sans_bengali_regular: Font::new(NOTO_FONTS[10].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load noto sans bengali regular"))?,
        noto_sans_bengali_bold: Font::new(NOTO_FONTS[11].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load noto sans bengali bold"))?,
        noto_sans_gujarati_regular: Font::new(NOTO_FONTS[12].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load noto sans gujarati regular"))?,
        noto_sans_gujarati_bold: Font::new(NOTO_FONTS[13].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load noto sans gujarati bold"))?,
        noto_sans_gurmukhi_regular: Font::new(NOTO_FONTS[14].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load noto sans gurmukhi regular"))?,
        noto_sans_gurmukhi_bold: Font::new(NOTO_FONTS[15].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load noto sans gurmukhi bold"))?,
        hind_guntur_regular: Font::new(NOTO_FONTS[16].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load hind guntur regular"))?,
        hind_guntur_bold: Font::new(NOTO_FONTS[17].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load hind guntur bold"))?,
        hind_siliguri_regular: Font::new(NOTO_FONTS[18].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load hind siliguri regular"))?,
        hind_siliguri_bold: Font::new(NOTO_FONTS[19].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load hind siliguri bold"))?,
        hind_vadodara_regular: Font::new(NOTO_FONTS[20].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load hind vadodara regular"))?,
        hind_vadodara_bold: Font::new(NOTO_FONTS[21].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load hind vadodara bold"))?,
        baloo_tamma_2_regular: Font::new(NOTO_FONTS[22].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load baloo tamma 2 regular"))?,
        baloo_tamma_2_bold: Font::new(NOTO_FONTS[23].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load baloo tamma 2 bold"))?,
        baloo_chettan_2_regular: Font::new(NOTO_FONTS[24].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load baloo chettan 2 regular"))?,
        baloo_chettan_2_bold: Font::new(NOTO_FONTS[25].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load baloo chettan 2 bold"))?,
        baloo_paaji_2_regular: Font::new(NOTO_FONTS[26].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load baloo paaji 2 regular"))?,
        baloo_paaji_2_bold: Font::new(NOTO_FONTS[27].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load baloo paaji 2 bold"))?,
        baloo_bhaina_2_regular: Font::new(NOTO_FONTS[28].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load baloo bhaina 2 regular"))?,
        baloo_bhaina_2_bold: Font::new(NOTO_FONTS[29].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load baloo bhaina 2 bold"))?,
        noto_sans_tamil_regular: Font::new(NOTO_FONTS[30].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load noto sans tamil regular"))?,
        noto_sans_tamil_bold: Font::new(NOTO_FONTS[31].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load noto sans tamil bold"))?,
    })
}

pub fn load_symbol_fonts() -> std::io::Result<SymbolFonts> {
    Ok(SymbolFonts {
        regular: Font::new(NOTO_FONTS[32].into(), 0)
            .ok_or_else(|| std::io::Error::other("failed to load symbol font"))?,
    })
}

pub fn measure_text_width(font_system: &mut FontSystem, text: &str, font_size: f32) -> f32 {
    use cosmic_text::{Attrs, Buffer, Family, Metrics, Shaping};
    let metrics = Metrics::new(font_size, font_size);
    let mut buffer = Buffer::new(font_system, metrics);
    let mut buffer = buffer.borrow_with(font_system);
    buffer.set_size(Some(f32::MAX), Some(font_size * 2.0));
    let attrs = Attrs::new().family(Family::Name("Courier Prime"));
    buffer.set_text(text, attrs, Shaping::Advanced);

    let mut width = 0.0_f32;
    for run in buffer.layout_runs() {
        for glyph in run.glyphs.iter() {
            width = width.max(glyph.x + glyph.w);
        }
    }
    width
}

/// Loads the optional center watermark image, applying grayscale if requested.
pub fn load_center_image(settings: &WatermarkSettings) -> Option<Image> {
    if !settings.center_enabled || settings.center_type != "image" {
        return None;
    }
    if settings.center_image_path.is_empty() {
        return None;
    }
    if settings.center_grayscale {
        (|| -> Option<Image> {
            let bytes = std::fs::read(&settings.center_image_path).ok()?;
            let img = image::load_from_memory(&bytes).ok()?.grayscale();
            let mut png_buf = Vec::new();
            let encoder = image::codecs::png::PngEncoder::new(&mut png_buf);
            encoder
                .write_image(
                    img.as_bytes(),
                    img.width(),
                    img.height(),
                    img.color().into(),
                )
                .ok()?;
            Image::from_png(png_buf.into(), false).ok()
        })()
    } else {
        std::fs::read(&settings.center_image_path)
            .ok()
            .and_then(|bytes| {
                let is_png = settings
                    .center_image_path
                    .to_lowercase()
                    .ends_with(".png");
                if is_png {
                    Image::from_png(bytes.into(), false).ok()
                } else {
                    Image::from_jpeg(bytes.into(), false).ok()
                }
            })
    }
}

pub fn draw_watermarks<'a>(
    surface: &mut Surface,
    font_system: &mut FontSystem,
    layout_info: &LayoutInfo,
    settings: &WatermarkSettings,
    center_image: Option<&'a Image>,
) {
    let page_width = layout_info.size.x;
    let page_height = layout_info.size.y;
    let font_size = 10.0;

    // 1. Header Watermark
    if settings.header_enabled && !settings.header_text.is_empty() {
        if let Some(opacity_norm) = krilla::num::NormalizedF32::new(settings.header_opacity) {
            surface.push_opacity(opacity_norm);
            let font = layout_info.fonts.courier.regular.clone();
            let width = measure_text_width(font_system, &settings.header_text, font_size);
            let x_pos = (page_width - width) / 2.0;
            surface.draw_text(
                Point::from_xy(x_pos, 36.0),
                font,
                font_size,
                &settings.header_text,
                false,
                krilla::text::TextDirection::LeftToRight,
            );
            surface.pop();
        }
    }

    // 2. Footer Watermark
    if settings.footer_enabled && !settings.footer_text.is_empty() {
        if let Some(opacity_norm) = krilla::num::NormalizedF32::new(settings.footer_opacity) {
            surface.push_opacity(opacity_norm);
            let font = layout_info.fonts.courier.regular.clone();
            let width = measure_text_width(font_system, &settings.footer_text, font_size);
            let x_pos = (page_width - width) / 2.0;
            surface.draw_text(
                Point::from_xy(x_pos, page_height - 24.0),
                font,
                font_size,
                &settings.footer_text,
                false,
                krilla::text::TextDirection::LeftToRight,
            );
            surface.pop();
        }
    }

    // 3. Center Watermark
    if settings.center_enabled {
        let opacity = settings.center_opacity; // normalized f32 0.1 to 1.0
        if let Some(opacity_normalized) = krilla::num::NormalizedF32::new(opacity) {
            surface.push_opacity(opacity_normalized);

            if settings.center_type == "image" {
                if let Some(image) = center_image {
                    let img_size = image.size();
                    let max_w = 300.0;
                    let max_h = 300.0;
                    let aspect = img_size.0 as f32 / img_size.1 as f32;
                    let (w, h) = if aspect > 1.0 {
                        (max_w, max_w / aspect)
                    } else {
                        (max_h * aspect, max_h)
                    };
                    let x = (page_width - w) / 2.0;
                    let y = (page_height - h) / 2.0;
                    if let Some(size) = krilla::geom::Size::from_wh(w, h) {
                        surface.push_transform(&krilla::geom::Transform::from_translate(x, y));
                        surface.draw_image(image.clone(), size);
                        surface.pop();
                    }
                }
            } else if settings.center_type == "text" && !settings.center_text.is_empty() {
                // Draw Text Center Watermark
                let font = layout_info.fonts.courier.bold.clone();
                let center_font_size = 48.0;
                let width = measure_text_width(
                    font_system,
                    &settings.center_text,
                    center_font_size,
                );
                let x = (page_width - width) / 2.0;
                let y = page_height / 2.0;

                let cx = page_width / 2.0;
                let cy = page_height / 2.0;

                let transform = krilla::geom::Transform::from_rotate_at(-45.0, cx, cy);

                surface.push_transform(&transform);
                surface.draw_text(
                    Point::from_xy(x, y),
                    font,
                    center_font_size,
                    &settings.center_text,
                    false,
                    krilla::text::TextDirection::LeftToRight,
                );
                surface.pop();
            }

            surface.pop(); // Pop opacity
        }
    }
}