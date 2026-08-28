use unicode_properties::{GeneralCategoryGroup, UnicodeGeneralCategory};

/// [`Delimiter`] represents a delimiter run in accordance to `CommonMark` spec.
/// `token_idx` is the index in the token list which contains this delimiter run.
#[derive(Debug, PartialEq, Eq)]
pub(crate) struct Delimiter {
    pub(crate) char: char,
    pub(crate) count: usize,
    pub(crate) token_idx: usize,
    pub(crate) can_open: bool,
    pub(crate) can_close: bool,
}

/// Creates a list of "tokens" and [`Delimiter`] runs.
///
/// By token is meant [`&str`] slices divided at delimiters.
pub(crate) fn tokenize(input: &str) -> (Vec<&str>, Vec<Delimiter>) {
    let mut tokens = Vec::new();
    let mut delimiters = Vec::new();

    let mut chars = input.char_indices().peekable();
    let mut start = 0;
    let mut before = None;

    while let Some((i, ch)) = chars.next() {
        match ch {
            '*' | '_' | '=' => {
                if i > start {
                    tokens.push(&input[start..i]);
                }

                let run_start = i;
                while chars.peek().is_some_and(|(_, c)| *c == ch) {
                    chars.next();
                }
                let run_end = chars.peek().map_or(input.len(), |(i, _)| *i);
                let after = chars.peek().map(|(_, c)| *c);
                let count = run_end - run_start;

                delimiters.push(Delimiter {
                    char: ch,
                    count,
                    token_idx: tokens.len(),
                    can_open: is_left_flanking(before, after),
                    can_close: is_right_flanking(before, after),
                });

                tokens.push(&input[run_start..run_end]);
                before = Some(ch);
                start = run_end;
            }
            '\\' => {
                if let Some((next_idx, next)) = chars.next() {
                    if i > start {
                        tokens.push(&input[start..i]);
                    }
                    before = Some(next);
                    start = next_idx;
                }
            }
            _ => before = Some(ch),
        }
    }

    if start < input.len() {
        tokens.push(&input[start..]);
    }

    (tokens, delimiters)
}

/// Checks if the delimiter run is left flanking and thus can open emphasis.
/// Follows `CommonMark` spec.
fn is_left_flanking(before: Option<char>, after: Option<char>) -> bool {
    match after {
        None => false,
        Some(a) if is_whitespace(a) => false,
        Some(a) if is_punctuation(a) => match before {
            None => true,
            Some(b) if is_whitespace(b) || is_punctuation(b) => true,
            _ => false,
        },
        _ => true,
    }
}

/// Checks if the delimiter run is left flanking and thus can open emphasis.
/// Follows `CommonMark` spec.
fn is_right_flanking(before: Option<char>, after: Option<char>) -> bool {
    // right-flanking delimiter run is checked the same way as a left-flanking
    // but going from the other direction.
    is_left_flanking(after, before)
}

/// Whitespace in accordance to `CommonMark` spec.
fn is_whitespace(char: char) -> bool {
    match char {
        '\u{0009}' | '\u{000A}' | '\u{000C}' | '\u{000D}' => true,
        c => matches!(c.general_category_group(), GeneralCategoryGroup::Separator),
    }
}

/// Punctuation in accordance to `CommonMark` spec.
fn is_punctuation(char: char) -> bool {
    matches!(
        char.general_category_group(),
        GeneralCategoryGroup::Punctuation | GeneralCategoryGroup::Symbol
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn splits_at_delimiter_run() {
        let (tokens, delimiter) = tokenize("* a _ b **");
        let expected_tokens = vec!["*", " a ", "_", " b ", "**"];
        let expected_delimiter = vec![
            Delimiter {
                char: '*',
                count: 1,
                token_idx: 0,
                can_open: false,
                can_close: false,
            },
            Delimiter {
                char: '_',
                count: 1,
                token_idx: 2,
                can_open: false,
                can_close: false,
            },
            Delimiter {
                char: '*',
                count: 2,
                token_idx: 4,
                can_open: false,
                can_close: false,
            },
        ];
        assert_eq!(tokens, expected_tokens);
        assert_eq!(delimiter, expected_delimiter);
    }

    #[test]
    fn left_flanking() {
        // Can open
        let (_, delimiter) = tokenize("**a");
        assert!(
            delimiter
                .first()
                .expect("There should be a delimiter")
                .can_open
        );
        let (_, delimiter) = tokenize("*.a");
        assert!(
            delimiter
                .first()
                .expect("There should be a delimiter")
                .can_open
        );
        let (_, delimiter) = tokenize(".*.a");
        assert!(
            delimiter
                .first()
                .expect("There should be a delimiter")
                .can_open
        );

        // Can't open
        let (_, delimiter) = tokenize("* a");
        assert!(
            !delimiter
                .first()
                .expect("There should be a delimiter")
                .can_open
        );
        let (_, delimiter) = tokenize("a*.a");
        assert!(
            !delimiter
                .first()
                .expect("There should be a delimiter")
                .can_open
        );
    }

    #[test]
    fn right_flanking() {
        // Can open
        let (_, delimiter) = tokenize("a**");
        assert!(
            delimiter
                .first()
                .expect("There should be a delimiter")
                .can_close
        );
        let (_, delimiter) = tokenize("a.*");
        assert!(
            delimiter
                .first()
                .expect("There should be a delimiter")
                .can_close
        );
        let (_, delimiter) = tokenize("a.*.");
        assert!(
            delimiter
                .first()
                .expect("There should be a delimiter")
                .can_close
        );

        // Can't open
        let (_, delimiter) = tokenize("a *");
        assert!(
            !delimiter
                .first()
                .expect("There should be a delimiter")
                .can_close
        );
        let (_, delimiter) = tokenize("a.*a");
        assert!(
            !delimiter
                .first()
                .expect("There should be a delimiter")
                .can_close
        );
    }

    #[test]
    fn dont_include_escape_character() {
        let (tokens, delimiter) = tokenize("a\\*b");
        // Doesn't create a delimiter run for the escaped character
        assert!(delimiter.is_empty());
        // The backslash isn't included as a token
        for token in tokens {
            assert!(!token.contains('\\'))
        }
    }
}
