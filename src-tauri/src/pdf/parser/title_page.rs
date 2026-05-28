use crate::pdf::rich_string::RichString;
use crate::pdf::screenplay::TitlePage;

use super::Parser;

impl<'a> Parser<'a> {
    pub(super) fn parse_title(&mut self) {
        let mut tp = TitlePage::new();

        while let Some((_, line)) = self.lines.peek() {
            let Some((key, val)) = line.split_once(':') else {
                break;
            };
            self.lines.next(); // Consume the key line

            let mut values = Vec::new();

            if val.trim().is_empty() {
                values = self.take_indented_block();
            } else {
                values.push(RichString::from(val));
            }

            match key.trim().to_ascii_uppercase().as_str() {
                "TITLE" => tp.title = values,
                "CREDIT" => tp.credit = values,
                "AUTHOR" | "AUTHORS" => tp.authors = values,
                "SOURCE" => tp.source = values,
                "DRAFT DATE" => tp.draft_date = values,
                "CONTACT" => tp.contact = values,
                "NOTES" => tp.notes = values,
                _ => (),
            }
        }

        if self.next_line_is_empty() {
            self.lines.next();
        }

        if !tp.title.is_empty()
            || !tp.credit.is_empty()
            || !tp.authors.is_empty()
            || !tp.source.is_empty()
            || !tp.draft_date.is_empty()
            || !tp.contact.is_empty()
        {
            self.title_page = Some(tp);
        }
    }

    pub(super) fn take_indented_block(&mut self) -> Vec<RichString> {
        let mut out = Vec::new();
        while let Some((_, next)) = self.lines.peek().copied() {
            if next.starts_with("   ") {
                self.lines.next();
                out.push(RichString::from(next.trim()));
            } else {
                break;
            }
        }
        out
    }
}
