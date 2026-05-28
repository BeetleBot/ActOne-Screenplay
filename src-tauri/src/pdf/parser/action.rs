use crate::pdf::rich_string::RichString;
use crate::pdf::screenplay::Element;
use crate::pdf::screenplay::Span;

use super::{Parser, State};

impl<'a> Parser<'a> {
    pub(super) fn try_action(&mut self, line: &str, line_idx: usize) -> bool {
        self.try_(
            line,
            |_, line| Some(line),
            |this, inner| {
                if this.state == State::InBlock
                    && let Some(Span {
                        start_line: _,
                        end_line,
                        inner: Element::Action(rs),
                    }) = this.elements.last_mut()
                {
                    rs.push_str("\n");
                    rs.push_str(inner);
                    *end_line = line_idx;
                    return;
                }

                let rs = RichString::from(inner);
                this.elements.push(Span::new(Element::Action(rs), line_idx));

                this.state = State::InBlock;
            },
        )
    }
}
