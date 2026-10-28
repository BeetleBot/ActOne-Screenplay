use crate::pdf::rich_string::RichString;
use crate::pdf::screenplay::Element;
use crate::pdf::screenplay::Span;

use super::Parser;

fn is_valid_color_name(s: &str) -> bool {
    let s = s.trim().to_lowercase();
    matches!(
        s.as_str(),
        "red"
            | "blue"
            | "green"
            | "pink"
            | "magenta"
            | "gray"
            | "purple"
            | "cyan"
            | "teal"
            | "yellow"
            | "orange"
            | "brown"
    ) || (s.starts_with('#')
        && s.len() >= 4
        && s.len() <= 7
        && s[1..].chars().all(|c| c.is_ascii_hexdigit()))
}

impl<'a> Parser<'a> {
    pub(super) fn try_heading(&mut self, line: &str, line_idx: usize) -> bool {
        self.try_(
            line,
            |_this, line| {
                let trimmed = line.trim_start();
                if let Some(stripped) = trimmed.strip_prefix('.') {
                    return Some(stripped);
                }

                let pats = ["INT", "EXT", "EST", "I/E", "INT./EXT", "INT/EXT"];
                let bytes = trimmed.as_bytes();

                pats.iter().any(|p| {
                    let n = p.len();
                    bytes
                        .get(..n)
                        .is_some_and(|head| head.eq_ignore_ascii_case(p.as_bytes()))
                        && bytes.get(n).is_some_and(|&end| end == b' ' || end == b'.')
                }).then_some(trimmed)
            },
            |this, inner| {
                let mut number = None;
                let mut inner = inner;
                let mut color = None;
                // Number and color metadata may appear in either order.
                loop {
                    if number.is_none()
                        && let Some(start) = inner.trim_end().strip_suffix('#')
                        && let Some((new_inner, numbering)) = start.rsplit_once('#')
                        && !numbering.is_empty()
                        && numbering.chars().all(|c| c.is_alphanumeric() || c == '-' || c == '.')
                    {
                        number = Some(numbering.to_string());
                        inner = new_inner.trim_end();
                        continue;
                    }
                    if color.is_none()
                        && let Some(start) = inner.trim_end().strip_suffix("]]")
                        && let Some((new_inner, tag)) = start.rsplit_once("[[")
                    {
                        let tag = tag.trim();
                        let color_name = tag.strip_prefix("color ").unwrap_or(tag);
                        if is_valid_color_name(color_name) {
                            color = Some(color_name.to_string().to_lowercase());
                            inner = new_inner.trim_end();
                            continue;
                        }
                    }
                    break;
                }

                this.elements.push(Span::new(
                    Element::Heading {
                        slug: RichString::from(inner),
                        number,
                        color,
                    },
                    line_idx,
                ));

                if this.next_line_is_empty() {
                    this.lines.next();
                }
            },
        )
    }
}


#[cfg(test)]
mod tests {
    use crate::pdf::{parse, screenplay::Element};

    #[test]
    fn numbered_heading_without_blank_line_preserves_following_action() {
        let parsed = parse("INT. GOA HOTEL / RADHI’S ROOM - DAY #1#\nRADHI’S MEDICAL SCENE");
        assert_eq!(parsed.elements.len(), 2);
        match &parsed.elements[0].inner {
            Element::Heading { slug, number, .. } => {
                assert_eq!(slug.to_plain_string(), "INT. GOA HOTEL / RADHI’S ROOM - DAY");
                assert_eq!(number.as_deref(), Some("1"));
            }
            other => panic!("expected heading, got {other:?}"),
        }
        assert!(matches!(&parsed.elements[1].inner, Element::Action(text) if text.to_plain_string() == "RADHI’S MEDICAL SCENE"));
    }

    #[test]
    fn extracts_scene_numbers_and_colors_in_either_order() {
        for suffix in ["#1A# [[color blue]]", "[[color blue]] #1A#"] {
            let parsed = parse(&format!("INT. ROOM - DAY {suffix}\n\nAction."));
            match &parsed.elements[0].inner {
                Element::Heading { slug, number, color } => {
                    assert_eq!(slug.to_plain_string(), "INT. ROOM - DAY");
                    assert_eq!(number.as_deref(), Some("1A"));
                    assert_eq!(color.as_deref(), Some("blue"));
                }
                other => panic!("expected heading, got {other:?}"),
            }
            assert_eq!(parsed.elements.len(), 2);
        }
    }
}
