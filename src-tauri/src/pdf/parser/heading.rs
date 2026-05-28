use crate::pdf::rich_string::RichString;
use crate::pdf::screenplay::Element;
use crate::pdf::screenplay::Span;

use super::Parser;

impl<'a> Parser<'a> {
    pub(super) fn try_heading(&mut self, line: &str, line_idx: usize) -> bool {
        self.try_(
            line,
            |this, line| {
                let trimmed = line.trim_start();
                let mut it = trimmed.chars();
                if matches!(
                    (it.next(), it.next()),
                    (Some('.'), Some(c)) if c.is_alphanumeric()
                ) {
                    return Some(
                        trimmed
                            .strip_prefix('.')
                            .expect("Already checked that it exists"),
                    );
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

                this.elements.push(Span::new(
                    Element::Heading {
                        slug: RichString::from(inner),
                        number,
                    },
                    line_idx,
                ));

                this.lines.next();
            },
        )
    }
}
