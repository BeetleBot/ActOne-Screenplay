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
        "tamil" => vec!["Mukta Malar", "Noto Sans Tamil"],
        "devanagari" => vec!["Mukta", "Noto Sans Devanagari"],
        "telugu" => vec!["Noto Sans Telugu", "Hind Guntur"],
        "kannada" => vec!["Noto Sans Kannada", "Baloo Tamma 2"],
        "malayalam" => vec!["Noto Sans Malayalam", "Baloo Chettan 2"],
        "bengali" => vec!["Noto Sans Bengali", "Hind Siliguri"],
        "gujarati" => vec!["Mukta Vaani", "Hind Vadodara"],
        "gurmukhi" => vec!["Mukta Mahee", "Baloo Paaji 2"],
        "oriya" => vec!["Baloo Bhaina 2"],
        _ => vec![],
    }.into_iter().map(String::from).collect()
}

impl FontCache {
    pub fn new() -> Self {
        let mut db = cosmic_text::fontdb::Database::new();
        db.load_system_fonts();
        let mut all: Vec<String> = db.faces()
            .filter_map(|face| face.families.first().map(|(name, _)| name.clone()))
            .collect();
        all.sort_by(|a, b| a.to_lowercase().cmp(&b.to_lowercase()));
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
            let mut courier_fonts: Vec<String> = self.all_system_fonts.iter()
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

