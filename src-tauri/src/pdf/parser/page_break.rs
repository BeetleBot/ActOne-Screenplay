use crate::pdf::screenplay::Element;
use crate::pdf::screenplay::Span;

use super::Parser;

impl<'a> Parser<'a> {
    pub(super) fn try_page_break(&mut self, line: &str, line_idx: usize) -> bool {
        self.try_(
            line,
            |_, s| s.trim_start().starts_with("===").then_some(s),
            |this, _| this.elements.push(Span::new(Element::PageBreak, line_idx)),
        )
    }
}
