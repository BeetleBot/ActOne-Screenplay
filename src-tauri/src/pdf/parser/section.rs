use crate::pdf::rich_string::RichString;
use crate::pdf::screenplay::Element;
use crate::pdf::screenplay::Span;

use super::{Parser, State};

impl<'a> Parser<'a> {
    pub(super) fn try_section(&mut self, line: &str, line_idx: usize) -> bool {
        self.try_(
            line,
            |_, s| s.trim_start().strip_prefix('#'),
            |this, inner| {
                let mut inner = inner.trim_start();
                while inner.starts_with('#') {
                    inner = inner.strip_prefix('#').unwrap().trim_start();
                }
                let rs = RichString::from(inner);
                this.elements.push(Span::new(Element::Section(rs), line_idx));
                this.state = State::InBlock;
            },
        )
    }
}
