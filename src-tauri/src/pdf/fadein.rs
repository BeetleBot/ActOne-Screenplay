use crate::pdf::rich_string::RichString;
use crate::pdf::screenplay::{Dialogue, DialogueElement, Element, Screenplay};
use std::time::{SystemTime, UNIX_EPOCH};

fn generate_uuid() -> String {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let time_low = (nanos & 0xFFFFFFFF) as u32;
    let time_mid = ((nanos >> 32) & 0xFFFF) as u16;
    let time_hi_and_version = 0x4000 | ((nanos >> 48) & 0x0FFF) as u16;
    let clock_seq_hi_and_reserved = (0x8000 | (nanos >> 60 & 0x3FFF) as u16) as u8;
    let clock_seq_low = ((nanos >> 74) & 0xFF) as u8;
    let node = (nanos >> 82) as u64 & 0xFFFFFFFFFFFF;
    let clock = ((clock_seq_hi_and_reserved as u16) << 8) | clock_seq_low as u16;
    format!(
        "{:08x}-{:04x}-{:04x}-{:04x}-{:012x}",
        time_low, time_mid, time_hi_and_version, clock, node
    )
}

fn escape_xml(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('"', "&quot;")
        .replace('\'', "&#x27;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}

fn rich_to_fadein_text(rs: &RichString) -> String {
    let mut out = String::new();
    for el in &rs.elements {
        let text = escape_xml(&el.text);
        let mut attrs = Vec::new();
        if el.is_bold() {
            attrs.push("bold=\"1\"");
        }
        if el.is_italic() {
            attrs.push("italic=\"1\"");
        }
        if el.is_underline() {
            attrs.push("underline=\"1\"");
        }
        let attr_str = if attrs.is_empty() {
            String::new()
        } else {
            format!(" {}", attrs.join(" "))
        };
        out.push_str(&format!("        <text{}>{}</text>\n", attr_str, text));
    }
    out
}

fn element_to_fadein(el: &Element, scene_counter: &mut usize) -> String {
    match el {
        Element::Heading { slug, number, .. } => {
            let num_attr = match number {
                Some(n) => format!(" number=\"{}\"", escape_xml(n)),
                None => String::new(),
            };
            *scene_counter += 1;
            format!(
                "    <para{}>\n      <style basestyle=\"Scene Heading\"/>\n{}    </para>\n",
                num_attr,
                rich_to_fadein_text(slug)
            )
        }
        Element::Action(rs) => {
            format!(
                "    <para>\n      <style basestyle=\"Action\"/>\n{}    </para>\n",
                rich_to_fadein_text(rs)
            )
        }
        Element::Dialogue(d) => dialogue_to_fadein(d, false),
        Element::DualDialogue(left, right) => {
            let mut out = dialogue_to_fadein(left, true);
            out.push_str(&dialogue_to_fadein(right, false));
            out
        }
        Element::Lyrics(rs) => {
            format!(
                "    <para>\n      <style basestyle=\"Lyrics\"/>\n{}    </para>\n",
                rich_to_fadein_text(rs)
            )
        }
        Element::Transition(rs) => {
            format!(
                "    <para>\n      <style basestyle=\"Transition\"/>\n{}    </para>\n",
                rich_to_fadein_text(rs)
            )
        }
        Element::CenteredText(rs) => {
            format!(
                "    <para>\n      <style basestyle=\"Action\" align=\"center\"/>\n{}    </para>\n",
                rich_to_fadein_text(rs)
            )
        }
        Element::Section { .. } => String::new(),
        Element::Shot(rs) => {
            format!(
                "    <para>\n      <style basestyle=\"Shot\"/>\n{}    </para>\n",
                rich_to_fadein_text(rs)
            )
        }
        Element::Synopsis(_) => String::new(),
        Element::PageBreak => String::new(),
    }
}

fn dialogue_to_fadein(dialogue: &Dialogue, dual: bool) -> String {
    let mut out = String::new();
    let char_name = escape_xml(&dialogue.character.to_plain_string());
    let extension = dialogue
        .extension
        .as_ref()
        .map(|e| escape_xml(&e.to_plain_string()));
    let char_line = match extension {
        Some(ext) => format!("{} ({})", char_name, ext),
        None => char_name,
    };
    let dual_attr = if dual { " dualdialogue=\"1\"" } else { "" };
    out.push_str(&format!(
        "    <para>\n      <style basestyle=\"Character\"{}/>\n        <text>{}</text>\n    </para>\n",
        dual_attr, char_line
    ));
    for elem in &dialogue.elements {
        match elem {
            DialogueElement::Parenthetical(p) => {
                out.push_str(&format!(
                    "    <para>\n      <style basestyle=\"Parenthetical\"/>\n{}    </para>\n",
                    rich_to_fadein_text(p)
                ));
            }
            DialogueElement::Line(l) => {
                out.push_str(&format!(
                    "    <para>\n      <style basestyle=\"Dialogue\"/>\n{}    </para>\n",
                    rich_to_fadein_text(l)
                ));
            }
        }
    }
    out
}

fn build_info() -> String {
    format!("  <info uuid=\"{}\" pagecount=\"1\"/>\n", generate_uuid())
}

fn build_settings() -> String {
    r##"  <settings page_width="2159" page_height="2794" margin_top="254" margin_bottom="254" margin_left="381" margin_right="254" normal_linesperinch="6.0" element_spacing="1.00" break_on_sentences="true" dialogue_continues="true" dialogue_pagebreaks="true" cont_text="(cont'd)" more_text="(MORE)" scenes_continue="false" continued_text="CONTINUED" number_continued="true" scene_time_separator=" - " page_header="#." page_footer="" header_alignment="3" footer_alignment="3" header_first_page="false" footer_first_page="false" pages_locked="false" pagenumber_start="1" pagenumber_mode="1AB" revision="0" document_revision="-1" revision_mode="false" show_revisions="all" selected_revisions="0"/>"##.to_string()
}

fn build_fadein_settings() -> String {
    r##"  <fadein_settings saved_with="5.0.0" saved_os="Cross-platform" last_position="0,0" index_cards_show="2" index_cards_text_size="1" index_cards_use_folders="true" index_cards_use_colors="true" navigator_show="257" navigator_pagecount="2" narrator="" narrator_default="true"/>"##.to_string()
}

fn build_styles() -> String {
    r##"  <styles>
    <style name="Normal Text" builtin="1" builtin_index="0" font="Courier Prime" size="12"/>
    <style name="Scene Heading" builtin="1" builtin_index="1" basestyle="Normal Text" style_enter="Action" style_tab_after="Action" font="Courier Prime" size="12" spacebefore="2.0" keepwithnext="1" numbering="true" number_locked="false" use_base_numbering="false" autoomit="false" number_skip_io="false" number_mode="1AB" omitted_text="OMITTED" number_start="1" number_format="#" number_reset_after="0" number_position="3" allcaps="1"/>
    <style name="Action" builtin="1" builtin_index="2" basestyle="Normal Text" style_tab_before="Character" font="Courier Prime" size="12" spacebefore="1.0"/>
    <style name="Character" builtin="1" builtin_index="3" basestyle="Normal Text" style_enter="Dialogue" style_tab_before="Action" style_tab_after="Parenthetical" font="Courier Prime" size="12" spacebefore="1.0" keepwithnext="1" leftindent="635" allcaps="1"/>
    <style name="Parenthetical" builtin="1" builtin_index="4" basestyle="Normal Text" style_enter="Dialogue" style_tab_before="Dialogue" style_tab_after="Dialogue" font="Courier Prime" size="12" keepwithnext="1" leftindent="508" rightindent="508"/>
    <style name="Dialogue" builtin="1" builtin_index="5" basestyle="Normal Text" style_enter="Action" style_tab_before="Parenthetical" style_tab_after="Parenthetical" font="Courier Prime" size="12" leftindent="330" rightindent="254"/>
    <style name="Transition" builtin="1" builtin_index="6" basestyle="Normal Text" style_enter="Scene Heading" style_tab_after="Action" font="Courier Prime" size="12" spacebefore="1.0" align="right" leftindent="1016" rightindent="127" allcaps="1"/>
    <style name="Shot" builtin="1" builtin_index="7" basestyle="Normal Text" style_enter="Action" style_tab_after="Action" font="Courier Prime" size="12" spacebefore="1.0" keepwithnext="1" allcaps="1"/>
    <header_style basestyle="Normal Text"/>
    <footer_style basestyle="Normal Text"/>
  </styles>"##.to_string()
}

fn build_a_pages() -> String {
    "  <a_pages/>".to_string()
}

fn build_spelling() -> String {
    r##"  <spelling language="en_US">
    <user_dictionary/>
    <ignored/>
  </spelling>"##
        .to_string()
}

fn build_lists(screenplay: &Screenplay) -> String {
    let mut characters: Vec<String> = Vec::new();
    let mut locations: Vec<String> = Vec::new();

    for span in &screenplay.elements {
        match &span.inner {
            Element::Dialogue(d) => {
                let name = d.character.to_plain_string().trim().to_lowercase();
                if !name.is_empty() && !characters.contains(&name) {
                    characters.push(name);
                }
            }
            Element::DualDialogue(left, right) => {
                let lname = left.character.to_plain_string().trim().to_lowercase();
                if !lname.is_empty() && !characters.contains(&lname) {
                    characters.push(lname);
                }
                let rname = right.character.to_plain_string().trim().to_lowercase();
                if !rname.is_empty() && !characters.contains(&rname) {
                    characters.push(rname);
                }
            }
            Element::Heading { slug, .. } => {
                let text = slug.to_plain_string();
                let loc = extract_location(&text);
                if let Some(l) = loc {
                    let l = l.to_lowercase();
                    if !l.is_empty() && !locations.contains(&l) {
                        locations.push(l);
                    }
                }
            }
            _ => {}
        }
    }

    let mut out = String::from("  <lists>\n    <characters>\n");
    for ch in &characters {
        out.push_str(&format!("      <character name=\"{}\"/>\n", escape_xml(ch)));
    }
    out.push_str("    </characters>\n    <locations>\n");
    for loc in &locations {
        out.push_str(&format!("      <location name=\"{}\"/>\n", escape_xml(loc)));
    }
    out.push_str(
        r#"    </locations>
    <scene_intros>
      <scene_intro name="INT."/>
      <scene_intro name="EXT."/>
      <scene_intro name="INT./EXT."/>
    </scene_intros>
    <scene_times>
      <scene_time name="DAY"/>
      <scene_time name="NIGHT"/>
      <scene_time name="MORNING"/>
      <scene_time name="AFTERNOON"/>
      <scene_time name="EVENING"/>
      <scene_time name="LATER"/>
      <scene_time name="MOMENTS LATER"/>
      <scene_time name="CONTINUOUS"/>
      <scene_time name="THE NEXT DAY"/>
    </scene_times>
    <extensions>
      <extension name="(V.O.)"/>
      <extension name="(O.S.)"/>
      <extension name="(O.C.)"/>
      <extension name="(SUBTITLE)"/>
    </extensions>
    <transitions>
      <transition name="CUT TO:"/>
      <transition name="FADE IN:"/>
      <transition name="FADE OUT"/>
      <transition name="FADE TO:"/>
      <transition name="DISSOLVE TO:"/>
      <transition name="BACK TO:"/>
      <transition name="MATCH CUT TO:"/>
      <transition name="JUMP CUT TO:"/>
      <transition name="FADE TO BLACK"/>
    </transitions>
    <revision_colors>
      <revision_color name="White" index="0" color_name="White" color_index="0" mark=""/>
      <revision_color name="Blue" index="1" color_name="Blue" color_index="1" mark="*"/>
      <revision_color name="Pink" index="2" color_name="Pink" color_index="2" mark="*"/>
      <revision_color name="Yellow" index="3" color_name="Yellow" color_index="3" mark="*"/>
      <revision_color name="Green" index="4" color_name="Green" color_index="4" mark="*"/>
      <revision_color name="Goldenrod" index="5" color_name="Goldenrod" color_index="5" mark="*"/>
      <revision_color name="Buff" index="6" color_name="Buff" color_index="6" mark="*"/>
      <revision_color name="Salmon" index="7" color_name="Salmon" color_index="7" mark="*"/>
      <revision_color name="Cherry" index="8" color_name="Cherry" color_index="8" mark="*"/>
      <revision_color name="Tan" index="9" color_name="Tan" color_index="9" mark="*"/>
    </revision_colors>
    <tag_categories/>
    <highlight_rules/>
  </lists>"#,
    );
    out
}

fn extract_location(heading: &str) -> Option<String> {
    let heading = heading.trim();
    if heading.is_empty() {
        return None;
    }
    if let Some(pos) = heading.find(['-', '—', '–']) {
        let loc = heading[..pos].trim();
        let loc = loc
            .trim_start_matches(|c: char| c.is_uppercase() || c == '.' || c == ' ')
            .trim();
        return if loc.is_empty() {
            Some(heading.to_string())
        } else {
            Some(loc.to_string())
        };
    }
    Some(heading.to_string())
}

fn build_title_page(titlepage: &crate::pdf::screenplay::TitlePage) -> String {
    let has_content = !titlepage.title.is_empty()
        || !titlepage.authors.is_empty()
        || !titlepage.credit.is_empty()
        || !titlepage.source.is_empty()
        || !titlepage.draft_date.is_empty()
        || !titlepage.contact.is_empty()
        || !titlepage.extras.is_empty();
    if !has_content {
        return String::from("  <titlepage/>\n");
    }

    let mut out = String::from("  <titlepage>\n");

    for _ in 0..16 {
        out.push_str(
            "    <para>\n      <style basestyle=\"Normal Text\"/>\n        <text></text>\n    </para>\n",
        );
    }

    for t in &titlepage.title {
        out.push_str(&format!(
            "    <para bookmark=\"Title\">\n      <style basestyle=\"Normal Text\" align=\"center\"/>\n{}    </para>\n",
            rich_to_fadein_text(t)
        ));
    }

    out.push_str(
        "    <para>\n      <style basestyle=\"Normal Text\" align=\"center\"/>\n        <text></text>\n    </para>\n",
    );
    out.push_str(
        "    <para>\n      <style basestyle=\"Normal Text\" align=\"center\"/>\n        <text></text>\n    </para>\n",
    );

    if !titlepage.credit.is_empty() {
        out.push_str(&format!(
            "    <para>\n      <style basestyle=\"Normal Text\" align=\"center\"/>\n        <text>{}</text>\n    </para>\n",
            escape_xml(&titlepage.credit[0].to_plain_string())
        ));
        out.push_str(
            "    <para>\n      <style basestyle=\"Normal Text\" align=\"center\"/>\n        <text></text>\n    </para>\n",
        );
    }

    for a in &titlepage.authors {
        out.push_str(&format!(
            "    <para bookmark=\"Author\">\n      <style basestyle=\"Normal Text\" align=\"center\"/>\n{}    </para>\n",
            rich_to_fadein_text(a)
        ));
    }

    out.push_str(
        "    <para>\n      <style basestyle=\"Normal Text\"/>\n        <text></text>\n    </para>\n",
    );
    out.push_str(
        "    <para>\n      <style basestyle=\"Normal Text\"/>\n        <text></text>\n    </para>\n",
    );
    out.push_str(
        "    <para>\n      <style basestyle=\"Normal Text\"/>\n        <text></text>\n    </para>\n",
    );
    out.push_str(
        "    <para>\n      <style basestyle=\"Normal Text\"/>\n        <text></text>\n    </para>\n",
    );
    out.push_str(
        "    <para>\n      <style basestyle=\"Normal Text\"/>\n        <text></text>\n    </para>\n",
    );
    out.push_str(
        "    <para>\n      <style basestyle=\"Normal Text\"/>\n        <text></text>\n    </para>\n",
    );
    out.push_str(
        "    <para>\n      <style basestyle=\"Normal Text\"/>\n        <text></text>\n    </para>\n",
    );
    out.push_str(
        "    <para>\n      <style basestyle=\"Normal Text\"/>\n        <text></text>\n    </para>\n",
    );
    out.push_str(
        "    <para>\n      <style basestyle=\"Normal Text\"/>\n        <text></text>\n    </para>\n",
    );
    out.push_str(
        "    <para>\n      <style basestyle=\"Normal Text\"/>\n        <text></text>\n    </para>\n",
    );
    out.push_str(
        "    <para>\n      <style basestyle=\"Normal Text\"/>\n        <text></text>\n    </para>\n",
    );
    out.push_str(
        "    <para>\n      <style basestyle=\"Normal Text\"/>\n        <text></text>\n    </para>\n",
    );
    out.push_str(
        "    <para>\n      <style basestyle=\"Normal Text\"/>\n        <text></text>\n    </para>\n",
    );
    out.push_str(
        "    <para>\n      <style basestyle=\"Normal Text\"/>\n        <text></text>\n    </para>\n",
    );
    out.push_str(
        "    <para>\n      <style basestyle=\"Normal Text\"/>\n        <text></text>\n    </para>\n",
    );
    out.push_str(
        "    <para>\n      <style basestyle=\"Normal Text\"/>\n        <text></text>\n    </para>\n",
    );
    out.push_str(
        "    <para>\n      <style basestyle=\"Normal Text\"/>\n        <text></text>\n    </para>\n",
    );
    out.push_str(
        "    <para>\n      <style basestyle=\"Normal Text\"/>\n        <text></text>\n    </para>\n",
    );
    out.push_str(
        "    <para>\n      <style basestyle=\"Normal Text\"/>\n        <text></text>\n    </para>\n",
    );
    out.push_str(
        "    <para>\n      <style basestyle=\"Normal Text\"/>\n        <text></text>\n    </para>\n",
    );
    out.push_str(
        "    <para>\n      <style basestyle=\"Normal Text\"/>\n        <text></text>\n    </para>\n",
    );
    out.push_str(
        "    <para>\n      <style basestyle=\"Normal Text\"/>\n        <text></text>\n    </para>\n",
    );
    out.push_str(
        "    <para>\n      <style basestyle=\"Normal Text\"/>\n        <text></text>\n    </para>\n",
    );

    if !titlepage.draft_date.is_empty() {
        out.push_str(&format!(
            "    <para bookmark=\"Draft\">\n      <style basestyle=\"Normal Text\"/>\n        <text>{}</text>\n    </para>\n",
            escape_xml(&titlepage.draft_date[0].to_plain_string())
        ));
    }

    out.push_str(
        "    <para>\n      <style basestyle=\"Normal Text\"/>\n        <text></text>\n    </para>\n",
    );

    if !titlepage.contact.is_empty() {
        out.push_str(&format!(
            "    <para bookmark=\"Contact\">\n      <style basestyle=\"Normal Text\"/>\n        <text>{}</text>\n    </para>\n",
            escape_xml(&titlepage.contact[0].to_plain_string())
        ));
    }

    if !titlepage.source.is_empty() {
        out.push_str(&format!(
            "    <para>\n      <style basestyle=\"Normal Text\"/>\n        <text>{}</text>\n    </para>\n",
            escape_xml(&titlepage.source[0].to_plain_string())
        ));
    }

    for (key, vals) in &titlepage.extras {
        if let Some(v) = vals.first() {
            out.push_str(&format!(
                "    <para>\n      <style basestyle=\"Normal Text\"/>\n        <text>{}: {}</text>\n    </para>\n",
                escape_xml(key),
                escape_xml(&v.to_plain_string())
            ));
        }
    }

    out.push_str("  </titlepage>\n");
    out
}

pub fn export(screenplay: &Screenplay) -> String {
    let mut content = String::new();
    let mut scene_counter = 0;
    for span in &screenplay.elements {
        let osf = element_to_fadein(&span.inner, &mut scene_counter);
        content.push_str(&osf);
    }

    let info = build_info();
    let settings = build_settings();
    let fadein_settings = build_fadein_settings();
    let styles = build_styles();
    let a_pages = build_a_pages();
    let spelling = build_spelling();
    let lists = build_lists(screenplay);

    let title_page = match &screenplay.titlepage {
        Some(tp) => build_title_page(tp),
        None => String::from("  <titlepage/>\n"),
    };

    format!(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<document type="Open Screenplay Format document" version="50">
{info}{settings}{fadein_settings}
{styles}
  <paragraphs>
{content}  </paragraphs>
  {a_pages}
{title_page}{spelling}
{lists}</document>
"#
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::pdf::parse;

    #[test]
    fn exports_empty_screenplay() {
        let result = export(&parse(""));
        assert!(result.contains("<document"));
        assert!(result.contains("</document>"));
        assert!(result.contains("version=\"50\""));
        assert!(result.contains("<settings"));
        assert!(result.contains("<paragraphs>"));
        assert!(result.contains("</paragraphs>"));
        assert!(result.contains("<a_pages/>"));
        assert!(result.contains("<spelling"));
        assert!(result.contains("<lists>"));
    }

    #[test]
    fn exports_scene_heading() {
        let result = export(&parse("INT. HOUSE - DAY\n\nHello."));
        assert!(result.contains("basestyle=\"Scene Heading\""));
        assert!(result.contains("INT. HOUSE - DAY"));
        assert!(result.contains("basestyle=\"Action\""));
        assert!(result.contains("Hello."));
    }

    #[test]
    fn exports_scene_number() {
        let result = export(&parse("INT. HOUSE - DAY #1#\n\nHello."));
        assert!(result.contains("number=\"1\""));
    }

    #[test]
    fn exports_dialogue() {
        let src = "CHAR\nHello!";
        let result = export(&parse(src));
        assert!(result.contains("basestyle=\"Character\""));
        assert!(result.contains("basestyle=\"Dialogue\""));
        assert!(result.contains("Hello!"));
    }

    #[test]
    fn exports_dialogue_with_extension() {
        let src = "CHAR (V.O.)\nHello!";
        let result = export(&parse(src));
        assert!(result.contains("CHAR (V.O.)"));
    }

    #[test]
    fn exports_dual_dialogue() {
        let src = "LEFT\nLeft text\n\nRIGHT ^\nRight text";
        let result = export(&parse(src));
        assert!(result.contains("LEFT"));
        assert!(result.contains("RIGHT"));
        assert!(result.contains("Left text"));
        assert!(result.contains("Right text"));
    }

    #[test]
    fn exports_transition() {
        let result = export(&parse("\nCUT TO:\n\nINT. HOUSE"));
        assert!(result.contains("basestyle=\"Transition\""));
        assert!(result.contains("CUT TO:"));
    }

    #[test]
    fn exports_centered() {
        let result = export(&parse("> THE END <"));
        assert!(result.contains("align=\"center\""));
        assert!(result.contains("THE END"));
    }

    #[test]
    fn exports_shot() {
        let result = export(&parse("!!THE GUN FIRES"));
        assert!(result.contains("basestyle=\"Shot\""));
    }

    #[test]
    fn exports_lyrics() {
        let result = export(&parse("~La la la"));
        assert!(result.contains("basestyle=\"Lyrics\""));
        assert!(result.contains("La la la"));
    }

    #[test]
    fn exports_title_page() {
        let src = "Title: My Script\nAuthor: Me\n\nINT. HOUSE";
        let result = export(&parse(src));
        assert!(result.contains("<titlepage>"));
        assert!(result.contains("My Script"));
        assert!(result.contains("Me"));
    }

    #[test]
    fn skips_synopsis_and_section_and_page_break() {
        let src = "= Synopsis\n# Section\n===\nINT. HOUSE";
        let result = export(&parse(src));
        assert!(!result.contains("= Synopsis"));
        assert!(!result.contains("# Section"));
    }

    #[test]
    fn exports_bold_italic_text() {
        let src = "**bold** and *italic*";
        let result = export(&parse(src));
        assert!(result.contains("bold=\"1\""));
        assert!(result.contains("italic=\"1\""));
    }

    #[test]
    fn exports_parenthetical() {
        let src = "CHAR\n(wryly)\nLine!";
        let result = export(&parse(src));
        assert!(result.contains("basestyle=\"Parenthetical\""));
        assert!(result.contains("wryly"));
    }

    #[test]
    fn includes_lists() {
        let src = "CHAR\nHello!\n\nOTHER\nHi!";
        let result = export(&parse(src));
        assert!(result.contains("<characters>"));
        assert!(result.contains("CHAR"));
        assert!(result.contains("OTHER"));
    }

    #[test]
    fn uses_correct_style_element_format() {
        let result = export(&parse("INT. HOUSE - DAY\n\nHello.\n\nCHAR\nLine!"));
        assert!(result.contains("<style basestyle=\"Scene Heading\"/>"));
        assert!(result.contains("<style basestyle=\"Action\"/>"));
        assert!(result.contains("<style basestyle=\"Character\"/>"));
        assert!(result.contains("<style basestyle=\"Dialogue\"/>"));
        assert!(result.contains("<style basestyle=\"Action\"/>"));
    }

    #[test]
    fn has_required_elements() {
        let result = export(&parse(""));
        assert!(result.starts_with("<?xml version=\"1.0\" encoding=\"UTF-8\"?>"));
        assert!(result.contains("version=\"50\""));
        assert!(result.contains("<info uuid=\""));
        assert!(result.contains("<fadein_settings"));
        assert!(result.contains("<a_pages/>"));
        assert!(result.contains("<spelling"));
        assert!(result.contains("<lists>"));
        assert!(result.contains("<tag_categories/>"));
        assert!(result.contains("<highlight_rules/>"));
    }

    #[test]
    fn scene_number_uses_number_attr() {
        let result = export(&parse("INT. HOUSE - DAY #42#\n\nHello."));
        assert!(result.contains(" number=\"42\""));
        assert!(!result.contains("bookmark=\"Scene Heading\""));
    }

    #[test]
    fn parenthetical_shows_without_parens() {
        let result = export(&parse("CHAR\n(wryly)\nLine!"));
        assert!(result.contains("wryly"));
    }

    #[test]
    fn exports_complex_screenplay() {
        let src = "Title: Test
Author: Me

INT. OFFICE - DAY #1#

**Bold** *italic* _underline_.

CHARACTER
(wryly)
Line one.
Line two.

>THE END<

CUT TO:

EXT. STREET - NIGHT

!!A GUN SHOTS

~La la la";

        let result = export(&parse(src));
        assert!(result.contains("basestyle=\"Scene Heading\""));
        assert!(result.contains("basestyle=\"Action\""));
        assert!(result.contains("basestyle=\"Character\""));
        assert!(result.contains("basestyle=\"Parenthetical\""));
        assert!(result.contains("basestyle=\"Dialogue\""));
        assert!(result.contains("basestyle=\"Transition\""));
        assert!(result.contains("basestyle=\"Shot\""));
        assert!(result.contains("basestyle=\"Lyrics\""));
        assert!(result.contains("align=\"center\""));
        assert!(result.contains("bold=\"1\""));
        assert!(result.contains("italic=\"1\""));
        assert!(result.contains("underline=\"1\""));
        assert!(result.contains("number=\"1\""));
        assert!(result.contains("<titlepage>"));
        assert!(result.contains("Test"));
        assert!(result.contains("Me"));
    }

    #[test]
    fn produces_valid_fadein_zip() {
        let src = "INT. HOUSE - DAY\n\nHello.";
        let screenplay = parse(src);
        let xml = export(&screenplay);
        let packed = crate::pdf::fadein_pack::pack(&xml).unwrap();

        use std::io::Read;
        let mut archive = zip::ZipArchive::new(std::io::Cursor::new(packed)).unwrap();
        assert_eq!(archive.len(), 1);
        let mut file = archive.by_name("document.xml").unwrap();
        let mut content = String::new();
        file.read_to_string(&mut content).unwrap();
        assert_eq!(content, xml);
    }
}
