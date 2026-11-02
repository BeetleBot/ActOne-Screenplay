//! Import and export preparation shared by native file commands.
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::{
    collections::HashSet,
    io::{Cursor, Read},
};

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StripOptions {
    pub sections: bool,
    pub synopses: bool,
    pub title_page: bool,
    #[serde(default = "yes")]
    pub uppercase_elements: bool,
}
fn yes() -> bool {
    true
}
// ECMAScript whitespace: BOM is whitespace; NEL is not.
fn js_space(c: char) -> bool {
    matches!(c, '\u{0009}'..='\u{000d}' | '\u{0020}' | '\u{00a0}' | '\u{1680}' | '\u{2000}'..='\u{200a}' | '\u{2028}' | '\u{2029}' | '\u{202f}' | '\u{205f}' | '\u{3000}' | '\u{feff}')
}
trait JsTrim {
    fn js_trim(&self) -> &str;
    fn js_trim_start(&self) -> &str;
    fn js_trim_end(&self) -> &str;
}
impl JsTrim for str {
    fn js_trim(&self) -> &str {
        self.trim_matches(js_space)
    }
    fn js_trim_start(&self) -> &str {
        self.trim_start_matches(js_space)
    }
    fn js_trim_end(&self) -> &str {
        self.trim_end_matches(js_space)
    }
}
fn parse_xml(xml: &str) -> Result<roxmltree::Document<'_>, roxmltree::Error> {
    roxmltree::Document::parse_with_options(
        xml,
        roxmltree::ParsingOptions {
            allow_dtd: true,
            nodes_limit: 1_000_000,
            ..Default::default()
        },
    )
}
fn rx(s: &str) -> Regex {
    Regex::new(&s.replace(r"\s", r"[\x09-\x0d\x20\u{00a0}\u{1680}\u{2000}-\u{200a}\u{2028}\u{2029}\u{202f}\u{205f}\u{3000}\u{feff}]")).expect("static file format regex")
}

pub fn strip_fountain(raw: &str, options: &StripOptions) -> String {
    let text = rx(r"(?i)\[\[marker[^\]]*\]\]").replace_all(raw, "");
    let text = rx(r"(?i)\[\[(color\s[^\]]*|storyline[^\]]*|red|blue|green|pink|magenta|gray|purple|cyan|teal|yellow|orange|brown)\]\]").replace_all(&text, "").into_owned();
    let normalized = text.replace("\r\n", "\n");
    let lines: Vec<&str> = normalized.split('\n').collect();
    let mut in_title = lines
        .iter()
        .find(|s| !s.js_trim().is_empty())
        .and_then(|s| s.split_once(':'))
        .is_some_and(|(k, _)| {
            [
                "title",
                "credit",
                "author",
                "authors",
                "source",
                "notes",
                "draft date",
                "date",
                "contact",
                "copyright",
            ]
            .contains(&k.js_trim().to_lowercase().as_str())
        });
    let mut title = Vec::new();
    let mut body = Vec::new();
    for (i, line) in lines.iter().enumerate() {
        let t = line.js_trim();
        if in_title {
            if t.is_empty() && i > 0 {
                in_title = false;
                if !options.title_page {
                    continue;
                }
            } else if !t.is_empty() && !options.title_page {
                continue;
            }
            title.push((*line).to_string());
            continue;
        }
        if !options.sections && t.starts_with('#') && !t.starts_with("#!") {
            continue;
        }
        if !options.synopses && t.starts_with('=') && !t.starts_with("==") {
            continue;
        }
        body.push((*line).to_string());
    }
    if options.uppercase_elements {
        body = uppercase_body(&body);
    }
    if !options.title_page {
        title.clear();
    }
    title.extend(body);
    let joined = title.join("\n");
    let collapsed = rx(r"\n{3,}").replace_all(&joined, "\n\n");
    format!("{}\n", collapsed.js_trim_end())
}

fn uppercase_body(lines: &[String]) -> Vec<String> {
    let heading = rx(r"(?i)^(INT|EXT|I/E|I\.?/?E\.?|E/I|E\.?/?I\.?)(?-u:\b)");
    let parenthetical = rx(r"^\(.*?\)$");
    let extensions = rx(r"\s*\(.*?\)");
    let with_extension = rx(r"^([^()]+)\s*(\(.*?\))\s*(\^)?$");
    let punctuated = rx(r"[.,!?;:]$");
    let clean = rx(r"^[A-Za-z0-9][A-Za-z0-9 '-]*$");
    let common_transition =
        rx(r"(?i)^(FADE OUT\.|FADE IN:|CUT TO BLACK\.|DISSOLVE TO:|MATCH CUT TO:|JUMP CUT TO:)$");
    let mut known = HashSet::new();
    let name = |s: &str| {
        extensions
            .replace_all(s, "")
            .trim_end_matches('^')
            .js_trim()
            .to_uppercase()
    };
    for (i, line) in lines.iter().enumerate() {
        let t = line.js_trim();
        let empty_before = i == 0 || lines[i - 1].js_trim().is_empty();
        let next = lines.get(i + 1).map(|s| s.js_trim()).unwrap_or("");
        let candidate = if let Some(s) = t.strip_prefix('@') {
            Some(name(s))
        } else if empty_before && t.ends_with('^') {
            Some(name(t))
        } else if empty_before
            && parenthetical.is_match(next)
            && !t.starts_with(['.', '!', '>', '#', '='])
        {
            Some(name(t))
        } else {
            None
        };
        if let Some(s) = candidate.filter(|s| !s.is_empty()) {
            known.insert(s);
        }
    }
    lines
        .iter()
        .enumerate()
        .map(|(i, line)| {
            let t = line.js_trim();
            if t.is_empty() {
                return line.clone();
            }
            let before = i == 0 || lines[i - 1].js_trim().is_empty();
            let next = lines.get(i + 1).map(|s| s.js_trim()).unwrap_or("");
            let upper = if t.starts_with('.') && !t.starts_with("..")
                || before && heading.is_match(t)
            {
                true
            } else if t.starts_with('!') && !t.starts_with("!!") {
                false
            } else if t.starts_with("!!") {
                true
            } else if t.starts_with('>') && t.ends_with('<') {
                false
            } else if t.starts_with('>')
                || before && (t.to_uppercase().ends_with("TO:") || common_transition.is_match(t))
                || t.starts_with('@')
                || before && t.ends_with('^')
            {
                true
            } else if before
                && with_extension.captures(t).is_some_and(|c| {
                    let n = c[1].js_trim();
                    (n.split(js_space).filter(|s| !s.is_empty()).count() <= 4
                        && !punctuated.is_match(n))
                        || known.contains(&n.to_uppercase())
                })
            {
                true
            } else if before
                && next.starts_with('(')
                && next.ends_with(')')
                && t.split(js_space).filter(|s| !s.is_empty()).count() <= 5
                && !punctuated.is_match(t)
                && t.encode_utf16().count() <= 50
            {
                true
            } else if before && !next.is_empty() && known.contains(&name(t)) {
                true
            } else if before
                && !next.is_empty()
                && !next.starts_with(['#', '=', '!', '~', '>', '.'])
                && !heading.is_match(next)
            {
                (t == t.to_uppercase() && t.chars().any(|c| c.is_ascii_uppercase()))
                    || (t.split(js_space).filter(|s| !s.is_empty()).count() <= 3
                        && t.encode_utf16().count() <= 35
                        && !punctuated.is_match(t)
                        && clean.is_match(t))
            } else {
                false
            };
            if upper {
                format!(
                    "{}{}{}",
                    &line[..line.len() - line.js_trim_start().len()],
                    t.to_uppercase(),
                    &line[line.js_trim_end().len()..]
                )
            } else {
                line.clone()
            }
        })
        .collect()
}

fn all_text(node: roxmltree::Node<'_, '_>) -> String {
    node.descendants()
        .filter(|n| n.is_text())
        .filter_map(|n| n.text())
        .collect()
}
fn formatted(node: roxmltree::Node<'_, '_>, fadein: bool) -> String {
    let tag = if fadein { "text" } else { "Text" };
    let runs: Vec<_> = node.descendants().filter(|n| n.has_tag_name(tag)).collect();
    if runs.is_empty() {
        return all_text(node).js_trim().into();
    }
    runs.iter()
        .map(|n| {
            let text = all_text(*n);
            if text.is_empty() {
                return text;
            }
            let style = n.attribute("Style").unwrap_or("").to_lowercase();
            let adorn = n
                .attribute("Adornmentstyle")
                .and_then(|s| s.parse::<u8>().ok())
                .unwrap_or(0);
            let bold = if fadein {
                n.attribute("bold") == Some("1")
            } else {
                style.contains("bold") || [1, 3, 5, 7].contains(&adorn)
            };
            let italic = if fadein {
                n.attribute("italic") == Some("1")
            } else {
                style.contains("italic") || [2, 3, 6, 7].contains(&adorn)
            };
            let underline = if fadein {
                n.attribute("underline") == Some("1")
            } else {
                style.contains("underline") || [4, 5, 6, 7].contains(&adorn)
            };
            let stars = "*".repeat(usize::from(bold) * 2 + usize::from(italic));
            let u = if underline { "_" } else { "" };
            format!("{stars}{u}{text}{u}{stars}")
        })
        .collect::<String>()
        .js_trim()
        .into()
}

pub fn import_xml(xml: &str, fadein: bool) -> String {
    if !fadein && !xml.contains("<FinalDraft") && !xml.contains("<Paragraph") {
        return xml.into();
    }
    let Ok(doc) = parse_xml(xml) else {
        return if fadein { String::new() } else { xml.into() };
    };
    let tag = if fadein { "para" } else { "Paragraph" };
    let paras: Vec<_> = doc.descendants().filter(|n| n.has_tag_name(tag)).collect();
    if paras.is_empty() {
        return if fadein { String::new() } else { xml.into() };
    }
    let mut lines = Vec::new();
    if !fadein {
        if let Some(title) = doc.descendants().find(|n| n.has_tag_name("TitlePage")) {
            let text: Vec<String> = title
                .descendants()
                .filter(|n| n.has_tag_name("Paragraph"))
                .map(|n| all_text(n).js_trim().to_string())
                .filter(|s| !s.is_empty())
                .collect();
            if let Some(t) = text.first() {
                lines.push(format!("Title: {t}"));
                if let Some(a) = text.get(1) {
                    lines.push(format!("Author: {a}"));
                }
                lines.push(String::new());
            }
        }
    }
    let style = |n: roxmltree::Node<'_, '_>| -> String {
        if fadein {
            n.descendants()
                .find(|s| s.has_tag_name("style"))
                .and_then(|s| {
                    s.attribute("basestyle")
                        .filter(|s| !s.is_empty())
                        .or_else(|| s.attribute("name"))
                })
                .unwrap_or("")
                .to_lowercase()
        } else {
            n.attribute("Type").unwrap_or("").to_lowercase()
        }
    };
    for (i, p) in paras.iter().enumerate() {
        let text = formatted(*p, fadein);
        if text.is_empty() {
            lines.push(String::new());
            continue;
        }
        let kind = style(*p);
        let next = paras.get(i + 1).map(|p| style(*p)).unwrap_or_default();
        let align = if fadein {
            p.descendants()
                .find(|n| n.has_tag_name("style"))
                .and_then(|n| n.attribute("align"))
                .unwrap_or("")
                .to_owned()
        } else {
            p.attribute("Alignment").unwrap_or("").to_lowercase()
        };
        if align == "center" || kind == "centered" || fadein && kind == "centered text" {
            lines.extend([format!("> {text} <"), String::new()]);
            continue;
        }
        match kind.as_str() {
            "scene heading" => {
                let mut heading = if text.starts_with('.') {
                    text
                } else {
                    format!(".{text}")
                };
                let num = if fadein {
                    p.attribute("number")
                } else {
                    p.descendants()
                        .find(|n| n.has_tag_name("SceneProperties"))
                        .and_then(|n| n.attribute("Number"))
                        .or_else(|| p.attribute("Number"))
                };
                if let Some(n) = num.filter(|s| !s.is_empty()) {
                    heading.push_str(&format!(" #{n}#"));
                }
                lines.extend([String::new(), heading, String::new()]);
            }
            "character" => {
                lines.extend([
                    String::new(),
                    format!(
                        "@{}{}",
                        text.strip_prefix('@').unwrap_or(&text).to_uppercase(),
                        if fadein && p.attribute("dualdialogue") == Some("1") {
                            " ^"
                        } else {
                            ""
                        }
                    ),
                ]);
            }
            "parenthetical" => {
                lines.push(if text.starts_with('(') && text.ends_with(')') {
                    text
                } else {
                    format!(
                        "({})",
                        text.strip_prefix('(')
                            .unwrap_or(&text)
                            .strip_suffix(')')
                            .unwrap_or(text.strip_prefix('(').unwrap_or(&text))
                    )
                });
            }
            "dialogue" => {
                lines.push(text);
                if !["parenthetical", "dialogue"].contains(&next.as_str()) {
                    lines.push(String::new());
                }
            }
            "transition" => {
                let t = if text.starts_with('>') {
                    text
                } else {
                    format!("> {text}")
                };
                lines.extend([String::new(), t, String::new()]);
            }
            "shot" => {
                let t = if text.starts_with("!!") {
                    text
                } else {
                    format!("!! {}", text.trim_start_matches('!').js_trim())
                };
                lines.extend([String::new(), t, String::new()]);
            }
            "lyrics" if fadein => {
                lines.push(if text.starts_with('~') {
                    text
                } else {
                    format!("~ {text}")
                });
            }
            _ => {
                lines.push(if text.starts_with('!') {
                    text
                } else {
                    format!("!{text}")
                });
                lines.push(String::new());
            }
        }
    }
    rx(r"\n{3,}")
        .replace_all(&lines.join("\n"), "\n\n")
        .js_trim()
        .into()
}

pub fn import_script(name: &str, bytes: &[u8]) -> Result<String, String> {
    let lower = name.to_lowercase();
    if lower.ends_with(".fadein") {
        let mut archive = zip::ZipArchive::new(Cursor::new(bytes))
            .map_err(|e| format!("Invalid Fade In archive: {e}"))?;
        let index = (0..archive.len())
            .find(|i| {
                archive
                    .by_index(*i)
                    .is_ok_and(|f| f.name() == "document.xml")
            })
            .or_else(|| {
                (0..archive.len()).find(|i| {
                    archive
                        .by_index(*i)
                        .is_ok_and(|f| f.name().to_lowercase().ends_with(".xml"))
                })
            })
            .ok_or("No document.xml found inside .fadein archive")?;
        let mut xml = String::new();
        archive
            .by_index(index)
            .map_err(|e| e.to_string())?
            .read_to_string(&mut xml)
            .map_err(|e| e.to_string())?;
        parse_xml(&xml).map_err(|e| format!("Invalid Fade In XML: {e}"))?;
        return Ok(import_xml(&xml, true));
    }
    let text = String::from_utf8_lossy(bytes).replace("\r\n", "\n");
    Ok(if lower.ends_with(".fdx") || text.contains("<FinalDraft") {
        parse_xml(&text).map_err(|e| format!("Invalid Final Draft XML: {e}"))?;
        import_xml(&text, false)
    } else {
        text
    })
}

#[tauri::command]
pub async fn import_script_content(path: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        import_script(
            &path,
            &std::fs::read(std::path::Path::new(&path)).map_err(|e| e.to_string())?,
        )
    })
    .await
    .map_err(|e| e.to_string())?
}
#[tauri::command]
pub async fn prepare_fountain_export(
    raw_text: String,
    options: StripOptions,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || strip_fountain(&raw_text, &options))
        .await
        .map_err(|e| e.to_string())
}

#[cfg(test)]
mod regression_tests {
    use super::*;
    use std::io::Write;
    #[test]
    fn doctype_imports_match_legacy_parsers() {
        let fadein = r#"<!DOCTYPE fadein><fadein><para><style basestyle="Character"/><text>John</text></para></fadein>"#;
        let fdx = r#"<!DOCTYPE FinalDraft><FinalDraft><Paragraph Type="Character"><Text>John</Text></Paragraph></FinalDraft>"#;
        assert_eq!(import_xml(fadein, true), "@JOHN");
        assert_eq!(import_script("draft.fdx", fdx.as_bytes()).unwrap(), "@JOHN");
        let mut zip = zip::ZipWriter::new(Cursor::new(Vec::new()));
        zip.start_file("document.xml", zip::write::SimpleFileOptions::default())
            .unwrap();
        zip.write_all(fadein.as_bytes()).unwrap();
        assert_eq!(
            import_script("draft.fadein", &zip.finish().unwrap().into_inner()).unwrap(),
            "@JOHN"
        );
    }
    #[test]
    fn empty_fadein_base_style_falls_back_for_cues_and_dialogue_continuity() {
        let xml = r#"<fadein><para><style basestyle="" name="Character"/><text>John</text></para><para><style basestyle="" name="Dialogue"/><text>Hello.</text></para><para><style basestyle="" name="Parenthetical"/><text>quietly</text></para><para><style name="Dialogue"/><text>Again.</text></para></fadein>"#;
        assert_eq!(import_xml(xml, true), "@JOHN\nHello.\n(quietly)\nAgain.");
    }
    #[test]
    fn malformed_xml_is_an_import_error_not_an_empty_success() {
        assert!(import_script("bad.fdx", b"<FinalDraft><broken>").is_err());
        let mut zip = zip::ZipWriter::new(Cursor::new(Vec::new()));
        zip.start_file("document.xml", zip::write::SimpleFileOptions::default())
            .unwrap();
        zip.write_all(b"<fadein><broken>").unwrap();
        assert!(import_script("bad.fadein", &zip.finish().unwrap().into_inner()).is_err());
    }
    #[test]
    fn external_entities_are_not_loaded() {
        assert!(import_script("bad.fdx", br#"<!DOCTYPE FinalDraft [<!ENTITY external SYSTEM "file:///private">]><FinalDraft><Paragraph><Text>&external;</Text></Paragraph></FinalDraft>"#).is_err());
    }
    #[test]
    fn export_bom_title_and_unicode_boundaries_match_javascript() {
        let options = StripOptions {
            sections: false,
            synopses: false,
            title_page: false,
            uppercase_elements: true,
        };
        assert_eq!(
            strip_fountain("\u{feff}Title: Hello\n\nint. room - day", &options),
            "INT. ROOM - DAY\n"
        );
        assert_eq!(strip_fountain("inté room\n", &options), "INTÉ ROOM\n");
        assert_eq!(
            strip_fountain("\u{feff}# Hidden\n\n!Action.\u{feff}", &options),
            "\n!Action.\n"
        );
        assert_eq!("\u{0085}text\u{0085}".js_trim(), "\u{0085}text\u{0085}");
    }
}
