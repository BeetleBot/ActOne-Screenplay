use crate::pdf::screenplay::Element;
use crate::pdf::screenplay::Span;

use super::Parser;

impl<'a> Parser<'a> {
    pub(super) fn try_page_break(&mut self, line: &str, line_idx: usize) -> bool {
        self.try_(
            line,
            |_, s| {
                let t = s.trim_start();
                (t.starts_with("===") && t.chars().all(|c| c == '=' || c.is_whitespace()) && t.replace('=', "").trim().is_empty()).then_some(s)
            },
            |this, _| this.elements.push(Span::new(Element::PageBreak, line_idx)),
        )
    }
}
