use std::iter::Peekable;

use crate::pdf::rich_string::RichString;
use crate::pdf::screenplay::DialogueElement;
use crate::pdf::screenplay::Element;
use crate::pdf::screenplay::Screenplay;
use crate::pdf::screenplay::Span;
use crate::pdf::screenplay::TitlePage;

mod action;
mod centered;
mod dialogue;
mod forced_action;
mod heading;
mod lyrics;
mod page_break;
mod preprocessor;
mod section;
mod shot;
mod synopsis;
mod title_page;
mod transition;

use preprocessor::{Line, Preprocessor};

/// Parses a Fountain source string into a [`Screenplay`] structure.
///
/// Preprocesses the source text by removing
/// boneyards, notes and normalizing tabs to spaces.
///
/// # Examples
///
/// ```
/// use actone_lib::pdf::parse;
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
pub(super) struct Parser<'a> {
    pub(super) lines: Peekable<std::slice::Iter<'a, Line>>,
    pub(super) state: State,
    pub(super) elements: Vec<Span<Element>>,
    pub(super) title_page: Option<TitlePage>,
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
    pub(super) fn try_<'s, P, H>(&mut self, line: &'s str, predicate: P, handle: H) -> bool
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

    pub(super) fn next_line_is_empty(&mut self) -> bool {
        self.lines.peek().is_none_or(|(_, s)| s.trim().is_empty())
    }
}

#[derive(Debug, PartialEq, Eq)]
/// The different states the state machine can be in.
pub(super) enum State {
    Default,
    InDialogue,
    InBlock,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::pdf::screenplay::Dialogue;

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
