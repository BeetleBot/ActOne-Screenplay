use crate::pdf::rich_string::RichString;
use crate::pdf::screenplay::Dialogue;
use crate::pdf::screenplay::Element;
use crate::pdf::screenplay::Span;

use super::{Parser, State};

impl<'a> Parser<'a> {
    pub(super) fn get_last_dialogue(&mut self) -> Option<(&mut Dialogue, &mut usize)> {
        let Some(Span {
            start_line: _,
            end_line,
            inner: Element::Dialogue(curr_dialogue) | Element::DualDialogue(_, curr_dialogue),
        }) = self.elements.last_mut()
        else {
            return None;
        };

        Some((curr_dialogue, end_line))
    }

    pub(super) fn insert_empty_dialogue<'s>(&mut self, inner: &'s str, line_idx: usize) -> &'s str {
        let new_dialogue = Dialogue::new();

        if let Some(stripped) = inner.trim_end().strip_suffix('^')
            && let Some(&Span {
                start_line: _,
                end_line: _,
                inner: Element::Dialogue(_),
            }) = self.elements.last()
            && let Some(Span {
                start_line,
                end_line: _,
                inner: Element::Dialogue(d),
            }) = self.elements.pop()
        {
            self.elements.push(Span::new(
                Element::DualDialogue(d, new_dialogue),
                start_line,
            ));
            return stripped;
        }

        self.elements
            .push(Span::new(Element::Dialogue(new_dialogue), line_idx));
        inner
    }

    pub(super) fn try_dialogue_start(&mut self, line: &str, line_idx: usize) -> bool {
        self.try_(
            line,
            |this, line| {
                let trimmed = line.trim_start();
                if let Some(inner) = trimmed.strip_prefix('@') {
                    return Some(inner);
                }

                let head = trimmed.split_once('(').map_or(trimmed, |(h, _)| h);
                let has_alpha = head.chars().any(char::is_alphabetic);
                let has_lower = head.chars().any(char::is_lowercase);
                (has_alpha && !has_lower && !this.next_line_is_empty()).then_some(trimmed)
            },
            |this, inner| {
                let mut inner = this.insert_empty_dialogue(inner, line_idx);

                let (curr_dialogue, end_line) = this
                    .get_last_dialogue()
                    .expect("Just pushed to list, must exist");

                if let Some((head, tail)) = inner.split_once('(')
                    && let Some((extension, _)) = tail.split_once(')')
                {
                    curr_dialogue.extension = Some(RichString::from(extension));
                    inner = head.trim_end();
                }

                curr_dialogue.character = RichString::from(inner);
                *end_line = line_idx;

                this.state = State::InDialogue;
            },
        )
    }
}
