use std::collections::HashMap;

pub struct FontCache {
    all_system_fonts: Vec<String>,
    script_fonts: HashMap<String, Vec<String>>,
}

pub const CHOOSE_OTHER: &str = "___choose_other___";

pub fn detect_scripts(text: &str) -> Vec<String> {
    let mut found = Vec::new();
    for c in text.chars() {
        let val = c as u32;
        let script = match val {
            0x0B80..=0x0BFF if !found.contains(&"tamil".to_string()) => "tamil",
            0x0900..=0x097F if !found.contains(&"devanagari".to_string()) => "devanagari",
            0x0C00..=0x0C7F if !found.contains(&"telugu".to_string()) => "telugu",
            0x0C80..=0x0CFF if !found.contains(&"kannada".to_string()) => "kannada",
            0x0D00..=0x0D7F if !found.contains(&"malayalam".to_string()) => "malayalam",
            0x0980..=0x09FF if !found.contains(&"bengali".to_string()) => "bengali",
            0x0A80..=0x0AFF if !found.contains(&"gujarati".to_string()) => "gujarati",
            0x0A00..=0x0A7F if !found.contains(&"gurmukhi".to_string()) => "gurmukhi",
            0x0B00..=0x0B7F if !found.contains(&"oriya".to_string()) => "oriya",
            _ => continue,
        };
        found.push(script.to_string());
        if found.len() >= 9 {
            break;
        }
    }
    found
}

fn bundled_fonts_for_script(script: &str) -> Vec<String> {
    match script {
        "tamil" => vec!["Mukta Malar"],
        "devanagari" => vec!["Mukta"],
        "telugu" => vec!["Hind Guntur"],
        "kannada" => vec!["Baloo Tamma 2"],
        "malayalam" => vec!["Baloo Chettan 2"],
        "bengali" => vec!["Hind Siliguri"],
        "gujarati" => vec!["Hind Vadodara"],
        "gurmukhi" => vec!["Baloo Paaji 2"],
        "oriya" => vec!["Baloo Bhaina 2"],
        _ => vec![],
    }
    .into_iter()
    .map(String::from)
    .collect()
}

impl FontCache {
    pub fn new() -> Self {
        let mut db = cosmic_text::fontdb::Database::new();
        db.load_system_fonts();
        let mut all: Vec<String> = db
            .faces()
            .filter_map(|face| face.families.first().map(|(name, _)| name.clone()))
            .collect();
        all.sort_by_key(|a| a.to_lowercase());
        all.dedup_by(|a, b| a.to_lowercase() == b.to_lowercase());

        Self {
            all_system_fonts: all,
            script_fonts: HashMap::new(),
        }
    }

    pub fn fonts_for_script(&mut self, script: &str) -> Vec<String> {
        if let Some(cached) = self.script_fonts.get(script) {
            return cached.clone();
        }

        let result = if script == "english" {
            let mut courier_fonts: Vec<String> = self
                .all_system_fonts
                .iter()
                .filter(|f| f.to_lowercase().starts_with("courier"))
                .cloned()
                .collect();
            let mut ordered = Vec::new();
            for name in &["Courier Prime Sans", "Courier Prime"] {
                if let Some(pos) = courier_fonts.iter().position(|f| f == name) {
                    ordered.push(courier_fonts.remove(pos));
                }
            }
            ordered.extend(courier_fonts);
            ordered
        } else {
            let mut bundled = bundled_fonts_for_script(script);
            bundled.push(CHOOSE_OTHER.to_string());
            bundled
        };

        self.script_fonts.insert(script.to_string(), result.clone());
        result
    }
}


#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_scripts_indic_and_latin() {
        let tamil_text = "வணக்கம் உலகம்";
        let detected = detect_scripts(tamil_text);
        assert_eq!(detected, vec!["tamil"]);

        let hindi_text = "नमस्ते दुनिया";
        let detected = detect_scripts(hindi_text);
        assert_eq!(detected, vec!["devanagari"]);

        let mixed_text = "வணக்கம் and नमस्ते";
        let detected = detect_scripts(mixed_text);
        assert!(detected.contains(&"tamil".to_string()));
        assert!(detected.contains(&"devanagari".to_string()));

        let english_only = "Hello World INT. SCENE - DAY";
        let detected = detect_scripts(english_only);
        assert!(detected.is_empty(), "Latin text should not trigger Indic script detectors");
    }

    #[test]
    fn test_bundled_fonts_for_script() {
        assert_eq!(bundled_fonts_for_script("tamil"), vec!["Mukta Malar"]);
        assert_eq!(bundled_fonts_for_script("devanagari"), vec!["Mukta"]);
        assert_eq!(bundled_fonts_for_script("telugu"), vec!["Hind Guntur"]);
        assert_eq!(bundled_fonts_for_script("unknown"), Vec::<String>::new());
    }

    #[test]
    fn test_font_cache_caching_and_choose_other() {
        let mut cache = FontCache {
            all_system_fonts: vec!["Courier New".to_string(), "Courier Prime".to_string(), "Arial".to_string()],
            script_fonts: HashMap::new(),
        };

        let tamil_fonts = cache.fonts_for_script("tamil");
        assert!(tamil_fonts.contains(&"Mukta Malar".to_string()));
        assert!(tamil_fonts.contains(&CHOOSE_OTHER.to_string()));

        // Second call should come from cache
        let cached_tamil = cache.fonts_for_script("tamil");
        assert_eq!(cached_tamil, tamil_fonts);
    }
}
