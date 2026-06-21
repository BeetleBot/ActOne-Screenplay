use std::iter::Peekable;

use crate::pdf::rich_string::RichString;
use crate::pdf::screenplay::Dialogue;
use crate::pdf::screenplay::DialogueElement;
use crate::pdf::screenplay::Element;
use crate::pdf::screenplay::Screenplay;
use crate::pdf::screenplay::Span;
use crate::pdf::screenplay::TitlePage;

/// Parses a Fountain source string into a [`Screenplay`] structure.
///
/// Preprocesses the source text by removing
/// boneyards, notes and normalizing tabs to spaces.
///
/// # Examples
///
/// ```
/// use fount::pdf::parse;
///
/// let input = r#"
/// Title: Example Screenplay
///
/// INT. ROOM – DAY
/// A man stands alone.
/// "#;
///
/// let screenplay = parse(input);
/// assert!(screenplay.elements.len() > 0);
/// ```
#[must_use]
pub fn parse(src: &str) -> Screenplay {
    let preprocessor = Preprocessor::new(src);
    Parser::new(&preprocessor.process()).parse()
}

/// Internal parser state machine for Fountain.
///
/// Keeps an iterator of the source, a accumulative list of [`Element`]s, and
/// a state. Also tracks a [`TitlePage`] if such exists in the source.
struct Parser<'a> {
    lines: Peekable<std::slice::Iter<'a, Line>>,
    state: State,
    elements: Vec<Span<Element>>,
    title_page: Option<TitlePage>,
}

impl<'a> Parser<'a> {
    /// Create new parser
    ///
    /// Expects `src` to have been preprocessed.
    fn new(src: &'a [Line]) -> Self {
        Self {
            lines: src.iter().peekable(),
            state: State::Default,
            elements: Vec::new(),
            title_page: None,
        }
    }

    /// Main entry point for parser
    ///
    /// Starts by parsing a potential title. Before moving on to the main loop.
    /// A line with two or more spaces is always treated as intentional empty lines.
    ///
    /// Might seem like trimming is used a lot. The intention is that the
    /// try functions work without having trimmed. Cost is extremely low when
    /// calling trim on a already trimmed [&str].
    fn parse(mut self) -> Screenplay {
        self.parse_title();
        while let Some((i, line)) = self.lines.next() {
            let i = *i;
            let trimmed = line.trim();

            if trimmed.is_empty() && !line.starts_with("  ") {
                self.state = State::Default;
                continue;
            }

            match self.state {
                State::Default => {
                    // The first one returning true will break
                    if self.try_section(trimmed, i)
                        || self.try_page_break(trimmed, i)
                        || self.try_synopsis(trimmed, i)
                        || self.try_shot(trimmed, i)
                        || self.try_forced_action(trimmed, i)
                        || self.try_centered(trimmed, i)
                        || self.try_lyrics(trimmed, i)
                        || self.try_heading(trimmed, i)
                        || self.try_transition(trimmed, i)
                        || self.try_dialogue_start(trimmed, i)
                        || self.try_action(line, i)
                    {}
                }
                State::InDialogue => {
                    let (curr_dialogue, end_line) = self
                        .get_last_dialogue()
                        .expect("Must exist since we are in dialogue block");
                    *end_line = i;

                    if trimmed.starts_with('(') {
                        curr_dialogue
                            .elements
                            .push(DialogueElement::Parenthetical(RichString::from(trimmed)));
                        continue;
                    }

                    curr_dialogue
                        .elements
                        .push(DialogueElement::Line(RichString::from(trimmed)));
                }
                State::InBlock => {
                    if self.try_section(trimmed, i)
                        || self.try_synopsis(trimmed, i)
                        || self.try_page_break(trimmed, i)
                        || self.try_centered(trimmed, i)
                        || self.try_lyrics(trimmed, i)
                        || self.try_action(line, i)
                    {}
                }
            }
        }

        Screenplay::new(self.title_page, self.elements)
    }

    /// `try_` is a helper function taking a predicate and a handle function
    /// and is used to define different parts of the state machine.
    fn try_<'s, P, H>(&mut self, line: &'s str, predicate: P, handle: H) -> bool
    where
        P: FnOnce(&mut Self, &'s str) -> Option<&'s str>,
        H: FnOnce(&mut Self, &'s str),
    {
        let Some(new_line) = predicate(self, line) else {
            return false;
        };

        handle(self, new_line);
        true
    }

    fn try_section(&mut self, line: &str, line_idx: usize) -> bool {
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

    fn try_synopsis(&mut self, line: &str, line_idx: usize) -> bool {
        self.try_(
            line,
            |_, s| s.trim_start().strip_prefix('='),
            |this, inner| {
                let inner = inner.trim_start();
                if this.state == State::InBlock
                    && let Some(Span {
                        start_line: _,
                        end_line,
                        inner: Element::Synopsis(rs),
                    }) = this.elements.last_mut()
                    {
                        rs.push_str("\n");
                        rs.push_str(inner);
                        *end_line = line_idx;
                        return;
                    }

                let rs = RichString::from(inner);
                this.elements
                    .push(Span::new(Element::Synopsis(rs), line_idx));

                this.state = State::InBlock;
            },
        )
    }

    fn try_page_break(&mut self, line: &str, line_idx: usize) -> bool {
        self.try_(
            line,
            |_, s| s.trim_start().starts_with("===").then_some(s),
            |this, _| this.elements.push(Span::new(Element::PageBreak, line_idx)),
        )
    }

    fn try_shot(&mut self, line: &str, line_idx: usize) -> bool {
        self.try_(
            line,
            |_, s| s.trim_start().strip_prefix("!!").or_else(|| s.trim_start().strip_prefix("！！")),
            |this, inner| {
                this.elements.push(Span::new(
                    Element::Shot(RichString::from(inner)),
                    line_idx,
                ));
                this.state = State::InBlock;
            },
        )
    }

    fn try_forced_action(&mut self, line: &str, line_idx: usize) -> bool {
        self.try_(
            line,
            |_, s| s.trim_start().strip_prefix('!').or_else(|| s.trim_start().strip_prefix('！')),
            |this, inner| {
                this.elements.push(Span::new(
                    Element::Action(RichString::from(inner)),
                    line_idx,
                ));
                this.state = State::InBlock;
            },
        )
    }

    fn try_centered(&mut self, line: &str, line_idx: usize) -> bool {
        self.try_(
            line,
            |_, s| s.trim().strip_prefix('>').and_then(|u| u.strip_suffix('<')),
            |this, inner| {
                let inner = inner.trim();
                if this.state == State::InBlock
                    && let Some(Span {
                        start_line: _,
                        end_line,
                        inner: Element::CenteredText(rs),
                    }) = this.elements.last_mut()
                    {
                        rs.push_str("\n");
                        rs.push_str(inner);
                        *end_line = line_idx;
                        return;
                    }

                let rs = RichString::from(inner);
                this.elements
                    .push(Span::new(Element::CenteredText(rs), line_idx));

                this.state = State::InBlock;
            },
        )
    }

    fn try_lyrics(&mut self, line: &str, line_idx: usize) -> bool {
        self.try_(
            line,
            |_, s| s.trim_start().strip_prefix('~'),
            |this, inner| {
                if this.state == State::InBlock
                    && let Some(Span {
                        start_line: _,
                        end_line,
                        inner: Element::Lyrics(rs),
                    }) = this.elements.last_mut()
                    {
                        rs.push_str("\n");
                        rs.push_str(inner);
                        *end_line = line_idx;
                        return;
                    }

                let rs = RichString::from(inner);
                this.elements.push(Span::new(Element::Lyrics(rs), line_idx));

                this.state = State::InBlock;
            },
        )
    }

    fn try_action(&mut self, line: &str, line_idx: usize) -> bool {
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

    fn try_heading(&mut self, line: &str, line_idx: usize) -> bool {
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

    fn get_last_dialogue(&mut self) -> Option<(&mut Dialogue, &mut usize)> {
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

    fn insert_empty_dialogue<'s>(&mut self, inner: &'s str, line_idx: usize) -> &'s str {
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

    fn try_dialogue_start(&mut self, line: &str, line_idx: usize) -> bool {
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
                    && let Some((extension, _)) = tail.split_once(')') {
                        curr_dialogue.extension = Some(RichString::from(extension));
                        inner = head.trim_end();
                    }

                curr_dialogue.character = RichString::from(inner);
                *end_line = line_idx;

                this.state = State::InDialogue;
            },
        )
    }

    fn try_transition(&mut self, line: &str, line_idx: usize) -> bool {
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

    fn parse_title(&mut self) {
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

    fn take_indented_block(&mut self) -> Vec<RichString> {
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

    fn next_line_is_empty(&mut self) -> bool {
        self.lines.peek().is_none_or(|(_, s)| s.trim().is_empty())
    }
}

#[derive(Debug, PartialEq, Eq)]
/// The different states the state machine can be in.
enum State {
    Default,
    InDialogue,
    InBlock,
}

/// Removes boneyards, notes and normalizes tabs to four spaces
struct Preprocessor<'a> {
    result: Vec<Line>,
    current_line: Line,
    source_line: usize,
    note_state: Option<NoteState>,
    rest: &'a str,
}

impl<'a> Preprocessor<'a> {
    fn new(src: &'a str) -> Self {
        Preprocessor {
            result: Vec::new(),
            current_line: (1, String::new()),
            source_line: 1,
            note_state: None,
            rest: src,
        }
    }

    /// Appends the given [`&str`] to the `current_line`.
    /// When encountering newlines it appends the `current_line` to `result`
    /// and advances `source_line`.
    fn append_and_advance(&mut self, s: &str) {
        let mut lines = s.split('\n');
        if let Some(first) = lines.next() {
            self.current_line.1.push_str(first);
        }

        for segment in lines {
            if let Some(NoteState { buffer, .. }) = &mut self.note_state {
                buffer.push(std::mem::take(&mut self.current_line));
            } else {
                self.result.push(std::mem::take(&mut self.current_line));
            }
            self.source_line += 1;
            self.current_line.0 = self.source_line;
            self.current_line.1.push_str(segment);
        }
    }

    /// Dump the note buffer into the result and leaving `current_line` as
    /// the current line being processed.
    fn dump_note_buffer(&mut self) {
        if let Some(NoteState {
            mut buffer,
            pre_line,
            ..
        }) = self.note_state.take()
        {
            if buffer.is_empty() {
                let note_tail = std::mem::take(&mut self.current_line.1);
                self.current_line = (pre_line.0, pre_line.1 + &note_tail);
            } else {
                buffer[0].1 = pre_line.1 + &buffer[0].1;
                buffer[0].0 = pre_line.0;
                for (ln, line) in buffer {
                    self.result.push((ln, line));
                }
            }
        }
    }

    /// The main function for the preprocessor.
    fn process(mut self) -> Vec<Line> {
        while !self.rest.is_empty() {
            let in_note = self.note_state.is_some();

            match Preprocessor::find_earliest_token_of_interest(self.rest, in_note) {
                std::option::Option::None => {
                    let remaining = self.rest.replace('\t', "    ");
                    self.append_and_advance(&remaining);
                    break;
                }
                std::option::Option::Some((pos, token)) => {
                    let before = self.rest[..pos].replace('\t', "    ");
                    self.append_and_advance(&before);
                    self.rest = &self.rest[pos + token.len()..];

                    match token {
                        "/*" => {
                            let (boneyard, after) = match self.rest.find("*/") {
                                Some(end) => (&self.rest[..end], &self.rest[end + 2..]),
                                None => (self.rest, ""),
                            };
                            let newline_count = boneyard.chars().filter(|&c| c == '\n').count();
                            self.source_line += newline_count;

                            self.rest = after;
                        }
                        "[[" => {
                            self.note_state = Some(NoteState {
                                buffer: vec![],
                                pre_line: std::mem::take(&mut self.current_line),
                                last_char_is_newline: false,
                            });
                            self.current_line = (self.source_line, "[[".to_string());
                        }
                        "]]" => {
                            self.current_line = self
                                .note_state
                                .take()
                                .map_or((self.source_line, String::new()), |n| n.pre_line);
                        }
                        "\n" => {
                            let Some(s) = &mut self.note_state else {
                                unreachable!(
                                    "We only look for this pattern when note state is some."
                                );
                            };

                            if s.last_char_is_newline
                                && (pos == 0
                                    || pos == 1 && matches!(before.chars().next(), Some(' ')))
                            {
                                self.dump_note_buffer();
                            } else {
                                s.last_char_is_newline = true;
                            }
                            self.append_and_advance("\n");
                        }
                        _ => unreachable!("Already checks all possible tokens"),
                    }
                }
            }
        }

        self.dump_note_buffer();
        if !self.current_line.1.is_empty() {
            self.result.push(self.current_line);
        }
        self.result
    }

    /// Searches for the next potential token of interest.
    /// Always looks for boneyards and other depends on if `in_note` or not.
    fn find_earliest_token_of_interest(s: &str, in_note: bool) -> Option<(usize, &str)> {
        let next_boneyard = s.find("/*");
        let next_note = if in_note { None } else { s.find("[[") };
        let next_note_end = if in_note { s.find("]]") } else { None };
        let next_note_break = if in_note { s.find('\n') } else { None };

        let mut candidates: Vec<(usize, &str)> = Vec::new();

        if let Some(p) = next_boneyard {
            candidates.push((p, "/*"));
        }
        if let Some(p) = next_note {
            candidates.push((p, "[["));
        }
        if let Some(p) = next_note_end {
            candidates.push((p, "]]"));
        }
        if let Some(p) = next_note_break {
            candidates.push((p, "\n"));
        }

        candidates.into_iter().min_by_key(|&(p, _)| p)
    }
}

/// Type alias making it more clear what the tuple represents.
type Line = (usize, String);

/// Keeps the state needed for when we are in a note during preprocessing.
struct NoteState {
    buffer: Vec<Line>,
    pre_line: Line,
    last_char_is_newline: bool,
}

#[cfg(test)]
mod tests {
    use super::*;

    mod preprocessor {
        use super::*;

        macro_rules! test_preprocessor {
            ($name:ident, $src:expr, [$(($line:expr, $expected:expr)),*]) => {
                #[test]
                fn $name() {
                assert_eq!(
                Preprocessor::new($src).process(),
                vec![$(($line, $expected.to_string())),*]
                );
                }
            };
        }

        test_preprocessor!(trivial, "Hello\nWorld", [(1, "Hello"), (2, "World")]);

        test_preprocessor!(
            boneyard_mid_line,
            "Hello /* removed */ World",
            [(1, "Hello  World")]
        );

        test_preprocessor!(
            boneyard_line_start,
            "Hello\n/* removed */\nWorld",
            [(1, "Hello"), (2, ""), (3, "World")]
        );

        test_preprocessor!(
            boneyard_multiline_line_start,
            "Hello\n/* multi\nline\nboneyard */\nWorld",
            [(1, "Hello"), (2, ""), (5, "World")]
        );

        test_preprocessor!(
            boneyard_multiline_mid_line,
            "Hello /* multi\nline */ World",
            [(1, "Hello  World")]
        );

        test_preprocessor!(
            note_removed,
            "Hello [[a note]] World",
            [(1, "Hello  World")]
        );

        test_preprocessor!(
            note_multiline_removed,
            "Hello [[a\nnote]] World",
            [(1, "Hello  World")]
        );

        test_preprocessor!(
            note_break_double_newline,
            "Hello [[a note\n\nWorld",
            [(1, "Hello [[a note"), (2, ""), (3, "World")]
        );

        test_preprocessor!(
            note_break_single_space_newline,
            "Hello [[a note\n \nWorld",
            [(1, "Hello [[a note"), (2, " "), (3, "World")]
        );

        test_preprocessor!(
            not_note_break_single_letter_newline,
            "Hello [[a note,\na\nWorld",
            [(1, "Hello [[a note,"), (2, "a"), (3, "World")]
        );

        test_preprocessor!(note_unclosed, "Hello [[a note", [(1, "Hello [[a note")]);

        test_preprocessor!(
            note_with_boneyard_inside,
            "Hello [[a /* b1 */ note /* b2 */ here]] World",
            [(1, "Hello  World")]
        );

        test_preprocessor!(
            boneyard_inside_note_breaks_note,
            "Hello [[a note\n/* boneyard */\nWorld",
            [(1, "Hello [[a note"), (2, ""), (3, "World")]
        );

        test_preprocessor!(
            mixed_boneyard_and_note,
            "/* boneyard */\n[[a note]]\nWorld",
            [(1, ""), (2, ""), (3, "World")]
        );

        test_preprocessor!(
            source_lines_preserved_after_boneyard,
            "Line1\n/*\n\n\n*/\nLine2",
            [(1, "Line1"), (2, ""), (6, "Line2")]
        );

        test_preprocessor!(
            source_lines_preserved_after_note,
            "Line1\n[[a\nmultiline\nnote]]\nLine2",
            [(1, "Line1"), (2, ""), (5, "Line2")]
        );
    }

    mod end_to_end_parse {
        use super::*;

        macro_rules! test_screenplay {
            ($name:ident, $input:expr, [$($elem:expr),*]) => {
                #[test]
                fn $name() {
                test_parse($input, [$($elem),*]);
                }
            };
        }

        fn test_parse(input: &str, expected: impl IntoIterator<Item = Element>) {
            let parsed = parse(input);
            for (
                Span {
                    start_line: _,
                    end_line: _,
                    inner: actual,
                },
                expected,
            ) in parsed.elements.iter().zip(expected)
            {
                assert_eq!(actual, &expected);
            }
        }

        test_screenplay!(
            parses_heading_without_number,
            "InT. OUTSIDE - DAY",
            [Element::Heading {
                slug: "InT. OUTSIDE - DAY".into(),
                number: None,
            }]
        );

        test_screenplay!(
            does_not_parse_heading_whitout_dot,
            "Intro music plays.",
            [Element::Action("Intro music plays.".into())]
        );

        test_screenplay!(
            parses_heading_with_number,
            "INT. OUTSIDE - DAY #S.1#",
            [Element::Heading {
                slug: "INT. OUTSIDE - DAY".into(),
                number: Some("S.1".to_string()),
            }]
        );

        test_screenplay!(
            parses_heading_forced,
            ".OUTSIDE - DAY",
            [Element::Heading {
                slug: "OUTSIDE - DAY".into(),
                number: None,
            }]
        );

        test_screenplay!(
            parses_heading_forced_with_number,
            ".OUTSIDE - DAY #S.1#",
            [Element::Heading {
                slug: "OUTSIDE - DAY".into(),
                number: Some("S.1".to_string()),
            }]
        );

        test_screenplay!(
            parses_action,
            "They look at the test output - it's all failing.",
            [Element::Action(
                "They look at the test output - it's all failing.".into()
            )]
        );

        test_screenplay!(
            parses_action_forced,
            "!INT. They look at the test output - it's all failing.",
            [Element::Action(
                "INT. They look at the test output - it's all failing.".into(),
            )]
        );

        test_screenplay!(
            parses_dialogue_without_extension,
            r"
CHAR
(sad)
Nooo!
(angry)
I am angry.",
            [Element::Dialogue(Dialogue {
                character: "CHAR".into(),
                extension: None,
                elements: vec![
                    DialogueElement::Parenthetical("(sad)".into()),
                    DialogueElement::Line("Nooo!".into()),
                    DialogueElement::Parenthetical("(angry)".into()),
                    DialogueElement::Line("I am angry.".into()),
                ],
            })]
        );

        test_screenplay!(
            parses_dialogue_with_extension,
            r"
CHAR (V.O)
(sad)
Nooo!",
            [Element::Dialogue(Dialogue {
                character: "CHAR".into(),
                extension: Some("V.O".into()),
                elements: vec![
                    DialogueElement::Parenthetical("(sad)".into()),
                    DialogueElement::Line("Nooo!".into()),
                ],
            })]
        );

        test_screenplay!(
            parses_dialogue_without_extension_forced,
            r"
@char
(sad)
Nooo!
(angry)
I am angry.",
            [Element::Dialogue(Dialogue {
                character: "char".into(),
                extension: None,
                elements: vec![
                    DialogueElement::Parenthetical("(sad)".into()),
                    DialogueElement::Line("Nooo!".into()),
                    DialogueElement::Parenthetical("(angry)".into()),
                    DialogueElement::Line("I am angry.".into()),
                ],
            })]
        );

        test_screenplay!(
            parses_dialogue_with_extension_forced,
            r"
@char (V.O)
(sad)
Nooo!",
            [Element::Dialogue(Dialogue {
                character: "char".into(),
                extension: Some("V.O".into()),
                elements: vec![
                    DialogueElement::Parenthetical("(sad)".into()),
                    DialogueElement::Line("Nooo!".into()),
                ],
            })]
        );

        test_screenplay!(
            parses_dual_dialogue,
            r"
@CHaR
(sad)
Nooo!

CHOR (V.O) ^
YES!",
            [Element::DualDialogue(
                Dialogue {
                    character: "CHaR".into(),
                    extension: None,
                    elements: vec![
                        DialogueElement::Parenthetical("(sad)".into()),
                        DialogueElement::Line("Nooo!".into()),
                    ],
                },
                Dialogue {
                    character: "CHOR".into(),
                    extension: Some("V.O".into()),
                    elements: vec![DialogueElement::Line("YES!".into())],
                },
            )]
        );

        test_screenplay!(
            parses_lyrics,
            "~Hey ho let's go",
            [Element::Lyrics("Hey ho let's go".into())]
        );

        test_screenplay!(
            parses_transition,
            "\nCUT TO:\n",
            [Element::Transition("CUT TO:".into())]
        );

        test_screenplay!(
            parses_transition_forced,
            ">Camera does a spin",
            [Element::Transition("Camera does a spin".into())]
        );

        test_screenplay!(
            parses_centered,
            "> The end    <",
            [Element::CenteredText("The end".into())]
        );

        test_screenplay!(parses_pagebreak_with_3_equals, "===", [Element::PageBreak]);

        test_screenplay!(
            parses_pagebreak_with_8_equals,
            "========",
            [Element::PageBreak]
        );

        test_screenplay!(
            parses_synopsis,
            "=In this scene everyone gets cake.",
            [Element::Synopsis(
                "In this scene everyone gets cake.".into(),
            )]
        );

        test_screenplay!(
            parses_sections,
            r"
# Act 1

INT. HOUSE

## Montage

House is empty.",
            [
                Element::Section("Act 1".into()),
                Element::Heading {
                    slug: "INT. HOUSE".into(),
                    number: None,
                },
                Element::Section("Montage".into()),
                Element::Action("House is empty.".into())
            ]
        );

        test_screenplay!(
            filters_out_boneyard,
            r"
INT. HOUSE

/* This is a boneyard
                and should not be parsed
, you understand?*/

House is empty.",
            [
                Element::Heading {
                    slug: "INT. HOUSE".into(),
                    number: None,
                },
                Element::Action("House is empty.".into())
            ]
        );

        test_screenplay!(
            filters_out_boneyard_inlined,
            "The house is /*extremely full*/empty.",
            [Element::Action("The house is empty.".into())]
        );

        test_screenplay!(
            filters_out_boneyard_unended,
            r"
INT. HOUSE

/* This is a boneyard
                and should not be parsed
, you understand?

House is empty.",
            [Element::Heading {
                slug: "INT. HOUSE".into(),
                number: None,
            }]
        );

        test_screenplay!(
            filters_out_note_multiline,
            r"
INT. HOUSE

[[ This is a note
                and should not be parsed
, you understand?]]

House is empty.",
            [
                Element::Heading {
                    slug: "INT. HOUSE".into(),
                    number: None,
                },
                Element::Action("House is empty.".into())
            ]
        );

        test_screenplay!(
            filters_out_note_inlined,
            "The house is [[should it be full?]]empty.",
            [Element::Action("The house is empty.".into())]
        );

        test_screenplay!(
            filters_out_note_inlined_multiline,
            r"
INT. HOUSE

The house [[ This is a note
                and should not be parsed
, you understand?]]is empty.",
            [
                Element::Heading {
                    slug: "INT. HOUSE".into(),
                    number: None,
                },
                Element::Action("The house is empty.".into())
            ]
        );

        test_screenplay!(
            filters_out_note_multiline_empty_newline,
            "INT. HOUSE\n\nThe house [[This is a note\n  \nand should not be parsed\n, you understand?]]is empty.",
            [
                Element::Heading {
                    slug: "INT. HOUSE".into(),
                    number: None,
                },
                Element::Action("The house is empty.".into())
            ]
        );

        test_screenplay!(
            not_filters_out_unended_note_multiline,
            r"
INT. HOUSE

The house [[wow

no",
            [
                Element::Heading {
                    slug: "INT. HOUSE".into(),
                    number: None,
                },
                Element::Action("The house [[wow".into()),
                Element::Action("no".into())
            ]
        );

        test_screenplay!(
            not_filters_out_unended_note,
            "This is [[ not right",
            [Element::Action("This is [[ not right".into())]
        );
    }
}
