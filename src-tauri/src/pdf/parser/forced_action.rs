use crate::pdf::rich_string::RichString;
use crate::pdf::screenplay::Element;
use crate::pdf::screenplay::Span;

use super::{Parser, State};

impl<'a> Parser<'a> {
    pub(super) fn try_forced_action(&mut self, line: &str, line_idx: usize) -> bool {
        self.try_(
            line,
            |_, s| {
                s.trim_start()
                    .strip_prefix('!')
                    .or_else(|| s.trim_start().strip_prefix('！'))
            },
            |this, inner| {
                this.elements.push(Span::new(
                    Element::Action(RichString::from(inner)),
                    line_idx,
                ));
                this.state = State::InBlock;
            },
        )
    }
}
