//! This module implements a [`RichString`], meaning a *rich* string which can have multiple
//! attributes for style, and can have these on different parts of the same string.
//!
//! Parsing is done in accordance with the
//! [Fountain specification](https://fountain.io/syntax/) and emphasis in
//! accordance to [CommonMark specification](https://spec.commonmark.org/0.31.2/).
//!
//! # Examples
//!
//! ```
//! use fount::pdf::rich_string::RichString;
//!
//! let rs: RichString = "_Hello_ **world!**".into();
//!
//! assert_eq!(rs.elements[0].text, "Hello".to_string());
//! assert!(rs.elements[0].is_underline());
//! assert_eq!(rs.elements[1].text, " ".to_string());
//! assert_eq!(rs.elements[2].text, "world!".to_string());
//! assert!(rs.elements[2].is_bold());
//! ```

use std::collections::HashMap;
use std::{fmt::Display, str::Chars};

use bitflags::bitflags;
use unicode_properties::{GeneralCategoryGroup, UnicodeGeneralCategory};

/// A string that can have different parts styled.
///
/// New lines will always appear as their own non styled element.
/// The [`RichString`] is comprised of a collection of [`Element`]s that each
/// hold a [`String`] and a combination of stylings. The available styles are:
///
/// - `**bold**` → **bold**
/// - `*italic*` → *italic*
/// - `_underline_` → <u>underline</u>
///
/// as specified in the `Fountain` specification.
/// Emphasis is parsed in accordance to the `CommonMark` specification.
/// Furthermore, these can be combined in any overlapping order. Use `\` for a styling character to be
/// ignored for style parsing.
///
/// # Examples
///
/// ```
/// use fount::pdf::rich_string::RichString;
///
/// let mut rs = RichString::from("Hello **world!**");
///
/// assert_eq!(rs.elements[0].text, "Hello ".to_string());
/// assert_eq!(rs.elements[1].text, "world!".to_string());
/// assert!(rs.elements[1].is_bold());
/// ```
#[must_use]
#[derive(Debug, PartialEq, Eq, Clone, Hash)]
pub struct RichString {
    pub elements: Vec<Element>,
}

impl RichString {
    /// Create a new, empty, [`RichString`].
    pub fn new() -> Self {
        RichString {
            elements: Vec::new(),
        }
    }

    /// The total length of a [`RichString`], meaning the total number of [`char`]s.
    pub fn char_count(&self) -> usize {
        let mut len = 0;
        for e in &self.elements {
            len += e.text.chars().count();
        }
        len
    }

    /// Gets a [`char`] from a "global" index, meaning the index when viewing the [`RichString`] as
    /// a single string without any style attributes taken into account.
    ///
    /// # Examples
    ///
    /// ```
    /// use fount::pdf::rich_string::RichString;
    ///
    /// let mut rs = RichString::from("He**llo**");
    ///
    /// assert_eq!(rs.get_char(1), Some('e'));
    /// assert_eq!(rs.get_char(3), Some('l'));
    /// assert_eq!(rs.get_char(5), None);
    /// ```
    pub fn get_char(&self, mut index: usize) -> Option<char> {
        if index >= self.char_count() {
            return None;
        }
        for e in &self.elements {
            if index >= e.text.chars().count() {
                index -= e.text.chars().count();
                continue;
            }
            return e.text.chars().nth(index);
        }
        None
    }

    /// Given a "global" index, gets the [`Element`] which contains it, and the "local" index
    /// pointing to that character in the element.
    ///
    /// # Examples
    ///
    /// ```
    /// use fount::pdf::rich_string::RichString;
    ///
    /// let mut rs = RichString::from("He**ll**o");
    ///
    /// assert!(matches!(rs.get_element_from_index(1), Some((_, 1))));
    /// assert!(matches!(rs.get_element_from_index(2), Some((_, 0))));
    /// assert!(matches!(rs.get_element_from_index(3), Some((_, 1))));
    /// assert!(matches!(rs.get_element_from_index(4), Some((_, 0))));
    /// ```
    pub fn get_element_from_index(&self, mut index: usize) -> Option<(&Element, usize)> {
        if index >= self.char_count() {
            return None;
        }
        for e in &self.elements {
            if index >= e.text.chars().count() {
                index -= e.text.chars().count();
                continue;
            }
            return Some((e, index));
        }
        None
    }

    /// Creates an [`char`] iterator over the [`RichString`], without the style attributes of each
    /// [`char`] taken into account.
    pub fn iter(&'_ self) -> RichIterator<'_> {
        RichIterator {
            rich_string: self,
            element_idx: 0,
            chars_iterator: self.elements[0].text.chars(),
        }
    }

    /// Appends a [`RichString`] to self. Will merge the last [`Element`] of self, and the
    /// first of the other if they have the same style attributes.
    pub fn append(&mut self, mut other: Self) {
        if let Some(e) = other.elements.first()
            && let Some(l) = self.elements.last_mut()
            && e.attributes == l.attributes {
                l.text.push_str(&e.text);
                other.elements.drain(..1);
                self.elements.append(&mut other.elements);
                return;
            }
        self.elements.append(&mut other.elements);
    }

    /// Pushes a string onto the [`RichString`]. Will divide the string into
    /// multiple elements with different styles if input string can be parsed with styles.
    pub fn push_str(&mut self, str: impl AsRef<str>) {
        let str = str.as_ref();
        let (tokens, mut delimiters) = Self::tokenize(str);
        let matches = Self::match_delimiters(&mut delimiters);
        self.push_parsed(&tokens, &delimiters, &matches);
    }

    /// Converts the [`RichString`] to a plain [`String`] by just combining the string elements
    /// without adding delimiters.
    ///
    /// # Examples
    ///
    /// ```
    /// use fount::pdf::rich_string::RichString;
    ///
    /// let mut rs = RichString::from("He**ll**o");
    ///
    /// assert_eq!(rs.to_plain_string(), "Hello".to_string());
    /// ```
    pub fn to_plain_string(&self) -> String {
        let mut str = String::with_capacity(self.char_count());
        for element in &self.elements {
            str.push_str(&element.text);
        }

        str
    }

    /// Converts all text elements to uppercase.
    pub fn to_uppercase(&mut self) {
        for element in &mut self.elements {
            element.text = element.text.to_uppercase();
        }
    }

    /// Creates a list of "tokens" and [`Delimiter`] runs.
    ///
    /// By token is meant [`&str`] slices divided at delimiters.
    fn tokenize(input: &str) -> (Vec<&str>, Vec<Delimiter>) {
        let mut tokens = Vec::new();
        let mut delimiters = Vec::new();

        let mut chars = input.char_indices().peekable();
        let mut start = 0;
        let mut before = None;

        while let Some((i, ch)) = chars.next() {
            match ch {
                '*' | '_' => {
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
                        can_open: Self::is_left_flanking(before, after),
                        can_close: Self::is_right_flanking(before, after),
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

    /// Creates matches for a list of delimiters.
    ///
    /// Unlike `CommonMark`, won't create multiple nested matchings
    /// in the naïve case, that is when a delimiter run is greater than three.
    /// Instead it will imitate the behavior by applying the appropriate
    /// resulting style.
    fn match_delimiters(delimiters: &mut [Delimiter]) -> Vec<Match> {
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
                        || !Self::sum_of_three_rule(&delimiters[opener_idx], &delimiters[i])
                    {
                        continue;
                    }

                    let used = delimiters[opener_idx].count.min(delimiters[i].count);
                    let attrs = match (delimiters[opener_idx].char, used) {
                        ('_', _) => Attributes::UNDERLINE,
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
    fn push_parsed(&mut self, tokens: &[&str], delimiters: &[Delimiter], matches: &[Match]) {
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
            if let Some(last) = self.elements.last_mut()
                && last.attributes == a
            {
                last.text.push_str(&token);
                continue;
            }
            self.elements.push(Element {
                text: token,
                attributes: a,
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

    /// Checks if the delimiter run is left flanking and thus can open emphasis.
    /// Follows `CommonMark` spec.
    fn is_left_flanking(before: Option<char>, after: Option<char>) -> bool {
        match after {
            None => false,
            Some(a) if Self::is_whitespace(a) => false,
            Some(a) if Self::is_punctuation(a) => match before {
                None => true,
                Some(b) if Self::is_whitespace(b) || Self::is_punctuation(b) => true,
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
        Self::is_left_flanking(after, before)
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
}

impl Default for RichString {
    fn default() -> Self {
        Self::new()
    }
}

impl Display for RichString {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let mut str = String::with_capacity(self.char_count());

        for element in &self.elements {
            macro_rules! attr_to_delim {
                ($attr:ident, $delimiter:expr) => {
                    if element.$attr() { $delimiter } else { "" }
                };
            }

            let element_text = format!(
                "{}{}{}{}{}{}{}",
                attr_to_delim!(is_bold, "**"),
                attr_to_delim!(is_italic, "*"),
                attr_to_delim!(is_underline, "_"),
                element.text,
                attr_to_delim!(is_underline, "_"),
                attr_to_delim!(is_italic, "*"),
                attr_to_delim!(is_bold, "**"),
            );
            str.push_str(&element_text);
        }

        write!(f, "{str}")
    }
}

impl<T> From<T> for RichString
where
    T: AsRef<str>,
{
    fn from(str: T) -> Self {
        let mut out = RichString::new();
        out.push_str(str);
        out
    }
}

/// An intermediate iterator which allows for seamless iteration over the [Chars] inside a
/// [`RichString`].
pub struct RichIterator<'a> {
    rich_string: &'a RichString,
    element_idx: usize,
    chars_iterator: Chars<'a>,
}

impl<'a> Iterator for RichIterator<'a> {
    type Item = char;

    fn next(&mut self) -> Option<Self::Item> {
        let next = self.chars_iterator.next();
        if next.is_some() {
            return next;
        }
        self.element_idx += 1;
        if self.element_idx >= self.rich_string.elements.len() {
            return None;
        }
        self.chars_iterator = self.rich_string.elements[self.element_idx].text.chars();
        self.chars_iterator.next()
    }
}

/// A [`RichString`] component, containing a [String] and the style attributes
/// belonging to said string.
#[must_use]
#[derive(Debug, PartialEq, Eq, Clone, Default, Hash)]
pub struct Element {
    pub text: String,
    attributes: Attributes,
}

impl Element {
    /// Creates a new element based on a [String] with no attributes. Does not parse the
    /// string.
    pub fn new(text: String) -> Self {
        Self {
            text,
            attributes: Attributes::empty(),
        }
    }

    /// If the element is styled as bold.
    #[must_use]
    pub fn is_bold(&self) -> bool {
        self.attributes.contains(Attributes::BOLD)
    }

    /// Sets the element to be formatted as bold.
    pub fn set_bold(&mut self) {
        self.attributes.insert(Attributes::BOLD);
    }

    /// Sets the element to be formatted as italic.
    pub fn set_italic(&mut self) {
        self.attributes.insert(Attributes::ITALIC);
    }

    /// If the element is styled as underline.
    #[must_use]
    pub fn is_underline(&self) -> bool {
        self.attributes.contains(Attributes::UNDERLINE)
    }

    /// Sets the element to be formatted as underline.
    pub fn set_underline(&mut self) {
        self.attributes.insert(Attributes::UNDERLINE);
    }

    /// If the element is styled as italic.
    #[must_use]
    pub fn is_italic(&self) -> bool {
        self.attributes.contains(Attributes::ITALIC)
    }

    /// If the element is styled as sans-serif.
    #[must_use]
    pub fn is_sans(&self) -> bool {
        self.attributes.contains(Attributes::SANS)
    }

    /// Sets the element to be formatted as sans-serif.
    pub fn set_sans(&mut self) {
        self.attributes.insert(Attributes::SANS);
    }
}

bitflags! {
    /// A bit array keeping track of style attributes for a [RichString].
    #[derive(Debug, PartialEq, Eq, Clone, Copy, Hash, Default)]
    struct Attributes: u8 {
        const BOLD      = 0b001;
        const UNDERLINE = 0b010;
        const ITALIC    = 0b100;
        const SANS      = 0b1000;
    }
}

/// [`Delimiter`] represents a delimiter run in accordance to `CommonMark` spec.
/// `token_idx` is the index in the token list which contains this delimiter run.
#[derive(Debug, PartialEq, Eq)]
struct Delimiter {
    char: char,
    count: usize,
    token_idx: usize,
    can_open: bool,
    can_close: bool,
}

/// [`Match`] of two delimiter runs and which attribute their match results in.
#[derive(Debug, PartialEq, Eq)]
struct Match {
    opening_idx: usize,
    closing_idx: usize,
    attrs: Attributes,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn appends_same_attributes() {
        let mut rs: RichString = "a*b*".into();
        let other: RichString = "*c*d".into();
        rs.append(other);
        assert_eq!(rs.elements[1].text, "bc".to_string())
    }

    #[test]
    fn displays_with_delims() {
        let rs: RichString = "H**e**_ll_**_o_**".into();
        assert_eq!(rs, rs.to_string().into())
    }

    mod tokenize {
        use super::*;

        #[test]
        fn splits_at_delimiter_run() {
            let (tokens, delimiter) = RichString::tokenize("* a _ b **");
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
            let (_, delimiter) = RichString::tokenize("**a");
            assert!(
                delimiter
                    .first()
                    .expect("There should be a delimiter")
                    .can_open
            );
            let (_, delimiter) = RichString::tokenize("*.a");
            assert!(
                delimiter
                    .first()
                    .expect("There should be a delimiter")
                    .can_open
            );
            let (_, delimiter) = RichString::tokenize(".*.a");
            assert!(
                delimiter
                    .first()
                    .expect("There should be a delimiter")
                    .can_open
            );

            // Can't open
            let (_, delimiter) = RichString::tokenize("* a");
            assert!(
                !delimiter
                    .first()
                    .expect("There should be a delimiter")
                    .can_open
            );
            let (_, delimiter) = RichString::tokenize("a*.a");
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
            let (_, delimiter) = RichString::tokenize("a**");
            assert!(
                delimiter
                    .first()
                    .expect("There should be a delimiter")
                    .can_close
            );
            let (_, delimiter) = RichString::tokenize("a.*");
            assert!(
                delimiter
                    .first()
                    .expect("There should be a delimiter")
                    .can_close
            );
            let (_, delimiter) = RichString::tokenize("a.*.");
            assert!(
                delimiter
                    .first()
                    .expect("There should be a delimiter")
                    .can_close
            );

            // Can't open
            let (_, delimiter) = RichString::tokenize("a *");
            assert!(
                !delimiter
                    .first()
                    .expect("There should be a delimiter")
                    .can_close
            );
            let (_, delimiter) = RichString::tokenize("a.*a");
            assert!(
                !delimiter
                    .first()
                    .expect("There should be a delimiter")
                    .can_close
            );
        }

        #[test]
        fn dont_include_escape_character() {
            let (tokens, delimiter) = RichString::tokenize("a\\*b");
            // Doesn't create a delimiter run for the escaped character
            assert!(delimiter.is_empty());
            // The backslash isn't included as a token
            for token in tokens {
                assert!(!token.contains('\\'))
            }
        }
    }

    mod matching {
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
            let matches = RichString::match_delimiters(&mut delimiters);
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
            let matches = RichString::match_delimiters(&mut delimiters);
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
            let matches = RichString::match_delimiters(&mut delimiters);
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
            let matches = RichString::match_delimiters(&mut delimiters);
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
            let matches = RichString::match_delimiters(&mut delimiters);
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
            let matches = RichString::match_delimiters(&mut delimiters);
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
            let matches = RichString::match_delimiters(&mut delimiters);
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
            let matches = RichString::match_delimiters(&mut delimiters);
            assert!(matches.is_empty());
        }

        #[test]
        fn test_unclosed_opener_no_match() {
            let mut delimiters = vec![open('*', 1)];
            let matches = RichString::match_delimiters(&mut delimiters);
            assert!(matches.is_empty());
        }

        #[test]
        fn test_unopened_closer_no_match() {
            let mut delimiters = vec![close('*', 1)];
            let matches = RichString::match_delimiters(&mut delimiters);
            assert!(matches.is_empty());
        }

        #[test]
        fn test_ambiguous_closes_before_opening() {
            let mut delimiters = vec![open('*', 1), ambiguous('*', 1), close('*', 1)];
            let matches = RichString::match_delimiters(&mut delimiters);
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
            let matches = RichString::match_delimiters(&mut delimiters);
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
            let matches = RichString::match_delimiters(&mut delimiters);
            assert!(matches.is_empty());
        }

        #[test]
        fn test_sum_of_three_rule_allows_multiples_of_three() {
            let mut delimiters = vec![ambiguous('*', 3), ambiguous('*', 3)];
            let matches = RichString::match_delimiters(&mut delimiters);
            assert!(!matches.is_empty());
        }
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
