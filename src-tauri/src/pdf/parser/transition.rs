use crate::pdf::rich_string::RichString;
use crate::pdf::screenplay::Element;
use crate::pdf::screenplay::Span;

use super::Parser;

impl<'a> Parser<'a> {
    pub(super) fn try_transition(&mut self, line: &str, line_idx: usize) -> bool {
        self.try_(
            line,
            |this, line| {
                let trimmed = line.trim();

                // Forced transition
                if let Some(inner) = trimmed.strip_prefix('>')
                    && !trimmed.ends_with('<')
                {
                    return Some(inner.trim());
                }

                let transition_ending = trimmed.ends_with("TO:") || trimmed.ends_with("TO.");
                let common_transitions =
                    trimmed == "FADE IN:"
                        || trimmed == "FADE OUT:"
                        || trimmed == "FADE UP:"
                        || trimmed == "FADE TO BLACK.";
                let has_lower = trimmed.chars().any(char::is_lowercase);
                let transition_elem = (transition_ending || common_transitions) && !has_lower;

                (transition_elem && this.next_line_is_empty()).then_some(trimmed)
            },
            |this, inner| {
                this.elements.push(Span::new(
                    Element::Transition(RichString::from(inner)),
                    line_idx,
                ));

                this.lines.next();
            },
        )
    }
}
