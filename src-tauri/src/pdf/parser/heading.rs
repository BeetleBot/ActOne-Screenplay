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
            |this, line| {
                let trimmed = line.trim_start();
                if let Some(stripped) = trimmed.strip_prefix('.') {
                    return Some(stripped);
                }

                let pats = ["INT", "EXT", "EST", "I/E", "INT./EXT", "INT/EXT"];
                let bytes = trimmed.as_bytes();

                (pats.iter().any(|p| {
                    let n = p.len();
                    bytes
                        .get(..n)
                        .is_some_and(|head| head.eq_ignore_ascii_case(p.as_bytes()))
                        && bytes.get(n).is_some_and(|&end| end == b' ' || end == b'.')
                }) && this.next_line_is_empty())
                .then_some(trimmed)
            },
            |this, inner| {
                let mut number = None;
                let mut inner = inner;
                if let Some(start) = inner.trim_end().strip_suffix('#')
                    && let Some((new_inner, numbering)) = start.rsplit_once('#')
                    && numbering
                        .chars()
                        .all(|c| c.is_alphanumeric() || c == '-' || c == '.')
                {
                    number = Some(numbering.to_string());
                    inner = new_inner.trim_end();
                }

                let mut color = None;
                if let Some(start) = inner.trim_end().strip_suffix("]]")
                    && let Some((new_inner, tag)) = start.rsplit_once("[[")
                {
                    let tag = tag.trim();
                    let color_name = tag.strip_prefix("color ").unwrap_or(tag);
                    if is_valid_color_name(color_name) {
                        color = Some(color_name.to_string().to_lowercase());
                        inner = new_inner.trim_end();
                    }
                }

                this.elements.push(Span::new(
                    Element::Heading {
                        slug: RichString::from(inner),
                        number,
                        color,
                    },
                    line_idx,
                ));

                this.lines.next();
            },
        )
    }
}
