use regex::Regex;
use serde::{Deserialize, Serialize};
use spellbook::Dictionary;
use std::collections::HashSet;
use std::fs;
use std::path::PathBuf;
use std::sync::{LazyLock, Mutex};
use tauri::{AppHandle, Manager};

const EN_AFF: &str = include_str!("../dictionaries/en/index.aff");
const EN_DIC: &str = include_str!("../dictionaries/en/index.dic");

static WORD_REGEX: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"[\p{L}'\u{2019}]+").unwrap());

fn is_apostrophe(c: char) -> bool {
    c == '\'' || c == '\u{2019}'
}

fn normalize_apostrophes(s: &str) -> String {
    s.replace('\u{2019}', "'")
}

fn utf16_offset(text: &str, byte_offset: usize) -> usize {
    text[..byte_offset].encode_utf16().count()
}

static SCREENPLAY_TERMS: LazyLock<HashSet<&'static str>> = LazyLock::new(|| {
    let mut s = HashSet::new();
    let terms = [
        "fountain",
        "slugline",
        "sluglines",
        "parenthetical",
        "parentheticals",
        "superimpose",
        "intercut",
        "montage",
        "chyrons",
        "chyron",
        "fadeout",
        "fadein",
        "dissolve",
        "matchcut",
        "jumpcut",
        "smashcut",
        "flashback",
        "flashforward",
        "voiceover",
        "voiceovers",
        "backstory",
        "logline",
        "beat",
        "cont'd",
        "contd",
        "int",
        "ext",
        "est",
        "pov",
        "sfx",
        "vfx",
        "bg",
        "fg",
        "ots",
        "cu",
        "ecu",
        "mcu",
        "ws",
        "v.o",
        "o.s",
        "o.c",
        "vo",
        "os",
        "oc",
        "actone",
    ];
    for t in terms {
        s.insert(t);
    }
    s
});

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TextRange {
    pub text: String,
    pub offset: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MisspelledWord {
    pub from: usize,
    pub to: usize,
    pub word: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LanguageInfo {
    pub code: String,
    pub name: String,
    pub native_name: String,
    pub bundled: bool,
    pub installed: bool,
    pub size_approx: String,
}

pub struct SpellcheckState {
    pub dictionary: Option<Dictionary>,
    pub active_language: String,
    pub custom_words: HashSet<String>,
    pub ignored_words: HashSet<String>,
    pub custom_words_path: Option<PathBuf>,
    pub dictionaries_dir: Option<PathBuf>,
}

impl Default for SpellcheckState {
    fn default() -> Self {
        Self::new()
    }
}

impl SpellcheckState {
    pub fn new() -> Self {
        let dictionary = match Dictionary::new(EN_AFF, EN_DIC) {
            Ok(d) => Some(d),
            Err(e) => {
                eprintln!("[Spellcheck] Failed to init embedded en dictionary: {e}");
                None
            }
        };

        Self {
            dictionary,
            active_language: "en".to_string(),
            custom_words: HashSet::new(),
            ignored_words: HashSet::new(),
            custom_words_path: None,
            dictionaries_dir: None,
        }
    }

    pub fn init_paths(&mut self, app: &AppHandle) {
        if let Ok(app_data) = app.path().app_data_dir() {
            let custom_path = app_data.join("custom_dictionary.txt");
            let dicts_path = app_data.join("dictionaries");
            let _ = fs::create_dir_all(&dicts_path);

            if custom_path.exists() {
                if let Ok(content) = fs::read_to_string(&custom_path) {
                    for line in content.lines() {
                        let trimmed = line.trim().to_lowercase();
                        if !trimmed.is_empty() {
                            self.custom_words.insert(trimmed);
                        }
                    }
                }
            }

            self.custom_words_path = Some(custom_path);
            self.dictionaries_dir = Some(dicts_path);
        }
    }

    pub fn save_custom_words(&self) {
        if let Some(path) = &self.custom_words_path {
            let mut words: Vec<&String> = self.custom_words.iter().collect();
            words.sort();
            let content = words
                .iter()
                .map(|s| s.as_str())
                .collect::<Vec<_>>()
                .join("\n");
            let _ = fs::write(path, content);
        }
    }

    pub fn load_language(&mut self, lang: &str) -> Result<(), String> {
        let lang_clean = lang.trim().to_lowercase();
        if lang_clean == "en" || lang_clean == "en-us" {
            self.dictionary = Some(
                Dictionary::new(EN_AFF, EN_DIC)
                    .map_err(|e| format!("Failed to load embedded en dictionary: {e}"))?,
            );
            self.active_language = "en".to_string();
            return Ok(());
        }

        if let Some(dicts_dir) = &self.dictionaries_dir {
            let lang_dir = dicts_dir.join(&lang_clean);
            let aff_path = lang_dir.join("index.aff");
            let dic_path = lang_dir.join("index.dic");

            if aff_path.exists() && dic_path.exists() {
                let aff_str = fs::read_to_string(&aff_path)
                    .map_err(|e| format!("Failed to read {}: {e}", aff_path.display()))?;
                let dic_str = fs::read_to_string(&dic_path)
                    .map_err(|e| format!("Failed to read {}: {e}", dic_path.display()))?;

                self.dictionary =
                    Some(Dictionary::new(&aff_str, &dic_str).map_err(|e| {
                        format!("Failed to parse dictionary for {lang_clean}: {e}")
                    })?);
                self.active_language = lang_clean;
                return Ok(());
            }
        }

        Err(format!(
            "Dictionary for language '{lang_clean}' not found on disk"
        ))
    }

    #[allow(dead_code)]
    pub fn is_word_valid(&self, word: &str) -> bool {
        self.is_word_valid_with_names(word, None)
    }

    pub fn is_word_valid_with_names(
        &self,
        word: &str,
        char_names: Option<&HashSet<String>>,
    ) -> bool {
        let clean = word.trim_matches(|c: char| !c.is_alphabetic() && !is_apostrophe(c));
        if clean.len() <= 1 {
            return true;
        }

        if clean.len() <= 5 && clean.chars().all(|c| c.is_uppercase()) {
            return true;
        }

        let normalized = normalize_apostrophes(clean);
        let lower = normalized.to_lowercase();

        if self.custom_words.contains(&lower)
            || self.ignored_words.contains(&lower)
            || SCREENPLAY_TERMS.contains(lower.as_str())
        {
            return true;
        }

        if let Some(names) = char_names {
            if names.contains(&lower) {
                return true;
            }
        }

        if let Some(dict) = &self.dictionary {
            dict.check(&normalized) || dict.check(&lower)
        } else {
            true
        }
    }
}

pub fn get_known_languages() -> Vec<LanguageInfo> {
    vec![
        LanguageInfo {
            code: "en".into(),
            name: "English (US)".into(),
            native_name: "English (US)".into(),
            bundled: true,
            installed: true,
            size_approx: "0.6 MB".into(),
        },
        LanguageInfo {
            code: "en-gb".into(),
            name: "English (UK)".into(),
            native_name: "English (UK)".into(),
            bundled: false,
            installed: false,
            size_approx: "0.6 MB".into(),
        },
        LanguageInfo {
            code: "es".into(),
            name: "Spanish".into(),
            native_name: "Español".into(),
            bundled: false,
            installed: false,
            size_approx: "0.7 MB".into(),
        },
        LanguageInfo {
            code: "fr".into(),
            name: "French".into(),
            native_name: "Français".into(),
            bundled: false,
            installed: false,
            size_approx: "1.2 MB".into(),
        },
        LanguageInfo {
            code: "de".into(),
            name: "German".into(),
            native_name: "Deutsch".into(),
            bundled: false,
            installed: false,
            size_approx: "3.2 MB".into(),
        },
        LanguageInfo {
            code: "it".into(),
            name: "Italian".into(),
            native_name: "Italiano".into(),
            bundled: false,
            installed: false,
            size_approx: "0.7 MB".into(),
        },
        LanguageInfo {
            code: "pt".into(),
            name: "Portuguese".into(),
            native_name: "Português".into(),
            bundled: false,
            installed: false,
            size_approx: "1.0 MB".into(),
        },
        LanguageInfo {
            code: "pt-br".into(),
            name: "Portuguese (Brazil)".into(),
            native_name: "Português do Brasil".into(),
            bundled: false,
            installed: false,
            size_approx: "1.1 MB".into(),
        },
        LanguageInfo {
            code: "nl".into(),
            name: "Dutch".into(),
            native_name: "Nederlands".into(),
            bundled: false,
            installed: false,
            size_approx: "1.8 MB".into(),
        },
        LanguageInfo {
            code: "ru".into(),
            name: "Russian".into(),
            native_name: "Русский".into(),
            bundled: false,
            installed: false,
            size_approx: "1.5 MB".into(),
        },
        LanguageInfo {
            code: "sv".into(),
            name: "Swedish".into(),
            native_name: "Svenska".into(),
            bundled: false,
            installed: false,
            size_approx: "1.2 MB".into(),
        },
        LanguageInfo {
            code: "da".into(),
            name: "Danish".into(),
            native_name: "Dansk".into(),
            bundled: false,
            installed: false,
            size_approx: "0.9 MB".into(),
        },
        LanguageInfo {
            code: "nb".into(),
            name: "Norwegian (Bokmål)".into(),
            native_name: "Norsk bokmål".into(),
            bundled: false,
            installed: false,
            size_approx: "1.4 MB".into(),
        },
        LanguageInfo {
            code: "pl".into(),
            name: "Polish".into(),
            native_name: "Polski".into(),
            bundled: false,
            installed: false,
            size_approx: "2.8 MB".into(),
        },
        LanguageInfo {
            code: "cs".into(),
            name: "Czech".into(),
            native_name: "Čeština".into(),
            bundled: false,
            installed: false,
            size_approx: "1.6 MB".into(),
        },
        LanguageInfo {
            code: "uk".into(),
            name: "Ukrainian".into(),
            native_name: "Українська".into(),
            bundled: false,
            installed: false,
            size_approx: "1.7 MB".into(),
        },
        LanguageInfo {
            code: "el".into(),
            name: "Greek".into(),
            native_name: "Ελληνικά".into(),
            bundled: false,
            installed: false,
            size_approx: "1.9 MB".into(),
        },
        LanguageInfo {
            code: "tr".into(),
            name: "Turkish".into(),
            native_name: "Türkçe".into(),
            bundled: false,
            installed: false,
            size_approx: "1.5 MB".into(),
        },
        LanguageInfo {
            code: "hu".into(),
            name: "Hungarian".into(),
            native_name: "Magyar".into(),
            bundled: false,
            installed: false,
            size_approx: "3.5 MB".into(),
        },
        LanguageInfo {
            code: "ro".into(),
            name: "Romanian".into(),
            native_name: "Română".into(),
            bundled: false,
            installed: false,
            size_approx: "1.2 MB".into(),
        },
        LanguageInfo {
            code: "ca".into(),
            name: "Catalan".into(),
            native_name: "Català".into(),
            bundled: false,
            installed: false,
            size_approx: "0.8 MB".into(),
        },
        LanguageInfo {
            code: "id".into(),
            name: "Indonesian".into(),
            native_name: "Bahasa Indonesia".into(),
            bundled: false,
            installed: false,
            size_approx: "0.6 MB".into(),
        },
        LanguageInfo {
            code: "vi".into(),
            name: "Vietnamese".into(),
            native_name: "Tiếng Việt".into(),
            bundled: false,
            installed: false,
            size_approx: "0.4 MB".into(),
        },
    ]
}

#[tauri::command]
pub fn spellcheck_init(
    app: AppHandle,
    state: tauri::State<'_, Mutex<SpellcheckState>>,
    lang: Option<String>,
) -> Result<(), String> {
    let mut s = state.lock().unwrap_or_else(|e| e.into_inner());
    s.init_paths(&app);
    let target_lang = lang.unwrap_or_else(|| "en".to_string());
    s.load_language(&target_lang)
}

#[tauri::command]
pub fn spellcheck_set_language(
    state: tauri::State<'_, Mutex<SpellcheckState>>,
    lang: String,
) -> Result<(), String> {
    let mut s = state.lock().unwrap_or_else(|e| e.into_inner());
    s.load_language(&lang)
}

#[tauri::command]
pub fn spellcheck_check_text(
    state: tauri::State<'_, Mutex<SpellcheckState>>,
    ranges: Vec<TextRange>,
    character_names: Option<Vec<String>>,
) -> Vec<MisspelledWord> {
    let s = state.lock().unwrap_or_else(|e| e.into_inner());
    let names_set: Option<HashSet<String>> = character_names.map(|names| {
        names
            .iter()
            .flat_map(|n| n.split_whitespace())
            .map(|w| w.to_lowercase())
            .collect()
    });
    let mut misspelled = Vec::new();

    for range in ranges {
        for m in WORD_REGEX.find_iter(&range.text) {
            let raw_word = m.as_str();
            let clean = raw_word.trim_matches(is_apostrophe);
            if clean.is_empty() || clean.len() <= 1 {
                continue;
            }

            if !s.is_word_valid_with_names(clean, names_set.as_ref()) {
                let leading_trimmed =
                    raw_word.len() - raw_word.trim_start_matches(is_apostrophe).len();
                let match_start = m.start() + leading_trimmed;
                let match_end = match_start + clean.len();

                misspelled.push(MisspelledWord {
                    from: range.offset + utf16_offset(&range.text, match_start),
                    to: range.offset + utf16_offset(&range.text, match_end),
                    word: clean.to_string(),
                });
            }
        }
    }

    misspelled
}

#[tauri::command]
pub fn spellcheck_suggest(
    state: tauri::State<'_, Mutex<SpellcheckState>>,
    word: String,
) -> Vec<String> {
    let s = state.lock().unwrap_or_else(|e| e.into_inner());
    let clean = word.trim_matches(|c: char| !c.is_alphabetic() && !is_apostrophe(c));
    if clean.is_empty() {
        return Vec::new();
    }

    let normalized = normalize_apostrophes(clean);
    let mut suggestions = Vec::new();
    if let Some(dict) = &s.dictionary {
        dict.suggest(&normalized, &mut suggestions);
        if suggestions.is_empty() {
            let lower = normalized.to_lowercase();
            dict.suggest(&lower, &mut suggestions);
        }
    }

    let mut seen = HashSet::new();
    let mut unique = Vec::new();
    for sugg in suggestions {
        if seen.insert(sugg.to_lowercase()) {
            unique.push(sugg);
            if unique.len() >= 8 {
                break;
            }
        }
    }

    unique
}

#[tauri::command]
pub fn spellcheck_add_word(
    state: tauri::State<'_, Mutex<SpellcheckState>>,
    word: String,
) -> Result<(), String> {
    let mut s = state.lock().unwrap_or_else(|e| e.into_inner());
    let clean =
        normalize_apostrophes(word.trim_matches(|c: char| !c.is_alphabetic() && !is_apostrophe(c)))
            .to_lowercase();
    if !clean.is_empty() {
        s.custom_words.insert(clean);
        s.save_custom_words();
    }
    Ok(())
}

#[tauri::command]
pub fn spellcheck_remove_word(
    state: tauri::State<'_, Mutex<SpellcheckState>>,
    word: String,
) -> Result<(), String> {
    let mut s = state.lock().unwrap_or_else(|e| e.into_inner());
    let clean =
        normalize_apostrophes(word.trim_matches(|c: char| !c.is_alphabetic() && !is_apostrophe(c)))
            .to_lowercase();
    if !clean.is_empty() {
        s.custom_words.remove(&clean);
        s.save_custom_words();
    }
    Ok(())
}

#[tauri::command]
pub fn spellcheck_ignore_word(state: tauri::State<'_, Mutex<SpellcheckState>>, word: String) {
    let mut s = state.lock().unwrap_or_else(|e| e.into_inner());
    let clean =
        normalize_apostrophes(word.trim_matches(|c: char| !c.is_alphabetic() && !is_apostrophe(c)))
            .to_lowercase();
    if !clean.is_empty() {
        s.ignored_words.insert(clean);
    }
}

#[tauri::command]
pub fn spellcheck_get_custom_words(state: tauri::State<'_, Mutex<SpellcheckState>>) -> Vec<String> {
    let s = state.lock().unwrap_or_else(|e| e.into_inner());
    let mut list: Vec<String> = s.custom_words.iter().cloned().collect();
    list.sort();
    list
}

#[tauri::command]
pub fn spellcheck_clear_custom_words(
    state: tauri::State<'_, Mutex<SpellcheckState>>,
) -> Result<(), String> {
    let mut s = state.lock().unwrap_or_else(|e| e.into_inner());
    s.custom_words.clear();
    s.save_custom_words();
    Ok(())
}

#[tauri::command]
pub async fn spellcheck_download_dict(
    _app: AppHandle,
    state: tauri::State<'_, Mutex<SpellcheckState>>,
    lang: String,
) -> Result<(), String> {
    let lang_clean = lang.trim().to_lowercase();
    if lang_clean.is_empty() {
        return Err("Language code cannot be empty".into());
    }

    let dicts_dir = {
        let s = state.lock().unwrap_or_else(|e| e.into_inner());
        s.dictionaries_dir
            .clone()
            .ok_or("Dictionaries directory not initialized")?
    };

    let target_dir = dicts_dir.join(&lang_clean);
    fs::create_dir_all(&target_dir)
        .map_err(|e| format!("Failed to create directory {}: {e}", target_dir.display()))?;

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;

    // Try jsDelivr npm first, fallback to raw GitHub
    let npm_pkg = format!("dictionary-{}", lang_clean);
    let aff_urls = [
        format!("https://cdn.jsdelivr.net/npm/{npm_pkg}/index.aff"),
        format!(
            "https://raw.githubusercontent.com/wooorm/dictionaries/main/dictionaries/{lang_clean}/index.aff"
        ),
    ];
    let dic_urls = [
        format!("https://cdn.jsdelivr.net/npm/{npm_pkg}/index.dic"),
        format!(
            "https://raw.githubusercontent.com/wooorm/dictionaries/main/dictionaries/{lang_clean}/index.dic"
        ),
    ];

    let aff_content = fetch_first_success(&client, &aff_urls).await?;
    let dic_content = fetch_first_success(&client, &dic_urls).await?;

    let aff_path = target_dir.join("index.aff");
    let dic_path = target_dir.join("index.dic");

    fs::write(&aff_path, aff_content)
        .map_err(|e| format!("Failed to save {}: {e}", aff_path.display()))?;
    fs::write(&dic_path, dic_content)
        .map_err(|e| format!("Failed to save {}: {e}", dic_path.display()))?;

    // Validate that dictionary can be parsed
    let aff_str = fs::read_to_string(&aff_path).map_err(|e| e.to_string())?;
    let dic_str = fs::read_to_string(&dic_path).map_err(|e| e.to_string())?;
    Dictionary::new(&aff_str, &dic_str)
        .map_err(|e| format!("Downloaded dictionary for '{lang_clean}' is invalid: {e}"))?;

    Ok(())
}

async fn fetch_first_success(client: &reqwest::Client, urls: &[String]) -> Result<String, String> {
    let mut last_err = String::new();
    for url in urls {
        match client.get(url).send().await {
            Ok(resp) if resp.status().is_success() => match resp.text().await {
                Ok(text) if !text.trim().is_empty() => return Ok(text),
                Ok(_) => last_err = format!("Empty response from {url}"),
                Err(e) => last_err = format!("Failed to read body from {url}: {e}"),
            },
            Ok(resp) => {
                last_err = format!("HTTP {} from {url}", resp.status());
            }
            Err(e) => {
                last_err = format!("Network error for {url}: {e}");
            }
        }
    }
    Err(format!("Failed to download dictionary file: {last_err}"))
}

#[tauri::command]
pub fn spellcheck_delete_dict(
    state: tauri::State<'_, Mutex<SpellcheckState>>,
    lang: String,
) -> Result<(), String> {
    let lang_clean = lang.trim().to_lowercase();
    if lang_clean == "en" {
        return Err("Cannot delete bundled English dictionary".into());
    }

    let dicts_dir = {
        let s = state.lock().unwrap_or_else(|e| e.into_inner());
        s.dictionaries_dir
            .clone()
            .ok_or("Dictionaries directory not initialized")?
    };

    let target_dir = dicts_dir.join(&lang_clean);
    if target_dir.exists() {
        fs::remove_dir_all(&target_dir)
            .map_err(|e| format!("Failed to delete {}: {e}", target_dir.display()))?;
    }

    Ok(())
}

#[tauri::command]
pub fn spellcheck_get_installed(
    state: tauri::State<'_, Mutex<SpellcheckState>>,
) -> Vec<LanguageInfo> {
    let s = state.lock().unwrap_or_else(|e| e.into_inner());
    let mut all = get_known_languages();

    for item in &mut all {
        if item.code == "en" {
            item.installed = true;
            continue;
        }

        if let Some(dicts_dir) = &s.dictionaries_dir {
            let lang_dir = dicts_dir.join(&item.code);
            if lang_dir.join("index.aff").exists() && lang_dir.join("index.dic").exists() {
                item.installed = true;
            }
        }
    }

    all.into_iter().filter(|i| i.installed).collect()
}

#[tauri::command]
pub fn spellcheck_get_available(
    state: tauri::State<'_, Mutex<SpellcheckState>>,
) -> Vec<LanguageInfo> {
    let s = state.lock().unwrap_or_else(|e| e.into_inner());
    let mut all = get_known_languages();

    for item in &mut all {
        if item.code == "en" {
            item.installed = true;
            continue;
        }

        if let Some(dicts_dir) = &s.dictionaries_dir {
            let lang_dir = dicts_dir.join(&item.code);
            if lang_dir.join("index.aff").exists() && lang_dir.join("index.dic").exists() {
                item.installed = true;
            }
        }
    }

    all
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_embedded_dictionary_init() {
        let state = SpellcheckState::new();
        assert!(state.dictionary.is_some());
        assert!(state.is_word_valid("screenplay"));
        assert!(state.is_word_valid("Fountain"));
        assert!(state.is_word_valid("INT"));
        assert!(state.is_word_valid("POV"));
        assert!(!state.is_word_valid("screenplaiii"));
    }

    #[test]
    fn test_curly_apostrophe_words() {
        let state = SpellcheckState::new();
        assert!(state.is_word_valid("don't"));
        assert!(state.is_word_valid("don\u{2019}t"));
        assert!(state.is_word_valid("couldn\u{2019}t"));
        assert!(state.is_word_valid("it\u{2019}s"));
        assert!(state.is_word_valid("I\u{2019}m"));
    }

    #[test]
    fn test_curly_apostrophe_regex() {
        let text = "don\u{2019}t couldn\u{2019}t";
        let matches: Vec<&str> = WORD_REGEX.find_iter(text).map(|m| m.as_str()).collect();
        assert_eq!(matches, vec!["don\u{2019}t", "couldn\u{2019}t"]);
    }

    #[test]
    fn test_character_names_skip() {
        let state = SpellcheckState::new();
        let mut names = HashSet::new();
        names.insert("wilfredx".to_string());
        names.insert("wingsby".to_string());
        assert!(!state.is_word_valid("Wilfredx"));
        assert!(!state.is_word_valid("Wingsby"));
        assert!(state.is_word_valid_with_names("Wilfredx", Some(&names)));
        assert!(state.is_word_valid_with_names("Wingsby", Some(&names)));
        assert!(!state.is_word_valid_with_names("Xyzabc", Some(&names)));
    }

    #[test]
    fn test_word_check_and_suggestions() {
        let state = SpellcheckState::new();
        let dict = state.dictionary.as_ref().unwrap();
        let mut suggestions = Vec::new();
        dict.suggest("helo", &mut suggestions);
        assert!(!suggestions.is_empty());
    }

    #[test]
    fn test_utf16_offsets_for_non_ascii_text() {
        let text = "தமிழ் typo";
        let start = text.find("typo").unwrap();
        let end = start + "typo".len();

        assert_eq!(utf16_offset(text, start), 6);
        assert_eq!(utf16_offset(text, end), 10);
    }

    #[test]
    fn test_check_text_offsets() {
        let state = SpellcheckState::new();
        let ranges = vec![
            TextRange {
                text: "tain".into(),
                offset: 74,
            },
            TextRange {
                text: "- Wilfred Wingsby, asleep at his desk.".into(),
                offset: 80,
            },
        ];

        let mut misspelled = Vec::new();
        for range in ranges {
            for m in WORD_REGEX.find_iter(&range.text) {
                let raw_word = m.as_str();
                let clean = raw_word.trim_matches(is_apostrophe);
                if clean.is_empty() || clean.len() <= 1 {
                    continue;
                }

                if !state.is_word_valid(clean) {
                    let leading_trimmed =
                        raw_word.len() - raw_word.trim_start_matches(is_apostrophe).len();
                    let match_start = m.start() + leading_trimmed;
                    let match_end = match_start + clean.len();

                    misspelled.push(MisspelledWord {
                        from: range.offset + match_start,
                        to: range.offset + match_end,
                        word: clean.to_string(),
                    });
                }
            }
        }

        println!("RESULTS: {:?}", misspelled);
        assert_eq!(misspelled.len(), 2);
        assert_eq!(misspelled[0].word, "tain");
        assert_eq!(misspelled[0].from, 74);
        assert_eq!(misspelled[0].to, 78);
        assert_eq!(misspelled[1].word, "Wingsby");
        assert_eq!(misspelled[1].from, 90);
        assert_eq!(misspelled[1].to, 97);
    }
}
