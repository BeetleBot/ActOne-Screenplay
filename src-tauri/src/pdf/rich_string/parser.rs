use std::collections::HashMap;

use super::core::{Attributes, Element, RichString};
use super::tokenizer::Delimiter;

/// [`Match`] of two delimiter runs and which attribute their match results in.
#[derive(Debug, PartialEq, Eq)]
pub(crate) struct Match {
    pub(crate) opening_idx: usize,
    pub(crate) closing_idx: usize,
    pub(crate) attrs: Attributes,
}

/// Creates matches for a list of delimiters.
///
/// Unlike `CommonMark`, won't create multiple nested matchings
/// in the naïve case, that is when a delimiter run is greater than three.
/// Instead it will imitate the behavior by applying the appropriate
/// resulting style.
pub(crate) fn match_delimiters(delimiters: &mut [Delimiter]) -> Vec<Match> {
    let mut matches = Vec::new();
    let mut stack: Vec<usize> = Vec::new();

    for i in 0..delimiters.len() {
        let can_close = delimiters[i].can_close;
        let can_open = delimiters[i].can_open;

        // First try to close against the stack.
        if can_close {
            let mut j = stack.len();
            while j > 0 && delimiters[i].count > 0 {
                j -= 1;
                let opener_idx = stack[j];

                if delimiters[opener_idx].char != delimiters[i].char
                    || delimiters[opener_idx].count == 0
                    || !sum_of_three_rule(&delimiters[opener_idx], &delimiters[i])
                {
                    continue;
                }

                let used = delimiters[opener_idx].count.min(delimiters[i].count);
                let attrs = match (delimiters[opener_idx].char, used) {
                    ('_', _) => Attributes::UNDERLINE,
                    ('=', _) => {
                        if used >= 2 { Attributes::HIGHLIGHT } else { continue; }
                    }
                    (_, 1) => Attributes::ITALIC,
                    (_, 2) => Attributes::BOLD,
                    _ => {
                        if used.is_multiple_of(2) {
                            Attributes::BOLD
                        } else {
                            Attributes::BOLD | Attributes::ITALIC
                        }
                    }
                };

                matches.push(Match {
                    opening_idx: opener_idx,
                    closing_idx: i,
                    attrs,
                });

                delimiters[opener_idx].count -= used;
                delimiters[i].count -= used;

                if delimiters[opener_idx].count == 0 {
                    stack.remove(j);
                }
            }
        }

        // Push as opener if it can open and has remaining count
        if can_open && delimiters[i].count > 0 {
            stack.push(i);
        }
    }

    matches
}

/// Appends the [`Element`]s created by the given tokens, delimiters, and matches.
///
/// These three are expected to have been computed together.
pub(crate) fn push_parsed(
    rich_string: &mut RichString,
    tokens: &[&str],
    delimiters: &[Delimiter],
    matches: &[Match],
) {
    let mut attrs: Vec<Attributes> = vec![Attributes::empty(); tokens.len()];

    for m in matches {
        let start = delimiters[m.opening_idx].token_idx;
        let end = delimiters[m.closing_idx].token_idx;

        // The delimiter tokens themselves are excluded.
        for a in attrs.iter_mut().take(end).skip(start + 1) {
            *a |= m.attrs;
        }
    }

    let delimiter_token_idxs: HashMap<usize, usize> = delimiters
        .iter()
        .enumerate()
        .map(|(i, d)| (d.token_idx, i))
        .collect();

    for (i, token) in tokens.iter().enumerate() {
        let mut token = (*token).to_string();
        if let Some(&delimiter_idx) = delimiter_token_idxs.get(&i) {
            let d = &delimiters[delimiter_idx];
            if d.count == 0 {
                // Not included in final output. Skip the token.
                continue;
            }

            token = d.char.to_string().repeat(d.count);
        }

        let a = attrs[i];
        if let Some(last) = rich_string.elements.last_mut()
            && last.attributes == a
        {
            last.text.push_str(&token);
            continue;
        }
        rich_string.elements.push(Element {
            text: token,
            attributes: a,
            link_url: None,
        });
    }
}

/// Checks the sum of three rule for matching delimiter runs according
/// to the `CommonMark` spec.
///
/// The rule is as follows:
/// If one of the delimiters can both open and close strong emphasis,
/// then the sum of the lengths of the delimiter runs containing the
/// opening and closing delimiters must not be a multiple of 3 unless
/// both lengths are multiples of 3.
fn sum_of_three_rule(a: &Delimiter, b: &Delimiter) -> bool {
    if !((a.can_open && a.can_close) || (b.can_open && b.can_close)) {
        return true;
    }

    if !(a.count + b.count).is_multiple_of(3) {
        return true;
    }

    if a.count.is_multiple_of(3) && b.count.is_multiple_of(3) {
        return true;
    }

    false
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_delimiter(char: char, count: usize, can_open: bool, can_close: bool) -> Delimiter {
        Delimiter {
            char,
            count,
            token_idx: 0,
            can_open,
            can_close,
        }
    }

    fn open(char: char, count: usize) -> Delimiter {
        make_delimiter(char, count, true, false)
    }

    fn close(char: char, count: usize) -> Delimiter {
        make_delimiter(char, count, false, true)
    }

    fn ambiguous(char: char, count: usize) -> Delimiter {
        make_delimiter(char, count, true, true)
    }

    #[test]
    fn test_italic() {
        let mut delimiters = vec![open('*', 1), close('*', 1)];
        let matches = match_delimiters(&mut delimiters);
        assert_eq!(
            matches,
            vec![Match {
                opening_idx: 0,
                closing_idx: 1,
                attrs: Attributes::ITALIC
            }]
        );
    }

    #[test]
    fn test_bold() {
        let mut delimiters = vec![open('*', 2), close('*', 2)];
        let matches = match_delimiters(&mut delimiters);
        assert_eq!(
            matches,
            vec![Match {
                opening_idx: 0,
                closing_idx: 1,
                attrs: Attributes::BOLD
            }]
        );
    }

    #[test]
    fn test_bold_italic() {
        let mut delimiters = vec![open('*', 3), close('*', 3)];
        let matches = match_delimiters(&mut delimiters);
        assert_eq!(
            matches,
            vec![Match {
                opening_idx: 0,
                closing_idx: 1,
                attrs: Attributes::BOLD | Attributes::ITALIC
            }]
        );
    }

    #[test]
    fn test_four_even_is_bold() {
        let mut delimiters = vec![open('*', 4), close('*', 4)];
        let matches = match_delimiters(&mut delimiters);
        assert_eq!(
            matches,
            vec![Match {
                opening_idx: 0,
                closing_idx: 1,
                attrs: Attributes::BOLD
            }]
        );
    }

    #[test]
    fn test_five_odd_is_bold_italic() {
        let mut delimiters = vec![open('*', 5), close('*', 5)];
        let matches = match_delimiters(&mut delimiters);
        assert_eq!(
            matches,
            vec![Match {
                opening_idx: 0,
                closing_idx: 1,
                attrs: Attributes::BOLD | Attributes::ITALIC
            }]
        );
    }

    #[test]
    fn test_asymmetric_consumes_smaller() {
        let mut delimiters = vec![open('*', 3), close('*', 2)];
        let matches = match_delimiters(&mut delimiters);
        assert_eq!(
            matches,
            vec![Match {
                opening_idx: 0,
                closing_idx: 1,
                attrs: Attributes::BOLD
            }]
        );
        assert_eq!(delimiters[0].count, 1);
        assert_eq!(delimiters[1].count, 0);
    }

    #[test]
    fn test_leftover_opener_matches_second_closer() {
        let mut delimiters = vec![open('*', 3), close('*', 2), close('*', 1)];
        let matches = match_delimiters(&mut delimiters);
        assert_eq!(
            matches,
            vec![
                Match {
                    opening_idx: 0,
                    closing_idx: 1,
                    attrs: Attributes::BOLD
                },
                Match {
                    opening_idx: 0,
                    closing_idx: 2,
                    attrs: Attributes::ITALIC
                },
            ]
        );
    }

    #[test]
    fn test_mismatched_chars_no_match() {
        let mut delimiters = vec![open('*', 1), close('_', 1)];
        let matches = match_delimiters(&mut delimiters);
        assert!(matches.is_empty());
    }

    #[test]
    fn test_unclosed_opener_no_match() {
        let mut delimiters = vec![open('*', 1)];
        let matches = match_delimiters(&mut delimiters);
        assert!(matches.is_empty());
    }

    #[test]
    fn test_unopened_closer_no_match() {
        let mut delimiters = vec![close('*', 1)];
        let matches = match_delimiters(&mut delimiters);
        assert!(matches.is_empty());
    }

    #[test]
    fn test_ambiguous_closes_before_opening() {
        let mut delimiters = vec![open('*', 1), ambiguous('*', 1), close('*', 1)];
        let matches = match_delimiters(&mut delimiters);
        assert_eq!(
            matches,
            vec![Match {
                opening_idx: 0,
                closing_idx: 1,
                attrs: Attributes::ITALIC
            }]
        );
    }

    #[test]
    fn test_ambiguous_opens_when_nothing_to_close() {
        let mut delimiters = vec![ambiguous('*', 1), close('*', 1)];
        let matches = match_delimiters(&mut delimiters);
        assert_eq!(
            matches,
            vec![Match {
                opening_idx: 0,
                closing_idx: 1,
                attrs: Attributes::ITALIC
            }]
        );
    }

    #[test]
    fn test_sum_of_three_rule_blocks_match() {
        let mut delimiters = vec![ambiguous('*', 1), ambiguous('*', 2)];
        let matches = match_delimiters(&mut delimiters);
        assert!(matches.is_empty());
    }

    #[test]
    fn test_sum_of_three_rule_allows_multiples_of_three() {
        let mut delimiters = vec![ambiguous('*', 3), ambiguous('*', 3)];
        let matches = match_delimiters(&mut delimiters);
        assert!(!matches.is_empty());
    }

    mod parse {
        use super::*;

        const B: Attributes = Attributes::BOLD;
        const I: Attributes = Attributes::ITALIC;
        const U: Attributes = Attributes::UNDERLINE;
        const E: Attributes = Attributes::empty();

        macro_rules! test_emphasis {
            ($name:ident, $input:expr, [$(($text:expr, $attrs:expr)),*]) => {
                #[test]
                fn $name() {
                    test_parse($input, [$(($text, $attrs)),*]);
                }
            };
        }

        fn test_parse<'a>(input: &str, expected: impl IntoIterator<Item = (&'a str, Attributes)>) {
            let rs = RichString::from(input);
            for (elem, expected) in rs.elements.iter().zip(expected) {
                assert_eq!(elem.text, expected.0);
                assert_eq!(elem.attributes, expected.1);
            }
        }

        // Basic
        test_emphasis!(italic, "*foo bar*", [("foo bar", I)]);
        test_emphasis!(bold, "**foo bar**", [("foo bar", B)]);
        test_emphasis!(bold_italic, "***foo bar***", [("foo bar", B | I)]);
        test_emphasis!(underline, "_foo bar_", [("foo bar", U)]);

        // combinations
        test_emphasis!(
            overlapping_styles,
            "**_foo** bar_",
            [("foo", B | U), (" bar", U)]
        );

        // Non left-flanking delimiter run not opening
        test_emphasis!(
            not_open_because_whitespace_after_delimiter,
            "* foo bar*",
            [("* foo bar*", E)]
        );
        test_emphasis!(
            not_open_because_punctuation_after_delimiter_alphanumeric_before,
            "a*.foo bar*",
            [("a*.foo bar*", E)]
        );

        // Non right-flanking delimiter run not closing
        test_emphasis!(
            not_closed_because_whitespace_before_delimiter,
            "*foo bar *",
            [("*foo bar *", E)]
        );
        test_emphasis!(
            not_closed_because_newline_before_delimiter,
            "*foo bar\n*",
            [("*foo bar\n*", E)]
        );
        test_emphasis!(
            not_closed_because_punctuation_before_delimiter_alphanumeric_after,
            "*(*foo)",
            [("*(*foo)", E)]
        );

        test_emphasis!(
            closed_because_newline_then_alphanumeric_before_delimiter,
            "*foo\nbar*",
            [("foo\nbar", I)]
        );

        // Nested empgasis
        test_emphasis!(
            nested_bold_in_italics,
            "*foo **bar** baz*",
            [("foo ", I), ("bar", I | B), (" baz", I)]
        );
        test_emphasis!(
            nested_bold_in_italics_no_whitepace,
            "*foo**bar**baz*",
            [("foo", I), ("bar", I | B), ("baz", I)]
        );
        test_emphasis!(
            nested_bold_in_italics_complicated,
            "*foo**bar***",
            [("foo", I), ("bar", I | B)]
        );

        // matching delimiter runs
        test_emphasis!(no_empty_emphasis, "__foo", [("__foo", E)]);
        test_emphasis!(
            cant_close_when_sum_is_multiple_of_three_but_not_both_lengths_are_multiples_of_three,
            "*foo**bar*",
            [("foo**bar", I)]
        );
        test_emphasis!(
            can_close_when_sum_is_multiple_of_three_and_both_lengths_are_multiples_of_three,
            "foo***bar***baz",
            [("foo", E), ("bar", I | B), ("baz", E)]
        );

        test_emphasis!(
            literal_delimiter_cant_appear_at_begining_or_end_of_run,
            "foo *** foo *\\**",
            [("foo *** foo ", E), ("*", I)]
        );
        test_emphasis!(mismatch_more_before, "**foo*", [("*", E), ("foo", I)]);
        test_emphasis!(mismatch_more_after, "*foo****", [("foo", I), ("***", E)]);
        test_emphasis!(
            two_potential_opening_share_same_closing_pick_shortest,
            "**foo **bar baz**",
            [("**foo ", E), ("bar baz", B)]
        );
    }
}
